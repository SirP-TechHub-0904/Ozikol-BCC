"""
Ozikol HTML Extractor — FastAPI entry point.

Runs on port 8001 by default.
Interactive docs: http://localhost:8001/docs
"""

import logging

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from routers import jobs, preview

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
    title="Ozikol HTML Extractor",
    description=(
        "A website extraction pipeline API.\n\n"
        "**Phase 1** — Crawl a URL and return a full audit: CSS, JS, fonts, pages, "
        "broken links, meta tags, tracking scripts, and external resources.\n\n"
        "**Phase 2** — Apply selections: remove anything unchecked, clean HTML.\n\n"
        "**Phase 3** — Upload kept assets to Cloudinary CDN and rewrite URLs.\n\n"
        "All endpoints return JSON. Preview endpoints return raw HTML/CSS/JS."
    ),
    version="1.0.0",
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
