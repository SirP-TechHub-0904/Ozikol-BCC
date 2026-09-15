"""
In-memory job state manager.
Swap the dict for Redis when scaling up.
"""

import uuid
from datetime import datetime, timezone
from threading import Lock
from typing import Any, Optional

from models.schemas import JobStatus

_store: dict[str, dict[str, Any]] = {}
_lock = Lock()


def create_job(url: str) -> str:
    """Create a new job and return its ID."""
    job_id = str(uuid.uuid4())
    with _lock:
        _store[job_id] = {
            "job_id": job_id,
            "url": url,
            "status": JobStatus.PENDING,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "audit": None,          # AuditResult dict after Phase 1
            "selections": None,     # list of SelectionItem after Phase 2
            "cleaned": None,        # ApplySelectionsResult dict after Phase 2
            "upload": None,         # UploadResult dict after Phase 3
            "error": None,
        }
    return job_id


def get_job(job_id: str) -> Optional[dict[str, Any]]:
    """Return job dict or None if not found."""
    return _store.get(job_id)


def update_status(job_id: str, status: JobStatus, error: Optional[str] = None) -> None:
    with _lock:
        if job_id in _store:
            _store[job_id]["status"] = status
            _store[job_id]["updated_at"] = datetime.now(timezone.utc).isoformat()
            if error:
                _store[job_id]["error"] = error


def set_audit(job_id: str, audit: dict[str, Any]) -> None:
    with _lock:
        if job_id in _store:
            _store[job_id]["audit"] = audit
            _store[job_id]["status"] = JobStatus.AUDITED
            _store[job_id]["updated_at"] = datetime.now(timezone.utc).isoformat()


def set_selections(job_id: str, selections: list[dict[str, Any]]) -> None:
    with _lock:
        if job_id in _store:
            _store[job_id]["selections"] = selections
            _store[job_id]["updated_at"] = datetime.now(timezone.utc).isoformat()


def set_cleaned(job_id: str, cleaned: dict[str, Any]) -> None:
    with _lock:
        if job_id in _store:
            _store[job_id]["cleaned"] = cleaned
            _store[job_id]["status"] = JobStatus.CLEANED
            _store[job_id]["updated_at"] = datetime.now(timezone.utc).isoformat()


def set_upload(job_id: str, upload: dict[str, Any]) -> None:
    with _lock:
        if job_id in _store:
            _store[job_id]["upload"] = upload
            _store[job_id]["status"] = JobStatus.COMPLETE
            _store[job_id]["updated_at"] = datetime.now(timezone.utc).isoformat()


def list_jobs() -> list[dict[str, Any]]:
    """Return a summary of all jobs."""
    with _lock:
        return [
            {
                "job_id": v["job_id"],
                "url": v["url"],
                "status": v["status"],
                "created_at": v["created_at"],
                "updated_at": v["updated_at"],
            }
            for v in _store.values()
        ]


def delete_job(job_id: str) -> bool:
    with _lock:
        if job_id in _store:
            del _store[job_id]
            return True
    return False
