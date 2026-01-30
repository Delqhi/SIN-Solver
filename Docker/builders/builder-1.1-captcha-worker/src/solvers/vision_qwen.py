"""
Qwen3-VL 8B Local Solver
Ollama integration for local CAPTCHA solving
"""

import os
import logging
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://host.docker.internal:11434")


class QwenSolver:
    """Local Qwen3-VL 8B via Ollama"""

    def __init__(self):
        self.host = OLLAMA_HOST
        self.model = "qwen3-vl:8b"
        self.client = httpx.AsyncClient(timeout=60.0)

    async def solve(self, image_base64: str, captcha_type: str = "text") -> Optional[str]:
        """
        Solve CAPTCHA using local Qwen3
        """
        try:
            prompt = self._get_prompt(captcha_type)

            response = await self.client.post(
                f"{self.host}/api/chat",
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt, "images": [image_base64]}],
                    "stream": False,
                    "options": {"temperature": 0.1, "num_predict": 50},
                },
            )

            if response.status_code == 200:
                data = response.json()
                result = data["message"]["content"].strip()
                logger.info(f"Qwen result: {result}")
                return result
            else:
                logger.error(f"Ollama error: {response.status_code} - {response.text}")
                return None

        except Exception as e:
            logger.error(f"Qwen solve error: {e}")
            return None

    def _get_prompt(self, captcha_type: str) -> str:
        """Get appropriate prompt for CAPTCHA type"""
        if captcha_type == "text":
            return "Extract the text from this CAPTCHA image. Return ONLY the text, nothing else."
        else:
            return "Describe what you see in this image."

    async def health_check(self) -> bool:
        """Check if Ollama is available"""
        try:
            response = await self.client.get(f"{self.host}/api/tags")
            return response.status_code == 200
        except:
            return False
