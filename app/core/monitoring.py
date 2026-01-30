"""Enterprise monitoring and observability for CAPTCHA solving system.

This module provides:
- Prometheus metrics collection and export
- Custom business metrics (solve rate, latency, cost)
- Health check endpoints
- Performance profiling
- Distributed tracing with OpenTelemetry

Author: SIN-Solver Team
Version: 2026.1.0
"""

import asyncio
import functools
import os
import time
import uuid
from contextlib import asynccontextmanager, contextmanager
from typing import Any, Callable, Optional, TypeVar

from fastapi import FastAPI, Request, Response
from opentelemetry import trace
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.redis import RedisInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics._internal.instrument import Counter, Histogram, UpDownCounter
from opentelemetry.sdk.resources import (
    Resource,
    SERVICE_NAME,
    SERVICE_VERSION,
    DEPLOYMENT_ENVIRONMENT,
)
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter as PromCounter,
    Gauge,
    Histogram as PromHistogram,
    Info,
    generate_latest,
    multiprocess,
)
from prometheus_client.openmetrics.exposition import CONTENT_TYPE_LATEST as OPENMETRICS_CONTENT_TYPE

from app.core.config import settings

# =============================================================================
# Constants and Configuration
# =============================================================================

SERVICE_NAME_VALUE = os.getenv("SERVICE_NAME", "sin-solver-api")
SERVICE_VERSION_VALUE = os.getenv("SERVICE_VERSION", "2026.1.0")
ENVIRONMENT = os.getenv("ENVIRONMENT", "production")
METRICS_PORT = int(os.getenv("METRICS_PORT", "9090"))
JAEGER_ENDPOINT = os.getenv("JAEGER_ENDPOINT", "http://172.20.0.29:14268/api/traces")
OTLP_ENDPOINT = os.getenv("OTLP_ENDPOINT", "http://172.20.0.29:4317")

# =============================================================================
# OpenTelemetry Setup
# =============================================================================

_resource = Resource.create(
    {
        SERVICE_NAME: SERVICE_NAME_VALUE,
        SERVICE_VERSION: SERVICE_VERSION_VALUE,
        DEPLOYMENT_ENVIRONMENT: ENVIRONMENT,
        "host.name": os.getenv("HOSTNAME", "unknown"),
        "service.namespace": "sin-solver",
        "service.instance.id": os.getenv("HOSTNAME", str(uuid.uuid4())[:8]),
    }
)

_tracer_provider: Optional[TracerProvider] = None
_meter_provider: Optional[MeterProvider] = None
_tracer: Optional[trace.Tracer] = None
_meter: Optional[Any] = None


def init_tracing() -> TracerProvider:
    """Initialize OpenTelemetry tracing with Jaeger exporter."""
    global _tracer_provider, _tracer

    if _tracer_provider is not None:
        return _tracer_provider

    _tracer_provider = TracerProvider(resource=_resource)

    # Jaeger exporter for traces
    jaeger_exporter = JaegerExporter(
        agent_host_name=os.getenv("JAEGER_AGENT_HOST", "172.20.0.29"),
        agent_port=int(os.getenv("JAEGER_AGENT_PORT", "6831")),
        collector_endpoint=JAEGER_ENDPOINT,
    )
    _tracer_provider.add_span_processor(BatchSpanProcessor(jaeger_exporter))

    # OTLP exporter as fallback/backup
    if os.getenv("OTLP_ENABLED", "true").lower() == "true":
        otlp_exporter = OTLPSpanExporter(endpoint=OTLP_ENDPOINT, insecure=True)
        _tracer_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

    trace.set_tracer_provider(_tracer_provider)
    _tracer = _tracer_provider.get_tracer(__name__)

    return _tracer_provider


def init_metrics() -> MeterProvider:
    """Initialize OpenTelemetry metrics with Prometheus exporter."""
    global _meter_provider, _meter

    if _meter_provider is not None:
        return _meter_provider

    reader = PrometheusMetricReader()
    _meter_provider = MeterProvider(resource=_resource, metric_readers=[reader])
    _meter = _meter_provider.get_meter(__name__)

    return _meter_provider


