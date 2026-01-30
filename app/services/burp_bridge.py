"""
Burp Suite Bridge Service
Provides specialized logic for handling Burp Suite CAPTCHA solving requests.
"""

import logging
import base64
from typing import Optional, Dict, Any

from app.services.solver_router import get_solver_router, UnifiedSolution

logger = logging.getLogger(__name__)


class BurpBridgeService:
    def __init__(self):
        self.router = None

    async def _ensure_router(self):
        if self.router is None:
            self.router = await get_solver_router()

    async def solve_burp_captcha(
        self,
        image_data: bytes,
        captcha_type: str = "auto",
        context: Optional[Dict[str, Any]] = None,
    ) -> UnifiedSolution:
        """
        Solves a CAPTCHA sent from Burp Suite.
        image_data: Raw bytes of the image
        """
        await self._ensure_router()

        # Convert bytes to base64 for the router
        image_base64 = base64.b64encode(image_data).decode("utf-8")

        logger.info(f"🌉 [BurpBridge] Received solve request. Type: {captcha_type}")

        # Offload to the main solver router
        result = await self.router.solve_image(
            image_base64=image_base64, captcha_type=captcha_type, use_cache=True
        )

        return result


# Singleton
_burp_bridge = None


def get_burp_bridge() -> BurpBridgeService:
    global _burp_bridge
    if _burp_bridge is None:
        _burp_bridge = BurpBridgeService()
    return _burp_bridge
