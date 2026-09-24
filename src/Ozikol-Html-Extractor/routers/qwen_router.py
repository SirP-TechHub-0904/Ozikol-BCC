"""
routers/qwen_router.py — API router for Local Qwen 2.5 (1.5B) Inference.

Provides:
1. `POST /api/ai/qwen/chat` — Direct simple chat and prompt execution.
2. `POST /v1/chat/completions` — Universal OpenAI-compatible API endpoint.
3. `GET /api/ai/qwen/status` — Model health and availability check.
"""

import time
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse

from pipeline.qwen_local import qwen_engine

router = APIRouter(tags=["AI - Qwen Local Engine"])

# ---------------------------------------------------------------------------
# Request & Response Schemas
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str = Field("user", description="System, user, or assistant")
    content: str = Field(..., description="Message text content")

class QwenChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., description="Chat message history")
    max_tokens: int = Field(1500, description="Max response tokens to generate")
    temperature: float = Field(0.2, description="Sampling temperature (0.0 = deterministic)")
    top_p: float = Field(0.9, description="Nucleus sampling probability")

class OpenAICompatRequest(BaseModel):
    model: Optional[str] = "qwen2.5-1.5b-instruct"
    messages: List[ChatMessage]
    max_tokens: Optional[int] = 1500
    temperature: Optional[float] = 0.2
    top_p: Optional[float] = 0.9
    stream: Optional[bool] = False

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/api/ai/qwen/status")
async def get_qwen_status():
    """
    Checks if Qwen 2.5 (1.5B) GGUF model is downloaded and ready on this server.
    """
    is_available = qwen_engine.is_model_available()
    model_path = qwen_engine.find_model_path()
    return {
        "status": "ready" if is_available else "model_file_missing",
        "model_name": "Qwen 2.5 (1.5B Instruct - Q4_K_M)",
        "model_path": model_path,
        "context_window": 8192,
        "is_loaded_in_ram": qwen_engine._llm is not None,
    }

@router.post("/api/ai/qwen/chat")
async def qwen_chat(req: QwenChatRequest):
    """
    Executes a chat prompt against the local Qwen 2.5 (1.5B) neural network.
    """
    if not qwen_engine.is_model_available():
        raise HTTPException(
            status_code=503,
            detail="Qwen 2.5 (1.5B) model file not found on server. Please download the GGUF model."
        )

    t0 = time.time()
    try:
        dict_messages = [{"role": m.role, "content": m.content} for m in req.messages]
        result = qwen_engine.chat_completion(
            messages=dict_messages,
            max_tokens=req.max_tokens,
            temperature=req.temperature,
            top_p=req.top_p,
        )
        elapsed_ms = int((time.time() - t0) * 1000)
        
        content = result["choices"][0]["message"]["content"]
        return {
            "content": content,
            "latency_ms": elapsed_ms,
            "usage": result.get("usage"),
            "model": result.get("model")
        }
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(ex)}")

@router.post("/v1/chat/completions")
async def openai_compatible_chat(req: OpenAICompatRequest):
    """
    OpenAI-compatible drop-in completion endpoint.
    Accepts standard OpenAI format for direct compatibility with any SDK.
    """
    if not qwen_engine.is_model_available():
        raise HTTPException(
            status_code=503,
            detail="Local AI model is not installed or available on this instance."
        )

    try:
        dict_messages = [{"role": m.role, "content": m.content} for m in req.messages]
        result = qwen_engine.chat_completion(
            messages=dict_messages,
            max_tokens=req.max_tokens or 1500,
            temperature=req.temperature if req.temperature is not None else 0.2,
            top_p=req.top_p if req.top_p is not None else 0.9,
        )
        return JSONResponse(result)
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(ex)}")
