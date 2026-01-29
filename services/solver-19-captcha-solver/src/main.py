#!/usr/bin/env python3
"""
Zimmer-19 Captcha Worker - Main FastAPI Application
100% FREE self-hosted captcha solving with ddddocr + Whisper + YOLO
"""

import os
import logging
import base64
import time
import typing
from typing import Any, cast, Awaitable
from datetime import datetime, timezone
from enum import Enum
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import redis.asyncio as redis

from .solvers.ocr_solver import OCRSolver
from .solvers.slider_solver import SliderSolver
from .solvers.audio_solver import AudioSolver
from .solvers.click_solver import ClickSolver
from .solvers.image_classifier import ImageClassifier
from .solvers.proof_of_work_solver import ProofOfWorkSolver, AltchaDetector, PoWChallenge
from .solvers.browser_automation_solver import BrowserAutomationSolver, ElementDetector

# Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("Zimmer19CaptchaWorker")

# Models
class CaptchaType(str, Enum):
    OCR = "ocr"
    SLIDER = "slider"
    CLICK = "click"
    AUDIO = "audio"
    IMAGE_CLASSIFY = "image_classify"
    PROOF_OF_WORK = "proof_of_work"
    RECAPTCHA_V2 = "recaptcha_v2"
    HCAPTCHA = "hcaptcha"
    UNKNOWN = "unknown"

class SolveRequest(BaseModel):
    image: str | None = Field(None, description="Base64-encoded image")
    audio: str | None = Field(None, description="Base64-encoded audio file")
    captcha_type: CaptchaType | None = Field(None, description="Override auto-detection")
    challenge_type: str | None = Field(None, description="For hCaptcha challenge type")
    slider_background: str | None = Field(None, description="For slider background")
    pow_challenge: dict[str, Any] | None = Field(None, description="For proof-of-work")
    options: dict[str, Any] | None = Field(default_factory=dict)

class PoWSolveRequest(BaseModel):
    algorithm: str = Field(default="SHA-256")
    challenge: str = Field(...)
    salt: str = Field(...)
    signature: str = Field(...)
    difficulty: int = Field(default=5000)
    maxnumber: int = Field(default=1000000)
    timeout: float = Field(default=30.0)

class PoWSolveResponse(BaseModel):
    success: bool
    number: int
    took: int
    time_ms: float
    verified: bool
    algorithm: str
    challenge: str
    error: str | None = None

class SolveResponse(BaseModel):
    success: bool
    captcha_type: CaptchaType
    solution: str | None = None
    coordinates: list[dict[str, int]] | None = None
    slider_offset: int | None = None
    confidence: float = 0.0
    duration_ms: int = 0
    solver: str = "unknown"
    error: str | None = None

class HealthResponse(BaseModel):
    status: str
    version: str
    solvers: dict[str, bool]
    uptime_seconds: float

class BrowserSolveRequest(BaseModel):
    url: str = Field(...)
    captcha_type: str = Field(default="recaptcha")
    timeout: float = Field(default=60.0)
    use_vision: bool = Field(default=False)

class BrowserSolveResponse(BaseModel):
    success: bool
    solution: str | None = None
    time_ms: float
    actions_taken: int = 0
    solver: str = "browser_automation"
    error: str | None = None

class ElementDetectRequest(BaseModel):
    screenshot: str = Field(...)
    element_types: list[str] | None = Field(None)

class ElementDetectResponse(BaseModel):
    elements: list[dict[str, Any]]
    count: int
    captcha_elements: list[dict[str, Any]]

# Global State
START_TIME = datetime.now(timezone.utc)
ocr_solver: OCRSolver | None = None
slider_solver: SliderSolver | None = None
audio_solver: AudioSolver | None = None
click_solver: ClickSolver | None = None
image_classifier: ImageClassifier | None = None
pow_solver: ProofOfWorkSolver | None = None
altcha_detector: AltchaDetector | None = None
browser_automation_solver: BrowserAutomationSolver | None = None
redis_client: redis.Redis | None = None

