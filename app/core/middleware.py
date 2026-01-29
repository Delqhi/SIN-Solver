"""
FastAPI Enterprise Middleware Suite for SIN-Solver.

This module provides comprehensive middleware for:
- Request timing and structured logging
- Correlation ID propagation
- Error handling with sanitized messages
- CORS configuration
- Response compression
- Security headers

Author: SIN-Solver Security Team
Version: 2.0.0
Date: 2026-02
"""

from __future__ import annotations

import gzip
import json
import time
import uuid
from contextvars import ContextVar
from typing import Any, Awaitable, Callable, Optional, Union

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.security import SecurityHeaders, SecurityManager

logger = structlog.get_logger(__name__)

# Context variable for correlation ID propagation
correlation_id_ctx: ContextVar[Optional[str]] = ContextVar("correlation_id", default=None)


# =============================================================================
# Correlation ID Middleware
# =============================================================================

class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Middleware for correlation ID propagation across requests.
    
    Features:
    - Extract correlation ID from incoming requests (header or query param)
    - Generate new correlation ID if not present
    - Propagate to response headers
    - Store in context variable for logging
    """
    
    def __init__(
        self,
        app: ASGIApp,
        header_name: str = "X-Correlation-ID",
        query_param: Optional[str] = "correlation_id",
    ):
        super().__init__(app)
        self.header_name = header_name
        self.query_param = query_param
    
    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        """Process request and attach correlation ID."""
        # Try to extract correlation ID from header
        correlation_id = request.headers.get(self.header_name)
        
        # Try query parameter if not in header
        if not correlation_id and self.query_param:
            correlation_id = request.query_params.get(self.query_param)
        
        # Generate new if not present
        if not correlation_id:
            correlation_id = str(uuid.uuid4())
        
        # Set in context variable for structured logging
        correlation_id_ctx.set(correlation_id)
        
        # Store in request state
        request.state.correlation_id = correlation_id
        
        # Process request
        response = await call_next(request)
        
        # Add correlation ID to response headers
        response.headers[self.header_name] = correlation_id
        
        return response


# =============================================================================
# Structured Logging Middleware
# =============================================================================

class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for structured request/response logging.
    
    Features:
    - Request timing (duration measurement)
    - Structured log output with structlog
    - Request/response body logging (configurable)
    - Error tracking
    - Performance metrics
    """
    
    def __init__(
        self,
        app: ASGIApp,
        log_request_body: bool = False,
        log_response_body: bool = False,
        max_body_size: int = 10000,
        exclude_paths: Optional[list[str]] = None,
    ):
        super().__init__(app)
        self.log_request_body = log_request_body
        self.log_response_body = log_response_body
        self.max_body_size = max_body_size
        self.exclude_paths = set(exclude_paths or ["/health", "/metrics", "/docs", "/openapi.json"])
    
    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        """Process request with structured logging."""
        # Skip excluded paths
        if request.url.path in self.exclude_paths:
            return await call_next(request)
        
        # Start timing
        start_time = time.perf_counter()
        
        # Extract client info
        client_ip = self._get_client_ip(request)
        correlation_id = getattr(request.state, "correlation_id", None)
        
        # Build request log context
        log_context = {
            "request_id": str(uuid.uuid4()),
            "correlation_id": correlation_id,
            "method": request.method,
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "client_ip": client_ip,
            "user_agent": request.headers.get("user-agent"),
            "content_type": request.headers.get("content-type"),
        }
        
        # Log request
        request_logger = logger.bind(**log_context)
        request_logger.info("Request started")
        
        # Capture request body if configured
        if self.log_request_body:
            body = await self._capture_request_body(request)
            if body:
                log_context["request_body"] = body[:self.max_body_size]
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate duration
            duration_ms = (time.perf_counter() - start_time) * 1000
            
            # Update log context
            log_context.update({
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
                "response_headers": dict(response.headers),
            })
            
            # Determine log level based on status code
            if response.status_code >= 500:
                log_level = "error"
            elif response.status_code >= 400:
                log_level = "warning"
            else:
                log_level = "info"
            
            # Log completion
            request_logger.bind(**log_context).log(
                log_level,
                "Request completed",
            )
            
            # Add timing header
            response.headers["X-Response-Time"] = f"{duration_ms:.2f}ms"
            
            return response
            
        except Exception as e:
            # Calculate duration even on error
            duration_ms = (time.perf_counter() - start_time) * 1000
            
            log_context.update({
                "error": str(e),
                "error_type": type(e).__name__,
                "duration_ms": round(duration_ms, 2),
            })
            
            request_logger.bind(**log_context).error("Request failed")
            raise
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request."""
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        if request.client:
            return request.client.host
        
        return "unknown"
    
    async def _capture_request_body(self, request: Request) -> Optional[str]:
        """Capture request body for logging."""
        try:
            body = await request.body()
            if body:
                content_type = request.headers.get("content-type", "")
                
                if "application/json" in content_type:
                    # Truncate if too large
                    if len(body) > self.max_body_size:
                        return body[:self.max_body_size].decode("utf-8", errors="replace") + "...[truncated]"
                    return body.decode("utf-8", errors="replace")
                elif "text/" in content_type:
                    return body.decode("utf-8", errors="replace")[:self.max_body_size]
                else:
                    return f"<binary data: {len(body)} bytes>"
        except Exception:
            pass
        return None


# =============================================================================
# Security Headers Middleware
# =============================================================================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware for adding security headers to all responses.
    
    Implements OWASP recommended security headers.
    """
    
    def __init__(
        self,
        app: ASGIApp,
        custom_headers: Optional[dict[str, str]] = None,
    ):
        super().__init__(app)
        self.security_headers = SecurityHeaders()
        self.custom_headers = custom_headers or {}
    
    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        """Add security headers to response."""
        response = await call_next(request)
        
        # Add default security headers
        headers = self.security_headers.get_headers()
        
        # Apply custom headers (override defaults)
        headers.update(self.custom_headers)
        
        # Add to response
        for header_name, header_value in headers.items():
            if header_name not in response.headers:
                response.headers[header_name] = header_value
        
        return response


