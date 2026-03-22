import uuid
from sqlalchemy import Column, String, Float, DateTime, Boolean, Text
from sqlalchemy.sql import func
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Holding(Base):
    __tablename__ = "holdings"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, index=True)
    symbol = Column(String(20), index=True)
    exchange = Column(String(10))
    quantity = Column(Float)
    avg_buy_price = Column(Float)
    buy_date = Column(DateTime)
    created_at = Column(DateTime, default=func.now())

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, index=True)
    symbol = Column(String(20), index=True)
    condition = Column(String(10))   # "above" or "below"
    target_price = Column(Float)
    note = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    triggered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())

class RiskProfile(Base):
    __tablename__ = "risk_profiles"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, unique=True, index=True)
    risk_score = Column(Float)        # 0-100
    risk_label = Column(String(30))   # Conservative / Moderate / Aggressive
    answers = Column(Text)            # JSON-encoded answers
    created_at = Column(DateTime, default=func.now())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    phone = Column(String, nullable=True)
    password_hash = Column(String, nullable=True)
    status = Column(String, default="ACTIVE")
    last_login = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())

class UserDevice(Base):
    __tablename__ = "user_devices"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, index=True)
    device_id = Column(String)
    is_trusted = Column(Boolean, default=True)
    last_seen_at = Column(DateTime, default=func.now())

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, index=True)
    action = Column(String)
    details = Column(Text) # JSON serialized
    ip_address = Column(String)
    risk_level = Column(String, default="LOW")
    user_agent = Column(String, nullable=True)
    timestamp = Column(DateTime, default=func.now())

class DeletionRequest(Base):
    __tablename__ = "deletion_requests"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, index=True)
    reason = Column(Text)
    status = Column(String, default="PENDING")
    requested_at = Column(DateTime, default=func.now())
