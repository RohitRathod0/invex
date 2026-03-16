from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import yfinance as yf

from models.database import get_db
from models.db_models import Alert

router = APIRouter(prefix="/alerts", tags=["alerts"])

# ---------- Pydantic Schemas ----------
class AlertCreate(BaseModel):
    user_id: str = "0000-user"
    symbol: str
    condition: str   # "above" or "below"
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
    triggered_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

# ---------- Endpoints ----------
@router.get("/{user_id}", response_model=List[AlertOut])
def get_alerts(user_id: str, db: Session = Depends(get_db)):
    return db.query(Alert).filter(Alert.user_id == user_id).order_by(Alert.created_at.desc()).all()


@router.post("/alert", response_model=AlertOut)
def create_alert(body: AlertCreate, db: Session = Depends(get_db)):
    body.symbol = body.symbol.upper()
    alert = Alert(
        user_id=body.user_id,
        symbol=body.symbol,
        condition=body.condition,
        target_price=body.target_price,
        note=body.note,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@router.delete("/alert/{alert_id}")
def delete_alert(alert_id: str, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted"}


@router.post("/check/{user_id}")
def check_alerts(user_id: str, db: Session = Depends(get_db)):
    """Check all active alerts for user against live prices. Mark triggered ones."""
    active_alerts = db.query(Alert).filter(
        Alert.user_id == user_id, Alert.is_active == True
    ).all()

    triggered = []
    if not active_alerts:
        return {"triggered": triggered}

    # Batch fetch prices
    symbols = list(set(a.symbol for a in active_alerts))
    prices: dict[str, float] = {}
    for sym in symbols:
        try:
            # Try .NS suffix for Indian stocks if no dot in symbol
            yf_sym = sym if "." in sym else f"{sym}.NS"
            ticker = yf.Ticker(yf_sym)
            info = ticker.info
            price = info.get("currentPrice") or info.get("regularMarketPrice") or 0
            prices[sym] = float(price)
        except Exception:
            prices[sym] = 0.0

    now = datetime.utcnow()
    for alert in active_alerts:
        current = prices.get(alert.symbol, 0)
        if current == 0:
            continue
        hit = (alert.condition == "above" and current >= alert.target_price) or \
              (alert.condition == "below" and current <= alert.target_price)
        if hit:
            alert.is_active = False
            alert.triggered_at = now
            db.commit()
            triggered.append({
                "id": alert.id,
                "symbol": alert.symbol,
                "condition": alert.condition,
                "target_price": alert.target_price,
                "current_price": current,
            })

    return {"triggered": triggered}
