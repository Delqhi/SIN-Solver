"""
🚀 CEO EMPIRE STATE MANDATE 2026: UNIFIED HYBRID CAPTCHA DETECTOR
==============================================================
SSoT for high-performance CAPTCHA detection.
Combines:
1. Network Interception (Passive & Reliable)
2. DOM Heuristics (Fast & Proven)
3. Vision AI Grounding (Flexible & Fallback)
"""

import logging
import os
import tempfile
import asyncio
from typing import Dict, Any, Optional, Tuple, List
import json

from app.services.mistral_solver import get_mistral_solver, MistralSolver
from app.services.vision_orchestrator import CaptchaVisionSolver, parse_gemini_response_flexible
from app.services.network_detector import NetworkCaptchaDetector
from app.services.dom_detector import DOMCaptchaDetector

logger = logging.getLogger(__name__)

from app.services.interaction_detector import get_universal_detector, UniversalInteractionDetector

logger = logging.getLogger(__name__)


class CaptchaDetector(UniversalInteractionDetector):
    """
    🚀 ALL-IN-ONE CAPTCHA & INTERACTION DETECTOR (CEO 2026)
    Official entry point for the Unified Hybrid Detector.
    Recognizes Captchas, Forms, Buttons, Custom Gates, and Deception Traps.
    """

    async def detect_type_from_page(self, page: Page) -> Tuple[str, Any]:
        """
        Detects primary obstacle and returns (type, primary_element).
        Maintains legacy compatibility while using UID V3.
        """
        res = await self.detect_all(page)
        primary_type = res.get("primary_type", "none")

        # Extract primary element from observations if possible
        element = None
        for obs in res.get("all_observations", []):
            if obs.get("layer") == "dom" and obs.get("element"):
                element = obs["element"]
                break

        return primary_type, element

    async def get_mission_report(self, page: Page) -> Dict[str, Any]:
        """Returns the full CEO-grade mission report for the page"""
        return await self.detect_all(page)


# Singleton bridge
_detector = None


async def get_captcha_detector() -> CaptchaDetector:
    global _detector
    if _detector is None:
        _detector = CaptchaDetector()
    return _detector
