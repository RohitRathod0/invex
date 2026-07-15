import uuid
from sqlalchemy import Column, String, Float, Integer, DateTime, Boolean, Text
from sqlalchemy.sql import func
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())



class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, index=True)
    symbol = Column(String(20), index=True)
    condition = Column(String(10))   # "above", "below", "percent_up", "percent_down"
    target_price = Column(Float)
    note = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    # State machine: active → approaching → triggered | dismissed
    status = Column(String(20), default="active", nullable=False)
    triggered_at = Column(DateTime, nullable=True)
    approaching_notified_at = Column(DateTime, nullable=True)  # set once on first proximity hit
    email_sent_at = Column(DateTime, nullable=True)             # last successful email send
    created_at = Column(DateTime, default=func.now())

class RiskProfile(Base):
    __tablename__ = "risk_profiles"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, unique=True, index=True)

    # ── Core risk score ──────────────────────────────────────────────────────
    risk_score = Column(Float)            # 0-100 composite
    risk_label = Column(String(30))       # conservative / moderate_conservative / moderate / aggressive
    answers = Column(Text)                # JSON-encoded raw Q&A history

    # ── 6-Dimension values (the user_context fields) ─────────────────────────
    horizon_years         = Column(Integer, nullable=True)    # investment horizon in years
    loss_tolerance_pct    = Column(Float, nullable=True)      # % drop they can stomach (e.g. 15)
    income_stability      = Column(String(30), nullable=True) # salaried_stable / freelance / business
    dependents            = Column(Integer, nullable=True)    # number of financial dependents
    liabilities           = Column(Text, nullable=True)       # JSON list e.g. ["home_loan","car_loan"]
    excluded_sectors      = Column(Text, nullable=True)       # JSON list e.g. ["tobacco","gambling"]
    preferred_sectors     = Column(Text, nullable=True)       # JSON list e.g. ["pharma","it"]
    emergency_fund_months = Column(Float, nullable=True)      # months of expenses as emergency fund

    # ── Interview metadata ───────────────────────────────────────────────────
    dimension_scores      = Column(Text, nullable=True)       # JSON: {dim: confidence 0-100}
    interview_transcript  = Column(Text, nullable=True)       # path to transcript file
    profile_version       = Column(Integer, default=1)
    last_updated          = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=func.now())


class RiskProfileHistory(Base):
    """Immutable snapshot of every completed interview — enables retake diffs."""
    __tablename__ = "risk_profile_history"

    id             = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id        = Column(String, index=True)
    profile_version = Column(Integer)
    risk_score     = Column(Float)
    risk_label     = Column(String(30))
    dimension_scores = Column(Text)   # JSON snapshot
    user_context   = Column(Text)     # Full JSON snapshot of user_context at time
    created_at     = Column(DateTime, default=func.now())

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
    alert_id = Column(String, nullable=True, index=True)  # links to Alert.id; nullable for non-alert audit events
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

class RequestLog(Base):
    __tablename__ = "request_logs"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, index=True, nullable=True) # None for anonymous requests
    method = Column(String)
    path = Column(String)
    status_code = Column(Integer)
    duration_ms = Column(Float)
    request_body = Column(Text, nullable=True) # truncated to 2000 chars
    response_body = Column(Text, nullable=True) # truncated to 2000 chars
    ip_address = Column(String)
    user_agent = Column(String, nullable=True)
    timestamp = Column(DateTime, default=func.now())

