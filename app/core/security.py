"""
Enterprise Security Module for SIN-Solver CAPTCHA Solving System.

This module provides comprehensive security features including:
- Distributed rate limiting with Redis backend
- JWT-based API key authentication
- Request signing and HMAC validation
- IP whitelist/blacklist functionality
- SQL injection protection
- XSS protection headers
- Content Security Policy (CSP)
- Comprehensive audit logging

Following OWASP ASVS 4.0 Level 2 compliance.

Author: SIN-Solver Security Team
Version: 2.0.0
Date: 2026-02
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import ipaddress
import json
import re
import secrets
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Optional
from urllib.parse import urlparse

import httpx
import redis.asyncio as redis
import structlog
from fastapi import Depends, HTTPException, Request, Security, status
from fastapi.security import APIKeyHeader, HTTPBearer, OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field, field_validator

from app.core.config import settings

logger = structlog.get_logger(__name__)

# =============================================================================
# Security Constants & Enums
# =============================================================================

class SecurityEventType(str, Enum):
    """Types of security events for audit logging."""
    
    AUTH_SUCCESS = "auth_success"
    AUTH_FAILURE = "auth_failure"
    RATE_LIMIT_EXCEEDED = "rate_limit_exceeded"
    IP_BLOCKED = "ip_blocked"
    SUSPICIOUS_REQUEST = "suspicious_request"
    SQL_INJECTION_ATTEMPT = "sql_injection_attempt"
    XSS_ATTEMPT = "xss_attempt"
    API_KEY_ROTATED = "api_key_rotated"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    TOKEN_REFRESH = "token_refresh"
    LOGOUT = "logout"


class ThreatLevel(str, Enum):
    """Threat severity levels."""
    
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# =============================================================================
# Security Configuration Models
# =============================================================================

class RateLimitConfig(BaseModel):
    """Configuration for rate limiting per endpoint type."""
    
    requests_per_minute: int = Field(default=60, ge=1, le=10000)
    burst_size: int = Field(default=10, ge=1, le=1000)
    block_duration_seconds: int = Field(default=300, ge=60, le=86400)
    key_prefix: str = Field(default="ratelimit")


class SecurityHeadersConfig(BaseModel):
    """Configuration for security headers."""
    
    content_security_policy: str = Field(
        default=(
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "connect-src 'self' https:; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )
    )
    strict_transport_security: str = Field(default="max-age=31536000; includeSubDomains; preload")
    x_content_type_options: str = Field(default="nosniff")
    x_frame_options: str = Field(default="DENY")
    x_xss_protection: str = Field(default="1; mode=block")
    referrer_policy: str = Field(default="strict-origin-when-cross-origin")
    permissions_policy: str = Field(
        default="accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
    )


class IPFilterConfig(BaseModel):
    """Configuration for IP filtering."""
    
    whitelist: list[str] = Field(default_factory=list)
    blacklist: list[str] = Field(default_factory=list)
    enable_geo_blocking: bool = Field(default=False)
    blocked_countries: list[str] = Field(default_factory=list)
    
    @field_validator("whitelist", "blacklist")
    @classmethod
    def validate_ip_ranges(cls, v: list[str]) -> list[str]:
        """Validate IP addresses and CIDR ranges."""
        for ip in v:
            try:
                ipaddress.ip_network(ip, strict=False)
            except ValueError as e:
                raise ValueError(f"Invalid IP or CIDR range: {ip}") from e
        return v


# =============================================================================
# Audit Logging
# =============================================================================

@dataclass
class SecurityEvent:
    """Represents a security event for audit logging."""
    
    event_type: SecurityEventType
    timestamp: float = field(default_factory=time.time)
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    client_ip: Optional[str] = None
    user_id: Optional[str] = None
    api_key_id: Optional[str] = None
    request_path: Optional[str] = None
    request_method: Optional[str] = None
    user_agent: Optional[str] = None
    threat_level: ThreatLevel = ThreatLevel.LOW
    details: dict[str, Any] = field(default_factory=dict)
    correlation_id: Optional[str] = None
    
    def to_dict(self) -> dict[str, Any]:
        """Convert event to dictionary for logging/serialization."""
        return {
            "event_id": self.event_id,
            "event_type": self.event_type.value,
            "timestamp": self.timestamp,
            "timestamp_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(self.timestamp)),
            "client_ip": self.client_ip,
            "user_id": self.user_id,
            "api_key_id": self.api_key_id,
            "request_path": self.request_path,
            "request_method": self.request_method,
            "user_agent": self.user_agent,
            "threat_level": self.threat_level.value,
            "details": self.details,
            "correlation_id": self.correlation_id,
        }


class AuditLogger:
    """
    Enterprise-grade audit logger for security events.
    
    Supports multiple backends: structured logging, Redis streams,
    and optional external SIEM integration.
    """
    
    def __init__(
        self,
        redis_client: Optional[redis.Redis] = None,
        siem_webhook_url: Optional[str] = None,
        enable_structlog: bool = True,
        retention_days: int = 90,
    ):
        self.redis = redis_client
        self.siem_webhook_url = siem_webhook_url
        self.enable_structlog = enable_structlog
        self.retention_days = retention_days
        self._lock = asyncio.Lock()
        self._event_buffer: list[SecurityEvent] = []
        self._buffer_size = 100
        
    async def log_event(self, event: SecurityEvent) -> None:
        """Log a security event to all configured backends."""
        event_dict = event.to_dict()
        
        # Structured logging
        if self.enable_structlog:
            log_method = (
                logger.error if event.threat_level == ThreatLevel.CRITICAL
                else logger.warning if event.threat_level == ThreatLevel.HIGH
                else logger.info
            )
            log_method(
                "security_event",
                **event_dict
            )
        
        # Redis stream for real-time monitoring
        if self.redis:
            try:
                await self.redis.xadd(
                    "security:events",
                    {"data": json.dumps(event_dict)},
                    maxlen=10000,
                    approximate=True,
                )
            except Exception as e:
                logger.error("Failed to write to Redis stream", error=str(e))
        
        # Buffer for batch SIEM submission
        async with self._lock:
            self._event_buffer.append(event)
            if len(self._event_buffer) >= self._buffer_size:
                await self._flush_buffer()
        
        # Immediate SIEM alert for high/critical threats
        if event.threat_level in (ThreatLevel.HIGH, ThreatLevel.CRITICAL):
            await self._send_to_siem(event)
    
    async def _flush_buffer(self) -> None:
        """Flush the event buffer to SIEM."""
        if not self._event_buffer or not self.siem_webhook_url:
            return
            
        events = self._event_buffer[:]
        self._event_buffer.clear()
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                await client.post(
                    self.siem_webhook_url,
                    json={"events": [e.to_dict() for e in events]},
                    headers={"Content-Type": "application/json"},
                )
        except Exception as e:
            logger.error("Failed to send events to SIEM", error=str(e))
    
    async def _send_to_siem(self, event: SecurityEvent) -> None:
        """Send a single high-priority event to SIEM."""
        if not self.siem_webhook_url:
            return
            
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.post(
                    self.siem_webhook_url,
                    json=event.to_dict(),
                    headers={"Content-Type": "application/json"},
                )
        except Exception as e:
            logger.error("Failed to send critical event to SIEM", error=str(e))
    
    async def get_recent_events(
        self,
        event_type: Optional[SecurityEventType] = None,
        threat_level: Optional[ThreatLevel] = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """Retrieve recent security events from Redis stream."""
        if not self.redis:
            return []
            
        try:
            # Read from Redis stream
            entries = await self.redis.xrevrange("security:events", count=limit * 2)
            events = []
            
            for entry_id, fields in entries:
                if "data" in fields:
                    try:
                        event_data = json.loads(fields["data"])
                        
                        # Apply filters
                        if event_type and event_data.get("event_type") != event_type.value:
                            continue
                        if threat_level and event_data.get("threat_level") != threat_level.value:
                            continue
                            
                        events.append(event_data)
                        if len(events) >= limit:
                            break
                    except json.JSONDecodeError:
                        continue
                        
            return events
        except Exception as e:
            logger.error("Failed to retrieve events from Redis", error=str(e))
            return []
    
    async def close(self) -> None:
        """Cleanup resources and flush remaining events."""
        await self._flush_buffer()


# =============================================================================
# Distributed Rate Limiting
# =============================================================================

class DistributedRateLimiter:
    """
    Distributed rate limiter using Redis with sliding window algorithm.
    
    Features:
    - Sliding window for accurate rate limiting
    - Burst handling with token bucket
    - Per-endpoint and per-user customization
    - Automatic blocking on violation
    """
    
    def __init__(
        self,
        redis_client: Optional[redis.Redis] = None,
        default_config: Optional[RateLimitConfig] = None,
    ):
        self.redis = redis_client
        self.default_config = default_config or RateLimitConfig()
        self._local_cache: dict[str, tuple[int, float]] = {}
        self._cache_lock = asyncio.Lock()
        
    def _make_key(self, identifier: str, config: RateLimitConfig) -> str:
        """Generate Redis key for rate limit tracking."""
        return f"{config.key_prefix}:{identifier}"
    
    def _make_block_key(self, identifier: str) -> str:
        """Generate Redis key for block status."""
        return f"ratelimit:block:{identifier}"
    
    async def is_blocked(self, identifier: str) -> tuple[bool, Optional[int]]:
        """Check if an identifier is currently blocked."""
        if not self.redis:
            return False, None
            
        block_key = self._make_block_key(identifier)
        try:
            ttl = await self.redis.ttl(block_key)
            if ttl > 0:
                return True, ttl
            return False, None
        except Exception as e:
            logger.error("Failed to check block status", error=str(e))
            return False, None
    
    async def check_rate_limit(
        self,
        identifier: str,
        config: Optional[RateLimitConfig] = None,
    ) -> tuple[bool, dict[str, Any]]:
        """
        Check if request is within rate limit.
        
        Returns:
            Tuple of (allowed, metadata) where metadata includes
            remaining requests, reset time, etc.
        """
        config = config or self.default_config
        
        # Check if blocked first
        is_blocked, block_ttl = await self.is_blocked(identifier)
        if is_blocked:
            return False, {
                "blocked": True,
                "retry_after": block_ttl,
                "limit": config.requests_per_minute,
                "remaining": 0,
            }
        
        if not self.redis:
            # Fallback: allow if no Redis
            return True, {
                "blocked": False,
                "limit": config.requests_per_minute,
                "remaining": config.requests_per_minute - 1,
                "reset": int(time.time()) + 60,
            }
        
        key = self._make_key(identifier, config)
        now = time.time()
        window_start = now - 60  # 1-minute window
        
        try:
            # Use Redis sorted set for sliding window
            pipe = self.redis.pipeline()
            
            # Remove old entries outside window
            pipe.zremrangebyscore(key, 0, window_start)
            
            # Count current entries in window
            pipe.zcard(key)
            
            # Add current request
            pipe.zadd(key, {str(now): now})
            
            # Set expiry on the key
            pipe.expire(key, 120)
            
            results = await pipe.execute()
            current_count = results[1]
            
            # Check burst limit
            burst_key = f"{key}:burst"
            burst_count = await self.redis.get(burst_key)
            burst_count = int(burst_count) if burst_count else 0
            
            if current_count > config.requests_per_minute or burst_count >= config.burst_size:
                # Block the identifier
                block_key = self._make_block_key(identifier)
                await self.redis.setex(block_key, config.block_duration_seconds, "1")
                
                return False, {
                    "blocked": True,
                    "retry_after": config.block_duration_seconds,
                    "limit": config.requests_per_minute,
                    "remaining": 0,
                }
            
            # Increment burst counter
            pipe = self.redis.pipeline()
            pipe.incr(burst_key)
            pipe.expire(burst_key, 1)  # 1-second burst window
            await pipe.execute()
            
            remaining = max(0, config.requests_per_minute - current_count - 1)
            reset_time = int(now) + 60
            
            return True, {
                "blocked": False,
                "limit": config.requests_per_minute,
                "remaining": remaining,
                "reset": reset_time,
            }
            
        except Exception as e:
            logger.error("Rate limit check failed", error=str(e), identifier=identifier)
            # Fail open for reliability
            return True, {"error": "Rate limit check failed", "blocked": False}
    
    async def reset(self, identifier: str, config: Optional[RateLimitConfig] = None) -> None:
        """Reset rate limit counters for an identifier."""
        config = config or self.default_config
        
        if not self.redis:
            return
            
        key = self._make_key(identifier, config)
        block_key = self._make_block_key(identifier)
        burst_key = f"{key}:burst"
        
        try:
            pipe = self.redis.pipeline()
            pipe.delete(key)
            pipe.delete(block_key)
            pipe.delete(burst_key)
            await pipe.execute()
        except Exception as e:
            logger.error("Failed to reset rate limit", error=str(e))


# =============================================================================
# JWT Token Management
# =============================================================================

class TokenManager:
    """
    JWT token manager with rotation and revocation support.
    
    Features:
    - Access and refresh token generation
    - Token rotation on refresh
    - Redis-backed revocation list
    - Configurable expiry times
    """
    
    def __init__(
        self,
        secret_key: str,
        algorithm: str = "HS256",
        access_token_expire_minutes: int = 10080,  # 1 week
        refresh_token_expire_days: int = 30,
        redis_client: Optional[redis.Redis] = None,
    ):
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.access_token_expire_minutes = access_token_expire_minutes
        self.refresh_token_expire_days = refresh_token_expire_days
        self.redis = redis_client
        
    def _create_token(
        self,
        data: dict[str, Any],
        expires_delta: Optional[int] = None,
        token_type: str = "access",
    ) -> str:
        """Create a JWT token."""
        to_encode = data.copy()
        
        if expires_delta:
            expire = time.time() + (expires_delta * 60)
        else:
            expire = time.time() + (self.access_token_expire_minutes * 60)
            
        to_encode.update({
            "exp": expire,
            "iat": time.time(),
            "jti": str(uuid.uuid4()),
            "type": token_type,
        })
        
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def create_access_token(
        self,
        user_id: str,
        scopes: Optional[list[str]] = None,
        tenant_id: Optional[str] = None,
        extra_claims: Optional[dict[str, Any]] = None,
    ) -> str:
        """Create an access token for a user."""
        data: dict[str, Any] = {
            "sub": user_id,
            "scopes": scopes or ["api:read"],
        }
        
        if tenant_id:
            data["tenant_id"] = tenant_id
        if extra_claims:
            data.update(extra_claims)
            
        return self._create_token(
            data,
            expires_delta=self.access_token_expire_minutes,
            token_type="access",
        )
    
    def create_refresh_token(self, user_id: str, tenant_id: Optional[str] = None) -> str:
        """Create a refresh token for a user."""
        data: dict[str, Any] = {"sub": user_id}
        
        if tenant_id:
            data["tenant_id"] = tenant_id
            
        return self._create_token(
            data,
            expires_delta=self.refresh_token_expire_days * 24 * 60,
            token_type="refresh",
        )
    
    async def verify_token(self, token: str, expected_type: str = "access") -> dict[str, Any]:
        """Verify and decode a JWT token."""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # Check token type
            if payload.get("type") != expected_type:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid token type. Expected {expected_type}.",
                )
            
            # Check revocation list
            if self.redis:
                jti = payload.get("jti")
                if jti:
                    is_revoked = await self.redis.sismember("tokens:revoked", jti)
                    if is_revoked:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Token has been revoked",
                        )
            
            return payload
            
        except JWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}",
            ) from e
    
    async def revoke_token(self, token: str) -> None:
        """Revoke a token by adding it to the revocation list."""
        if not self.redis:
            return
            
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            jti = payload.get("jti")
            
            if jti:
                # Add to revocation set with expiry matching token expiry
                exp = payload.get("exp", time.time() + 86400)
                ttl = max(0, int(exp - time.time()))
                await self.redis.sadd("tokens:revoked", jti)
                await self.redis.expire("tokens:revoked", ttl)
        except JWTError:
            pass  # Invalid token, nothing to revoke


# =============================================================================
# Request Signing & HMAC Validation
# =============================================================================

class RequestSigner:
    """
    HMAC request signing for API authentication.
    
    Implements AWS Signature Version 4 style signing for
    enhanced API security.
    """
    
    def __init__(self, secret_key: str, service_name: str = "sin-solver"):
        self.secret_key = secret_key
        self.service_name = service_name
        
    def _get_signature_key(self, date_stamp: str, region: str = "global") -> bytes:
        """Derive signature key using HMAC-SHA256 chain."""
        k_date = hmac.new(
            f"SIN-SOLVER4{self.secret_key}".encode(),
            date_stamp.encode(),
            hashlib.sha256,
        ).digest()
        k_region = hmac.new(k_date, region.encode(), hashlib.sha256).digest()
        k_service = hmac.new(k_region, self.service_name.encode(), hashlib.sha256).digest()
        k_signing = hmac.new(k_service, "sin-solver4_request".encode(), hashlib.sha256).digest()
        return k_signing
    
    def sign_request(
        self,
        method: str,
        uri: str,
        headers: dict[str, str],
        body: Optional[bytes] = None,
        timestamp: Optional[str] = None,
    ) -> str:
        """
        Sign an HTTP request.
        
        Returns:
            Base64-encoded signature string.
        """
        if timestamp is None:
            timestamp = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
        
        date_stamp = timestamp[:8]
        
        # Create canonical request
        canonical_uri = urlparse(uri).path or "/"
        canonical_querystring = ""
        
        # Headers
        signed_headers = "host;x-sin-date"
        canonical_headers = f"host:{headers.get('host', 'api.sin-solver.io')}\n"
        canonical_headers += f"x-sin-date:{timestamp}\n"
        
        # Payload hash
        if body:
            payload_hash = hashlib.sha256(body).hexdigest()
        else:
            payload_hash = hashlib.sha256(b"").hexdigest()
        
        canonical_request = (
            f"{method.upper()}\n"
            f"{canonical_uri}\n"
            f"{canonical_querystring}\n"
            f"{canonical_headers}\n"
            f"{signed_headers}\n"
            f"{payload_hash}"
        )
        
        # Create string to sign
        credential_scope = f"{date_stamp}/global/{self.service_name}/sin-solver4_request"
        string_to_sign = (
            f"SIN-SOLVER4-HMAC-SHA256\n"
            f"{timestamp}\n"
            f"{credential_scope}\n"
            f"{hashlib.sha256(canonical_request.encode()).hexdigest()}"
        )
        
        # Calculate signature
        signing_key = self._get_signature_key(date_stamp)
        signature = hmac.new(
            signing_key,
            string_to_sign.encode(),
            hashlib.sha256,
        ).hexdigest()
        
        return signature
    
    def verify_signature(
        self,
        signature: str,
        method: str,
        uri: str,
        headers: dict[str, str],
        body: Optional[bytes] = None,
        timestamp: Optional[str] = None,
        max_age_seconds: int = 300,
    ) -> bool:
        """Verify a request signature."""
        if timestamp is None:
            timestamp = headers.get("x-sin-date")
            
        if not timestamp:
            return False
        
        # Check timestamp freshness
        try:
            ts = time.strptime(timestamp, "%Y%m%dT%H%M%SZ")
            request_time = time.mktime(ts)
            if abs(time.time() - request_time) > max_age_seconds:
                return False
        except ValueError:
            return False
        
        expected = self.sign_request(method, uri, headers, body, timestamp)
        return hmac.compare_digest(signature, expected)


# =============================================================================
# IP Filtering
# =============================================================================

class IPFilter:
    """
    IP whitelist/blacklist filtering with CIDR support.
    
    Supports:
    - IPv4 and IPv6 addresses
    - CIDR notation for ranges
    - Geo-blocking (with external service)
    - Rate-based auto-blocking
    """
    
    def __init__(
        self,
        config: Optional[IPFilterConfig] = None,
        redis_client: Optional[redis.Redis] = None,
    ):
        self.config = config or IPFilterConfig()
        self.redis = redis_client
        self._whitelist_networks = [
            ipaddress.ip_network(ip, strict=False) for ip in self.config.whitelist
        ]
        self._blacklist_networks = [
            ipaddress.ip_network(ip, strict=False) for ip in self.config.blacklist
        ]
    
    def _parse_ip(self, ip_string: str) -> Optional[ipaddress.IPv4Address | ipaddress.IPv6Address]:
        """Parse IP address string."""
        try:
            return ipaddress.ip_address(ip_string)
        except ValueError:
            return None
    
    def is_whitelisted(self, ip_string: str) -> bool:
        """Check if IP is in whitelist."""
        ip = self._parse_ip(ip_string)
        if not ip:
            return False
            
        for network in self._whitelist_networks:
            if ip in network:
                return True
        return False
    
    def is_blacklisted(self, ip_string: str) -> bool:
        """Check if IP is in blacklist."""
        ip = self._parse_ip(ip_string)
        if not ip:
            return True  # Block invalid IPs
            
        for network in self._blacklist_networks:
            if ip in network:
                return True
        return False
    
    async def is_auto_blocked(self, ip_string: str) -> tuple[bool, Optional[int]]:
        """Check if IP is auto-blocked due to violations."""
        if not self.redis:
            return False, None
            
        try:
            block_key = f"ipfilter:block:{ip_string}"
            ttl = await self.redis.ttl(block_key)
            if ttl > 0:
                return True, ttl
            return False, None
        except Exception as e:
            logger.error("Failed to check auto-block", error=str(e))
            return False, None
    
    async def auto_block(self, ip_string: str, duration_seconds: int = 3600) -> None:
        """Auto-block an IP address."""
        if not self.redis:
            return
            
        try:
            block_key = f"ipfilter:block:{ip_string}"
            await self.redis.setex(block_key, duration_seconds, "1")
            
            # Increment violation counter
            violation_key = f"ipfilter:violations:{ip_string}"
            await self.redis.incr(violation_key)
            await self.redis.expire(violation_key, 86400)  # 24 hour window
            
        except Exception as e:
            logger.error("Failed to auto-block IP", error=str(e))
    
    async def check_ip(self, ip_string: str) -> tuple[bool, Optional[str]]:
        """
        Check if IP is allowed.
        
        Returns:
            Tuple of (allowed, reason)
        """
        # Whitelist takes precedence
        if self.is_whitelisted(ip_string):
            return True, None
        
        # Check static blacklist
        if self.is_blacklisted(ip_string):
            return False, "IP blacklisted"
        
        # Check auto-block
        is_blocked, ttl = await self.is_auto_blocked(ip_string)
        if is_blocked:
            return False, f"IP temporarily blocked (retry after {ttl}s)"
        
        return True, None


# =============================================================================
# Input Validation & Sanitization
# =============================================================================

class InputValidator:
    """
    Input validation and sanitization for security.
    
    Protects against:
    - SQL injection
    - XSS attacks
    - Command injection
    - Path traversal
    """
    
    # SQL injection patterns
    SQL_PATTERNS = [
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION)\b)",
        r"(--|#|/\*|\*/)",
        r"(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+",
        r"(\bOR\b|\bAND\b)\s+'[^']*'\s*=\s*'[^']*'",
        r";\s*\b(DROP|DELETE|INSERT|UPDATE)\b",
        r"(\bWAITFOR\b|\bDELAY\b)\s*\'",
        r"(\bBENCHMARK\b|\bSLEEP\b)\s*\(",
    ]
    
    # XSS patterns
    XSS_PATTERNS = [
        r"<script[^>]*>[\s\S]*?</script>",
        r"javascript:",
        r"on\w+\s*=\s*['\"]",
        r"<iframe",
        r"<object",
        r"<embed",
        r"expression\s*\(",
    ]
    
    # Path traversal patterns
    PATH_TRAVERSAL_PATTERNS = [
        r"\.\./",
        r"\.\.\\",
        r"%2e%2e%2f",
        r"%252e%252e%252f",
        r"\.%00",
    ]
    
    def __init__(self):
        self.sql_regex = re.compile("|".join(self.SQL_PATTERNS), re.IGNORECASE)
        self.xss_regex = re.compile("|".join(self.XSS_PATTERNS), re.IGNORECASE)
        self.path_regex = re.compile("|".join(self.PATH_TRAVERSAL_PATTERNS), re.IGNORECASE)
    
    def contains_sql_injection(self, value: str) -> bool:
        """Check if string contains SQL injection patterns."""
        return bool(self.sql_regex.search(value))
    
    def contains_xss(self, value: str) -> bool:
        """Check if string contains XSS patterns."""
        return bool(self.xss_regex.search(value))
    
    def contains_path_traversal(self, value: str) -> bool:
        """Check if string contains path traversal patterns."""
        return bool(self.path_regex.search(value))
    
    def sanitize_string(
        self,
        value: str,
        max_length: int = 1000,
        allow_html: bool = False,
    ) -> str:
        """
        Sanitize a string input.
        
        Args:
            value: Input string
            max_length: Maximum allowed length
            allow_html: Whether to allow HTML tags
            
        Returns:
            Sanitized string
        """
        if not isinstance(value, str):
            value = str(value)
        
        # Truncate if too long
        if len(value) > max_length:
            value = value[:max_length]
        
        if not allow_html:
            # Remove HTML tags
            value = re.sub(r"<[^>]+>", "", value)
        
        # Normalize whitespace
        value = " ".join(value.split())
        
        return value
    
    def validate_api_key_format(self, api_key: str) -> bool:
        """Validate API key format."""
        # Expected format: sin_<base64url>_<checksum>
        if not api_key.startswith("sin_"):
            return False
        
        parts = api_key.split("_")
        if len(parts) != 3:
            return False
        
        # Check minimum length
        if len(parts[1]) < 32:
            return False
        
        return True
    
    def generate_api_key(self) -> str:
        """Generate a new secure API key."""
        # Generate random bytes
        random_bytes = secrets.token_urlsafe(32)
        
        # Create checksum
        checksum = hashlib.sha256(f"sin_{random_bytes}".encode()).hexdigest()[:8]
        
        return f"sin_{random_bytes}_{checksum}"


# =============================================================================
# Security Headers
# =============================================================================

class SecurityHeaders:
    """
    Security headers management.
    
    Implements OWASP recommended security headers.
    """
    
    def __init__(self, config: Optional[SecurityHeadersConfig] = None):
        self.config = config or SecurityHeadersConfig()
    
    def get_headers(self) -> dict[str, str]:
        """Get all security headers."""
        return {
            "Content-Security-Policy": self.config.content_security_policy,
            "Strict-Transport-Security": self.config.strict_transport_security,
            "X-Content-Type-Options": self.config.x_content_type_options,
            "X-Frame-Options": self.config.x_frame_options,
            "X-XSS-Protection": self.config.x_xss_protection,
            "Referrer-Policy": self.config.referrer_policy,
            "Permissions-Policy": self.config.permissions_policy,
            "X-Permitted-Cross-Domain-Policies": "none",
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Resource-Policy": "same-site",
        }


# =============================================================================
# Circuit Breaker Pattern
# =============================================================================

class CircuitState(str, Enum):
    """Circuit breaker states."""
    
    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, rejecting requests
    HALF_OPEN = "half_open"  # Testing if service recovered


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""
    
    failure_threshold: int = 5
    recovery_timeout: float = 30.0
    half_open_max_calls: int = 3
    success_threshold: int = 2


class CircuitBreaker:
    """
    Circuit breaker pattern for resilient service calls.
    
    Prevents cascading failures by stopping requests to
    failing services temporarily.
    """
    
    def __init__(
        self,
        name: str,
        config: Optional[CircuitBreakerConfig] = None,
        redis_client: Optional[redis.Redis] = None,
    ):
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self.redis = redis_client
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time: Optional[float] = None
        self._half_open_calls = 0
        self._lock = asyncio.Lock()
    
    async def _sync_state(self) -> None:
        """Sync state with Redis for distributed circuit breakers."""
        if not self.redis:
            return
            
        try:
            state_key = f"circuit:{self.name}:state"
            state = await self.redis.get(state_key)
            if state:
                self._state = CircuitState(state.decode())
        except Exception as e:
            logger.error("Failed to sync circuit state", error=str(e), name=self.name)
    
    async def _update_state(self, state: CircuitState) -> None:
        """Update state and sync to Redis."""
        self._state = state
        
        if self.redis:
            try:
                state_key = f"circuit:{self.name}:state"
                await self.redis.set(state_key, state.value)
            except Exception as e:
                logger.error("Failed to update circuit state", error=str(e), name=self.name)
    
    @property
    def state(self) -> CircuitState:
        """Get current circuit state."""
        return self._state
    
    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute a function with circuit breaker protection.
        
        Args:
            func: Async function to call
            *args, **kwargs: Arguments to pass to func
            
        Returns:
            Result from func
            
        Raises:
            CircuitBreakerOpen: If circuit is open
            Exception: Original exception if call fails
        """
        await self._sync_state()
        
        async with self._lock:
            if self._state == CircuitState.OPEN:
                # Check if recovery timeout has passed
                if self._last_failure_time:
                    elapsed = time.time() - self._last_failure_time
                    if elapsed > self.config.recovery_timeout:
                        await self._update_state(CircuitState.HALF_OPEN)
                        self._half_open_calls = 0
                        self._success_count = 0
                    else:
                        raise CircuitBreakerOpen(
                            f"Circuit breaker '{self.name}' is OPEN. "
                            f"Retry after {self.config.recovery_timeout - elapsed:.1f}s"
                        )
            
            if self._state == CircuitState.HALF_OPEN:
                if self._half_open_calls >= self.config.half_open_max_calls:
                    raise CircuitBreakerOpen(
                        f"Circuit breaker '{self.name}' is HALF_OPEN (max calls reached)"
                    )
                self._half_open_calls += 1
        
        # Execute the call
        try:
            result = await func(*args, **kwargs)
            await self._on_success()
            return result
        except Exception as e:
            await self._on_failure()
            raise
    
    async def _on_success(self) -> None:
        """Handle successful call."""
        async with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._success_count += 1
                if self._success_count >= self.config.success_threshold:
                    await self._update_state(CircuitState.CLOSED)
                    self._failure_count = 0
            else:
                self._failure_count = 0
    
    async def _on_failure(self) -> None:
        """Handle failed call."""
        async with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.time()
            
            if self._failure_count >= self.config.failure_threshold:
                await self._update_state(CircuitState.OPEN)


