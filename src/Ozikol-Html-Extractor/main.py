"""
Ozikol HTML Extractor — FastAPI entry point.

Runs on port 8001 by default.
Interactive docs: http://localhost:8001/docs
"""

import logging
import sys
import asyncio

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import uvicorn
from fastapi import FastAPI
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
