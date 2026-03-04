from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import JSONResponse
from services.news_service import run_news_analysis
from datetime import datetime

router = APIRouter(prefix="/news", tags=["news"])

# Cache last analysis result in memory (MVP — no DB)
_cached_analysis: dict | None = None
_is_running = False


@router.post("/analyze")
async def trigger_news_analysis(background_tasks: BackgroundTasks):
    """
    Trigger the news + decision crew to fetch geo-political / banking news
    and produce BUY/SELL/HOLD signals. Runs in background to avoid timeout.
    """
    global _is_running
    if _is_running:
        return JSONResponse({"status": "running", "message": "Analysis already in progress"})

    def _run():
        global _cached_analysis, _is_running
        _is_running = True
        try:
            result = run_news_analysis()
            _cached_analysis = result
        finally:
            _is_running = False

    background_tasks.add_task(_run)
    return {"status": "started", "message": "News analysis started. Poll /news/result for output."}


@router.get("/result")
async def get_news_result():
    """Return the most recent cached news analysis result."""
    return {
        "is_running": _is_running,
        "result": _cached_analysis,
        "timestamp": datetime.now().isoformat(),
    }
