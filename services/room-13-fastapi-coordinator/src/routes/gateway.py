"""
API Gateway Routes
Smart routing, load balancing, and request proxying to backend services
"""

from fastapi import APIRouter, HTTPException, status, Header, Body
from typing import Dict, Any, Optional
from datetime import datetime
import logging
import httpx
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/gateway", tags=["gateway"])


async def get_service_registry():
    """Dependency injection for service registry"""
    from src.main import service_registry
    if not service_registry:
        raise HTTPException(status_code=503, detail="Service registry not available")
    return service_registry


async def get_credential_manager():
    """Dependency injection for credential manager"""
    from src.main import credential_mgr
    if not credential_mgr:
        raise HTTPException(status_code=503, detail="Credential manager not available")
    return credential_mgr


@router.get("/status")
async def gateway_status(registry=None):
    """Get API gateway operational status"""
    try:
        if not registry:
            registry = await get_service_registry()
        
        healthy_services = await registry.discover_all_healthy()
        all_services = await registry.list_all_services()
        
        return {
            "status": "operational" if healthy_services else "degraded",
            "healthy_services": len(healthy_services),
            "total_services": len(all_services),
            "timestamp": datetime.utcnow().isoformat(),
            "gateway_version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Error getting gateway status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get gateway status")


@router.post("/proxy/{service_name}/{path_name:path}")
async def proxy_request(
    service_name: str,
    path_name: str,
    request_body: Optional[Dict[str, Any]] = Body(None),
    x_request_id: Optional[str] = Header(None),
    registry=None,
    credential_mgr=None
):
    """Proxy request to a backend service with automatic service discovery"""
    try:
        if not registry:
            registry = await get_service_registry()
        if not credential_mgr:
            credential_mgr = await get_credential_manager()
        
        service = await registry.discover_service(service_name)
        if not service:
            raise HTTPException(status_code=404, detail=f"Service not found: {service_name}")
        
        if service.get("status") != "healthy":
            raise HTTPException(
                status_code=503,
                detail=f"Service {service_name} is not healthy (status: {service.get('status')})"
            )
        
        service_url = registry.get_service_url(service_name)
        full_url = f"{service_url}/{path_name}"
        
        headers = {"X-Request-ID": x_request_id or "unknown"}
        
        async with httpx.AsyncClient() as client:
            try:
                start_time = datetime.utcnow()
                
                response = await asyncio.wait_for(
                    client.post(
                        full_url,
                        json=request_body,
                        headers=headers,
                        timeout=30.0
                    ),
                    timeout=35.0
                )
                
                response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
                
                await registry.update_service_stats(
                    service_name,
                    response.status_code < 500,
                    response_time
                )
                
                return {
                    "status": "success",
                    "service": service_name,
                    "response": response.json(),
                    "response_time_ms": response_time,
                    "request_id": x_request_id
                }
            except asyncio.TimeoutError:
                logger.error(f"Request to {service_name} timed out")
                await registry.update_service_stats(service_name, False, 30000)
                raise HTTPException(status_code=504, detail="Service request timeout")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Gateway proxy error: {e}")
        raise HTTPException(status_code=500, detail="Gateway proxy failed")


@router.get("/health/services")
async def gateway_service_health(registry=None):
    """Get health status of all services via gateway"""
    try:
        if not registry:
            registry = await get_service_registry()
        
        services = await registry.list_all_services()
        detailed_health = []
        
        for service in services:
            status = await registry.get_service_status(service['name'])
            detailed_health.append(status)
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "services": detailed_health
        }
    except Exception as e:
        logger.error(f"Error getting service health: {e}")
        raise HTTPException(status_code=500, detail="Failed to get service health")


@router.get("/metrics")
async def gateway_metrics(registry=None):
    """Get gateway performance metrics"""
    try:
        if not registry:
            registry = await get_service_registry()
        
        services = await registry.list_all_services()
        
        total_requests = sum(s.get('request_count', 0) for s in services)
        total_errors = sum(s.get('error_count', 0) for s in services)
        avg_response_time = sum(s.get('avg_response_time_ms', 0) for s in services) / len(services) if services else 0
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "total_requests": total_requests,
            "total_errors": total_errors,
            "error_rate": total_errors / max(total_requests, 1),
            "average_response_time_ms": avg_response_time,
            "services_count": len(services),
            "healthy_count": sum(1 for s in services if s.get('status') == 'healthy')
        }
    except Exception as e:
        logger.error(f"Error getting metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get metrics")


@router.post("/health/check/{service_name}")
async def manual_health_check(service_name: str, registry=None):
    """Manually trigger a health check for a specific service"""
    try:
        if not registry:
            registry = await get_service_registry()
        
        service = await registry.discover_service(service_name)
        if not service:
            raise HTTPException(status_code=404, detail=f"Service not found: {service_name}")
        
        service_url = registry.get_service_url(service_name)
        health_endpoint = f"{service_url}/health"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await asyncio.wait_for(
                    client.get(health_endpoint, timeout=10.0),
                    timeout=12.0
                )
                
                is_healthy = response.status_code == 200
                await registry.update_service_stats(service_name, is_healthy, 0)
                
                return {
                    "service_name": service_name,
                    "healthy": is_healthy,
                    "status_code": response.status_code,
                    "timestamp": datetime.utcnow().isoformat()
                }
            except asyncio.TimeoutError:
                await registry.update_service_stats(service_name, False, 10000)
                raise HTTPException(status_code=504, detail="Health check timeout")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Health check error: {e}")
        raise HTTPException(status_code=500, detail="Health check failed")


@router.get("/routing-info/{service_name}")
async def get_routing_info(service_name: str, registry=None):
    """Get routing information for load balancing"""
    try:
        if not registry:
            registry = await get_service_registry()
        
        service = await registry.discover_service(service_name)
        if not service:
            raise HTTPException(status_code=404, detail=f"Service not found: {service_name}")
        
        service_status = await registry.get_service_status(service_name)
        
        return {
            "service_name": service_name,
            "url": registry.get_service_url(service_name),
            "status": service.get('status'),
            "load_percentage": service.get('load_percentage', 0),
            "response_time_ms": service.get('estimated_response_time_ms', 0),
            "error_rate": service_status.get('error_rate', 0) if service_status else 0,
            "recommended": service.get('status') == 'healthy'
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting routing info: {e}")
        raise HTTPException(status_code=500, detail="Failed to get routing info")