# =============================================================================
# Error Handling Middleware
# =============================================================================

class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for centralized error handling.
    
    Features:
    - Sanitized error messages (no internal details to client)
    - Structured error logging
    - Custom error responses
    - Exception tracking
    """
    
    def __init__(
        self,
        app: ASGIApp,
        debug: bool = False,
        include_traceback_in_debug: bool = True,
    ):
        super().__init__(app)
        self.debug = debug
        self.include_traceback_in_debug = include_traceback_in_debug
    
    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        """Handle errors with sanitization."""
        try:
            return await call_next(request)
            
        except Exception as exc:
            return await self._handle_exception(request, exc)
    
    async def _handle_exception(self, request: Request, exc: Exception) -> JSONResponse:
        """Handle and format exception response."""
        correlation_id = getattr(request.state, "correlation_id", None)
        
        # Map exception to HTTP status code and message
        status_code, error_code, message = self._map_exception(exc)
        
        # Log the error with full details
        error_data = {
            "correlation_id": correlation_id,
            "error_type": type(exc).__name__,
            "error_message": str(exc),
            "request_path": request.url.path,
            "request_method": request.method,
            "client_ip": self._get_client_ip(request),
        }
        
        # Include traceback in debug mode
        if self.debug and self.include_traceback_in_debug:
            import traceback
            error_data["traceback"] = traceback.format_exc()
        
        # Log based on severity
        if status_code >= 500:
            logger.error("Unhandled exception", **error_data)
        else:
            logger.warning("Request error", **error_data)
        
        # Build sanitized response
        response_body: dict[str, Any] = {
            "error": {
                "code": error_code,
                "message": message,
                "correlation_id": correlation_id,
            }
        }
        
        # Include debug info only in debug mode
        if self.debug:
            response_body["error"]["debug"] = {
                "type": type(exc).__name__,
                "details": str(exc),
            }
        
        return JSONResponse(
            status_code=status_code,
            content=response_body,
            headers={"X-Correlation-ID": correlation_id} if correlation_id else {},
        )
    
    def _map_exception(self, exc: Exception) -> tuple[int, str, str]:
        """Map exception to HTTP response details."""
        from fastapi import HTTPException
        
        if isinstance(exc, HTTPException):
            # Use FastAPI HTTPException details
            status_code = exc.status_code
            error_code = f"HTTP_{status_code}"
            message = str(exc.detail)
        elif isinstance(exc, ValueError):
            status_code = 400
            error_code = "VALIDATION_ERROR"
            message = "Invalid request data"
        elif isinstance(exc, PermissionError):
            status_code = 403
            error_code = "FORBIDDEN"
            message = "Access denied"
        elif isinstance(exc, TimeoutError):
            status_code = 504
            error_code = "TIMEOUT"
            message = "Request timed out"
        else:
            # Generic 500 for unknown errors
            status_code = 500
            error_code = "INTERNAL_ERROR"
            message = "An internal error occurred"
        
        return status_code, error_code, message
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request."""
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        if request.client:
            return request.client.host
        
        return "unknown"


