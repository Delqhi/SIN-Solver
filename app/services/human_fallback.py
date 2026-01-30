#!/usr/bin/env python3
"""
🤖 AI FALLBACK SYSTEM - CEO 2026 (100% FREE)
=============================================
Multi-provider AI fallback for CAPTCHA solving.
Races FREE AI providers in parallel: Gemini, Mistral, Groq.
NO PAID SERVICES - NO 2captcha, NO AntiCaptcha.
"""

import asyncio
import logging
import os
import httpx
import base64
from typing import Optional

logger = logging.getLogger("AIFallback")


class AIFallback:
    """
    Races multiple FREE AI vision providers in parallel.
    First provider to solve wins - all others are cancelled.
    """

    def __init__(self):
        self.keys = {
            "gemini": os.getenv("GEMINI_API_KEY"),
            "mistral": os.getenv("MISTRAL_API_KEY"),
            "groq": os.getenv("GROQ_API_KEY"),
        }

    async def solve_with_ai(self, image_b64: str, task_type: str = "captcha") -> Optional[str]:
        logger.info("🤖 [AIFallback] Racing FREE AI providers...")

        tasks = []
        if self.keys["gemini"]:
            tasks.append(asyncio.create_task(self._solve_gemini(image_b64)))
        if self.keys["mistral"]:
            tasks.append(asyncio.create_task(self._solve_mistral(image_b64)))
        if self.keys["groq"]:
            tasks.append(asyncio.create_task(self._solve_groq(image_b64)))

        if not tasks:
            logger.error("❌ [AIFallback] No FREE API keys configured!")
            return None

        done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)

        for t in pending:
            t.cancel()

        for t in done:
            try:
                result = t.result()
                if result:
                    logger.info("🏆 [AIFallback] Winner found!")
                    return result
            except Exception as e:
                logger.error(f"AI solver error: {e}")

        return None

    async def _solve_gemini(self, image_b64: str) -> Optional[str]:
        logger.info("  🔵 [Gemini] Solving...")
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={self.keys['gemini']}",
                    json={
                        "contents": [
                            {
                                "parts": [
                                    {
                                        "text": "This is a CAPTCHA image. Return ONLY the solution text, nothing else."
                                    },
                                    {"inline_data": {"mime_type": "image/png", "data": image_b64}},
                                ]
                            }
                        ],
                        "generationConfig": {"temperature": 0.0, "maxOutputTokens": 50},
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    text = (
                        data.get("candidates", [{}])[0]
                        .get("content", {})
                        .get("parts", [{}])[0]
                        .get("text", "")
                    )
                    return text.strip() if text else None
        except Exception as e:
            logger.error(f"  ❌ Gemini error: {e}")
        return None

    async def _solve_mistral(self, image_b64: str) -> Optional[str]:
        logger.info("  🟠 [Mistral] Solving...")
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    "https://api.mistral.ai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.keys['mistral']}"},
                    json={
                        "model": "pixtral-12b-2409",
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": "This is a CAPTCHA. Return ONLY the solution.",
                                    },
                                    {
                                        "type": "image_url",
                                        "image_url": {"url": f"data:image/png;base64,{image_b64}"},
                                    },
                                ],
                            }
                        ],
                        "max_tokens": 50,
                        "temperature": 0.0,
                    },
                )
                if resp.status_code == 200:
                    return resp.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.error(f"  ❌ Mistral error: {e}")
        return None

    async def _solve_groq(self, image_b64: str) -> Optional[str]:
        logger.info("  🟢 [Groq] Solving...")
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.keys['groq']}"},
                    json={
                        "model": "llama-3.2-11b-vision-preview",
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": "This is a CAPTCHA. Return ONLY the solution.",
                                    },
                                    {
                                        "type": "image_url",
                                        "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"},
                                    },
                                ],
                            }
                        ],
                        "max_tokens": 50,
                        "temperature": 0.0,
                    },
                )
                if resp.status_code == 200:
                    return resp.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.error(f"  ❌ Groq error: {e}")
        return None


HumanFallback = AIFallback
