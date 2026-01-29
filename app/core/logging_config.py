"""Enterprise structured logging configuration for CAPTCHA solving system.

Features:
- JSON format for production environments
- Correlation IDs for request tracing
- Environment-specific log levels
- Sensitive data redaction
- Log rotation and retention policies
- OpenTelemetry integration

Author: SIN-Solver Team
Version: 2026.1.0
"""

import json
import logging
import logging.handlers
import os
import re
import sys
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone
from functools import wraps
from typing import Any, Callable, Optional

import structlog
from pythonjsonlogger import jsonlogger

# =============================================================================
# Context Variables for Correlation IDs
# =============================================================================

_correlation_id: ContextVar[Optional[str]] = ContextVar("correlation_id", default=None)
_request_id: ContextVar[Optional[str]] = ContextVar("request_id", default=None)
_session_id: ContextVar[Optional[str]] = ContextVar("session_id", default=None)
_user_id: ContextVar[Optional[str]] = ContextVar("user_id", default=None)

# =============================================================================
# Configuration
# =============================================================================

ENVIRONMENT = os.getenv("ENVIRONMENT", "production")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO" if ENVIRONMENT == "production" else "DEBUG")
LOG_FORMAT = os.getenv("LOG_FORMAT", "json" if ENVIRONMENT == "production" else "console")
LOG_FILE = os.getenv("LOG_FILE", "/var/log/sin-solver/app.log")
LOG_MAX_BYTES = int(os.getenv("LOG_MAX_BYTES", "104857600"))  # 100MB
LOG_BACKUP_COUNT = int(os.getenv("LOG_BACKUP_COUNT", "10"))
LOG_RETENTION_DAYS = int(os.getenv("LOG_RETENTION_DAYS", "30"))

# =============================================================================
# Sensitive Data Patterns for Redaction
# =============================================================================

SENSITIVE_PATTERNS = {
    "api_key": re.compile(r"(['\"]?)(api[_-]?key|apikey|key)\1\s*[:=]\s*['\"]?([a-zA-Z0-9_-]{20,})['\"]?", re.IGNORECASE),
    "password": re.compile(r"(['\"]?)(password|passwd|pwd)\1\s*[:=]\s*['\"]?([^'\"\s]+)['\"]?", re.IGNORECASE),
    "token": re.compile(r"(['\"]?)(token|access[_-]?token|auth[_-]?token)\1\s*[:=]\s*['\"]?([a-zA-Z0-9_-]{20,})['\"]?", re.IGNORECASE),
    "secret": re.compile(r"(['\"]?)(secret|client[_-]?secret)\1\s*[:=]\s*['\"]?([a-zA-Z0-9_-]{20,})['\"]?", re.IGNORECASE),
    "credit_card": re.compile(r"\b(?:\d[ -]*?){13,16}\b"),
    "email": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"),
    "private_key": re.compile(r"-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"),
    "captcha_solution": re.compile(r"(['\"]?solution['\"]?\s*[:=]\s*['\"])([^'\"]{10,})(['\"])"),
}

REDACTION_MASK = "[REDACTED]"

# =============================================================================
# Redaction Processor
# =============================================================================

class SensitiveDataRedactor:
    """Redacts sensitive data from log messages."""
    
    def __init__(self, patterns: Optional[dict] = None):
        self.patterns = patterns or SENSITIVE_PATTERNS
    
    def redact(self, message: str) -> str:
        """Redact sensitive data from a message."""
        if not isinstance(message, str):
            return message
        
        redacted = message
        for name, pattern in self.patterns.items():
            redacted = pattern.sub(REDACTION_MASK, redacted)
        return redacted
    
    def redact_dict(self, data: dict) -> dict:
        """Redact sensitive data from a dictionary."""
        redacted = {}
        sensitive_keys = {"password", "secret", "token", "api_key", "apikey", "key", 
                         "credit_card", "ssn", "private_key", "solution"}
        
        for key, value in data.items():
            # Check if key indicates sensitive data
            key_lower = key.lower()
            if any(sensitive in key_lower for sensitive in sensitive_keys):
                redacted[key] = REDACTION_MASK
            elif isinstance(value, str):
                redacted[key] = self.redact(value)
            elif isinstance(value, dict):
                redacted[key] = self.redact_dict(value)
            elif isinstance(value, list):
                redacted[key] = [self.redact_dict(item) if isinstance(item, dict) else 
                                self.redact(item) if isinstance(item, str) else item 
                                for item in value]
            else:
                redacted[key] = value
        
        return redacted


_redactor = SensitiveDataRedactor()

# =============================================================================
# Custom JSON Formatter
# =============================================================================

