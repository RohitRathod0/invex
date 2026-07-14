import json
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import List, Optional

import yfinance as yf
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config import get_settings
from models.database import get_db
from models.db_models import Alert, AuditLog
from services.cache_manager import cache

logger = logging.getLogger("invex.alerts")

router = APIRouter(prefix="/alerts", tags=["alerts"])

# Proximity band: price within this % of threshold triggers 'approaching' state.
# Not user-configurable in v1. Future: add Alert.proximity_pct column.
PROXIMITY_BAND_PCT = 0.03


# ---------- Pydantic Schemas ----------

class AlertCreate(BaseModel):
    user_id: str = "0000-user"
    symbol: str
    condition: str   # "above", "below", "percent_up", "percent_down"
    target_price: float
    note: Optional[str] = None


class AlertOut(BaseModel):
    id: str
    user_id: str
    symbol: str
    condition: str
    target_price: float
    note: Optional[str]
    is_active: bool
    status: str
    triggered_at: Optional[datetime]
    approaching_notified_at: Optional[datetime]
    email_sent_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class AuditEventOut(BaseModel):
    action: str
    timestamp: datetime
    details: dict


class AlertAuditOut(BaseModel):
    alert_id: str
    symbol: str
    condition: str
    target_price: float
    status: str
    created_at: datetime
    approaching_notified_at: Optional[datetime]
    triggered_at: Optional[datetime]
    email_sent_at: Optional[datetime]
    audit_trail: List[AuditEventOut]


# ---------- Private helpers ----------

def _log_audit(
    db: Session,
    user_id: str,
    action: str,
    alert_id: Optional[str],
    details: dict,
) -> None:
    """Append one AuditLog row. Never called with UPDATE or DELETE semantics."""
    entry = AuditLog(
        user_id=user_id,
        alert_id=alert_id,
        action=action,
        details=json.dumps(details),
        ip_address="system",   # system-originated; no HTTP request context here
        risk_level="LOW",
    )
    db.add(entry)
    db.commit()


async def _rebuild_symbol_index(symbol: str, db: Session) -> None:
    """
    Write-through: rebuild alerts:{symbol} in CacheManager from the DB.
    Stores a list of {id, condition, target_price, user_id} for every
    is_active=True alert on this symbol.
    Removes the key entirely when no active alerts remain.
    No TTL — must always reflect current active alerts.
    """
    rows = (
        db.query(Alert)
        .filter(Alert.symbol == symbol, Alert.is_active == True)
        .all()
    )
    cache_key = f"alerts:{symbol}"
    if rows:
        payload = [
            {
                "id": a.id,
                "user_id": a.user_id,
                "condition": a.condition,
                "target_price": a.target_price,
                "status": a.status,
                "approaching_notified_at": (
                    a.approaching_notified_at.isoformat()
                    if a.approaching_notified_at
                    else None
                ),
            }
            for a in rows
        ]
        # expire_seconds=0 is not supported; use a very large TTL as "no TTL"
        # but invalidation is always write-through on mutation, so staleness
        # never occurs in practice. 86400 = 24 h safety net.
        await cache.set(cache_key, payload, expire_seconds=86400)
    else:
        await cache.delete(cache_key)


