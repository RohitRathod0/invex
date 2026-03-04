import asyncio
import boto3
import uuid
import json
from datetime import datetime
from botocore.exceptions import ClientError
from config import get_settings
from models.api_models import Session

settings = get_settings()

class SessionService:
    def __init__(self):
        self.table_name = settings.INVEX_DYNAMODB_TABLE_SESSIONS
        # Initialize DynamoDB resource
        # In a real app, we might handle local endpoint for DynamoDB Local
        try:
            self.dynamodb = boto3.resource('dynamodb', region_name=settings.AWS_REGION)
            self.table = self.dynamodb.Table(self.table_name)
        except Exception as e:
            print(f"DynamoDB initialization failed: {e}")
            self.table = None

    async def create_session(self, user_name: str = "Anonymous") -> Session:
        session_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        session_data = {
            'session_id': session_id,
            'user_name': user_name,
            'created_at': timestamp,
            'status': 'active',
            'messages_json': '[]' # Store as JSON string in DynamoDB
        }
        
        if self.table:
            try:
                await asyncio.to_thread(self.table.put_item, Item=session_data)
            except Exception as e:
                print(f"Error creating session in DynamoDB: {e}")
                # Fallback to memory or error? For now, we proceed to return object
                
        return Session(
            session_id=session_id,
            user_name=user_name,
            created_at=timestamp,
            status='active',
            messages=[]
        )

    async def get_session(self, session_id: str) -> Session:
        if not self.table:
            return None
            
        try:
            response = await asyncio.to_thread(self.table.get_item, Key={'session_id': session_id})
            item = response.get('Item')
            if not item:
                return None
                
            messages = json.loads(item.get('messages_json', '[]'))
            return Session(
                session_id=item['session_id'],
                user_name=item.get('user_name', 'Anonymous'),
                created_at=item.get('created_at'),
                status=item.get('status', 'active'),
                messages=messages
            )
        except Exception as e:
            print(f"Error fetching session: {e}")
            return None

    async def add_message(self, session_id: str, role: str, content: str):
        # Retrieve, update, put pattern (or partial update)
        # Simplified for MVP
        session = await self.get_session(session_id)
        if session:
            msg = {"role": role, "content": content, "timestamp": datetime.now().isoformat()}
            session.messages.append(msg)
            
            if self.table:
                await asyncio.to_thread(
                    self.table.update_item,
                    Key={'session_id': session_id},
                    UpdateExpression="SET messages_json = :m",
                    ExpressionAttributeValues={':m': json.dumps(session.messages)}
                )

# Singleton instance
import asyncio
session_service = SessionService()
