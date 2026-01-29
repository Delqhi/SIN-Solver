"""
SIN-Solver Core Module.

This module contains core functionality for the SIN-Solver CAPTCHA solving system,
including security, configuration, caching, and infrastructure components.

Author: SIN-Solver Team
Version: 2.0.0
Date: 2026-02
"""

from app.core.config import Settings, settings
from app.core.redis_cache import RedisCache

# Security module exports
from app.core.security import (
    # Core security manager
    SecurityManager,
    # Audit logging
    AuditLogger,
    SecurityEvent,
    SecurityEventType,
    ThreatLevel,
    # Rate limiting
    DistributedRateLimiter,
    RateLimitConfig,
    # Authentication
    TokenManager,
    RequestSigner,
    # Access control
    IPFilter,
    IPFilterConfig,
    # Validation
    InputValidator,
    # Headers
    SecurityHeaders,
    SecurityHeadersConfig,
    # Circuit breaker
    CircuitBreaker,
    CircuitBreakerConfig,
    CircuitState,
    CircuitBreakerOpen,
    # Dependencies
    get_security_manager,
    require_api_key,
    verify_token_dependency,
    rate_limit_dependency,
    api_key_header,
    oauth2_scheme,
    bearer_scheme,
)

# Middleware module exports
from app.core.middleware import (
    # Middleware classes
    CorrelationIdMiddleware,
    StructuredLoggingMiddleware,
    SecurityHeadersMiddleware,
    ErrorHandlingMiddleware,
    RateLimitHeadersMiddleware,
    RequestSizeLimitMiddleware,
    TimingAttackPreventionMiddleware,
    CacheControlMiddleware,
    RequestIdInjectionMiddleware,
    HealthCheckMiddleware,
    MetricsCollectionMiddleware,
    # Setup functions
    setup_cors_middleware,
    setup_compression_middleware,
    setup_security_middleware_stack,
    # Utilities
    correlation_id_ctx,
    get_correlation_id,
    get_request_context,
)

# Enterprise config module exports
from app.core.enterprise_config import (
    # Enums
    Environment,
    LogLevel,
    FeatureFlagType,
    # Data classes
    FeatureFlag,
    Tenant,
    # Managers
    FeatureFlagManager,
    TenantManager,
    VaultClient,
    ConfigurationManager,
    # Settings
    EnterpriseSettings,
    # Utilities
    get_config,
    get_settings,
    is_development,
    is_production,
)

__all__ = [
    # Legacy
    "Settings",
    "settings",
    "RedisCache",
    # Security
    "SecurityManager",
    "AuditLogger",
    "SecurityEvent",
    "SecurityEventType",
    "ThreatLevel",
    "DistributedRateLimiter",
    "RateLimitConfig",
    "TokenManager",
    "RequestSigner",
    "IPFilter",
    "IPFilterConfig",
    "InputValidator",
    "SecurityHeaders",
    "SecurityHeadersConfig",
    "CircuitBreaker",
    "CircuitBreakerConfig",
    "CircuitState",
    "CircuitBreakerOpen",
    "get_security_manager",
    "require_api_key",
    "verify_token_dependency",
    "rate_limit_dependency",
    "api_key_header",
    "oauth2_scheme",
    "bearer_scheme",
    # Middleware
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
    "setup_cors_middleware",
    "setup_compression_middleware",
    "setup_security_middleware_stack",
    "correlation_id_ctx",
    "get_correlation_id",
    "get_request_context",
    # Enterprise Config
    "Environment",
    "LogLevel",
    "FeatureFlagType",
    "FeatureFlag",
    "Tenant",
    "FeatureFlagManager",
    "TenantManager",
    "VaultClient",
    "ConfigurationManager",
    "EnterpriseSettings",
    "get_config",
    "get_settings",
    "is_development",
    "is_production",
]
