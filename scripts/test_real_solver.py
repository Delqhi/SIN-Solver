#!/usr/bin/env python3
import asyncio
import logging
import os
import sys

# Ensure app module is found
sys.path.append(os.getcwd())

from app.core.STEEL_PRECISION_CONTROLLER import SteelPrecisionController

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("RealWorldTest")

async def test_real_target():
    logger.info("🚀 Starting Real-World Verification Loop (Ralph Loop)")
    
    target_url = "https://recaptcha-demo.appspot.com/recaptcha-v2-checkbox.php"
    
    controller = SteelPrecisionController()
    
    # Force local browser for this test to avoid Docker networking issues in shell
    # and to ensure we are using a "real" browser instance we can control.
    initialized = await controller.initialize(stealth_mode=True, use_local_browser=True)
    
    if not initialized:
        logger.error("❌ Failed to initialize SteelPrecisionController")
        return False
        
    try:
        logger.info(f"🎯 Attacking Target: {target_url}")
        
        # Enhanced waiting and debug info
        await controller.page.goto(target_url, wait_until="networkidle", timeout=60000)
        logger.info(f"📄 Page Title: {await controller.page.title()}")
        
        # Save detection screenshot for forensic analysis
        await asyncio.sleep(10) # Heavy wait for complex rendering
        await controller.page.screenshot(path="forensic_detection.png")
        logger.info("📸 Forensic screenshot saved to forensic_detection.png")
        
        success = await controller.solve_any_captcha(target_url)
        
        if success:
            logger.info("✅ SUCCESS: CAPTCHA Solved!")
            return True
        else:
            logger.error("❌ FAILURE: CAPTCHA Not Solved.")
            return False
            
    except Exception as e:
        logger.error(f"❌ EXCEPTION: {e}")
        return False
    finally:
        await controller.close()

if __name__ == "__main__":
    loop_count = 0
    max_loops = 1 # Start with 1 run to assess state
    
    while loop_count < max_loops:
        loop_count += 1
        logger.info(f"🔄 Loop Iteration {loop_count}")
        result = asyncio.run(test_real_target())
        if result:
            sys.exit(0)
        else:
            logger.error("⚠️ Loop failed. Retrying...")
            sys.exit(1) # Fail for now to allow analysis
