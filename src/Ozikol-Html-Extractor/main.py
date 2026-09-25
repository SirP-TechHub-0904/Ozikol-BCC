"""
Ozikol HTML Extractor — FastAPI entry point.

Runs on port 8001 by default.
Interactive docs: http://localhost:8001/docs
"""

import logging
import sys
import asyncio

if sys.platform == "win32" and sys.version_info < (3, 14):
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    except Exception:
        pass

import time
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from routers import jobs, preview, sections_builder, qwen_router

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Ozikol HTML Extractor & Section Builder",
    description=(
        "A modular website extraction and section builder pipeline API.\n\n"
        "**SectionsBuilder (`/sections-builder-from-url`)** — Crawls a URL, discovers menu-linked pages, "
        "decomposes the DOM into classified section templates (Menu, Hero, Body Features, Footers, Blogs), "
        "extracts class-matched scoped CSS and JS, and enables independent section previewing.\n\n"
        "**AI Engine (`/api/ai/qwen`, `/v1/chat/completions`)** — On-device Qwen 2.5 (1.5B) local inference.\n\n"
        "**Phase 1-4 Pipeline (`/jobs`)** — Crawl, audit, clean, upload to CDN, and DeepSeek AI tokenization."
    ),
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# Request Logging Middleware
# ---------------------------------------------------------------------------

@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    """
    Logs all incoming HTTP requests, response status codes, and execution timings.
    """
    start_time = time.time()
    client_ip = request.client.host if request.client else "unknown"
    query_str = f"?{request.url.query}" if request.url.query else ""
    logger.info(">>> INCOMING [%s] %s%s (client: %s)", request.method, request.url.path, query_str, client_ip)
    
    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        logger.info("<<< COMPLETED [%s] %s -> HTTP %s (took %.1fms)", request.method, request.url.path, response.status_code, process_time)
        return response
    except Exception as ex:
        process_time = (time.time() - start_time) * 1000
        logger.error("!!! FAILED [%s] %s -> Exception: %s (took %.1fms)", request.method, request.url.path, ex, process_time)
        raise

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(sections_builder.router)
app.include_router(qwen_router.router)
app.include_router(jobs.router)
app.include_router(preview.router)

# ---------------------------------------------------------------------------
# Root
# ---------------------------------------------------------------------------

@app.get("/", include_in_schema=False)
async def root():
    return JSONResponse({
        "service": "Ozikol HTML Extractor",
        "version": "1.0.0",
        "docs": "/docs",
        "status": "running",
        "cloudinary_configured": settings.cloudinary_configured,
    })


@app.get("/health", tags=["Health"])
async def health():
    """Health check endpoint — useful for Railway/Render/load balancers."""
    return {"status": "ok", "cloudinary_configured": settings.cloudinary_configured}


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    logger.info("Starting Ozikol HTML Extractor on %s:%s", settings.host, settings.port)
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level="debug" if settings.debug else "info",
    )
