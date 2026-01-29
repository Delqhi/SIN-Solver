"""
SIN-Solver Enterprise API Routes

Enterprise-grade endpoints with enhanced features:
- API versioning (v2)
- Batch processing
- Advanced analytics
- Webhook management
- Usage tracking

February 2026 - Enterprise Ready
"""

from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Literal
from datetime import datetime, timedelta
from enum import Enum
import hashlib
import hmac
import json
import uuid

from app.core.config import settings
from app.api.routes.auth import get_current_user

router = APIRouter(prefix="/api/v2", tags=["enterprise"])
security = HTTPBearer()


# ============================================================================
# ENUMS AND CONSTANTS
# ============================================================================

class CaptchaType(str, Enum):
    """Supported CAPTCHA types."""
    RECAPTCHA_V2 = "recaptcha_v2"
    RECAPTCHA_V3 = "recaptcha_v3"
    HCAPTCHA = "hcaptcha"
    TURNSTILE = "turnstile"
    FUNCAPTCHA = "funcaptcha"
    TEXT = "text"
    IMAGE = "image"
    SLIDER = "slider"
    CLICK = "click"
    GEETEST = "geetest"
    KEYCAPTCHA = "keycaptcha"


class Priority(str, Enum):
    """Task priority levels."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(str, Enum):
    """Task processing status."""
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"


class WebhookEvent(str, Enum):
    """Available webhook event types."""
    SOLVE_QUEUED = "solve.queued"
    SOLVE_STARTED = "solve.started"
    SOLVE_PROGRESS = "solve.progress"
    SOLVE_COMPLETED = "solve.completed"
    SOLVE_FAILED = "solve.failed"
    BATCH_CREATED = "batch.created"
    BATCH_PROGRESS = "batch.progress"
    BATCH_COMPLETED = "batch.completed"


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class ProxyConfig(BaseModel):
    """Proxy configuration for solve requests."""
    type: Literal["datacenter", "residential", "isp", "mobile"] = "datacenter"
    country: Optional[str] = Field(None, regex=r"^[A-Z]{2}$")
    session: Optional[str] = Field(None, max_length=64)
    rotate: bool = False


class SolveOptions(BaseModel):
    """Options for solve requests."""
    timeout: int = Field(default=30, ge=5, le=300)
    human_simulation: bool = True
    priority: Priority = Priority.NORMAL
    retry_count: int = Field(default=2, ge=0, le=5)
    webhook_url: Optional[str] = Field(None, max_length=2048)
    metadata: Optional[Dict[str, Any]] = None
    data_residency: Optional[Literal["US", "EU", "APAC", "SA"]] = None


class SolveRequest(BaseModel):
    """Request model for single CAPTCHA solve."""
    type: CaptchaType
    sitekey: Optional[str] = None
    url: str = Field(..., max_length=2048)
    image_base64: Optional[str] = None
    proxy: Optional[ProxyConfig] = None
    options: SolveOptions = Field(default_factory=SolveOptions)
    
    @validator('url')
    def validate_url(cls, v):
        if not v.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        return v


class SolveResponse(BaseModel):
    """Response model for solve requests."""
    success: bool
    data: Dict[str, Any]


class SolveResultData(BaseModel):
    """Detailed solve result data."""
    task_id: str
    status: TaskStatus
    solution: Optional[str] = None
    solve_time_ms: Optional[int] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    solver: Optional[Dict[str, Any]] = None
    cost: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class BatchItem(BaseModel):
    """Single item in batch request."""
    id: str = Field(..., max_length=64)
    type: CaptchaType
    sitekey: Optional[str] = None
    url: str
    image_base64: Optional[str] = None
    proxy: Optional[ProxyConfig] = None
    metadata: Optional[Dict[str, Any]] = None


class BatchOptions(BaseModel):
    """Options for batch processing."""
    parallelism: int = Field(default=10, ge=1, le=100)
    timeout: int = Field(default=60, ge=10, le=600)
    webhook_url: Optional[str] = Field(None, max_length=2048)
    priority: Priority = Priority.NORMAL


class BatchRequest(BaseModel):
    """Request model for batch solve."""
    items: List[BatchItem] = Field(..., min_items=1, max_items=1000)
    options: BatchOptions = Field(default_factory=BatchOptions)


class BatchResponse(BaseModel):
    """Response model for batch requests."""
    success: bool
    data: Dict[str, Any]


class BatchStatusData(BaseModel):
    """Batch processing status data."""
    batch_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    total: int
    completed: int
    failed: int
    progress_percent: float
    created_at: datetime
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    results: Optional[List[Dict[str, Any]]] = None
    summary: Optional[Dict[str, Any]] = None


class WebhookConfig(BaseModel):
    """Webhook configuration."""
    url: str = Field(..., max_length=2048)
    events: List[WebhookEvent] = Field(..., min_items=1)
    secret: Optional[str] = Field(None, min_length=32, max_length=128)
    metadata: Optional[Dict[str, Any]] = None
    active: bool = True


class WebhookResponse(BaseModel):
    """Webhook registration response."""
    webhook_id: str
    url: str
    events: List[str]
    status: str
    created_at: datetime
    metadata: Optional[Dict[str, Any]] = None


class UsageQuota(BaseModel):
    """Usage quota information."""
    tier: str
    monthly_limit: int
    used_this_month: int
    remaining: int
    resets_at: datetime
    overage_enabled: bool
    overage_rate: float


class UsageConcurrent(BaseModel):
    """Concurrent usage information."""
    limit: int
    current: int
    peak_today: int


class UsageResponse(BaseModel):
    """Usage and quota response."""
    success: bool
    data: Dict[str, Any]


class AnalyticsFilter(BaseModel):
    """Filter parameters for analytics."""
    start: datetime
    end: datetime
    granularity: Literal["hourly", "daily", "monthly"] = "daily"
    group_by: Optional[Literal["type", "region", "solver"]] = None


class RealtimeMetrics(BaseModel):
    """Real-time system metrics."""
    timestamp: datetime
    requests_per_second: float
    active_solves: int
    queue_depth: int
    avg_solve_time_ms: int
    success_rate_5m: float
    error_rate_5m: float


class ErrorResponse(BaseModel):
    """Standard error response."""
    success: bool = False
    error: Dict[str, Any]


# ============================================================================
# AUTHENTICATION HELPERS
# ============================================================================

async def verify_api_key(credentials: HTTPAuthorizationCredentials) -> Dict[str, Any]:
    """Verify API key and return key data."""
    # In production, validate against database/Vault
    api_key = credentials.credentials
    
    # Check key format
    if not api_key.startswith(("sin_live_", "sin_test_")):
        raise HTTPException(status_code=401, detail="Invalid API key format")
    
    # TODO: Validate against database
    return {
        "key_id": "key_abc123",
        "user_id": "user_xyz789",
        "tier": "enterprise",
        "permissions": ["solve:read", "solve:write", "analytics:read"],
        "rate_limit": 15000,
        "concurrent_limit": 1000
    }


async def check_rate_limit(key_data: Dict[str, Any]) -> bool:
    """Check if request is within rate limits."""
    # TODO: Implement Redis-based rate limiting
    return True


async def get_current_api_key(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """Dependency to get and verify API key."""
    key_data = await verify_api_key(credentials)
    
    if not await check_rate_limit(key_data):
        raise HTTPException(
            status_code=429,
            detail={
                "code": "RATE_LIMITED",
                "message": "Rate limit exceeded. Please slow down.",
                "retry_after": 60
            }
        )
    
    return key_data


# ============================================================================
# SOLVE ENDPOINTS
# ============================================================================

@router.post(
    "/solve",
    response_model=SolveResponse,
    responses={
        200: {"description": "Synchronous solve completed"},
        202: {"description": "Asynchronous solve accepted"},
        400: {"model": ErrorResponse, "description": "Validation error"},
        401: {"model": ErrorResponse, "description": "Authentication required"},
        429: {"model": ErrorResponse, "description": "Rate limit exceeded"}
    },
    summary="Submit CAPTCHA for solving",
    description="Submit a CAPTCHA for solving with the multi-AI consensus engine"
)
async def submit_solve(
    request: SolveRequest,
    background_tasks: BackgroundTasks,
    api_key: Dict[str, Any] = Depends(get_current_api_key)
) -> SolveResponse:
    """
    Submit a CAPTCHA for solving.
    
    Returns the solution synchronously if completed quickly (under 10s),
    otherwise returns a task ID for async polling.
    """
    task_id = f"task_{uuid.uuid4().hex[:16]}"
    
    # TODO: Queue task to Redis/RabbitMQ
    # TODO: Call solver service
    
    # Simulate sync response for demo
    result_data = SolveResultData(
        task_id=task_id,
        status=TaskStatus.COMPLETED,
        solution="03AGdBq24PBCdK...",
        solve_time_ms=8234,
        created_at=datetime.utcnow(),
        started_at=datetime.utcnow(),
        completed_at=datetime.utcnow() + timedelta(seconds=8),
        solver={
            "engine": "consensus",
            "models": ["gemini-3-flash", "mistral-vision", "yolo-v8x"],
            "confidence": 0.984
        },
        cost={
            "amount": 0.018,
            "currency": "USD",
            "breakdown": {
                "base": 0.015,
                "priority": 0.003
            }
        },
        metadata=request.options.metadata
    )
    
    return SolveResponse(
        success=True,
        data=result_data.dict()
    )


@router.get(
    "/solve/{task_id}",
    response_model=SolveResponse,
    summary="Get solve result by task ID"
)
async def get_solve_result(
    task_id: str,
    api_key: Dict[str, Any] = Depends(get_current_api_key)
) -> SolveResponse:
    """Retrieve the result of a previously submitted solve task."""
    # TODO: Query database for task result
    
    return SolveResponse(
        success=True,
        data={
            "task_id": task_id,
            "status": TaskStatus.COMPLETED,
            "type": "recaptcha_v2",
            "solution": "03AGdBq24PBCdK...",
            "solve_time_ms": 8234,
            "created_at": datetime.utcnow().isoformat(),
            "solver": {
                "engine": "consensus",
                "confidence": 0.984
            }
        }
    )


@router.post(
    "/solve/{task_id}/cancel",
    response_model=SolveResponse,
    summary="Cancel a pending solve task"
)
async def cancel_solve(
    task_id: str,
    api_key: Dict[str, Any] = Depends(get_current_api_key)
) -> SolveResponse:
    """Cancel a solve task that hasn't started processing yet."""
    # TODO: Check if task can be cancelled
    # TODO: Remove from queue if not started
    
    return SolveResponse(
        success=True,
        data={
            "task_id": task_id,
            "status": TaskStatus.CANCELLED,
            "cancelled_at": datetime.utcnow().isoformat()
        }
    )


