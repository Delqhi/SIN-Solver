"""
Zimmer-13 API Coordinator - FastAPI Main Application
Central hub for credential management, service discovery, and API gateway
"""

from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from datetime import datetime
import os
import asyncio

from src.models import (
    CredentialCreate,
    CredentialResponse,
    CredentialUpdate,
    ServiceRegister,
    ServiceResponse,
    ServiceDiscovery,
    SystemHealth,
    ServiceHealthStatus,
    ErrorResponse,
)
from src.services.credential_manager import CredentialManager
from src.services.service_registry import ServiceRegistry
from src.routes import services as services_routes
from src.routes import credentials as credentials_routes
from src.routes import gateway as gateway_routes
from src.routes import captcha as captcha_routes
from src.middleware import AuthMiddleware
from src.middleware.logging import LoggingMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize services (will be replaced with DI in routes)
credential_mgr = None
service_registry = None
health_monitor_task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    logger.info("Starting Room-13 API Coordinator...")

    global credential_mgr, service_registry, health_monitor_task

    # Initialize services
    credential_mgr = CredentialManager(db=None)
    service_registry = ServiceRegistry(db=None)

    # Start background health check task
    health_monitor_task = asyncio.create_task(service_registry.periodic_health_check())
    logger.info("✅ Room-13 Coordinator started")

    yield

    # Shutdown
    logger.info("Shutting down Room-13 API Coordinator...")
    if health_monitor_task:
        health_monitor_task.cancel()
    logger.info("✅ Room-13 Coordinator stopped")


app = FastAPI(
    title="Room-13: API Coordinator",
    description="Central hub for credentials, service discovery, and API gateway",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(LoggingMiddleware)
app.add_middleware(AuthMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(services_routes.router)
app.include_router(credentials_routes.router)
app.include_router(gateway_routes.router)
app.include_router(captcha_routes.router)


@app.get("/health")
async def health():
    """Basic health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "service": "room-13-api-coordinator",
    }


@app.get("/api/health/system")
async def system_health() -> SystemHealth:
    """Get overall system health"""
    if not service_registry:
        raise HTTPException(status_code=503, detail="Service registry not initialized")

    all_services = await service_registry.list_all_services()
    healthy = sum(1 for s in all_services if s["status"] == "healthy")
    degraded = sum(1 for s in all_services if s["status"] == "degraded")
    offline = sum(1 for s in all_services if s["status"] == "offline")

    overall_status = ServiceHealthStatus.HEALTHY
    if offline > 0:
        overall_status = ServiceHealthStatus.OFFLINE
    elif degraded > 0:
        overall_status = ServiceHealthStatus.DEGRADED

    return SystemHealth(
        status=overall_status,
        timestamp=datetime.utcnow(),
        services_healthy=healthy,
        services_degraded=degraded,
        services_offline=offline,
        services_total=len(all_services),
        database_status="connected",
        redis_status="connected",
        version="1.0.0",
    )


@app.post("/api/credentials/create")
async def create_credential(credential: CredentialCreate) -> CredentialResponse:
    """Create new credential (encrypted)"""
    if not credential_mgr:
        raise HTTPException(status_code=503, detail="Credential manager not initialized")

    try:
        cred = credential_mgr.create_credential(
            name=credential.name,
            credential_type=credential.credential_type,
            service_name=credential.service_name,
            value=credential.value,
            description=credential.description,
            metadata=credential.metadata,
            expires_at=credential.expires_at,
        )
        return CredentialResponse(**cred)
    except Exception as e:
        logger.error(f"Failed to create credential: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/credentials/service/{service_name}")
async def get_service_credentials(service_name: str) -> list:
    """Get all credentials for a service"""
    if not credential_mgr:
        raise HTTPException(status_code=503, detail="Credential manager not initialized")

    creds = credential_mgr.get_service_credentials(service_name)
    return creds


@app.post("/api/services/register")
async def register_service(service: ServiceRegister) -> ServiceResponse:
    """Register a new service"""
    if not service_registry:
        raise HTTPException(status_code=503, detail="Service registry not initialized")

    try:
        registered = await service_registry.register_service(
            name=service.name,
            version=service.version,
            address=service.address,
            port=service.port,
            health_endpoint=service.health_check.endpoint,
            dependencies=[d.name for d in service.dependencies],
            credentials_needed=service.credentials_needed,
            metadata=service.metadata,
        )
        return ServiceResponse(**registered)
    except Exception as e:
        logger.error(f"Failed to register service: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/services")
async def list_services() -> list:
    """List all registered services"""
    if not service_registry:
        raise HTTPException(status_code=503, detail="Service registry not initialized")

    return await service_registry.list_all_services()


@app.get("/api/discover")
async def discover_service(service_name: str) -> ServiceDiscovery:
    """Discover a service by name"""
    if not service_registry:
        raise HTTPException(status_code=503, detail="Service registry not initialized")

    service = await service_registry.discover_service(service_name)
    if not service:
        raise HTTPException(status_code=404, detail=f"Service not found: {service_name}")

    return ServiceDiscovery(**service)


@app.get("/api/gateway/status")
async def gateway_status():
    """Get API gateway status"""
    if not service_registry:
        raise HTTPException(status_code=503, detail="Service registry not initialized")

    healthy = await service_registry.discover_all_healthy()
    return {
        "status": "operational",
        "healthy_services": len(healthy),
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    return ErrorResponse(
        error=exc.detail,
        message=str(exc.detail),
        status_code=exc.status_code,
        request_id=str(request.headers.get("x-request-id", "unknown")),
    ).model_dump()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
