#!/usr/bin/env python3
"""
🌐 STEEL BROWSER CONNECTOR SERVICE
===================================
Manages connections to the Steel Stealth Browser service.
Provides unified interface for page navigation, screenshot capture,
and element extraction with anti-detection capabilities.

Service: agent-05-steel-browser (port 3005)
"""

import asyncio
import logging
import aiohttp
import json
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime
from urllib.parse import urljoin

logger = logging.getLogger("SteelBrowserConnector")


class SteelBrowserConnector:
    """
    Unified connector for Steel Stealth Browser service.

    Features:
    - Async HTTP connection pooling
    - Auto-retry with exponential backoff
    - Session management for persistent browsing
    - Screenshot & element extraction
    - Stealth mode for anti-detection
    """

    def __init__(
        self,
        steel_url: str = "http://agent-05-steel:3005",
        timeout: int = 30,
        max_retries: int = 3,
        retry_delay: float = 1.0,
    ):
        """
        Initialize Steel Browser Connector.

        Args:
            steel_url: Base URL of Steel Browser service
            timeout: Request timeout in seconds
            max_retries: Maximum retry attempts on failure
            retry_delay: Initial delay between retries (seconds)
        """
        self.steel_url = steel_url
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.session: Optional[aiohttp.ClientSession] = None
        self.active_sessions: Dict[str, Dict[str, Any]] = {}

    async def connect(self) -> bool:
        """
        Establish connection to Steel Browser service.

        Returns:
            True if connection successful, False otherwise
        """
        try:
            if self.session is None:
                self.session = aiohttp.ClientSession(timeout=self.timeout)

            # Test connection
            async with self.session.get(f"{self.steel_url}/health") as resp:
                if resp.status == 200:
                    logger.info(f"✅ Connected to Steel Browser at {self.steel_url}")
                    return True
                else:
                    logger.error(f"❌ Steel Browser health check failed: {resp.status}")
                    return False
        except Exception as e:
            logger.error(f"❌ Failed to connect to Steel Browser: {e}")
            return False

    async def disconnect(self) -> None:
        """Close session and cleanup."""
        if self.session:
            await self.session.close()
            self.session = None
            logger.info("🔌 Disconnected from Steel Browser")

    async def _request_with_retry(
        self, method: str, endpoint: str, **kwargs
    ) -> Optional[Dict[str, Any]]:
        """
        Make HTTP request with automatic retry on failure.

        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint path
            **kwargs: Additional request arguments

        Returns:
            Response JSON or None if all retries failed
        """
        if not self.session:
            await self.connect()

        url = urljoin(self.steel_url, endpoint)
        attempt = 0
        delay = self.retry_delay

        while attempt < self.max_retries:
            try:
                async with self.session.request(method, url, **kwargs) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        logger.debug(f"✓ {method} {endpoint}: {resp.status}")
                        return data
                    else:
                        logger.warning(f"⚠ {method} {endpoint}: {resp.status}")

            except asyncio.TimeoutError:
                logger.warning(f"⏱ Timeout on {endpoint} (attempt {attempt + 1})")
            except Exception as e:
                logger.warning(f"⚠ Request failed: {e} (attempt {attempt + 1})")

            attempt += 1
            if attempt < self.max_retries:
                await asyncio.sleep(delay)
                delay *= 2  # Exponential backoff

        logger.error(f"❌ All retries exhausted for {endpoint}")
        return None

    async def create_session(
        self,
        session_name: Optional[str] = None,
        stealth_mode: bool = True,
        user_agent: Optional[str] = None,
    ) -> Optional[str]:
        """
        Create new browser session.

        Args:
            session_name: Optional session identifier
            stealth_mode: Enable anti-detection features
            user_agent: Custom User-Agent string

        Returns:
            Session ID or None if failed
        """
        payload = {
            "stealth_mode": stealth_mode,
            "user_agent": user_agent
            or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        }

        result = await self._request_with_retry("POST", "/api/sessions", json=payload)

        if result and "session_id" in result:
            session_id = result["session_id"]
            self.active_sessions[session_id] = {
                "name": session_name or session_id,
                "created_at": datetime.now().isoformat(),
                "stealth_mode": stealth_mode,
            }
            logger.info(f"✓ Created session: {session_id}")
            return session_id

        logger.error("Failed to create browser session")
        return None

    async def close_session(self, session_id: str) -> bool:
        """
        Close a browser session.

        Args:
            session_id: Session to close

        Returns:
            True if successful, False otherwise
        """
        result = await self._request_with_retry("DELETE", f"/api/sessions/{session_id}")

        if result and result.get("success"):
            if session_id in self.active_sessions:
                del self.active_sessions[session_id]
            logger.info(f"✓ Closed session: {session_id}")
            return True

        logger.error(f"Failed to close session: {session_id}")
        return False

    async def navigate_to(self, session_id: str, url: str, wait_time: int = 5) -> bool:
        """
        Navigate to URL in browser session.

        Args:
            session_id: Target session ID
            url: URL to navigate to
            wait_time: Time to wait for page load (seconds)

        Returns:
            True if successful, False otherwise
        """
        payload = {"url": url, "wait_time": wait_time}

        result = await self._request_with_retry(
            "POST", f"/api/sessions/{session_id}/navigate", json=payload
        )

        if result and result.get("success"):
            logger.info(f"✓ Navigated to {url} in session {session_id}")
            return True

        logger.error(f"Failed to navigate to {url}")
        return False

    async def take_screenshot(self, session_id: str, full_page: bool = False) -> Optional[str]:
        """
        Take screenshot of current page.

        Args:
            session_id: Target session ID
            full_page: Capture full page or viewport only

        Returns:
            Base64-encoded screenshot or None if failed
        """
        payload = {"full_page": full_page}

        result = await self._request_with_retry(
            "POST", f"/api/sessions/{session_id}/screenshot", json=payload
        )

        if result and "screenshot" in result:
            logger.debug(f"✓ Screenshot captured from session {session_id}")
            return result["screenshot"]

        logger.error(f"Failed to capture screenshot from session {session_id}")
        return None

    async def get_page_source(self, session_id: str) -> Optional[str]:
        """
        Get current page HTML/source.

        Args:
            session_id: Target session ID

        Returns:
            Page HTML or None if failed
        """
        result = await self._request_with_retry("GET", f"/api/sessions/{session_id}/source")

        if result and "source" in result:
            logger.debug(f"✓ Page source retrieved from session {session_id}")
            return result["source"]

        logger.error(f"Failed to get page source from session {session_id}")
        return None

    async def extract_elements(
        self,
        session_id: str,
        selector: str,
        attributes: List[str] = ["id", "class", "text", "href"],
    ) -> Optional[List[Dict[str, Any]]]:
        """
        Extract elements matching CSS selector.

        Args:
            session_id: Target session ID
            selector: CSS selector to match
            attributes: Element attributes to extract

        Returns:
            List of element data or None if failed
        """
        payload = {"selector": selector, "attributes": attributes}

        result = await self._request_with_retry(
            "POST", f"/api/sessions/{session_id}/extract", json=payload
        )

        if result and "elements" in result:
            logger.debug(f"✓ Extracted {len(result['elements'])} elements")
            return result["elements"]

        logger.warning(f"No elements found for selector: {selector}")
        return []

    async def click_element(self, session_id: str, selector: str, wait_after: int = 1) -> bool:
        """
        Click element matching selector.

        Args:
            session_id: Target session ID
            selector: CSS selector of element to click
            wait_after: Time to wait after click (seconds)

        Returns:
            True if successful, False otherwise
        """
        payload = {"selector": selector, "wait_after": wait_after}

        result = await self._request_with_retry(
            "POST", f"/api/sessions/{session_id}/click", json=payload
        )

        if result and result.get("success"):
            logger.info(f"✓ Clicked element: {selector}")
            return True

        logger.error(f"Failed to click element: {selector}")
        return False

    async def type_text(
        self, session_id: str, selector: str, text: str, clear_first: bool = True
    ) -> bool:
        """
        Type text into form field.

        Args:
            session_id: Target session ID
            selector: CSS selector of input field
            text: Text to type
            clear_first: Clear field before typing

        Returns:
            True if successful, False otherwise
        """
        payload = {"selector": selector, "text": text, "clear_first": clear_first}

        result = await self._request_with_retry(
            "POST", f"/api/sessions/{session_id}/type", json=payload
        )

        if result and result.get("success"):
            logger.info(f"✓ Typed text into: {selector}")
            return True

        logger.error(f"Failed to type into: {selector}")
        return False

    async def get_session_state(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get current session state and page info.

        Args:
            session_id: Target session ID

        Returns:
            Session state dict or None if failed
        """
        result = await self._request_with_retry("GET", f"/api/sessions/{session_id}/state")

        if result:
            logger.debug(f"✓ Retrieved state for session {session_id}")
            return result

        logger.error(f"Failed to get session state: {session_id}")
        return None

    async def wait_for_selector(self, session_id: str, selector: str, timeout: int = 10) -> bool:
        """
        Wait for element to appear on page.

        Args:
            session_id: Target session ID
            selector: CSS selector to wait for
            timeout: Maximum wait time (seconds)

        Returns:
            True if element appeared, False if timeout
        """
        payload = {"selector": selector, "timeout": timeout}

        result = await self._request_with_retry(
            "POST", f"/api/sessions/{session_id}/wait", json=payload
        )

        if result and result.get("success"):
            logger.info(f"✓ Element appeared: {selector}")
            return True

        logger.warning(f"Timeout waiting for: {selector}")
        return False

    async def clear_cookies(self, session_id: str) -> bool:
        """
        Clear all cookies in session.

        Args:
            session_id: Target session ID

        Returns:
            True if successful, False otherwise
        """
        result = await self._request_with_retry("POST", f"/api/sessions/{session_id}/clear-cookies")

        if result and result.get("success"):
            logger.info(f"✓ Cleared cookies for session {session_id}")
            return True

        logger.error(f"Failed to clear cookies for session {session_id}")
        return False

    def get_active_sessions(self) -> List[str]:
        """Get list of active session IDs."""
        return list(self.active_sessions.keys())

    async def health_check(self) -> bool:
        """
        Check if Steel Browser service is healthy.

        Returns:
            True if healthy, False otherwise
        """
        try:
            if not self.session:
                await self.connect()

            async with self.session.get(f"{self.steel_url}/health", timeout=self.timeout) as resp:
                is_healthy = resp.status == 200
                logger.debug(f"🏥 Steel Browser health: {'✓' if is_healthy else '✗'}")
                return is_healthy
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False


# Singleton instance
_connector: Optional[SteelBrowserConnector] = None


async def get_steel_connector() -> SteelBrowserConnector:
    """
    Get or create singleton Steel Browser Connector instance.

    Returns:
        SteelBrowserConnector instance
    """
    global _connector
    if _connector is None:
        _connector = SteelBrowserConnector()
        await _connector.connect()
    return _connector


async def cleanup_steel_connector() -> None:
    """Cleanup and disconnect Steel Browser Connector."""
    global _connector
    if _connector:
        await _connector.disconnect()
        _connector = None
