"""
backend/routers/security_router.py

Exposes the Phase 4 security features via REST API:
  - GET  /security/audit-log/{user_id}         → view your audit trail
  - POST /security/trade/require-2fa           → check if a trade needs OTP
  - POST /security/trade/verify-otp            → confirm OTP for a trade
  - GET  /compliance/export/{user_id}          → DPDP Act data export
  - POST /compliance/delete/{user_id}          → right to erasure
  - POST /compliance/retention-policy          → admin: run retention sweep (protected)
  - POST /compliance/consent                   → record user consent
"""

from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from models.database import get_db
from security.advanced_auth import SecurityAuditLog, TwoFactorAuth, DeviceFingerprint
from compliance.data_protection import DataProtectionCompliance

router = APIRouter(tags=["security & compliance"])
limiter = Limiter(key_func=get_remote_address)


# ── Request models ────────────────────────────────────────────────────────────

class TradeDetails(BaseModel):
    symbol: str
    quantity: float
    price: float
    direction: str = "BUY"

class OTPVerify(BaseModel):
    user_id: str
    otp: str

class DeletionRequest(BaseModel):
    reason: str

class ConsentRecord(BaseModel):
    consent_type: str   # e.g. "marketing", "analytics", "third_party_sharing"
    granted: bool


# ── Audit Trail ───────────────────────────────────────────────────────────────

@router.get("/security/audit-log/{user_id}")
@limiter.limit("10/minute")
def get_audit_log(request: Request, user_id: str, db: Session = Depends(get_db)):
    """Return the last 50 security events for the user. Self-service transparency."""
    logs = SecurityAuditLog.get_user_logs(user_id, db, limit=50)
    return {"user_id": user_id, "total": len(logs), "logs": logs}


# ── 2FA for high-value trades ─────────────────────────────────────────────────

@router.post("/security/trade/require-2fa/{user_id}")
@limiter.limit("20/minute")
async def check_trade_2fa(
    request: Request,
    user_id: str,
    trade: TradeDetails,
    db: Session = Depends(get_db),
):
    """
    Call before executing a trade. Returns {'requires_2fa': True} for trades ≥ ₹1L.
    Logs the trade intent as a LOW-risk audit event.
    """
    result = await TwoFactorAuth.require_for_trade(user_id, trade.model_dump())

    # Always log the trade attempt
    client_ip = request.client.host if request.client else "unknown"
    SecurityAuditLog.log(
        user_id=user_id,
        action="TRADE_INTENT",
        details={**trade.model_dump(), "requires_2fa": result.get("requires_2fa")},
        ip_address=client_ip,
        db=db,
        risk_level="MEDIUM" if result.get("requires_2fa") else "LOW",
        user_agent=request.headers.get("user-agent"),
    )

    return result


@router.post("/security/trade/verify-otp")
@limiter.limit("10/minute")
async def verify_trade_otp(request: Request, body: OTPVerify):
    """Validate the OTP sent during 2FA. Invalidates OTP on success (single-use)."""
    is_valid = await TwoFactorAuth.verify_otp(body.user_id, body.otp)
    if not is_valid:
        raise HTTPException(status_code=403, detail="Invalid or expired OTP")
    return {"verified": True, "message": "Trade confirmed. Proceed."}


# ── Device fingerprinting ────────────────────────────────────────────────────

@router.post("/security/device/check/{user_id}")
@limiter.limit("30/minute")
def check_device(request: Request, user_id: str, db: Session = Depends(get_db)):
    """
    Fingerprint the current request. Returns whether this is a new device.
    Call on every login.
    """
    device_id = DeviceFingerprint.generate(request)
    is_new = DeviceFingerprint.is_new_device(user_id, device_id, db)
    client_ip = request.client.host if request.client else "unknown"

    if is_new:
        SecurityAuditLog.log(
            user_id=user_id,
            action="NEW_DEVICE_LOGIN",
            details={"device_id": device_id},
            ip_address=client_ip,
            db=db,
            risk_level="HIGH",
            user_agent=request.headers.get("user-agent"),
        )

    return {
        "device_id": device_id,
        "is_new_device": is_new,
        "warning": "⚠️ New device detected. If this wasn't you, please secure your account." if is_new else None,
    }


# ── DPDP Act Compliance ───────────────────────────────────────────────────────

@router.get("/compliance/export/{user_id}")
@limiter.limit("3/hour")
def export_user_data(request: Request, user_id: str, db: Session = Depends(get_db)):
    """
    DPDP Act §16 – Data Portability.
    Returns all personal data held about the user as a JSON export.
    In production, trigger an async job and email a download link.
    """
    client_ip = request.client.host if request.client else "unknown"
    SecurityAuditLog.log(
        user_id=user_id,
        action="DATA_EXPORT_REQUESTED",
        details={},
        ip_address=client_ip,
        db=db,
        risk_level="MEDIUM",
    )
    data = DataProtectionCompliance.export_user_data(user_id, db)
    return data


@router.post("/compliance/delete/{user_id}")
@limiter.limit("3/hour")
def delete_user_data(
    request: Request,
    user_id: str,
    body: DeletionRequest,
    db: Session = Depends(get_db),
):
    """
    DPDP Act §13 – Right to Erasure (Right to be Forgotten).
    Anonymizes PII in-place. Does NOT hard-delete for legal audit purposes.
    """
    client_ip = request.client.host if request.client else "unknown"
    SecurityAuditLog.log(
        user_id=user_id,
        action="DELETION_REQUESTED",
        details={"reason": body.reason},
        ip_address=client_ip,
        db=db,
        risk_level="HIGH",
    )
    result = DataProtectionCompliance.delete_user_data(user_id, body.reason, db)
    return result


@router.post("/compliance/consent/{user_id}")
@limiter.limit("30/minute")
def record_consent(
    request: Request,
    user_id: str,
    body: ConsentRecord,
    db: Session = Depends(get_db),
):
    """DPDP Act §6 – Record or revoke explicit user consent for a data purpose."""
    client_ip = request.client.host if request.client else "unknown"
    DataProtectionCompliance.record_consent(
        user_id=user_id,
        consent_type=body.consent_type,
        granted=body.granted,
        db=db,
        ip_address=client_ip,
    )
    return {
        "status": "recorded",
        "consent_type": body.consent_type,
        "granted": body.granted,
    }


@router.post("/compliance/admin/retention-policy")
@limiter.limit("2/hour")
def run_retention_policy(
    request: Request,
    inactive_days: int = 1095,
    db: Session = Depends(get_db),
):
    """
    Admin-only: trigger automated DPDP data retention sweep.
    Anonymize accounts inactive for `inactive_days` (default=3 years).
    Protect this endpoint with an admin API key in production.
    """
    result = DataProtectionCompliance.apply_retention_policy(db, inactive_days)
    return result
