import os
import logging
from deepgram import DeepgramClient

try:
    from deepgram import PrerecordedOptions
except ImportError:
    PrerecordedOptions = None

logger = logging.getLogger(__name__)

def transcribe_audio_bytes(audio_data: bytes) -> str:
    """
    Takes raw audio bytes and transcribes them using Deepgram.
    This uses the synchronous REST request.
    """
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        logger.error("DEEPGRAM_API_KEY is missing.")
        return ""

    try:
        deepgram = DeepgramClient(api_key=api_key)

        if PrerecordedOptions is not None:
            payload = {
                "buffer": audio_data,
            }
            options = PrerecordedOptions(
                model="nova-2",
                smart_format=True,
                language="en-US"
            )
            response = deepgram.listen.rest.v("1").transcribe_file(payload, options)
        else:
            # Newer Deepgram SDKs expose prerecorded transcription under listen.v1.media
            # and accept request options as keyword arguments instead of a separate options object.
            response = deepgram.listen.v1.media.transcribe_file(
                request=audio_data,
                model="nova-2",
                smart_format=True,
                language="en-US",
            )

        result = response.results.channels[0].alternatives[0].transcript
        return result
    except Exception as e:
        logger.error(f"Deepgram STT failed: {str(e)}")
        return ""
