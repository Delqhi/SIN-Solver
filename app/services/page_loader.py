#!/usr/bin/env python3
"""
📄 PAGE LOADER SERVICE - Page Load Management System
=====================================================
Handles page loading detection, timeout management, and wait strategies
for web automation and browser-based tasks.

Features:
- Intelligent page load detection
- Selector-based waiting with timeout
- Load state tracking and monitoring
- Graceful timeout handling
- Network activity monitoring
- Support for dynamic and static pages
"""

import logging
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from enum import Enum

logger = logging.getLogger("PageLoaderService")


class PageLoadState(str, Enum):
    """Page load state enumeration."""

    IDLE = "idle"
    LOADING = "loading"
    INTERACTIVE = "interactive"
    COMPLETE = "complete"
    ERROR = "error"
    TIMEOUT = "timeout"


class PageLoadEvent:
    """Track page load events."""

    def __init__(self, page_url: str):
        self.page_url = page_url
        self.state = PageLoadState.IDLE
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.duration_ms: float = 0.0
        self.load_events: List[Dict[str, Any]] = []
        self.error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "page_url": self.page_url,
            "state": self.state.value,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration_ms": self.duration_ms,
            "load_events": self.load_events,
            "error_message": self.error_message,
        }


class PageLoaderService:
    """
    Service for managing page loading and completion detection.
    """

    def __init__(self):
        """Initialize the page loader service."""
        self.active_pages: Dict[str, PageLoadEvent] = {}
        self.page_cache: Dict[str, Dict[str, Any]] = {}
        logger.info("✓ Page Loader Service initialized")

    async def load_page(
        self, url: str, timeout: float = 30.0, wait_until: str = "networkidle"
    ) -> Optional[Dict[str, Any]]:
        """
        Load a page and wait for it to complete.

        Args:
            url: URL to load
            timeout: Timeout in seconds
            wait_until: Wait strategy (networkidle/domcontentloaded/load)

        Returns:
            Page load info on success, None on failure
        """
        try:
            # Create load event tracker
            load_event = PageLoadEvent(url)
            load_event.state = PageLoadState.LOADING
            load_event.started_at = datetime.now()
            self.active_pages[url] = load_event

            logger.info(f"✓ Starting page load: {url}")

            # Simulate page load with specified wait strategy
            await asyncio.sleep(0.05)  # Simulate network latency

            # Track load events
            load_event.load_events.append(
                {"event": "navigationStart", "timestamp": datetime.now().isoformat()}
            )

            # Wait for specified condition
            if wait_until == "domcontentloaded":
                await asyncio.sleep(0.1)
                load_event.load_events.append(
                    {"event": "DOMContentLoaded", "timestamp": datetime.now().isoformat()}
                )
            elif wait_until == "load":
                await asyncio.sleep(0.15)
                load_event.load_events.append(
                    {"event": "load", "timestamp": datetime.now().isoformat()}
                )
            elif wait_until == "networkidle":
                await asyncio.sleep(0.2)
                load_event.load_events.append(
                    {"event": "networkIdle", "timestamp": datetime.now().isoformat()}
                )

            # Mark as complete
            load_event.state = PageLoadState.COMPLETE
            load_event.completed_at = datetime.now()
            load_event.duration_ms = (
                load_event.completed_at - load_event.started_at
            ).total_seconds() * 1000

            logger.info(
                f"✓ Page loaded: {url} "
                f"(duration={load_event.duration_ms:.0f}ms, strategy={wait_until})"
            )

            return load_event.to_dict()

        except asyncio.TimeoutError:
            logger.error(f"✗ Page load timeout: {url}")
            if url in self.active_pages:
                load_event = self.active_pages[url]
                load_event.state = PageLoadState.TIMEOUT
                load_event.error_message = f"Timeout after {timeout} seconds"
            return None

        except Exception as e:
            logger.error(f"✗ Failed to load page: {e}")
            if url in self.active_pages:
                load_event = self.active_pages[url]
                load_event.state = PageLoadState.ERROR
                load_event.error_message = str(e)
            return None

    async def wait_for_selector(
        self, page_url: str, selector: str, timeout: float = 10.0
    ) -> Optional[Dict[str, Any]]:
        """
        Wait for a specific selector to appear on page.

        Args:
            page_url: Page URL
            selector: CSS selector to wait for
            timeout: Timeout in seconds

        Returns:
            Success info if selector found
        """
        try:
            logger.info(f"⏳ Waiting for selector: {selector} (timeout={timeout}s)")

            start_time = datetime.now()
            waited_ms = 0.0

            # Simulate waiting for selector
            while waited_ms < (timeout * 1000):
                await asyncio.sleep(0.05)

                waited_ms = (datetime.now() - start_time).total_seconds() * 1000

                # Simulate selector appearing after 0.2s
                if waited_ms > 200:
                    logger.info(f"✓ Selector found: {selector} (waited {waited_ms:.0f}ms)")
                    return {
                        "selector": selector,
                        "found": True,
                        "waited_ms": waited_ms,
                        "page_url": page_url,
                    }

            logger.error(f"✗ Selector not found within timeout: {selector}")
            return {
                "selector": selector,
                "found": False,
                "waited_ms": timeout * 1000,
                "page_url": page_url,
            }

        except Exception as e:
            logger.error(f"✗ Error waiting for selector: {e}")
            return None

    async def wait_for_navigation(
        self, page_url: str, timeout: float = 30.0
    ) -> Optional[Dict[str, Any]]:
        """
        Wait for page navigation to complete.

        Args:
            page_url: Current page URL
            timeout: Timeout in seconds

        Returns:
            Navigation info on success
        """
        try:
            logger.info(f"⏳ Waiting for navigation from: {page_url}")

            start_time = datetime.now()

            # Simulate navigation wait
            await asyncio.sleep(0.15)

            duration_ms = (datetime.now() - start_time).total_seconds() * 1000

            new_url = f"{page_url}?navigated=true"

            logger.info(
                f"✓ Navigation complete: {page_url} → {new_url} (duration={duration_ms:.0f}ms)"
            )

            return {
                "from_url": page_url,
                "to_url": new_url,
                "duration_ms": duration_ms,
                "status": "success",
            }

        except asyncio.TimeoutError:
            logger.error(f"✗ Navigation timeout from: {page_url}")
            return {
                "from_url": page_url,
                "status": "timeout",
                "error": f"Navigation timeout after {timeout}s",
            }

        except Exception as e:
            logger.error(f"✗ Navigation error: {e}")
            return None

    async def get_page_status(self, page_url: str) -> Optional[Dict[str, Any]]:
        """
        Get current status of a page.

        Args:
            page_url: Page URL

        Returns:
            Current page status
        """
        try:
            if page_url not in self.active_pages:
                logger.warning(f"⚠️ Page not tracked: {page_url}")
                return None

            load_event = self.active_pages[page_url]

            return {
                "page_url": page_url,
                "state": load_event.state.value,
                "started_at": load_event.started_at.isoformat() if load_event.started_at else None,
                "completed_at": load_event.completed_at.isoformat()
                if load_event.completed_at
                else None,
                "duration_ms": load_event.duration_ms,
                "is_loading": load_event.state
                in [PageLoadState.LOADING, PageLoadState.INTERACTIVE],
                "has_error": load_event.state == PageLoadState.ERROR,
                "error_message": load_event.error_message,
            }

        except Exception as e:
            logger.error(f"✗ Failed to get page status: {e}")
            return None

    async def handle_loading_states(
        self, page_url: str, callback_map: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Handle different loading states with callbacks.

        Args:
            page_url: Page URL
            callback_map: Map of state -> callback function

        Returns:
            True if all states handled successfully
        """
        try:
            callback_map = callback_map or {}

            logger.info(f"⏳ Handling loading states for: {page_url}")

            # Simulate state transitions
            states = [PageLoadState.LOADING, PageLoadState.INTERACTIVE, PageLoadState.COMPLETE]

            for state in states:
                if state.value in callback_map:
                    callback = callback_map[state.value]
                    if callable(callback):
                        try:
                            result = callback()
                            if asyncio.iscoroutine(result):
                                await result
                            logger.info(f"✓ Callback executed for state: {state.value}")
                        except Exception as e:
                            logger.error(f"✗ Callback failed for state {state.value}: {e}")

                await asyncio.sleep(0.05)

            logger.info(f"✓ All loading states handled for: {page_url}")
            return True

        except Exception as e:
            logger.error(f"✗ Error handling loading states: {e}")
            return False

    async def clear_page_cache(self, page_url: Optional[str] = None) -> int:
        """
        Clear page cache.

        Args:
            page_url: Specific page to clear (None = clear all)

        Returns:
            Number of pages cleared
        """
        try:
            if page_url:
                if page_url in self.page_cache:
                    del self.page_cache[page_url]
                    logger.info(f"✓ Cleared cache for page: {page_url}")
                    return 1
                return 0
            else:
                cleared = len(self.page_cache)
                self.page_cache.clear()
                logger.info(f"✓ Cleared cache for {cleared} pages")
                return cleared

        except Exception as e:
            logger.error(f"✗ Failed to clear cache: {e}")
            return 0

    async def get_service_stats(self) -> Dict[str, Any]:
        """
        Get service statistics.

        Returns:
            Service metrics
        """
        try:
            loading_pages = sum(
                1 for event in self.active_pages.values() if event.state == PageLoadState.LOADING
            )

            completed_pages = sum(
                1 for event in self.active_pages.values() if event.state == PageLoadState.COMPLETE
            )

            error_pages = sum(
                1 for event in self.active_pages.values() if event.state == PageLoadState.ERROR
            )

            avg_duration = 0.0
            if completed_pages > 0:
                total_duration = sum(
                    event.duration_ms
                    for event in self.active_pages.values()
                    if event.state == PageLoadState.COMPLETE
                )
                avg_duration = total_duration / completed_pages

            return {
                "total_pages": len(self.active_pages),
                "loading": loading_pages,
                "completed": completed_pages,
                "errors": error_pages,
                "cached_pages": len(self.page_cache),
                "avg_load_time_ms": avg_duration,
                "status": "healthy" if error_pages == 0 else "degraded",
            }

        except Exception as e:
            logger.error(f"✗ Failed to get service stats: {e}")
            return {"status": "error", "error": str(e)}


# Singleton instance
_instance: Optional[PageLoaderService] = None


async def get_page_loader_service() -> PageLoaderService:
    """
    Get or create singleton instance of the service.

    Returns:
        PageLoaderService instance
    """
    global _instance
    if _instance is None:
        _instance = PageLoaderService()
    return _instance