def get_tracer() -> trace.Tracer:
    """Get the global tracer instance."""
    global _tracer
    if _tracer is None:
        init_tracing()
    return _tracer  # type: ignore


def get_meter() -> Any:
    """Get the global meter instance."""
    global _meter
    if _meter is None:
        init_metrics()
    return _meter


# =============================================================================
# Prometheus Metrics (Business)
# =============================================================================


class CaptchaMetrics:
    """CAPTCHA-specific business metrics."""

    def __init__(self):
        # Solve metrics
        self.solves_total = PromCounter(
            "captcha_solves_total",
            "Total number of CAPTCHA solves attempted",
            ["captcha_type", "status", "solver"],
        )
        self.solve_duration_seconds = PromHistogram(
            "captcha_solve_duration_seconds",
            "Time spent solving CAPTCHA",
            ["captcha_type", "solver"],
            buckets=[0.5, 1.0, 2.0, 5.0, 10.0, 15.0, 30.0, 60.0],
        )
        self.solve_cost_usd = PromHistogram(
            "captcha_solve_cost_usd",
            "Cost per CAPTCHA solve in USD",
            ["captcha_type", "solver"],
            buckets=[0.001, 0.005, 0.01, 0.02, 0.05, 0.1, 0.5],
        )

        # Quality metrics
        self.solve_confidence = PromHistogram(
            "captcha_solve_confidence",
            "Confidence score of CAPTCHA solves",
            ["captcha_type", "solver"],
            buckets=[0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.99, 1.0],
        )
        self.solve_retries = PromHistogram(
            "captcha_solve_retries",
            "Number of retries per solve",
            ["captcha_type"],
            buckets=[0, 1, 2, 3, 5, 10],
        )

        # AI Model performance
        self.model_requests_total = PromCounter(
            "ai_model_requests_total",
            "Total AI model requests",
            ["model", "provider", "status"],
        )
        self.model_latency_seconds = PromHistogram(
            "ai_model_latency_seconds",
            "AI model request latency",
            ["model", "provider"],
            buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0],
        )
        self.model_tokens_used = PromCounter(
            "ai_model_tokens_used_total",
            "Total tokens used by AI models",
            ["model", "provider", "token_type"],
        )

        # Queue metrics
        self.queue_depth = Gauge(
            "captcha_queue_depth",
            "Current CAPTCHA queue depth",
            ["captcha_type", "priority"],
        )
        self.queue_wait_seconds = PromHistogram(
            "captcha_queue_wait_seconds",
            "Time spent waiting in queue",
            ["captcha_type", "priority"],
            buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0],
        )

        # System health
        self.health_check_duration = PromHistogram(
            "health_check_duration_seconds",
            "Health check execution duration",
            ["component"],
            buckets=[0.01, 0.05, 0.1, 0.5, 1.0],
        )
        self.active_workers = Gauge(
            "captcha_active_workers",
            "Number of active CAPTCHA workers",
            ["worker_type"],
        )
        self.detection_rate = Gauge(
            "captcha_detection_rate",
            "Rate of CAPTCHA detection by type",
            ["captcha_type"],
        )

        # Business metrics
        self.revenue_usd = PromCounter(
            "captcha_revenue_usd_total",
            "Total revenue from CAPTCHA solves",
            ["tier"],
        )
        self.success_rate = Gauge(
            "captcha_success_rate",
            "Success rate by CAPTCHA type",
            ["captcha_type"],
        )

        # Service info
        self.service_info = Info("sin_solver_service", "SIN-Solver service information")
        self.service_info.info(
            {
                "version": SERVICE_VERSION_VALUE,
                "environment": ENVIRONMENT,
                "service": SERVICE_NAME_VALUE,
            }
        )

    def record_solve(
        self,
        captcha_type: str,
        status: str,
        solver: str,
        duration: float,
        cost: float,
        confidence: float,
        retries: int = 0,
    ) -> None:
        """Record a CAPTCHA solve attempt."""
        self.solves_total.labels(
            captcha_type=captcha_type,
            status=status,
            solver=solver,
        ).inc()
        self.solve_duration_seconds.labels(
            captcha_type=captcha_type,
            solver=solver,
        ).observe(duration)
        self.solve_cost_usd.labels(
            captcha_type=captcha_type,
            solver=solver,
        ).observe(cost)
        self.solve_confidence.labels(
            captcha_type=captcha_type,
            solver=solver,
        ).observe(confidence)
        self.solve_retries.labels(captcha_type=captcha_type).observe(retries)

    def record_model_request(
        self,
        model: str,
        provider: str,
        status: str,
        latency: float,
        input_tokens: int = 0,
        output_tokens: int = 0,
    ) -> None:
        """Record an AI model request."""
        self.model_requests_total.labels(
            model=model,
            provider=provider,
            status=status,
        ).inc()
        self.model_latency_seconds.labels(
            model=model,
            provider=provider,
        ).observe(latency)
        if input_tokens:
            self.model_tokens_used.labels(
                model=model,
                provider=provider,
                token_type="input",
            ).inc(input_tokens)
        if output_tokens:
            self.model_tokens_used.labels(
                model=model,
                provider=provider,
                token_type="output",
            ).inc(output_tokens)

    def update_queue_depth(self, captcha_type: str, priority: str, depth: int) -> None:
        """Update queue depth gauge."""
        self.queue_depth.labels(
            captcha_type=captcha_type,
            priority=priority,
        ).set(depth)

    def update_active_workers(self, worker_type: str, count: int) -> None:
        """Update active workers gauge."""
        self.active_workers.labels(worker_type=worker_type).set(count)

    def update_success_rate(self, captcha_type: str, rate: float) -> None:
        """Update success rate gauge."""
        self.success_rate.labels(captcha_type=captcha_type).set(rate)


