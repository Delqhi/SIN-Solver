"""
OCR Element Detector
Real OCR-based element detection using ddddocr and OpenCV
Extracted from captcha_detector_v2.py and modularized
"""

import io
import logging
from typing import List, Dict, Any
import numpy as np
from PIL import Image
import cv2

logger = logging.getLogger(__name__)


class OcrElementDetector:
    """
    Real OCR-based element detector using ddddocr and OpenCV
    NO PLACEHOLDERS - REAL IMPLEMENTATION
    """

    def __init__(self):
        self.ocr_engine = None
        self._init_ocr()

    def _init_ocr(self):
        """Initialize OCR engine"""
        try:
            import ddddocr

            self.ocr_engine = ddddocr.DdddOcr(show_ad=False)
            logger.info("✅ OCR engine initialized successfully")
        except ImportError:
            logger.error("❌ ddddocr not installed. Run: pip install ddddocr")
            raise
        except Exception as e:
            logger.error(f"❌ Failed to initialize OCR: {e}")
            raise

    def detect_elements(self, image: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detect clickable elements in image using OpenCV contours
        REAL IMPLEMENTATION - NO MOCKS
        """
        elements = []

        try:
            # Convert to grayscale
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image

            # Apply threshold
            _, thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY_INV)

            # Find contours
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            # Filter and process contours
            for i, contour in enumerate(contours):
                area = cv2.contourArea(contour)

                # Filter small contours
                if area < 100:
                    continue

                # Get bounding box
                x, y, w, h = cv2.boundingRect(contour)

                # Calculate center
                center_x = x + w // 2
                center_y = y + h // 2

                # Determine element type based on shape
                element_type = self._classify_element(contour, w, h)

                element = {
                    "id": i,
                    "type": element_type,
                    "bbox": {"x": int(x), "y": int(y), "width": int(w), "height": int(h)},
                    "center": {"x": int(center_x), "y": int(center_y)},
                    "area": float(area),
                    "confidence": float(min(area / 1000, 0.99)),
                }

                elements.append(element)

            # Sort by area (largest first)
            elements.sort(key=lambda e: e["area"], reverse=True)

            logger.debug(f"🔍 Detected {len(elements)} elements")

        except Exception as e:
            logger.error(f"❌ Element detection error: {e}")

        return elements

    def _classify_element(self, contour, width: int, height: int) -> str:
        """Classify element type based on contour shape"""
        # Calculate aspect ratio
        aspect_ratio = width / float(height) if height > 0 else 0

        # Approximate polygon
        epsilon = 0.04 * cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, epsilon, True)

        # Classify based on shape
        if len(approx) == 4:
            if 0.95 <= aspect_ratio <= 1.05:
                return "checkbox"
            else:
                return "button"
        elif len(approx) > 6:
            return "circle"
        elif aspect_ratio > 3:
            return "text_field"
        else:
            return "clickable"

    def extract_text(self, image: np.ndarray) -> str:
        """
        Extract text from image using ddddocr
        REAL IMPLEMENTATION - NO PLACEHOLDERS
        """
        try:
            # Convert numpy array to PIL Image
            if len(image.shape) == 2:
                # Grayscale
                pil_image = Image.fromarray(image)
            else:
                # Color
                pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

            # Convert to bytes
            img_buffer = io.BytesIO()
            pil_image.save(img_buffer, format="PNG")
            img_bytes = img_buffer.getvalue()

            # Perform OCR
            if self.ocr_engine:
                text = self.ocr_engine.classification(img_bytes)
                return text.strip() if text else ""
            else:
                logger.warning("⚠️ OCR engine not available")
                return ""

        except Exception as e:
            logger.error(f"❌ OCR text extraction error: {e}")
            return ""

    def health_check(self) -> bool:
        """Check if OCR engine is healthy"""
        return self.ocr_engine is not None