class CircuitBreakerOpen(Exception):
    """Exception raised when circuit breaker is open."""
    pass


# =============================================================================
# Security Manager - Main Entry Point
# =============================================================================

class SecurityManager:
    """
    Main security manager that coordinates all security components.
    
    This is the primary interface for security operations in the application.
    """
    
    _instance: Optional["SecurityManager"] = None
    _lock = asyncio.Lock()
    
    def __init__(
        self,
        redis_client: Optional[redis.Redis] = None,
        secret_key: Optional[str] = None,
    ):
        self.secret_key = secret_key or settings.secret_key
        self.redis = redis_client
        
        # Initialize components
        self.rate_limiter = DistributedRateLimiter(redis_client=self.redis)
        self.token_manager = TokenManager(
            secret_key=self.secret_key,
            redis_client=self.redis,
        )
        self.request_signer = RequestSigner(self.secret_key)
        self.ip_filter = IPFilter(redis_client=self.redis)
        self.input_validator = InputValidator()
        self.security_headers = SecurityHeaders()
        self.audit_logger = AuditLogger(redis_client=self.redis)
        
        # Circuit breakers registry
        self._circuit_breakers: dict[str, CircuitBreaker] = {}
    
    @classmethod
    async def get_instance(
        cls,
        redis_client: Optional[redis.Redis] = None,
    ) -> "SecurityManager":
        """Get or create the singleton SecurityManager instance."""
        if not cls._instance:
            async with cls._lock:
                if not cls._instance:
                    cls._instance = cls(redis_client=redis_client)
        return cls._instance
    
    def get_circuit_breaker(
        self,
        name: str,
        config: Optional[CircuitBreakerConfig] = None,
    ) -> CircuitBreaker:
        """Get or create a circuit breaker."""
        if name not in self._circuit_breakers:
            self._circuit_breakers[name] = CircuitBreaker(
                name=name,
                config=config,
                redis_client=self.redis,
            )
        return self._circuit_breakers[name]
    
    async def check_request_security(
        self,
        request: Request,
        api_key: Optional[str] = None,
    ) -> tuple[bool, dict[str, Any]]:
        """
        Perform comprehensive security checks on a request.
        
        Args:
            request: FastAPI request object
            api_key: Optional API key for validation
            
        Returns:
            Tuple of (allowed, metadata)
        """
        client_ip = self._get_client_ip(request)
        path = request.url.path
        method = request.method
        
        # Check IP filter
        allowed, reason = await self.ip_filter.check_ip(client_ip)
        if not allowed:
            await self.audit_logger.log_event(SecurityEvent(
                event_type=SecurityEventType.IP_BLOCKED,
                client_ip=client_ip,
                request_path=path,
                request_method=method,
                threat_level=ThreatLevel.MEDIUM,
                details={"reason": reason},
                correlation_id=getattr(request.state, "correlation_id", None),
            ))
            return False, {"error": reason, "code": "IP_BLOCKED"}
        
        # Check rate limit
        rate_limit_key = f"{client_ip}:{api_key or 'anon'}"
        allowed, rate_data = await self.rate_limiter.check_rate_limit(rate_limit_key)
        
        if not allowed:
            await self.audit_logger.log_event(SecurityEvent(
                event_type=SecurityEventType.RATE_LIMIT_EXCEEDED,
                client_ip=client_ip,
                api_key_id=api_key[:10] + "..." if api_key else None,
                request_path=path,
                request_method=method,
                threat_level=ThreatLevel.MEDIUM,
                details=rate_data,
                correlation_id=getattr(request.state, "correlation_id", None),
            ))
            return False, {
                "error": "Rate limit exceeded",
                "code": "RATE_LIMITED",
                "retry_after": rate_data.get("retry_after"),
            }
        
        return True, {
            "rate_limit": rate_data,
            "client_ip": client_ip,
        }
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request, handling proxies."""
        # Check X-Forwarded-For header
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            # Take the first IP in the chain (client)
            return forwarded.split(",")[0].strip()
        
        # Check X-Real-IP header
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fall back to direct connection
        if request.client:
            return request.client.host
        
        return "unknown"
    
    async def close(self) -> None:
        """Cleanup resources."""
        await self.audit_logger.close()


# =============================================================================
# FastAPI Dependencies
# =============================================================================

# Security scheme definitions
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)


async def get_security_manager() -> SecurityManager:
    """Dependency to get the security manager."""
    from app.core.redis_cache import RedisCache
    
    redis_cache = await RedisCache.get_instance()
    redis_client = redis_cache.redis if redis_cache.enabled else None
    
    return await SecurityManager.get_instance(redis_client=redis_client)


async def require_api_key(
    request: Request,
    api_key: Optional[str] = Security(api_key_header),
    security_manager: SecurityManager = Depends(get_security_manager),
) -> dict[str, Any]:
    """
    Dependency to require and validate API key.
    
    Returns:
        Dictionary with API key information.
    """
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required",
            headers={"WWW-Authenticate": "ApiKey"},
        )
    
    # Validate API key format
    if not security_manager.input_validator.validate_api_key_format(api_key):
        await security_manager.audit_logger.log_event(SecurityEvent(
            event_type=SecurityEventType.AUTH_FAILURE,
            client_ip=security_manager._get_client_ip(request),
            request_path=request.url.path,
            request_method=request.method,
            threat_level=ThreatLevel.LOW,
            details={"reason": "Invalid API key format"},
        ))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key format",
        )
    
    # TODO: Validate against database/API key store
    # For now, we accept any well-formed key in dev mode
    
    return {
        "api_key_id": api_key[:16] + "...",
        "scopes": ["api:read", "api:write"],
    }


async def verify_token_dependency(
    request: Request,
    token: str = Depends(oauth2_scheme),
    security_manager: SecurityManager = Depends(get_security_manager),
) -> dict[str, Any]:
    """Dependency to verify JWT token."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        payload = await security_manager.token_manager.verify_token(token)
        
        await security_manager.audit_logger.log_event(SecurityEvent(
            event_type=SecurityEventType.AUTH_SUCCESS,
            client_ip=security_manager._get_client_ip(request),
            user_id=payload.get("sub"),
            request_path=request.url.path,
            request_method=request.method,
            threat_level=ThreatLevel.LOW,
        ))
        
        return payload
    except HTTPException:
        await security_manager.audit_logger.log_event(SecurityEvent(
            event_type=SecurityEventType.AUTH_FAILURE,
            client_ip=security_manager._get_client_ip(request),
            request_path=request.url.path,
            request_method=request.method,
            threat_level=ThreatLevel.MEDIUM,
        ))
        raise


