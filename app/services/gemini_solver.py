# Enhanced Gemini Solver with Context Support
from google import genai
from google.genai import types
import os
import base64
import logging
import time
import asyncio
from typing import Optional, Dict, Any, List
from PIL import Image
import io

logger = logging.getLogger(__name__)

class GeminiSolver:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY")
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None
            logger.warning("GOOGLE_API_KEY not found. GeminiSolver disabled.")
        
        self.model_flash = "gemini-2.0-flash"
        self.model_pro = "gemini-1.5-pro"
        self.stats = {
            "requests": 0,
            "successes": 0,
            "failures": 0,
            "total_time_ms": 0,
        }

    async def solve_image(self, image_base64: str, captcha_type: str = "auto", custom_prompt: Optional[str] = None, high_tier: bool = False) -> Dict[str, Any]:
        """
        Solve image-based CAPTCHA using Gemini with Exponential Backoff (CEO 2026).
        """
        if not self.client:
            return {"success": False, "error": "Gemini client not initialized"}

        start_time = time.time()
        self.stats["requests"] += 1
        model = self.model_pro if high_tier else self.model_flash
        
        max_retries = 3
        backoff_base = 2

        for attempt in range(max_retries):
            try:
                prompt = custom_prompt or self._get_image_prompt(captcha_type)
            
            # Detect image type from base64
            mime_type = "image/png"
            if image_base64.startswith("/9j/"):
                mime_type = "image/jpeg"
            elif image_base64.startswith("R0lGOD"):
                mime_type = "image/gif"

            # Create parts for the request
            content = [
                prompt,
                types.Part.from_bytes(
                    data=base64.b64decode(image_base64),
                    mime_type=mime_type
                )
            ]

            # Make API request (async)
            response = await self.client.aio.models.generate_content(
                model=model,
                contents=content,
                config=types.GenerateContentConfig(
                    temperature=0.0,
                    max_output_tokens=200 if high_tier else 100
                )
            )

            solution_text = response.text.strip()
            solution = self._extract_solution(solution_text, captcha_type)
            
            time_ms = int((time.time() - start_time) * 1000)
            confidence = self._calculate_confidence(solution, response)

            self.stats["successes"] += 1
            self.stats["total_time_ms"] += time_ms

            logger.info(f"Gemini ({model}) solved CAPTCHA in {time_ms}ms: '{solution}' (confidence: {confidence})")

            return {
                "success": True,
                "solution": solution,
                "confidence": confidence,
                "time_ms": time_ms,
                "solver_used": model,
                "cost": 0.001 if high_tier else 0.0
            }

            except Exception as e:
                time_ms = int((time.time() - start_time) * 1000)
                error_str = str(e).lower()
                
                if "rate limit" in error_str or "429" in error_str:
                    if attempt < max_retries - 1:
                        sleep_time = backoff_base ** attempt + random.uniform(0, 1)
                        logger.warning(f"⚠️ Gemini Rate Limit hit. Retrying in {sleep_time:.1f}s... (Attempt {attempt+1}/{max_retries})")
                        await asyncio.sleep(sleep_time)
                        continue
                
                self.stats["failures"] += 1
                logger.error(f"Gemini ({model}) failed after {time_ms}ms: {e}")
                return {
                    "success": False,
                    "solution": "",
                    "confidence": 0.0,
                    "time_ms": time_ms,
                    "solver_used": model,
                    "error": str(e)
                }

    async def solve_text(self, question: str) -> Dict[str, Any]:
        """Solve text-based CAPTCHA"""
        if not self.client:
            return {"success": False, "error": "Gemini client not initialized"}

        start_time = time.time()
        self.stats["requests"] += 1

        try:
            prompt = f"Solve this CAPTCHA question. Return ONLY the answer. Question: {question}"
            
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.0,
                    max_output_tokens=100
                )
            )

            solution = response.text.strip()
            time_ms = int((time.time() - start_time) * 1000)
            
            self.stats["successes"] += 1
            return {
                "success": True,
                "solution": solution,
                "confidence": 0.95,
                "time_ms": time_ms,
                "solver_used": self.model,
                "cost": 0.0
            }
        except Exception as e:
            self.stats["failures"] += 1
            return {"success": False, "error": str(e)}

    def _get_image_prompt(self, captcha_type: str) -> str:
        prompts = {
            "text": "Extract and return ONLY the visible text in this image. No explanation.",
            "math": "Solve the math problem in this image. Return ONLY the result.",
            "grid": "Identify the coordinates or labels of the requested objects in this grid. Return in JSON format if possible.",
            "rotation": "Determine the rotation angle required to fix this image. Return the number of degrees.",
            "auto": "This is a CAPTCHA. Solve it and return ONLY the solution (text or number). No extra words."
        }
        return prompts.get(captcha_type, prompts["auto"])

    def _extract_solution(self, text: str, captcha_type: str) -> str:
        # Simple cleaning
        text = text.strip().strip('"\'`')
        if captcha_type == "math":
            import re
            numbers = re.findall(r'-?\d+', text)
            if numbers: return numbers[-1]
        return text

    def _calculate_confidence(self, solution: str, response: Any) -> float:
        """Heuristic confidence based on response quality"""
        if not solution: return 0.0
        
        # Base confidence
        score = 0.95
        
        # Length check (Too long usually means explanation/fail)
        if len(solution) > 25:
            score -= 0.3
        
        # Pattern check (Looking for 'sorry', 'cannot', 'robot')
        low_conf_words = ["sorry", "cannot", "unable", "robot", "captcha", "image", "clear"]
        if any(word in solution.lower() for word in low_conf_words):
            score -= 0.5
            
        # Numerical/Alphanumeric boost
        import re
        if re.match(r'^[a-zA-Z0-9]+$', solution):
            score += 0.03
            
        return round(min(0.99, max(0.1, score)), 2)

# Singleton
_solver = None

def get_gemini_solver() -> GeminiSolver:
    global _solver
    if _solver is None:
        _solver = GeminiSolver()
    return _solver
