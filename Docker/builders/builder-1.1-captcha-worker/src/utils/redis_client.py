"""
Redis Client Utility
Async Redis connection management
"""

import os
import logging
from typing import Optional
import redis.asyncio as redis

logger = logging.getLogger(__name__)

REDIS_HOST = os.getenv("REDIS_HOST", "room-04-redis-cache")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))


class RedisClient:
    """Async Redis client wrapper"""

    def __init__(self):
        self.host = REDIS_HOST
        self.port = REDIS_PORT
        self.db = REDIS_DB
        self._client: Optional[redis.Redis] = None

    async def connect(self):
        """Connect to Redis"""
        try:
            self._client = redis.Redis(
                host=self.host, port=self.port, db=self.db, decode_responses=True
            )
            await self._client.ping()
            logger.info(f"Connected to Redis at {self.host}:{self.port}")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise

    async def disconnect(self):
        """Disconnect from Redis"""
        if self._client:
            await self._client.close()
            logger.info("Disconnected from Redis")

    async def is_connected(self) -> bool:
        """Check if connected to Redis"""
        if not self._client:
            return False
        try:
            await self._client.ping()
            return True
        except:
            return False

    async def increment(self, key: str, amount: int = 1, expire: int = 60) -> int:
        """Increment counter with expiration"""
        if not self._client:
            raise RuntimeError("Redis not connected")

        pipe = self._client.pipeline()
        pipe.incr(key, amount)
        pipe.expire(key, expire)
        results = await pipe.execute()
        return results[0]

    async def get(self, key: str) -> Optional[str]:
        """Get value by key"""
        if not self._client:
            return None
        return await self._client.get(key)

    async def set(self, key: str, value: str, expire: Optional[int] = None):
        """Set value with optional expiration"""
        if not self._client:
            raise RuntimeError("Redis not connected")
        await self._client.set(key, value, ex=expire)

    async def get_hash(self, key: str) -> dict:
        """Get hash as dictionary"""
        if not self._client:
            return {}
        return await self._client.hgetall(key)

    async def increment_hash(self, key: str, field: str, amount: int = 1):
        """Increment hash field"""
        if not self._client:
            raise RuntimeError("Redis not connected")
        await self._client.hincrby(key, field, amount)
