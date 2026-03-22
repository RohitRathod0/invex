"""
backend/security/advanced_auth.py

Enterprise-grade security: Device Fingerprinting, Request Signing,
Portfolio Encryption, Audit Logging, and 2FA for high-value trades.
All storage backed by SQLAlchemy (PostgreSQL/SQLite), no MongoDB dependency.
"""

import hashlib
import hmac
import json
import time
import random
import string
from datetime import datetime
from typing import Dict, Any, Optional, List

from fastapi import Request
from sqlalchemy.orm import Session


# ══════════════════════════════════════════════════════
# 1. Device Fingerprinting
# ══════════════════════════════════════════════════════

class DeviceFingerprint:
    """Creates a stable device ID from request headers without cookies (GDPR-safe)."""

    @staticmethod
    def generate(request: Request) -> str:
        """Create a SHA-256 device fingerprint from immutable request attributes."""
        components = [
            request.client.host if request.client else "unknown",
            request.headers.get("user-agent", ""),
            request.headers.get("accept-language", ""),
            request.headers.get("accept-encoding", ""),
        ]
        raw = "|".join(components)
        return hashlib.sha256(raw.encode()).hexdigest()

    @staticmethod
    def is_new_device(user_id: str, device_id: str, db: Session) -> bool:
        """
        Returns True if this device_id has never been seen for this user.
        Registers the device automatically on first visit.
        """
        from models.db_models import UserDevice

        existing = (
            db.query(UserDevice)
            .filter(UserDevice.user_id == user_id, UserDevice.device_id == device_id)
            .first()
        )
        if existing:
            existing.last_seen_at = datetime.utcnow()
            db.commit()
            return False

        # Register new device
        new_device = UserDevice(user_id=user_id, device_id=device_id, is_trusted=False)
        db.add(new_device)
        db.commit()
        return True

    @staticmethod
    def trust_device(user_id: str, device_id: str, db: Session) -> None:
        """Mark a device as explicitly trusted (e.g., after OTP verification)."""
        from models.db_models import UserDevice

        device = (
            db.query(UserDevice)
            .filter(UserDevice.user_id == user_id, UserDevice.device_id == device_id)
            .first()
        )
        if device:
            device.is_trusted = True
            db.commit()


# ══════════════════════════════════════════════════════
# 2. API Request Signing (Anti-Replay Attack)
# ══════════════════════════════════════════════════════

class RequestSigner:
    """
    Signs and verifies API requests using HMAC-SHA256.
    Clients must include X-Timestamp and X-Signature headers.
    """

    REPLAY_WINDOW_SECONDS = 300  # Reject requests older than 5 minutes

    @staticmethod
    def sign(api_key: str, timestamp: int, body: str) -> str:
        """Create an HMAC-SHA256 signature: HMAC(key, "{timestamp}:{body}")"""
        message = f"{timestamp}:{body}"
        return hmac.new(api_key.encode(), message.encode(), hashlib.sha256).hexdigest()

    @staticmethod
    async def verify(request: Request, api_key: str) -> bool:
        """
        Verify that the incoming request has a valid, recent signature.
        Returns True if valid, False otherwise.
        """
        try:
            signature = request.headers.get("X-Signature", "")
            timestamp_str = request.headers.get("X-Timestamp", "0")
            timestamp = int(timestamp_str)
        except (ValueError, TypeError):
            return False

        # Reject requests outside the replay window
        if abs(time.time() - timestamp) > RequestSigner.REPLAY_WINDOW_SECONDS:
            return False

        body_bytes = await request.body()
        body_str = body_bytes.decode("utf-8")

        expected = RequestSigner.sign(api_key, timestamp, body_str)
        return hmac.compare_digest(signature, expected)


# ══════════════════════════════════════════════════════
# 3. Portfolio Encryption (Fernet / AES-128-CBC)
# ══════════════════════════════════════════════════════

class PortfolioEncryption:
    """
    Encrypts/decrypts sensitive holding data with a per-user Fernet key.
    The user's key should be stored in an HSM or secrets manager in production
    (e.g., AWS Secrets Manager). Here we derive it from a server secret + user_id.
    """

    @staticmethod
    def _derive_key(user_id: str, server_secret: str = "invex-default-secret") -> bytes:
        """Derive a 32-byte Fernet-compatible URL-safe base64 key."""
        import base64
        raw = hashlib.sha256(f"{server_secret}:{user_id}".encode()).digest()
        return base64.urlsafe_b64encode(raw)

    @staticmethod
    def encrypt_holdings(holdings: List[Dict[str, Any]], user_id: str) -> str:
        """Encrypt holdings list to a base64 ciphertext string."""
        try:
            from cryptography.fernet import Fernet
            key = PortfolioEncryption._derive_key(user_id)
            cipher = Fernet(key)
            plaintext = json.dumps(holdings).encode()
            return cipher.encrypt(plaintext).decode()
        except ImportError:
            # Fallback: just return JSON if cryptography lib not installed
            return json.dumps(holdings)

    @staticmethod
    def decrypt_holdings(encrypted_data: str, user_id: str) -> List[Dict[str, Any]]:
        """Decrypt from ciphertext back to list of dicts."""
        try:
            from cryptography.fernet import Fernet
            key = PortfolioEncryption._derive_key(user_id)
            cipher = Fernet(key)
            plaintext = cipher.decrypt(encrypted_data.encode())
            return json.loads(plaintext.decode())
        except Exception:
            # Attempt raw JSON fallback (unencrypted path)
            try:
                return json.loads(encrypted_data)
            except Exception:
                return []


