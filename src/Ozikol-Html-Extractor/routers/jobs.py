"""
Job routes — the main pipeline endpoints.

POST   /jobs/start                  Start a new job (kicks off Phase 1 crawl)
GET    /jobs/{job_id}               Get current job status
GET    /jobs/{job_id}/audit         Get full Phase 1 audit result
POST   /jobs/{job_id}/apply         Apply selections (Phase 2 clean)
POST   /jobs/{job_id}/upload        Upload to CDN (Phase 3)
GET    /jobs/{job_id}/output        Get final output (cleaned HTML + CDN map)
GET    /jobs                        List all jobs
DELETE /jobs/{job_id}               Delete a job
"""

import logging
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException

from models.schemas import (
    AiTokenizeRequest,
    AiTokenizeResult,
    ApplySelectionsRequest,
    ApplySelectionsResult,
    AuditResult,
    ErrorResponse,
    ImportableSuitePackage,
    JobStatus,
    JobStatusResponse,
    StartJobRequest,
    StartJobResponse,
    UploadResult,
)
from pipeline.scraper import run_audit
from pipeline.cleaner import apply_selections
from pipeline.uploader import run_upload
from pipeline.ai_tokenizer import run_ai_tokenization
import store.job_store as job_store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/jobs", tags=["Jobs"])


# ---------------------------------------------------------------------------
# POST /jobs/start
# ---------------------------------------------------------------------------

@router.post(
    "/start",
    response_model=StartJobResponse,
    summary="Start a new extraction job",
    description=(
        "Accepts a URL, creates a job, and begins Phase 1 crawl in the background. "
        "Poll GET /jobs/{job_id}/audit to check when results are ready."
    ),
)
async def start_job(body: StartJobRequest, background_tasks: BackgroundTasks):
    url = str(body.url).strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    job_id = job_store.create_job(url)
    job_store.update_status(job_id, JobStatus.AUDITING)
    background_tasks.add_task(_run_audit_task, job_id, url)

    return StartJobResponse(
        job_id=job_id,
        status=JobStatus.AUDITING,
        message=f"Job started. Poll GET /jobs/{job_id}/audit for results.",
    )


async def _run_audit_task(job_id: str, url: str) -> None:
    try:
        audit_result = await run_audit(url, job_id)
        job_store.set_audit(job_id, audit_result.model_dump())
    except Exception as exc:
        logger.exception("Audit failed for job %s", job_id)
        job_store.update_status(job_id, JobStatus.FAILED, error=str(exc))


# ---------------------------------------------------------------------------
# GET /jobs/{job_id}
# ---------------------------------------------------------------------------

@router.get(
    "/{job_id}",
    response_model=JobStatusResponse,
    summary="Get job status",
)
async def get_job_status(job_id: str):
    job = _get_job_or_404(job_id)
    return JobStatusResponse(
        job_id=job_id,
        status=job["status"],
        message=job.get("error"),
    )


# ---------------------------------------------------------------------------
# GET /jobs/{job_id}/audit
# ---------------------------------------------------------------------------

@router.get(
    "/{job_id}/audit",
    response_model=AuditResult,
    summary="Get full Phase 1 audit result",
    description=(
        "Returns the complete audit: CSS files, JS files, fonts, pages with HTML, "
        "broken links, meta tags, tracking scripts, and external resources. "
        "All items have a checked field (trackers default to false). "
        "Returns 202 if the crawl is still in progress."
    ),
)
async def get_audit(job_id: str):
    job = _get_job_or_404(job_id)

    if job["status"] in (JobStatus.PENDING, JobStatus.AUDITING):
        raise HTTPException(status_code=202, detail="Audit still in progress. Try again shortly.")

    if job["status"] == JobStatus.FAILED:
        raise HTTPException(status_code=500, detail=f"Job failed: {job.get('error')}")

    if not job.get("audit"):
        raise HTTPException(status_code=404, detail="Audit result not available yet.")

    return AuditResult(**job["audit"])


# ---------------------------------------------------------------------------
# POST /jobs/{job_id}/apply
# ---------------------------------------------------------------------------

@router.post(
    "/{job_id}/apply",
    response_model=ApplySelectionsResult,
    summary="Apply user selections — Phase 2 clean",
    description=(
        "Send back the list of item IDs with checked: true/false. "
        "Anything unchecked is removed from all pages. "
        "Returns cleaned HTML per page and a diff summary."
    ),
)
async def apply_job_selections(job_id: str, body: ApplySelectionsRequest):
    job = _get_job_or_404(job_id)

    if not job.get("audit"):
        raise HTTPException(status_code=400, detail="Run Phase 1 audit first.")

    if job["status"] not in (JobStatus.AUDITED, JobStatus.CLEANED):
        raise HTTPException(
            status_code=400,
            detail=f"Job is in state '{job['status']}'. Expected 'audited' or 'cleaned'.",
        )

    job_store.update_status(job_id, JobStatus.CLEANING)
    job_store.set_selections(job_id, [s.model_dump() for s in body.selections])

    try:
        audit = AuditResult(**job["audit"])
        result = apply_selections(audit, body.selections, job_id)
        job_store.set_cleaned(job_id, result.model_dump())
        return result
    except Exception as exc:
        logger.exception("Clean failed for job %s", job_id)
        job_store.update_status(job_id, JobStatus.FAILED, error=str(exc))
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# POST /jobs/{job_id}/upload
# ---------------------------------------------------------------------------

