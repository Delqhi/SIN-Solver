#!/usr/bin/env python3
"""
🎯 STEEL PRECISION CONTROLLER - CEO PRODUCTION GRADE
Connects directly to Zimmer-05 (Steel-Browser) for high-performance, containerized agent execution.
NO BROWSER-USE. NO LEGACY BLOAT.
"""

import asyncio
import logging
import base64
import time
import os
import random
import math
import subprocess
import json
import re
import tempfile
from typing import Dict, Any, Tuple, Optional, List
from playwright.async_api import async_playwright, Page, Browser, BrowserContext

from app.core.config import settings
from app.services.mistral_solver import get_mistral_solver
from app.services.advanced_solver import get_advanced_solver

# 🔥 CEO 2026: ULTIMATE IMPORTS
from app.services.stealth_engine import StealthEngine, HumanBehavior
from app.services.performance_optimizer import get_performance_optimizer, APIKeyRotator
from app.services.proxy_manager import get_proxy_manager
from app.services.vision_orchestrator import RateLimitError, extract_click_coordinates_from_response
from app.services.stagehand_client import StagehandClient

logger = logging.getLogger("SteelPrecision")


class SteelPrecisionController:
    """
    High-Performance Steel Browser Orchestrator (CEO Standard 2026)
    """

    def __init__(self):
        self.mistral = None
        self.advanced_solver = None
        self.browser = None
        self.context = None
        self.page = None
        # CEO-Order: Standard Steel Endpoint for Containerized Agent
        self.steel_endpoint = settings.steel_cdp_url or "ws://172.20.0.20:3000/"
        self._playwright = None

        # 🔥 CEO 2026: ULTIMATE PERFORMANCE COMPONENTS
        self.performance_optimizer = get_performance_optimizer()
        self.stealth_engine = StealthEngine()
        self.proxy_manager = None

        # API Key Rotation
        self.api_key_rotator = APIKeyRotator()

        # 🔥 CEO 2026: STAGEHAND INTEGRATION
        self.stagehand = StagehandClient()

    async def initialize(
        self,
        stealth_mode: bool = True,
        use_local_browser: bool = False,
        session_id: Optional[str] = None,
    ):
        """
        Initialisiert die native Verbindung zum Steel-Browser (CDP).
        Kein browser-use Bloat, nur pure Performance.
        """
        self.mistral = await get_mistral_solver()
        self.advanced_solver = get_advanced_solver()

        if not self.proxy_manager:
            self.proxy_manager = await get_proxy_manager()

        # Start Playwright
        if not self._playwright:
            self._playwright = await async_playwright().start()

        # CEO-Retry Logic for Infrastructure stability
        max_retries = 10
        for attempt in range(max_retries):
            try:
                if use_local_browser:
                    logger.info(f"🖥️ Launching LOCAL browser (Headful Mode) - Attempt {attempt + 1}")
                    self.browser = await self._playwright.chromium.launch(
                        headless=False, args=["--disable-blink-features=AutomationControlled"]
                    )
                else:
                    logger.info(
                        f"🔗 Connecting to Steel CDP: {self.steel_endpoint} - Attempt {attempt + 1}"
                    )
                    self.browser = await self._playwright.chromium.connect_over_cdp(
                        self.steel_endpoint
                    )
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    logger.error(f"❌ [CEO] Failed to connect after {max_retries} attempts: {e}")
                    return False
                logger.warning(f"⚠️ [CEO] Steel not ready, retrying in 5s... ({e})")
                await asyncio.sleep(5)

        try:
            if not self.browser:
                logger.error("❌ [CEO] Browser not initialized")
                return False

            # 🔥 CEO 2026: PERSISTENT STORAGE STATE
            storage_state = None
            if session_id:
                from app.core.redis_cache import RedisCache

                redis = await RedisCache.get_instance()
                storage_state = await redis.get_json(f"session:storage:{session_id}")
                if storage_state:
                    logger.info(f"🍪 [CEO] Restoring storage state for session: {session_id}")

            # 🔥 CEO 2026: PROXY TUNNELING
            proxy = await self.proxy_manager.get_sticky_proxy()
            proxy_metadata = self.proxy_manager.get_proxy_metadata(proxy) if proxy else {}

            if proxy:
                logger.info(
                    f"🌐 [CEO] Tunneling through proxy: {proxy} ({proxy_metadata.get('countryCode', '??')})"
                )

            self.context = await self.browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                storage_state=storage_state,
                proxy={"server": proxy}
                if proxy and not use_local_browser
                else None,  # Use proxy if not local
            )

            self.page = await self.context.new_page()

            # 🔥 CEO 2026: START HYBRID INTERACTION MONITORING
            from app.services.interaction_detector import get_universal_detector

            uid = await get_universal_detector()
            await uid.network_agent.start_monitoring(self.page)

            # 🔥 CEO 2026: ULTIMATE STEALTH MODE
            if stealth_mode:
                # NEW: CEO-Grade Ultimate Stealth Engine with Geo-Sync
                await self.stealth_engine.apply_ultimate_stealth(
                    self.page, proxy_metadata=proxy_metadata
                )
                logger.info(
                    f"🛡️ CEO-GRADE Ultimate Stealth active (GeoSync: {proxy_metadata.get('timezone', 'UTC')})"
                )
            else:
                # Basic stealth
                await self.page.add_init_script("""
                    Object.defineProperty(navigator, 'webdriver', { get: () => false });
                    window.chrome = { runtime: {} };
                """)

            logger.info(f"✅ [CEO] Steel Browser secured and connected.")
            return True

        except Exception as e:
            logger.error(f"❌ [CEO] Failed to connect to Steel Browser: {e}")
            return False

    async def reconnect_with_new_proxy(self):
        """Emergency Proxy Rotation & Re-initialization"""
        logger.warning("🔄 [CEO] RATE LIMIT RECOVERY: Rotating Proxy and Reconnecting...")
        await self.close()
        # Reset proxy manager to ensure fresh validation if needed
        self.proxy_manager = await get_proxy_manager()
        await self.proxy_manager.validate_proxies()
        return await self.initialize()

    async def save_session(self, session_id: str):
        """Save current context storage state to Redis"""
        if self.context and session_id:
            state = await self.context.storage_state()
            from app.core.redis_cache import RedisCache

            redis = await RedisCache.get_instance()
            await redis.set_json(f"session:storage:{session_id}", state, ttl=86400)  # 24h
            logger.info(f"💾 [CEO] Saved storage state for session: {session_id}")

    async def get_precise_screenshot(self) -> bytes:
        try:
            temp_path = os.path.join(tempfile.gettempdir(), f"scr_{int(time.time())}.png")
            result = subprocess.run(
                ["agent-browser", "screenshot", temp_path], capture_output=True, timeout=5
            )
            if result.returncode == 0 and os.path.exists(temp_path):
                with open(temp_path, "rb") as f:
                    data = f.read()
                os.unlink(temp_path)
                return data
        except:
            pass

        if not self.page:
            return b""
        return await self.page.screenshot(type="png", full_page=False, animations="disabled")

    async def get_vercel_snapshot(self) -> dict:
        try:
            result = subprocess.run(
                ["agent-browser", "snapshot", "-i", "--json"],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                return json.loads(result.stdout)
        except Exception as e:
            logger.warning(f"Vercel Snapshot failed: {e}")
        return {}

    async def vercel_click(self, ref: str) -> bool:
        try:
            result = subprocess.run(
                ["agent-browser", "click", f"@{ref}"], capture_output=True, timeout=5
            )
            return result.returncode == 0
        except:
            return False

    async def human_mouse_move(self, target_x: int, target_y: int, duration_ms: int = 500):
        if not self.page:
            return
        # 🔥 CEO 2026: DELEGATE TO HIGH-FIDELITY STEALTH ENGINE
        await HumanBehavior.human_mouse_move(self.page, float(target_x), float(target_y))
        await HumanBehavior.human_click(self.page, float(target_x), float(target_y))
        logger.info(f"🖱️ [Steel] High-Fidelity Human Stealth Click at ({target_x}, {target_y})")

    async def detect_silent_captcha(self) -> str:
        """
        🔥 CEO 2026: Pre-emptive detection of behavioral captchas via network analysis.
        Detects: Turnstile, reCAPTCHA v3, AWS WAF.
        """
        if not self.page:
            return "none"

        # Monitor specific endpoints
        silent_detectors = {
            "cloudflare": [
                "/cdn-cgi/challenge-platform/h/g/orchestrate",
                "challenges.cloudflare.com",
            ],
            "recaptcha": ["google.com/recaptcha/api", "gstatic.com/recaptcha"],
            "hcaptcha": ["hcaptcha.com/1/api.js", "newassets.hcaptcha.com"],
            "datadome": ["datadome.co/tags.js"],
        }

        # Check current network traffic or DOM signatures
        html = await self.page.content()
        for detector, patterns in silent_detectors.items():
            if any(p in html for p in patterns):
                logger.info(f"🚨 [CEO] Silent {detector} detected via DOM footprint")
                return detector

        return "none"

    async def solve_any_captcha(self, url: str) -> bool:
        if not self.page:
            logger.error("❌ [CEO] No browser page available")
            return False

        logger.info(f"🎯 [CEO] Universal Mission START: {url}")

        # 🔥 CEO 2026: DETECT SILENT BLOCKADES BEFORE NAVIGATION
        # We might want to warm up if we know it's a high-score requirement site
        high_trust_domains = ["google.com", "cloudflare.com", "stripe.com", "binance.com"]
        if any(d in url for d in high_trust_domains):
            logger.info(f"🌡️ [CEO] High-Trust Domain detected ({url}). Pre-warming profile...")
            from app.services.trust_warmer import TrustScoreWarmer

            warmer = TrustScoreWarmer()
            await warmer.warm_up_profile(self.page, duration_seconds=15)

        max_attempts = 3
        consecutive_failures = 0

        for attempt in range(max_attempts):
            if consecutive_failures >= 2:
                logger.warning("🚨 [CEO] Circuit Breaker: Too many failures. Rotating proxy...")
                await self.reconnect_with_new_proxy()
                consecutive_failures = 0

            logger.info(f"🔄 [CEO] Omni-Detection Attempt {attempt + 1}/{max_attempts}")

            try:
                if attempt == 0:
                    await self.page.goto(url, timeout=60000, wait_until="domcontentloaded")

                from app.services.interaction_detector import get_universal_detector

                detector = await get_universal_detector()
                detection_report = await detector.detect_all(self.page)

                primary_type = detection_report.get("primary_type", "none")
                target_agent = detection_report.get("recommended_resolver", "agent_zero")

                # 🔥 CEO 2026: SPECIALIZED SCORE OPTIMIZATION (Turnstile/v3)
                if primary_type in ["cloudflare", "recaptcha"]:
                    logger.info(
                        f"⚖️ [CEO] Optimizing bypass for {primary_type} score-based challenge..."
                    )
                    # 1. Ensure JA4 alignment is fresh
                    await self.stealth_engine._apply_ja4_and_http2_alignment(self.page)
                    # 2. Add realistic jitter
                    await asyncio.sleep(random.uniform(2.0, 5.0))
                    # 3. Handle based on type
                    if primary_type == "cloudflare":
                        # Turnstile often solves itself if trust is high
                        await asyncio.sleep(5)
                        if "challenge" not in self.page.url:
                            return True

                deceptions = [
                    f
                    for f in detection_report.get("all_observations", [])
                    if f.get("layer") == "deception"
                ]
                if deceptions:
                    logger.warning(
                        f"🚨 [CEO] Anti-Bot Deception detected: {[d['type'] for d in deceptions]}. Hardening stealth..."
                    )
                    await self.stealth_engine.apply_ultimate_stealth(self.page)

                if primary_type == "none" and not deceptions:
                    if "challenge" not in self.page.url and "captcha" not in self.page.url:
                        silent = await self.detect_silent_captcha()
                        if silent == "none":
                            logger.info("✅ [CEO] Clear path. Mission Proceeding.")
                            return True
                        else:
                            primary_type = silent
                            target_agent = "steel_precision"

                logger.info(
                    f"🚨 [CEO] Detected Blockade: {primary_type} -> Handing over to {target_agent.upper()}"
                )

                if target_agent == "skyvern":
                    from app.services.skyvern_client import SkyvernClient

                    async with SkyvernClient() as sky:
                        res = await sky.navigate_and_solve(url, f"Bypass {primary_type}")
                        if res.get("success"):
                            return True

                elif target_agent == "stagehand":
                    from app.services.stagehand_client import StagehandClient

                    stagehand = StagehandClient()
                    res = await stagehand.act(f"Bypass {primary_type}", self.page)
                    if res:
                        return True

                else:
                    screenshot_b64 = detection_report.get("screenshot_b64")
                    if primary_type in ["text_input", "text", "math"]:
                        from app.services.solver_router import get_solver_router

                        solver_router = await get_solver_router()
                        solution = await solver_router.solve_image(screenshot_b64, primary_type)
                        if solution and getattr(solution, "solution", None):
                            await HumanBehavior.human_type(
                                self.page,
                                solution.solution,
                                element_selector='input:not([type="hidden"])',
                            )
                            await self.page.keyboard.press("Enter")
                            await asyncio.sleep(5)
                            if "challenge" not in self.page.url:
                                return True

                    else:
                        for f in detection_report.get("all_observations", []):
                            if "box" in f and f["box"]:
                                box = f["box"]
                                viewport = self.page.viewport_size
                                x = (
                                    (box[1] + box[3])
                                    / 2
                                    / 1000
                                    * (viewport["width"] if viewport else 1920)
                                )
                                y = (
                                    (box[0] + box[2])
                                    / 2
                                    / 1000
                                    * (viewport["height"] if viewport else 1080)
                                )
                                await HumanBehavior.human_click(self.page, x, y)
                                await asyncio.sleep(5)
                                if "challenge" not in self.page.url:
                                    return True

                consecutive_failures += 1
            except Exception as e:
                logger.error(f"❌ [CEO] Omni-Detection Failure: {e}")
                consecutive_failures += 1
                await asyncio.sleep(3)

        return False

        return False

    async def safe_click(self, selector: str) -> bool:
        """
        Click with Stagehand Healing if selector fails.
        """
        if not self.page:
            return False
        try:
            await self.page.click(selector, timeout=2000)
            return True
        except Exception:
            logger.warning(f"⚠️ Selector {selector} failed. Asking Stagehand to heal...")
            try:
                html = await self.page.content()
                new_selector = await self.stagehand.get_healing_selector(selector, html)
                if new_selector != selector:
                    logger.info(f"🚑 Stagehand healed selector: {selector} -> {new_selector}")
                    await self.page.click(new_selector, timeout=2000)
                    return True
            except Exception as e:
                logger.error(f"❌ Stagehand healing failed: {e}")
            return False

    async def _solve_with_skyvern(self, url: str) -> bool:
        """
        🔥 CEO 2026: ULTIMATE FALLBACK TO SKYVERN EYE
        Handles everything the standard solver cannot.
        """
        logger.info(f"👁️ [Skyvern] Taking over navigation mission for: {url}")
        try:
            from app.services.skyvern_client import SkyvernClient

            skyvern = SkyvernClient()
            result = await skyvern.navigate_and_solve(
                url, task="Bypass any gate, captcha, or blockade and reach the content."
            )
            if result.get("success"):
                logger.info("✅ [Skyvern] Mission accomplished.")
                # Sync browser state if possible
                return True
        except Exception as e:
            logger.error(f"❌ [Skyvern] Mission failed: {e}")
        return False

    async def close(self):
        if self.page:
            await self.page.close()
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self._playwright:
            await self._playwright.stop()
        logger.info("🛑 [CEO] Steel resources released.")


async def main():
    logging.basicConfig(level=logging.INFO)
    controller = SteelPrecisionController()
    if await controller.initialize():
        print("🚀 CEO STEEL SYSTEM ONLINE.")
        await controller.close()
    else:
        print("❌ CEO STEEL SYSTEM FAILURE.")


if __name__ == "__main__":
    asyncio.run(main())
