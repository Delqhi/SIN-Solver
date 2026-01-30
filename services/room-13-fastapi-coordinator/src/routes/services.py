"""
Service Registry Routes
Endpoints for service registration, discovery, and health monitoring
"""

from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
import logging

from src.models import ServiceResponse, ServiceDiscovery, ServiceUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/services", tags=["services"])


async def get_service_registry():
    """Dependency injection for service registry"""
    from main import service_registry

    if not service_registry:
        raise HTTPException(status_code=503, detail="Service registry not available")
    return service_registry


@router.post("/register", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
async def register_service(service_data: dict, registry=None):
    """Register a new service"""
    # Implementation in main.py /api/services/register
    pass


@router.get("", response_model=List[dict])
async def list_services(
    status_filter: Optional[str] = Query(
        None, description="Filter by status: healthy, degraded, offline"
    ),
    registry=None,
):
    """List all registered services with optional filtering"""
    try:
        services = await registry.list_all_services()

        if status_filter:
            services = [s for s in services if s.get("status") == status_filter]

        return services
    except Exception as e:
        logger.error(f"Error listing services: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{service_name}", response_model=dict)
async def get_service_details(service_name: str, registry=None):
    """Get detailed information about a specific service"""
    try:
        status = await registry.get_service_status(service_name)
        if not status:
            raise HTTPException(status_code=404, detail=f"Service not found: {service_name}")
        return status
    except Exception as e:
        logger.error(f"Error getting service details: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{service_name}/health")
async def get_service_health(service_name: str, registry=None):
    """Get health status of a specific service"""
    try:
        is_healthy = await registry.check_service_health(service_name)
        service = registry.services.get(service_name)

        if not service:
            raise HTTPException(status_code=404, detail=f"Service not found: {service_name}")

        return {
            "service_name": service_name,
            "status": service.get("status", "unknown"),
            "healthy": is_healthy,
            "last_heartbeat": service.get("last_heartbeat"),
            "response_time_ms": service.get("avg_response_time_ms", 0),
        }
    except Exception as e:
        logger.error(f"Error checking service health: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{service_name}", status_code=status.HTTP_204_NO_CONTENT)
async def deregister_service(service_name: str, registry=None):
    """Deregister a service"""
    try:
        success = await registry.deregister_service(service_name)
        if not success:
            raise HTTPException(status_code=404, detail=f"Service not found: {service_name}")
        return None
    except Exception as e:
        logger.error(f"Error deregistering service: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{service_name}/heartbeat")
async def send_heartbeat(service_name: str, response_time_ms: float = 0.0, registry=None):
    """Send a heartbeat from a service"""
    try:
        success = await registry.heartbeat(service_name, response_time_ms)
        if not success:
            raise HTTPException(status_code=404, detail=f"Service not found: {service_name}")

        return {
            "service_name": service_name,
            "heartbeat_received": True,
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as e:
        logger.error(f"Error processing heartbeat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{service_name}", response_model=dict)
async def update_service(service_name: str, update_data: ServiceUpdate, registry=None):
    """Update service information"""
    try:
        if service_name not in registry.services:
            raise HTTPException(status_code=404, detail=f"Service not found: {service_name}")

        service = registry.services[service_name]
        update_dict = update_data.model_dump(exclude_unset=True)
        service.update(update_dict)

        return service
    except Exception as e:
        logger.error(f"Error updating service: {e}")
        raise HTTPException(status_code=500, detail=str(e))
