"""Enterprise Prometheus Metrics for Delqhi-Platform.

This module provides comprehensive metrics collection for the CAPTCHA solving platform,
enabling real-time monitoring, alerting, and performance analysis.

Author: VP of Infrastructure
Version: 1.0.0
"""

import time
from typing import Optional, Dict, Any, Callable
from functools import wraps
import logging

from prometheus_client import (
    Counter,
    Histogram,
    Gauge,
    Info,
    CollectorRegistry,
    generate_latest,
    CONTENT_TYPE_LATEST,
)
from prometheus_client.exposition import choose_encoder

logger = logging.getLogger(__name__)

# Global registry for Delqhi-Platform metrics
REGISTRY = CollectorRegistry()

# =============================================================================
# CAPTCHA Solving Metrics
# =============================================================================

CAPTCHA_SOLVE_TOTAL = Counter(
    name="captcha_solve_total",
    documentation="Total number of CAPTCHA solve attempts",
    labelnames=["captcha_type", "status", "solver", "provider"],
    registry=REGISTRY,
)

CAPTCHA_SOLVE_DURATION_SECONDS = Histogram(
    name="captcha_solve_duration_seconds",
    documentation="Time spent solving CAPTCHAs in seconds",
    labelnames=["captcha_type", "solver", "provider"],
    buckets=[0.1, 0.5, 1.0, 2.0, 3.0, 5.0, 8.0, 10.0, 15.0, 20.0, 30.0, 60.0],
    registry=REGISTRY,
)

CAPTCHA_SOLVE_ACCURACY = Gauge(
    name="captcha_solve_accuracy",
    documentation="Current solve accuracy percentage by CAPTCHA type",
    labelnames=["captcha_type", "solver"],
    registry=REGISTRY,
)

CAPTCHA_SOLVE_COST_USD = Histogram(
    name="captcha_solve_cost_usd",
    documentation="Cost per CAPTCHA solve in USD",
    labelnames=["captcha_type", "provider"],
    buckets=[0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.5, 1.0],
    registry=REGISTRY,
)

CAPTCHA_QUEUE_SIZE = Gauge(
    name="captcha_queue_size",
    documentation="Current number of CAPTCHAs waiting to be processed",
    labelnames=["priority", "captcha_type"],
    registry=REGISTRY,
)

# =============================================================================
# Worker Metrics
# =============================================================================

ACTIVE_WORKERS = Gauge(
    name="active_workers",
    documentation="Number of active worker instances",
    labelnames=["worker_type", "status"],
    registry=REGISTRY,
)

WORKER_TASKS_PROCESSED = Counter(
    name="worker_tasks_processed_total",
    documentation="Total tasks processed by workers",
    labelnames=["worker_id", "worker_type", "status"],
    registry=REGISTRY,
)

WORKER_PROCESSING_TIME = Histogram(
    name="worker_processing_time_seconds",
    documentation="Time workers spend processing tasks",
    labelnames=["worker_type", "task_type"],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0],
    registry=REGISTRY,
)

WORKER_ERRORS_TOTAL = Counter(
    name="worker_errors_total",
    documentation="Total worker errors by type",
    labelnames=["worker_id", "error_type"],
    registry=REGISTRY,
)

# =============================================================================
# API Metrics
# =============================================================================

API_REQUESTS_TOTAL = Counter(
    name="api_requests_total",
    documentation="Total API requests",
    labelnames=["endpoint", "method", "status_code", "user_agent"],
    registry=REGISTRY,
)

