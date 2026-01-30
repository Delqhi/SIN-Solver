"""
Enterprise Configuration Management for SIN-Solver.

This module provides enterprise-grade configuration with:
- Environment-based config with pydantic-settings validation
- HashiCorp Vault secrets management integration
- Feature flags system
- A/B testing capabilities
- Multi-tenancy support

Author: SIN-Solver Security Team
Version: 2.0.0
Date: 2026-02
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import secrets
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Generic, Optional, TypeVar
from urllib.parse import urlparse

import httpx
import structlog
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = structlog.get_logger(__name__)

# =============================================================================
# Environment Definitions
# =============================================================================


class Environment(str, Enum):
    """Deployment environments."""

    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"


class LogLevel(str, Enum):
    """Logging levels."""

    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


# =============================================================================
# Feature Flags System
# =============================================================================

T = TypeVar("T")


class FeatureFlagType(str, Enum):
    """Types of feature flags."""

    BOOLEAN = "boolean"
    PERCENTAGE = "percentage"
    USER_SEGMENT = "user_segment"
    TIME_BASED = "time_based"


@dataclass
class FeatureFlag:
    """Represents a feature flag configuration."""

    name: str
    flag_type: FeatureFlagType
    enabled: bool = False
    percentage: float = 0.0  # For percentage-based rollout
    user_segments: list[str] = field(default_factory=list)
    start_time: Optional[float] = None  # For time-based flags
    end_time: Optional[float] = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def is_enabled(
        self,
        user_id: Optional[str] = None,
        user_segment: Optional[str] = None,
    ) -> bool:
        """Check if flag is enabled for given context."""
        if not self.enabled:
            return False

        if self.flag_type == FeatureFlagType.BOOLEAN:
            return self.enabled

        if self.flag_type == FeatureFlagType.PERCENTAGE:
            if user_id:
                # Deterministic based on user ID
                hash_val = int(hashlib.md5(f"{self.name}:{user_id}".encode()).hexdigest(), 16)
                user_percentage = (hash_val % 10000) / 100
                return user_percentage < self.percentage
            return False

        if self.flag_type == FeatureFlagType.USER_SEGMENT:
            if user_segment and user_segment in self.user_segments:
                return True
            return False

        if self.flag_type == FeatureFlagType.TIME_BASED:
            now = time.time()
            if self.start_time and now < self.start_time:
                return False
            if self.end_time and now > self.end_time:
                return False
            return True

        return False


class FeatureFlagManager:
    """
    Manages feature flags with Redis-backed synchronization.

    Supports:
    - Real-time flag updates
    - A/B testing
    - Gradual rollouts
    - User segmentation
    """

    def __init__(
        self,
        redis_client: Optional[Any] = None,
        default_flags: Optional[dict[str, FeatureFlag]] = None,
    ):
        self.redis = redis_client
        self._flags: dict[str, FeatureFlag] = default_flags or {}
        self._callbacks: dict[str, list[Callable[[FeatureFlag], None]]] = {}
        self._lock = asyncio.Lock()
        self._refresh_task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        """Start background refresh task."""
        if self.redis and not self._refresh_task:
            self._refresh_task = asyncio.create_task(self._refresh_loop())

    async def stop(self) -> None:
        """Stop background refresh task."""
        if self._refresh_task:
            self._refresh_task.cancel()
            try:
                await self._refresh_task
            except asyncio.CancelledError:
                pass
            self._refresh_task = None

    async def _refresh_loop(self) -> None:
        """Background loop to refresh flags from Redis."""
        while True:
            try:
                await self._sync_from_redis()
                await asyncio.sleep(30)  # Refresh every 30 seconds
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Feature flag refresh failed", error=str(e))
                await asyncio.sleep(5)

    async def _sync_from_redis(self) -> None:
        """Sync flags from Redis."""
        if not self.redis:
            return

        try:
            flags_data = await self.redis.hgetall("feature_flags")
            for name, data in flags_data.items():
                try:
                    flag_dict = json.loads(data)
                    flag = FeatureFlag(
                        name=flag_dict["name"],
                        flag_type=FeatureFlagType(flag_dict["flag_type"]),
                        enabled=flag_dict["enabled"],
                        percentage=flag_dict.get("percentage", 0.0),
                        user_segments=flag_dict.get("user_segments", []),
                        start_time=flag_dict.get("start_time"),
                        end_time=flag_dict.get("end_time"),
                        metadata=flag_dict.get("metadata", {}),
                    )

                    async with self._lock:
                        old_flag = self._flags.get(name)
                        self._flags[name] = flag

                        # Trigger callbacks if changed
                        if old_flag and old_flag.enabled != flag.enabled:
                            await self._trigger_callbacks(name, flag)

                except (json.JSONDecodeError, KeyError, ValueError) as e:
                    logger.error("Invalid flag data in Redis", flag=name, error=str(e))

        except Exception as e:
            logger.error("Failed to sync flags from Redis", error=str(e))

    async def _sync_to_redis(self, flag: FeatureFlag) -> None:
        """Sync a flag to Redis."""
        if not self.redis:
            return

        try:
            flag_data = {
                "name": flag.name,
                "flag_type": flag.flag_type.value,
                "enabled": flag.enabled,
                "percentage": flag.percentage,
                "user_segments": flag.user_segments,
                "start_time": flag.start_time,
                "end_time": flag.end_time,
                "metadata": flag.metadata,
            }
            await self.redis.hset("feature_flags", flag.name, json.dumps(flag_data))
        except Exception as e:
            logger.error("Failed to sync flag to Redis", flag=flag.name, error=str(e))

    async def _trigger_callbacks(self, flag_name: str, flag: FeatureFlag) -> None:
        """Trigger registered callbacks for a flag."""
        callbacks = self._callbacks.get(flag_name, [])
        for callback in callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(flag)
                else:
                    callback(flag)
            except Exception as e:
                logger.error("Flag callback failed", flag=flag_name, error=str(e))

    def register_flag(self, flag: FeatureFlag) -> None:
        """Register a new feature flag."""
        self._flags[flag.name] = flag

    async def update_flag(self, name: str, **kwargs) -> Optional[FeatureFlag]:
        """Update a feature flag."""
        async with self._lock:
            if name not in self._flags:
                return None

            flag = self._flags[name]

            # Update attributes
            for key, value in kwargs.items():
                if hasattr(flag, key):
                    setattr(flag, key, value)

            # Sync to Redis
            await self._sync_to_redis(flag)

            # Trigger callbacks
            await self._trigger_callbacks(name, flag)

            return flag

    def is_enabled(
        self,
        flag_name: str,
        user_id: Optional[str] = None,
        user_segment: Optional[str] = None,
    ) -> bool:
        """Check if a flag is enabled."""
        flag = self._flags.get(flag_name)
        if not flag:
            return False
        return flag.is_enabled(user_id, user_segment)

    def get_variation(
        self,
        flag_name: str,
        user_id: str,
        variations: list[T],
    ) -> Optional[T]:
        """
        Get A/B test variation for user.

        Returns one of the variations based on user hash.
        """
        if not variations:
            return None

        hash_val = int(hashlib.md5(f"{flag_name}:{user_id}".encode()).hexdigest(), 16)
        index = hash_val % len(variations)
        return variations[index]

    def on_change(self, flag_name: str, callback: Callable[[FeatureFlag], None]) -> None:
        """Register a callback for flag changes."""
        if flag_name not in self._callbacks:
            self._callbacks[flag_name] = []
        self._callbacks[flag_name].append(callback)

    def get_all_flags(self) -> dict[str, FeatureFlag]:
        """Get all registered flags."""
        return self._flags.copy()


# =============================================================================
# Multi-Tenancy Support
# =============================================================================


@dataclass
class Tenant:
    """Represents a tenant in multi-tenant deployment."""

    id: str
    name: str
    domain: Optional[str] = None
    config: dict[str, Any] = field(default_factory=dict)
    rate_limits: dict[str, int] = field(default_factory=dict)
    features: list[str] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    is_active: bool = True


class TenantManager:
    """
    Manages multi-tenant configuration and isolation.

    Features:
    - Tenant resolution from domain/header
    - Per-tenant configuration
    - Tenant-specific rate limits
    - Feature gating per tenant
    """

    def __init__(self, redis_client: Optional[Any] = None):
        self.redis = redis_client
        self._tenants: dict[str, Tenant] = {}
        self._domain_map: dict[str, str] = {}  # domain -> tenant_id

    def register_tenant(self, tenant: Tenant) -> None:
        """Register a new tenant."""
        self._tenants[tenant.id] = tenant
        if tenant.domain:
            self._domain_map[tenant.domain] = tenant.id

    def get_tenant_by_id(self, tenant_id: str) -> Optional[Tenant]:
        """Get tenant by ID."""
        return self._tenants.get(tenant_id)

    def get_tenant_by_domain(self, domain: str) -> Optional[Tenant]:
        """Get tenant by domain."""
        tenant_id = self._domain_map.get(domain)
        if tenant_id:
            return self._tenants.get(tenant_id)
        return None

    def resolve_tenant(
        self,
        domain: Optional[str] = None,
        header_value: Optional[str] = None,
        api_key: Optional[str] = None,
    ) -> Optional[Tenant]:
        """
        Resolve tenant from request context.

        Resolution order:
        1. X-Tenant-ID header
        2. Domain-based
        3. API key prefix
        """
        # Try header first
        if header_value:
            return self.get_tenant_by_id(header_value)

        # Try domain
        if domain:
            tenant = self.get_tenant_by_domain(domain)
            if tenant:
                return tenant

        # Try API key prefix (format: tenant_id:api_key)
        if api_key and ":" in api_key:
            tenant_id = api_key.split(":")[0]
            return self.get_tenant_by_id(tenant_id)

        return None

    def get_tenant_config(self, tenant_id: str, key: str, default: Any = None) -> Any:
        """Get tenant-specific configuration."""
        tenant = self._tenants.get(tenant_id)
        if tenant:
            return tenant.config.get(key, default)
        return default

    def has_feature(self, tenant_id: str, feature: str) -> bool:
        """Check if tenant has access to a feature."""
        tenant = self._tenants.get(tenant_id)
        if tenant:
            return feature in tenant.features
        return False


# =============================================================================
# Secrets Management - Vault Integration
# =============================================================================


class VaultClient:
    """
    HashiCorp Vault client for secrets management.

    Features:
    - Token-based authentication
    - KV v2 secret engine support
    - Automatic token renewal
    - Caching with TTL
    """

    def __init__(
        self,
        vault_url: str,
        vault_token: Optional[str] = None,
        role_id: Optional[str] = None,
        secret_id: Optional[str] = None,
        namespace: Optional[str] = None,
    ):
        self.vault_url = vault_url.rstrip("/")
        self.vault_token = vault_token
        self.role_id = role_id
        self.secret_id = secret_id
        self.namespace = namespace
        self._client: Optional[httpx.AsyncClient] = None
        self._token_expiry: float = 0
        self._cache: dict[str, tuple[Any, float]] = {}
        self._cache_ttl = 300  # 5 minutes

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if not self._client:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def _ensure_token(self) -> None:
        """Ensure valid Vault token."""
        if self.vault_token and time.time() < self._token_expiry - 60:
            return

        # If using AppRole auth
        if self.role_id and self.secret_id:
            await self._login_approle()
        elif not self.vault_token:
            raise ValueError("No Vault authentication method configured")

    async def _login_approle(self) -> None:
        """Login using AppRole."""
        client = await self._get_client()

        response = await client.post(
            f"{self.vault_url}/v1/auth/approle/login",
            json={
                "role_id": self.role_id,
                "secret_id": self.secret_id,
            },
        )
        response.raise_for_status()

        data = response.json()
        self.vault_token = data["auth"]["client_token"]
        self._token_expiry = time.time() + data["auth"]["lease_duration"]

    def _get_headers(self) -> dict[str, str]:
        """Get request headers with auth."""
        headers = {"X-Vault-Token": self.vault_token}
        if self.namespace:
            headers["X-Vault-Namespace"] = self.namespace
        return headers

    async def get_secret(
        self,
        path: str,
        use_cache: bool = True,
    ) -> Optional[dict[str, Any]]:
        """
        Get secret from Vault.

        Args:
            path: Secret path (e.g., "secret/data/myapp/config")
            use_cache: Whether to use local cache

        Returns:
            Secret data or None if not found
        """
        # Check cache
        if use_cache and path in self._cache:
            data, expiry = self._cache[path]
            if time.time() < expiry:
                return data

        await self._ensure_token()
        client = await self._get_client()

        try:
            response = await client.get(
                f"{self.vault_url}/v1/{path}",
                headers=self._get_headers(),
            )
            response.raise_for_status()

            data = response.json()
            secret_data = data.get("data", {}).get("data", {})

            # Cache result
            if use_cache:
                self._cache[path] = (secret_data, time.time() + self._cache_ttl)

            return secret_data

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return None
            raise

    async def put_secret(self, path: str, data: dict[str, Any]) -> None:
        """Store secret in Vault."""
        await self._ensure_token()
        client = await self._get_client()

        response = await client.post(
            f"{self.vault_url}/v1/{path}",
            headers=self._get_headers(),
            json={"data": data},
        )
        response.raise_for_status()

        # Invalidate cache
        if path in self._cache:
            del self._cache[path]

    async def close(self) -> None:
        """Close client connection."""
        if self._client:
            await self._client.aclose()
            self._client = None


# =============================================================================
# Enterprise Settings
# =============================================================================


class EnterpriseSettings(BaseSettings):
    """
    Enterprise-grade configuration with validation.

    Uses pydantic-settings for environment-based configuration.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # =========================================================================
    # Application Settings
    # =========================================================================

    app_name: str = Field(default="SIN-Solver Enterprise", description="Application name")
    app_version: str = Field(default="2.0.0", description="Application version")
    environment: Environment = Field(
        default=Environment.DEVELOPMENT,
        description="Deployment environment",
    )
    debug: bool = Field(default=False, description="Debug mode")
    log_level: LogLevel = Field(default=LogLevel.INFO, description="Logging level")

    # =========================================================================
    # Server Settings
    # =========================================================================

    host: str = Field(default="0.0.0.0", description="Server bind host")
    port: int = Field(default=8000, ge=1, le=65535, description="Server port")
    workers: int = Field(default=1, ge=1, le=32, description="Number of worker processes")

    # =========================================================================
    # Database Settings
    # =========================================================================

    database_url: str = Field(..., description="Database connection URL")
    database_pool_size: int = Field(default=10, ge=1, le=100)
    database_max_overflow: int = Field(default=20, ge=0, le=100)
    database_pool_timeout: int = Field(default=30, ge=1, le=300)

    # =========================================================================
    # Redis Settings
    # =========================================================================

    redis_url: str = Field(default="redis://localhost:6379", description="Redis URL")
    redis_pool_size: int = Field(default=10, ge=1, le=100)
    redis_socket_timeout: int = Field(default=30, ge=1, le=300)

    # =========================================================================
    # Security Settings
    # =========================================================================

    secret_key: str = Field(..., description="Application secret key")
    jwt_algorithm: str = Field(default="HS256", description="JWT signing algorithm")
    access_token_expire_minutes: int = Field(default=10080, ge=1)  # 1 week
    refresh_token_expire_days: int = Field(default=30, ge=1)

    # Encryption
    encryption_key: Optional[str] = Field(default=None, description="Data encryption key")

    # Rate Limiting
    rate_limit_requests_per_minute: int = Field(default=60, ge=1)
    rate_limit_burst_size: int = Field(default=10, ge=1)

    # CORS
    cors_allowed_origins: list[str] = Field(default_factory=lambda: ["*"])
    cors_allowed_methods: list[str] = Field(default_factory=lambda: ["*"])
    cors_allowed_headers: list[str] = Field(default_factory=lambda: ["*"])
    cors_allow_credentials: bool = Field(default=True)
    cors_max_age: int = Field(default=600)

    # =========================================================================
    # Vault Settings
    # =========================================================================

    vault_enabled: bool = Field(default=False)
    vault_url: Optional[str] = Field(default=None)
    vault_token: Optional[str] = Field(default=None)
    vault_role_id: Optional[str] = Field(default=None)
    vault_secret_id: Optional[str] = Field(default=None)
    vault_namespace: Optional[str] = Field(default=None)
    vault_secret_path: str = Field(default="secret/data/sin-solver")

    # =========================================================================
    # Monitoring & Observability
    # =========================================================================

    metrics_enabled: bool = Field(default=True)
    metrics_port: int = Field(default=9090, ge=1, le=65535)
    tracing_enabled: bool = Field(default=False)
    jaeger_endpoint: Optional[str] = Field(default=None)

    # =========================================================================
    # AI Provider Settings
    # =========================================================================

    mistral_api_key: Optional[str] = Field(default=None)
    gemini_api_key: Optional[str] = Field(default=None)
    groq_api_key: Optional[str] = Field(default=None)
    cerebras_api_key: Optional[str] = Field(default=None)
    sambanova_api_key: Optional[str] = Field(default=None)
    ollama_url: str = Field(default="http://localhost:11434")

    # Default provider selection
    default_ai_provider: str = Field(default="gemini")
    fallback_ai_provider: str = Field(default="mistral")

    # =========================================================================
    # Feature Flags
    # =========================================================================

    feature_flags_enabled: bool = Field(default=True)
    ab_testing_enabled: bool = Field(default=False)

    # =========================================================================
    # CAPTCHA Solver Settings
    # =========================================================================

    captcha_solver_mode: str = Field(default="self_hosted")
    captcha_vision_provider: str = Field(default="gemini")
    max_concurrent_solves: int = Field(default=10, ge=1, le=100)
    solve_timeout_seconds: int = Field(default=60, ge=10, le=300)

    # =========================================================================
    # Internal Network (SIN-Solver Rooms)
    # =========================================================================

    orchestrator_url: str = Field(default="http://172.20.0.31:8000")
    plugin_hub_url: str = Field(default="http://172.20.0.57:8000")
    steel_cdp_url: str = Field(default="ws://172.20.0.20:3000/")

    # =========================================================================
    # Validators
    # =========================================================================

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """Validate database URL uses async driver."""
        if not v.startswith("postgresql+asyncpg://"):
            raise ValueError("Database URL must use asyncpg driver (postgresql+asyncpg://)")
        return v

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Validate secret key minimum length."""
        if len(v) < 32:
            raise ValueError("Secret key must be at least 32 characters")
        return v

    @model_validator(mode="after")
    def validate_vault_config(self) -> "EnterpriseSettings":
        """Validate Vault configuration if enabled."""
        if self.vault_enabled:
            if not self.vault_url:
                raise ValueError("Vault URL required when Vault is enabled")
            if not self.vault_token and not (self.vault_role_id and self.vault_secret_id):
                raise ValueError("Vault token or AppRole credentials required")
        return self

    @model_validator(mode="after")
    def validate_production_settings(self) -> "EnterpriseSettings":
        """Validate production-specific settings."""
        if self.environment == Environment.PRODUCTION:
            if self.debug:
                raise ValueError("Debug mode must be disabled in production")
            if "*" in self.cors_allowed_origins:
                raise ValueError("Wildcard CORS not allowed in production")
            if len(self.secret_key) < 64:
                raise ValueError("Secret key must be at least 64 characters in production")
        return self


# =============================================================================
# Configuration Manager
# =============================================================================


class ConfigurationManager:
    """
    Central configuration manager that coordinates all configuration sources.

    Configuration precedence (highest to lowest):
    1. Environment variables
    2. Vault secrets
    3. Configuration files
    4. Default values
    """

    _instance: Optional["ConfigurationManager"] = None
    _lock = asyncio.Lock()

    def __init__(
        self,
        settings: Optional[EnterpriseSettings] = None,
        vault_client: Optional[VaultClient] = None,
        feature_flags: Optional[FeatureFlagManager] = None,
        tenant_manager: Optional[TenantManager] = None,
    ):
        self.settings = settings or EnterpriseSettings()
        self.vault = vault_client
        self.feature_flags = feature_flags or FeatureFlagManager()
        self.tenants = tenant_manager or TenantManager()
        self._secrets_cache: dict[str, Any] = {}
        self._initialized = False

    @classmethod
    async def get_instance(cls) -> "ConfigurationManager":
        """Get or create singleton instance."""
        if not cls._instance:
            async with cls._lock:
                if not cls._instance:
                    # Load settings from environment
                    settings = EnterpriseSettings()

                    # Initialize Vault if enabled
                    vault = None
                    if settings.vault_enabled:
                        vault = VaultClient(
                            vault_url=settings.vault_url,
                            vault_token=settings.vault_token,
                            role_id=settings.vault_role_id,
                            secret_id=settings.vault_secret_id,
                            namespace=settings.vault_namespace,
                        )

                    # Initialize feature flags
                    feature_flags = FeatureFlagManager()

                    # Initialize tenant manager
                    tenants = TenantManager()

                    cls._instance = cls(
                        settings=settings,
                        vault_client=vault,
                        feature_flags=feature_flags,
                        tenant_manager=tenants,
                    )

        return cls._instance

    async def initialize(self) -> None:
        """Initialize configuration manager."""
        if self._initialized:
            return

        # Load secrets from Vault
        if self.vault:
            await self._load_vault_secrets()

        # Start feature flag manager
        await self.feature_flags.start()

        # Setup default feature flags
        self._setup_default_flags()

        self._initialized = True
        logger.info("Configuration manager initialized")

    async def _load_vault_secrets(self) -> None:
        """Load secrets from Vault."""
        if not self.vault:
            return

        try:
            secrets = await self.vault.get_secret(self.settings.vault_secret_path)
            if secrets:
                self._secrets_cache.update(secrets)
                logger.info("Loaded secrets from Vault")
        except Exception as e:
            logger.error("Failed to load Vault secrets", error=str(e))

    def _setup_default_flags(self) -> None:
        """Setup default feature flags."""
        default_flags = [
            FeatureFlag(
                name="new_solver_algorithm",
                flag_type=FeatureFlagType.PERCENTAGE,
                enabled=True,
                percentage=10.0,
            ),
            FeatureFlag(
                name="enhanced_logging",
                flag_type=FeatureFlagType.BOOLEAN,
                enabled=self.settings.environment != Environment.PRODUCTION,
            ),
            FeatureFlag(
                name="beta_features",
                flag_type=FeatureFlagType.USER_SEGMENT,
                enabled=True,
                user_segments=["beta", "enterprise"],
            ),
        ]

        for flag in default_flags:
            self.feature_flags.register_flag(flag)

    def get_secret(self, key: str, default: Any = None) -> Any:
        """Get secret from cache or environment."""
        # Check cache first
        if key in self._secrets_cache:
            return self._secrets_cache[key]

        # Check settings
        if hasattr(self.settings, key.lower()):
            return getattr(self.settings, key.lower())

        return default

    async def refresh_secrets(self) -> None:
        """Refresh secrets from Vault."""
        if self.vault:
            await self._load_vault_secrets()

    def is_feature_enabled(
        self,
        flag_name: str,
        user_id: Optional[str] = None,
        user_segment: Optional[str] = None,
    ) -> bool:
        """Check if feature is enabled."""
        return self.feature_flags.is_enabled(flag_name, user_id, user_segment)

    def get_ab_variation(
        self,
        flag_name: str,
        user_id: str,
        variations: list[T],
    ) -> Optional[T]:
        """Get A/B test variation."""
        return self.feature_flags.get_variation(flag_name, user_id, variations)

    async def close(self) -> None:
        """Cleanup resources."""
        await self.feature_flags.stop()
        if self.vault:
            await self.vault.close()


# =============================================================================
# Convenience Functions
# =============================================================================


async def get_config() -> ConfigurationManager:
    """Get configuration manager instance."""
    return await ConfigurationManager.get_instance()


def get_settings() -> EnterpriseSettings:
    """Get settings directly."""
    return EnterpriseSettings()


def is_development() -> bool:
    """Check if running in development environment."""
    return EnterpriseSettings().environment == Environment.DEVELOPMENT


def is_production() -> bool:
    """Check if running in production environment."""
    return EnterpriseSettings().environment == Environment.PRODUCTION


# =============================================================================
# Module Exports
# =============================================================================

__all__ = [
    # Enums
    "Environment",
    "LogLevel",
    "FeatureFlagType",
    # Data classes
    "FeatureFlag",
    "Tenant",
    # Managers
    "FeatureFlagManager",
    "TenantManager",
    "VaultClient",
    "ConfigurationManager",
    # Settings
    "EnterpriseSettings",
    # Utilities
    "get_config",
    "get_settings",
    "is_development",
    "is_production",
]
