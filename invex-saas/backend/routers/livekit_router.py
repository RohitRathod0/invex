from fastapi import APIRouter, HTTPException, Request, Depends
from livekit import api
import os
import uuid
import logging
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/risk/livekit", tags=["livekit"])

class LiveKitTokenRequest(BaseModel):
    user_id: str

@router.post("/token")
async def get_livekit_token(body: LiveKitTokenRequest):
    """
    Generate a LiveKit token for the frontend client to connect.
    We assign a unique room name for this interview session.
    """
    livekit_api_key = os.getenv("LIVEKIT_API_KEY")
    livekit_api_secret = os.getenv("LIVEKIT_API_SECRET")
    
    if not livekit_api_key or not livekit_api_secret:
        logger.error("LiveKit credentials not found in env.")
        raise HTTPException(status_code=500, detail="LiveKit credentials missing")

    participant_name = f"user_{body.user_id}"
    room_name = f"risk-interview-{body.user_id}-{uuid.uuid4().hex[:8]}"

    try:
        # Create a token for the user to join the room
        token = api.AccessToken(
            livekit_api_key, 
            livekit_api_secret
        ) \
        .with_identity(participant_name) \
        .with_name("Human") \
        .with_grants(api.VideoGrants(
            room_join=True,
            room=room_name,
        ))

        return {
            "token": token.to_jwt(),
            "room_name": room_name,
            "participant_name": participant_name
        }
    except Exception as e:
        logger.error(f"Error generating token: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate LiveKit token")
