#!/usr/bin/env python3
"""
🔐 CAPTCHA LOADER SERVICE
=========================
Loads test CAPTCHAs from 2captcha.com and prepares them for Vision AI processing.
Handles image extraction, caching, and metadata collection.

Dependencies:
- Steel Browser Connector (for page navigation)
- Image Processor (for image optimization)
- Vision Services (for AI processing)
"""

import logging
import asyncio
import base64
import aiohttp
import json
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from pathlib import Path

logger = logging.getLogger("CaptchaLoader")


class CaptchaLoader:
    """
    Loads and manages CAPTCHA images from 2captcha.com.

    Features:
    - Load test CAPTCHAs without solving
    - Extract image data
    - Cache management
    - Metadata tracking
    - Multiple CAPTCHA type support
    """

    # Supported CAPTCHA types on 2captcha
    SUPPORTED_TYPES = {
        "image": "Regular image CAPTCHA",
        "recaptcha": "reCAPTCHA v2/v3",
        "hcaptcha": "hCaptcha",
        "funcaptcha": "FunCaptcha",
        "geetest": "GeeTest",
        "capy": "Capy",
        "slider": "Slider CAPTCHA",
        "puzzle": "Puzzle/Jigsaw CAPTCHA",
        "click": "Click-based CAPTCHA",
        "rotate": "Rotate CAPTCHA",
        "text": "Text-based CAPTCHA",
    }

    def __init__(
        self, steel_connector=None, cache_dir: str = "/tmp/captcha_cache", cache_ttl_hours: int = 24
    ):
        """
        Initialize CAPTCHA Loader.

        Args:
            steel_connector: Steel Browser Connector instance
            cache_dir: Directory for caching CAPTCHA images
            cache_ttl_hours: Cache time-to-live in hours
        """
        self.steel_connector = steel_connector
        self.cache_dir = Path(cache_dir)
        self.cache_ttl = timedelta(hours=cache_ttl_hours)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        self.loaded_captchas: Dict[str, Dict[str, Any]] = {}
        self.captcha_queue: List[Dict[str, Any]] = []

        logger.info(f"✓ CAPTCHA Loader initialized (cache: {cache_dir})")

    def _get_cache_path(self, captcha_id: str) -> Path:
        """Get cache file path for CAPTCHA ID."""
        return self.cache_dir / f"{captcha_id}.json"

    def _is_cache_valid(self, cache_path: Path) -> bool:
        """Check if cache file is still valid."""
        if not cache_path.exists():
            return False

        mod_time = datetime.fromtimestamp(cache_path.stat().st_mtime)
        return datetime.now() - mod_time < self.cache_ttl

    async def load_test_captcha(
        self, captcha_type: str = "image", session_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Load test CAPTCHA from 2captcha.com without solving.

        Args:
            captcha_type: Type of CAPTCHA to load
            session_id: Optional Steel Browser session ID

        Returns:
            CAPTCHA data dict or None if failed
        """
        if captcha_type not in self.SUPPORTED_TYPES:
            logger.error(f"❌ Unsupported CAPTCHA type: {captcha_type}")
            logger.info(f"Supported types: {list(self.SUPPORTED_TYPES.keys())}")
            return None

        logger.info(f"📥 Loading test {captcha_type} CAPTCHA...")

        # Try to get from cache first
        cache_data = await self._get_from_cache(captcha_type)
        if cache_data:
            logger.info(f"✓ Loaded {captcha_type} from cache")
            self.loaded_captchas[cache_data["id"]] = cache_data
            return cache_data

        # If we have Steel connector, use browser to load
        if self.steel_connector and session_id:
            captcha_data = await self._load_via_browser(session_id, captcha_type)
        else:
            # Fallback: use direct API or mock data
            captcha_data = await self._load_via_api(captcha_type)

        if captcha_data:
            # Cache it
            await self._save_to_cache(captcha_data)
            self.loaded_captchas[captcha_data["id"]] = captcha_data
            logger.info(f"✓ Loaded {captcha_type} CAPTCHA: {captcha_data['id']}")
            return captcha_data

        logger.error(f"Failed to load {captcha_type} CAPTCHA")
        return None

    async def _load_via_browser(
        self, session_id: str, captcha_type: str
    ) -> Optional[Dict[str, Any]]:
        """
        Load CAPTCHA using Steel Browser.

        Args:
            session_id: Browser session ID
            captcha_type: Type of CAPTCHA

        Returns:
            CAPTCHA data or None
        """
        try:
            # Navigate to 2captcha.com
            success = await self.steel_connector.navigate_to(
                session_id, "https://2captcha.com", wait_time=5
            )

            if not success:
                logger.error("Failed to navigate to 2captcha.com")
                return None

            # Wait for page to load
            await asyncio.sleep(2)

            # Take screenshot for reference
            screenshot = await self.steel_connector.take_screenshot(session_id)

            # Extract CAPTCHA image based on type
            captcha_image = await self._extract_captcha_image(session_id, captcha_type)

            if not captcha_image:
                logger.error(f"Failed to extract {captcha_type} CAPTCHA image")
                return None

            # Get page source for metadata
            page_source = await self.steel_connector.get_page_source(session_id)

            captcha_data = {
                "id": self._generate_captcha_id(captcha_type),
                "type": captcha_type,
                "image": captcha_image,
                "screenshot": screenshot,
                "source": page_source,
                "source_url": "https://2captcha.com",
                "loaded_at": datetime.now().isoformat(),
                "status": "loaded",
                "metadata": {
                    "method": "browser",
                    "session_id": session_id,
                    "page_source_length": len(page_source) if page_source else 0,
                },
            }

            return captcha_data

        except Exception as e:
            logger.error(f"Error loading via browser: {e}")
            return None

    async def _load_via_api(self, captcha_type: str) -> Optional[Dict[str, Any]]:
        """
        Load CAPTCHA using direct API call (fallback).

        Args:
            captcha_type: Type of CAPTCHA

        Returns:
            CAPTCHA data or None
        """
        try:
            async with aiohttp.ClientSession() as session:
                url = "https://2captcha.com/api/test"
                params = {"type": captcha_type}

                async with session.get(
                    url, params=params, timeout=aiohttp.ClientTimeout(total=10)
                ) as resp:
                    if resp.status != 200:
                        logger.error(f"API error: {resp.status}")
                        return None

                    data = await resp.json()

                    # Extract image
                    image_base64 = None
                    if "image" in data:
                        # Already base64 encoded
                        image_base64 = data["image"]
                    elif "image_url" in data:
                        # Need to download
                        image_base64 = await self._download_image(data["image_url"])

                    if not image_base64:
                        logger.error("Failed to get image data")
                        return None

                    captcha_data = {
                        "id": self._generate_captcha_id(captcha_type),
                        "type": captcha_type,
                        "image": image_base64,
                        "screenshot": None,
                        "source": None,
                        "source_url": "https://2captcha.com",
                        "loaded_at": datetime.now().isoformat(),
                        "status": "loaded",
                        "metadata": {
                            "method": "api",
                            "api_response": str(data)[:200],  # First 200 chars
                        },
                    }

                    return captcha_data

        except Exception as e:
            logger.error(f"Error loading via API: {e}")
            return None

    async def _extract_captcha_image(self, session_id: str, captcha_type: str) -> Optional[str]:
        """
        Extract CAPTCHA image from page using Steel Browser.

        Args:
            session_id: Browser session ID
            captcha_type: Type of CAPTCHA

        Returns:
            Base64-encoded image or None
        """
        try:
            # CSS selectors for different CAPTCHA types
            selectors = {
                "image": "img[alt*='captcha'], img.captcha, div.captcha img",
                "recaptcha": "iframe[src*='recaptcha'], div.g-recaptcha",
                "hcaptcha": "iframe[src*='hcaptcha'], div.h-captcha",
                "funcaptcha": "iframe[src*='funcaptcha'], div.funcaptcha",
                "slider": "div.slider-captcha, div.slide-puzzle",
                "puzzle": "div.puzzle, canvas.puzzle",
                "click": "div.click-captcha, img.clickable-captcha",
                "text": "input[placeholder*='captcha'], textarea.captcha",
            }

            selector = selectors.get(captcha_type, selectors["image"])

            # Extract element
            elements = await self.steel_connector.extract_elements(
                session_id, selector, attributes=["src", "data-src", "style", "class"]
            )

            if not elements:
                logger.warning(f"No {captcha_type} elements found with selector: {selector}")
                return None

            # Get first element's image
            element = elements[0]

            # Try different attributes for image source
            image_url = element.get("src") or element.get("data-src")

            if not image_url:
                logger.error(f"No image URL in element: {element}")
                return None

            # Download and encode image
            image_base64 = await self._download_image(image_url)
            return image_base64

        except Exception as e:
            logger.error(f"Error extracting CAPTCHA image: {e}")
            return None

    async def _download_image(self, image_url: str) -> Optional[str]:
        """
        Download image and convert to base64.

        Args:
            image_url: URL of image to download

        Returns:
            Base64-encoded image or None
        """
        try:
            # Handle data URLs
            if image_url.startswith("data:"):
                return image_url.split(",")[1]

            async with aiohttp.ClientSession() as session:
                async with session.get(image_url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                    if resp.status != 200:
                        logger.error(f"Failed to download image: {resp.status}")
                        return None

                    image_data = await resp.read()
                    image_base64 = base64.b64encode(image_data).decode("utf-8")
                    return image_base64

        except Exception as e:
            logger.error(f"Error downloading image: {e}")
            return None

    def _generate_captcha_id(self, captcha_type: str) -> str:
        """Generate unique CAPTCHA ID."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"captcha_{captcha_type}_{timestamp}"

    async def _get_from_cache(self, captcha_type: str) -> Optional[Dict[str, Any]]:
        """Get cached CAPTCHA of type."""
        # Find most recent valid cache of this type
        cache_files = sorted(self.cache_dir.glob(f"captcha_{captcha_type}_*.json"), reverse=True)

        for cache_file in cache_files:
            if self._is_cache_valid(cache_file):
                try:
                    with open(cache_file, "r") as f:
                        return json.load(f)
                except Exception as e:
                    logger.warning(f"Failed to load cache file: {e}")

        return None

    async def _save_to_cache(self, captcha_data: Dict[str, Any]) -> None:
        """Save CAPTCHA data to cache."""
        try:
            cache_path = self._get_cache_path(captcha_data["id"])
            with open(cache_path, "w") as f:
                json.dump(captcha_data, f, indent=2)
            logger.debug(f"✓ Cached CAPTCHA: {captcha_data['id']}")
        except Exception as e:
            logger.warning(f"Failed to cache CAPTCHA: {e}")

    async def get_captcha(self, captcha_id: str) -> Optional[Dict[str, Any]]:
        """
        Get loaded CAPTCHA by ID.

        Args:
            captcha_id: CAPTCHA identifier

        Returns:
            CAPTCHA data or None
        """
        return self.loaded_captchas.get(captcha_id)

    async def list_loaded_captchas(self) -> List[Dict[str, str]]:
        """
        List all loaded CAPTCHAs.

        Returns:
            List of CAPTCHA metadata
        """
        return [
            {
                "id": cid,
                "type": data.get("type"),
                "loaded_at": data.get("loaded_at"),
                "status": data.get("status"),
            }
            for cid, data in self.loaded_captchas.items()
        ]

    async def clear_loaded_captchas(self) -> int:
        """
        Clear all loaded CAPTCHAs from memory.

        Returns:
            Number of CAPTCHAs cleared
        """
        count = len(self.loaded_captchas)
        self.loaded_captchas.clear()
        logger.info(f"✓ Cleared {count} loaded CAPTCHAs")
        return count

    async def cleanup_old_cache(self, days: int = 7) -> int:
        """
        Remove cache files older than specified days.

        Args:
            days: Age threshold in days

        Returns:
            Number of files deleted
        """
        try:
            cutoff = datetime.now() - timedelta(days=days)
            deleted = 0

            for cache_file in self.cache_dir.glob("*.json"):
                mod_time = datetime.fromtimestamp(cache_file.stat().st_mtime)
                if mod_time < cutoff:
                    cache_file.unlink()
                    deleted += 1

            logger.info(f"✓ Cleaned up {deleted} old cache files")
            return deleted

        except Exception as e:
            logger.error(f"Error cleaning cache: {e}")
            return 0

    def get_supported_types(self) -> Dict[str, str]:
        """Get list of supported CAPTCHA types."""
        return self.SUPPORTED_TYPES.copy()


# Singleton instance
_loader: Optional[CaptchaLoader] = None


async def get_captcha_loader(steel_connector=None) -> CaptchaLoader:
    """
    Get or create singleton CAPTCHA Loader instance.

    Args:
        steel_connector: Steel Browser Connector (optional)

    Returns:
        CaptchaLoader instance
    """
    global _loader
    if _loader is None:
        _loader = CaptchaLoader(steel_connector=steel_connector)
    return _loader