# Lifespan Handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    global ocr_solver, slider_solver, audio_solver, click_solver, image_classifier, pow_solver, altcha_detector, browser_automation_solver, redis_client

    logger.info("🚀 Initializing Zimmer-19 Captcha Worker v2.0.0...")

    ocr_solver = OCRSolver()
    slider_solver = SliderSolver()
    audio_solver = AudioSolver()
    click_solver = ClickSolver()
    image_classifier = ImageClassifier()
    pow_solver = ProofOfWorkSolver(max_workers=4)
    altcha_detector = AltchaDetector()
    browser_automation_solver = BrowserAutomationSolver(
        steel_browser_url=os.getenv("STEEL_BROWSER_URL", "http://agent-05-steel-browser:3005")
    )

    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
    try:
        redis_client = redis.from_url(redis_url)
        ping_val = redis_client.ping()
        if hasattr(ping_val, '__await__'):
            ping_result = await typing.cast(typing.Any, ping_val)
        else:
            ping_result = typing.cast(bool, ping_val)
            
        if ping_result:
            logger.info("✅ Connected to Redis")
        else:
            redis_client = None
    except Exception as e:
        logger.warning(f"⚠️ Redis failed: {e}")
        redis_client = None

    yield
    
    if redis_client:
        await redis_client.close()

# App Initialization
app = FastAPI(
    title="Zimmer-19 Captcha Worker",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper Functions
async def detect_captcha_type(request: SolveRequest) -> CaptchaType:
    if request.audio: return CaptchaType.AUDIO
    if request.slider_background: return CaptchaType.SLIDER
    if request.challenge_type: return CaptchaType.IMAGE_CLASSIFY
    if request.image: return CaptchaType.OCR
    return CaptchaType.UNKNOWN

async def solve_ocr(image_b64: str) -> dict[str, Any]:
    solver = ocr_solver
    if solver is None: return {"success": False, "error": "OCR solver offline"}
    try:
        result = solver.solve(base64.b64decode(image_b64))
        return {"success": True, "solution": result["text"], "solver": "ddddocr"}
    except Exception as e: return {"success": False, "error": str(e)}

async def solve_slider(slider_b64: str, background_b64: str | None) -> dict[str, Any]:
    solver = slider_solver
    if solver is None: return {"success": False, "error": "Slider solver offline"}
    try:
        bg = base64.b64decode(background_b64) if background_b64 else None
        result = solver.solve(base64.b64decode(slider_b64), bg)
        return {"success": True, "slider_offset": result["offset"], "solver": "ddddocr"}
    except Exception as e: return {"success": False, "error": str(e)}

async def solve_audio(audio_b64: str) -> dict[str, Any]:
    solver = audio_solver
    if solver is None: return {"success": False, "error": "Audio solver offline"}
    try:
        result = solver.transcribe(base64.b64decode(audio_b64))
        return {"success": True, "solution": result["text"], "solver": "whisper"}
    except Exception as e: return {"success": False, "error": str(e)}

async def solve_click(image_b64: str, challenge_type: str | None) -> dict[str, Any]:
    solver = click_solver
    if solver is None: return {"success": False, "error": "Click solver offline"}
    try:
        result = solver.detect_targets(base64.b64decode(image_b64), challenge_type)
        return {"success": True, "coordinates": result["targets"], "solver": "ddddocr"}
    except Exception as e: return {"success": False, "error": str(e)}

async def classify_image(image_b64: str, challenge_type: str | None) -> dict[str, Any]:
    solver = image_classifier
    if solver is None: return {"success": False, "error": "Classifier offline"}
    try:
        result = solver.classify(base64.b64decode(image_b64), challenge_type)
        return {"success": True, "solution": result["label"], "coordinates": result.get("coordinates"), "solver": "yolo"}
    except Exception as e: return {"success": False, "error": str(e)}

# Endpoints
@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="healthy",
        version="2.0.0",
        solvers={
            "ocr": ocr_solver is not None,
            "slider": slider_solver is not None,
            "audio": audio_solver is not None,
            "click": click_solver is not None,
            "image_classifier": image_classifier is not None,
            "proof_of_work": pow_solver is not None,
            "browser_automation": browser_automation_solver is not None
        },
        uptime_seconds=(datetime.now(timezone.utc) - START_TIME).total_seconds()
    )

