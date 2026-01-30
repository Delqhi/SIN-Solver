import asyncio
import base64
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.services.skyvern_client import SkyvernClient


async def test_skyvern():
    client = SkyvernClient(base_url="http://localhost:8002")

    with open("demo_step1.png", "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode()

    print("Sending image to Skyvern for analysis...")
    result = await client.analyze_image(
        img_b64,
        task="Identify any CAPTCHAs or verification checkboxes like Cloudflare Turnstile or 'I am human'. Return JSON with coordinates.",
    )
    print("Skyvern Result:", result)

    await client.aclose()


if __name__ == "__main__":
    asyncio.run(test_skyvern())
