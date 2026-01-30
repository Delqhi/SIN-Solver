import httpx
import os
import logging
import time
from typing import Dict, Any, Optional

logger = logging.getLogger("GroqSolver")


class GroqSolver:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        self.client = httpx.AsyncClient(timeout=30.0)
        self.endpoint = "https://api.groq.com/openai/v1/chat/completions"

    async def solve_image(self, image_base64: str, captcha_type: str = "auto") -> Dict[str, Any]:
        if not self.api_key:
            return {"success": False, "error": "No Groq API key"}

        start_time = time.time()

        # Priority: Try Vision first
        model = "llama-3.2-11b-vision-preview"
        prompt = "This is a CAPTCHA. Solve it and return ONLY the solution."

        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}

        payload = {
            "model": model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"},
                        },
                    ],
                }
            ],
            "temperature": 0.0,
            "max_tokens": 100,
        }

        try:
            resp = await self.client.post(self.endpoint, json=payload, headers=headers)
            if resp.status_code == 400 or resp.status_code == 404:
                # Fallback to Text Model if vision is decommissioned
                model = "llama-3.3-70b-versatile"
                payload["model"] = model
                payload["messages"][0]["content"] = prompt
                resp = await self.client.post(self.endpoint, json=payload, headers=headers)

            if resp.status_code != 200:
                logger.error(f"Groq API error ({resp.status_code}): {resp.text}")
                return {"success": False, "error": f"Groq HTTP {resp.status_code}"}

            data = resp.json()
            solution = data["choices"][0]["message"]["content"].strip()

            time_ms = int((time.time() - start_time) * 1000)
            return {
                "success": True,
                "solution": solution,
                "confidence": 0.9,
                "time_ms": time_ms,
                "model_used": model,
            }
        except Exception as e:
            logger.error(f"Groq failed: {e}")
            return {"success": False, "error": str(e)}

    async def close(self):
        await self.client.aclose()
