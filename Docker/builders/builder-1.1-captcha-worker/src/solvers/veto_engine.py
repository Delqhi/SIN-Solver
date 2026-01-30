"""
Multi-AI Veto Engine
Implements consensus solving with Mistral + Qwen3 + Kimi Joker
Best Practices 2026
"""

import asyncio
import logging
from typing import Optional, Dict, Any
from datetime import datetime

from src.solvers.vision_mistral import MistralSolver
from src.solvers.vision_qwen import QwenSolver
from src.solvers.vision_kimi import KimiSolver
from src.solvers.steel_controller import SteelController

logger = logging.getLogger(__name__)


class VetoEngine:
    """
    Multi-AI Consensus Engine

    Flow:
    1. Call Mistral Pixtral 12B (Cloud API)
    2. Call Qwen3-VL 8B (Local Ollama)
    3. If consensus: return result
    4. If disagreement: call Kimi k2.5 (Joker)
    5. Return final decision
    """

    def __init__(self):
        self.mistral = MistralSolver()
        self.qwen = QwenSolver()
        self.kimi = KimiSolver()
        self.steel = SteelController()

    async def solve_text_captcha(self, image_base64: str) -> Dict[str, Any]:
        """
        Solve text CAPTCHA using multi-AI consensus
        """
        logger.info("Solving text CAPTCHA with consensus...")

        # Run Mistral and Qwen in parallel
        mistral_task = self.mistral.solve(image_base64, captcha_type="text")
        qwen_task = self.qwen.solve(image_base64, captcha_type="text")

        results = await asyncio.gather(mistral_task, qwen_task, return_exceptions=True)

        mistral_result: Optional[str] = None
        qwen_result: Optional[str] = None

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                if i == 0:
                    logger.warning(f"Mistral failed: {result}")
                else:
                    logger.warning(f"Qwen failed: {result}")
            else:
                if i == 0:
                    mistral_result = result
                else:
                    qwen_result = result

        if mistral_result and qwen_result:
            if mistral_result.lower() == qwen_result.lower():
                logger.info(f"Consensus reached: {mistral_result}")
                return {
                    "success": True,
                    "solution": mistral_result,
                    "confidence": 0.95,
                    "solver_used": "consensus",
                }
            else:
                logger.info(
                    f"Disagreement: Mistral='{mistral_result}', Qwen='{qwen_result}'. Calling Kimi..."
                )
                joker_result = await self.kimi.solve_with_context(
                    image_base64, mistral_result, qwen_result
                )

                return {
                    "success": True,
                    "solution": joker_result,
                    "confidence": 0.85,
                    "solver_used": "kimi_joker",
                }
        elif mistral_result:
            return {
                "success": True,
                "solution": mistral_result,
                "confidence": 0.80,
                "solver_used": "mistral",
            }
        elif qwen_result:
            return {
                "success": True,
                "solution": qwen_result,
                "confidence": 0.80,
                "solver_used": "qwen",
            }
        else:
            return {"success": False, "solution": None, "confidence": 0.0, "solver_used": "none"}

    async def solve_image_grid(self, image_base64: str, instructions: str) -> Dict[str, Any]:
        """
        Solve image grid CAPTCHA (hCaptcha/reCAPTCHA)
        """
        logger.info(f"Solving image grid CAPTCHA: {instructions}")

        # Image grids are best solved by vision models
        result = await self.mistral.solve_image_grid(image_base64, instructions)

        return {
            "success": True,
            "solution": result,
            "confidence": 0.90,
            "solver_used": "mistral_vision",
        }

    async def solve_with_browser(
        self, url: str, captcha_type: str = "auto", timeout: int = 60
    ) -> Dict[str, Any]:
        """
        Solve CAPTCHA on live webpage using Steel Browser + Multi-AI Vision
        REAL-WORLD PRODUCTION LOGIC
        """
        logger.info(f"🚀 Initializing Browser-AI solve for: {url}")

        # 1. Capture visual challenge from browser
        browser_res = await self.steel.solve_captcha(url)
        if not browser_res.get("success"):
            return {
                "success": False,
                "error": f"Browser failed to capture challenge: {browser_res.get('error')}",
                "solver_used": "steel_browser",
            }

        screenshot_b64 = browser_res.get("solution")
        if not screenshot_b64 or len(screenshot_b64) < 100:
            return {
                "success": False,
                "error": "Invalid visual data captured from browser",
                "solver_used": "steel_browser",
            }

        # 2. Parallel AI Consensus on the captured screenshot
        logger.info("🧠 Executing Multi-AI Consensus on captured challenge...")
        vision_result = await self.solve_text_captcha(screenshot_b64)

        return {
            "success": vision_result.get("success", False),
            "solution": vision_result.get("solution"),
            "confidence": vision_result.get("confidence", 0.0),
            "solver_used": f"steel_browser+{vision_result.get('solver_used')}",
        }