API_REQUEST_DURATION_SECONDS = Histogram(
    name="api_request_duration_seconds",
    documentation="API request duration in seconds",
    labelnames=["endpoint", "method"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
    registry=REGISTRY,
)

API_RATE_LIMIT_HITS = Counter(
    name="api_rate_limit_hits_total",
    documentation="Total rate limit hits",
    labelnames=["endpoint", "client_ip"],
    registry=REGISTRY,
)

API_ACTIVE_CONNECTIONS = Gauge(
    name="api_active_connections",
    documentation="Number of active API connections",
    registry=REGISTRY,
)

# =============================================================================
# AI Model Metrics
# =============================================================================

MODEL_INFERENCE_DURATION = Histogram(
    name="model_inference_duration_seconds",
    documentation="AI model inference time",
    labelnames=["model", "provider", "task_type"],
    buckets=[0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0],
    registry=REGISTRY,
)

MODEL_TOKENS_USED = Counter(
    name="model_tokens_used_total",
    documentation="Total tokens used by AI models",
    labelnames=["model", "provider", "token_type"],
    registry=REGISTRY,
)

MODEL_AVAILABILITY = Gauge(
    name="model_availability",
    documentation="Model availability status (1=available, 0=unavailable)",
    labelnames=["model", "provider"],
    registry=REGISTRY,
)

MODEL_CONFIDENCE_SCORE = Histogram(
    name="model_confidence_score",
    documentation="Model confidence scores distribution",
    labelnames=["model", "captcha_type"],
    buckets=[0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 0.99, 1.0],
    registry=REGISTRY,
)

# =============================================================================
# System Metrics
# =============================================================================

SYSTEM_INFO = Info(
    name="system_info",
    documentation="System information",
    registry=REGISTRY,
)

CACHE_HIT_RATIO = Gauge(
    name="cache_hit_ratio",
    documentation="Cache hit ratio percentage",
    labelnames=["cache_type"],
    registry=REGISTRY,
)

CACHE_SIZE = Gauge(
    name="cache_size_bytes",
    documentation="Current cache size in bytes",
    labelnames=["cache_type"],
    registry=REGISTRY,
)

DATABASE_CONNECTIONS = Gauge(
    name="database_connections",
    documentation="Database connection pool status",
    labelnames=["pool", "state"],
    registry=REGISTRY,
)

EXTERNAL_API_LATENCY = Histogram(
    name="external_api_latency_seconds",
    documentation="External API call latency",
    labelnames=["api_name", "endpoint"],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0],
    registry=REGISTRY,
)

EXTERNAL_API_ERRORS = Counter(
    name="external_api_errors_total",
    documentation="External API error count",
    labelnames=["api_name", "error_type"],
    registry=REGISTRY,
)

# =============================================================================
# Business Metrics
# =============================================================================

REVENUE_PER_SOLVE = Histogram(
    name="revenue_per_solve_usd",
    documentation="Revenue generated per solve",
    buckets=[0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1.0],
    registry=REGISTRY,
)

USER_SESSIONS_ACTIVE = Gauge(
    name="user_sessions_active",
    documentation="Number of active user sessions",
    labelnames=["tier"],
    registry=REGISTRY,
)

REQUESTS_BY_TIER = Counter(
    name="requests_by_tier_total",
    documentation="Total requests by user tier",
    labelnames=["tier", "endpoint"],
    registry=REGISTRY,
)


# =============================================================================
# Metrics Collection Helpers
# =============================================================================

