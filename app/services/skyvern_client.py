#!/usr/bin/env python3
"""
🦅 SKYVERN DEEP INTEGRATION CLIENT
==================================
Connects Steel Browser (Zimmer-05) with Skyvern Vision (Zimmer-06).
Allows complex visual reasoning and UI navigation.
"""

import httpx
import logging
import json
import base64
from typing import Dict, Any, Optional, List

logger = logging.getLogger("SkyvernClient")


class SkyvernClient:
    """
    Client for Zimmer-06 Skyvern Auge
    """

    def __init__(self, base_url: str = "http://172.20.0.51:8000"):
        self.base_url = base_url
        self._client = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=60.0)
        return self._client

    async def aclose(self):
        """Close the underlying HTTP client"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            logger.info("Skyvern client closed.")

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.aclose()

    async def analyze_image(self, image_b64: str, task: str = "describe") -> Dict[str, Any]:
        """
        Send image to Skyvern for deep analysis
        """
        url = f"{self.base_url}/analyze"
        payload = {"image": image_b64, "task": task}

        try:
            client = await self._get_client()
            response = await client.post(url, json=payload)
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Skyvern API Error ({response.status_code}): {response.text}")
                return {"error": f"HTTP {response.status_code}", "details": response.text}
        except Exception as e:
            logger.error(f"Failed to connect to Skyvern: {e}")
            return {"error": "Connection failed", "details": str(e)}

    async def solve_captcha_element(self, image_b64: str, captcha_type: str) -> Dict[str, Any]:
        """
        Ask Skyvern to solve a specific CAPTCHA element
        """
        return await self.analyze_image(image_b64, task=f"solve_captcha:{captcha_type}")

    async def get_click_coordinates(
        self, image_b64: str, target_description: str
    ) -> Optional[Dict[str, int]]:
        """
        Get coordinates to click based on visual description
        """
        result = await self.analyze_image(image_b64, task=f"find_coordinates:{target_description}")

        if "coordinates" in result:
            return result["coordinates"]
        return None

    async def navigate_and_solve(self, url: str, task: str) -> Dict[str, Any]:
        """
        🚀 CEO 2026: AGENTIC NAVIGATION & SOLVING
        Instructs Skyvern to handle a full navigation task autonomously.
        """
        target_url = f"{self.base_url}/navigate-and-solve"
        payload = {"url": url, "prompt": task, "stealth": True, "model": "gemini-3-flash"}

        try:
            client = await self._get_client()
            response = await client.post(target_url, json=payload, timeout=120.0)
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Skyvern Navigation Error ({response.status_code}): {response.text}")
                return {"error": f"HTTP {response.status_code}", "success": False}
        except Exception as e:
            logger.error(f"Failed to navigate via Skyvern: {e}")
            return {"error": str(e), "success": False}
