"""
Service Registry & Discovery
Auto-registration, heartbeat monitoring, service discovery
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import logging
import asyncio

logger = logging.getLogger(__name__)

class ServiceRegistry:
    """Manages service registration, discovery, and health monitoring"""

    def __init__(self, db):
        self.db = db
        self.services: Dict[str, Dict[str, Any]] = {}
        self.heartbeat_interval = 30  # seconds
        self.heartbeat_timeout = 90   # seconds

    async def register_service(self,
                              name: str,
                              version: str,
                              address: str,
                              port: int,
                              health_endpoint: str,
                              dependencies: List[str] = None,
                              credentials_needed: List[str] = None,
                              metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Register a new service in the registry"""
        
        service_entry = {
            'id': name,
            'name': name,
            'version': version,
            'address': address,
            'port': port,
            'health_endpoint': health_endpoint,
            'dependencies': dependencies or [],
            'credentials_needed': credentials_needed or [],
            'metadata': metadata or {},
            'status': 'healthy',
            'registered_at': datetime.utcnow(),
            'last_heartbeat': datetime.utcnow(),
            'heartbeat_count': 0,
            'request_count': 0,
            'error_count': 0,
            'avg_response_time_ms': 0.0
        }
        
        self.services[name] = service_entry
        logger.info(f"Registered service: {name} v{version} at {address}:{port}")
        return service_entry

    async def deregister_service(self, service_name: str) -> bool:
        """Deregister a service"""
        if service_name in self.services:
            del self.services[service_name]
            logger.info(f"Deregistered service: {service_name}")
            return True
        return False

    async def heartbeat(self, service_name: str, response_time_ms: float = 0.0) -> bool:
        """Record a service heartbeat"""
        if service_name not in self.services:
            logger.warning(f"Heartbeat from unknown service: {service_name}")
            return False
        
        service = self.services[service_name]
        service['last_heartbeat'] = datetime.utcnow()
        service['heartbeat_count'] += 1
        service['avg_response_time_ms'] = (
            (service['avg_response_time_ms'] * (service['heartbeat_count'] - 1) + response_time_ms) 
            / service['heartbeat_count']
        )
        service['status'] = 'healthy'
        
        logger.debug(f"Heartbeat from {service_name}")
        return True

    async def discover_service(self, service_name: str) -> Optional[Dict[str, Any]]:
        """Discover a service by name"""
        if service_name not in self.services:
            logger.warning(f"Service discovery failed: {service_name} not found")
            return None
        
        service = self.services[service_name]
        load_percentage = min(service.get('request_count', 0) / 100, 100)
        
        return {
            'name': service['name'],
            'address': service['address'],
            'port': service['port'],
            'status': service['status'],
            'version': service['version'],
            'load_percentage': load_percentage,
            'estimated_response_time_ms': service.get('avg_response_time_ms', 0.0)
        }

    async def discover_all_healthy(self) -> List[Dict[str, Any]]:
        """Discover all healthy services"""
        healthy = []
        for service_name, service in self.services.items():
            if service['status'] == 'healthy':
                healthy.append({
                    'name': service_name,
                    'address': service['address'],
                    'port': service['port'],
                    'version': service['version']
                })
        return healthy

    async def get_service_status(self, service_name: str) -> Optional[Dict[str, Any]]:
        """Get detailed status for a service"""
        if service_name not in self.services:
            return None
        
        service = self.services[service_name]
        time_since_heartbeat = datetime.utcnow() - service['last_heartbeat']
        
        return {
            'name': service['name'],
            'status': service['status'],
            'last_heartbeat': service['last_heartbeat'].isoformat(),
            'time_since_heartbeat_seconds': time_since_heartbeat.total_seconds(),
            'heartbeat_count': service['heartbeat_count'],
            'request_count': service['request_count'],
            'error_count': service['error_count'],
            'error_rate': service['error_count'] / max(service['request_count'], 1),
            'avg_response_time_ms': service['avg_response_time_ms']
        }

    async def list_all_services(self) -> List[Dict[str, Any]]:
        """List all registered services"""
        services_list = []
        for service_name, service in self.services.items():
            services_list.append({
                'name': service['name'],
                'version': service['version'],
                'status': service['status'],
                'address': service['address'],
                'port': service['port'],
                'registered_at': service['registered_at'].isoformat()
            })
        return services_list

    async def check_service_health(self, service_name: str) -> bool:
        """Check if service is still healthy based on heartbeat timeout"""
        if service_name not in self.services:
            return False
        
        service = self.services[service_name]
        time_since_heartbeat = datetime.utcnow() - service['last_heartbeat']
        
        if time_since_heartbeat.total_seconds() > self.heartbeat_timeout:
            service['status'] = 'offline'
            logger.warning(f"Service marked offline: {service_name}")
            return False
        elif time_since_heartbeat.total_seconds() > self.heartbeat_interval * 2:
            service['status'] = 'degraded'
            logger.warning(f"Service marked degraded: {service_name}")
            return False
        
        return service['status'] == 'healthy'

    async def periodic_health_check(self):
        """Background task: periodically check all services"""
        while True:
            try:
                for service_name in list(self.services.keys()):
                    await self.check_service_health(service_name)
                await asyncio.sleep(self.heartbeat_interval)
            except Exception as e:
                logger.error(f"Health check error: {e}")
                await asyncio.sleep(5)

    def get_service_url(self, service_name: str) -> Optional[str]:
        """Get full URL for a service"""
        service = self.services.get(service_name)
        if not service:
            return None
        return f"http://{service['address']}:{service['port']}"

    async def update_service_stats(self, service_name: str, 
                                   success: bool, 
                                   response_time_ms: float):
        """Update service stats after request"""
        if service_name not in self.services:
            return
        
        service = self.services[service_name]
        service['request_count'] += 1
        if not success:
            service['error_count'] += 1
