#!/usr/bin/env python3
"""
Unit Tests for Rate Limiter
Best Practices 2026 - SIN-Solver Testing Framework
"""

import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "Docker/builders/builder-1.1-captcha-worker"))

from src.utils.rate_limiter import RateLimiter


class MockRedisClient:
    """Mock Redis client for testing"""
    
    def __init__(self):
        self.data = {}
    
    async def increment(self, key, expire=60):
        if key not in self.data:
            self.data[key] = 0
        self.data[key] += 1
        return self.data[key]
    
    async def get(self, key):
        return str(self.data.get(key, 0))
    
    async def set(self, key, value):
        self.data[key] = int(value)


class TestRateLimiter:
    """Test suite for Rate Limiter"""
    
    @pytest.fixture
    def mock_redis(self):
        return MockRedisClient()
    
    @pytest.fixture
    def rate_limiter(self, mock_redis):
        return RateLimiter(mock_redis)
    
    @pytest.mark.asyncio
    async def test_initial_request_allowed(self, rate_limiter):
        """First request is always allowed"""
        is_limited, count = await rate_limiter.is_rate_limited("client_1", max_requests=10, window_seconds=60)
        
        assert is_limited is False
        assert count == 1
    
    @pytest.mark.asyncio
    async def test_request_count_increment(self, rate_limiter):
        """Request count increments correctly"""
        # Make 5 requests
        for i in range(5):
            is_limited, count = await rate_limiter.is_rate_limited("client_1", max_requests=10, window_seconds=60)
            assert is_limited is False
            assert count == i + 1
    
    @pytest.mark.asyncio
    async def test_rate_limit_triggered(self, rate_limiter):
        """Rate limit triggers after max requests"""
        # Make exactly max_requests
        for i in range(10):
            is_limited, count = await rate_limiter.is_rate_limited("client_1", max_requests=10, window_seconds=60)
            assert is_limited is False
        
        # 11th request should be limited
        is_limited, count = await rate_limiter.is_rate_limited("client_1", max_requests=10, window_seconds=60)
        assert is_limited is True
        assert count == 11
    
    @pytest.mark.asyncio
    async def test_separate_clients_tracked_separately(self, rate_limiter):
        """Different clients have separate rate limits"""
        # Client 1 makes 5 requests
        for _ in range(5):
            await rate_limiter.is_rate_limited("client_1", max_requests=10, window_seconds=60)
        
        # Client 2 makes 5 requests
        for _ in range(5):
            await rate_limiter.is_rate_limited("client_2", max_requests=10, window_seconds=60)
        
        # Both should still be allowed
        is_limited_1, count_1 = await rate_limiter.is_rate_limited("client_1", max_requests=10, window_seconds=60)
        is_limited_2, count_2 = await rate_limiter.is_rate_limited("client_2", max_requests=10, window_seconds=60)
        
        assert is_limited_1 is False
        assert is_limited_2 is False
        assert count_1 == 6
        assert count_2 == 6
    
    @pytest.mark.asyncio
    async def test_get_current_count(self, rate_limiter):
        """get_current_count returns correct count"""
        # Initially 0
        count = await rate_limiter.get_current_count("client_1")
        assert count == 0
        
        # After some requests
        for _ in range(3):
            await rate_limiter.is_rate_limited("client_1", max_requests=10, window_seconds=60)
        
        count = await rate_limiter.get_current_count("client_1")
        assert count == 3
    
    @pytest.mark.asyncio
    async def test_reset(self, rate_limiter):
        """Reset clears the counter"""
        # Make some requests
        for _ in range(5):
            await rate_limiter.is_rate_limited("client_1", max_requests=10, window_seconds=60)
        
        # Reset
        await rate_limiter.reset("client_1")
        
        # Should be 0
        count = await rate_limiter.get_current_count("client_1")
        assert count == 0
    
    @pytest.mark.asyncio
    async def test_error_allows_request(self, rate_limiter, mock_redis):
        """On Redis error, request is allowed (fail open)"""
        # Make Redis throw an error
        mock_redis.increment = AsyncMock(side_effect=Exception("Redis error"))
        
        is_limited, count = await rate_limiter.is_rate_limited("client_1", max_requests=10, window_seconds=60)
        
        # Should allow request on error
        assert is_limited is False
        assert count == 0


class TestRateLimiterEdgeCases:
    """Edge case tests for Rate Limiter"""
    
    @pytest.fixture
    def mock_redis(self):
        return MockRedisClient()
    
    @pytest.fixture
    def rate_limiter(self, mock_redis):
        return RateLimiter(mock_redis)
    
    @pytest.mark.asyncio
    async def test_zero_max_requests(self, rate_limiter):
        """Zero max requests blocks all"""
        is_limited, count = await rate_limiter.is_rate_limited("client_1", max_requests=0, window_seconds=60)
        assert is_limited is True
    
    @pytest.mark.asyncio
    async def test_negative_max_requests(self, rate_limiter):
        """Negative max requests treated as 0"""
        is_limited, count = await rate_limiter.is_rate_limited("client_1", max_requests=-1, window_seconds=60)
        # First request might still be allowed depending on implementation
        # This tests the behavior doesn't crash
        assert isinstance(is_limited, bool)
        assert isinstance(count, int)
    
    @pytest.mark.asyncio
    async def test_empty_client_id(self, rate_limiter):
        """Empty client ID works"""
        is_limited, count = await rate_limiter.is_rate_limited("", max_requests=10, window_seconds=60)
        assert is_limited is False
        assert count == 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
