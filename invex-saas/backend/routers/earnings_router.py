import json
from typing import Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, Query, Request, UploadFile
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from models.database import get_db
from models.db_models import EarningsAnalysisHistory, EarningsWatchAlert

router = APIRouter(prefix="/earnings", tags=["earnings"])
limiter = Limiter(key_func=get_remote_address)


class EarningsAnalyzeRequest(BaseModel):
    symbol: str
    quarter: str
    transcript_text: Optional[str] = None
    management_text: Optional[str] = None
    qa_text: Optional[str] = None
    previous_transcript_text: Optional[str] = None
    source_type: str = "manual"


class EarningsAlertCreate(BaseModel):
    user_id: str = "0000-user"
    symbol: str
    earnings_date: datetime
    notify_before_hours: int = 24
    note: Optional[str] = None


def _excerpt(text: Optional[str], max_chars: int = 800) -> Optional[str]:
    if not text or not text.strip():
        return None
    cleaned = " ".join(text.strip().split())
    return cleaned[:max_chars]


def _persist_analysis(
    db: Session,
    results: dict,
    transcript_text: Optional[str],
    previous_transcript_text: Optional[str],
) -> dict:
    record = EarningsAnalysisHistory(
        company=results.get("company"),
        quarter=results.get("quarter"),
        source_type=results.get("source_type", "manual"),
        analysis_mode=results.get("analysis_mode", "phase_1_transcript_analysis"),
        transcript_excerpt=_excerpt(transcript_text),
        previous_transcript_excerpt=_excerpt(previous_transcript_text),
        market_tone=(results.get("market_tone") or {}).get("stance"),
        confidence_score=results.get("confidence_score"),
        analysis_json=json.dumps(results),
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    matching_alerts = db.query(EarningsWatchAlert).filter(
        EarningsWatchAlert.symbol == str(results.get("company")).upper(),
        EarningsWatchAlert.is_active == True,
    ).all()
    for alert in matching_alerts:
        alert.latest_analysis_id = record.id
    if matching_alerts:
        db.commit()

    return {
        **results,
        "analysis_id": record.id,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }


@router.post("/analyze")
@limiter.limit("5/minute")
async def analyze_earnings(
    request: Request,
    body: Optional[EarningsAnalyzeRequest] = Body(default=None),
    symbol: Optional[str] = None,
    quarter: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Phase 1 transcript-led earnings analysis.
    Accepts either a JSON body with transcript content or query params for quick testing.
    Persists analysis results for later review.
    """
    from services.earnings_analyzer import EarningsCallAnalyzer

    payload = body or EarningsAnalyzeRequest(
        symbol=symbol or "UNKNOWN",
        quarter=quarter or "UNSPECIFIED",
    )

    analyzer = EarningsCallAnalyzer()
    results = await analyzer.analyze_earnings_call(
        company_symbol=payload.symbol,
        quarter=payload.quarter,
        transcript_text=payload.transcript_text,
        management_text=payload.management_text,
        qa_text=payload.qa_text,
        previous_transcript_text=payload.previous_transcript_text,
        source_type=payload.source_type,
    )
    return _persist_analysis(db, results, payload.transcript_text, payload.previous_transcript_text)


@router.post("/analyze-upload")
@limiter.limit("5/minute")
async def analyze_earnings_upload(
    request: Request,
    symbol: str = Form(...),
    quarter: str = Form(...),
    transcript_text: Optional[str] = Form(default=None),
    previous_transcript_text: Optional[str] = Form(default=None),
    management_text: Optional[str] = Form(default=None),
    qa_text: Optional[str] = Form(default=None),
    source_type: str = Form(default="upload"),
    transcript_pdf: Optional[UploadFile] = File(default=None),
    transcript_audio: Optional[UploadFile] = File(default=None),
    previous_transcript_pdf: Optional[UploadFile] = File(default=None),
    db: Session = Depends(get_db),
):
    """
    Earnings analysis endpoint for multipart form submissions.
    Supports pasted transcript text and optional PDF uploads for current and previous quarters.
    Persists analysis results for later review.
    """
    from services.earnings_analyzer import EarningsCallAnalyzer

    analyzer = EarningsCallAnalyzer()

    resolved_transcript_text = (transcript_text or "").strip()
    resolved_previous_transcript_text = (previous_transcript_text or "").strip()
    audio_bytes: Optional[bytes] = None
    audio_filename: Optional[str] = None

    if transcript_pdf is not None:
        pdf_bytes = await transcript_pdf.read()
        extracted_text = analyzer.extract_text_from_pdf_bytes(pdf_bytes)
        if extracted_text:
            resolved_transcript_text = extracted_text
            source_type = "pdf_upload"

    if transcript_audio is not None:
        audio_bytes = await transcript_audio.read()
        audio_filename = transcript_audio.filename
        if audio_bytes:
            source_type = "audio_upload"

    if previous_transcript_pdf is not None:
        previous_pdf_bytes = await previous_transcript_pdf.read()
        extracted_previous_text = analyzer.extract_text_from_pdf_bytes(previous_pdf_bytes)
        if extracted_previous_text:
            resolved_previous_transcript_text = extracted_previous_text

    results = await analyzer.analyze_earnings_call(
        company_symbol=symbol,
        quarter=quarter,
        transcript_text=resolved_transcript_text or None,
        management_text=management_text,
        qa_text=qa_text,
        previous_transcript_text=resolved_previous_transcript_text or None,
        source_type=source_type,
        audio_bytes=audio_bytes,
        audio_filename=audio_filename,
    )
    return _persist_analysis(db, results, resolved_transcript_text, resolved_previous_transcript_text)


@router.get("/history")
@limiter.limit("20/minute")
def list_earnings_history(
    request: Request,
    limit: int = Query(default=10, ge=1, le=50),
    symbol: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    query = db.query(EarningsAnalysisHistory)
    if symbol:
        query = query.filter(EarningsAnalysisHistory.company == symbol.upper())

    rows = query.order_by(EarningsAnalysisHistory.created_at.desc()).limit(limit).all()
    return {
        "items": [
            {
                "id": row.id,
                "company": row.company,
                "quarter": row.quarter,
                "source_type": row.source_type,
                "market_tone": row.market_tone,
                "confidence_score": row.confidence_score,
                "transcript_excerpt": row.transcript_excerpt,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ]
    }


@router.get("/history/{analysis_id}")
@limiter.limit("30/minute")
def get_earnings_history_item(
    request: Request,
    analysis_id: str,
    db: Session = Depends(get_db),
):
    row = db.query(EarningsAnalysisHistory).filter(EarningsAnalysisHistory.id == analysis_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Analysis not found")

    payload = json.loads(row.analysis_json)
    return {
        **payload,
        "analysis_id": row.id,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "transcript_excerpt": row.transcript_excerpt,
        "previous_transcript_excerpt": row.previous_transcript_excerpt,
    }


@router.get("/alerts/{user_id}")
@limiter.limit("20/minute")
def list_earnings_alerts(request: Request, user_id: str, db: Session = Depends(get_db)):
    rows = db.query(EarningsWatchAlert).filter(EarningsWatchAlert.user_id == user_id).order_by(EarningsWatchAlert.earnings_date.asc()).all()
    return {
        "items": [
            {
                "id": row.id,
                "user_id": row.user_id,
                "symbol": row.symbol,
                "earnings_date": row.earnings_date.isoformat() if row.earnings_date else None,
                "notify_before_hours": row.notify_before_hours,
                "note": row.note,
                "is_active": row.is_active,
                "notified_at": row.notified_at.isoformat() if row.notified_at else None,
                "latest_analysis_id": row.latest_analysis_id,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ]
    }


@router.post("/alerts")
@limiter.limit("10/minute")
def create_earnings_alert(request: Request, body: EarningsAlertCreate, db: Session = Depends(get_db)):
    alert = EarningsWatchAlert(
        user_id=body.user_id,
        symbol=body.symbol.upper(),
        earnings_date=body.earnings_date,
        notify_before_hours=body.notify_before_hours,
        note=body.note,
        is_active=True,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return {
        "id": alert.id,
        "user_id": alert.user_id,
        "symbol": alert.symbol,
        "earnings_date": alert.earnings_date.isoformat() if alert.earnings_date else None,
        "notify_before_hours": alert.notify_before_hours,
        "note": alert.note,
        "is_active": alert.is_active,
        "created_at": alert.created_at.isoformat() if alert.created_at else None,
    }


@router.delete("/alerts/{alert_id}")
@limiter.limit("10/minute")
def delete_earnings_alert(request: Request, alert_id: str, db: Session = Depends(get_db)):
    alert = db.query(EarningsWatchAlert).filter(EarningsWatchAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Earnings alert not found")
    db.delete(alert)
    db.commit()
    return {"message": "Earnings alert deleted"}


@router.post("/alerts/check/{user_id}")
@limiter.limit("20/minute")
def check_due_earnings_alerts(request: Request, user_id: str, db: Session = Depends(get_db)):
    now = datetime.utcnow()
    alerts = db.query(EarningsWatchAlert).filter(
        EarningsWatchAlert.user_id == user_id,
        EarningsWatchAlert.is_active == True,
    ).all()

    due = []
    for alert in alerts:
        if not alert.earnings_date:
            continue
        trigger_time = alert.earnings_date - timedelta(hours=alert.notify_before_hours or 24)
        if trigger_time <= now <= alert.earnings_date:
            due.append({
                "id": alert.id,
                "symbol": alert.symbol,
                "earnings_date": alert.earnings_date.isoformat(),
                "notify_before_hours": alert.notify_before_hours,
                "note": alert.note,
                "latest_analysis_id": alert.latest_analysis_id,
            })
            if alert.notified_at is None:
                alert.notified_at = now

    if due:
        db.commit()
    return {"items": due}