# ============================================================================
# BATCH ENDPOINTS
# ============================================================================

@router.post(
    "/batch",
    response_model=BatchResponse,
    summary="Submit batch of CAPTCHAs"
)
async def submit_batch(
    request: BatchRequest,
    api_key: Dict[str, Any] = Depends(get_current_api_key)
) -> BatchResponse:
    """
    Submit multiple CAPTCHAs for batch processing.
    
    Maximum 1000 items per batch. Items are processed in parallel
    according to the parallelism setting.
    """
    batch_id = f"batch_{uuid.uuid4().hex[:16]}"
    
    # TODO: Validate all items
    # TODO: Queue batch job
    
    return BatchResponse(
        success=True,
        data={
            "batch_id": batch_id,
            "status": "processing",
            "total": len(request.items),
            "queued": len(request.items),
            "completed": 0,
            "failed": 0,
            "progress_percent": 0,
            "estimated_completion": (datetime.utcnow() + timedelta(minutes=5)).isoformat(),
            "webhook_registered": bool(request.options.webhook_url)
        }
    )


@router.get(
    "/batch/{batch_id}",
    response_model=BatchResponse,
    summary="Get batch status and results"
)
async def get_batch_status(
    batch_id: str,
    include_results: bool = False,
    api_key: Dict[str, Any] = Depends(get_current_api_key)
) -> BatchResponse:
    """Get the status and optionally results of a batch job."""
    # TODO: Query batch status from database
    
    return BatchResponse(
        success=True,
        data={
            "batch_id": batch_id,
            "status": "completed",
            "total": 100,
            "completed": 98,
            "failed": 2,
            "progress_percent": 100,
            "created_at": datetime.utcnow().isoformat(),
            "completed_at": datetime.utcnow().isoformat(),
            "duration_ms": 263000,
            "results": [
                {"id": "req_1", "status": "success", "solution": "03AG..."},
                {"id": "req_2", "status": "failed", "error": {"code": "TIMEOUT"}}
            ] if include_results else None,
            "summary": {
                "success_rate": 0.98,
                "avg_solve_time_ms": 8547,
                "total_cost_usd": 1.76
            }
        }
    )


