"""Distributed Tracing for Delqhi-Platform using OpenTelemetry.

Provides end-to-end tracing for the CAPTCHA solve pipeline with span context
propagation for distributed systems.

Author: VP of Infrastructure
Version: 1.0.0
"""

import logging
import functools
from typing import Optional, Dict, Any, Callable, TypeVar
from contextlib import contextmanager

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider, ReadableSpan
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION, DEPLOYMENT_ENVIRONMENT
from opentelemetry.trace import Status, StatusCode, SpanKind, SpanContext
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from opentelemetry.baggage.propagation import W3CBaggagePropagator
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter as HTTPOTLPSpanExporter

from fastapi import Request, Response

from app.core.config import settings

logger = logging.getLogger(__name__)

# Type variable for generic function wrapping
F = TypeVar("F", bound=Callable[..., Any])

# Propagators for distributed tracing
TRACE_PROPAGATOR = TraceContextTextMapPropagator()
BAGGAGE_PROPAGATOR = W3CBaggagePropagator()


def create_tracer_provider(
    service_name: str = "sin-solver",
    environment: str = "production",
    otlp_endpoint: Optional[str] = None,
    otlp_headers: Optional[Dict[str, str]] = None,
) -> TracerProvider:
    """Create and configure the OpenTelemetry tracer provider.
    
    Args:
        service_name: Name of the service
        environment: Deployment environment (production, staging, development)
        otlp_endpoint: OTLP collector endpoint (optional)
        otlp_headers: Headers for OTLP exporter (optional)
        
    Returns:
        Configured TracerProvider
    """
    resource = Resource.create({
        SERVICE_NAME: service_name,
        SERVICE_VERSION: "2.0.0",
        DEPLOYMENT_ENVIRONMENT: environment,
        "service.namespace": "sin-solver",
        "host.name": settings.role,
    })
    
    provider = TracerProvider(resource=resource)
    
    # Add OTLP exporter if endpoint configured
    if otlp_endpoint:
        try:
            if otlp_endpoint.startswith("http"):
                exporter = HTTPOTLPSpanExporter(
                    endpoint=otlp_endpoint,
                    headers=otlp_headers,
                )
            else:
                exporter = OTLPSpanExporter(
                    endpoint=otlp_endpoint,
                    headers=otlp_headers,
                )
            processor = BatchSpanProcessor(exporter)
            provider.add_span_processor(processor)
            logger.info(f"OTLP exporter configured: {otlp_endpoint}")
        except Exception as e:
            logger.warning(f"Failed to configure OTLP exporter: {e}")
    
    # Add console exporter for debugging in development
    if settings.debug or environment == "development":
        console_processor = BatchSpanProcessor(ConsoleSpanExporter())
        provider.add_span_processor(console_processor)
        logger.info("Console span exporter configured for debugging")
    
    # Set as global provider
    trace.set_tracer_provider(provider)
    
    return provider


# Global tracer
tracer = trace.get_tracer("sin-solver", "2.0.0")


class TracingContext:
    """Context manager for manual span creation."""
    
    def __init__(
        self,
        name: str,
        kind: SpanKind = SpanKind.INTERNAL,
        attributes: Optional[Dict[str, Any]] = None,
    ):
        self.name = name
        self.kind = kind
        self.attributes = attributes or {}
        self.span = None
        self.token = None
    
    def __enter__(self):
        self.span = tracer.start_span(self.name, kind=self.kind)
        for key, value in self.attributes.items():
            self.span.set_attribute(key, value)
        self.token = trace.use_span(self.span, end_on_exit=False)
        self.token.__enter__()
        return self.span
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_val:
            self.span.set_status(Status(StatusCode.ERROR, str(exc_val)))
            self.span.record_exception(exc_val)
        self.token.__exit__(exc_type, exc_val, exc_tb)
        self.span.end()


@contextmanager
def start_span(
    name: str,
    kind: SpanKind = SpanKind.INTERNAL,
    attributes: Optional[Dict[str, Any]] = None,
):
    """Context manager for starting a span.
    
    Args:
        name: Span name
        kind: Span kind (INTERNAL, SERVER, CLIENT, PRODUCER, CONSUMER)
        attributes: Initial span attributes
        
    Example:
        with start_span("solve_captcha", SpanKind.INTERNAL, {"captcha_type": "recaptcha"}) as span:
            result = process_captcha(image)
            span.set_attribute("result", result)
    """
    attributes = attributes or {}
    with tracer.start_as_current_span(name, kind=kind) as span:
        for key, value in attributes.items():
            span.set_attribute(key, value)
        yield span


