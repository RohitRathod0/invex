# NOTE: Active TTS is murf_service.py. ElevenLabs is a fallback candidate.
import os
import logging
import httpx
from fastapi import HTTPException
from config import get_settings

logger = logging.getLogger(__name__)

# Status codes from ElevenLabs that mean "quota / auth issue, not our bug"
_ELEVENLABS_QUOTA_CODES = {401, 403, 429}

async def synthesize_speech(text: str, voice_id: str = "laIfd2zdo5aIukjt406E") -> bytes:
    """
    Synthesize speech using ElevenLabs API with the given Voice ID.
    Streams back audio as bytes (mp3 by default).

    Raises HTTPException(503) when ElevenLabs quota / auth is exhausted so the
    frontend can fall back to browser SpeechSynthesis gracefully.
    """
    settings = get_settings()
    api_key = settings.ELEVENLABS_API_KEY or os.getenv("ELEVENLABS_API_KEY", "")
    
    if not api_key:
        logger.error("ELEVENLABS_API_KEY is not set.")
        raise HTTPException(status_code=503, detail="TTS service not configured — use browser fallback.")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128"
    
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": api_key,
    }
    
    payload = {
        "text": text,
        "model_id": "eleven_turbo_v2_5",
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            
            if response.status_code in _ELEVENLABS_QUOTA_CODES:
                logger.warning(f"ElevenLabs quota/auth error [{response.status_code}]: {response.text[:200]}")
                raise HTTPException(
                    status_code=503,
                    detail="TTS quota exhausted — use browser fallback."
                )
            
            if response.status_code != 200:
                logger.error(f"ElevenLabs API Error [{response.status_code}]: {response.text}")
                raise HTTPException(status_code=503, detail=f"ElevenLabs Error: {response.text}")
                
            return response.content
    except HTTPException:
        raise
    except httpx.HTTPStatusError as exc:
        logger.error(f"ElevenLabs HTTP error: {str(exc)}")
        raise HTTPException(status_code=503, detail="ElevenLabs service unavailable")
    except Exception as exc:
        logger.error(f"ElevenLabs general error: {str(exc)}")
        raise HTTPException(status_code=503, detail="Internal error during speech synthesis")
