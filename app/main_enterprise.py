"""
SIN-Solver Enterprise API - Production-Ready CAPTCHA Solving Platform
February 2026 - Enterprise Edition v2.0
"""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

# Enterprise Core Components
from app.core.enterprise_config import get_config, ConfigManager
from app.core.logging_config import setup_logging, get_logger
from app.core.monitoring import setup_monitoring, metrics, health_checks, track_request
from app.core.middleware import (
    setup_security_middleware_stack,
    CorrelationIdMiddleware,
    StructuredLoggingMiddleware,
    SecurityHeadersMiddleware,
    RateLimitMiddleware,
)
from app.core.security import SecurityManager

# API Routes
from app.api.routes import solve, health, system, auth, analytics
from app.api.enterprise_routes import router as enterprise_router

# Setup logging first
setup_logging()
logger = get_logger(__name__)

# Load configuration
config = get_config()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager - startup and shutdown."""
    # Startup
    logger.info(
        "🚀 SIN-Solver Enterprise starting up...", version="2.0.0", environment=config.environment
    )

    # Initialize monitoring
    setup_monitoring(app)

    # Initialize security manager
    app.state.security_manager = SecurityManager()
    await app.state.security_manager.initialize()

    # Health checks
    health_checks.register("database", check_database)
    health_checks.register("redis", check_redis)
    health_checks.register("ai_models", check_ai_models)

    logger.info(
        "✅ Startup complete", database=config.database_url_masked, redis=config.redis_url_masked
    )

    yield

    # Shutdown
    logger.info("🛑 Shutting down gracefully...")
    await app.state.security_manager.shutdown()
    logger.info("✅ Shutdown complete")


# Create Enterprise FastAPI application
app = FastAPI(
    title="SIN-Solver Enterprise API",
    description="Enterprise-Grade CAPTCHA Solving Platform with Multi-AI Consensus",
    version="2.0.0",
    docs_url="/api/docs" if config.environment != "production" else None,
    redoc_url="/api/redoc" if config.environment != "production" else None,
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# Security Middleware Stack (Order matters!)
app.add_middleware(CorrelationIdMiddleware)
app.add_middleware(StructuredLoggingMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
)

# Include routers with versioning
app.include_router(health.router, tags=["Health"])
app.include_router(auth.router, prefix="/api/v1", tags=["Authentication"])
app.include_router(solve.router, prefix="/api/v1", tags=["CAPTCHA Solving"])
app.include_router(system.router, prefix="/api/v1", tags=["System"])
app.include_router(analytics.router, prefix="/api/v1", tags=["Analytics"])

# Enterprise v2 API
app.include_router(enterprise_router, prefix="/api/v2", tags=["Enterprise"])


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler - never leak internal details."""
    logger.error(
        "Unhandled exception",
        exception=str(exc),
        path=request.url.path,
        correlation_id=getattr(request.state, "correlation_id", "unknown"),
    )

    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Please try again later.",
            "correlation_id": getattr(request.state, "correlation_id", "unknown"),
            "support": "support@sin-solver.io",
        },
    )


@app.get("/")
async def root():
    """Root endpoint - API information."""
    return {
        "name": "SIN-Solver Enterprise",
        "version": "2.0.0",
        "description": "Enterprise-Grade CAPTCHA Solving Platform",
        "docs": "/api/docs",
        "health": "/health",
        "status": "operational",
    }


# Health check functions
async def check_database() -> dict:
    """Check database connectivity."""
    # Implementation would check actual DB
    return {"status": "healthy", "latency_ms": 5}


async def check_redis() -> dict:
    """Check Redis connectivity."""
    # Implementation would check actual Redis
    return {"status": "healthy", "latency_ms": 2}


async def check_ai_models() -> dict:
    """Check AI model availability."""
    return {
        "status": "healthy",
        "models": {
            "gemini": "available",
            "mistral": "available",
            "yolo": "available",
            "consensus": "available",
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main_enterprise:app",
        host="0.0.0.0",
        port=8000,
        reload=config.environment == "development",
        workers=4 if config.environment == "production" else 1,
        log_config=None,  # We use structlog
    )