class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """Custom JSON formatter with additional fields."""
    
    def add_fields(self, log_record: dict, record: logging.LogRecord, message_dict: dict) -> None:
        super().add_fields(log_record, record, message_dict)
        
        # Add timestamp
        log_record["timestamp"] = datetime.now(timezone.utc).isoformat()
        log_record["level"] = record.levelname
        log_record["logger"] = record.name
        
        # Add correlation IDs
        correlation_id = _correlation_id.get()
        if correlation_id:
            log_record["correlation_id"] = correlation_id
        
        request_id = _request_id.get()
        if request_id:
            log_record["request_id"] = request_id
        
        session_id = _session_id.get()
        if session_id:
            log_record["session_id"] = session_id
        
        user_id = _user_id.get()
        if user_id:
            log_record["user_id"] = user_id
        
        # Add source location
        log_record["source"] = {
            "file": record.pathname,
            "line": record.lineno,
            "function": record.funcName,
        }
        
        # Add service info
        log_record["service"] = {
            "name": os.getenv("SERVICE_NAME", "sin-solver"),
            "version": os.getenv("SERVICE_VERSION", "2026.1.0"),
            "environment": ENVIRONMENT,
            "host": os.getenv("HOSTNAME", "unknown"),
        }
        
        # Redact sensitive data
        if "message" in log_record:
            log_record["message"] = _redactor.redact(log_record["message"])
        
        # Redact extra fields
        for key in ["extra", "context", "data"]:
            if key in log_record and isinstance(log_record[key], dict):
                log_record[key] = _redactor.redact_dict(log_record[key])


# =============================================================================
# Console Formatter (for development)
# =============================================================================

class ColoredConsoleFormatter(logging.Formatter):
    """Colored console formatter for development."""
    
    COLORS = {
        "DEBUG": "\033[36m",     # Cyan
        "INFO": "\033[32m",      # Green
        "WARNING": "\033[33m",   # Yellow
        "ERROR": "\033[31m",     # Red
        "CRITICAL": "\033[35m",  # Magenta
        "RESET": "\033[0m",
    }
    
    def format(self, record: logging.LogRecord) -> str:
        color = self.COLORS.get(record.levelname, self.COLORS["RESET"])
        reset = self.COLORS["RESET"]
        
        correlation_id = _correlation_id.get()
        cid_str = f" [{correlation_id[:8]}]" if correlation_id else ""
        
        log_format = f"{color}[%(asctime)s]{reset} [%(levelname)s]{cid_str} %(message)s"
        formatter = logging.Formatter(log_format, datefmt="%Y-%m-%d %H:%M:%S")
        return formatter.format(record)


# =============================================================================
# Context Management
# =============================================================================

class LogContext:
    """Context manager for log correlation IDs."""
    
    def __init__(
        self,
        correlation_id: Optional[str] = None,
        request_id: Optional[str] = None,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ):
        self.correlation_id = correlation_id or str(uuid.uuid4())
        self.request_id = request_id or str(uuid.uuid4())
        self.session_id = session_id
        self.user_id = user_id
        self.tokens = {}
    
    def __enter__(self):
        self.tokens["correlation_id"] = _correlation_id.set(self.correlation_id)
        self.tokens["request_id"] = _request_id.set(self.request_id)
        if self.session_id:
            self.tokens["session_id"] = _session_id.set(self.session_id)
        if self.user_id:
            self.tokens["user_id"] = _user_id.set(self.user_id)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        for key, token in self.tokens.items():
            if key == "correlation_id":
                _correlation_id.reset(token)
            elif key == "request_id":
                _request_id.reset(token)
            elif key == "session_id":
                _session_id.reset(token)
            elif key == "user_id":
                _user_id.reset(token)
    
    @property
    def context(self) -> dict:
        """Get current context as dictionary."""
        ctx = {
            "correlation_id": self.correlation_id,
            "request_id": self.request_id,
        }
        if self.session_id:
            ctx["session_id"] = self.session_id
        if self.user_id:
            ctx["user_id"] = self.user_id
        return ctx


def get_correlation_id() -> Optional[str]:
    """Get the current correlation ID."""
    return _correlation_id.get()


def get_request_id() -> Optional[str]:
    """Get the current request ID."""
    return _request_id.get()


def set_correlation_id(correlation_id: str) -> None:
    """Set the correlation ID."""
    _correlation_id.set(correlation_id)


def set_request_id(request_id: str) -> None:
    """Set the request ID."""
    _request_id.set(request_id)


# =============================================================================
# Configure Logging
# =============================================================================

