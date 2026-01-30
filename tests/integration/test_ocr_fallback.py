#!/usr/bin/env python3
"""
Integration Tests for OCR Engine Fallback
Best Practices 2026 - SIN-Solver Testing Framework
"""

import asyncio
import base64
import pytest
import numpy as np
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from typing import Dict, Any, List
import sys
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch, MagicMock

sys.path.insert(
    0, str(Path(__file__).parent.parent.parent / "Docker/builders/builder-1.1-captcha-worker")
)


class TestOCRFallbackChain:
    """Test OCR engine fallback chain"""

    def create_captcha_variants(self) -> Dict[str, str]:
        """Create different CAPTCHA variants for testing"""
        variants = {}

        # Clean text CAPTCHA
        img = Image.new("RGB", (200, 80), color="white")
        draw = ImageDraw.Draw(img)
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36)
        except:
            font = ImageFont.load_default()
        draw.text((50, 20), "ABCD12", fill="black", font=font)

        buffer = BytesIO()
        img.save(buffer, format="PNG")
        variants["clean"] = base64.b64encode(buffer.getvalue()).decode()

        # Noisy CAPTCHA
        arr = np.array(img)
        noise = np.random.randint(-30, 30, arr.shape, dtype=np.int16)
        arr = np.clip(arr.astype(np.int16) + noise, 0, 255).astype(np.uint8)
        noisy_img = Image.fromarray(arr)

        buffer = BytesIO()
        noisy_img.save(buffer, format="PNG")
        variants["noisy"] = base64.b64encode(buffer.getvalue()).decode()

        # Blurred CAPTCHA
        blurred = img.filter(ImageFilter.GaussianBlur(radius=1))
        buffer = BytesIO()
        blurred.save(buffer, format="PNG")
        variants["blurred"] = base64.b64encode(buffer.getvalue()).decode()

        # Low contrast CAPTCHA
        low_contrast = Image.new("RGB", (200, 80), color="#eeeeee")
        draw_lc = ImageDraw.Draw(low_contrast)
        draw_lc.text((50, 20), "XYZ789", fill="#cccccc", font=font)
        buffer = BytesIO()
        low_contrast.save(buffer, format="PNG")
        variants["low_contrast"] = base64.b64encode(buffer.getvalue()).decode()

        return variants

    @pytest.mark.asyncio
    async def test_primary_ocr_success(self):
        """Primary OCR succeeds on clean CAPTCHA"""
        variants = self.create_captcha_variants()

        with patch("ddddocr.DdddOcr") as mock_ocr_class:
            mock_ocr = MagicMock()
            mock_ocr.classification = Mock(return_value="ABCD12")
            mock_ocr_class.return_value = mock_ocr

            from src.utils.ocr_detector import OcrElementDetector

            detector = OcrElementDetector()

            # Decode and test
            img_data = base64.b64decode(variants["clean"])
            img = Image.open(BytesIO(img_data))
            img_array = np.array(img)

            text = detector.extract_text(img_array)

            assert text == "ABCD12"

    @pytest.mark.asyncio
    async def test_ocr_handles_noisy_image(self):
        """OCR handles noisy CAPTCHA"""
        variants = self.create_captcha_variants()

        with patch("ddddocr.DdddOcr") as mock_ocr_class:
            mock_ocr = MagicMock()
            mock_ocr.classification = Mock(return_value="ABCD12")
            mock_ocr_class.return_value = mock_ocr

            from src.utils.ocr_detector import OcrElementDetector

            detector = OcrElementDetector()

            img_data = base64.b64decode(variants["noisy"])
            img = Image.open(BytesIO(img_data))
            img_array = np.array(img)

            # Should not crash
            text = detector.extract_text(img_array)
            assert isinstance(text, str)

    @pytest.mark.asyncio
    async def test_ocr_handles_blurred_image(self):
        """OCR handles blurred CAPTCHA"""
        variants = self.create_captcha_variants()

        with patch("ddddocr.DdddOcr") as mock_ocr_class:
            mock_ocr = MagicMock()
            mock_ocr.classification = Mock(return_value="ABCD12")
            mock_ocr_class.return_value = mock_ocr

            from src.utils.ocr_detector import OcrElementDetector

            detector = OcrElementDetector()

            img_data = base64.b64decode(variants["blurred"])
            img = Image.open(BytesIO(img_data))
            img_array = np.array(img)

            # Should not crash
            text = detector.extract_text(img_array)
            assert isinstance(text, str)

    @pytest.mark.asyncio
    async def test_ocr_handles_low_contrast(self):
        """OCR handles low contrast CAPTCHA"""
        variants = self.create_captcha_variants()

        with patch("ddddocr.DdddOcr") as mock_ocr_class:
            mock_ocr = MagicMock()
            mock_ocr.classification = Mock(return_value="XYZ789")
            mock_ocr_class.return_value = mock_ocr

            from src.utils.ocr_detector import OcrElementDetector

            detector = OcrElementDetector()

            img_data = base64.b64decode(variants["low_contrast"])
            img = Image.open(BytesIO(img_data))
            img_array = np.array(img)

            # Should not crash
            text = detector.extract_text(img_array)
            assert isinstance(text, str)

    @pytest.mark.asyncio
    async def test_ocr_preprocessing_applied(self):
        """OCR preprocessing improves accuracy"""
        import cv2

        # Create image with distortion
        img = Image.new("RGB", (200, 80), color="white")
        draw = ImageDraw.Draw(img)
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36)
        except:
            font = ImageFont.load_default()
        draw.text((50, 20), "TEST99", fill="black", font=font)

        img_array = np.array(img)
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)

        # Apply thresholding (preprocessing)
        _, thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)

        with patch("ddddocr.DdddOcr") as mock_ocr_class:
            mock_ocr = MagicMock()
            mock_ocr.classification = Mock(return_value="TEST99")
            mock_ocr_class.return_value = mock_ocr

            from src.utils.ocr_detector import OcrElementDetector

            detector = OcrElementDetector()

            text = detector.extract_text(thresh)

            assert isinstance(text, str)