@app.post("/solve", response_model=SolveResponse)
async def solve(request: SolveRequest):
    start_time = time.time()
    captcha_type = request.captcha_type or await detect_captcha_type(request)
    
    try:
        if captcha_type == CaptchaType.OCR:
            if not request.image: raise ValueError("Image required")
            result = await solve_ocr(request.image)
        elif captcha_type == CaptchaType.SLIDER:
            if not request.image: raise ValueError("Image required")
            result = await solve_slider(request.image, request.slider_background)
        elif captcha_type == CaptchaType.AUDIO:
            if not request.audio: raise ValueError("Audio required")
            result = await solve_audio(request.audio)
        elif captcha_type == CaptchaType.CLICK:
            if not request.image: raise ValueError("Image required")
            result = await solve_click(request.image, request.challenge_type)
        elif captcha_type in (CaptchaType.HCAPTCHA, CaptchaType.IMAGE_CLASSIFY):
            if not request.image: raise ValueError("Image required")
            result = await classify_image(request.image, request.challenge_type)
        elif captcha_type == CaptchaType.PROOF_OF_WORK:
            if not request.pow_challenge: raise ValueError("PoW challenge required")
            solver = pow_solver
            if solver is None: raise ValueError("PoW solver offline")
            pow_result = await solver.solve(PoWChallenge.from_dict(request.pow_challenge))
            result = {"success": True, "solution": str(pow_result["number"]), "confidence": 1.0 if pow_result["verified"] else 0.0, "solver": "proof_of_work"}
        else:
            result = {"success": False, "error": f"Unsupported: {captcha_type}"}

        return SolveResponse(
            success=result.get("success", False),
            captcha_type=captcha_type,
            solution=result.get("solution"),
            coordinates=result.get("coordinates"),
            slider_offset=result.get("slider_offset"),
            confidence=result.get("confidence", 0.0),
            duration_ms=int((time.time() - start_time) * 1000),
            solver=result.get("solver", "unknown"),
            error=result.get("error")
        )
    except Exception as e:
        return SolveResponse(success=False, captcha_type=captcha_type, error=str(e), duration_ms=int((time.time() - start_time) * 1000))

@app.post("/solve/pow", response_model=PoWSolveResponse)
async def solve_pow_endpoint(request: PoWSolveRequest):
    solver = pow_solver
    if solver is None: raise HTTPException(503, "PoW solver offline")
    try:
        challenge = PoWChallenge(algorithm=request.algorithm, challenge=request.challenge, salt=request.salt, signature=request.signature, difficulty=request.difficulty, max_iterations=request.maxnumber)
        result = await solver.solve(challenge, timeout=request.timeout)
        return PoWSolveResponse(success=True, number=result["number"], took=result["took"], time_ms=result["time_ms"], verified=result["verified"], algorithm=result["challenge"]["algorithm"], challenge=result["challenge"]["challenge"])
    except Exception as e:
        return PoWSolveResponse(success=False, number=0, took=0, time_ms=0.0, verified=False, algorithm=request.algorithm, challenge=request.challenge, error=str(e))

@app.post("/detect/altcha")
async def detect_altcha_endpoint(html: str):
    solver = altcha_detector
    if solver is None: raise HTTPException(503, "ALTCHA detector offline")
    try:
        is_altcha = solver.detect_in_html(html)
        challenge = solver.extract_challenge(html)
        return {"detected": is_altcha, "challenge": challenge.to_dict() if challenge else None}
    except Exception as e: raise HTTPException(500, str(e))

@app.post("/solve/browser", response_model=BrowserSolveResponse)
async def solve_browser_endpoint(request: BrowserSolveRequest):
    solver = browser_automation_solver
    if solver is None: return BrowserSolveResponse(success=False, time_ms=0.0, error="Browser solver offline")
    try:
        result = await solver.solve_captcha(captcha_url=request.url, captcha_type=request.captcha_type, timeout=request.timeout)
        return BrowserSolveResponse(success=result.get("success", False), solution=result.get("solution"), time_ms=result.get("time_ms", 0.0), actions_taken=result.get("actions_taken", 0), error=result.get("error"))
    except Exception as e: return BrowserSolveResponse(success=False, time_ms=0.0, error=str(e))

@app.post("/detect/elements", response_model=ElementDetectResponse)
async def detect_elements_endpoint(request: ElementDetectRequest):
    try:
        detector = ElementDetector()
        elements = detector.detect_elements(request.screenshot, request.element_types or [])
        captcha_elements = detector.find_captcha_elements(request.screenshot)
        return ElementDetectResponse(
            elements=[{"id": e.id, "type": e.type, "x": e.x, "y": e.y, "width": e.width, "height": e.height, "text": e.text, "confidence": e.confidence, "center": e.center} for e in elements],
            count=len(elements),
            captcha_elements=[{"id": e.id, "type": e.type, "center": e.center, "confidence": e.confidence} for e in captcha_elements]
        )
    except Exception as e: raise HTTPException(500, str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8019)