# ══════════════════════════════════════════════════════
# 4. Security Audit Logging
# ══════════════════════════════════════════════════════

class SecurityAuditLog:
    """
    Persists all sensitive actions to the audit_logs table for compliance,
    forensics, and anomaly detection.
    """

    @staticmethod
    def log(
        user_id: str,
        action: str,
        details: Dict[str, Any],
        ip_address: str,
        db: Session,
        risk_level: str = "LOW",
        user_agent: Optional[str] = None,
    ) -> None:
        """Synchronously write an audit log entry."""
        from models.db_models import AuditLog

        entry = AuditLog(
            user_id=user_id,
            action=action,
            details=json.dumps(details),
            ip_address=ip_address,
            risk_level=risk_level,
            user_agent=user_agent,
        )
        db.add(entry)
        db.commit()

        if risk_level == "HIGH":
            # In production: send to Sentry, PagerDuty, or email admin
            print(f"[SECURITY ALERT] HIGH-RISK action '{action}' by user {user_id} from {ip_address}")

    @staticmethod
    def get_user_logs(user_id: str, db: Session, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch the most recent audit log entries for a given user."""
        from models.db_models import AuditLog

        rows = (
            db.query(AuditLog)
            .filter(AuditLog.user_id == user_id)
            .order_by(AuditLog.timestamp.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id": r.id,
                "action": r.action,
                "details": json.loads(r.details) if r.details else {},
                "ip_address": r.ip_address,
                "risk_level": r.risk_level,
                "user_agent": r.user_agent,
                "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            }
            for r in rows
        ]


# ══════════════════════════════════════════════════════
# 5. Two-Factor Authentication (OTP via Redis/in-memory)
# ══════════════════════════════════════════════════════

# In-memory OTP store as fallback when Redis is unavailable
_otp_store: Dict[str, Dict[str, Any]] = {}


class TwoFactorAuth:
    """
    Generates and validates time-limited OTPs for high-value trade confirmation.
    Uses Redis when available, with a graceful in-memory fallback.
    """

    OTP_TTL_SECONDS = 300  # 5 minutes

    @staticmethod
    def _generate_otp(length: int = 6) -> str:
        return "".join(random.choices(string.digits, k=length))

    @staticmethod
    async def require_for_trade(
        user_id: str, trade_details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Check if trade requires 2FA confirmation.
        Returns {'requires_2fa': True} for trades ≥ ₹1 Lakh.
        """
        trade_value = trade_details.get("quantity", 0) * trade_details.get("price", 0)

        if trade_value < 100_000:
            return {"requires_2fa": False}

        otp = TwoFactorAuth._generate_otp()
        expiry = time.time() + TwoFactorAuth.OTP_TTL_SECONDS

        # Try Redis first; fall back to in-memory
        try:
            import redis.asyncio as aioredis
            r = aioredis.from_url("redis://localhost:6379", decode_responses=True)
            await r.setex(f"trade_otp:{user_id}", TwoFactorAuth.OTP_TTL_SECONDS, otp)
            await r.aclose()
        except Exception:
            _otp_store[f"trade_otp:{user_id}"] = {"otp": otp, "expiry": expiry}

        # In production: send OTP via SMS (Twilio) or email (SES)
        print(f"[2FA] OTP for user {user_id}: {otp}  (trade value ₹{trade_value:,.0f})")

        return {
            "requires_2fa": True,
            "otp_sent": True,
            "trade_value": trade_value,
            "message": "OTP sent to your registered phone/email. Valid for 5 minutes.",
        }

    @staticmethod
    async def verify_otp(user_id: str, submitted_otp: str) -> bool:
        """Verify OTP and invalidate it on success (single-use)."""
        key = f"trade_otp:{user_id}"

        # Try Redis
        try:
            import redis.asyncio as aioredis
            r = aioredis.from_url("redis://localhost:6379", decode_responses=True)
            stored = await r.get(key)
            if stored and hmac.compare_digest(stored, submitted_otp):
                await r.delete(key)
                await r.aclose()
                return True
            await r.aclose()
            return False
        except Exception:
            pass

        # Fallback in-memory
        entry = _otp_store.get(key)
        if not entry:
            return False
        if time.time() > entry["expiry"]:
            del _otp_store[key]
            return False
        if hmac.compare_digest(entry["otp"], submitted_otp):
            del _otp_store[key]
            return True
        return False
