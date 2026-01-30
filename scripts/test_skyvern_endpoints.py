import asyncio
import base64
import os
import sys
import httpx


async def test_skyvern_endpoints():
    base_url = "http://localhost:8002"

    with open("demo_step1.png", "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode()

    endpoints = ["/analyze", "/analyze-image", "/solve-captcha", "/health"]

    async with httpx.AsyncClient(timeout=10.0) as client:
        for ep in endpoints:
            print(f"Testing endpoint: {ep}")
            try:
                if ep == "/health":
                    res = await client.get(f"{base_url}{ep}")
                else:
                    res = await client.post(
                        f"{base_url}{ep}", json={"image": img_b64, "task": "test"}
                    )

                print(f"Result {ep}: {res.status_code}")
                if res.status_code == 200:
                    print(f"Data: {res.json()}")
            except Exception as e:
                print(f"Error {ep}: {e}")


if __name__ == "__main__":
    asyncio.run(test_skyvern_endpoints())