# =============================================================================
# Rate Limit Headers Middleware
# =============================================================================

class RateLimitHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware for adding rate limit headers to responses.
    
    Implements IETF RateLimit headers standard.
    """
    
    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        """Add rate limit headers if available in request state."""
        response = await call_next(request)
        
        # Check if rate limit info is in request state
        rate_limit_info = getattr(request.state, "rate_limit", None)
        
        if rate_limit_info:
            # Add IETF RateLimit headers
            response.headers["RateLimit-Limit"] = str(rate_limit_info.get("limit", 60))
            response.headers["RateLimit-Remaining"] = str(rate_limit_info.get("remaining", 0))
            response.headers["RateLimit-Reset"] = str(rate_limit_info.get("reset", 0))
            
            # Also add legacy X-RateLimit headers
            response.headers["X-RateLimit-Limit"] = str(rate_limit_info.get("limit", 60))
            response.headers["X-RateLimit-Remaining"] = str(rate_limit_info.get("remaining", 0))
            response.headers["X-RateLimit-Reset"] = str(rate_limit_info.get("reset", 0))
        
        return response


# =============================================================================
# Request Size Limit Middleware
# =============================================================================

class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware to limit request body size.
    
    Prevents memory exhaustion from large requests.
    """
    
    def __init__(
        self,
        app: ASGIApp,
        max_size_bytes: int = 10 * 1024 * 1024,  # 10MB default
    ):
        super().__init__(app)
        self.max_size_bytes = max_size_bytes
    
    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        """Check request size before processing."""
        # Check Content-Length header if present
        content_length = request.headers.get("content-length")
        if content_length:
            size = int(content_length)
            if size > self.max_size_bytes:
                return JSONResponse(
                    status_code=413,
                    content={
                        "error": {
                            "code": "REQUEST_TOO_LARGE",
                            "message": f"Request body too large. Maximum size: {self.max_size_bytes} bytes",
                            "max_size": self.max_size_bytes,
                        }
                    },
                )
        
        return await call_next(request)


# =============================================================================
# Timing Attack Prevention Middleware
# =============================================================================

class TimingAttackPreventionMiddleware(BaseHTTPMiddleware):
    """
    Middleware to help prevent timing attacks on authentication.
    
    Adds random delays to authentication endpoints to mask
    timing differences between valid and invalid credentials.
    """
    
    def __init__(
        self,
        app: ASGIApp,
        min_delay_ms: float = 50,
        max_delay_ms: float = 150,
        protected_paths: Optional[list[str]] = None,
    ):
        super().__init__(app)
        self.min_delay_ms = min_delay_ms
        self.max_delay_ms = max_delay_ms
        self.protected_paths = set(protected_paths or ["/auth/login", "/auth/token", "/auth/verify"])
    
    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        """Add random delay for protected paths."""
        response = await call_next(request)
        
        if request.url.path in self.protected_paths:
            import random
            delay = random.uniform(self.min_delay_ms, self.max_delay_ms) / 1000
            await asyncio.sleep(delay)
        
        return response


# =============================================================================
# Cache Control Middleware
# =============================================================================

class CacheControlMiddleware(BaseHTTPMiddleware):
    """
    Middleware for managing cache control headers.
    
    Adds appropriate cache headers based on endpoint type.
    """
    
    def __init__(
        self,
        app: ASGIApp,
        no_cache_paths: Optional[list[str]] = None,
        static_paths: Optional[list[str]] = None,
        static_max_age: int = 3600,
    ):
        super().__init__(app)
        self.no_cache_paths = set(no_cache_paths or ["/api/", "/auth/", "/solve/"])
        self.static_paths = set(static_paths or ["/static/", "/assets/"])
        self.static_max_age = static_max_age
    
    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        """Add cache control headers."""
        response = await call_next(request)
        
        path = request.url.path
        
        # Check if path should not be cached
        for no_cache_path in self.no_cache_paths:
            if path.startswith(no_cache_path):
                response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
                response.headers["Pragma"] = "no-cache"
                response.headers["Expires"] = "0"
                return response
        
        # Check if static path
        for static_path in self.static_paths:
            if path.startswith(static_path):
                response.headers["Cache-Control"] = f"public, max-age={self.static_max_age}"
                return response
        
        # Default: no cache for API endpoints
        if path.startswith("/"):
            response.headers["Cache-Control"] = "no-store"
        
        return response


