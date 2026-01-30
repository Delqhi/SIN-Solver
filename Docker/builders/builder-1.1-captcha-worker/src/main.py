"""
builder-1.1-captcha-worker - FastAPI Main Application
Unified CAPTCHA Solver with YOLO + OCR + Multi-AI Consensus
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
from fastapi import FastAPI, HTTPException, status, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from prometheus_client import Counter, Histogram, Gauge, Info, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

# Add app/tools to path for unified solver
sys.path.insert(0, "/app")

# Import unified captcha solver
try:
    from app.tools.captcha_solver import UnifiedCaptchaSolver, CaptchaResult

    UNIFIED_SOLVER_AVAILABLE = True
except ImportError as e:
    UNIFIED_SOLVER_AVAILABLE = False
    logging.warning(f"Unified solver not available: {e}")

# Import modular components (fallback)
from src.solvers.veto_engine import VetoEngine
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
APP_INFO.info({"version": "3.0.0", "status": "production", "date": "2026-01-30"})

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
    client_id: str = Field(default="default", min_length=1, max_length=100)

    @field_validator("image_data")
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

    requests: List[CaptchaSolveRequest] = Field(default_factory=list)
    batch_id: str = Field(default="")


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
# GLOBAL INSTANCES
# ============================================================================

unified_solver: Optional[UnifiedCaptchaSolver] = None
veto_engine: Optional[VetoEngine] = None
rate_limiter: Optional[RateLimiter] = None
redis_client: Optional[RedisClient] = None
ocr_detector: Optional[OcrElementDetector] = None
mistral_circuit: Optional[CircuitBreaker] = None
qwen_circuit: Optional[CircuitBreaker] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    global unified_solver, veto_engine, rate_limiter, redis_client, ocr_detector
    global mistral_circuit, qwen_circuit

    logger.info("🚀 Starting builder-1.1-captcha-worker v3.0.0...")
    logger.info(f"   Unified Solver Available: {UNIFIED_SOLVER_AVAILABLE}")

    try:
        # Initialize Unified Captcha Solver (NEW - YOLO + OCR)
        if UNIFIED_SOLVER_AVAILABLE:
            yolo_model_path = os.getenv("YOLO_MODEL_PATH", "/app/models/best.pt")
            unified_solver = UnifiedCaptchaSolver(
                yolo_model_path=yolo_model_path,
                confidence_threshold=0.7,
                enable_local_solvers=True,
                enable_api_fallback=True,
            )
            health = unified_solver.health_check()
            logger.info(f"✅ Unified solver initialized: {health}")

        # Initialize OCR detector (legacy)
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

        # Initialize veto engine (legacy fallback)
        veto_engine = VetoEngine()
        logger.info("✅ Veto engine initialized (fallback)")

        # Update metrics
        ACTIVE_WORKERS.set(1)

        logger.info("✅ Captcha Worker started successfully - READY FOR PRODUCTION")
        logger.info(
            f"   Solver Mode: {'UNIFIED (YOLO+OCR)' if unified_solver else 'LEGACY (Veto)'}"
        )

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
    description="Unified CAPTCHA Solver with YOLO + OCR + Multi-AI Consensus (Best Practices 2026)",
    version="2.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
            "unified_solver": unified_solver is not None,
            "veto_engine": veto_engine is not None,
            "rate_limiter": rate_limiter is not None,
            "redis": redis_client is not None and await redis_client.is_connected(),
            "ocr": ocr_detector is not None and ocr_detector.health_check(),
            "mistral_circuit": mistral_circuit.get_state() if mistral_circuit else "unknown",
            "qwen_circuit": qwen_circuit.get_state() if qwen_circuit else "unknown",
        },
    }

    # Add unified solver health if available
    if unified_solver:
        health_status["services"]["unified_solver_health"] = unified_solver.health_check()

    all_healthy = all(
        [
            health_status["services"]["redis"],
            health_status["services"]["ocr"],
            unified_solver is not None or veto_engine is not None,
        ]
    )

    if not all_healthy:
        raise HTTPException(status_code=503, detail=health_status)

    return health_status


@app.get("/ready")
async def readiness_check():
    """Readiness probe"""
    if not (unified_solver or veto_engine) or not redis_client:
        raise HTTPException(status_code=503, detail="Not ready")
    return {"status": "ready", "timestamp": datetime.utcnow().isoformat()}


# ============================================================================
# SOLVE ENDPOINTS
# ============================================================================


@app.post("/api/solve", response_model=CaptchaSolveResponse)
async def solve_captcha(request: CaptchaSolveRequest):
    """Solve a single CAPTCHA with unified solver (YOLO + OCR)"""
    if not unified_solver and not veto_engine:
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
            )

    try:
        with CAPTCHA_SOLVE_DURATION.time():
            # Handle different input types
            if request.image_data:
                # Use unified solver (NEW)
                if unified_solver:
                    result = await unified_solver.solve(
                        image_base64=request.image_data,
                        captcha_type=request.captcha_type,
                        timeout=request.timeout,
                    )

                    # Convert CaptchaResult to dict format
                    result_dict = {
                        "success": result.success,
                        "solution": result.solution,
                        "solution_type": result.captcha_type,
                        "captcha_type": result.captcha_type,
                        "confidence": result.confidence,
                        "solver_used": result.solver_used,
                    }
                else:
                    # Fallback to veto engine (legacy)
                    result_dict = await veto_engine.solve_text_captcha(request.image_data)

            elif request.url:
                # Browser-based solving
                if unified_solver:
                    # For URL-based solving, we'd need to fetch the image first
                    # For now, use veto engine for browser-based
                    result_dict = await veto_engine.solve_with_browser(
                        request.url, captcha_type="auto", timeout=request.timeout
                    )
                else:
                    result_dict = await veto_engine.solve_with_browser(
                        request.url, captcha_type="auto", timeout=request.timeout
                    )

            else:
                return CaptchaSolveResponse(
                    success=False,
                    error="Must provide either image_data or url",
                    solve_time_ms=int((time.time() - start_time) * 1000),
                )

        solve_time_ms = int((time.time() - start_time) * 1000)

        # Record metrics
        CAPTCHA_SOLVES_TOTAL.labels(
            captcha_type=request.captcha_type or result_dict.get("captcha_type", "unknown"),
            status="success" if result_dict.get("success") else "failed",
            solver_model=result_dict.get("solver_used", "unknown"),
        ).inc()

        return CaptchaSolveResponse(
            success=result_dict.get("success", False),
            solution=result_dict.get("solution"),
            solution_type=result_dict.get("solution_type"),
            confidence=result_dict.get("confidence", 0.0),
            solve_time_ms=solve_time_ms,
            solver_model=result_dict.get("solver_used", "unknown"),
            captcha_type=result_dict.get("captcha_type"),
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
async def solve_text_captcha_endpoint(request: CaptchaSolveRequest):
    """Solve text-based CAPTCHA"""
    request.captcha_type = "text"
    return await solve_captcha(request)


@app.post("/api/solve/math", response_model=CaptchaSolveResponse)
async def solve_math_captcha_endpoint(request: CaptchaSolveRequest):
    """Solve math-based CAPTCHA"""
    request.captcha_type = "math"
    return await solve_captcha(request)


@app.post("/api/classify")
async def classify_captcha(image_base64: str):
    """Classify CAPTCHA type using YOLO (NEW)"""
    if not unified_solver:
        raise HTTPException(status_code=503, detail="Unified solver not available")

    try:
        # Decode image
        image_data = base64.b64decode(image_base64)
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            return {"success": False, "error": "Invalid image data"}

        # Classify using YOLO
        captcha_type, confidence = unified_solver.yolo.classify(image)

        return {
            "success": True,
            "captcha_type": captcha_type,
            "confidence": confidence,
            "solver_type": unified_solver.yolo.get_solver_type(captcha_type),
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error(f"Classification error: {e}")
        return {"success": False, "error": str(e)}


@app.post("/api/solve/image-grid", response_model=CaptchaSolveResponse)
async def solve_image_grid_captcha_endpoint(request: CaptchaSolveRequest):
    """Solve image grid CAPTCHA (hCaptcha/reCAPTCHA style)"""
    request.captcha_type = "browser"
    return await solve_captcha(request)


@app.post("/api/solve/browser", response_model=CaptchaSolveResponse)
async def solve_browser_captcha_endpoint(request: CaptchaSolveRequest):
    """Solve CAPTCHA on live webpage using Steel Browser"""
    request.captcha_type = "browser"
    return await solve_captcha(request)


@app.post("/api/solve/batch")
async def solve_batch_endpoint(batch_request: BatchCaptchaRequest):
    """Solve batch of CAPTCHAs (max 100)"""
    if not unified_solver and not veto_engine:
        raise HTTPException(status_code=503, detail="Solver not initialized")

    results = []

    # Process in parallel with semaphore to limit concurrency
    semaphore = asyncio.Semaphore(10)

    async def process_single(request: CaptchaSolveRequest, batch_id: str):
        async with semaphore:
            result = await solve_captcha(request)
            return CaptchaSolveResponse(
                success=result.success,
                solution=result.solution,
                solution_type=result.solution_type,
                captcha_type=result.captcha_type,
                confidence=result.confidence,
                solve_time_ms=result.solve_time_ms,
                solver_model=result.solver_model,
                error=result.error,
                batch_id=batch_id,
                timestamp=result.timestamp,
            )

    requests_to_process = batch_request.requests[:100]
    tasks = [process_single(req, batch_request.batch_id) for req in requests_to_process]
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
        "results": [r.model_dump() for r in processed_results],
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

    # Add unified solver stats if available
    if unified_solver:
        health = unified_solver.health_check()
        stats["unified_solver"] = health

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


@app.get("/solver-status")
async def get_solver_status():
    """Get unified solver status"""
    if not unified_solver:
        return {
            "unified_solver_available": False,
            "timestamp": datetime.utcnow().isoformat(),
        }

    return {
        "unified_solver_available": True,
        "health": unified_solver.health_check(),
        "timestamp": datetime.utcnow().isoformat(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8019)
