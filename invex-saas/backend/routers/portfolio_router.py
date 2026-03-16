from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from models.database import get_db
from models.db_models import Holding

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

class HoldingBase(BaseModel):
    symbol: str
    exchange: str
    quantity: float
    avg_buy_price: float
    buy_date: datetime

class HoldingCreate(HoldingBase):
    pass

class HoldingUpdate(BaseModel):
    quantity: Optional[float] = None
    avg_buy_price: Optional[float] = None
    buy_date: Optional[datetime] = None

class HoldingResponse(HoldingBase):
    id: str
    user_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# We assume user_id comes from a mock auth/session for now.
# Realistically would come from JWT or Session.
MOCK_USER_ID = "0000-user"

@router.get("/{user_id}", response_model=List[HoldingResponse])
def get_portfolio(user_id: str, db: Session = Depends(get_db)):
    holdings = db.query(Holding).filter(Holding.user_id == user_id).all()
    return holdings

@router.post("/holding", response_model=HoldingResponse)
def add_holding(holding: HoldingCreate, db: Session = Depends(get_db)):
    db_holding = Holding(
        user_id=MOCK_USER_ID,
        **holding.model_dump()
    )
    db.add(db_holding)
    db.commit()
    db.refresh(db_holding)
    return db_holding

@router.patch("/holding/{holding_id}", response_model=HoldingResponse)
def edit_holding(holding_id: str, holding: HoldingUpdate, db: Session = Depends(get_db)):
    db_holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not db_holding:
        raise HTTPException(status_code=404, detail="Holding not found")
        
    update_data = holding.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_holding, key, value)
        
    db.commit()
    db.refresh(db_holding)
    return db_holding

@router.delete("/holding/{holding_id}")
def delete_holding(holding_id: str, db: Session = Depends(get_db)):
    db_holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not db_holding:
        raise HTTPException(status_code=404, detail="Holding not found")
        
    db.delete(db_holding)
    db.commit()
    return {"status": "success"}

@router.get("/performance/{user_id}")
def get_performance(user_id: str, period: str = "1M", db: Session = Depends(get_db)):
    # This is a mock API returns for the performance chart until real calculation built
    base_value = 100000
    from datetime import timedelta
    points = 30 if period == "1M" else 7 if period == "1W" else 90
    data = []
    
    for i in range(points):
        import random
        base_value += random.uniform(-1000, 1500)
        date = datetime.now() - timedelta(days=points - i)
        data.append({
            "date": date.strftime("%Y-%m-%d"),
            "value": round(base_value, 2)
        })
    return data
