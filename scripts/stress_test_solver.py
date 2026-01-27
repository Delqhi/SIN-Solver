import asyncio
from playwright.async_api import async_playwright
import logging
import base64
from app.services.solver_router import get_solver_router
from app.services.captcha_detector import get_captcha_detector

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("StressTest")

async def run_stress_test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        # Target: reCAPTCHA Demo site (or similar difficult target)
        logger.info("🌐 Navigating to reCAPTCHA Demo...")
        await page.goto("https://www.google.com/recaptcha/api2/demo")

        # 1. Detect and Extract Instruction
        detector = await get_captcha_detector()
        instruction = await detector.extract_instruction(page)
        logger.info(f"📋 Detected Instruction: {instruction}")

        # 2. Get CAPTCHA Image (Simplified for demo: taking screenshot of the iframe area)
        captcha_element = await page.wait_for_selector("iframe[title*='reCAPTCHA']")
        screenshot = await captcha_element.screenshot()
        image_b64 = base64.b64encode(screenshot).decode()

        # 3. Solve with Weighted Consensus
        router = await get_solver_router()
        logger.info("🧠 Engaging Elite Weighted Consensus...")
        solution = await router.solve_image(image_b64, instruction=instruction)

        logger.info(f"✅ SOLUTION: {solution.solution}")
        logger.info(f"📊 CONFIDENCE: {solution.confidence}")
        logger.info(f"🕒 TIME: {solution.time_ms}ms")
        logger.info(f"🤖 SOLVER: {solution.solver_used}")

        if solution.confidence > 0.9:
            logger.info("🚀 TEST PASSED: High confidence solution reached via consensus.")
        else:
            logger.warning("⚠️ TEST WEAK: Low confidence or failure.")

        await asyncio.sleep(5)
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run_stress_test())