def trace_function(
    name: Optional[str] = None,
    kind: SpanKind = SpanKind.INTERNAL,
    attributes: Optional[Dict[str, Any]] = None,
):
    """Decorator to trace function execution.
    
    Args:
        name: Span name (defaults to function name)
        kind: Span kind
        attributes: Static attributes to add to span
        
    Example:
        @trace_function(name="classify_image", attributes={"model": "yolov8"})
        async def classify_image(image: bytes) -> str:
            ...
    """
    def decorator(func: F) -> F:
        span_name = name or func.__name__
        static_attrs = attributes or {}
        
        if asyncio.iscoroutinefunction(func):
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                with tracer.start_as_current_span(span_name, kind=kind) as span:
                    # Add static attributes
                    for key, value in static_attrs.items():
                        span.set_attribute(key, value)
                    
                    # Add function arguments as attributes (sanitized)
                    for i, arg in enumerate(args):
                        if i == 0 and hasattr(arg, "__class__"):
                            # Skip self/cls
                            continue
                        span.set_attribute(f"arg_{i}", str(arg)[:100])
                    
                    for key, value in kwargs.items():
                        span.set_attribute(f"kwarg_{key}", str(value)[:100])
                    
                    try:
                        result = await func(*args, **kwargs)
                        span.set_attribute("result_type", type(result).__name__)
                        return result
                    except Exception as e:
                        span.set_status(Status(StatusCode.ERROR, str(e)))
                        span.record_exception(e)
                        raise
            
            return async_wrapper  # type: ignore
        else:
            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                with tracer.start_as_current_span(span_name, kind=kind) as span:
                    for key, value in static_attrs.items():
                        span.set_attribute(key, value)
                    
                    for i, arg in enumerate(args):
                        if i == 0 and hasattr(arg, "__class__"):
                            continue
                        span.set_attribute(f"arg_{i}", str(arg)[:100])
                    
                    for key, value in kwargs.items():
                        span.set_attribute(f"kwarg_{key}", str(value)[:100])
                    
                    try:
                        result = func(*args, **kwargs)
                        span.set_attribute("result_type", type(result).__name__)
                        return result
                    except Exception as e:
                        span.set_status(Status(StatusCode.ERROR, str(e)))
                        span.record_exception(e)
                        raise
            
            return sync_wrapper  # type: ignore
    
    return decorator


# Import asyncio here to avoid issues with decorator
import asyncio


class CaptchaSolvePipelineTracer:
    """Specialized tracer for CAPTCHA solve pipeline.
    
    Provides structured tracing for the end-to-end CAPTCHA solving process
    including detection, classification, solving, and validation phases.
    """
    
    PIPELINE_STAGES = [
        "receive_request",
        "validate_input",
        "detect_captcha_type",
        "load_models",
        "preprocess_image",
        "select_solver",
        "run_inference",
        "postprocess_result",
        "validate_solution",
        "cache_result",
        "return_response",
    ]
    
    def __init__(self):
        self.tracer = tracer
    
    async def trace_solve_pipeline(
        self,
        captcha_type: str,
        solver: str,
        provider: str,
        solve_func: Callable,
        *args,
        **kwargs,
    ) -> Any:
        """Trace the entire CAPTCHA solve pipeline.
        
        Args:
            captcha_type: Type of CAPTCHA
            solver: Solver name
            provider: AI provider
            solve_func: The solve function to trace
            *args: Arguments to pass to solve function
            **kwargs: Keyword arguments to pass to solve function
            
        Returns:
            Result from solve function
        """
        with tracer.start_as_current_span(
            "captcha_solve_pipeline",
            kind=SpanKind.SERVER,
        ) as root_span:
            # Set pipeline-level attributes
            root_span.set_attributes({
                "captcha.type": captcha_type,
                "captcha.solver": solver,
                "captcha.provider": provider,
                "pipeline.stages": len(self.PIPELINE_STAGES),
            })
            
            # Track each pipeline stage
            stage_results = {}
            
            for stage in self.PIPELINE_STAGES:
                with tracer.start_as_current_span(
                    f"pipeline.stage.{stage}",
                    kind=SpanKind.INTERNAL,
                ) as stage_span:
                    stage_span.set_attribute("stage.name", stage)
                    stage_start = asyncio.get_event_loop().time()
                    
                    try:
                        # Mark stage as active
                        stage_span.set_attribute("stage.status", "running")
                        
                        # Special handling for specific stages
                        if stage == "run_inference":
                            result = await self._trace_inference_stage(
                                solve_func, *args, **kwargs
                            )
                        else:
                            # For other stages, just track timing
                            result = None
                        
                        stage_results[stage] = {"status": "success", "result": result}
                        stage_span.set_attribute("stage.status", "completed")
                        
                    except Exception as e:
                        stage_results[stage] = {"status": "error", "error": str(e)}
                        stage_span.set_status(Status(StatusCode.ERROR, str(e)))
                        stage_span.record_exception(e)
                        stage_span.set_attribute("stage.status", "failed")
                        raise
                    finally:
                        stage_duration = asyncio.get_event_loop().time() - stage_start
                        stage_span.set_attribute("stage.duration_ms", stage_duration * 1000)
            
            # Set final pipeline attributes
            root_span.set_attribute("pipeline.completed_stages", len(stage_results))
            
            return stage_results.get("run_inference", {}).get("result")
    
    async def _trace_inference_stage(
        self,
        solve_func: Callable,
        *args,
        **kwargs,
    ) -> Any:
        """Trace the AI inference stage specifically.
        
        Args:
            solve_func: Inference function
            *args: Function arguments
            **kwargs: Function keyword arguments
            
        Returns:
            Inference result
        """
        with tracer.start_as_current_span(
            "ai_inference",
            kind=SpanKind.CLIENT,
        ) as inference_span:
            inference_span.set_attributes({
                "inference.model": kwargs.get("model", "unknown"),
                "inference.provider": kwargs.get("provider", "unknown"),
            })
            
            start_time = asyncio.get_event_loop().time()
            
            try:
                result = await solve_func(*args, **kwargs)
                
                duration = asyncio.get_event_loop().time() - start_time
                inference_span.set_attributes({
                    "inference.duration_ms": duration * 1000,
                    "inference.success": True,
                })
                
                if isinstance(result, dict):
                    inference_span.set_attribute(
                        "inference.confidence",
                        result.get("confidence", 0.0)
                    )
                
                return result
                
            except Exception as e:
                inference_span.set_status(Status(StatusCode.ERROR, str(e)))
                inference_span.record_exception(e)
                inference_span.set_attribute("inference.success", False)
                raise


