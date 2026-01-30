#!/usr/bin/env python3
"""
🏠 SIN-SOLVER Worker Health Check API - CEO 2026
=================================================
Self-hosted CAPTCHA solving with FREE AI providers only.
NO PAID SERVICES: Uses Gemini, Mistral, Groq for vision tasks.
"""

from fastapi import FastAPI
import os
import logging
from datetime import datetime

# Configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# Setup logging
logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Delqhi-Platform Worker Health", version="2.0.0")


@app.get("/health")
async def health_check():
    """Health check endpoint - FREE providers only"""
    return {
        "status": "worker_active",
        "service": "sin_solver_worker",
        "timestamp": datetime.utcnow().isoformat(),
        "vision_provider": os.getenv("CAPTCHA_VISION_PROVIDER", "gemini"),
        "gemini_configured": bool(os.getenv("GEMINI_API_KEY")),
        "mistral_configured": bool(os.getenv("MISTRAL_API_KEY")),
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "mode": "self_hosted_free",
        "paid_services": False,
        "environment": os.getenv("ENVIRONMENT", "production"),
    }


@app.get("/metrics")
async def metrics():
    """Worker metrics - FREE tier limits"""
    return {
        "service": "sin_solver_worker",
        "up_since": datetime.utcnow().isoformat(),
        "providers": {
            "gemini": {
                "limit": "60 req/min, 1500/day",
                "configured": bool(os.getenv("GEMINI_API_KEY")),
            },
            "mistral": {
                "limit": "1M tokens/month",
                "configured": bool(os.getenv("MISTRAL_API_KEY")),
            },
            "groq": {"limit": "14,400 req/day", "configured": bool(os.getenv("GROQ_API_KEY"))},
        },
        "max_parallel_browsers": int(os.getenv("MAX_PARALLEL_BROWSERS", 20)),
        "max_concurrent_tasks": int(os.getenv("MAX_CONCURRENT_TASKS", 40)),
        "cost": "$0.00 (100% FREE)",
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "sin_solver_worker",
        "status": "active",
        "mode": "self_hosted_free",
        "paid_services": False,
        "docs": "/docs",
        "health": "/health",
        "metrics": "/metrics",
    }


if __name__ == "__main__":
    import uvicorn

    logger.info("🚀 Starting Delqhi-Platform Worker Health API (FREE providers only)...")
    uvicorn.run(app, host="0.0.0.0", port=8080, log_level="info")