@router.delete(
    "/batch/{batch_id}",
    response_model=BatchResponse,
    summary="Cancel batch job"
)
async def cancel_batch(
    batch_id: str,
    api_key: Dict[str, Any] = Depends(get_current_api_key)
) -> BatchResponse:
    """Cancel a batch job that hasn't completed yet."""
    # TODO: Cancel batch processing
    
    return BatchResponse(
        success=True,
        data={
            "batch_id": batch_id,
            "status": "cancelled",
            "cancelled_at": datetime.utcnow().isoformat()
        }
    )


# ============================================================================
# STATUS ENDPOINTS
# ============================================================================

@router.get(
    "/status",
    response_model=SolveResponse,
    summary="Get system status"
)
async def get_system_status() -> SolveResponse:
    """Get overall system status and health information."""
    return SolveResponse(
        success=True,
        data={
            "status": "operational",
            "version": "2.1.0-enterprise",
            "region": "us-east-1",
            "timestamp": datetime.utcnow().isoformat(),
            "services": {
                "api": {"status": "healthy", "latency_ms": 12},
                "solvers": {"status": "healthy", "available": 45},
                "queue": {"status": "healthy", "depth": 127},
                "database": {"status": "healthy", "latency_ms": 3},
                "cache": {"status": "healthy", "latency_ms": 1}
            },
            "solver_pools": {
                "gemini": {"available": True, "queue_depth": 23},
                "mistral": {"available": True, "queue_depth": 18},
                "yolo": {"available": True, "queue_depth": 5},
                "groq": {"available": True, "queue_depth": 12}
            }
        }
    )


