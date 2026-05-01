import asyncio
import json
import logging
import os
import re
import tempfile
from io import BytesIO
from typing import Any, Dict, List, Optional

import numpy as np
import soundfile as sf
from groq import AsyncGroq
from pypdf import PdfReader

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class EarningsCallAnalyzer:
    _finbert_pipeline = None
    _finbert_attempted = False
    _whisper_model = None
    _whisper_attempted = False

    def __init__(self):
        api_key = getattr(settings, "GROQ_API_KEY", None)
        self.groq_client = AsyncGroq(api_key=api_key) if api_key else None

    async def analyze_earnings_call(
        self,
        company_symbol: str,
        quarter: str,
        transcript_text: Optional[str] = None,
        management_text: Optional[str] = None,
        qa_text: Optional[str] = None,
        previous_transcript_text: Optional[str] = None,
        source_type: str = "manual",
        audio_bytes: Optional[bytes] = None,
        audio_filename: Optional[str] = None,
    ) -> Dict[str, Any]:
        voice_tone_signals = {"available": False, "summary": "Voice tone analysis not available."}

        if (not transcript_text or not transcript_text.strip()) and audio_bytes:
            transcript_text = await self.transcribe_audio_bytes(audio_bytes, audio_filename)
            if transcript_text:
                source_type = "audio_upload"
            voice_tone_signals = self.analyze_voice_tone(audio_bytes, transcript_text or "")

        sections = self._build_sections(
            transcript_text=transcript_text,
            management_text=management_text,
            qa_text=qa_text,
            company_symbol=company_symbol,
            quarter=quarter,
        )

        current_analysis = await self._analyze_sections(sections)
        guidance = await self._extract_guidance(sections)
        comparison = await self._compare_to_previous(previous_transcript_text, current_analysis)
        keyword_intelligence = self._extract_keyword_intelligence("\n\n".join(sections.values()))
        section_dynamics = self._analyze_section_dynamics(sections)
        signal = self._generate_signal(current_analysis, guidance, comparison, keyword_intelligence, section_dynamics)

        limitations = [
            "Output is informational and should not be treated as investment advice.",
            "Best results come from complete management remarks and Q&A transcripts.",
        ]
        if source_type != "audio_upload":
            limitations.append("Voice tone proxies are only available when an earnings-call audio file is uploaded.")

        return {
            "company": company_symbol.upper(),
            "quarter": quarter,
            "source_type": source_type,
            "analysis_mode": "hybrid_transcript_audio_analysis",
            "transcript_available": bool(transcript_text and transcript_text.strip()),
            "sentiment_analysis": current_analysis,
            "financial_guidance": guidance,
            "vs_previous_quarter": comparison,
            "section_dynamics": section_dynamics,
            "keyword_intelligence": keyword_intelligence,
            "voice_tone_signals": voice_tone_signals,
            "market_tone": signal,
            "confidence_score": signal["confidence"],
            "key_takeaways": self._summarize_takeaways(current_analysis, guidance, keyword_intelligence),
            "limitations": limitations,
        }

    async def transcribe_audio_bytes(self, audio_bytes: bytes, audio_filename: Optional[str] = None) -> str:
        if not audio_bytes:
            return ""
        try:
            from services.deepgram_service import transcribe_audio_bytes

            transcript = transcribe_audio_bytes(audio_bytes)
            if transcript:
                return transcript
        except Exception as e:
            logger.error(f"Deepgram transcription fallback failed: {e}")

        whisper_model = self._get_whisper_model()
        if whisper_model is None:
            return ""

        suffix = os.path.splitext(audio_filename or "earnings_call.wav")[1] or ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(audio_bytes)
            temp_path = tmp.name

        try:
            result = await asyncio.to_thread(whisper_model.transcribe, temp_path, fp16=False)
            return (result or {}).get("text", "").strip()
        except Exception as e:
            logger.error(f"Whisper transcription failed: {e}")
            return ""
        finally:
            try:
                os.remove(temp_path)
            except OSError:
                pass

    def extract_text_from_pdf_bytes(self, pdf_bytes: bytes) -> str:
        if not pdf_bytes:
            return ""
        reader = PdfReader(BytesIO(pdf_bytes))
        pages = []
        for page in reader.pages:
            try:
                text = page.extract_text() or ""
            except Exception as e:
                logger.error(f"Failed to extract PDF page text: {e}")
                text = ""
            if text.strip():
                pages.append(text.strip())
        return "\n\n".join(pages).strip()

    def analyze_voice_tone(self, audio_bytes: bytes, transcript_text: str) -> Dict[str, Any]:
        try:
            samples, sample_rate = sf.read(BytesIO(audio_bytes), always_2d=False)
            if isinstance(samples, np.ndarray) and samples.ndim > 1:
                samples = samples.mean(axis=1)
            samples = np.asarray(samples, dtype=float)
            if samples.size == 0:
                raise ValueError("empty audio")

            window_size = max(int(sample_rate * 0.25), 1)
            energies = []
            for start in range(0, len(samples), window_size):
                chunk = samples[start : start + window_size]
                if chunk.size:
                    energies.append(float(np.sqrt(np.mean(np.square(chunk)))))

            mean_energy = float(np.mean(energies)) if energies else 0.0
            silence_ratio = float(sum(1 for e in energies if e < 0.01) / len(energies)) if energies else 0.0
            duration_seconds = round(len(samples) / sample_rate, 2) if sample_rate else 0.0
            word_count = len(re.findall(r"\b\w+\b", transcript_text))
            words_per_minute = round((word_count / duration_seconds) * 60, 2) if duration_seconds > 0 else None
            hesitation_count = len(re.findall(r"\b(um|uh|erm|hmm)\b", transcript_text.lower()))
            confidence_tone = "CONFIDENT" if mean_energy > 0.08 and silence_ratio < 0.22 else "HESITANT" if silence_ratio > 0.35 or hesitation_count >= 4 else "STEADY"
            stress_signal = "ELEVATED" if silence_ratio > 0.32 and hesitation_count >= 3 else "NORMAL"
            return {
                "available": True,
                "duration_seconds": duration_seconds,
                "words_per_minute": words_per_minute,
                "silence_ratio": round(silence_ratio, 3),
                "hesitation_count": hesitation_count,
                "energy_score": round(mean_energy, 4),
                "confidence_tone": confidence_tone,
                "stress_signal": stress_signal,
                "summary": f"Audio proxies suggest a {confidence_tone.lower()} delivery with {stress_signal.lower()} stress markers.",
            }
        except Exception as e:
            logger.error(f"Voice tone analysis unavailable: {e}")
            return {"available": False, "summary": "Voice tone analysis unavailable for this audio format."}

    def _build_sections(
        self,
        transcript_text: Optional[str],
        management_text: Optional[str],
        qa_text: Optional[str],
        company_symbol: str,
        quarter: str,
    ) -> Dict[str, str]:
        if management_text or qa_text:
            return {
                "management_discussion": (management_text or "").strip(),
                "qa_session": (qa_text or "").strip(),
            }
        if transcript_text and transcript_text.strip():
            cleaned = transcript_text.strip()
            qa_match = re.search(r"\b(q&a|q and a|question[- ]and[- ]answer|questions?[- ]and[- ]answers?)\b", cleaned, flags=re.IGNORECASE)
            if qa_match:
                return {"management_discussion": cleaned[:qa_match.start()].strip(), "qa_session": cleaned[qa_match.start():].strip()}
            analyst_match = re.search(r"\b(analyst|operator)\s*:", cleaned, flags=re.IGNORECASE)
            if analyst_match:
                return {"management_discussion": cleaned[:analyst_match.start()].strip(), "qa_session": cleaned[analyst_match.start():].strip()}
            midpoint = len(cleaned) // 2
            return {"management_discussion": cleaned[:midpoint].strip(), "qa_session": cleaned[midpoint:].strip()}
        return self._mock_sections(company_symbol, quarter)

    async def _analyze_sections(self, sections: Dict[str, str]) -> Dict[str, Any]:
        results: Dict[str, Any] = {}
        for section_name, text in sections.items():
            results[section_name] = await self._analyze_single_section(section_name, text)
        return results

    async def _analyze_single_section(self, section_name: str, text: str) -> Dict[str, Any]:
        fallback = self._fallback_section_analysis(text)
        if not text.strip():
            return {
                **fallback,
                "overall_sentiment": "INSUFFICIENT_DATA",
                "confidence": 0.2,
                "key_positive_points": [],
                "key_concerns": ["Section transcript not available."],
                "key_themes": [],
                "finbert_signal": {"available": False},
            }

        finbert_signal = self._finbert_signal(text)
        prompt = f"""
        Analyze this earnings call section and return strict JSON only.

        Section: {section_name}
        Transcript:
        {text[:12000]}

        FinBERT supporting signal:
        {json.dumps(finbert_signal)}

        Return JSON with exactly these keys:
        {{
          "overall_sentiment": "POSITIVE|NEUTRAL|NEGATIVE",
          "confidence": 0.0,
          "key_positive_points": ["point 1", "point 2"],
          "key_concerns": ["concern 1", "concern 2"],
          "key_themes": ["theme 1", "theme 2"],
          "tone_summary": "one sentence"
        }}
        """
        llm_result = await self._llm_json(prompt, fallback)
        return {
            "overall_sentiment": llm_result.get("overall_sentiment", fallback["overall_sentiment"]),
            "confidence": self._coerce_confidence(llm_result.get("confidence"), fallback["confidence"]),
            "key_positive_points": self._normalize_str_list(llm_result.get("key_positive_points"), fallback["key_positive_points"]),
            "key_concerns": self._normalize_str_list(llm_result.get("key_concerns"), fallback["key_concerns"]),
            "key_themes": self._normalize_str_list(llm_result.get("key_themes"), fallback["key_themes"]),
            "tone_summary": str(llm_result.get("tone_summary") or fallback["tone_summary"]),
            "finbert_signal": finbert_signal,
        }

    async def _extract_guidance(self, sections: Dict[str, str]) -> Dict[str, Any]:
        combined_text = "\n\n".join([text for text in sections.values() if text.strip()])
        fallback = self._fallback_guidance(combined_text)
        if not combined_text:
            return fallback

        prompt = f"""
        Extract earnings guidance signals from this transcript and return strict JSON only.

        Transcript:
        {combined_text[:14000]}

        Return JSON:
        {{
          "revenue_guidance": "RAISED|LOWERED|MAINTAINED|UNCLEAR",
          "profit_guidance": "RAISED|LOWERED|MAINTAINED|UNCLEAR",
          "margin_outlook": "EXPANDING|PRESSURED|STABLE|UNCLEAR",
          "demand_outlook": "STRONG|SOFTENING|MIXED|UNCLEAR",
          "capex_signal": "INCREASING|DISCIPLINED|REDUCING|UNCLEAR",
          "guidance_summary": "one sentence"
        }}
        """
        llm_result = await self._llm_json(prompt, fallback)
        return {
            "revenue_guidance": llm_result.get("revenue_guidance", fallback["revenue_guidance"]),
            "profit_guidance": llm_result.get("profit_guidance", fallback["profit_guidance"]),
            "margin_outlook": llm_result.get("margin_outlook", fallback["margin_outlook"]),
            "demand_outlook": llm_result.get("demand_outlook", fallback["demand_outlook"]),
            "capex_signal": llm_result.get("capex_signal", fallback["capex_signal"]),
            "guidance_summary": str(llm_result.get("guidance_summary") or fallback["guidance_summary"]),
        }

    async def _compare_to_previous(self, previous_transcript_text: Optional[str], current_analysis: Dict[str, Any]) -> Dict[str, Any]:
        if not previous_transcript_text or not previous_transcript_text.strip():
            return {"comparison_available": False, "sentiment_improving": None, "summary": "Previous-quarter transcript not provided."}

        previous_sections = self._build_sections(
            transcript_text=previous_transcript_text,
            management_text=None,
            qa_text=None,
            company_symbol="previous",
            quarter="previous",
        )
        previous_analysis = await self._analyze_sections(previous_sections)
        current_score = self._sentiment_score(current_analysis)
        previous_score = self._sentiment_score(previous_analysis)
        delta = round(current_score - previous_score, 3)

        if delta > 0.08:
            summary = "Sentiment appears improved versus the previous quarter."
        elif delta < -0.08:
            summary = "Sentiment appears weaker versus the previous quarter."
        else:
            summary = "Sentiment appears broadly stable versus the previous quarter."

        return {
            "comparison_available": True,
            "sentiment_improving": delta > 0.08,
            "current_sentiment_score": round(current_score, 3),
            "previous_sentiment_score": round(previous_score, 3),
            "delta": delta,
            "summary": summary,
        }

    def _analyze_section_dynamics(self, sections: Dict[str, str]) -> Dict[str, Any]:
        per_section = {}
        direction_scores = []

        for section_name, text in sections.items():
            early, late = self._split_early_late(text)
            early_signal = self._quick_sentiment_label(early)
            late_signal = self._quick_sentiment_label(late)
            shift = self._shift_label(early_signal["score"], late_signal["score"])
            direction_scores.append(late_signal["score"] - early_signal["score"])
            per_section[section_name] = {
                "early_sentiment": early_signal["label"],
                "late_sentiment": late_signal["label"],
                "shift": shift,
            }

        avg_shift = sum(direction_scores) / len(direction_scores) if direction_scores else 0.0
        return {
            "management_discussion": per_section.get("management_discussion", {}),
            "qa_session": per_section.get("qa_session", {}),
            "overall_call_shift": self._shift_label(0.0, avg_shift),
        }

    def _extract_keyword_intelligence(self, text: str) -> Dict[str, Any]:
        lowered = text.lower()
        bullish_terms = ["strong demand", "healthy pipeline", "margin expansion", "raising guidance", "robust order book", "improving mix"]
        caution_terms = ["headwinds", "uncertainty", "margin pressure", "soft demand", "pricing pressure", "slowdown"]
        operational_terms = ["capex", "inventory", "working capital", "supply chain", "utilization"]

        def collect(terms: List[str]) -> Dict[str, int]:
            return {term: lowered.count(term) for term in terms if lowered.count(term) > 0}

        bullish_hits = collect(bullish_terms)
        caution_hits = collect(caution_terms)
        operational_hits = collect(operational_terms)
        return {
            "bullish_mentions": bullish_hits,
            "caution_mentions": caution_hits,
            "operational_mentions": operational_hits,
            "net_keyword_bias": sum(bullish_hits.values()) - sum(caution_hits.values()),
        }

    def _generate_signal(self, sentiment: Dict[str, Any], guidance: Dict[str, Any], comparison: Dict[str, Any], keyword_intelligence: Dict[str, Any], section_dynamics: Dict[str, Any]) -> Dict[str, Any]:
        score = 50
        management_sentiment = sentiment["management_discussion"]["overall_sentiment"]
        qa_sentiment = sentiment["qa_session"]["overall_sentiment"]

        if management_sentiment == "POSITIVE":
            score += 10
        elif management_sentiment == "NEGATIVE":
            score -= 10
        if qa_sentiment == "POSITIVE":
            score += 14
        elif qa_sentiment == "NEGATIVE":
            score -= 14
        if guidance.get("revenue_guidance") == "RAISED":
            score += 10
        elif guidance.get("revenue_guidance") == "LOWERED":
            score -= 10
        if guidance.get("profit_guidance") == "RAISED":
            score += 10
        elif guidance.get("profit_guidance") == "LOWERED":
            score -= 10
        if guidance.get("margin_outlook") == "EXPANDING":
            score += 6
        elif guidance.get("margin_outlook") == "PRESSURED":
            score -= 6
        if comparison.get("comparison_available") and comparison.get("sentiment_improving") is True:
            score += 8
        elif comparison.get("comparison_available") and comparison.get("sentiment_improving") is False:
            score -= 8
        score += max(-8, min(8, keyword_intelligence.get("net_keyword_bias", 0) * 2))
        if section_dynamics.get("overall_call_shift") == "IMPROVING":
            score += 5
        elif section_dynamics.get("overall_call_shift") == "SOFTENING":
            score -= 5

        score = max(0, min(100, score))
        if score >= 72:
            return {"stance": "POSITIVE_EARNINGS_TONE", "confidence": score, "summary": "Management commentary, Q&A tone, and guidance together lean constructive."}
        if score <= 38:
            return {"stance": "CAUTIOUS_EARNINGS_TONE", "confidence": score, "summary": "The call suggests a more cautious setup with visible pressure points."}
        return {"stance": "MIXED_EARNINGS_TONE", "confidence": score, "summary": "The call appears mixed, with constructive signals balanced by caution."}

    def _summarize_takeaways(self, sentiment: Dict[str, Any], guidance: Dict[str, Any], keyword_intelligence: Dict[str, Any]) -> Dict[str, Any]:
        positives: List[str] = []
        concerns: List[str] = []
        themes: List[str] = []
        for section in ("management_discussion", "qa_session"):
            positives.extend(sentiment.get(section, {}).get("key_positive_points", []))
            concerns.extend(sentiment.get(section, {}).get("key_concerns", []))
            themes.extend(sentiment.get(section, {}).get("key_themes", []))
        if keyword_intelligence.get("bullish_mentions"):
            positives.append("Bullish phrases detected: " + ", ".join(list(keyword_intelligence["bullish_mentions"].keys())[:3]))
        if keyword_intelligence.get("caution_mentions"):
            concerns.append("Caution phrases detected: " + ", ".join(list(keyword_intelligence["caution_mentions"].keys())[:3]))
        return {
            "positives": self._dedupe_keep_order(positives)[:5],
            "concerns": self._dedupe_keep_order(concerns)[:5],
            "themes": self._dedupe_keep_order(themes)[:6],
            "guidance_summary": guidance.get("guidance_summary", ""),
        }

    async def _llm_json(self, prompt: str, fallback: Dict[str, Any]) -> Dict[str, Any]:
        if not self.groq_client:
            return fallback
        try:
            completion = await self.groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[
                    {"role": "system", "content": "You are a financial earnings analysis assistant. Return strict JSON only."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                max_tokens=900,
                response_format={"type": "json_object"},
            )
            raw = completion.choices[0].message.content.strip()
            return json.loads(self._extract_json(raw))
        except Exception as e:
            logger.error(f"Earnings analyzer LLM fallback used: {e}")
            return fallback

    def _get_finbert_pipeline(self):
        if self.__class__._finbert_pipeline is not None:
            return self.__class__._finbert_pipeline
        if self.__class__._finbert_attempted:
            return None
        self.__class__._finbert_attempted = True
        try:
            from transformers import AutoModelForSequenceClassification, AutoTokenizer, pipeline

            tokenizer = AutoTokenizer.from_pretrained("ProsusAI/finbert", local_files_only=True)
            model = AutoModelForSequenceClassification.from_pretrained("ProsusAI/finbert", local_files_only=True)
            self.__class__._finbert_pipeline = pipeline("sentiment-analysis", model=model, tokenizer=tokenizer)
        except Exception as e:
            logger.error(f"FinBERT unavailable, using fallback sentiment only: {e}")
            self.__class__._finbert_pipeline = None
        return self.__class__._finbert_pipeline

    def _get_whisper_model(self):
        if self.__class__._whisper_model is not None:
            return self.__class__._whisper_model
        if self.__class__._whisper_attempted:
            return None
        self.__class__._whisper_attempted = True
        try:
            import whisper

            self.__class__._whisper_model = whisper.load_model("base")
        except Exception as e:
            logger.error(f"Whisper unavailable, audio transcription fallback disabled: {e}")
            self.__class__._whisper_model = None
        return self.__class__._whisper_model

    def _finbert_signal(self, text: str) -> Dict[str, Any]:
        pipeline = self._get_finbert_pipeline()
        if pipeline is None:
            fallback = self._fallback_section_analysis(text)
            return {"available": False, "label": fallback["overall_sentiment"], "confidence": fallback["confidence"]}

        sentences = self._split_sentences(text)[:18]
        if not sentences:
            return {"available": False, "label": "NEUTRAL", "confidence": 0.5}

        label_scores = {"positive": [], "negative": [], "neutral": []}
        try:
            for sentence in sentences:
                result = pipeline(sentence[:512])[0]
                label = str(result.get("label", "neutral")).lower()
                score = float(result.get("score", 0.5))
                if label not in label_scores:
                    label = "neutral"
                label_scores[label].append(score)
            totals = {label: (sum(values) / len(values)) if values else 0.0 for label, values in label_scores.items()}
            best_label = max(totals, key=totals.get)
            mapped = {"positive": "POSITIVE", "negative": "NEGATIVE", "neutral": "NEUTRAL"}
            return {"available": True, "label": mapped[best_label], "confidence": round(totals[best_label], 3), "sentence_count": len(sentences)}
        except Exception as e:
            logger.error(f"FinBERT inference failed: {e}")
            fallback = self._fallback_section_analysis(text)
            return {"available": False, "label": fallback["overall_sentiment"], "confidence": fallback["confidence"]}

    def _extract_json(self, raw: str) -> str:
        cleaned = raw.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end >= start:
            return cleaned[start : end + 1]
        return cleaned

    def _fallback_section_analysis(self, text: str) -> Dict[str, Any]:
        lowered = text.lower()
        positive_hits = sum(lowered.count(word) for word in self._positive_keywords())
        negative_hits = sum(lowered.count(word) for word in self._negative_keywords())
        net = positive_hits - negative_hits
        sentiment = "POSITIVE" if net >= 2 else "NEGATIVE" if net <= -2 else "NEUTRAL"
        confidence = 0.68 if abs(net) >= 2 else 0.55
        sentences = self._split_sentences(text)
        positives = [s for s in sentences if self._contains_keywords(s, self._positive_keywords())][:2]
        concerns = [s for s in sentences if self._contains_keywords(s, self._negative_keywords())][:2]
        return {
            "overall_sentiment": sentiment,
            "confidence": confidence,
            "key_positive_points": positives or ["Limited explicit positive guidance detected."],
            "key_concerns": concerns or ["Limited explicit risk commentary detected."],
            "key_themes": self._extract_themes(text),
            "tone_summary": f"Fallback analysis suggests a {sentiment.lower()} tone.",
        }

    def _fallback_guidance(self, text: str) -> Dict[str, Any]:
        lowered = text.lower()
        return {
            "revenue_guidance": self._detect_guidance(lowered, "revenue"),
            "profit_guidance": self._detect_guidance(lowered, "profit"),
            "margin_outlook": self._detect_margin_outlook(lowered),
            "demand_outlook": self._detect_demand_outlook(lowered),
            "capex_signal": self._detect_capex_signal(lowered),
            "guidance_summary": "Guidance estimated from transcript language using fallback rules.",
        }

    def _detect_guidance(self, text: str, topic: str) -> str:
        if any(term in text for term in [f"raise {topic}", f"raised {topic}", f"{topic} guidance raised", f"higher {topic}"]):
            return "RAISED"
        if any(term in text for term in [f"lower {topic}", f"lowered {topic}", f"{topic} guidance lowered", f"weaker {topic}"]):
            return "LOWERED"
        if "maintain" in text or "unchanged" in text:
            return "MAINTAINED"
        return "UNCLEAR"

    def _detect_margin_outlook(self, text: str) -> str:
        if any(term in text for term in ["margin expansion", "expanded margins", "better margins"]):
            return "EXPANDING"
        if any(term in text for term in ["margin pressure", "compressed margins", "lower margins"]):
            return "PRESSURED"
        if "stable margin" in text or "margin stable" in text:
            return "STABLE"
        return "UNCLEAR"

    def _detect_demand_outlook(self, text: str) -> str:
        if any(term in text for term in ["strong demand", "healthy demand", "robust demand"]):
            return "STRONG"
        if any(term in text for term in ["weak demand", "soft demand", "demand slowdown"]):
            return "SOFTENING"
        if any(term in text for term in ["mixed demand", "uneven demand"]):
            return "MIXED"
        return "UNCLEAR"

    def _detect_capex_signal(self, text: str) -> str:
        if any(term in text for term in ["increase capex", "higher capex", "capacity expansion"]):
            return "INCREASING"
        if any(term in text for term in ["disciplined capex", "selective capex"]):
            return "DISCIPLINED"
        if any(term in text for term in ["reduce capex", "lower capex"]):
            return "REDUCING"
        return "UNCLEAR"

    def _sentiment_score(self, analysis: Dict[str, Any]) -> float:
        mapping = {"POSITIVE": 0.75, "NEUTRAL": 0.5, "NEGATIVE": 0.25, "INSUFFICIENT_DATA": 0.5}
        mgmt = analysis.get("management_discussion", {})
        qa = analysis.get("qa_session", {})
        mgmt_score = mapping.get(mgmt.get("overall_sentiment"), 0.5) * float(mgmt.get("confidence", 0.5))
        qa_score = mapping.get(qa.get("overall_sentiment"), 0.5) * float(qa.get("confidence", 0.5))
        denom = 0.45 * float(mgmt.get("confidence", 0.5)) + 0.55 * float(qa.get("confidence", 0.5))
        return ((mgmt_score * 0.45) + (qa_score * 0.55)) / max(denom, 0.01)

    def _split_sentences(self, text: str) -> List[str]:
        return [part.strip() for part in re.split(r"(?<=[.!?])\s+", text) if part.strip()]

    def _extract_themes(self, text: str) -> List[str]:
        themes = []
        lowered = text.lower()
        theme_map = {
            "demand": ["demand", "orders", "bookings"],
            "margin": ["margin", "profitability", "ebitda"],
            "costs": ["cost", "inflation", "expenses"],
            "guidance": ["guidance", "outlook", "forecast"],
            "supply chain": ["supply chain", "bottleneck", "inventory"],
            "capex": ["capex", "investment", "capacity"],
            "pricing": ["pricing", "realization", "price increase"],
        }
        for label, keywords in theme_map.items():
            if any(keyword in lowered for keyword in keywords):
                themes.append(label)
        return themes[:5]

    def _contains_keywords(self, text: str, keywords: List[str]) -> bool:
        lowered = text.lower()
        return any(keyword in lowered for keyword in keywords)

    def _positive_keywords(self) -> List[str]:
        return ["strong", "robust", "growth", "improved", "raise", "raised", "momentum", "expansion", "healthy", "confident", "resilient"]

    def _negative_keywords(self) -> List[str]:
        return ["weak", "pressure", "headwind", "uncertain", "challenging", "decline", "lowered", "risk", "slowdown", "soft", "volatility"]

    def _split_early_late(self, text: str) -> tuple[str, str]:
        sentences = self._split_sentences(text)
        if len(sentences) < 4:
            midpoint = len(text) // 2
            return text[:midpoint], text[midpoint:]
        midpoint = len(sentences) // 2
        return " ".join(sentences[:midpoint]), " ".join(sentences[midpoint:])

    def _quick_sentiment_label(self, text: str) -> Dict[str, Any]:
        fallback = self._fallback_section_analysis(text)
        mapping = {"POSITIVE": 1.0, "NEUTRAL": 0.0, "NEGATIVE": -1.0}
        return {"label": fallback["overall_sentiment"], "score": mapping.get(fallback["overall_sentiment"], 0.0)}

    def _shift_label(self, early_score: float, late_score: float) -> str:
        delta = late_score - early_score
        if delta > 0.35:
            return "IMPROVING"
        if delta < -0.35:
            return "SOFTENING"
        return "STABLE"

    def _normalize_str_list(self, value: Any, fallback: List[str]) -> List[str]:
        if not isinstance(value, list):
            return fallback
        cleaned = [str(item).strip() for item in value if str(item).strip()]
        return cleaned or fallback

    def _coerce_confidence(self, value: Any, fallback: float) -> float:
        try:
            score = float(value)
        except (TypeError, ValueError):
            return fallback
        return max(0.0, min(1.0, score))

    def _dedupe_keep_order(self, values: List[str]) -> List[str]:
        seen = set()
        result = []
        for value in values:
            if value not in seen:
                seen.add(value)
                result.append(value)
        return result

    def _mock_sections(self, symbol: str, quarter: str) -> Dict[str, str]:
        return {
            "management_discussion": (
                f"In {quarter}, {symbol} reported healthy demand across core segments, better execution, "
                "and some margin improvement. Management said it sees stable near-term demand and remains "
                "confident in the medium-term pipeline."
            ),
            "qa_session": (
                "Analysts asked about pricing pressure, supply chain normalization, and demand visibility. "
                "Management acknowledged some near-term macro uncertainty but said execution remains on track."
            ),
        }
