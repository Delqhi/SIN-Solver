import asyncio
import logging
import os
import sys

sys.path.append("/Users/jeremy/dev/Delqhi-Platform")

from app.services.advanced_solver import get_advanced_solver
from app.core.config import settings

async def test_single():
    logging.basicConfig(level=logging.INFO)
    
    # Force print secrets check (masked)
    print(f"Gemini Key configured: {bool(settings.gemini_api_key)}")
    print(f"Mistral Key configured: {bool(settings.mistral_api_key)}")
    
    advanced = get_advanced_solver()
    test_image = "/Users/jeremy/dev/Delqhi-Platform/demo_step1.png"
    
    if not os.path.exists(test_image):
        print("Image missing")
        return

    with open(test_image, "rb") as f:
        image_bytes = f.read()
    
    print("Sending to AdvancedSolver...")
    offset = await advanced.solve_slider(image_bytes)
    print(f"RESULT OFFSET: {offset}")

if __name__ == "__main__":
    asyncio.run(test_single())
