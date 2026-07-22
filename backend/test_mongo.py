import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def test():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["invex_db"]
    try:
        cursor = db["agent_runs"].find({"user_id": "fake"}).sort("created_at", -1).limit(10)
        runs = await cursor.to_list(length=10)
        print("Success:", runs)
    except Exception as e:
        print("Error:", repr(e))

asyncio.run(test())