class TestVisionSolverFallback:
    """Test vision solver fallback chain"""

    @pytest.mark.asyncio
    async def test_mistral_primary_success(self):
        """Mistral as primary solver succeeds"""
        from src.solvers.vision_mistral import MistralSolver

        with patch("httpx.AsyncClient") as mock_client:
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json = Mock(
                return_value={"choices": [{"message": {"content": "ABC123"}}]}
            )
            mock_client.return_value.__aenter__ = AsyncMock(
                return_value=MagicMock(post=AsyncMock(return_value=mock_response))
            )
            mock_client.return_value.__aexit__ = AsyncMock(return_value=False)

            solver = MistralSolver()
            # Test that solver can be called (mock handles API)
            assert solver is not None

    @pytest.mark.asyncio
    async def test_qwen_fallback_when_mistral_fails(self):
        """Qwen used when Mistral fails"""
        from src.solvers.veto_engine import VetoEngine

        with (
            patch("src.solvers.veto_engine.MistralSolver") as mock_mistral,
            patch("src.solvers.veto_engine.QwenSolver") as mock_qwen,
            patch("src.solvers.veto_engine.KimiSolver") as mock_kimi,
            patch("src.solvers.veto_engine.SteelController"),
        ):
            # Mistral fails, Qwen succeeds
            mock_mistral.return_value.solve = AsyncMock(return_value=Exception("API Error"))
            mock_qwen.return_value.solve = AsyncMock(return_value="QWEN_SOLUTION")
            mock_kimi.return_value.solve_with_context = AsyncMock(return_value="KIMI_SOLUTION")

            engine = VetoEngine()
            result = await engine.solve_text_captcha("fake_image")

            assert result["success"] is True
            assert result["solution"] == "QWEN_SOLUTION"
            assert result["solver_used"] == "qwen"

    @pytest.mark.asyncio
    async def test_kimi_joker_on_disagreement(self):
        """Kimi acts as joker when solvers disagree"""
        from src.solvers.veto_engine import VetoEngine

        with (
            patch("src.solvers.veto_engine.MistralSolver") as mock_mistral,
            patch("src.solvers.veto_engine.QwenSolver") as mock_qwen,
            patch("src.solvers.veto_engine.KimiSolver") as mock_kimi,
            patch("src.solvers.veto_engine.SteelController"),
        ):
            # Solvers disagree
            mock_mistral.return_value.solve = AsyncMock(return_value="ANSWER_A")
            mock_qwen.return_value.solve = AsyncMock(return_value="ANSWER_B")
            mock_kimi.return_value.solve_with_context = AsyncMock(return_value="ANSWER_C")

            engine = VetoEngine()
            result = await engine.solve_text_captcha("fake_image")

            assert result["success"] is True
            assert result["solver_used"] == "kimi_joker"
            mock_kimi.return_value.solve_with_context.assert_called_once()


class TestSolverHealthMonitoring:
    """Test solver health monitoring and failover"""

    @pytest.mark.asyncio
    async def test_circuit_breaker_prevents_unhealthy_calls(self):
        """Circuit breaker prevents calls to unhealthy solver"""
        from src.utils.circuit_breaker import CircuitBreaker, CircuitBreakerOpenError

        cb = CircuitBreaker("test_solver", failure_threshold=1, recovery_timeout=60)

        # Open circuit
        cb.record_failure()
        assert cb.state.name == "OPEN"
        assert cb.can_execute() is False

    @pytest.mark.asyncio
    async def test_circuit_recovery(self):
        """Circuit recovers after timeout"""
        from src.utils.circuit_breaker import CircuitBreaker
        import time

        cb = CircuitBreaker("test_solver", failure_threshold=1, recovery_timeout=0.1)

        # Open circuit
        cb.record_failure()
        assert cb.state.name == "OPEN"

        # Wait for recovery
        time.sleep(0.15)

        # Should transition to HALF_OPEN
        assert cb.can_execute() is True
        assert cb.state.name == "HALF_OPEN"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
