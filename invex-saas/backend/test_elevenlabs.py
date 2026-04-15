import asyncio
from services.elevenlabs_service import synthesize_speech
async def main():
    try:
        res = await synthesize_speech("Hello World")
        print("Success, bytes:", len(res))
    except Exception as e:
        print("Failed:", e)

asyncio.run(main())
