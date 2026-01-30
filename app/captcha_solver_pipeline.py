#!/usr/bin/env python3
"""
Phase 2.5: CAPTCHA Solver Pipeline
Integrates YOLO classification with OCR solving

This module provides the complete pipeline:
1. YOLO Classification (determine CAPTCHA type)
2. OCR Routing (send to appropriate solver)
3. OCR Solving (use Tesseract/PaddleOCR/ddddocr)
4. Consensus Voting (combine results from multiple engines)
5. Return solved answer

Author: Delqhi-Platform Team
Version: 2.5.0
Created: 2026-01-29 Session 11
"""

import os
import sys
from dataclasses import dataclass
from typing import Tuple, Optional, List, Dict, Any
from pathlib import Path
import logging

import numpy as np
from PIL import Image
import cv2

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@dataclass
class OCRResult:
    """Container for OCR results"""

    text: str
    confidence: float
    method: str  # 'tesseract', 'paddleocr', 'ddddocr', 'voted'
    processing_time: float = 0.0


class TesseractOCREngine:
    """Tesseract OCR Engine for text CAPTCHA"""

    def __init__(self):
        """Initialize Tesseract"""
        try:
            import pytesseract

            self.engine = pytesseract
            self.available = True
            logger.info("✅ Tesseract OCR Engine initialized")
        except ImportError:
            self.available = False
            logger.warning("⚠️  Tesseract not available")

    def extract_text(self, image_path: str) -> OCRResult:
        """Extract text from image using Tesseract"""
        import time

        start = time.time()

        if not self.available:
            return OCRResult("", 0.0, "tesseract", time.time() - start)

        try:
            img = Image.open(image_path)
            text = self.engine.image_to_string(img, config="--psm 8")
            elapsed = time.time() - start

            # Basic confidence estimate (Tesseract doesn't provide confidence)
            # Higher confidence if text is longer and cleaner
            confidence = min(0.9, len(text.strip()) / 10.0) if text.strip() else 0.0

            logger.info(
                f"Tesseract: '{text.strip()}' (conf: {confidence:.2f}, time: {elapsed:.2f}s)"
            )
            return OCRResult(text.strip(), confidence, "tesseract", elapsed)

        except Exception as e:
            logger.error(f"Tesseract error: {e}")
            return OCRResult("", 0.0, "tesseract", time.time() - start)

    def extract_text_preprocessed(self, image_path: str) -> OCRResult:
        """Extract text with image preprocessing (better for noisy images)"""
        import time

        start = time.time()

        if not self.available:
            return OCRResult("", 0.0, "tesseract", time.time() - start)

        try:
            img = cv2.imread(image_path)
            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            # Apply thresholding (binarization)
            _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
            # Denoise
            denoised = cv2.medianBlur(thresh, 3)

            # Convert back to PIL for Tesseract
            pil_img = Image.fromarray(denoised)
            text = self.engine.image_to_string(pil_img, config="--psm 8")
            elapsed = time.time() - start

            confidence = min(0.95, (len(text.strip()) / 10.0) * 1.1) if text.strip() else 0.0

            logger.info(
                f"Tesseract (preprocessed): '{text.strip()}' (conf: {confidence:.2f}, time: {elapsed:.2f}s)"
            )
            return OCRResult(text.strip(), confidence, "tesseract", elapsed)

        except Exception as e:
            logger.error(f"Tesseract preprocessing error: {e}")
            return OCRResult("", 0.0, "tesseract", time.time() - start)


