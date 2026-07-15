import asyncio
import json
import logging
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from models.api_models import RunAgentRequest
from services.crew_service import run_crew_agent

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agents", tags=["agents"])
limiter = Limiter(key_func=get_remote_address)


# ── Regular (non-streaming) endpoint ─────────────────────────────────────────
@router.post("/run")
@limiter.limit("100/hour")
async def run_crew_agent_endpoint(request: Request, body: RunAgentRequest):
    """
    Trigger a CrewAI/LangGraph crew run.
    ALWAYS returns HTTP 200 — errors surfaced in the body so the
    frontend never sees a raw 500.
    """
    try:
        # ── Inject risk profile if user_id provided ───────────────────────────
        if body.user_id:
            from services.profile_cache import get_cached_profile
            profile = get_cached_profile(body.user_id)
            if not profile:
                from models.database import get_db
                from models.db_models import RiskProfile
                import json
                db = next(get_db())
                rp = db.query(RiskProfile).filter(RiskProfile.user_id == body.user_id).first()
                if rp:
                    profile = {
                        "risk_label":         rp.risk_label,
                        "risk_score":         rp.risk_score,
                        "horizon_years":      rp.horizon_years,
                        "loss_tolerance_pct": rp.loss_tolerance_pct,
                        "preferred_sectors":  json.loads(rp.preferred_sectors or "[]"),
                        "excluded_sectors":   json.loads(rp.excluded_sectors or "[]"),
                        "income_stability":   rp.income_stability,
                    }
            if profile:
                body.inputs = body.inputs or {}
                body.inputs["user_risk_label"]        = profile.get("risk_label", "moderate")
                body.inputs["user_risk_score"]        = profile.get("risk_score", 50)
                body.inputs["user_horizon_years"]     = profile.get("horizon_years")
                body.inputs["user_loss_tolerance_pct"] = profile.get("loss_tolerance_pct")
                body.inputs["user_preferred_sectors"] = profile.get("preferred_sectors", [])
                body.inputs["user_excluded_sectors"]  = profile.get("excluded_sectors", [])
                # Override risk_tolerance from profile
                body.inputs["risk_tolerance"] = profile.get("risk_label", body.inputs.get("risk_tolerance", "moderate"))

        result = await run_crew_agent(body.message, body.session_id, body.inputs)
        return JSONResponse(status_code=200, content=result)
    except Exception as exc:
        logger.error(f"[AgentRouter] Unhandled exception: {exc}", exc_info=True)
        return JSONResponse(
            status_code=200,
            content={
                "status": "failed",
                "error": str(exc),
                "result": None,
                "run_id": "error",
                "session_id": body.session_id,
                "execution_mode": "unknown",
            }
        )


