"""
backend/services/prosody_analyzer.py

Lightweight prosody analysis on raw audio bytes.
No ML models — uses numpy math + soundfile for:
  - Pause duration score (long pauses → hesitation signal)
  - Speech rate score   (slow speech → uncertainty signal)
  - Volume variance     (high variance → emotional response)

All scores are normalized 0.0–1.0.
A high score means MORE of that signal (e.g. 0.9 pause_score = long pauses detected).
"""

from __future__ import annotations

import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ── Silence detection thresholds ─────────────────────────────────────────────
SILENCE_RMS_THRESHOLD = 0.01      # RMS energy below this = silence frame
SILENCE_MIN_DURATION_S  = 0.5    # Silences shorter than this are ignored
SPEECH_RATE_BASELINE_WPM = 130   # Average conversational WPM for normalization


def analyze_audio(
    audio_bytes: bytes,
    transcript: str,
    mime_type: str = "audio/webm",
) -> dict:
    """
    Analyse audio bytes for prosody signals.

    Returns:
        {
            "pause_score":    float  # 0-1, higher = more/longer pauses
            "rate_score":     float  # 0-1, higher = slower speech
            "variance_score": float  # 0-1, higher = more volume variation
            "pause_duration_s": float  # total silence duration in seconds
            "speech_rate_wpm":  float  # estimated words per minute
            "volume_variance":  float  # raw RMS variance
            "conflict_signal":  bool   # True if any signal crosses hesitation threshold
        }
    """
    try:
        import numpy as np
        import soundfile as sf

        audio_buf = io.BytesIO(audio_bytes)

        # soundfile can read WebM/OGG/WAV/FLAC — falls back gracefully
        try:
            data, samplerate = sf.read(audio_buf, dtype="float32", always_2d=False)
        except Exception:
            # If soundfile can't decode (e.g. raw WebM without codec),
            # return neutral signals — don't block the interview
            return _neutral_signals("soundfile_decode_failed")

        # Mono
        if data.ndim > 1:
            data = data.mean(axis=1)

        total_duration_s = len(data) / samplerate

        # ── Pause detection ───────────────────────────────────────────────────
        frame_size = int(samplerate * 0.025)   # 25ms frames
        hop_size   = frame_size // 2
        frames = [
            data[i : i + frame_size]
            for i in range(0, len(data) - frame_size, hop_size)
        ]
        rms_per_frame = np.array([np.sqrt(np.mean(f**2)) for f in frames])
        silence_mask = rms_per_frame < SILENCE_RMS_THRESHOLD

        # Count consecutive silence frames → convert to seconds
        pause_duration_s = _count_pause_duration(silence_mask, hop_size, samplerate)

        # Normalize: 0 = no pauses, 1 = majority of audio is pause
        pause_score = min(pause_duration_s / max(total_duration_s, 0.01), 1.0)

        # ── Speech rate ───────────────────────────────────────────────────────
        # Estimate from transcript word count / speech (non-silence) duration
        word_count = len(transcript.split()) if transcript else 0
        speech_duration_s = max(total_duration_s - pause_duration_s, 0.5)
        speech_rate_wpm = (word_count / speech_duration_s) * 60.0

        # High rate_score = SLOW speech (below baseline)
        rate_score = max(
            0.0,
            1.0 - (speech_rate_wpm / SPEECH_RATE_BASELINE_WPM)
        )
        rate_score = min(rate_score, 1.0)

        # ── Volume variance ───────────────────────────────────────────────────
        # High variance can mean emotional emphasis or anxiety
        volume_variance = float(np.var(rms_per_frame))
        # Normalize to 0-1: empirically, variance > 0.005 is high
        variance_score = min(volume_variance / 0.005, 1.0)

        # ── Conflict signal ───────────────────────────────────────────────────
        # Flag if pause OR slowness exceeds hesitation thresholds
        conflict_signal = (pause_score > 0.35) or (rate_score > 0.45)

        return {
            "pause_score":      round(pause_score, 3),
            "rate_score":       round(rate_score, 3),
            "variance_score":   round(variance_score, 3),
            "pause_duration_s": round(pause_duration_s, 2),
            "speech_rate_wpm":  round(speech_rate_wpm, 1),
            "volume_variance":  round(volume_variance, 6),
            "conflict_signal":  conflict_signal,
        }

    except ImportError:
        logger.warning("soundfile/numpy not installed — returning neutral prosody signals")
        return _neutral_signals("missing_dependencies")

    except Exception as exc:
        logger.warning(f"Prosody analysis failed: {exc} — returning neutral signals")
        return _neutral_signals(str(exc))


def _count_pause_duration(
    silence_mask: "np.ndarray",  # type: ignore[name-defined]
    hop_size: int,
    samplerate: int,
) -> float:
    """Sum up consecutive silence segments longer than SILENCE_MIN_DURATION_S."""
    min_silence_frames = int((SILENCE_MIN_DURATION_S * samplerate) / hop_size)
    total_pause_s = 0.0
    count = 0

    for is_silent in silence_mask:
        if is_silent:
            count += 1
        else:
            if count >= min_silence_frames:
                total_pause_s += (count * hop_size) / samplerate
            count = 0

    # Final segment
    if count >= min_silence_frames:
        total_pause_s += (count * hop_size) / samplerate

    return total_pause_s


def _neutral_signals(reason: str = "") -> dict:
    """Return neutral prosody (no conflict signal) when analysis fails."""
    return {
        "pause_score":      0.1,
        "rate_score":       0.1,
        "variance_score":   0.1,
        "pause_duration_s": 0.0,
        "speech_rate_wpm":  120.0,
        "volume_variance":  0.001,
        "conflict_signal":  False,
        "note":             f"Neutral fallback: {reason}",
    }
