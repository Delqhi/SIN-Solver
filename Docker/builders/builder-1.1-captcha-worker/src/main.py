"""
builder-1.1-captcha-worker - FastAPI Main Application
Multi-AI CAPTCHA Solver with Veto System + OCR + Circuit Breaker + Metrics
Best Practices 2026 - Modular Architecture
"""

import asyncio
import base64
import io
import logging
import os
import sys
import time
from contextlib import asynccontextmanager
from datetime import datetime
from typing import List, Optional, Dict, Any

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException, status, BackgroundTasks, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from pydantic import BaseModel, Field, validator
from prometheus_client import Counter, Histogram, Gauge, Info, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware

# Add app/tools to path for unified solver
sys.path.insert(0, "/app")

# Import unified captcha solver
try:
    from app.tools.captcha_solver import UnifiedCaptchaSolver, CaptchaResult

    UNIFIED_SOLVER_AVAILABLE = True
except ImportError as e:
    UNIFIED_SOLVER_AVAILABLE = False
    logging.warning(f"Unified solver not available: {e}")

# Import modular components
from src.solvers.veto_engine import VetoEngine
from src.solvers.vision_mistral import MistralSolver
from src.solvers.vision_qwen import QwenSolver
from src.solvers.vision_kimi import KimiSolver
from src.solvers.steel_controller import SteelController
from src.utils.redis_client import RedisClient
from src.utils.rate_limiter import RateLimiter
from src.utils.ocr_detector import OcrElementDetector
from src.utils.circuit_breaker import CircuitBreaker, CircuitBreakerOpenError

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ============================================================================
# PROMETHEUS METRICS
# ============================================================================

CAPTCHA_SOLVES_TOTAL = Counter(
    "captcha_solves_total",
    "Total number of CAPTCHA solves",
    ["captcha_type", "status", "solver_model"],
)

CAPTCHA_SOLVE_DURATION = Histogram(
    "captcha_solve_duration_seconds",
    "Time spent solving CAPTCHAs",
    ["captcha_type"],
    buckets=[0.1, 0.5, 1.0, 2.0, 3.0, 5.0, 10.0, 30.0],
)

ACTIVE_WORKERS = Gauge("captcha_active_workers", "Number of active CAPTCHA solving workers")

CIRCUIT_BREAKER_STATE = Gauge(
    "circuit_breaker_state",
    "Current state of circuit breaker (0=closed, 1=open, 2=half-open)",
    ["service_name"],
)

RATE_LIMIT_HITS = Counter("rate_limit_hits_total", "Total number of rate limit hits", ["client_id"])

QUEUE_SIZE = Gauge("captcha_queue_size", "Current size of CAPTCHA processing queue", ["priority"])

APP_INFO = Info("captcha_worker", "Application information")
APP_INFO.info({"version": "2.1.0", "status": "production", "date": "2026-01-29"})

# ============================================================================
# PYDANTIC MODELS
# ============================================================================


class CaptchaSolveRequest(BaseModel):
    """Validated CAPTCHA solve request"""

    image_data: Optional[str] = Field(None, description="Base64 encoded CAPTCHA image")
    captcha_type: Optional[str] = Field(None, description="Known CAPTCHA type")
    url: Optional[str] = Field(None, description="URL for browser-based solving")
    instructions: Optional[str] = Field(None, description="Instructions for image grids")
    timeout: int = Field(30, ge=1, le=300, description="Timeout in seconds")
    priority: str = Field("normal", pattern="^(high|normal|low)$")
    client_id: str = Field("default", min_length=1, max_length=100)

    @validator("image_data")
    def validate_image_size(cls, v):
        """Validate image size < 10MB"""
        if v is None:
            return v
        try:
            decoded = base64.b64decode(v)
            if len(decoded) > 10 * 1024 * 1024:  # 10MB limit
                raise ValueError("Image too large (max 10MB)")
            return v
        except Exception as e:
            raise ValueError(f"Invalid image data: {e}")


