import os
import requests
import logging
import base64

logger = logging.getLogger(__name__)

def generate_murf_tts(text: str) -> bytes:
    """
    Sends text to Murf AI and returns raw MP3 bytes.
    """
    api_key = os.getenv("MURF_API_KEY")
    if not api_key:
        logger.error("MURF_API_KEY is missing.")
        return b""

    murf_url = "https://api.murf.ai/v1/speech/generate"
    
    headers = {
        "api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    payload = {
        "text": text,
        "voiceId": "en-US-natalie",
        "format": "MP3",
        "encodeAsBase64": True
    }

    try:
        response = requests.post(murf_url, json=payload, headers=headers, timeout=15.0)
        
        if response.status_code != 200:
            logger.error(f"Murf API Error: {response.text}")
            return b""

        data = response.json()

        encoded_audio = data.get("encodedAudio")
        if encoded_audio:
            return base64.b64decode(encoded_audio)

        audio_file = data.get("audioFile")
        if audio_file:
            audio_response = requests.get(audio_file, timeout=15.0)
            audio_response.raise_for_status()
            return audio_response.content

        logger.error(f"Murf API returned no audio payload: {data}")
        return b""
    except Exception as e:
        logger.error(f"Murf TTS failed: {str(e)}")
        return b""
