import asyncio
import logging
import os
import sys
from dotenv import load_dotenv

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.STEEL_PRECISION_CONTROLLER import SteelPrecisionController

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("RALPH-LOOP")


async def run_ralph_loop():
    load_dotenv()

    controller = SteelPrecisionController()

    targets = [
        {"name": "reCAPTCHA V2", "url": "https://www.google.com/recaptcha/api2/demo"},
        {"name": "hCaptcha", "url": "https://accounts.hcaptcha.com/demo"},
        {"name": "Text CAPTCHA", "url": "https://www.phpcaptcha.org/try-securimage/"},
    ]

    success_count = 0
    total_tests = 0

    try:
        if not await controller.initialize(use_local_browser=True):
            logger.error("Failed to initialize controller")
            return

        for i in range(10):
            logger.info(f"\n🔄 --- RALPH-LOOP ITERATION {i + 1}/10 ---")

            for target in targets:
                total_tests += 1
                logger.info(f"🎯 Testing {target['name']} at {target['url']}")

                try:
                    success = await controller.solve_any_captcha(target["url"])
                    if success:
                        logger.info(f"✅ SUCCESS: {target['name']} solved!")
                        success_count += 1
                    else:
                        logger.error(f"❌ FAILURE: {target['name']} solve failed.")
                except Exception as e:
                    logger.error(f"💥 CRASH during {target['name']}: {e}")

                await asyncio.sleep(2)

            logger.info(
                f"📊 Current Stats: {success_count}/{total_tests} ({success_count / total_tests * 100:.1f}%)"
            )

            if success_count == total_tests and total_tests >= 10:
                logger.info("🏆 1000% ERROR-FREE GOAL REACHED!")
                break

    finally:
        await controller.close()


if __name__ == "__main__":
    asyncio.run(run_ralph_loop())
