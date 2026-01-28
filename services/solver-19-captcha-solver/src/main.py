#!/usr/bin/env python3
"""
Zimmer-19 Captcha Worker - Main FastAPI Application
100% FREE self-hosted captcha solving with ddddocr + Whisper + YOLO

Architecture:
  - /ocr: Text captcha OCR using ddddocr
  - /slider: Slider captcha solving using ddddocr
  - /click: Click captcha detection using ddddocr
  - /audio: Audio captcha transcription using Whisper
  - /image-classify: Image classification using YOLO (hCaptcha)
  - /detect: Universal captcha type detection
  - /solve: Unified solver endpoint (routes to appropriate solver)

All endpoints accept base64-encoded images/audio and return JSON responses.
"""

import os
import logging
import base64
import io
import time
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import redis.asyncio as redis

from src.solvers.ocr_solver import OCRSolver
from src.solvers.slider_solver import SliderSolver
from src.solvers.audio_solver import AudioSolver
from src.solvers.click_solver import ClickSolver
from src.solvers.image_classifier import ImageClassifier

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("Zimmer19CaptchaWorker")

app = FastAPI(
    title="Zimmer-19 Captcha Worker",
    description="100% FREE self-hosted CAPTCHA solving service",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CaptchaType(str, Enum):
    OCR = "ocr"
    SLIDER = "slider"
    CLICK = "click"
    AUDIO = "audio"
    IMAGE_CLASSIFY = "image_classify"
    RECAPTCHA_V2 = "recaptcha_v2"
    HCAPTCHA = "hcaptcha"
    UNKNOWN = "unknown"


class SolveRequest(BaseModel):
    image: Optional[str] = Field(None, description="Base64-encoded image")
    audio: Optional[str] = Field(None, description="Base64-encoded audio file")
    captcha_type: Optional[CaptchaType] = Field(None, description="Override auto-detection")
    challenge_type: Optional[str] = Field(None, description="For hCaptcha: 'select cars', 'select traffic lights', etc.")
    slider_background: Optional[str] = Field(None, description="For slider: base64 background image")
    options: Optional[Dict[str, Any]] = Field(default_factory=dict)


class SolveResponse(BaseModel):
    success: bool
    captcha_type: CaptchaType
    solution: Optional[str] = None
    coordinates: Optional[List[Dict[str, int]]] = None
    slider_offset: Optional[int] = None
    confidence: float = 0.0
    duration_ms: int = 0
    solver: str = "unknown"
    error: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    version: str
    solvers: Dict[str, bool]
    uptime_seconds: float


START_TIME = datetime.utcnow()
ocr_solver: Optional[OCRSolver] = None
slider_solver: Optional[SliderSolver] = None
audio_solver: Optional[AudioSolver] = None
click_solver: Optional[ClickSolver] = None
image_classifier: Optional[ImageClassifier] = None
redis_client: Optional[redis.Redis] = None


@app.on_event("startup")
async def startup():
    global ocr_solver, slider_solver, audio_solver, click_solver, image_classifier, redis_client
    
    logger.info("🚀 Initializing Zimmer-19 Captcha Worker...")
    
    ocr_solver = OCRSolver()
    slider_solver = SliderSolver()
    audio_solver = AudioSolver()
    click_solver = ClickSolver()
    image_classifier = ImageClassifier()
    
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        redis_client = redis.from_url(redis_url)
        await redis_client.ping()
        logger.info("✅ Connected to Redis")
    except Exception as e:
        logger.warning(f"⚠️ Redis connection failed: {e} - caching disabled")
        redis_client = None
    
    logger.info("✅ All solvers initialized")


@app.on_event("shutdown")
async def shutdown():
    global redis_client
    if redis_client:
        await redis_client.close()


@app.get("/health", response_model=HealthResponse)
async def health():
    uptime = (datetime.utcnow() - START_TIME).total_seconds()
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        solvers={
            "ocr": ocr_solver is not None,
            "slider": slider_solver is not None,
            "audio": audio_solver is not None,
            "click": click_solver is not None,
            "image_classifier": image_classifier is not None
        },
        uptime_seconds=uptime
    )