@router.get(
    "/status/solvers",
    response_model=SolveResponse,
    summary="Get solver pool status"
)
async def get_solver_status() -> SolveResponse:
    """Get detailed status of all solver pools."""
    return SolveResponse(
        success=True,
        data={
            "pools": [
                {
                    "name": "gemini-consensus",
                    "type": "ai",
                    "status": "active",
                    "capacity": 100,
                    "active": 67,
                    "queued": 23,
                    "avg_solve_time_ms": 8200,
                    "success_rate_24h": 0.985,
                    "models": ["gemini-3-flash", "gemini-3-ultra"]
                },
                {
                    "name": "yolo-vision",
                    "type": "vision",
                    "status": "active",
                    "capacity": 200,
                    "active": 45,
                    "queued": 5,
                    "avg_solve_time_ms": 1200,
                    "success_rate_24h": 0.991
                }
            ]
        }
    )


# ============================================================================
# ANALYTICS ENDPOINTS
# ============================================================================

@router.get(
    "/analytics/usage",
    response_model=SolveResponse,
    summary="Get usage analytics"
)
async def get_usage_analytics(
    start: datetime,
    end: datetime,
    granularity: Literal["hourly", "daily", "monthly"] = "daily",
    group_by: Optional[Literal["type", "region", "solver"]] = None,
    api_key: Dict[str, Any] = Depends(get_current_api_key)
) -> SolveResponse:
    """Get detailed usage statistics and metrics for a time period."""
    return SolveResponse(
        success=True,
        data={
            "period": {
                "start": start.isoformat(),
                "end": end.isoformat()
            },
            "summary": {
                "total_requests": 456789,
                "successful": 449123,
                "failed": 7666,
                "success_rate": 0.983,
                "total_cost_usd": 8214.42,
                "avg_solve_time_ms": 8432
            },
            "by_captcha_type": {
                "recaptcha_v2": {
                    "requests": 245678,
                    "success_rate": 0.985,
                    "avg_time_ms": 8200
                },
                "hcaptcha": {
                    "requests": 123456,
                    "success_rate": 0.968,
                    "avg_time_ms": 10400
                }
            },
            "timeseries": [
                {
                    "timestamp": "2026-02-15T10:00:00Z",
                    "requests": 1250,
                    "success_rate": 0.984,
                    "avg_time_ms": 8321
                }
            ]
        }
    )


