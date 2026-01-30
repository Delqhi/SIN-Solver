#!/usr/bin/env python3
"""
Unit Tests for API Endpoints
Best Practices 2026 - SIN-Solver Testing Framework
"""

import pytest
import base64
import numpy as np
from unittest.mock import AsyncMock, Mock, patch, MagicMock
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(
    0, str(Path(__file__).parent.parent.parent / "Docker/builders/builder-1.1-captcha-worker")
)


class TestCaptchaSolveRequest:
    """Test CAPTCHA solve request validation"""

    def test_valid_request(self):
        """Valid request passes validation"""
        from src.main import CaptchaSolveRequest

        request = CaptchaSolveRequest(
            image_data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
            captcha_type="text",
            client_id="test_client",
        )

        assert request.image_data is not None
        assert request.captcha_type == "text"
        assert request.client_id == "test_client"
        assert request.timeout == 30  # Default
        assert request.priority == "normal"  # Default

    def test_invalid_image_size(self):
        """Image size validation rejects oversized images"""
        from src.main import CaptchaSolveRequest

        # Create a fake "large" base64 string (>10MB when decoded)
        large_data = base64.b64encode(b"x" * (11 * 1024 * 1024)).decode()

        with pytest.raises(ValueError) as exc_info:
            CaptchaSolveRequest(image_data=large_data)

        assert "too large" in str(exc_info.value).lower() or "Invalid" in str(exc_info.value)

    def test_invalid_base64(self):
        """Invalid base64 is rejected"""
        from src.main import CaptchaSolveRequest

        with pytest.raises(ValueError):
            CaptchaSolveRequest(image_data="not_valid_base64!!!")

    def test_invalid_priority(self):
        """Invalid priority is rejected"""
        from src.main import CaptchaSolveRequest

        with pytest.raises(ValueError):
            CaptchaSolveRequest(priority="invalid_priority")

    def test_timeout_bounds(self):
        """Timeout must be within bounds"""
        from src.main import CaptchaSolveRequest

        # Too low
        with pytest.raises(ValueError):
            CaptchaSolveRequest(timeout=0)

        # Too high
        with pytest.raises(ValueError):
            CaptchaSolveRequest(timeout=301)

        # Valid bounds
        req1 = CaptchaSolveRequest(timeout=1)
        assert req1.timeout == 1

        req2 = CaptchaSolveRequest(timeout=300)
        assert req2.timeout == 300


class TestCaptchaSolveResponse:
    """Test CAPTCHA solve response"""

    def test_response_structure(self):
        """Response has correct structure"""
        from src.main import CaptchaSolveResponse

        response = CaptchaSolveResponse(
            success=True,
            solution="ABC123",
            confidence=0.95,
            solve_time_ms=1500,
            solver_model="consensus",
        )

        assert response.success is True
        assert response.solution == "ABC123"
        assert response.confidence == 0.95
        assert response.solve_time_ms == 1500
        assert response.solver_model == "consensus"
        assert response.timestamp is not None

    def test_default_values(self):
        """Response has sensible defaults"""
        from src.main import CaptchaSolveResponse

        response = CaptchaSolveResponse(success=False)

        assert response.success is False
        assert response.solution is None
        assert response.confidence == 0.0
        assert response.solve_time_ms == 0
        assert response.solver_model == ""


class TestBatchCaptchaRequest:
    """Test batch CAPTCHA request"""

    def test_valid_batch(self):
        """Valid batch request"""
        from src.main import BatchCaptchaRequest, CaptchaSolveRequest

        batch = BatchCaptchaRequest(
            batch_id="batch_001",
            requests=[
                CaptchaSolveRequest(
                    image_data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
                ),
                CaptchaSolveRequest(
                    image_data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
                ),
            ],
        )

        assert batch.batch_id == "batch_001"
        assert len(batch.requests) == 2

    def test_batch_too_large(self):
        """Batch limited to 100 requests"""
        from src.main import BatchCaptchaRequest, CaptchaSolveRequest

        with pytest.raises(ValueError):
            BatchCaptchaRequest(
                batch_id="batch_001",
                requests=[
                    CaptchaSolveRequest(
                        image_data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
                    )
                    for _ in range(101)
                ],
            )


class TestHealthCheck:
    """Test health check endpoint logic"""

    @pytest.mark.asyncio
    async def test_health_all_healthy(self):
        """Health check passes when all services healthy"""
        with (
            patch("src.main.veto_engine", MagicMock()),
            patch("src.main.rate_limiter", MagicMock()),
            patch("src.main.redis_client") as mock_redis,
            patch("src.main.ocr_detector") as mock_ocr,
            patch("src.main.mistral_circuit", MagicMock()),
            patch("src.main.qwen_circuit", MagicMock()),
        ):
            mock_redis.is_connected = AsyncMock(return_value=True)
            mock_ocr.health_check = Mock(return_value=True)

            from src.main import health_check

            result = await health_check()

            assert result["status"] == "healthy"
            assert result["version"] == "2.1.0"
            assert result["services"]["veto_engine"] is True
            assert result["services"]["redis"] is True

    @pytest.mark.asyncio
    async def test_health_unhealthy(self):
        """Health check fails when service unhealthy"""
        with (
            patch("src.main.veto_engine", None),
            patch("src.main.rate_limiter", MagicMock()),
            patch("src.main.redis_client") as mock_redis,
            patch("src.main.ocr_detector") as mock_ocr,
        ):
            mock_redis.is_connected = AsyncMock(return_value=True)
            mock_ocr.health_check = Mock(return_value=True)

            from src.main import health_check
            from fastapi import HTTPException

            with pytest.raises(HTTPException) as exc_info:
                await health_check()

            assert exc_info.value.status_code == 503


class TestMetrics:
    """Test Prometheus metrics"""

    def test_metrics_exist(self):
        """All required metrics exist"""
        from src.main import (
            CAPTCHA_SOLVES_TOTAL,
            CAPTCHA_SOLVE_DURATION,
            ACTIVE_WORKERS,
            CIRCUIT_BREAKER_STATE,
            RATE_LIMIT_HITS,
            QUEUE_SIZE,
            APP_INFO,
        )

        # Just verify they exist and are the right type
        assert CAPTCHA_SOLVES_TOTAL is not None
        assert CAPTCHA_SOLVE_DURATION is not None
        assert ACTIVE_WORKERS is not None
        assert CIRCUIT_BREAKER_STATE is not None
        assert RATE_LIMIT_HITS is not None
        assert QUEUE_SIZE is not None
        assert APP_INFO is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