class MetricsCollector:
    """Centralized metrics collection for Delqhi-Platform operations."""
    
    def __init__(self):
        self._solve_start_times: Dict[str, float] = {}
        self._accuracy_counters: Dict[str, Dict[str, int]] = {}
    
    def record_solve_attempt(
        self,
        captcha_type: str,
        solver: str,
        provider: str,
        status: str = "attempted",
    ) -> None:
        """Record a CAPTCHA solve attempt.
        
        Args:
            captcha_type: Type of CAPTCHA (recaptcha_v2, hcaptcha, etc.)
            solver: Solver name (gemini, mistral, yolo, etc.)
            provider: AI provider (google, openai, self_hosted)
            status: Status (attempted, success, failed, timeout)
        """
        CAPTCHA_SOLVE_TOTAL.labels(
            captcha_type=captcha_type,
            status=status,
            solver=solver,
            provider=provider,
        ).inc()
        logger.debug(f"Recorded solve attempt: {captcha_type} via {solver}")
    
    def start_solve_timing(self, solve_id: str) -> None:
        """Start timing a solve operation.
        
        Args:
            solve_id: Unique identifier for this solve operation
        """
        self._solve_start_times[solve_id] = time.time()
    
    def record_solve_duration(
        self,
        solve_id: str,
        captcha_type: str,
        solver: str,
        provider: str,
    ) -> float:
        """Record the duration of a solve operation.
        
        Args:
            solve_id: Unique identifier from start_solve_timing
            captcha_type: Type of CAPTCHA
            solver: Solver name
            provider: AI provider
            
        Returns:
            Duration in seconds
        """
        start_time = self._solve_start_times.pop(solve_id, None)
        if start_time is None:
            logger.warning(f"No start time found for solve_id: {solve_id}")
            return 0.0
        
        duration = time.time() - start_time
        CAPTCHA_SOLVE_DURATION_SECONDS.labels(
            captcha_type=captcha_type,
            solver=solver,
            provider=provider,
        ).observe(duration)
        return duration
    
    def update_accuracy(
        self,
        captcha_type: str,
        solver: str,
        total_attempts: int,
        successful_attempts: int,
    ) -> None:
        """Update solve accuracy gauge.
        
        Args:
            captcha_type: Type of CAPTCHA
            solver: Solver name
            total_attempts: Total number of attempts
            successful_attempts: Number of successful solves
        """
        if total_attempts > 0:
            accuracy = (successful_attempts / total_attempts) * 100
            CAPTCHA_SOLVE_ACCURACY.labels(
                captcha_type=captcha_type,
                solver=solver,
            ).set(accuracy)
    
    def record_solve_cost(
        self,
        captcha_type: str,
        provider: str,
        cost_usd: float,
    ) -> None:
        """Record the cost of a CAPTCHA solve.
        
        Args:
            captcha_type: Type of CAPTCHA
            provider: AI provider used
            cost_usd: Cost in USD
        """
        CAPTCHA_SOLVE_COST_USD.labels(
            captcha_type=captcha_type,
            provider=provider,
        ).observe(cost_usd)
    
    def update_active_workers(
        self,
        worker_type: str,
        status: str,
        count: int,
    ) -> None:
        """Update active workers gauge.
        
        Args:
            worker_type: Type of worker (browser, solver, orchestrator)
            status: Worker status (idle, busy, offline)
            count: Number of workers
        """
        ACTIVE_WORKERS.labels(
            worker_type=worker_type,
            status=status,
        ).set(count)
    
    def record_model_inference(
        self,
        model: str,
        provider: str,
        task_type: str,
        duration: float,
        tokens_input: int = 0,
        tokens_output: int = 0,
    ) -> None:
        """Record AI model inference metrics.
        
        Args:
            model: Model name (gemini-pro, mistral-large, etc.)
            provider: Provider name
            task_type: Type of task (captcha_solve, analysis)
            duration: Inference duration in seconds
            tokens_input: Number of input tokens
            tokens_output: Number of output tokens
        """
        MODEL_INFERENCE_DURATION.labels(
            model=model,
            provider=provider,
            task_type=task_type,
        ).observe(duration)
        
        if tokens_input > 0:
            MODEL_TOKENS_USED.labels(
                model=model,
                provider=provider,
                token_type="input",
            ).inc(tokens_input)
        
        if tokens_output > 0:
            MODEL_TOKENS_USED.labels(
                model=model,
                provider=provider,
                token_type="output",
            ).inc(tokens_output)
    
    def set_model_availability(
        self,
        model: str,
        provider: str,
        available: bool,
    ) -> None:
        """Set model availability status.
        
        Args:
            model: Model name
            provider: Provider name
            available: True if available, False otherwise
        """
        MODEL_AVAILABILITY.labels(
            model=model,
            provider=provider,
        ).set(1.0 if available else 0.0)


# Global metrics collector instance
metrics_collector = MetricsCollector()


def timed(metric: Histogram, labels: Optional[Dict[str, str]] = None):
    """Decorator to time function execution and record to histogram.
    
    Args:
        metric: Prometheus Histogram to record to
        labels: Optional labels to apply
        
    Example:
        @timed(CAPTCHA_SOLVE_DURATION_SECONDS, {"captcha_type": "recaptcha"})
        async def solve_captcha(image: bytes) -> str:
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start = time.time()
            try:
                return await func(*args, **kwargs)
            finally:
                duration = time.time() - start
                label_values = labels or {}
                metric.labels(**label_values).observe(duration)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start = time.time()
            try:
                return func(*args, **kwargs)
            finally:
                duration = time.time() - start
                label_values = labels or {}
                metric.labels(**label_values).observe(duration)
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator


def get_metrics_response() -> tuple:
    """Generate Prometheus metrics HTTP response.
    
    Returns:
        Tuple of (content_type, body)
    """
    body = generate_latest(REGISTRY)
    return CONTENT_TYPE_LATEST, body


# Import asyncio here to avoid circular import issues with decorator
import asyncio
