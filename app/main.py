import sys
from pathlib import Path

# Add parent directory to path so 'app' package can be imported when running as script
sys.path.insert(0, str(Path(__file__).parent.parent))

import time
import logging
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.redis_cache import RedisCache
from app.api.routes import solve, auth, health, resources, system, workers, steel, chat, docs, analytics, pentest, secrets

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Delqhi-Platform-Orchestrator")

app = FastAPI(
    title="Delqhi-Platform Orchestrator",
    description="Central AI-driven CAPTCHA solving API",
    version="2.0.0"
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(solve, prefix="/solve", tags=["solver"])
app.include_router(auth, prefix="/auth", tags=["auth"])
app.include_router(health, prefix="/health", tags=["monitoring"])
app.include_router(resources, prefix="/resources", tags=["resources"])
app.include_router(system, prefix="/system", tags=["system"])
app.include_router(workers, prefix="/workers", tags=["workers"])
app.include_router(steel, prefix="/steel", tags=["steel"])
app.include_router(chat, prefix="/chat", tags=["chat"])
app.include_router(docs, prefix="/docs", tags=["docs"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
app.include_router(pentest, prefix="/pentest", tags=["pentest"])
app.include_router(secrets.router, prefix="/secrets", tags=["secrets"])


@app.on_event("startup")
async def startup():
    logger.info("🚀 Orchestrator starting up...")
    
    # 🔥 ENTERPRISE 2026: Synchronize secrets with Room-13 (API Koordinator)
    import os
    if os.getenv("ROLE") != "orchestrator":
        await settings.fetch_secrets_from_room13()
    
    await RedisCache.get_instance()
    
    # 🔥 CEO REALITY CHECK: Load persistent metrics
    from app.services.analytics_engine import get_analytics_engine
    analytics = get_analytics_engine()
    await analytics.load_from_persistence()

@app.on_event("shutdown")
async def shutdown():
    logger.info("🛑 Orchestrator shutting down...")
    
    # 🔥 CEO 2026: Cleanup all leaked resources
    from app.services.solver_router import get_solver_router
    router = await get_solver_router()
    
    if hasattr(router, 'mistral') and router.mistral:
        await router.mistral.aclose()
    if hasattr(router, 'gemini') and router.gemini:
        # Gemini usually manages its own, but we check if it has aclose
        if hasattr(router.gemini, 'aclose'):
            await router.gemini.aclose()
            
    # Cleanup cache
    cache = await RedisCache.get_instance()
    if hasattr(cache, 'close'):
        await cache.close()

    # 🔥 CEO 2026: Cleanup TokenPool
    from app.services.token_pool import get_token_pool
    pool = get_token_pool()
    if hasattr(pool, 'close'):
        await pool.close()
    
    logger.info("✅ Resources cleaned up.")

@app.get("/")
async def root():
    return {"name": "Delqhi-Platform Orchestrator", "status": "active", "version": "2.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
