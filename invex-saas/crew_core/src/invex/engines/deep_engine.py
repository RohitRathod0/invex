import os
import time
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, Callable, Optional

import invex.crew as crew_module
from invex.crew import Invex, CrewLLM
from crewai import Crew, Task

logger = logging.getLogger("invex.deep_engine")

# Thread pool — keeps 2 slots so a retry can spin up immediately
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="deep_engine")


# ── Provider fallback chain for analysis agents ────────────────────────────────
_ANALYSIS_PROVIDER_CHAIN = [
    {
        "model":   "mistral/mistral-large-latest",
        "api_key": lambda: os.environ.get("MISTRAL_API_KEY"),
        "max_tokens": 8192,
    },
    {
        "model":   "mistral/mistral-small-latest",
        "api_key": lambda: os.environ.get("MISTRAL_API_KEY"),
        "max_tokens": 4096,
    },
    {
        "model":   "groq/llama-3.1-8b-instant",
        "api_key": lambda: os.environ.get("GROQ_API_KEY"),
        "max_tokens": 2048,
    },
    {
        "model":   "gemini/gemini-2.0-flash",
        "api_key": lambda: os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"),
        "max_tokens": 8192,
    },
]

# Keywords that mean "provider is exhausted, try next" (not a code bug)
_QUOTA_ERRS = (
    "429", "rate limit", "rate_limit", "quota", "resource_exhausted",
    "too many requests", "capacity", "overloaded", "ratelimiterror",
    "limit: 0", "free_tier",
)


def _is_quota_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(k in msg for k in _QUOTA_ERRS)


def _run_crew_with_llm(llm: CrewLLM, inputs: Dict[str, Any]) -> Any:
    """
    Sets the module-level override, instantiates the Invex crew,
    runs kickoff, then resets the override regardless of outcome.
    Thread-safety note: fine for single-process uvicorn.
    """
    crew_module._OVERRIDE_LLM = llm
    try:
        invex_crew = Invex()
        if "asset_preferences" in inputs:
            invex_crew.user_preferences = inputs["asset_preferences"]
        return invex_crew.crew().kickoff(inputs=inputs)
    finally:
        crew_module._OVERRIDE_LLM = None   # always reset


def _extract_structured(raw_result) -> Optional[dict]:
    """Pull structured JSON out of a CrewAI kickoff result."""
    if getattr(raw_result, "json_dict", None):
        return raw_result.json_dict
    if getattr(raw_result, "pydantic", None):
        return raw_result.pydantic.model_dump()
    return None