@router.post(
    "/{job_id}/upload",
    response_model=UploadResult,
    summary="Upload kept assets to CDN — Phase 3",
    description=(
        "Uploads all kept CSS, JS, and self-hosted font files to Cloudinary. "
        "Rewrites all asset URLs in the cleaned HTML to CDN URLs. "
        "Requires CLOUDINARY_* env vars to be set."
    ),
)
async def upload_job_assets(job_id: str):
    job = _get_job_or_404(job_id)

    if not job.get("cleaned"):
        raise HTTPException(status_code=400, detail="Run Phase 2 apply first.")

    if job["status"] != JobStatus.CLEANED:
        raise HTTPException(
            status_code=400,
            detail=f"Job is in state '{job['status']}'. Expected 'cleaned'.",
        )

    job_store.update_status(job_id, JobStatus.UPLOADING)

    try:
        audit = AuditResult(**job["audit"])
        cleaned = ApplySelectionsResult(**job["cleaned"])
        result = await run_upload(audit, cleaned, job_id)
        job_store.set_upload(job_id, result.model_dump())
        return result
    except Exception as exc:
        logger.exception("Upload failed for job %s", job_id)
        job_store.update_status(job_id, JobStatus.FAILED, error=str(exc))
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# GET /jobs/{job_id}/output
# ---------------------------------------------------------------------------

@router.get(
    "/{job_id}/output",
    response_model=UploadResult,
    summary="Get final output — cleaned HTML + CDN asset map",
)
async def get_output(job_id: str):
    job = _get_job_or_404(job_id)

    if not job.get("upload"):
        raise HTTPException(
            status_code=400,
            detail="Phase 3 upload not completed yet. Call POST /jobs/{job_id}/upload first.",
        )

    return UploadResult(**job["upload"])


# ---------------------------------------------------------------------------
# POST /jobs/{job_id}/ai-tokenize (Phase 4 — DeepSeek AI Debranding & Slicing)
# ---------------------------------------------------------------------------

@router.post(
    "/{job_id}/ai-tokenize",
    response_model=AiTokenizeResult,
    summary="Debrand and tokenize extracted website with DeepSeek AI",
    description=(
        "Executes DeepSeek LLM debranding, strips original proprietary branding, "
        "and slices HTML into modular Ozikol section blueprints with dynamic tokens."
    ),
)
async def tokenize_job_with_ai(job_id: str, body: Optional[AiTokenizeRequest] = None):
    job = _get_job_or_404(job_id)

    if not job.get("cleaned") and not job.get("audit"):
        raise HTTPException(
            status_code=400,
            detail="Run Phase 1 audit and Phase 2 apply before AI tokenization.",
        )

    req = body or AiTokenizeRequest()
    job_store.update_status(job_id, JobStatus.TOKENIZING)

    try:
        audit = AuditResult(**job["audit"])
        cleaned = ApplySelectionsResult(**job["cleaned"]) if job.get("cleaned") else None
        upload = UploadResult(**job["upload"]) if job.get("upload") else None

        suite = await run_ai_tokenization(
            audit=audit,
            cleaned=cleaned,
            upload=upload,
            job_id=job_id,
            suite_name=req.suite_name or "Imported Modern Suite",
            brand_name=req.brand_name or "Enterprise Workspace",
            custom_api_key=req.api_key,
        )

        job_store.set_ai_blueprint(job_id, suite.model_dump())
        return AiTokenizeResult(
            job_id=job_id,
            status=JobStatus.TOKENIZED,
            suite=suite,
            message="Debranding and Ozikol template tokenization completed.",
        )
    except Exception as exc:
        logger.exception("AI tokenization failed for job %s", job_id)
        job_store.update_status(job_id, JobStatus.FAILED, error=str(exc))
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# GET /jobs/{job_id}/ai-blueprint
# ---------------------------------------------------------------------------

@router.get(
    "/{job_id}/ai-blueprint",
    response_model=ImportableSuitePackage,
    summary="Get AI-generated template suite package",
)
async def get_ai_blueprint(job_id: str):
    job = _get_job_or_404(job_id)
    if not job.get("ai_blueprint"):
        raise HTTPException(
            status_code=404,
            detail="AI tokenization not performed yet. Call POST /jobs/{job_id}/ai-tokenize first.",
        )
    return ImportableSuitePackage(**job["ai_blueprint"])


# ---------------------------------------------------------------------------
# GET /jobs
# ---------------------------------------------------------------------------

@router.get(
    "",
    summary="List all jobs",
)
async def list_jobs():
    return {"jobs": job_store.list_jobs()}


# ---------------------------------------------------------------------------
# DELETE /jobs/{job_id}
# ---------------------------------------------------------------------------

@router.delete(
    "/{job_id}",
    summary="Delete a job and all its data",
)
async def delete_job(job_id: str):
    _get_job_or_404(job_id)
    job_store.delete_job(job_id)
    return {"message": f"Job {job_id} deleted."}


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _get_job_or_404(job_id: str) -> dict:
    job = job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    return job
