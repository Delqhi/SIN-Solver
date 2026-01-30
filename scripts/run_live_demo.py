#!/usr/bin/env python3
"""
🚀 LIVE DEMO RUNNER (CEO HEADFUL MODE)
Directly launches the Steel Controller with a visible browser.
"""

import asyncio
import logging
from app.core.STEEL_PRECISION_CONTROLLER import SteelPrecisionController
import os

# Force headful mode
os.environ["HEADLESS"] = "False"


async def run_live_demo():
    print("🚀 [CEO] STARTING LIVE HEADFUL DEMO...")
    controller = SteelPrecisionController()

    # Initialize with local browser for visibility
    success = await controller.initialize(use_local_browser=True, stealth_mode=True)

    if success:
        print("✅ [CEO] Browser Launched. Navigate to test page...")

        # Target a real CAPTCHA test page
        target_url = "https://recaptcha-demo.appspot.com/recaptcha-v2-checkbox.php"
        print(f"🎯 Targeting: {target_url}")

        # Execute solve logic
        await controller.solve_any_captcha(target_url)

        print("⏳ Waiting 10s for visual confirmation...")
        await asyncio.sleep(10)

        await controller.close()
    else:
        print("❌ [CEO] Browser launch failed.")


if __name__ == "__main__":
    asyncio.run(run_live_demo())
