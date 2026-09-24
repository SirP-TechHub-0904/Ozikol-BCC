"""
pipeline/qwen_local.py — Lightweight local inference engine for Qwen 2.5 (1.5B) GGUF.

Runs 100% offline on server CPU using llama-cpp-python.
Features lazy-loading (does not slow down server boot) and CPU thread auto-scaling.
"""

import os
import sys
import logging
import threading
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# Search paths for the GGUF model file
MODEL_SEARCH_PATHS = [
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "qwen2.5-1.5b-instruct-q4_k_m.gguf"),
    "/var/www/extractor/models/qwen2.5-1.5b-instruct-q4_k_m.gguf",
    "models/qwen2.5-1.5b-instruct-q4_k_m.gguf",
    "C:/var/www/extractor/models/qwen2.5-1.5b-instruct-q4_k_m.gguf",
]

class QwenLocalEngine:
    """
    Thread-safe lazy-loading wrapper around Llama (llama-cpp-python)
    for Qwen 2.5 (1.5B Instruct) GGUF inference.
    """

    _instance: Optional['QwenLocalEngine'] = None
    _lock = threading.Lock()

    def __init__(self):
        self._llm = None
        self._model_path: Optional[str] = None
        self._load_lock = threading.Lock()

    @classmethod
    def get_instance(cls) -> 'QwenLocalEngine':
        with cls._lock:
            if cls._instance is None:
                cls._instance = QwenLocalEngine()
            return cls._instance

    def find_model_path(self) -> Optional[str]:
        """Scans candidate paths to locate the downloaded GGUF file."""
        for path in MODEL_SEARCH_PATHS:
            if os.path.isfile(path):
                return os.path.abspath(path)
        return None

    def is_model_available(self) -> bool:
        return self.find_model_path() is not None

    def _ensure_loaded(self):
        """Lazy loads the model into memory upon the first inference request."""
        if self._llm is not None:
            return

        with self._load_lock:
            if self._llm is not None:
                return

            model_path = self.find_model_path()
            if not model_path:
                raise FileNotFoundError(
                    "Qwen 2.5 (1.5B) GGUF model not found on disk. "
                    "Please download it to `models/qwen2.5-1.5b-instruct-q4_k_m.gguf`."
                )

            try:
                from llama_cpp import Llama
            except ImportError:
                raise ImportError(
                    "llama-cpp-python is not installed. Run `pip install llama-cpp-python`."
                )

            cpu_count = os.cpu_count() or 2
            logger.info("Loading Qwen 2.5 (1.5B) from %s using %d CPU threads...", model_path, cpu_count)

            self._llm = Llama(
                model_path=model_path,
                n_ctx=8192,         # 8k context window (uses ~1.2 GB RAM)
                n_threads=cpu_count, # Auto-detect all available CPU cores
                n_batch=512,
                verbose=False
            )
            self._model_path = model_path
            logger.info("Qwen 2.5 (1.5B) successfully loaded into memory.")

    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 1500,
        temperature: float = 0.2,
        top_p: float = 0.9,
    ) -> Dict[str, Any]:
        """
        Executes chat completion with OpenAI-compatible message format.
        """
        self._ensure_loaded()

        # Build Qwen chat template formatting
        prompt = ""
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            prompt += f"<|im_start|>{role}\n{content}<|im_end|>\n"
        prompt += "<|im_start|>assistant\n"

        response = self._llm(
            prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            stop=["<|im_end|>", "<|endoftext|>"],
        )

        content = response["choices"][0]["text"].strip()
        usage = response.get("usage", {
            "prompt_tokens": len(prompt) // 3,
            "completion_tokens": len(content) // 3,
            "total_tokens": (len(prompt) + len(content)) // 3
        })

        return {
            "id": f"chatcmpl-qwen15b-{response.get('id', 'local')}",
            "object": "chat.completion",
            "model": "qwen2.5-1.5b-instruct",
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": content
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": usage
        }


# Singleton accessor
qwen_engine = QwenLocalEngine.get_instance()