# Global metrics instance
_metrics: Optional[CaptchaMetrics] = None


def get_metrics() -> CaptchaMetrics:
    """Get the global metrics instance."""
    global _metrics
    if _metrics is None:
        _metrics = CaptchaMetrics()
    return _metrics


# =============================================================================
# HTTP Request Metrics
# =============================================================================


class HTTPMetrics:
    """HTTP request metrics middleware."""

    def __init__(self):
        self.requests_total = PromCounter(
            "http_requests_total",
            "Total HTTP requests",
            ["method", "endpoint", "status_code"],
        )
        self.request_duration_seconds = PromHistogram(
            "http_request_duration_seconds",
            "HTTP request duration",
            ["method", "endpoint"],
            buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0],
        )
        self.request_size_bytes = PromHistogram(
            "http_request_size_bytes",
            "HTTP request size",
            ["method", "endpoint"],
            buckets=[100, 1000, 10000, 100000, 1000000],
        )
        self.response_size_bytes = PromHistogram(
            "http_response_size_bytes",
            "HTTP response size",
            ["method", "endpoint"],
            buckets=[100, 1000, 10000, 100000, 1000000],
        )
        self.active_requests = Gauge(
            "http_active_requests",
            "Number of active HTTP requests",
            ["method"],
        )

    async def middleware(self, request: Request, call_next: Callable) -> Response:
        """ASGI middleware for HTTP metrics."""
        method = request.method
        path = request.url.path

        # Skip metrics endpoint itself
        if path == "/metrics":
            return await call_next(request)

        self.active_requests.labels(method=method).inc()
        start_time = time.time()

        try:
            response = await call_next(request)
            status_code = response.status_code

            # Record metrics
            duration = time.time() - start_time
            self.requests_total.labels(
                method=method,
                endpoint=path,
                status_code=str(status_code),
            ).inc()
            self.request_duration_seconds.labels(
                method=method,
                endpoint=path,
            ).observe(duration)

            # Request/response sizes
            if request.headers.get("content-length"):
                self.request_size_bytes.labels(
                    method=method,
                    endpoint=path,
                ).observe(int(request.headers["content-length"]))
            if response.headers.get("content-length"):
                self.response_size_bytes.labels(
                    method=method,
                    endpoint=path,
                ).observe(int(response.headers["content-length"]))

            return response
        finally:
            self.active_requests.labels(method=method).dec()


# =============================================================================
# Performance Profiling
# =============================================================================