class BatchCaptchaRequest(BaseModel):
    """Batch CAPTCHA processing request"""

    requests: List[CaptchaSolveRequest] = Field(..., max_items=100)
    batch_id: str = Field(..., min_length=1)


class CaptchaSolveResponse(BaseModel):
    """CAPTCHA solve response"""

    success: bool
    solution: Optional[str] = None
    solution_type: Optional[str] = None
    captcha_type: Optional[str] = None
    confidence: float = 0.0
    solve_time_ms: int = 0
    solver_model: str = ""
    error: Optional[str] = None
    batch_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ============================================================================
# SECURITY CONFIGURATION
# ============================================================================

# API KEY VALIDATION
API_KEY = os.getenv("CAPTCHA_API_KEY", "sk-test-captcha-worker-2026")
ALLOWED_ORIGINS = [
    origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
]

# ============================================================================
# GLOBAL INSTANCES
# ============================================================================

veto_engine: Optional[VetoEngine] = None
rate_limiter: Optional[RateLimiter] = None
redis_client: Optional[RedisClient] = None
ocr_detector: Optional[OcrElementDetector] = None
mistral_circuit: Optional[CircuitBreaker] = None
qwen_circuit: Optional[CircuitBreaker] = None
security = HTTPBearer()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    global veto_engine, rate_limiter, redis_client, ocr_detector
    global mistral_circuit, qwen_circuit

    logger.info("🚀 Starting builder-1.1-captcha-worker v2.1.0...")

    try:
        # Initialize OCR detector
        ocr_detector = OcrElementDetector()
        logger.info("✅ OCR detector initialized")

        # Initialize Redis client
        redis_client = RedisClient()
        await redis_client.connect()
        logger.info("✅ Redis client connected")

        # Initialize rate limiter
        rate_limiter = RateLimiter(redis_client)
        logger.info("✅ Rate limiter initialized")

        # Initialize circuit breakers
        mistral_circuit = CircuitBreaker("mistral_api", failure_threshold=3)
        qwen_circuit = CircuitBreaker("qwen_api", failure_threshold=3)
        logger.info("✅ Circuit breakers initialized")

        # Initialize veto engine
        veto_engine = VetoEngine()
        logger.info("✅ Veto engine initialized")

        # Update metrics
        ACTIVE_WORKERS.set(1)

        logger.info("✅ Captcha Worker started successfully - READY FOR PRODUCTION")

    except Exception as e:
        logger.error(f"❌ Failed to initialize: {e}")
        raise

    yield

    # Shutdown
    logger.info("🛑 Shutting down Captcha Worker...")
    if redis_client:
        await redis_client.disconnect()
    ACTIVE_WORKERS.set(0)
    logger.info("✅ Captcha Worker stopped")


# ============================================================================
# FASTAPI APP
# ============================================================================

app = FastAPI(
    title="Builder-1.1 Captcha Worker",
    description="Multi-AI CAPTCHA Solver with Veto System + OCR (Best Practices 2026)",
    version="2.1.0",
    lifespan=lifespan,
)


async def verify_api_key(authorization: str = Header(None)) -> str:
    """Verify API key from Authorization header"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    # Extract token from "Bearer <token>" format
    if authorization.startswith("Bearer "):
        token = authorization[7:]
    else:
        token = authorization

    if token != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return token


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["authorization", "content-type"],
)


# ============================================================================
# HEALTH CHECKS
# ============================================================================


@app.get("/health")
async def health_check():
    """Liveness probe"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.1.0",
        "services": {
            "veto_engine": veto_engine is not None,
            "rate_limiter": rate_limiter is not None,
            "redis": redis_client is not None and await redis_client.is_connected(),
            "ocr": ocr_detector is not None and ocr_detector.health_check(),
            "mistral_circuit": mistral_circuit.get_state() if mistral_circuit else "unknown",
            "qwen_circuit": qwen_circuit.get_state() if qwen_circuit else "unknown",
        },
    }

    all_healthy = all(
        [
            health_status["services"]["veto_engine"],
            health_status["services"]["rate_limiter"],
            health_status["services"]["redis"],
            health_status["services"]["ocr"],
        ]
    )

    if not all_healthy:
        raise HTTPException(status_code=503, detail=health_status)

    return health_status


