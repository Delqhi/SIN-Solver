"""
Rate Limiter
Sliding window rate limiting using Redis
"""

import logging
from datetime import datetime, timedelta
from typing import Tuple

from src.utils.redis_client import RedisClient

logger = logging.getLogger(__name__)


class RateLimiter:
    """Rate limiter using Redis sliding window"""

    def __init__(self, redis_client: RedisClient):
        self.redis = redis_client

    async def is_rate_limited(
        self, key: str, max_requests: int = 20, window_seconds: int = 60
    ) -> Tuple[bool, int]:
        """
        Check if request should be rate limited

        Returns:
            (is_limited, current_count)
        """
        redis_key = f"rate_limit:{key}"

        try:
            current = await self.redis.increment(redis_key, expire=window_seconds)

            if current > max_requests:
                logger.warning(f"Rate limit exceeded for {key}: {current}/{max_requests}")
                return True, current

            return False, current

        except Exception as e:
            logger.error(f"Rate limit check error: {e}")
            # Allow request on error
            return False, 0

    async def get_current_count(self, key: str) -> int:
        """Get current request count"""
        redis_key = f"rate_limit:{key}"

        try:
            count = await self.redis.get(redis_key)
            return int(count) if count else 0
        except:
            return 0

    async def reset(self, key: str):
        """Reset rate limit counter"""
        redis_key = f"rate_limit:{key}"

        try:
            await self.redis.set(redis_key, "0")
        except Exception as e:
            logger.error(f"Rate limit reset error: {e}")