class PaddleOCREngine:
    """PaddleOCR Engine (backup OCR with language detection)"""

    def __init__(self):
        """Initialize PaddleOCR"""
        try:
            from paddleocr import PaddleOCR

            self.engine = PaddleOCR(use_angle_cls=True, lang="en")
            self.available = True
            logger.info("✅ PaddleOCR Engine initialized")
        except ImportError:
            self.available = False
            logger.warning("⚠️  PaddleOCR not available")
        except Exception as e:
            logger.warning(f"PaddleOCR initialization error: {e}")
            self.available = False

    def extract_text(self, image_path: str) -> OCRResult:
        """Extract text using PaddleOCR"""
        import time

        start = time.time()

        if not self.available:
            return OCRResult("", 0.0, "paddleocr", time.time() - start)

        try:
            result = self.engine.ocr(image_path, cls=True)
            elapsed = time.time() - start

            if result:
                texts = []
                confidences = []
                for line in result:
                    for word_info in line:
                        text = word_info[1][0]
                        confidence = word_info[1][1]
                        texts.append(text)
                        confidences.append(confidence)

                final_text = "".join(texts)
                avg_confidence = np.mean(confidences) if confidences else 0.0

                logger.info(
                    f"PaddleOCR: '{final_text}' (conf: {avg_confidence:.2f}, time: {elapsed:.2f}s)"
                )
                return OCRResult(final_text, avg_confidence, "paddleocr", elapsed)

            return OCRResult("", 0.0, "paddleocr", elapsed)

        except Exception as e:
            logger.error(f"PaddleOCR error: {e}")
            return OCRResult("", 0.0, "paddleocr", time.time() - start)


class DDDDOCREngine:
    """Existing ddddocr Engine (fallback)"""

    def __init__(self):
        """Initialize ddddocr"""
        try:
            from ddddocr import DdddOcr

            self.engine = DdddOcr()
            self.available = True
            logger.info("✅ ddddocr Engine initialized")
        except ImportError:
            self.available = False
            logger.warning("⚠️  ddddocr not available")
        except Exception as e:
            logger.warning(f"ddddocr initialization error: {e}")
            self.available = False

    def extract_text(self, image_path: str) -> OCRResult:
        """Extract text using ddddocr"""
        import time

        start = time.time()

        if not self.available:
            return OCRResult("", 0.0, "ddddocr", time.time() - start)

        try:
            with open(image_path, "rb") as f:
                image_bytes = f.read()

            text = self.engine.classification(image_bytes)
            elapsed = time.time() - start

            # ddddocr doesn't provide confidence, estimate based on length
            confidence = min(0.8, len(text.strip()) / 10.0) if text.strip() else 0.0

            logger.info(f"ddddocr: '{text}' (conf: {confidence:.2f}, time: {elapsed:.2f}s)")
            return OCRResult(text.strip(), confidence, "ddddocr", elapsed)

        except Exception as e:
            logger.error(f"ddddocr error: {e}")
            return OCRResult("", 0.0, "ddddocr", time.time() - start)


class YOLOClassifier:
    """YOLO v8 Classifier for CAPTCHA Type Detection"""

    def __init__(self, model_path: str):
        """Initialize YOLO model"""
        try:
            from ultralytics import YOLO

            self.model = YOLO(model_path)
            self.available = True
            logger.info(f"✅ YOLO Model loaded: {model_path}")
            logger.info(f"   Classes: {list(self.model.names.values())}")
        except ImportError:
            self.available = False
            logger.error("❌ YOLO/Ultralytics not available")
        except Exception as e:
            logger.error(f"YOLO initialization error: {e}")
            self.available = False

    def classify(self, image_path: str) -> Tuple[str, float]:
        """Classify CAPTCHA type"""
        if not self.available:
            return "unknown", 0.0

        try:
            results = self.model.predict(image_path)
            if results:
                result = results[0]
                top_class_id = result.probs.top1
                top_class_name = self.model.names[top_class_id]
                top_confidence = result.probs.top1conf.item()

                logger.info(f"YOLO: {top_class_name} (conf: {top_confidence:.2f})")
                return top_class_name, top_confidence

        except Exception as e:
            logger.error(f"YOLO classification error: {e}")

        return "unknown", 0.0