@app.get("/ready")
async def readiness_check():
    """Readiness probe"""
    if not veto_engine or not redis_client:
        raise HTTPException(status_code=503, detail="Not ready")
    return {"status": "ready", "timestamp": datetime.utcnow().isoformat()}


# ============================================================================
# SOLVE ENDPOINTS
# ============================================================================


@app.post("/api/solve", response_model=CaptchaSolveResponse)
async def solve_captcha(request: CaptchaSolveRequest, api_key: str = Depends(verify_api_key)):
    """Solve a single CAPTCHA with full feature support"""
    if not veto_engine:
        raise HTTPException(status_code=503, detail="Solver not initialized")

    start_time = time.time()

    # Rate limiting check
    if rate_limiter:
        is_limited, current = await rate_limiter.is_rate_limited(
            request.client_id, max_requests=20, window_seconds=60
        )
        if is_limited:
            RATE_LIMIT_HITS.labels(client_id=request.client_id).inc()
            return CaptchaSolveResponse(
                success=False,
                error=f"Rate limit exceeded. Current: {current}/20 per minute",
                solve_time_ms=int((time.time() - start_time) * 1000),
                client_id=request.client_id,
            )

    result = None
    captcha_type_detected = request.captcha_type or "unknown"

    try:
        if request.image_data:
            if unified_solver:
                solve_result = await unified_solver.solve(
                    image_base64=request.image_data,
                    captcha_type=request.captcha_type,
                    timeout=request.timeout,
                )

                result = {
                    "success": solve_result.success,
                    "solution": solve_result.solution,
                    "solution_type": solve_result.captcha_type,
                    "captcha_type": solve_result.captcha_type,
                    "confidence": solve_result.confidence,
                    "solver_used": solve_result.solver_used,
                }
                captcha_type_detected = (
                    solve_result.captcha_type or request.captcha_type or "unknown"
                )
            else:
                result = await veto_engine.solve_text_captcha(request.image_data)
                captcha_type_detected = (
                    result.get("captcha_type", request.captcha_type) or "unknown"
                )

        elif request.url:
            result = await veto_engine.solve_with_browser(
                request.url, captcha_type="auto", timeout=request.timeout
            )
            captcha_type_detected = result.get("captcha_type", "browser") or "browser"

        else:
            return CaptchaSolveResponse(
                success=False,
                error="Must provide either image_data or url",
                solve_time_ms=int((time.time() - start_time) * 1000),
            )

        solve_time_ms = int((time.time() - start_time) * 1000)
        CAPTCHA_SOLVE_DURATION.labels(captcha_type=captcha_type_detected).observe(
            solve_time_ms / 1000.0
        )

        solve_time_ms = int((time.time() - start_time) * 1000)

        # Record metrics
        CAPTCHA_SOLVES_TOTAL.labels(
            captcha_type=request.captcha_type or "unknown",
            status="success" if result.get("success") else "failed",
            solver_model=result.get("solver_used", "unknown"),
        ).inc()

        return CaptchaSolveResponse(
            success=result.get("success", False),
            solution=result.get("solution"),
            solution_type=result.get("solution_type"),
            confidence=result.get("confidence", 0.0),
            solve_time_ms=solve_time_ms,
            solver_model=result.get("solver_used", "unknown"),
            captcha_type=request.captcha_type,
        )

    except CircuitBreakerOpenError as e:
        logger.warning(f"Circuit breaker open: {e}")
        return CaptchaSolveResponse(
            success=False,
            error=f"Service temporarily unavailable: {str(e)}",
            solve_time_ms=int((time.time() - start_time) * 1000),
        )
    except Exception as e:
        logger.error(f"Solve error: {e}")
        return CaptchaSolveResponse(
            success=False, error=str(e), solve_time_ms=int((time.time() - start_time) * 1000)
        )