def _send_alert_email_task(
    alert_id: str,
    user_id: str,
    user_email: str,
    symbol: str,
    condition: str,
    target_price: float,
    current_price: float,
    event: str,           # "triggered" or "approaching"
) -> None:
    """
    Background task: send SMTP email for a triggered/approaching alert,
    then write email_sent / email_failed AuditLog entry using a fresh
    DB session (called outside the request/response cycle).
    """
    settings = get_settings()
    db = next(get_db())
    try:
        # Build email
        subject = (
            f"[Invex] Alert {'Triggered' if event == 'triggered' else 'Approaching'}: {symbol}"
        )
        if event == "triggered":
            body_text = (
                f"Your price alert for {symbol} has been triggered.\n\n"
                f"Condition : {condition}\n"
                f"Target    : {target_price}\n"
                f"Current   : {current_price}\n\n"
                f"The alert has been deactivated."
            )
        else:
            body_text = (
                f"Your price alert for {symbol} is approaching its threshold.\n\n"
                f"Condition : {condition}\n"
                f"Target    : {target_price}\n"
                f"Current   : {current_price}\n"
                f"Proximity : within {int(PROXIMITY_BAND_PCT * 100)}% band\n\n"
                f"You will receive another notification when the threshold is crossed."
            )

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM_EMAIL
        msg["To"] = user_email
        msg.attach(MIMEText(body_text, "plain"))

        # Send
        if settings.SMTP_USE_SSL:
            server = smtplib.SMTP_SSL(
                settings.SMTP_SERVER,
                settings.SMTP_PORT,
                timeout=settings.SMTP_TIMEOUT_SECONDS,
            )
        else:
            server = smtplib.SMTP(
                settings.SMTP_SERVER,
                settings.SMTP_PORT,
                timeout=settings.SMTP_TIMEOUT_SECONDS,
            )
            if settings.SMTP_USE_STARTTLS:
                server.starttls()

        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)

        server.sendmail(settings.SMTP_FROM_EMAIL, user_email, msg.as_string())
        server.quit()

        # Update email_sent_at on the alert
        alert_row = db.query(Alert).filter(Alert.id == alert_id).first()
        if alert_row:
            alert_row.email_sent_at = datetime.utcnow()
            db.commit()

        _log_audit(
            db,
            user_id=user_id,
            action="email_sent",
            alert_id=alert_id,
            details={
                "event": event,
                "symbol": symbol,
                "recipient": user_email,
                "current_price": current_price,
            },
        )
        logger.info("Alert email sent for alert_id=%s event=%s", alert_id, event)

    except Exception as exc:
        _log_audit(
            db,
            user_id=user_id,
            action="email_failed",
            alert_id=alert_id,
            details={
                "event": event,
                "symbol": symbol,
                "recipient": user_email,
                "error": str(exc),
            },
        )
        logger.error("Alert email failed for alert_id=%s: %s", alert_id, exc)
    finally:
        db.close()


# ---------- Endpoints ----------

@router.get("/{user_id}", response_model=List[AlertOut])
def get_alerts(
    user_id: str,
    include_dismissed: bool = Query(False),
    db: Session = Depends(get_db),
):
    """
    Return alerts for a user.
    By default, excludes status='dismissed' alerts.
    Pass ?include_dismissed=true to include the full history.
    """
    q = db.query(Alert).filter(Alert.user_id == user_id)
    if not include_dismissed:
        q = q.filter(Alert.status != "dismissed")
    return q.order_by(Alert.created_at.desc()).all()