class CaptchaSolverPipeline:
    """Main CAPTCHA Solver Pipeline

    Integrates:
    1. YOLO Classification (determine type)
    2. OCR Routing (select solver)
    3. OCR Consensus (vote among engines)
    4. Return solved answer
    """

    def __init__(self, yolo_model_path: str):
        """Initialize all components"""
        logger.info("=" * 60)
        logger.info("🚀 CAPTCHA SOLVER PIPELINE INITIALIZATION")
        logger.info("=" * 60)

        # Initialize YOLO classifier
        self.yolo = YOLOClassifier(yolo_model_path)

        # Initialize OCR engines
        self.tesseract = TesseractOCREngine()
        self.paddleocr = PaddleOCREngine()
        self.ddddocr = DDDDOCREngine()

        logger.info("=" * 60)
        logger.info("✅ PIPELINE READY")
        logger.info("=" * 60)

    def vote_ocr_results(
        self, results: List[OCRResult], weights: Dict[str, float] = None
    ) -> OCRResult:
        """Consensus voting among OCR results

        Weights:
        - tesseract: 0.4 (best for English text)
        - paddleocr: 0.4 (good for rotated/multi-language)
        - ddddocr: 0.2 (fallback)
        """
        if not results or all(r.confidence == 0.0 for r in results):
            return OCRResult("", 0.0, "none", 0.0)

        if weights is None:
            weights = {"tesseract": 0.4, "paddleocr": 0.4, "ddddocr": 0.2}

        # Filter out empty results
        valid_results = [r for r in results if r.text and r.confidence > 0.0]

        if not valid_results:
            return OCRResult("", 0.0, "consensus", 0.0)

        # Count votes (same text from multiple engines)
        text_votes = {}
        for r in valid_results:
            if r.text not in text_votes:
                text_votes[r.text] = []
            text_votes[r.text].append(r)

        # Find winning text (most votes)
        winning_text = max(text_votes.items(), key=lambda x: len(x[1]))
        winning_text_str = winning_text[0]
        winning_votes = winning_text[1]

        # Calculate weighted confidence
        weighted_conf = 0.0
        for vote in winning_votes:
            weight = weights.get(vote.method, 0.1)
            weighted_conf += vote.confidence * weight

        # Boost confidence if multiple engines agree
        agreement_bonus = min(0.1, 0.05 * (len(winning_votes) - 1))
        final_conf = min(0.95, weighted_conf + agreement_bonus)

        logger.info(
            f"Consensus: '{winning_text_str}' ({len(winning_votes)} votes, conf: {final_conf:.2f})"
        )
        return OCRResult(winning_text_str, final_conf, "consensus", 0.0)

    def solve_text_captcha(self, image_path: str) -> OCRResult:
        """Solve Text CAPTCHA using OCR consensus"""
        logger.info(f"\n📝 SOLVING TEXT CAPTCHA: {Path(image_path).name}")

        results = []

        # Try all OCR engines
        results.append(self.tesseract.extract_text(image_path))
        results.append(self.tesseract.extract_text_preprocessed(image_path))
        results.append(self.paddleocr.extract_text(image_path))
        results.append(self.ddddocr.extract_text(image_path))

        # Vote and return
        return self.vote_ocr_results(results)

    def solve_captcha(self, image_path: str) -> Dict[str, Any]:
        """Main entry point: Classify → Route → Solve"""
        logger.info("\n" + "=" * 60)
        logger.info("🔍 SOLVING CAPTCHA")
        logger.info("=" * 60)

        image_path = str(image_path)

        if not Path(image_path).exists():
            logger.error(f"Image not found: {image_path}")
            return {"error": "Image not found", "success": False}

        # Step 1: Classify CAPTCHA type
        captcha_class, class_conf = self.yolo.classify(image_path)

        if captcha_class == "unknown":
            logger.warning("Unable to classify CAPTCHA type")
            return {"error": "Classification failed", "success": False}

        # Step 2: Route to appropriate solver
        if captcha_class == "Text_Captcha":
            ocr_result = self.solve_text_captcha(image_path)
            return {
                "type": captcha_class,
                "answer": ocr_result.text,
                "confidence": float(ocr_result.confidence),
                "method": ocr_result.method,
                "class_confidence": float(class_conf),
                "success": ocr_result.confidence >= 0.5,
                "processing_time": ocr_result.processing_time,
            }

        # TODO: Add more CAPTCHA types (Image_Click, Slider, Puzzle, etc.)

        return {
            "error": f"Solver not implemented for: {captcha_class}",
            "success": False,
            "type": captcha_class,
        }


# Command-line usage
if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python captcha_solver_pipeline.py <model.pt> <image.jpg>")
        sys.exit(1)

    model_path = sys.argv[1]
    image_path = sys.argv[2]

    # Initialize pipeline
    pipeline = CaptchaSolverPipeline(model_path)

    # Solve CAPTCHA
    result = pipeline.solve_captcha(image_path)

    # Print results
    print("\n" + "=" * 60)
    print("📊 RESULTS")
    print("=" * 60)
    for key, value in result.items():
        print(f"{key}: {value}")