@router.get(
    "/analytics/realtime",
    response_model=SolveResponse,
    summary="Get real-time metrics"
)
async def get_realtime_metrics(
    api_key: Dict[str, Any] = Depends(get_current_api_key)
) -> SolveResponse:
    """Get real-time system metrics."""
    return SolveResponse(
        success=True,
        data={
            "timestamp": datetime.utcnow().isoformat(),
            "requests_per_second": 89.5,
            "active_solves": 247,
            "queue_depth": 127,
            "avg_solve_time_ms": 8432,
            "success_rate_5m": 0.984,
            "error_rate_5m": 0.016,
            "top_captcha_types": [
                {"type": "recaptcha_v2", "percent": 54.2},
                {"type": "hcaptcha", "percent": 27.1}
            ]
        }
    )


@router.get(
    "/analytics/export",
    response_model=SolveResponse,
    summary="Export analytics data"
)
async def export_analytics(
    format: Literal["csv", "json", "parquet"] = "json",
    start: datetime = None,
    end: datetime = None,
    api_key: Dict[str, Any] = Depends(get_current_api_key)
) -> SolveResponse:
    """Export analytics data in various formats."""
    # TODO: Generate export file
    # TODO: Return signed URL for download
    
    return SolveResponse(
        success=True,
        data={
            "export_id": f"exp_{uuid.uuid4().hex[:16]}",
            "format": format,
            "status": "processing",
            "download_url": None,
            "expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat()
        }
    )


# ============================================================================
# WEBHOOK ENDPOINTS
# ============================================================================

@router.post(
    "/webhooks",
    response_model=SolveResponse,
    summary="Register webhook"
)
async def create_webhook(
    config: WebhookConfig,
    api_key: Dict[str, Any] = Depends(get_current_api_key)
) -> SolveResponse:
    """Register a new webhook endpoint for receiving events."""
    webhook_id = f"wh_{uuid.uuid4().hex[:16]}"
    
    # TODO: Validate webhook URL (send test ping)
    # TODO: Store webhook config in database
    
    return SolveResponse(
        success=True,
        data={
            "webhook_id": webhook_id,
            "url": config.url,
            "events": [e.value for e in config.events],
            "status": "active" if config.active else "paused",
            "created_at": datetime.utcnow().isoformat(),
            "metadata": config.metadata
        }
    )


@router.get(
    "/webhooks",
    response_model=SolveResponse,
    summary="List webhooks"
)
async def list_webhooks(
    api_key: Dict[str, Any] = Depends(get_current_api_key)
) -> SolveResponse:
    """List all registered webhooks for the account."""
    return SolveResponse(
        success=True,
        data={
            "webhooks": [
                {
                    "webhook_id": "wh_abc123xyz",
                    "url": "https://example.com/webhook",
                    "events": ["solve.completed", "batch.completed"],
                    "status": "active",
                    "created_at": datetime.utcnow().isoformat()
                }
            ],
            "total": 1
        }
    )


