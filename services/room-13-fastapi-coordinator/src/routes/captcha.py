"""
Captcha Solver Routes for API Brain Integration
Zimmer-13 API Coordinator - Captcha Solver Endpoints
"""

from fastapi import APIRouter, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
import logging
import httpx
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/captcha", tags=["captcha"])

# Captcha Solver Service Configuration
CAPTCHA_WORKER_URL = "http://builder-1.1-captcha-worker:8019"

class CaptchaType(str, Enum):
    """Supported CAPTCHA types"""
    TEXT = "text"
    IMAGE_GRID = "image_grid"
    RECAPTCHA_V2 = "recaptcha_v2"
    RECAPTCHA_V3 = "recaptcha_v3"
    HCAPTCHA = "hcaptcha"
    TURNSTILE = "turnstile"
    FUNCAPTCHA = "funcaptcha"
    GEETEST = "geetest"
    SLIDER = "slider"
    AUDIO = "audio"
    AUTO = "auto"

class SolveRequest(BaseModel):
    """CAPTCHA solve request"""
    captcha_type: CaptchaType = Field(default=CaptchaType.AUTO, description="Type of CAPTCHA")
    image_base64: Optional[str] = Field(None, description="Base64 encoded CAPTCHA image")
    url: Optional[str] = Field(None, description="URL with CAPTCHA (for browser mode)")
    instructions: Optional[str] = Field(None, description="Instructions e.g. 'Select all cars'")
    sitekey: Optional[str] = Field(None, description="reCAPTCHA/hCaptcha sitekey")
    timeout: int = Field(default=30, ge=5, le=120, description="Timeout in seconds")
    use_browser: bool = Field(default=False, description="Use Steel Browser automation")
    priority: int = Field(default=5, ge=1, le=10, description="Priority (1-10)")

class SolveResponse(BaseModel):
    """CAPTCHA solve response"""
    success: bool
    solution: Optional[str] = None
    solution_type: Optional[str] = None  # "text", "coordinates", "token"
    confidence: float = 0.0
    solve_time_ms: int = 0
    solver_used: Optional[str] = None  # "mistral", "qwen", "kimi", "consensus"
    attempts: int = 0
    timestamp: datetime
    request_id: str

class SolverStatus(BaseModel):
    """CAPTCHA solver status"""
    status: str
    version: str
    uptime_seconds: int
    solvers: Dict[str, Any]
    rate_limit_status: Dict[str, Any]
    queue_size: int = 0
    total_solved: int = 0
    total_failed: int = 0
    avg_solve_time_ms: float = 0.0

class RateLimitStatus(BaseModel):
    """Rate limit status"""
    current_requests: int
    max_requests: int
    window_seconds: int
    reset_time: datetime
    is_limited: bool

async def get_captcha_worker_client():
    """Get HTTP client for captcha worker"""
    return httpx.AsyncClient(base_url=CAPTCHA_WORKER_URL, timeout=60.0)

@router.post("/solve", response_model=SolveResponse)
async def solve_captcha(request: SolveRequest):
    """
    Solve a CAPTCHA using multi-AI consensus
    
    - **Text CAPTCHA**: Provide image_base64
    - **Image Grid**: Provide image_base64 + instructions
    - **Browser-based**: Provide url + captcha_type
    """
    try:
        async with await get_captcha_worker_client() as client:
            # Forward request to captcha worker
            payload = request.model_dump()
            
            response = await client.post("/solve", json=payload)
            
            if response.status_code != 200:
                logger.error(f"Captcha worker error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Captcha solver failed"
                )
            
            result = response.json()
            return SolveResponse(**result)
    
    except httpx.ConnectError:
        logger.error("Cannot connect to captcha worker")
        raise HTTPException(
            status_code=503,
            detail="Captcha solver service unavailable"
        )
    except Exception as e:
        logger.error(f"Captcha solve error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to solve CAPTCHA: {str(e)}"
        )

@router.post("/solve/text")
async def solve_text_captcha(
    image_base64: str,
    timeout: int = 30
):
    """
    Solve text-based CAPTCHA
    
    Args:
        image_base64: Base64 encoded CAPTCHA image
        timeout: Maximum time to wait (seconds)
    """
    request = SolveRequest(
        captcha_type=CaptchaType.TEXT,
        image_base64=image_base64,
        timeout=timeout
    )
    return await solve_captcha(request)

@router.post("/solve/image-grid")
async def solve_image_grid_captcha(
    image_base64: str,
    instructions: str,
    grid_size: str = "3x3",
    timeout: int = 45
):
    """
    Solve image grid CAPTCHA (hCaptcha/reCAPTCHA style)
    
    Args:
        image_base64: Base64 encoded grid image
        instructions: What to select (e.g., "Select all cars")
        grid_size: Grid dimensions (3x3, 4x4)
        timeout: Maximum time to wait (seconds)
    """
    request = SolveRequest(
        captcha_type=CaptchaType.IMAGE_GRID,
        image_base64=image_base64,
        instructions=instructions,
        timeout=timeout
    )
    return await solve_captcha(request)

@router.post("/solve/browser")
async def solve_with_browser(
    url: str,
    captcha_type: CaptchaType = CaptchaType.AUTO,
    timeout: int = 60
):
    """
    Solve CAPTCHA on a live webpage using Steel Browser
    
    Args:
        url: URL containing the CAPTCHA
        captcha_type: Type of CAPTCHA (or AUTO for detection)
        timeout: Maximum time to wait (seconds)
    """
    request = SolveRequest(
        captcha_type=captcha_type,
        url=url,
        use_browser=True,
        timeout=timeout
    )
    return await solve_captcha(request)

@router.get("/status", response_model=SolverStatus)
async def get_solver_status():
    """Get CAPTCHA solver service status"""
    try:
        async with await get_captcha_worker_client() as client:
            response = await client.get("/health")
            
            if response.status_code == 200:
                data = response.json()
                return SolverStatus(**data)
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to get solver status"
                )
    
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Captcha solver service unavailable"
        )
    except Exception as e:
        logger.error(f"Status check error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get status: {str(e)}"
        )

@router.get("/rate-limits", response_model=RateLimitStatus)
async def get_rate_limits():
    """Get current rate limit status"""
    try:
        async with await get_captcha_worker_client() as client:
            response = await client.get("/rate-limits")
            
            if response.status_code == 200:
                data = response.json()
                return RateLimitStatus(**data)
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to get rate limits"
                )
    
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Captcha solver service unavailable"
        )
    except Exception as e:
        logger.error(f"Rate limit check error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get rate limits: {str(e)}"
        )

@router.get("/stats")
async def get_solver_stats():
    """Get CAPTCHA solver statistics"""
    try:
        async with await get_captcha_worker_client() as client:
            response = await client.get("/stats")
            
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to get statistics"
                )
    
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Captcha solver service unavailable"
        )
    except Exception as e:
        logger.error(f"Stats error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get stats: {str(e)}"
        )

@router.post("/batch-solve")
async def batch_solve_captchas(
    requests: List[SolveRequest],
    background_tasks: BackgroundTasks
):
    """
    Solve multiple CAPTCHAs in batch
    
    Returns immediately with request IDs. Check status later.
    """
    # TODO: Implement batch processing with Redis queue
    raise HTTPException(
        status_code=501,
        detail="Batch processing not yet implemented"
    )
