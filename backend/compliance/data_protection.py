"""
backend/compliance/data_protection.py

DPDP Act 2023 (India's Digital Personal Data Protection) compliant
data management: portability, deletion (right to be forgotten), and
automated data-retention policies — using SQLAlchemy.
"""

import json
from datetime import datetime, timedelta
from typing import Dict, Any, List

from sqlalchemy.orm import Session


class DataProtectionCompliance:
    """
    Implements India's DPDP Act 2023 user rights:
    - Data Portability  (right to export)
    - Right to Erasure  (right to be forgotten / anonymization)
    - Automated Retention Policy (delete/anonymize inactive accounts)
    """

    # ── 1. Data Portability ──────────────────────────────────────────────────

    @staticmethod
    def export_user_data(user_id: str, db: Session) -> Dict[str, Any]:
        """
        Compile everything Invex holds about a user into a single dict.
        Sensitive secrets (password_hash) are stripped before export.
        """
        from models.db_models import User, Holding, Alert, AuditLog, DeletionRequest

        user = db.query(User).filter(User.id == user_id).first()
        holdings = db.query(Holding).filter(Holding.user_id == user_id).all()
        alerts = db.query(Alert).filter(Alert.user_id == user_id).all()
        audit_logs = db.query(AuditLog).filter(AuditLog.user_id == user_id).all()

        def _row_to_dict(row: Any) -> Dict[str, Any]:
            """Generic SQLAlchemy row → plain dict, skip internal SA attrs."""
            return {
                col.name: str(getattr(row, col.name))
                if isinstance(getattr(row, col.name), datetime)
                else getattr(row, col.name)
                for col in row.__table__.columns
            }

        profile: Dict[str, Any] = _row_to_dict(user) if user else {}
        profile.pop("password_hash", None)   # Never export password hash

        return {
            "export_generated_at": datetime.utcnow().isoformat(),
            "data_controller": "Invex SaaS Pvt Ltd",
            "profile": profile,
            "holdings": [_row_to_dict(h) for h in holdings],
            "alerts": [_row_to_dict(a) for a in alerts],
            "audit_logs": [
                {
                    "action": log.action,
                    "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                    "risk_level": log.risk_level,
                }
                for log in audit_logs
            ],
        }

    # ── 2. Right to Erasure (Anonymization) ──────────────────────────────────

    @staticmethod
    def delete_user_data(user_id: str, reason: str, db: Session) -> Dict[str, Any]:
        """
        'Right to be Forgotten': anonymize PII in-place rather than hard-delete
        (for legal audit trail compliance). Creates a DeletionRequest record.
        """
        from models.db_models import User, DeletionRequest

        # Log the request
        req = DeletionRequest(user_id=user_id, reason=reason, status="PROCESSING")
        db.add(req)

        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.email = f"deleted_{user_id[:8]}@anonymized.invex"
            user.name = "Deleted User"
            user.phone = None
            user.password_hash = None
            user.status = "DELETED"
            user.deleted_at = datetime.utcnow()

        req.status = "COMPLETED"
        db.commit()

        return {
            "status": "anonymized",
            "user_id": user_id,
            "completed_at": datetime.utcnow().isoformat(),
            "note": "Account PII has been anonymized in accordance with DPDP Act 2023.",
        }

    # ── 3. Automated Retention Policy ────────────────────────────────────────

    @staticmethod
    def apply_retention_policy(db: Session, inactive_days: int = 1095) -> Dict[str, Any]:
        """
        Anonymize accounts inactive for `inactive_days` (default 3 years).
        Safe to run as a scheduled CRON job.
        """
        from models.db_models import User

        cutoff = datetime.utcnow() - timedelta(days=inactive_days)

        inactive_users = (
            db.query(User)
            .filter(User.last_login < cutoff, User.status != "DELETED")
            .all()
        )

        affected = []
        for user in inactive_users:
            DataProtectionCompliance.delete_user_data(
                user.id,
                f"Automated retention policy — inactive for {inactive_days} days",
                db,
            )
            affected.append(user.id)

        return {
            "policy_run_at": datetime.utcnow().isoformat(),
            "inactive_threshold_days": inactive_days,
            "accounts_anonymized": len(affected),
            "affected_user_ids": affected,
        }

    # ── 4. Consent Management (DPDP Act §6) ──────────────────────────────────

    @staticmethod
    def record_consent(
        user_id: str,
        consent_type: str,
        granted: bool,
        db: Session,
        ip_address: str = "unknown",
    ) -> None:
        """
        Record explicit user consent for a specific data-processing purpose.
        Required under DPDP Act 2023 §6. Currently written to AuditLog.
        """
        from security.advanced_auth import SecurityAuditLog

        SecurityAuditLog.log(
            user_id=user_id,
            action=f"CONSENT_{'GRANTED' if granted else 'REVOKED'}",
            details={"consent_type": consent_type, "granted": granted},
            ip_address=ip_address,
            db=db,
            risk_level="LOW",
        )