def configure_logging(
    level: Optional[str] = None,
    format: Optional[str] = None,
    log_file: Optional[str] = None,
) -> None:
    """Configure structured logging for the application."""
    
    level = level or LOG_LEVEL
    format = format or LOG_FORMAT
    log_file = log_file or LOG_FILE
    
    # Create log directory if needed
    if log_file:
        log_dir = os.path.dirname(log_file)
        if log_dir and not os.path.exists(log_dir):
            os.makedirs(log_dir, exist_ok=True)
    
    # Configure structlog
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
    ]
    
    if format == "json":
        structlog.configure(
            processors=shared_processors + [
                structlog.processors.dict_tracebacks,
                structlog.processors.JSONRenderer(),
            ],
            wrapper_class=structlog.make_filtering_bound_logger(getattr(logging, level)),
            context_class=dict,
            logger_factory=structlog.PrintLoggerFactory(),
            cache_logger_on_first_use=True,
        )
    else:
        structlog.configure(
            processors=shared_processors + [
                structlog.dev.ConsoleRenderer(),
            ],
            wrapper_class=structlog.make_filtering_bound_logger(getattr(logging, level)),
            context_class=dict,
            logger_factory=structlog.PrintLoggerFactory(),
            cache_logger_on_first_use=True,
        )
    
    # Configure standard logging
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level))
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Console handler
    if format == "json":
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(CustomJsonFormatter())
    else:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(ColoredConsoleFormatter())
    
    root_logger.addHandler(console_handler)
    
    # File handler with rotation
    if log_file:
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=LOG_MAX_BYTES,
            backupCount=LOG_BACKUP_COUNT,
        )
        file_handler.setFormatter(CustomJsonFormatter())
        root_logger.addHandler(file_handler)
    
    # Suppress noisy third-party loggers
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)


# =============================================================================
# Logger Factory
# =============================================================================

def get_logger(name: str) -> structlog.BoundLogger:
    """Get a structured logger instance."""
    return structlog.get_logger(name)


# =============================================================================
# Decorators
# =============================================================================

def log_execution_time(logger_name: Optional[str] = None, level: str = "DEBUG"):
    """Decorator to log function execution time."""
    def decorator(func: Callable) -> Callable:
        logger = get_logger(logger_name or func.__module__)
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            import time
            start = time.perf_counter()
            try:
                result = func(*args, **kwargs)
                duration = time.perf_counter() - start
                getattr(logger, level.lower())(
                    f"Function {func.__name__} executed",
                    function=func.__name__,
                    duration_ms=duration * 1000,
                )
                return result
            except Exception as e:
                duration = time.perf_counter() - start
                logger.error(
                    f"Function {func.__name__} failed",
                    function=func.__name__,
                    duration_ms=duration * 1000,
                    error=str(e),
                )
                raise
        
        return wrapper
    return decorator


def log_exceptions(logger_name: Optional[str] = None):
    """Decorator to log exceptions."""
    def decorator(func: Callable) -> Callable:
        logger = get_logger(logger_name or func.__module__)
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.exception(
                    f"Exception in {func.__name__}",
                    function=func.__name__,
                    error=str(e),
                )
                raise
        
        return wrapper
    return decorator


# =============================================================================
# FastAPI Integration
# =============================================================================

class LoggingMiddleware:
    """FastAPI middleware for request logging."""
    
    def __init__(self, app):
        self.app = app
        self.logger = get_logger("http")
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        import time
        from starlette.requests import Request
        
        request = Request(scope)
        correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        
        with LogContext(correlation_id=correlation_id, request_id=request_id):
            start_time = time.time()
            
            self.logger.info(
                "Request started",
                method=request.method,
                path=request.url.path,
                query=str(request.url.query),
                client=request.client.host if request.client else None,
            )
            
            try:
                await self.app(scope, receive, send)
                duration = time.time() - start_time
                self.logger.info(
                    "Request completed",
                    method=request.method,
                    path=request.url.path,
                    duration_ms=duration * 1000,
                )
            except Exception as e:
                duration = time.time() - start_time
                self.logger.error(
                    "Request failed",
                    method=request.method,
                    path=request.url.path,
                    duration_ms=duration * 1000,
                    error=str(e),
                )
                raise


def setup_logging_middleware(app):
    """Setup logging middleware for FastAPI."""
    from starlette.middleware.base import BaseHTTPMiddleware
    
    class LoggingMiddlewareImpl(BaseHTTPMiddleware):
        async def dispatch(self, request, call_next):
            import time
            
            correlation_id = request.headers.get("X-Correlation-ID", str(uuid.uuid4()))
            request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
            
            with LogContext(correlation_id=correlation_id, request_id=request_id):
                logger = get_logger("http")
                start_time = time.time()
                
                logger.info(
                    "Request started",
                    method=request.method,
                    path=request.url.path,
                    client=request.client.host if request.client else None,
                )
                
                try:
                    response = await call_next(request)
                    duration = time.time() - start_time
                    logger.info(
                        "Request completed",
                        method=request.method,
                        path=request.url.path,
                        status_code=response.status_code,
                        duration_ms=duration * 1000,
                    )
                    return response
                except Exception as e:
                    duration = time.time() - start_time
                    logger.error(
                        "Request failed",
                        method=request.method,
                        path=request.url.path,
                        duration_ms=duration * 1000,
                        error=str(e),
                    )
                    raise
    
    app.add_middleware(LoggingMiddlewareImpl)


# =============================================================================
# Initialize on import
# =============================================================================

configure_logging()
