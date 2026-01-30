#!/usr/bin/env python3
"""
🔊 AUDIO SOLVER - CEO 2026 (100% FREE)
======================================
Exploits the "Accessibility Loophole" in CAPTCHA systems.
Uses FREE ASR: Google Speech (free tier), Groq Whisper, or local Whisper.
NO PAID SERVICES - NO OpenAI
"""

import asyncio
import logging
import os
import aiohttp
import tempfile
import speech_recognition as sr
from typing import Any, Optional

logger = logging.getLogger("AudioSolver")


class AudioSolver:
    """Solves Audio CAPTCHAs using FREE ASR providers only."""

    def __init__(self, provider: str = "google_free"):
        self.provider = provider
        self.groq_key = os.getenv("GROQ_API_KEY")

    async def solve_audio_url(self, audio_url: str) -> Optional[str]:
        logger.info(f"🔊 [AudioSolver] Downloading: {audio_url}")
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(audio_url) as resp:
                    if resp.status == 200:
                        audio_data = await resp.read()
                        return await self.transcribe(audio_data)
                    else:
                        logger.error(f"❌ Failed to download audio: {resp.status}")
                        return None
        except Exception as e:
            logger.error(f"❌ Audio download error: {e}")
            return None

    async def transcribe(self, audio_bytes: bytes) -> Optional[str]:
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            if self.provider == "groq" and self.groq_key:
                return await self._transcribe_groq(tmp_path)
            else:
                return await self._transcribe_google_free(tmp_path)
        finally:
            os.unlink(tmp_path)

    async def _transcribe_groq(self, file_path: str) -> Optional[str]:
        """Use Groq Whisper API (FREE tier: 14,400 req/day)"""
        logger.info("🧠 [AudioSolver] Using Groq Whisper (FREE)...")
        import httpx

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                with open(file_path, "rb") as audio_file:
                    files = {"file": ("audio.mp3", audio_file, "audio/mpeg")}
                    headers = {"Authorization": f"Bearer {self.groq_key}"}

                    resp = await client.post(
                        "https://api.groq.com/openai/v1/audio/transcriptions",
                        headers=headers,
                        files=files,
                        data={"model": "whisper-large-v3"},
                    )

                    if resp.status_code == 200:
                        return resp.json().get("text", "").strip()
                    else:
                        logger.warning(
                            f"Groq Whisper failed ({resp.status_code}), falling back to Google"
                        )
                        return await self._transcribe_google_free(file_path)
        except Exception as e:
            logger.error(f"❌ Groq Whisper failed: {e}")
            return await self._transcribe_google_free(file_path)

    async def _transcribe_google_free(self, file_path: str) -> Optional[str]:
        """Use SpeechRecognition library (Google Web Speech API - FREE)"""
        logger.info("🧠 [AudioSolver] Using Google Speech (FREE)...")

        try:
            import pydub

            audio = pydub.AudioSegment.from_file(file_path)
            wav_path = file_path + ".wav"
            audio.export(wav_path, format="wav")

            r = sr.Recognizer()
            with sr.AudioFile(wav_path) as source:
                audio_data = r.record(source)
                text = r.recognize_google(audio_data)

            os.unlink(wav_path)
            return text
        except Exception as e:
            logger.error(f"❌ Google Speech failed: {e}")
            return None


async def try_solve_audio_challenge(page: Any) -> bool:
    """
    Attempt to switch to audio challenge and solve it.
    Uses FREE providers only (Groq Whisper or Google Speech).
    """
    try:
        audio_btn = await page.query_selector(
            '#recaptcha-audio-button, button[title*="audio"], .rc-audio-challenge-button'
        )
        if not audio_btn:
            return False

        logger.info("🖱️ [AudioSolver] Switching to Audio Mode...")
        await audio_btn.click()
        await asyncio.sleep(2)

        download_link = await page.query_selector(
            '.rc-audiochallenge-download-link, a[href*=".mp3"]'
        )
        if not download_link:
            logger.warning("⚠️ No audio download link found")
            return False

        url = await download_link.get_attribute("href")

        solver = AudioSolver(provider="groq" if os.getenv("GROQ_API_KEY") else "google_free")
        code = await solver.solve_audio_url(url)

        if code:
            logger.info(f"✅ [AudioSolver] Solution: {code}")
            input_field = await page.query_selector('#audio-response, input[name="audio-response"]')
            if input_field:
                await input_field.fill(code)
                await page.keyboard.press("Enter")
                return True

    except Exception as e:
        logger.error(f"❌ Audio solve failed: {e}")

    return False
