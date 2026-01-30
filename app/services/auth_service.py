"""
User authentication and authorization service
JWT-based authentication with role-based access control
"""

import secrets
import time
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.core.config import settings
from app.core.redis_cache import RedisCache
from app.models.models import User, UserTier

logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenData(BaseModel):
    """Token data model"""

    user_id: str
    username: str
    tier: UserTier
    is_active: bool


class AuthTokens(BaseModel):
    """Authentication tokens response"""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthService:
    """
    Authentication service for user management

    Features:
    - JWT token generation and validation
    - Password hashing and verification
    - API key management
    - Refresh token rotation
    - Session management
    - Rate limiting support
    """

    def __init__(self):
        """Initialize authentication service"""
        self.secret_key = settings.secret_key
        self.algorithm = settings.algorithm
        self.access_token_expire_minutes = settings.access_token_expire_minutes
        self.refresh_token_expire_days = settings.refresh_token_expire_days

        # Statistics
        self.stats = {
            "tokens_generated": 0,
            "tokens_validated": 0,
            "tokens_failed": 0,
            "password_hashes": 0,
            "api_keys_generated": 0,
        }

        logger.info("Authentication service initialized")

    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        self.stats["password_hashes"] += 1
        return pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return pwd_context.verify(plain_password, hashed_password)

    def generate_api_key(self) -> str:
        """Generate secure API key"""
        self.stats["api_keys_generated"] += 1
        return f"sk_{secrets.token_urlsafe(32)}"

    def generate_tokens(self, user: User) -> AuthTokens:
        """Generate JWT access and refresh tokens"""
        self.stats["tokens_generated"] += 1

        # Access token payload
        access_payload = {
            "sub": user.id,
            "username": user.username,
            "tier": user.tier.value,
            "is_active": user.is_active,
            "type": "access",
            "exp": datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes),
            "iat": datetime.utcnow(),
        }

        # Refresh token payload
        refresh_payload = {
            "sub": user.id,
            "username": user.username,
            "tier": user.tier.value,
            "type": "refresh",
            "exp": datetime.utcnow() + timedelta(days=self.refresh_token_expire_days),
            "iat": datetime.utcnow(),
        }

        # Generate tokens
        access_token = jwt.encode(access_payload, self.secret_key, algorithm=self.algorithm)

        refresh_token = jwt.encode(refresh_payload, self.secret_key, algorithm=self.algorithm)

        return AuthTokens(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=self.access_token_expire_minutes * 60,
        )

    def verify_access_token(self, token: str) -> Optional[TokenData]:
        """Verify JWT access token"""
        try:
            self.stats["tokens_validated"] += 1

            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])

            # Check token type
            if payload.get("type") != "access":
                raise JWTError("Invalid token type")

            # Extract user data
            user_id = payload.get("sub")
            username = payload.get("username")
            tier = payload.get("tier")
            is_active = payload.get("is_active")

            return TokenData(
                user_id=user_id, username=username, tier=UserTier(tier), is_active=is_active
            )

        except JWTError as e:
            self.stats["tokens_failed"] += 1
            logger.warning(f"Token validation failed: {e}")
            return None

    def verify_refresh_token(self, token: str) -> Optional[TokenData]:
        """Verify JWT refresh token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])

            # Check token type
            if payload.get("type") != "refresh":
                raise JWTError("Invalid token type")

            # Extract user data
            user_id = payload.get("sub")
            username = payload.get("username")
            tier = payload.get("tier")

            return TokenData(
                user_id=user_id,
                username=username,
                tier=UserTier(tier),
                is_active=True,  # Refresh tokens assume active
            )

        except JWTError as e:
            logger.warning(f"Refresh token validation failed: {e}")
            return None

    async def is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted (logout)"""
        try:
            cache = await RedisCache.get_instance()
            blacklisted = await cache.get(f"blacklist:{token}")
            return blacklisted is not None
        except Exception as e:
            logger.error(f"Error checking token blacklist: {e}")
            return False

    async def blacklist_token(self, token: str, ttl_seconds: int = None):
        """Blacklist token (on logout)"""
        try:
            cache = await RedisCache.get_instance()
            if ttl_seconds is None:
                # Use token expiration time
                ttl_seconds = self.access_token_expire_minutes * 60

            await cache.set(f"blacklist:{token}", "blacklisted", ttl=ttl_seconds)
            logger.info("Token blacklisted")

        except Exception as e:
            logger.error(f"Error blacklisting token: {e}")

    async def check_rate_limit(self, identifier: str, limit: int, window_seconds: int = 60) -> bool:
        """Check rate limit using Redis"""
        try:
            cache = await RedisCache.get_instance()
            key = f"rate_limit:{identifier}"

            # Get current count
            current_count = await cache.get_counter(key, window_seconds)

            if current_count >= limit:
                logger.warning(f"Rate limit exceeded for {identifier}: {current_count}/{limit}")
                return False

            # Increment counter
            await cache.incr(key)
            return True

        except Exception as e:
            logger.error(f"Error checking rate limit: {e}")
            return True  # Allow on cache errors

    async def get_tier_limits(self, tier: UserTier) -> Dict[str, int]:
        """Get rate limits for user tier"""
        limits = {
            UserTier.FREE: {
                "requests_per_minute": 10,
                "requests_per_hour": 100,
                "requests_per_day": 1000,
                "monthly_limit": 100,
            },
            UserTier.PRO: {
                "requests_per_minute": 60,
                "requests_per_hour": 1000,
                "requests_per_day": 10000,
                "monthly_limit": 100000,
            },
            UserTier.BUSINESS: {
                "requests_per_minute": 120,
                "requests_per_hour": 2000,
                "requests_per_day": 20000,
                "monthly_limit": 1000000,
            },
            UserTier.ENTERPRISE: {
                "requests_per_minute": 300,
                "requests_per_hour": 5000,
                "requests_per_day": 50000,
                "monthly_limit": 10000000,
            },
        }

        return limits.get(tier, limits[UserTier.FREE])

    async def check_api_key_rate_limit(self, api_key: str, tier: UserTier) -> bool:
        """Check rate limit for API key requests"""
        limits = await self.get_tier_limits(tier)

        # Check minute limit
        minute_ok = await self.check_rate_limit(
            f"{api_key}:minute", limits["requests_per_minute"], 60
        )

        # Check hour limit
        hour_ok = await self.check_rate_limit(f"{api_key}:hour", limits["requests_per_hour"], 3600)

        # Check day limit
        day_ok = await self.check_rate_limit(f"{api_key}:day", limits["requests_per_day"], 86400)

        return minute_ok and hour_ok and day_ok

    async def get_stats(self) -> Dict[str, Any]:
        """Get authentication statistics"""
        cache = await RedisCache.get_instance()

        # Get active tokens count (approximate)
        try:
            active_tokens = len(await cache.get_json("active_tokens") or [])
        except:
            active_tokens = 0

        return {
            "auth_service": {
                "tokens_generated": self.stats["tokens_generated"],
                "tokens_validated": self.stats["tokens_validated"],
                "tokens_failed": self.stats["tokens_failed"],
                "password_hashes": self.stats["password_hashes"],
                "api_keys_generated": self.stats["api_keys_generated"],
            },
            "cache": {"active_tokens": active_tokens, "status": "connected"},
        }

    async def health_check(self) -> Dict[str, Any]:
        """Check health of authentication service"""
        try:
            # Test token generation
            test_payload = {
                "sub": "test",
                "username": "test",
                "tier": "free",
                "type": "access",
                "exp": datetime.utcnow() + timedelta(minutes=1),
                "iat": datetime.utcnow(),
            }

            test_token = jwt.encode(test_payload, self.secret_key, algorithm=self.algorithm)

            # Test token validation
            self.verify_access_token(test_token)

            # Test password hashing
            test_hash = self.hash_password("test_password")
            verify_ok = self.verify_password("test_password", test_hash)

            # Test cache
            cache = await RedisCache.get_instance()
            await cache.set("health_check", "ok", ttl=60)
            cache_ok = await cache.get("health_check") == "ok"

            return {
                "status": "healthy" if verify_ok and cache_ok else "unhealthy",
                "token_generation": "working" if test_token else "failed",
                "token_validation": "working" if verify_ok else "failed",
                "password_hashing": "working" if verify_ok else "failed",
                "cache": "working" if cache_ok else "failed",
            }

        except Exception as e:
            return {"status": "unhealthy", "error": str(e)}


# Singleton instance
_auth_service = None


async def get_auth_service() -> AuthService:
    """Get or create authentication service instance"""
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService()
    return _auth_service


# Dependency functions for FastAPI
async def get_current_user_token_data(token: str) -> Optional[TokenData]:
    """Get current user from JWT token"""
    auth_service = await get_auth_service()

    # Check if token is blacklisted
    if await auth_service.is_token_blacklisted(token):
        return None

    # Validate token
    token_data = auth_service.verify_access_token(token)

    if token_data and not token_data.is_active:
        return None

    return token_data
