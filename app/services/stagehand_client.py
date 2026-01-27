"""
🎭 STAGEHAND CLIENT (Zimmer-07)
===============================
Connects to the Stagehand-Detektiv agent for advanced DOM inspection and debugging.
"""

import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("StagehandClient")

class StagehandClient:
    def __init__(self, base_url: str = "http://172.20.0.52:8000"): # Adjusted IP based on room layout
        self.base_url = base_url
        self._client = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def aclose(self):
        """Close the underlying HTTP client"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            logger.info("Stagehand client closed.")

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.aclose()

    async def inspect_dom(self, html_content: str, query: str) -> Dict[str, Any]:
        """
        Ask Stagehand to find an element in the HTML using advanced heuristics.
        """
        url = f"{self.base_url}/inspect"
        payload = {
            "html": html_content,
            "query": query
        }
        
        try:
            client = await self._get_client()
            response = await client.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Stagehand inspection failed: {e}")
            return {"error": str(e)}

    async def get_healing_selector(self, broken_selector: str, html_content: str) -> str:
        """
        Ask Stagehand to fix a broken CSS selector.
        """
        url = f"{self.base_url}/heal_selector"
        payload = {
            "broken_selector": broken_selector,
            "html": html_content
        }
        
        try:
            client = await self._get_client()
            response = await client.post(url, json=payload)
            response.raise_for_status()
            return response.json().get("healed_selector", broken_selector)
        except Exception as e:
            logger.error(f"Stagehand healing failed: {e}")
            return broken_selector

    async def act(self, instruction: str, page) -> bool:
        """
        🚀 CEO 2026: SEMANTIC ACTION HANDOVER
        Ask Stagehand to perform a semantic action on the page.
        """
        logger.info(f"📡 [Stagehand] Performing semantic action: {instruction}")
        try:
            # Stagehand normally uses its own internal automation, 
            # but we can also use it to generate Playwright code or selectors.
            html = await page.content()
            res = await self.inspect_dom(html, instruction)
            if res.get("selector"):
                selector = res["selector"]
                logger.info(f"✅ Stagehand identified selector: {selector}")
                await page.click(selector, timeout=5000)
                return True
        except Exception as e:
            logger.error(f"Stagehand act failed: {e}")
        return False