def extract_trace_context(request: Request) -> Dict[str, str]:
    """Extract trace context from incoming HTTP request.
    
    Args:
        request: FastAPI request object
        
    Returns:
        Dictionary with trace context
    """
    headers = dict(request.headers)
    carrier = {}
    
    # Extract trace context using W3C Trace Context
    TRACE_PROPAGATOR.extract(carrier=headers)
    
    # Extract baggage
    BAGGAGE_PROPAGATOR.extract(carrier=headers)
    
    return carrier


def inject_trace_context(headers: Dict[str, str]) -> Dict[str, str]:
    """Inject trace context into outgoing HTTP headers.
    
    Args:
        headers: Headers dictionary to inject into
        
    Returns:
        Headers with trace context
    """
    TRACE_PROPAGATOR.inject(carrier=headers)
    BAGGAGE_PROPAGATOR.inject(carrier=headers)
    return headers


def set_span_attributes_from_request(span: trace.Span, request: Request) -> None:
    """Set span attributes from HTTP request.
    
    Args:
        span: Current span
        request: FastAPI request
    """
    span.set_attributes({
        "http.method": request.method,
        "http.url": str(request.url),
        "http.route": request.url.path,
        "http.host": request.headers.get("host", "unknown"),
        "http.user_agent": request.headers.get("user-agent", "unknown")[:100],
        "http.request_content_length": request.headers.get("content-length", 0),
        "http.client_ip": request.client.host if request.client else "unknown",
    })


def set_span_attributes_from_response(span: trace.Span, response: Response) -> None:
    """Set span attributes from HTTP response.
    
    Args:
        span: Current span
        response: FastAPI response
    """
    span.set_attributes({
        "http.status_code": response.status_code,
        "http.response_content_length": response.headers.get("content-length", 0),
    })
    
    if response.status_code >= 500:
        span.set_status(Status(StatusCode.ERROR, f"HTTP {response.status_code}"))
    elif response.status_code >= 400:
        span.set_status(Status(StatusCode.ERROR, f"Client Error {response.status_code}"))


# Create global pipeline tracer
pipeline_tracer = CaptchaSolvePipelineTracer()


def initialize_tracing(
    service_name: str = "sin-solver",
    environment: Optional[str] = None,
) -> TracerProvider:
    """Initialize distributed tracing for the application.
    
    Args:
        service_name: Service name for traces
        environment: Deployment environment
        
    Returns:
        Configured TracerProvider
    """
    env = environment or ("development" if settings.debug else "production")
    
    otlp_endpoint = getattr(settings, "OTLP_ENDPOINT", None)
    otlp_headers = getattr(settings, "OTLP_HEADERS", None)
    
    provider = create_tracer_provider(
        service_name=service_name,
        environment=env,
        otlp_endpoint=otlp_endpoint,
        otlp_headers=otlp_headers,
    )
    
    logger.info(f"Tracing initialized for {service_name} in {env} environment")
    
    return provider