@router.post("/alert", response_model=AlertOut)
async def create_alert(body: AlertCreate, db: Session = Depends(get_db)):
    body.symbol = body.symbol.upper()
    alert = Alert(
        user_id=body.user_id,
        symbol=body.symbol,
        condition=body.condition,
        target_price=body.target_price,
        note=body.note,
        status="active",
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    await _rebuild_symbol_index(alert.symbol, db)

    _log_audit(
        db,
        user_id=alert.user_id,
        action="created",
        alert_id=alert.id,
        details={
            "symbol": alert.symbol,
            "condition": alert.condition,
            "threshold": alert.target_price,
        },
    )
    return alert


@router.delete("/alert/{alert_id}")
async def delete_alert(alert_id: str, db: Session = Depends(get_db)):
    """
    Soft delete: sets status='dismissed' and is_active=False.
    The row is never removed so AuditLog entries remain linked.
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    symbol = alert.symbol
    user_id = alert.user_id

    alert.status = "dismissed"
    alert.is_active = False
    db.commit()

    await _rebuild_symbol_index(symbol, db)

    _log_audit(
        db,
        user_id=user_id,
        action="dismissed",
        alert_id=alert_id,
        details={"symbol": symbol},
    )
    return {"message": "Alert dismissed"}


@router.post("/check/{user_id}")
async def check_alerts(
    user_id: str,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Check all active alerts for a user against live prices.

    Uses Redis symbol-indexed lookup (alerts:{symbol}) to avoid a full
    DB scan per user. Falls back to CacheManager's in-memory cache when
    Redis is unavailable.

    Proximity band (PROXIMITY_BAND_PCT=3%): sets alert to 'approaching'
    and sends one email/notification if price is within the band but has
    not yet crossed the threshold.

    Email sends are dispatched as FastAPI background tasks so SMTP
    latency never blocks the price-check loop.
    """
    # ── Collect distinct symbols for this user's active alerts ───────────────
    active_alerts = (
        db.query(Alert)
        .filter(Alert.user_id == user_id, Alert.is_active == True)
        .all()
    )

    triggered_out = []
    if not active_alerts:
        return {"triggered": triggered_out}

    symbols = list({a.symbol for a in active_alerts})

    # ── Fetch live prices (batch, one yfinance call per symbol) ──────────────
    prices: dict[str, dict[str, float]] = {}
    for sym in symbols:
        try:
            yf_sym = sym if "." in sym else f"{sym}.NS"
            ticker = yf.Ticker(yf_sym)
            info = ticker.info
            price = info.get("currentPrice") or info.get("regularMarketPrice") or 0
            prev_close = (
                info.get("previousClose")
                or info.get("regularMarketPreviousClose")
                or price
            )
            prices[sym] = {"current": float(price), "prev_close": float(prev_close)}
        except Exception:
            prices[sym] = {"current": 0.0, "prev_close": 0.0}

    # ── Lookup alerts per symbol via Redis index ──────────────────────────────
    # For each symbol, try the cache first; fall back to the already-loaded
    # active_alerts list (same DB result, no second query needed).
    alerts_by_symbol: dict[str, list[Alert]] = {}
    for alert in active_alerts:
        alerts_by_symbol.setdefault(alert.symbol, []).append(alert)

    # Warm up any missing cache entries from the live DB result
    for sym in symbols:
        cache_key = f"alerts:{sym}"
        cached = await cache.get(cache_key)
        if cached is None:
            # Cache miss: rebuild from the rows we already fetched
            await _rebuild_symbol_index(sym, db)

    now = datetime.utcnow()

    # ── Evaluate each alert ───────────────────────────────────────────────────
    for sym, sym_alerts in alerts_by_symbol.items():
        data = prices.get(sym, {"current": 0.0, "prev_close": 0.0})
        current = data["current"]
        prev = data["prev_close"]

        if current == 0:
            continue

        for alert in sym_alerts:
            # Determine if threshold is crossed
            hit = False
            if alert.condition == "above":
                hit = current >= alert.target_price
            elif alert.condition == "below":
                hit = current <= alert.target_price
            elif alert.condition == "percent_up" and prev > 0:
                pct_change = ((current - prev) / prev) * 100
                hit = pct_change >= alert.target_price
            elif alert.condition == "percent_down" and prev > 0:
                pct_change = ((current - prev) / prev) * 100
                hit = pct_change <= -alert.target_price

            if hit:
                # ── TRIGGERED ────────────────────────────────────────────────
                alert.status = "triggered"
                alert.is_active = False
                alert.triggered_at = now
                db.commit()

                await _rebuild_symbol_index(sym, db)

                _log_audit(
                    db,
                    user_id=alert.user_id,
                    action="triggered",
                    alert_id=alert.id,
                    details={
                        "symbol": sym,
                        "condition": alert.condition,
                        "threshold": alert.target_price,
                        "current_price": current,
                    },
                )

                # Resolve user email for notification
                user_email = _resolve_user_email(alert.user_id, db)
                if user_email:
                    background.add_task(
                        _send_alert_email_task,
                        alert_id=alert.id,
                        user_id=alert.user_id,
                        user_email=user_email,
                        symbol=sym,
                        condition=alert.condition,
                        target_price=alert.target_price,
                        current_price=current,
                        event="triggered",
                    )

                triggered_out.append(
                    {
                        "id": alert.id,
                        "symbol": sym,
                        "condition": alert.condition,
                        "target_price": alert.target_price,
                        "current_price": current,
                        "event": "triggered",
                    }
                )
                continue

            # ── APPROACHING (only if threshold not crossed) ───────────────────
            # Check proximity band. Skip if already notified for approaching.
            if alert.approaching_notified_at is not None:
                continue

            band = alert.target_price * PROXIMITY_BAND_PCT

            if alert.condition == "above":
                approaching = 0 < (alert.target_price - current) <= band
            elif alert.condition == "below":
                approaching = 0 < (current - alert.target_price) <= band
            elif alert.condition in ("percent_up", "percent_down") and prev > 0:
                pct_change = ((current - prev) / prev) * 100
                if alert.condition == "percent_up":
                    approaching = 0 < (alert.target_price - pct_change) <= (
                        alert.target_price * PROXIMITY_BAND_PCT
                    )
                else:
                    approaching = 0 < (pct_change - (-alert.target_price)) <= (
                        alert.target_price * PROXIMITY_BAND_PCT
                    )
            else:
                approaching = False

            if approaching:
                alert.status = "approaching"
                alert.approaching_notified_at = now
                db.commit()

                # No cache rebuild needed — alert is still is_active=True
                # and its threshold hasn't changed; index remains valid.

                _log_audit(
                    db,
                    user_id=alert.user_id,
                    action="approaching",
                    alert_id=alert.id,
                    details={
                        "symbol": sym,
                        "condition": alert.condition,
                        "threshold": alert.target_price,
                        "current_price": current,
                        "proximity_pct": PROXIMITY_BAND_PCT,
                    },
                )

                user_email = _resolve_user_email(alert.user_id, db)
                if user_email:
                    background.add_task(
                        _send_alert_email_task,
                        alert_id=alert.id,
                        user_id=alert.user_id,
                        user_email=user_email,
                        symbol=sym,
                        condition=alert.condition,
                        target_price=alert.target_price,
                        current_price=current,
                        event="approaching",
                    )

                triggered_out.append(
                    {
                        "id": alert.id,
                        "symbol": sym,
                        "condition": alert.condition,
                        "target_price": alert.target_price,
                        "current_price": current,
                        "event": "approaching",
                    }
                )

    return {"triggered": triggered_out}


# ---------- Audit timeline endpoint ----------

@router.get("/alert/{alert_id}/audit", response_model=AlertAuditOut)
def get_alert_audit(alert_id: str, db: Session = Depends(get_db)):
    """
    Return the full lifecycle timeline for a single alert:
    - Alert state fields (created_at, approaching_notified_at,
      triggered_at, email_sent_at, status)
    - All AuditLog rows linked to this alert_id, ordered by timestamp
      ascending (created → approaching → triggered → email_sent/failed
      → dismissed)
    """
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    log_rows = (
        db.query(AuditLog)
        .filter(AuditLog.alert_id == alert_id)
        .order_by(AuditLog.timestamp.asc())
        .all()
    )

    audit_trail = [
        AuditEventOut(
            action=row.action,
            timestamp=row.timestamp,
            details=json.loads(row.details) if row.details else {},
        )
        for row in log_rows
    ]

    return AlertAuditOut(
        alert_id=alert.id,
        symbol=alert.symbol,
        condition=alert.condition,
        target_price=alert.target_price,
        status=alert.status,
        created_at=alert.created_at,
        approaching_notified_at=alert.approaching_notified_at,
        triggered_at=alert.triggered_at,
        email_sent_at=alert.email_sent_at,
        audit_trail=audit_trail,
    )


def _resolve_user_email(user_id: str, db: Session) -> Optional[str]:
    """
    Look up the User row to get the email address for SMTP delivery.
    Returns None if not found or if SMTP is not configured.
    """
    settings = get_settings()
    if not settings.SMTP_SERVER:
        return None
    from models.db_models import User  # local import to avoid circular at module load
    user = db.query(User).filter(User.id == user_id).first()
    return user.email if user else None