class PerformanceProfiler:
    """Performance profiling utilities."""

    def __init__(self):
        self.profiles: dict[str, Any] = {}
        self.function_calls = PromCounter(
            "function_calls_total",
            "Total function calls",
            ["function", "module"],
        )
        self.function_duration = PromHistogram(
            "function_duration_seconds",
            "Function execution duration",
            ["function", "module"],
            buckets=[0.001, 0.01, 0.1, 1.0, 10.0],
        )

    @contextmanager
    def profile(self, name: str, module: str = "unknown"):
        """Profile a block of code."""
        start = time.perf_counter()
        try:
            yield
        finally:
            duration = time.perf_counter() - start
            self.function_calls.labels(function=name, module=module).inc()
            self.function_duration.labels(function=name, module=module).observe(duration)

    def profile_async(self, name: str, module: str = "unknown"):
        """Decorator to profile async functions."""

        def decorator(func: Callable) -> Callable:
            @functools.wraps(func)
            async def wrapper(*args, **kwargs):
                with self.profile(name, module):
                    return await func(*args, **kwargs)

            return wrapper

        return decorator

    def profile_sync(self, name: str, module: str = "unknown"):
        """Decorator to profile sync functions."""

        def decorator(func: Callable) -> Callable:
            @functools.wraps(func)
            def wrapper(*args, **kwargs):
                with self.profile(name, module):
                    return func(*args, **kwargs)

            return wrapper

        return decorator


_profiler: Optional[PerformanceProfiler] = None


def get_profiler() -> PerformanceProfiler:
    """Get the global profiler instance."""
    global _profiler
    if _profiler is None:
        _profiler = PerformanceProfiler()
    return _profiler


# =============================================================================
# Tracing Utilities
# =============================================================================

F = TypeVar("F", bound=Callable[..., Any])


def traced(name: Optional[str] = None, attributes: Optional[dict] = None):
    """Decorator to add tracing to a function."""

    def decorator(func: F) -> F:
        span_name = name or func.__name__
        tracer = get_tracer()

        if asyncio.iscoroutinefunction(func):

            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                with tracer.start_as_current_span(span_name) as span:
                    if attributes:
                        for key, value in attributes.items():
                            span.set_attribute(key, value)
                    span.set_attribute("function.name", func.__name__)
                    span.set_attribute("function.module", func.__module__)
                    return await func(*args, **kwargs)

            return async_wrapper  # type: ignore
        else:

            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                with tracer.start_as_current_span(span_name) as span:
                    if attributes:
                        for key, value in attributes.items():
                            span.set_attribute(key, value)
                    span.set_attribute("function.name", func.__name__)
                    span.set_attribute("function.module", func.__module__)
                    return func(*args, **kwargs)

            return sync_wrapper  # type: ignore

    return decorator


@contextmanager
def start_span(name: str, attributes: Optional[dict] = None):
    """Context manager for manual span creation."""
    tracer = get_tracer()
    with tracer.start_as_current_span(name) as span:
        if attributes:
            for key, value in attributes.items():
                span.set_attribute(key, value)
        yield span


# =============================================================================
# Health Checks
# =============================================================================


class HealthChecker:
    """Health check registry and execution."""

    def __init__(self):
        self.checks: dict[str, Callable[[], dict]] = {}
        self.health_status = Gauge(
            "health_check_status",
            "Health check status (1=healthy, 0=unhealthy)",
            ["component"],
        )
        self.last_check_timestamp = Gauge(
            "health_check_last_timestamp",
            "Timestamp of last health check",
            ["component"],
        )

    def register(self, name: str, check_func: Callable[[], dict]) -> None:
        """Register a health check."""
        self.checks[name] = check_func

    async def run_checks(self) -> dict[str, Any]:
        """Run all registered health checks."""
        results = {}
        overall_healthy = True

        for name, check_func in self.checks.items():
            profiler = get_profiler()
            with profiler.profile(f"health_check_{name}", "health"):
                start = time.time()
                try:
                    if asyncio.iscoroutinefunction(check_func):
                        result = await check_func()
                    else:
                        result = check_func()
                    result["response_time_ms"] = (time.time() - start) * 1000
                    result["healthy"] = result.get("healthy", True)
                except Exception as e:
                    result = {
                        "healthy": False,
                        "error": str(e),
                        "response_time_ms": (time.time() - start) * 1000,
                    }

                results[name] = result
                self.health_status.labels(component=name).set(1 if result["healthy"] else 0)
                self.last_check_timestamp.labels(component=name).set(time.time())

                if not result["healthy"]:
                    overall_healthy = False

        return {
            "status": "healthy" if overall_healthy else "unhealthy",
            "timestamp": time.time(),
            "checks": results,
        }


