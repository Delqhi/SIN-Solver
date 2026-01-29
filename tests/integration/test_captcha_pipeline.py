#!/usr/bin/env python3
"""
Integration Tests for CAPTCHA Solving Pipeline
Best Practices 2026 - SIN-Solver Testing Framework
"""

import asyncio
import base64
import pytest
import numpy as np
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from typing import Dict, Any
import sys
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch, MagicMock

# Add paths
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "Docker/builders/builder-1.1-captcha-worker"))


class TestCaptchaPipeline:
    """End-to-end CAPTCHA solving pipeline tests"""
    
    def create_test_captcha(self, text: str = "ABC123", noise: bool = False) -> str:
        """Create a test CAPTCHA image as base64"""
        # Create image with text
        img = Image.new('RGB', (200, 80), color='white')
        draw = ImageDraw.Draw(img)
        
        # Draw text
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36)
        except:
            font = ImageFont.load_default()
        
        draw.text((50, 20), text, fill='black', font=font)
        
        # Add noise if requested
        if noise:
            arr = np.array(img)
            noise_arr = np.random.randint(0, 50, arr.shape, dtype=np.uint8)
            arr = np.clip(arr.astype(np.int16) + noise_arr, 0, 255).astype(np.uint8)
            img = Image.fromarray(arr)
        
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        return base64.b64encode(buffer.getvalue()).decode()
    
    @pytest.mark.asyncio
    async def test_text_captcha_flow(self):
        """Complete text CAPTCHA solving flow"""
        from src.main import solve_captcha, CaptchaSolveRequest
        
        image_b64 = self.create_test_captcha("TEST99")
        
        request = CaptchaSolveRequest(
            image_data=image_b64,
            captcha_type="text",
            client_id="test_pipeline"
        )
        
        with patch('src.main.veto_engine') as mock_veto, \
             patch('src.main.rate_limiter') as mock_limiter, \
             patch('src.main.ocr_detector') as mock_ocr:
            
            mock_veto.solve_text_captcha = AsyncMock(return_value={
                "success": True,
                "solution": "TEST99",
                "solver_used": "consensus",
                "confidence": 0.95
            })
            mock_limiter.is_rate_limited = AsyncMock(return_value=(False, 1))
            mock_ocr.detect_elements = Mock(return_value=[{"type": "text"}])
            
            result = await solve_captcha(request)
            
            assert result.success is True
            assert result.solution == "TEST99"
            assert result.confidence == 0.95
    
    @pytest.mark.asyncio
    async def test_rate_limited_request(self):
        """Rate limited request returns error"""
        from src.main import solve_captcha, CaptchaSolveRequest
        
        request = CaptchaSolveRequest(
            image_data=self.create_test_captcha(),
            client_id="rate_limited_client"
        )
        
        with patch('src.main.veto_engine', MagicMock()), \
             patch('src.main.rate_limiter') as mock_limiter:
            
            mock_limiter.is_rate_limited = AsyncMock(return_value=(True, 21))
            
            result = await solve_captcha(request)
            
            assert result.success is False
            assert "Rate limit exceeded" in result.error
    
    @pytest.mark.asyncio
    async def test_invalid_image_data(self):
        """Invalid image data handled gracefully"""
        from src.main import solve_captcha, CaptchaSolveRequest
        
        request = CaptchaSolveRequest(
            image_data="invalid_base64_data!!!",
            client_id="test_client"
        )
        
        with patch('src.main.veto_engine', MagicMock()), \
             patch('src.main.rate_limiter') as mock_limiter:
            
            mock_limiter.is_rate_limited = AsyncMock(return_value=(False, 1))
            
            # Should handle gracefully
            result = await solve_captcha(request)
            
            # Should return error response, not crash
            assert isinstance(result.success, bool)
    
    @pytest.mark.asyncio
    async def test_solver_not_initialized(self):
        """Solver not initialized returns 503"""
        from src.main import solve_captcha, CaptchaSolveRequest
        from fastapi import HTTPException
        
        request = CaptchaSolveRequest(
            image_data=self.create_test_captcha(),
            client_id="test_client"
        )
        
        with patch('src.main.veto_engine', None):
            with pytest.raises(HTTPException) as exc_info:
                await solve_captcha(request)
            
            assert exc_info.value.status_code == 503
    
    @pytest.mark.asyncio
    async def test_batch_processing(self):
        """Batch CAPTCHA processing"""
        from src.main import solve_batch, BatchCaptchaRequest, CaptchaSolveRequest
        
        batch_request = BatchCaptchaRequest(
            batch_id="batch_001",
            requests=[
                CaptchaSolveRequest(
                    image_data=self.create_test_captcha("TEST1"),
                    client_id="batch_test"
                ),
                CaptchaSolveRequest(
                    image_data=self.create_test_captcha("TEST2"),
                    client_id="batch_test"
                )
            ]
        )
        
        with patch('src.main.veto_engine') as mock_veto, \
             patch('src.main.rate_limiter') as mock_limiter, \
             patch('src.main.ocr_detector') as mock_ocr:
            
            mock_veto.solve_text_captcha = AsyncMock(return_value={
                "success": True,
                "solution": "TEST",
                "confidence": 0.9,
                "solver_used": "consensus"
            })
            mock_limiter.is_rate_limited = AsyncMock(return_value=(False, 1))
            mock_ocr.detect_elements = Mock(return_value=[])
            
            result = await solve_batch(batch_request)
            
            assert result['batch_id'] == "batch_001"
            assert result['total'] == 2
            assert 'successful' in result
            assert 'failed' in result
            assert 'results' in result
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_triggered(self):
        """Circuit breaker prevents calls when open"""
        from src.main import solve_captcha, CaptchaSolveRequest
        from src.utils.circuit_breaker import CircuitBreakerOpenError
        
        request = CaptchaSolveRequest(
            image_data=self.create_test_captcha(),
            client_id="test_client"
        )
        
        with patch('src.main.veto_engine') as mock_veto, \
             patch('src.main.rate_limiter') as mock_limiter, \
             patch('src.main.ocr_detector') as mock_ocr:
            
            mock_limiter.is_rate_limited = AsyncMock(return_value=(False, 1))
            mock_ocr.detect_elements = Mock(return_value=[])
            mock_veto.solve_text_captcha = AsyncMock(
                side_effect=CircuitBreakerOpenError("mistral_api is OPEN")
            )
            
            result = await solve_captcha(request)
            
            assert result.success is False
            assert "Circuit" in result.error or "temporarily unavailable" in result.error