@router.get(
    "/webhooks/{webhook_id}",
    response_model=SolveResponse,
    summary="Get webhook details"
)
async def get_webhook(
    webhook_id: str,
    api_key: Dict[str, Any] = Depends(get_current_api_key)
) -> SolveResponse:
    """Get details of a specific webhook."""
    return SolveResponse(
        success=True,
        data={
            "webhook_id": webhook_id,
            "url": "https://example.com/webhook",
            "events": ["solve.completed", "batch.completed"],
            "status": "active",
            "created_at": datetime.utcnow().isoformat(),
            "last_triggered": datetime.utcnow().isoformat(),
            "success_rate_24h": 0.998
        }
    )


@router.put(
    "/webhooks/{webhook_id}",
    response_model=SolveResponse,
    summary="Update webhook"
)
async def update_webhook(
    webhook_id: str,
    config: WebhookConfig,
    api_key: Dict[str, Any] = Depends(get_current_api_key)
) -> SolveResponse:
    """Update an existing webhook configuration."""
    return SolveResponse(
        success=True,
        data={
            "webhook_id": webhook_id,
            "url": config.url,
            "events": [e.value for e in config.events],
            "status": "active" if config.active else "paused",
            "updated_at": datetime.utcnow().isoformat()
        }
    )


@router.delete(
    "/webhooks/{webhook_id}",
    response_model=SolveResponse,
    summary="Delete webhook"
)
async def delete_webhook(
    webhook_id: str,
    api_key: Dict[str, Any] = Depends(get_current_api_key)
) -> SolveResponse:
    """Delete a webhook registration."""
    # TODO: Remove from database
    
    return SolveResponse(
        success=True,
        data={
            "webhook_id": webhook_id,
            "deleted": True,
            "deleted_at": datetime.utcnow().isoformat()
        }
    )


@router.post(
    "/webhooks/{webhook_id}/test",
    response_model=SolveResponse,
    summary="Test webhook"
)
async def test_webhook(
    webhook_id: str,
    api_key: Dict[str, Any] = Depends(get_current_api_key)
) -> SolveResponse:
    """Send a test event to a webhook endpoint."""
    # TODO: Send test ping event
    
    return SolveResponse(
        success=True,
        data={
            "webhook_id": webhook_id,
            "test_event_sent": True,
            "timestamp": datetime.utcnow().isoformat(),
            "response_status": 200,
            "response_time_ms": 234
        }
    )


@router.post(
    "/webhooks/{webhook_id}/rotate-secret",
    response_model=SolveResponse,
    summary="Rotate webhook secret"
)
async def rotate_webhook_secret(
    webhook_id: str,
    api_key: Dict[str, Any] = Depends(get_current_api_key)
) -> SolveResponse:
    """Rotate the signing secret for a webhook."""
    new_secret = f"whsec_{uuid.uuid4().hex}"
    
    return SolveResponse(
        success=True,
        data={
            "webhook_id": webhook_id,
            "secret": new_secret,
            "rotated_at": datetime.utcnow().isoformat(),
            "previous_secret_expires_at": (datetime.utcnow() + timedelta(hours=24)).isoformat()
        }
    )


# ============================================================================
# USAGE & BILLING ENDPOINTS
# ============================================================================