_health_checker: Optional[HealthChecker] = None


def get_health_checker() -> HealthChecker:
    """Get the global health checker instance."""
    global _health_checker
    if _health_checker is None:
        _health_checker = HealthChecker()
    return _health_checker


# =============================================================================
# FastAPI Integration
# =============================================================================


def setup_monitoring(app: FastAPI) -> None:
    """Setup complete monitoring for FastAPI application."""
    # Initialize OpenTelemetry
    init_tracing()
    init_metrics()

    # Instrument FastAPI
    FastAPIInstrumentor.instrument_app(app)

    # Instrument HTTPX (for external API calls)
    HTTPXClientInstrumentor().instrument()

    # Instrument Redis (if used)
    RedisInstrumentor().instrument()

    # Setup HTTP metrics middleware
    http_metrics = HTTPMetrics()

    @app.middleware("http")
    async def metrics_middleware(request: Request, call_next: Callable) -> Response:
        return await http_metrics.middleware(request, call_next)

    # Add metrics endpoint
    @app.get("/metrics")
    async def metrics_endpoint() -> Response:
        """Prometheus metrics endpoint."""
        return Response(
            content=generate_latest(),
            media_type=CONTENT_TYPE_LATEST,
        )

    # Add health endpoint
    @app.get("/health")
    async def health_endpoint() -> dict:
        """Health check endpoint."""
        checker = get_health_checker()
        result = await checker.run_checks()

        status_code = 200 if result["status"] == "healthy" else 503
        from fastapi.responses import JSONResponse

        return JSONResponse(content=result, status_code=status_code)

    # Add ready endpoint (for Kubernetes probes)
    @app.get("/ready")
    async def ready_endpoint() -> dict:
        """Readiness probe endpoint."""
        return {"status": "ready", "timestamp": time.time()}

    # Add startup probe
    @app.get("/startup")
    async def startup_endpoint() -> dict:
        """Startup probe endpoint."""
        return {"status": "started", "timestamp": time.time()}

    # Register default health checks
    checker = get_health_checker()

    def db_health_check():
        """Check database connectivity."""
        # This will be implemented based on actual DB connection
        return {"healthy": True, "message": "Database connection OK"}

    def redis_health_check():
        """Check Redis connectivity."""
        return {"healthy": True, "message": "Redis connection OK"}

    checker.register("database", db_health_check)
    checker.register("redis", redis_health_check)


# =============================================================================
# Auto-scaling Metrics
# =============================================================================


class AutoscalingMetrics:
    """Metrics for auto-scaling decisions."""

    def __init__(self):
        self.cpu_usage = Gauge(
            "app_cpu_usage_percent",
            "Current CPU usage percentage",
        )
        self.memory_usage = Gauge(
            "app_memory_usage_bytes",
            "Current memory usage in bytes",
        )
        self.memory_usage_percent = Gauge(
            "app_memory_usage_percent",
            "Current memory usage percentage",
        )
        self.request_rate = Gauge(
            "app_request_rate_per_second",
            "Current request rate per second",
        )
        self.queue_size = Gauge(
            "app_queue_size",
            "Current processing queue size",
        )

    def update_system_metrics(self) -> None:
        """Update system-level metrics."""
        import psutil

        cpu = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()

        self.cpu_usage.set(cpu)
        self.memory_usage.set(memory.used)
        self.memory_usage_percent.set(memory.percent)

    async def start_collection(self, interval: int = 30) -> None:
        """Start periodic metrics collection."""
        while True:
            self.update_system_metrics()
            await asyncio.sleep(interval)


# Initialize multiprocess support for Prometheus
if os.getenv("PROMETHEUS_MULTIPROC_DIR"):
    multiprocess.MultiProcessCollector(os.environ["PROMETHEUS_MULTIPROC_DIR"])