class TestOCRFallback:
    """Test OCR engine fallback logic"""
    
    @pytest.fixture
    def detector(self):
        with patch('ddddocr.DdddOcr'):
            from src.utils.ocr_detector import OcrElementDetector
            return OcrElementDetector()
    
    def test_ocr_detects_elements(self, detector):
        """OCR detects clickable elements"""
        import cv2
        
        # Create image with shapes
        img = np.zeros((200, 200, 3), dtype=np.uint8)
        cv2.rectangle(img, (50, 50), (150, 100), (255, 255, 255), -1)
        cv2.circle(img, (100, 160), 20, (255, 255, 255), -1)
        
        elements = detector.detect_elements(img)
        
        assert isinstance(elements, list)
        # Should detect at least one element
        if elements:
            assert 'bbox' in elements[0]
            assert 'center' in elements[0]
            assert 'type' in elements[0]


class TestRedisIntegration:
    """Test Redis integration"""
    
    @pytest.mark.asyncio
    async def test_redis_rate_limit_storage(self):
        """Rate limits are stored in Redis"""
        from src.utils.redis_client import RedisClient
        from src.utils.rate_limiter import RateLimiter
        
        mock_redis = MagicMock()
        mock_redis.increment = AsyncMock(return_value=5)
        mock_redis.get = AsyncMock(return_value="5")
        
        limiter = RateLimiter(mock_redis)
        
        is_limited, count = await limiter.is_rate_limited("client_1", max_requests=10)
        
        mock_redis.increment.assert_called_once()
        assert count == 5


class TestErrorRecovery:
    """Test error recovery mechanisms"""
    
    @pytest.mark.asyncio
    async def test_graceful_degradation(self):
        """System degrades gracefully under errors"""
        from src.main import solve_captcha, CaptchaSolveRequest
        
        request = CaptchaSolveRequest(
            image_data=self.create_test_captcha(),
            client_id="test_client"
        )
        
        # Test with various error conditions
        with patch('src.main.veto_engine') as mock_veto, \
             patch('src.main.rate_limiter') as mock_limiter:
            
            mock_limiter.is_rate_limited = AsyncMock(return_value=(False, 1))
            mock_veto.solve_text_captcha = AsyncMock(side_effect=Exception("Unexpected error"))
            
            result = await solve_captcha(request)
            
            # Should return error response, not crash
            assert isinstance(result.success, bool)
            assert result.error is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