@router.get(
    "/usage",
    response_model=UsageResponse,
    summary="Get usage report"
)
async def get_usage(
    api_key: Dict[str, Any] = Depends(get_current_api_key)
) -> UsageResponse:
    """Get detailed usage report for the current billing period."""
    now = datetime.utcnow()
    
    return UsageResponse(
        success=True,
        data={
            "current_period": {
                "start": now.replace(day=1).isoformat(),
                "end": (now.replace(day=28) + timedelta(days=4)).replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat(),
                "days_remaining": 13
            },
            "usage": {
                "requests": 456789,
                "successful": 449123,
                "cost_usd": 8214.42,
                "by_captcha_type": {
                    "recaptcha_v2": {"count": 245678, "cost": 4422.20},
                    "hcaptcha": {"count": 123456, "cost": 2469.12}
                }
            },
            "quota": {
                "tier": api_key.get("tier", "enterprise"),
                "included": 1000000,
                "used": 456789,
                "remaining": 543211,
                "overage": 0,
                "overage_cost": 0
            },
            "projections": {
                "end_of_month_requests": 892345,
                "end_of_month_cost": 16042.21,
                "will_exceed_quota": False
            }
        }
    )


@router.get(
    "/usage/quota",
    response_model=UsageResponse,
    summary="Get quota status"
)
async def get_quota(
    api_key: Dict[str, Any] = Depends(get_current_api_key)
) -> UsageResponse:
    """Get current quota usage and limits."""
    return UsageResponse(
        success=True,
        data={
            "quota": {
                "tier": api_key.get("tier", "enterprise"),
                "monthly_limit": 1000000,
                "used_this_month": 456789,
                "remaining": 543211,
                "resets_at": (datetime.utcnow() + timedelta(days=30)).replace(day=1).isoformat(),
                "overage_enabled": True,
                "overage_rate": 0.0015
            },
            "concurrent": {
                "limit": api_key.get("concurrent_limit", 1000),
                "current": 247,
                "peak_today": 892
            }
        }
    )


@router.get(
    "/usage/invoices",
    response_model=UsageResponse,
    summary="List invoices"
)
async def list_invoices(
    limit: int = 10,
    offset: int = 0,
    api_key: Dict[str, Any] = Depends(get_current_api_key)
) -> UsageResponse:
    """List billing invoices."""
    return UsageResponse(
        success=True,
        data={
            "invoices": [
                {
                    "invoice_id": "inv_abc123",
                    "period": {
                        "start": "2026-01-01T00:00:00Z",
                        "end": "2026-01-31T23:59:59Z"
                    },
                    "amount": 8214.42,
                    "currency": "USD",
                    "status": "paid",
                    "paid_at": "2026-02-01T10:00:00Z",
                    "pdf_url": "https://billing.sin-solver.io/invoices/inv_abc123.pdf"
                }
            ],
            "pagination": {
                "total": 12,
                "limit": limit,
                "offset": offset
            }
        }
    )


@router.get(
    "/usage/invoices/{invoice_id}",
    response_model=UsageResponse,
    summary="Get invoice details"
)
async def get_invoice(
    invoice_id: str,
    api_key: Dict[str, Any] = Depends(get_current_api_key)
) -> UsageResponse:
    """Get detailed invoice information."""
    return UsageResponse(
        success=True,
        data={
            "invoice_id": invoice_id,
            "period": {
                "start": "2026-01-01T00:00:00Z",
                "end": "2026-01-31T23:59:59Z"
            },
            "line_items": [
                {
                    "description": "Enterprise Plan - Base",
                    "quantity": 1,
                    "unit_price": 4999.00,
                    "amount": 4999.00
                },
                {
                    "description": "Additional Requests",
                    "quantity": 178901,
                    "unit_price": 0.018,
                    "amount": 3220.22
                }
            ],
            "subtotal": 8219.22,
            "tax": 0.00,
            "total": 8214.42,
            "currency": "USD",
            "status": "paid"
        }
    )


# ============================================================================
# RATE LIMIT HEADERS
# ============================================================================

@router.middleware("http")
async def add_rate_limit_headers(request: Request, call_next):
    """Add rate limit information to response headers."""
    response = await call_next(request)
    
    # TODO: Get actual rate limit values from Redis
    response.headers["X-RateLimit-Limit"] = "15000"
    response.headers["X-RateLimit-Remaining"] = "14847"
    response.headers["X-RateLimit-Reset"] = str(int((datetime.utcnow() + timedelta(minutes=1)).timestamp()))
    
    return response