# =============================================================================
# Request ID Injection Middleware
# =============================================================================

class RequestIdInjectionMiddleware(BaseHTTPMiddleware):
    """
    Middleware to inject request ID into response and logs.
    
    Similar to correlation ID but for single-request tracking.
    """
    
    def __init__(
        self,
        app: ASGIApp,
        header_name: str = "X-Request-ID",
    ):
        super().__init__(app)
        self.header_name = header_name
    
    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        """Generate and inject request ID."""
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        response = await call_next(request)
        response.headers[self.header_name] = request_id
        
        return response


# =============================================================================
# Health Check Middleware
# =============================================================================

class HealthCheckMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle health check requests efficiently.
    
    Short-circuits health checks before they hit the main application.
    """
    
    def __init__(
        self,
        app: ASGIApp,
        health_paths: Optional[list[str]] = None,
    ):
        super().__init__(app)
        self.health_paths = set(health_paths or ["/health", "/healthz", "/ready", "/live"])
    
    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        """Handle health check requests."""
        if request.url.path in self.health_paths and request.method == "GET":
            return JSONResponse(
                status_code=200,
                content={"status": "healthy", "timestamp": time.time()},
            )
        
        return await call_next(request)


# =============================================================================
# Metrics Collection Middleware
# =============================================================================

class MetricsCollectionMiddleware(BaseHTTPMiddleware):
    """
    Middleware to collect request metrics.
    
    Tracks:
    - Request count by endpoint
    - Response times
    - Status code distribution
    - Error rates
    """
    
    def __init__(
        self,
        app: ASGIApp,
        exclude_paths: Optional[list[str]] = None,
    ):
        super().__init__(app)
        self.exclude_paths = set(exclude_paths or ["/metrics", "/health"])
        self._request_count: dict[str, int] = {}
        self._error_count: dict[str, int] = {}
        self._response_times: list[float] = []
        self._lock = asyncio.Lock()
    
    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        """Collect metrics for request."""
        if request.url.path in self.exclude_paths:
            return await call_next(request)
        
        start_time = time.perf_counter()
        
        try:
            response = await call_next(request)
            
            # Update metrics
            async with self._lock:
                endpoint = f"{request.method}:{request.url.path}"
                self._request_count[endpoint] = self._request_count.get(endpoint, 0) + 1
                
                if response.status_code >= 400:
                    self._error_count[endpoint] = self._error_count.get(endpoint, 0) + 1
                
                duration = (time.perf_counter() - start_time) * 1000
                self._response_times.append(duration)
                
                # Keep only last 10000 response times
                if len(self._response_times) > 10000:
                    self._response_times = self._response_times[-10000:]
            
            return response
            
        except Exception:
            # Still track errors
            async with self._lock:
                endpoint = f"{request.method}:{request.url.path}"
                self._error_count[endpoint] = self._error_count.get(endpoint, 0) + 1
            raise
    
    async def get_metrics(self) -> dict[str, Any]:
        """Get collected metrics."""
        async with self._lock:
            avg_response_time = (
                sum(self._response_times) / len(self._response_times)
                if self._response_times else 0
            )
            
            return {
                "request_count": self._request_count.copy(),
                "error_count": self._error_count.copy(),
                "average_response_time_ms": round(avg_response_time, 2),
                "total_requests": sum(self._request_count.values()),
                "total_errors": sum(self._error_count.values()),
            }


# =============================================================================
# Middleware Factory Functions
# =============================================================================

def setup_cors_middleware(
    app: FastAPI,
    allow_origins: Optional[list[str]] = None,
    allow_credentials: bool = True,
    allow_methods: Optional[list[str]] = None,
    allow_headers: Optional[list[str]] = None,
    max_age: int = 600,
) -> None:
    """
    Configure CORS middleware with secure defaults.
    
    Args:
        app: FastAPI application
        allow_origins: List of allowed origins (None = ['*'] for dev)
        allow_credentials: Allow credentials in CORS requests
        allow_methods: Allowed HTTP methods
        allow_headers: Allowed headers
        max_age: Max age for preflight cache
    """
    # Default to allow all in development, but should be restricted in production
    if allow_origins is None:
        allow_origins = ["*"]
    
    if allow_methods is None:
        allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    
    if allow_headers is None:
        allow_headers = [
            "*",
            "Authorization",
            "Content-Type",
            "X-API-Key",
            "X-Correlation-ID",
            "X-Request-ID",
        ]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=allow_credentials,
        allow_methods=allow_methods,
        allow_headers=allow_headers,
        max_age=max_age,
    )


def setup_compression_middleware(
    app: FastAPI,
    minimum_size: int = 1000,
    compresslevel: int = 6,
) -> None:
    """
    Configure GZip compression middleware.
    
    Args:
        app: FastAPI application
        minimum_size: Minimum response size to compress (bytes)
        compresslevel: Compression level (1-9)
    """
    app.add_middleware(
        GZipMiddleware,
        minimum_size=minimum_size,
        compresslevel=compresslevel,
    )


def setup_security_middleware_stack(
    app: FastAPI,
    debug: bool = False,
    enable_logging: bool = True,
    enable_security_headers: bool = True,
    enable_error_handling: bool = True,
    enable_rate_limit_headers: bool = True,
    enable_request_size_limit: bool = True,
    max_request_size: int = 10 * 1024 * 1024,
    cors_config: Optional[dict[str, Any]] = None,
) -> None:
    """
    Setup complete security middleware stack.
    
    This function adds all security-related middleware in the correct order.
    
    Args:
        app: FastAPI application
        debug: Enable debug mode
        enable_logging: Enable structured logging
        enable_security_headers: Enable security headers
        enable_error_handling: Enable centralized error handling
        enable_rate_limit_headers: Enable rate limit headers
        enable_request_size_limit: Enable request size limiting
        max_request_size: Maximum request size in bytes
        cors_config: Custom CORS configuration
    """
    # Order matters! Middleware is executed in reverse order of addition
    # (last added = first to process request, last to process response)
    
    # 1. Error handling (catches all errors)
    if enable_error_handling:
        app.add_middleware(
            ErrorHandlingMiddleware,
            debug=debug,
        )
    
    # 2. Request size limit (early rejection)
    if enable_request_size_limit:
        app.add_middleware(
            RequestSizeLimitMiddleware,
            max_size_bytes=max_request_size,
        )
    
    # 3. Cache control
    app.add_middleware(CacheControlMiddleware)
    
    # 4. Rate limit headers
    if enable_rate_limit_headers:
        app.add_middleware(RateLimitHeadersMiddleware)
    
    # 5. Security headers
    if enable_security_headers:
        app.add_middleware(SecurityHeadersMiddleware)
    
    # 6. Structured logging
    if enable_logging:
        app.add_middleware(
            StructuredLoggingMiddleware,
            log_request_body=debug,
            log_response_body=debug,
        )
    
    # 7. Correlation ID
    app.add_middleware(CorrelationIdMiddleware)
    
    # 8. Request ID
    app.add_middleware(RequestIdInjectionMiddleware)
    
    # 9. CORS (must be early to handle preflight)
    if cors_config:
        setup_cors_middleware(app, **cors_config)
    else:
        setup_cors_middleware(app)
    
    # 10. Compression (last to process response = first to receive it)
    setup_compression_middleware(app)


# =============================================================================
# Utility Functions
# =============================================================================

def get_correlation_id() -> Optional[str]:
    """Get current correlation ID from context."""
    return correlation_id_ctx.get()


def get_request_context() -> dict[str, Any]:
    """Get current request context for logging."""
    return {
        "correlation_id": get_correlation_id(),
        "timestamp": time.time(),
    }


# =============================================================================
# Module Exports
# =============================================================================

__all__ = [
    # Middleware classes
    "CorrelationIdMiddleware",
    "StructuredLoggingMiddleware",
    "SecurityHeadersMiddleware",
    "ErrorHandlingMiddleware",
    "RateLimitHeadersMiddleware",
    "RequestSizeLimitMiddleware",
    "TimingAttackPreventionMiddleware",
    "CacheControlMiddleware",
    "RequestIdInjectionMiddleware",
    "HealthCheckMiddleware",
    "MetricsCollectionMiddleware",
    # Setup functions
    "setup_cors_middleware",
    "setup_compression_middleware",
    "setup_security_middleware_stack",
    # Utilities
    "correlation_id_ctx",
    "get_correlation_id",
    "get_request_context",
]

# Need to import asyncio at the end for the timing attack middleware
import asyncio  # noqa: E402