class DeepEngine:
    """
    Wrapper for the existing CrewAI architecture.
    Provides comprehensive analysis but takes 2-5 minutes.
    Automatically falls back through Mistral → Groq → Gemini on quota errors.

    Two modes:
      run()           – regular await (blocks until done, no streaming)
      run_streaming() – streams task-completion events via asyncio.Queue
    """

    # ── Synchronous crew runner (called from thread pool) ──────────────────────
    def _run_sync(self, llm: CrewLLM, inputs: Dict[str, Any]) -> Any:
        return _run_crew_with_llm(llm, inputs)

    # ── Original non-streaming run (backward compat) ───────────────────────────
    async def run(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        start = time.time()
        logger.info("Starting DEEP analysis using CrewAI...")
        last_error: Exception | None = None

        for provider in _ANALYSIS_PROVIDER_CHAIN:
            api_key = provider["api_key"]()
            if not api_key:
                logger.warning(f"[DeepEngine] Skipping {provider['model']} — API key not set")
                continue

            llm = CrewLLM(
                model=provider["model"],
                api_key=api_key,
                temperature=0.2,
                max_tokens=provider["max_tokens"],
            )

            try:
                logger.info(f"[DeepEngine] Attempting crew with model: {provider['model']}")
                loop = asyncio.get_event_loop()
                raw_result = await loop.run_in_executor(
                    _executor,
                    lambda l=llm: _run_crew_with_llm(l, inputs)
                )
            except Exception as exc:
                last_error = exc
                if _is_quota_error(exc):
                    logger.warning(f"[DeepEngine] {provider['model']} quota hit: {str(exc)[:120]}. Trying next…")
                    continue
                else:
                    logger.error(f"[DeepEngine] Non-quota error on {provider['model']}: {exc}")
                    raise

            structured_data = _extract_structured(raw_result)

            # Schema retry if report writer returned invalid JSON
            if structured_data is None:
                structured_data = await self._retry_report(raw_result, llm)

            if structured_data is None:
                raise ValueError("Failed to obtain valid structured JSON from crew after retries.")

            return {
                "mode": "deep",
                "execution_time": round(time.time() - start, 2),
                "model_used": provider["model"],
                "result": {"report": str(raw_result), "structured_data": structured_data},
                "status": "success",
                "error": None,
            }

        err_msg = str(last_error) if last_error else "All analysis providers are rate-limited or unavailable."
        logger.error(f"[DeepEngine] All providers failed. Last error: {err_msg}")
        return {
            "mode": "deep",
            "execution_time": round(time.time() - start, 2),
            "model_used": None,
            "result": {"report": f"Error: {err_msg}", "structured_data": None},
            "status": "failed",
            "error": err_msg,
        }

    # ── Streaming run — pushes events into queue as tasks complete ─────────────
    async def run_streaming(
        self,
        inputs: Dict[str, Any],
        event_queue: asyncio.Queue,
    ) -> Dict[str, Any]:
        """
        Runs the crew and streams SSE events via event_queue.

        IMPORTANT ordering rule:
          - Task callbacks fire from background threads → use call_soon_threadsafe
          - All other events are pushed in this async method → use await put() directly
            (call_soon_threadsafe schedules for NEXT loop iteration and would arrive
             AFTER the sentinel None, causing the stream to close before final is sent)
        - Sentinel None is put at the very end of this method so it always arrives last.
        """
        start = time.time()
        loop = asyncio.get_event_loop()
        last_error: Exception | None = None

        # Thread-safe push: ONLY for use from background executor threads
        def _push_from_thread(event: dict):
            loop.call_soon_threadsafe(event_queue.put_nowait, event)

        crew_module._PROGRESS_CALLBACK = _push_from_thread

        try:
            for provider in _ANALYSIS_PROVIDER_CHAIN:
                api_key = provider["api_key"]()
                if not api_key:
                    continue

                llm = CrewLLM(
                    model=provider["model"],
                    api_key=api_key,
                    temperature=0.2,
                    max_tokens=provider["max_tokens"],
                )

                # Direct await — this is async context, not a thread
                await event_queue.put({"type": "provider_start", "model": provider["model"]})

                try:
                    raw_result = await loop.run_in_executor(
                        _executor,
                        lambda l=llm: _run_crew_with_llm(l, inputs)
                    )
                    # Give the event loop a tick so thread callbacks (task_done events)
                    # that were scheduled via call_soon_threadsafe can flush into the queue
                    await asyncio.sleep(0)
                except Exception as exc:
                    last_error = exc
                    if _is_quota_error(exc):
                        await event_queue.put({"type": "provider_switch",
                                               "from_model": provider["model"],
                                               "message": "Provider quota hit, switching…"})
                        continue
                    else:
                        await event_queue.put({"type": "error", "message": str(exc)})
                        raise

                structured_data = _extract_structured(raw_result)
                if structured_data is None:
                    await event_queue.put({"type": "log", "message": "Report schema invalid, retrying writer…"})
                    structured_data = await self._retry_report(raw_result, llm)

                if structured_data is None:
                    err = "Report writer failed to produce valid JSON."
                    await event_queue.put({"type": "error", "message": err})
                    await event_queue.put(None)   # sentinel
                    return {
                        "mode": "deep", "status": "failed",
                        "execution_time": round(time.time() - start, 2),
                        "model_used": provider["model"],
                        "result": None, "error": err,
                    }

                result = {
                    "mode": "deep",
                    "execution_time": round(time.time() - start, 2),
                    "model_used": provider["model"],
                    "result": {"report": str(raw_result), "structured_data": structured_data},
                    "status": "success",
                    "error": None,
                }
                # Final event + sentinel in guaranteed order (both via direct await)
                await event_queue.put({"type": "final", "payload": result})
                await event_queue.put(None)   # sentinel — stream ends cleanly
                return result

            # All providers exhausted
            err_msg = str(last_error) if last_error else "All providers exhausted."
            await event_queue.put({"type": "error", "message": err_msg})
            await event_queue.put(None)   # sentinel
            return {
                "mode": "deep", "status": "failed",
                "execution_time": round(time.time() - start, 2),
                "model_used": None, "result": None, "error": err_msg,
            }
        except Exception as exc:
            await event_queue.put({"type": "error", "message": str(exc)})
            await event_queue.put(None)
            raise
        finally:
            crew_module._PROGRESS_CALLBACK = None


    # ── Schema retry helper ────────────────────────────────────────────────────
    async def _retry_report(self, raw_result, llm: CrewLLM) -> Optional[dict]:
        """Re-run the report_writer task if the schema was invalid."""
        loop = asyncio.get_event_loop()
        for attempt in range(2):
            logger.warning(f"[DeepEngine] Schema retry attempt {attempt + 1}/2")
            try:
                def _fix():
                    from invex.schemas import PortfolioReport
                    crew_module._OVERRIDE_LLM = llm
                    try:
                        invex_crew_fix = Invex()
                        fix_task = Task(
                            description=(
                                "Your previous output was invalid.\n"
                                "Output ONLY valid JSON matching the PortfolioReport schema.\n\n"
                                f"Previous output:\n{raw_result.raw if hasattr(raw_result, 'raw') else str(raw_result)[:800]}"
                            ),
                            expected_output="Valid JSON matching PortfolioReport schema.",
                            agent=invex_crew_fix.report_writer(),
                            output_json=PortfolioReport,
                        )
                        fix_crew = Crew(
                            agents=[invex_crew_fix.report_writer()],
                            tasks=[fix_task], verbose=False,
                        )
                        return fix_crew.kickoff()
                    finally:
                        crew_module._OVERRIDE_LLM = None

                retry_result = await loop.run_in_executor(_executor, _fix)
                data = _extract_structured(retry_result)
                if data:
                    return data
            except Exception as e:
                logger.error(f"[DeepEngine] Schema retry failed: {e}")
        return None
