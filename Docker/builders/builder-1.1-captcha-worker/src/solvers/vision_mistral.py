"""
Mistral Pixtral 12B Vision Solver
Cloud API integration for text and image CAPTCHA solving
"""

import os
import logging
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions"


class MistralSolver:
    """Mistral Pixtral 12B Vision API client"""
    
    def __init__(self):
        self.api_key = MISTRAL_API_KEY
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def solve(self, image_base64: str, captcha_type: str = "text") -> Optional[str]:
        """
        Solve CAPTCHA using Mistral Vision
        """
        if not self.api_key:
            logger.error("MISTRAL_API_KEY not set")
            return None
        
        try:
            prompt = self._get_prompt(captcha_type)
            
            response = await self.client.post(
                MISTRAL_API_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "pixtral-12b-latest",
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
                    "max_tokens": 100,
                    "temperature": 0.1
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                result = data["choices"][0]["message"]["content"].strip()
                logger.info(f"Mistral result: {result}")
                return result
            else:
                logger.error(f"Mistral API error: {response.status_code} - {response.text}")
                return None
        
        except Exception as e:
            logger.error(f"Mistral solve error: {e}")
            return None
    
    async def solve_image_grid(self, image_base64: str, instructions: str) -> Optional[str]:
        """
        Solve image grid CAPTCHA (hCaptcha/reCAPTCHA style)
        """
        if not self.api_key:
            return None
        
        try:
            prompt = f"""Analyze this CAPTCHA image grid.
Instructions: {instructions}

Identify which grid cells contain the requested objects.
Return ONLY the cell numbers (e.g., "1,3,5" or "all" if all cells match).
Be precise and only select cells you're confident about."""

            response = await self.client.post(
                MISTRAL_API_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "pixtral-12b-latest",
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
                logger.info(f"Mistral grid result: {result}")
                return result
            else:
                logger.error(f"Mistral API error: {response.status_code}")
                return None
        
        except Exception as e:
            logger.error(f"Mistral grid solve error: {e}")
            return None
    
    def _get_prompt(self, captcha_type: str) -> str:
        """Get appropriate prompt for CAPTCHA type"""
        if captcha_type == "text":
            return """Analyze this CAPTCHA image and extract the text.
Return ONLY the text characters, no additional explanation.
If the text is unclear, make your best guess."""
        else:
            return "Analyze this image and describe what you see."
