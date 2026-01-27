"""
Zimmer-13 Data Models
Credential, Service, und Health-Check Models
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, List, Any
from datetime import datetime
from enum import Enum
import uuid
import re

# ==================== ENUMS ====================

class ServiceHealthStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    OFFLINE = "offline"
    UNKNOWN = "unknown"

class CredentialType(str, Enum):
    API_KEY = "api_key"
    OAUTH = "oauth"
    BASIC_AUTH = "basic_auth"
    JWT = "jwt"
    DATABASE = "database"
    WEBHOOK = "webhook"
    CUSTOM = "custom"

# ==================== CREDENTIAL MODELS ====================

class CredentialBase(BaseModel):
    """Base credential model"""
    name: str = Field(..., min_length=1, max_length=255)
    credential_type: CredentialType
    service_name: str = Field(..., min_length=1, max_length=255)
    value: str = Field(..., min_length=1)
    description: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    expires_at: Optional[datetime] = None
    rotation_required: bool = False

    @field_validator('name')
    @classmethod
    def name_must_be_lowercase(cls, v):
        return v.lower()

class CredentialCreate(CredentialBase):
    """Create credential request"""
    pass

class CredentialUpdate(BaseModel):
    """Update credential request"""
    value: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    expires_at: Optional[datetime] = None
    rotation_required: Optional[bool] = None

class CredentialResponse(CredentialBase):
    """Credential response (without value!)"""
    id: str
    service_name: str
    created_at: datetime
    updated_at: datetime
    last_used: Optional[datetime] = None
    rotation_count: int = 0

    class Config:
        from_attributes = True

class CredentialWithValue(CredentialResponse):
    """Credential with decrypted value (use with caution!)"""
    value: str

# ==================== SERVICE MODELS ====================

class ServiceHealthCheck(BaseModel):
    """Health check configuration"""
    endpoint: str = Field(..., description="e.g., /health")
    method: str = Field(default="GET")
    timeout_seconds: int = Field(default=5, ge=1, le=30)
    interval_seconds: int = Field(default=30, ge=5, le=300)

class ServiceDependency(BaseModel):
    """Service dependency"""
    name: str
    required: bool = True
    version: Optional[str] = None

class ServiceBase(BaseModel):
    """Base service model"""
    name: str = Field(..., min_length=1, max_length=255)
    version: str = Field(default="1.0.0")
    port: int = Field(..., ge=1024, le=65535)
    address: str = Field(default="localhost")
    environment: str = Field(default="development")
    description: Optional[str] = None
    health_check: ServiceHealthCheck
    dependencies: List[ServiceDependency] = Field(default_factory=list)
    credentials_needed: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ServiceRegister(ServiceBase):
    """Register service request"""
    api_token: str = Field(..., description="Service authentication token")

class ServiceUpdate(BaseModel):
    """Update service info"""
    version: Optional[str] = None
    address: Optional[str] = None
    port: Optional[int] = None
    health_check: Optional[ServiceHealthCheck] = None
    metadata: Optional[Dict[str, Any]] = None

class ServiceResponse(ServiceBase):
    """Service response"""
    id: str
    status: ServiceHealthStatus = ServiceHealthStatus.UNKNOWN
    last_heartbeat: Optional[datetime] = None
    registered_at: datetime
    request_count: int = 0
    error_count: int = 0
    avg_response_time_ms: float = 0.0

    class Config:
        from_attributes = True

class ServiceDiscovery(BaseModel):
    """Service discovery response"""
    name: str
    address: str
    port: int
    status: ServiceHealthStatus
    version: str
    load_percentage: float = Field(default=0.0, ge=0.0, le=100.0)
    estimated_response_time_ms: float = 0.0

# ==================== HEALTH CHECK MODELS ====================

class ServiceHealthDetail(BaseModel):
    """Single service health detail"""
    name: str
    status: ServiceHealthStatus
    last_check: datetime
    response_time_ms: float
    error_message: Optional[str] = None

class SystemHealth(BaseModel):
    """Overall system health"""
    status: ServiceHealthStatus
    timestamp: datetime
    services_healthy: int
    services_degraded: int
    services_offline: int
    services_total: int
    services: List[ServiceHealthDetail] = Field(default_factory=list)
    database_status: str
    redis_status: str
    version: str

class HealthCheckRequest(BaseModel):
    """Health check request"""
    service_name: str

# ==================== API GATEWAY MODELS ====================

class GatewayRequest(BaseModel):
    service_name: str = Field(..., description="Target service name")
    method: str = Field(default="GET", pattern="^(GET|POST|PUT|DELETE|PATCH)$")
    path: str = Field(..., description="API path, e.g., /api/users")
    query_params: Optional[Dict[str, str]] = None
    headers: Optional[Dict[str, str]] = None
    body: Optional[Dict[str, Any]] = None
    timeout_seconds: int = Field(default=30, ge=1, le=300)

class GatewayResponse(BaseModel):
    """API Gateway response"""
    status_code: int
    service_name: str
    path: str
    response_time_ms: float
    data: Any = None
    error: Optional[str] = None
    headers: Dict[str, str] = Field(default_factory=dict)

# ==================== AUDIT LOG MODELS ====================

class AuditLog(BaseModel):
    """Audit log entry"""
    action: str
    entity_type: str
    entity_id: str
    actor: str
    changes: Dict[str, Any]
    timestamp: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class AuditLogResponse(AuditLog):
    """Audit log response"""
    id: str

    class Config:
        from_attributes = True

# ==================== ERROR MODELS ====================

class ErrorResponse(BaseModel):
    """Standard error response"""
    error: str
    message: str
    status_code: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    details: Optional[Dict[str, Any]] = None

class ValidationError(ErrorResponse):
    """Validation error"""
    errors: List[Dict[str, Any]]

# ==================== PAGINATION ====================

class PaginationParams(BaseModel):
    skip: int = Field(default=0, ge=0)
    limit: int = Field(default=50, ge=1, le=1000)
    sort_by: Optional[str] = None
    sort_order: str = Field(default="asc", pattern="^(asc|desc)$")

class PaginatedResponse(BaseModel):
    """Paginated response"""
    total: int
    skip: int
    limit: int
    items: List[Any]