@app.post("/api/solve/text", response_model=CaptchaSolveResponse)
async def solve_text_captcha(
    image_base64: str,
    client_id: str = "default",
    timeout: int = 30,
    api_key: str = Depends(verify_api_key),
):
    """Solve text-based CAPTCHA"""
    request = CaptchaSolveRequest(
        image_data=image_base64, captcha_type="text", client_id=client_id, timeout=timeout
    )
    return await solve_captcha(request)


@app.post("/api/solve/image-grid", response_model=CaptchaSolveResponse)
async def solve_image_grid_captcha(
    image_base64: str,
    instructions: str,
    client_id: str = "default",
    timeout: int = 45,
    api_key: str = Depends(verify_api_key),
):
    """Solve image grid CAPTCHA (hCaptcha/reCAPTCHA style)"""
    return await solve_browser_captcha(
        url=f"data:image/png;base64,{image_base64}", client_id=client_id, timeout=timeout
    )


@app.post("/api/solve/browser", response_model=CaptchaSolveResponse)
async def solve_browser_captcha(
    url: str, client_id: str = "default", timeout: int = 60, api_key: str = Depends(verify_api_key)
):
    """Solve CAPTCHA on live webpage using Steel Browser"""
    request = CaptchaSolveRequest(
        url=url, captcha_type="browser", client_id=client_id, timeout=timeout
    )
    return await solve_captcha(request)


@app.post("/api/solve/batch")
async def solve_batch(batch_request: BatchCaptchaRequest, api_key: str = Depends(verify_api_key)):
    """Solve batch of CAPTCHAs (max 100)"""
    if not veto_engine:
        raise HTTPException(status_code=503, detail="Solver not initialized")

    results = []

    # Process in parallel with semaphore to limit concurrency
    semaphore = asyncio.Semaphore(10)

    async def process_single(request: CaptchaSolveRequest):
        async with semaphore:
            result = await solve_captcha(request)
            result.batch_id = batch_request.batch_id
            return result

    # Create tasks
    tasks = [process_single(req) for req in batch_request.requests]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Handle exceptions
    processed_results = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            processed_results.append(
                CaptchaSolveResponse(
                    success=False, error=str(result), batch_id=batch_request.batch_id
                )
            )
        else:
            processed_results.append(result)

    return {
        "batch_id": batch_request.batch_id,
        "total": len(processed_results),
        "successful": sum(1 for r in processed_results if r.success),
        "failed": sum(1 for r in processed_results if not r.success),
        "results": [r.dict() for r in processed_results],
    }


# ============================================================================
# MONITORING ENDPOINTS
# ============================================================================


@app.get("/rate-limits")
async def get_rate_limits(client_id: str = "default"):
    """Get current rate limit status"""
    if not rate_limiter:
        raise HTTPException(status_code=503, detail="Rate limiter not initialized")

    current = await rate_limiter.get_current_count(client_id)

    return {
        "client_id": client_id,
        "current_requests": current,
        "max_requests": 20,
        "window_seconds": 60,
        "is_limited": current >= 20,
        "reset_time": None,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/stats")
async def get_stats():
    """Get solver statistics"""
    if not redis_client:
        raise HTTPException(status_code=503, detail="Redis not initialized")

    stats = await redis_client.get_hash("captcha:stats")

    return {
        "total_solved": int(stats.get("total_solved", 0)),
        "total_failed": int(stats.get("total_failed", 0)),
        "avg_solve_time_ms": float(stats.get("avg_solve_time_ms", 0)),
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/circuit-status")
async def get_circuit_status():
    """Get circuit breaker status"""
    return {
        "mistral": mistral_circuit.get_state() if mistral_circuit else "unknown",
        "qwen": qwen_circuit.get_state() if qwen_circuit else "unknown",
        "timestamp": datetime.utcnow().isoformat(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8019)