@app.post("/solve", response_model=SolveResponse)
async def solve(request: SolveRequest):
    start_time = time.time()
    
    captcha_type = request.captcha_type
    if not captcha_type:
        captcha_type = await detect_captcha_type(request)
    
    try:
        if captcha_type == CaptchaType.OCR:
            result = await solve_ocr(request.image)
        elif captcha_type == CaptchaType.SLIDER:
            result = await solve_slider(request.image, request.slider_background)
        elif captcha_type == CaptchaType.AUDIO:
            result = await solve_audio(request.audio)
        elif captcha_type == CaptchaType.CLICK:
            result = await solve_click(request.image, request.challenge_type)
        elif captcha_type in (CaptchaType.HCAPTCHA, CaptchaType.IMAGE_CLASSIFY):
            result = await classify_image(request.image, request.challenge_type)
        else:
            result = {"success": False, "error": f"Unsupported captcha type: {captcha_type}"}
        
        duration_ms = int((time.time() - start_time) * 1000)
        
        return SolveResponse(
            success=result.get("success", False),
            captcha_type=captcha_type,
            solution=result.get("solution"),
            coordinates=result.get("coordinates"),
            slider_offset=result.get("slider_offset"),
            confidence=result.get("confidence", 0.0),
            duration_ms=duration_ms,
            solver=result.get("solver", "unknown"),
            error=result.get("error")
        )
    except Exception as e:
        logger.error(f"❌ Solve failed: {e}")
        return SolveResponse(
            success=False,
            captcha_type=captcha_type,
            duration_ms=int((time.time() - start_time) * 1000),
            error=str(e)
        )


@app.post("/ocr")
async def ocr_endpoint(request: SolveRequest):
    if not request.image:
        raise HTTPException(400, "Image is required")
    result = await solve_ocr(request.image)
    return result


@app.post("/slider")
async def slider_endpoint(request: SolveRequest):
    if not request.image:
        raise HTTPException(400, "Slider image is required")
    result = await solve_slider(request.image, request.slider_background)
    return result


@app.post("/audio")
async def audio_endpoint(request: SolveRequest):
    if not request.audio:
        raise HTTPException(400, "Audio is required")
    result = await solve_audio(request.audio)
    return result


@app.post("/click")
async def click_endpoint(request: SolveRequest):
    if not request.image:
        raise HTTPException(400, "Image is required")
    result = await solve_click(request.image, request.challenge_type)
    return result


@app.post("/image-classify")
async def image_classify_endpoint(request: SolveRequest):
    if not request.image:
        raise HTTPException(400, "Image is required")
    result = await classify_image(request.image, request.challenge_type)
    return result


async def detect_captcha_type(request: SolveRequest) -> CaptchaType:
    if request.audio:
        return CaptchaType.AUDIO
    if request.slider_background:
        return CaptchaType.SLIDER
    if request.challenge_type:
        return CaptchaType.IMAGE_CLASSIFY
    if request.image:
        return CaptchaType.OCR
    return CaptchaType.UNKNOWN


async def solve_ocr(image_b64: str) -> Dict[str, Any]:
    try:
        image_bytes = base64.b64decode(image_b64)
        result = ocr_solver.solve(image_bytes)
        return {
            "success": True,
            "solution": result["text"],
            "confidence": result.get("confidence", 0.9),
            "solver": "ddddocr"
        }
    except Exception as e:
        logger.error(f"OCR failed: {e}")
        return {"success": False, "error": str(e), "solver": "ddddocr"}


async def solve_slider(slider_b64: str, background_b64: Optional[str]) -> Dict[str, Any]:
    try:
        slider_bytes = base64.b64decode(slider_b64)
        background_bytes = base64.b64decode(background_b64) if background_b64 else None
        result = slider_solver.solve(slider_bytes, background_bytes)
        return {
            "success": True,
            "slider_offset": result["offset"],
            "confidence": result.get("confidence", 0.85),
            "solver": "ddddocr"
        }
    except Exception as e:
        logger.error(f"Slider solve failed: {e}")
        return {"success": False, "error": str(e), "solver": "ddddocr"}


async def solve_audio(audio_b64: str) -> Dict[str, Any]:
    try:
        audio_bytes = base64.b64decode(audio_b64)
        result = audio_solver.transcribe(audio_bytes)
        return {
            "success": True,
            "solution": result["text"],
            "confidence": result.get("confidence", 0.9),
            "solver": "whisper"
        }
    except Exception as e:
        logger.error(f"Audio transcription failed: {e}")
        return {"success": False, "error": str(e), "solver": "whisper"}


async def solve_click(image_b64: str, challenge_type: Optional[str]) -> Dict[str, Any]:
    try:
        image_bytes = base64.b64decode(image_b64)
        result = click_solver.detect_targets(image_bytes, challenge_type)
        return {
            "success": True,
            "coordinates": result["targets"],
            "confidence": result.get("confidence", 0.8),
            "solver": "ddddocr"
        }
    except Exception as e:
        logger.error(f"Click detection failed: {e}")
        return {"success": False, "error": str(e), "solver": "ddddocr"}


async def classify_image(image_b64: str, challenge_type: Optional[str]) -> Dict[str, Any]:
    try:
        image_bytes = base64.b64decode(image_b64)
        result = image_classifier.classify(image_bytes, challenge_type)
        return {
            "success": True,
            "solution": result["label"],
            "confidence": result.get("confidence", 0.8),
            "coordinates": result.get("coordinates"),
            "solver": "yolo"
        }
    except Exception as e:
        logger.error(f"Image classification failed: {e}")
        return {"success": False, "error": str(e), "solver": "yolo"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8019)
