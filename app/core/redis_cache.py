import redis.asyncio as redis
import asyncio
import logging
import json
from typing import Optional, Any
from app.core.config import settings

logger = logging.getLogger(__name__)


class RedisCache:
    _instance = None
    _lock = asyncio.Lock()

    def __init__(self):
        self.redis = None
        self.enabled = False
        try:
            self.redis = redis.from_url(settings.redis_url, encoding="utf-8", decode_responses=True)
            self.enabled = True
        except Exception as e:
            logger.warning(f"Redis not available: {e}")

    async def close(self):
        """Close the Redis connection"""
        if self.redis:
            await self.redis.close()
            self.enabled = False
            logger.info("RedisCache connection closed.")

    @classmethod
    async def get_instance(cls):
        if not cls._instance:
            async with cls._lock:
                if not cls._instance:
                    cls._instance = cls()
        return cls._instance

    async def get(self, key: str) -> Optional[str]:
        if not self.enabled or not self.redis:
            return None
        try:
            return await self.redis.get(key)
        except Exception:
            return None

    async def set(self, key: str, value: str, ttl: int = 300):
        if not self.enabled or not self.redis:
            return
        try:
            await self.redis.set(key, value, ex=ttl)
        except Exception:
            pass

    async def get_json(self, key: str) -> Optional[Any]:
        data = await self.get(key)
        if data:
            try:
                return json.loads(data)
            except:
                return None
        return None

    async def set_json(self, key: str, value: Any, ttl: int = 300):
        await self.set(key, json.dumps(value), ttl=ttl)

    async def incr(self, key: str):
        if not self.enabled or not self.redis:
            return
        try:
            await self.redis.incr(key)
        except Exception:
            pass

    async def get_counter(self, key: str, window: int = 60) -> int:
        if not self.enabled or not self.redis:
            return 0
        try:
            val = await self.redis.get(key)
            return int(val) if val else 0
        except Exception:
            return 0
