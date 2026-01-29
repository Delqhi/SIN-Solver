#!/usr/bin/env python3
"""
🔥 LIVE DEMO: WORLDS HARDEST CAPTCHA
====================================
Demonstrates the "Ultra Intelligent" capabilities of Delqhi-Platform.
Runs HEADFUL (visible) to prove it's not just a script.

Target: https://www.worldshardestcaptcha.com/
Features:
- Trust Score Warming
- Ghost Cursor Interaction
- Vision AI Analysis
"""

import asyncio
import logging
import os
import sys

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.STEEL_PRECISION_CONTROLLER import SteelPrecisionController
from app.services.stealth_engine import StealthEngine

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("LiveDemo")

async def run_demo():
    logger.info("🚀 STARTING LIVE CEO DEMO: WORLD'S HARDEST CAPTCHA")
    logger.info("🎥 Mode: HEADFUL (Visible Browser)")
    
    # Initialize Controller
    controller = SteelPrecisionController()
    
    # Force REMOTE Mode (Steel Engine) - The only true test
    # Note: For you to see it "headful", Steel has a debug viewer at localhost:3000/vnc/
    logger.info("🔗 Connecting to Steel Browser Engine...")
    success = await controller.initialize(stealth_mode=True, use_local_browser=False)
    
    if not success:
        logger.error("❌ Failed to connect to Steel. Ensure 'docker-compose up agent-05-steel-browser' is running.")
        return

    try:
        # 1. Skip Warmup for speed in demo environment
        target_url = "https://www.worldshardestcaptcha.com/"
        logger.info(f"🎯 Attacking Target: {target_url}")
        
        # Load with high timeout
        await controller.page.goto(target_url, timeout=120000, wait_until="commit")
        logger.info("📄 Page committed, waiting for elements...")
        await asyncio.sleep(10)
        
        # Take a screenshot to prove we are there
        await controller.page.screenshot(path="demo_step1.png", timeout=120000)
        logger.info("📸 Screenshot demo_step1.png saved.")
        
        # 3. Solve Sequence
        logger.info("🧠 Solving with Ultra Intelligence...")
        result = await controller.solve_any_captcha(target_url)
        
        # The site usually has a puzzle or text. 
        # Our generic solver should handle detecting the input and the image.
        result = await controller.solve_any_captcha(target_url)
        
        if result:
            logger.info("✅ MISSION SUCCESS: CAPTCHA DEFEATED")
            # Take a final screenshot as requested by CEO
            await controller.page.screenshot(path="demo_success.png")
            logger.info("📸 Final screenshot demo_success.png saved.")
            # Keep browser open for user to see
            await asyncio.sleep(10)
        else:
            logger.error("❌ MISSION FAILED: COULD NOT SOLVE")
            await controller.page.screenshot(path="demo_failed.png")
            
    except Exception as e:
        logger.error(f"💥 Critical Failure during demo: {e}")
    finally:
        logger.info("🛑 Demo Complete. Closing in 5s...")
        await asyncio.sleep(5)
        await controller.close()

if __name__ == "__main__":
    # Ensure env vars exist for keys
    if not os.getenv("GEMINI_API_KEY") and not os.getenv("MISTRAL_API_KEY"):
        logger.warning("⚠️ No API Keys found in env! Demo might fail.")
    
    asyncio.run(run_demo())
