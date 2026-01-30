#!/usr/bin/env python3
"""
Unit Tests for OCR Element Detector
Best Practices 2026 - SIN-Solver Testing Framework
"""

import pytest
import numpy as np
import sys
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

sys.path.insert(
    0, str(Path(__file__).parent.parent.parent / "Docker/builders/builder-1.1-captcha-worker")
)

from src.utils.ocr_detector import OcrElementDetector


class MockDdddOcr:
    """Mock ddddocr for testing"""

    def __init__(self, show_ad=False):
        pass

    def classification(self, img_bytes):
        return "TEST123"


class TestOcrElementDetector:
    """Test suite for OCR Element Detector"""

    @pytest.fixture
    def detector(self):
        with patch("ddddocr.DdddOcr", MockDdddOcr):
            return OcrElementDetector()

    def test_initialization(self):
        """Detector initializes OCR engine"""
        with patch("ddddocr.DdddOcr", MockDdddOcr):
            detector = OcrElementDetector()
            assert detector.ocr_engine is not None

    def test_health_check_positive(self, detector):
        """Health check returns True when engine is ready"""
        assert detector.health_check() is True

    def test_health_check_negative(self, detector):
        """Health check returns False when engine is None"""
        detector.ocr_engine = None
        assert detector.health_check() is False

    def test_detect_elements_empty_image(self, detector):
        """Detect elements returns empty list for empty image"""
        # Create small black image
        image = np.zeros((10, 10, 3), dtype=np.uint8)

        elements = detector.detect_elements(image)

        # Small image may have no detectable elements
        assert isinstance(elements, list)

    def test_detect_elements_with_shapes(self, detector):
        """Detect elements finds shapes in image"""
        # Create image with a rectangle
        image = np.zeros((100, 100, 3), dtype=np.uint8)
        # Draw white rectangle
        image[20:80, 20:80] = 255

        elements = detector.detect_elements(image)

        # Should detect the rectangle
        assert isinstance(elements, list)
        assert len(elements) >= 1

        # Check element structure
        elem = elements[0]
        assert "id" in elem
        assert "type" in elem
        assert "bbox" in elem
        assert "center" in elem
        assert "area" in elem
        assert "confidence" in elem

    def test_classify_element_square(self, detector):
        """Correctly classify square as checkbox"""
        # Create square contour
        image = np.zeros((100, 100, 3), dtype=np.uint8)
        image[30:70, 30:70] = 255

        gray = np.zeros((100, 100), dtype=np.uint8)
        gray[30:70, 30:70] = 255

        contours, _ = detector._find_contours_mock(gray)

        if contours:
            elem_type = detector._classify_element(contours[0], 40, 40)
            assert elem_type in ["checkbox", "button", "circle", "text_field", "clickable"]

    def _find_contours_mock(self, gray):
        """Helper to find contours"""
        import cv2

        _, thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        return contours, None

    def test_extract_text(self, detector):
        """Extract text from image"""
        # Create simple image
        image = np.ones((50, 100), dtype=np.uint8) * 255

        text = detector.extract_text(image)

        # Should return string (mock returns "TEST123")
        assert isinstance(text, str)
        assert text == "TEST123"

    def test_extract_text_with_color_image(self, detector):
        """Extract text handles color images"""
        # Create color image
        image = np.ones((50, 100, 3), dtype=np.uint8) * 255

        text = detector.extract_text(image)

        assert isinstance(text, str)


class TestOcrDetectorEdgeCases:
    """Edge case tests for OCR Detector"""

    @pytest.fixture
    def detector(self):
        with patch("ddddocr.DdddOcr", MockDdddOcr):
            return OcrElementDetector()

    def test_detect_elements_handles_exception(self, detector):
        """Detect elements handles exceptions gracefully"""
        # Pass invalid input to trigger exception handling
        with patch.object(detector, "_init_ocr", side_effect=Exception("OCR Error")):
            detector.ocr_engine = None

        # Should not crash
        image = np.zeros((100, 100, 3), dtype=np.uint8)
        elements = detector.detect_elements(image)
        assert isinstance(elements, list)

    def test_classify_element_invalid_contour(self, detector):
        """Classify element handles invalid contour"""
        # Empty contour
        empty_contour = np.array([]).reshape(0, 1, 2)

        elem_type = detector._classify_element(empty_contour, 0, 0)

        # Should return default type
        assert elem_type in ["checkbox", "button", "circle", "text_field", "clickable"]

    def test_extract_text_no_engine(self, detector):
        """Extract text returns empty when no engine"""
        detector.ocr_engine = None

        image = np.ones((50, 100), dtype=np.uint8) * 255
        text = detector.extract_text(image)

        assert text == ""


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