# ── SSE streaming endpoint ────────────────────────────────────────────────────
@router.post("/run/stream")
@limiter.limit("100/hour")
async def stream_crew_agent(request: Request, body: RunAgentRequest):
    """
    Same as /run but streams Server-Sent Events so the frontend receives
    each agent's output immediately as it completes — no waiting for the full report.

    SSE event types:
      {type: "start",           message: "..."}
      {type: "provider_start",  model: "mistral/..."}
      {type: "task_done",       agent: "Market Analyst", emoji: "📊", summary: "..."}
      {type: "provider_switch", from_model: "...", message: "..."}
      {type: "log",             message: "..."}
      {type: "final",           payload: { full result dict }}
      {type: "error",           message: "..."}
    """
    import sys
    from pathlib import Path

    # Ensure crew_core is on path (same as crew_service.py)
    BASE_DIR = Path(__file__).resolve().parent.parent.parent
    CREW_CORE_DIR = BASE_DIR / "crew_core"
    if str(CREW_CORE_DIR / "src") not in sys.path:
        sys.path.append(str(CREW_CORE_DIR / "src"))

    # Build crew inputs (same logic as crew_service)
    from datetime import datetime

    inputs = body.inputs or {}
    capital = float(inputs.get('capital_amount') or inputs.get('investment_amount') or 100000)
    risk_pct = int(inputs.get('risk_percentage', 50))
    duration = int(inputs.get('duration_years', 5))
    expected_returns = float(inputs.get('expected_returns', 15))

    # ── Inject risk profile if user_id provided ───────────────────────────────
    if body.user_id:
        from services.profile_cache import get_cached_profile
        profile = get_cached_profile(body.user_id)
        if not profile:
            from models.database import get_db
            from models.db_models import RiskProfile
            import json as _json
            db = next(get_db())
            rp = db.query(RiskProfile).filter(RiskProfile.user_id == body.user_id).first()
            if rp:
                profile = {
                    "risk_label":         rp.risk_label,
                    "risk_score":         rp.risk_score,
                    "horizon_years":      rp.horizon_years,
                    "loss_tolerance_pct": rp.loss_tolerance_pct,
                    "preferred_sectors":  _json.loads(rp.preferred_sectors or "[]"),
                    "excluded_sectors":   _json.loads(rp.excluded_sectors or "[]"),
                }
        if profile:
            inputs["user_risk_label"]        = profile.get("risk_label", "moderate")
            inputs["user_risk_score"]        = profile.get("risk_score", 50)
            inputs["user_horizon_years"]     = profile.get("horizon_years")
            inputs["user_preferred_sectors"] = profile.get("preferred_sectors", [])
            inputs["user_excluded_sectors"]  = profile.get("excluded_sectors", [])
            # derive risk_pct from profile if not explicitly set in inputs
            label = profile.get("risk_label", "moderate")
            if not inputs.get("risk_percentage"):
                risk_pct = 25 if "conserv" in label else 75 if "aggress" in label else 50

    asset_preferences = inputs.get('asset_preferences', {
        'stocks': True, 'mutual_funds': True, 'gold': True, 'crypto': True
    })
    if 'asset_classes' in inputs and not inputs.get('asset_preferences'):
        classes = [c.lower() for c in inputs['asset_classes']]
        joined = ' '.join(classes)
        asset_preferences = {
            'stocks':       any(k in joined for k in ['stock', 'nse', 'bse', 'equity']),
            'mutual_funds': any(k in joined for k in ['mutual', 'fund', 'mf']),
            'gold':         any(k in joined for k in ['gold', 'commodit']),
            'crypto':       any(k in joined for k in ['crypto', 'bitcoin', 'btc']),
        }

    rt = inputs.get('risk_tolerance', '').lower()
    if rt and not inputs.get('risk_percentage'):
        risk_pct = 25 if 'conserv' in rt else 75 if 'aggress' in rt else 50

    crew_inputs = {
        'capital_amount': capital,
        'risk_tolerance': 'conservative' if risk_pct < 30 else 'aggressive' if risk_pct >= 60 else 'moderate',
        'risk_percentage': risk_pct,
        'investment_horizon': f"{duration} years",
        'duration_years': duration,
        'expected_returns': expected_returns,
        'current_date': datetime.now().strftime("%Y-%m-%d"),
        'topic': body.message,
        'asset_preferences': asset_preferences,
        'stocks': asset_preferences.get('stocks', True),
        'mutual_funds': asset_preferences.get('mutual_funds', True),
        'gold': asset_preferences.get('gold', True),
        'crypto': asset_preferences.get('crypto', True),
        'execution_mode': 'deep',
    }

    async def event_generator():
        queue: asyncio.Queue = asyncio.Queue()

        async def _run_in_bg():
            try:
                from invex.engines.deep_engine import DeepEngine
                deep = DeepEngine()
                await deep.run_streaming(crew_inputs, queue)
                # Note: run_streaming puts the sentinel None into queue itself
                # so the event generator closes cleanly without needing it here
            except Exception as exc:
                logger.error(f"[SSE] Background crew error: {exc}", exc_info=True)
                # Only put error + sentinel if run_streaming didn't already
                try:
                    queue.put_nowait({"type": "error", "message": str(exc)})
                    queue.put_nowait(None)
                except Exception:
                    pass

        # Yield start event immediately
        yield f"data: {json.dumps({'type': 'start', 'message': 'Crew initializing…'})}\n\n"

        # Fire the crew in background
        bg_task = asyncio.create_task(_run_in_bg())

        # Stream events as they arrive
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=600)  # 10min max
            except asyncio.TimeoutError:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Analysis timed out after 10 minutes'})}\n\n"
                break
            if event is None:
                break
            try:
                yield f"data: {json.dumps(event)}\n\n"
            except Exception:
                pass   # skip unencodable events silently

        # Ensure background task is cleaned up
        if not bg_task.done():
            bg_task.cancel()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering
            "Connection": "keep-alive",
        },
    )


@router.get("/runs/{run_id}")
async def get_agent_run_by_id(run_id: str):
    return {"run_id": run_id, "status": "unknown", "result": None}
