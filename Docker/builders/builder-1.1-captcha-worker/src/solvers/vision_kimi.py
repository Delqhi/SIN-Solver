"""
Kimi k2.5 Solver (Joker/Veto)
Final decision maker when Mistral and Qwen disagree
"""

import os
import logging
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

KIMI_API_KEY = os.getenv("KIMI_API_KEY", "sk-Bt2UBz3Goujnk9KA9lE534yZGHK8JEPR9O1ZyEyvJmNN5zr7")
KIMI_API_URL = os.getenv("KIMI_API_URL", "https://api.kimi.com/coding/v1/chat/completions")


class KimiSolver:
    """Kimi k2.5 API client for veto decisions (Coding Model)"""
    
    def __init__(self):
        self.api_key = KIMI_API_KEY
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def solve_with_context(
        self, 
        image_base64: str, 
        answer_a: str, 
        answer_b: str
    ) -> Optional[str]:
        """
        Make final decision when two solvers disagree
        """
        if not self.api_key:
            logger.warning("KIMI_API_KEY not set, using answer_a as fallback")
            return answer_a
        
        try:
            prompt = f"""You are the final judge for a CAPTCHA solving system.
 
 Two AI models analyzed this CAPTCHA image:
 - Model A says: "{answer_a}"
 - Model B says: "{answer_b}"
 
 Look at the image and decide which answer is correct.
 Return ONLY the correct answer, no explanation."""
 
            response = await self.client.post(
                KIMI_API_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "kimi-for-coding",
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": prompt
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{image_base64}"
                                    }
                                }
                            ]
                        }
                    ],
                    "max_tokens": 50,
                    "temperature": 0.1
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                result = data["choices"][0]["message"]["content"].strip()
                logger.info(f"Kimi joker result: {result}")
                return result
            else:
                logger.error(f"Kimi API error: {response.status_code}")
                # Fallback to answer_a
                return answer_a
        
        except Exception as e:
            logger.error(f"Kimi solve error: {e}")
            # Fallback to answer_a
            return answer_a
