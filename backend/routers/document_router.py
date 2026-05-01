from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
import uuid
import shutil
from datetime import datetime

router = APIRouter(prefix="/documents", tags=["documents"])

# Store uploaded documents in backend/uploads/
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# In-memory document registry (MVP - no DB needed)
documents: dict = {}


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload a document to the knowledge base."""
    allowed_types = {
        "application/pdf", "text/plain", "text/markdown",
        "application/octet-stream"  # some browsers send this for .md
    }
    allowed_extensions = {".pdf", ".txt", ".md"}

    suffix = Path(file.filename).suffix.lower()
    if suffix not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Supported: PDF, TXT, MD"
        )

    if file.size and file.size > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds 50MB limit")

    doc_id = str(uuid.uuid4())
    safe_name = f"{doc_id}{suffix}"
    dest = UPLOAD_DIR / safe_name

    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    size_bytes = dest.stat().st_size
    doc = {
        "id": doc_id,
        "name": file.filename,
        "size": size_bytes,
        "uploaded_at": datetime.now().isoformat(),
        "path": str(dest),
    }
    documents[doc_id] = doc
    return doc


@router.get("/")
async def list_documents():
    """List all uploaded documents."""
    return {"documents": list(documents.values()), "total": len(documents)}


@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    """Delete an uploaded document."""
    doc = documents.get(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    path = Path(doc["path"])
    if path.exists():
        path.unlink()
    del documents[doc_id]
    return {"deleted": True, "id": doc_id}


@router.get("/report/download")
async def download_report():
    """Download the latest generated investment report."""
    # Look for report in backend/outputs/ (where crew writes it)
    reports_dir = Path(__file__).resolve().parent.parent / "outputs"
    report_path = reports_dir / "invex_report.md"

    if not report_path.exists():
        raise HTTPException(
            status_code=404,
            detail="No report available yet. Run an analysis first."
        )

    return FileResponse(
        path=str(report_path),
        filename="invex_investment_report.md",
        media_type="text/markdown"
    )