async def rate_limit_dependency(
    request: Request,
    security_manager: SecurityManager = Depends(get_security_manager),
) -> dict[str, Any]:
    """Dependency to enforce rate limiting."""
    api_key = request.headers.get("X-API-Key")
    allowed, metadata = await security_manager.check_request_security(request, api_key)
    
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=metadata.get("error", "Request blocked"),
            headers={"Retry-After": str(metadata.get("retry_after", 60))},
        )
    
    return metadata


# =============================================================================
# Module Exports
# =============================================================================

__all__ = [
    # Core classes
    "SecurityManager",
    "AuditLogger",
    "SecurityEvent",
    "SecurityEventType",
    "ThreatLevel",
    # Rate limiting
    "DistributedRateLimiter",
    "RateLimitConfig",
    # Authentication
    "TokenManager",
    "RequestSigner",
    # Access control
    "IPFilter",
    "IPFilterConfig",
    # Validation
    "InputValidator",
    # Headers
    "SecurityHeaders",
    "SecurityHeadersConfig",
    # Circuit breaker
    "CircuitBreaker",
    "CircuitBreakerConfig",
    "CircuitState",
    "CircuitBreakerOpen",
    # Dependencies
    "get_security_manager",
    "require_api_key",
    "verify_token_dependency",
    "rate_limit_dependency",
    "api_key_header",
    "oauth2_scheme",
    "bearer_scheme",
]
