#!/usr/bin/env python3
"""
Phase 2.5: Integration Tests for CAPTCHA Solver Pipeline

Tests the complete pipeline:
1. YOLO classification accuracy
2. OCR text extraction accuracy
3. Consensus voting
4. Pipeline end-to-end speed

Author: Delqhi-Platform Team
Version: 2.5.0
Created: 2026-01-29 Session 11
"""

import unittest
from pathlib import Path
import logging
from typing import List
import time

import numpy as np
from captcha_solver_pipeline import (
    CaptchaSolverPipeline,
    TesseractOCREngine,
    PaddleOCREngine,
    OCRResult,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TestOCREngines(unittest.TestCase):
    """Test individual OCR engines"""

    def setUp(self):
        """Initialize OCR engines"""
        self.tesseract = TesseractOCREngine()
        self.paddleocr = PaddleOCREngine()

    def test_tesseract_available(self):
        """Test if Tesseract is available"""
        self.assertTrue(self.tesseract.available, "Tesseract OCR should be installed")

    def test_paddleocr_available(self):
        """Test if PaddleOCR is available"""
        self.assertTrue(self.paddleocr.available, "PaddleOCR should be installed")

    def test_tesseract_text_extraction(self):
        """Test Tesseract on sample text images"""
        test_images = list(
            Path("/Users/jeremy/dev/Delqhi-Platform/training").glob("Text_Captcha/*.jpg")
        )

        if not test_images:
            self.skipTest("No Text_Captcha training images found")

        results = []
        for img_path in test_images[:5]:
            result = self.tesseract.extract_text(str(img_path))
            results.append(result.confidence)

            # Check that we got some text
            self.assertTrue(len(result.text) > 0 or result.confidence == 0.0)

        # Average confidence should be reasonable
        avg_conf = np.mean(results)
        logger.info(f"Tesseract average confidence: {avg_conf:.2f}")
        self.assertGreater(avg_conf, 0.0, "Tesseract should extract some text")

    def test_paddleocr_text_extraction(self):
        """Test PaddleOCR on sample text images"""
        test_images = list(
            Path("/Users/jeremy/dev/Delqhi-Platform/training").glob("Text_Captcha/*.jpg")
        )

        if not test_images:
            self.skipTest("No Text_Captcha training images found")

        results = []
        for img_path in test_images[:5]:
            result = self.paddleocr.extract_text(str(img_path))
            results.append(result.confidence)

            # Check that we got some text
            self.assertTrue(len(result.text) > 0 or result.confidence == 0.0)

        # Average confidence
        avg_conf = (
            np.mean([r for r in results if r > 0.0]) if any(r > 0.0 for r in results) else 0.0
        )
        logger.info(f"PaddleOCR average confidence: {avg_conf:.2f}")


class TestYOLOClassification(unittest.TestCase):
    """Test YOLO classification accuracy"""

    def setUp(self):
        """Initialize YOLO classifier"""
        model_path = "/Users/jeremy/runs/classify/runs/classify/captcha_classifier3/weights/best.pt"

        if not Path(model_path).exists():
            self.skipTest("YOLO model not ready (training in progress)")

        self.pipeline = CaptchaSolverPipeline(model_path)

    def test_yolo_classification(self):
        """Test YOLO classification on each class"""
        training_dir = Path("/Users/jeremy/dev/Delqhi-Platform/training")

        class_dirs = [
            d for d in training_dir.iterdir() if d.is_dir() and not d.name.startswith(".")
        ]

        results = {}
        for class_dir in class_dirs:
            class_name = class_dir.name
            images = list(class_dir.glob("*.jpg"))[:5]  # Test first 5 of each class

            if not images:
                continue

            correct = 0
            for img_path in images:
                pred_class, conf = self.pipeline.yolo.classify(str(img_path))
                if pred_class == class_name:
                    correct += 1

            accuracy = correct / len(images) if images else 0.0
            results[class_name] = accuracy

            logger.info(f"{class_name}: {accuracy:.0%} ({correct}/{len(images)})")

        # Overall accuracy
        overall = np.mean(list(results.values())) if results else 0.0
        logger.info(f"\nOverall YOLO accuracy: {overall:.0%}")

        self.assertGreater(overall, 0.5, "YOLO accuracy should be > 50%")

    def test_yolo_speed(self):
        """Test YOLO classification speed"""
        test_images = list(Path("/Users/jeremy/dev/Delqhi-Platform/training").glob("*/*.jpg"))[:10]

        if not test_images:
            self.skipTest("No training images found")

        times = []
        for img_path in test_images:
            start = time.time()
            self.pipeline.yolo.classify(str(img_path))
            elapsed = time.time() - start
            times.append(elapsed)

        avg_time = np.mean(times)
        max_time = np.max(times)

        logger.info(f"YOLO classification speed:")
        logger.info(f"  Average: {avg_time:.3f}s")
        logger.info(f"  Max: {max_time:.3f}s")

        self.assertLess(avg_time, 2.0, "YOLO should classify in < 2s")


class TestOCRConsensus(unittest.TestCase):
    """Test OCR consensus voting"""

    def setUp(self):
        """Initialize components"""
        model_path = "/Users/jeremy/runs/classify/runs/classify/captcha_classifier3/weights/best.pt"

        if not Path(model_path).exists():
            self.skipTest("YOLO model not ready (training in progress)")

        self.pipeline = CaptchaSolverPipeline(model_path)

    def test_consensus_voting(self):
        """Test that consensus voting works correctly"""
        # Create mock OCR results
        results = [
            OCRResult("ABCD", 0.85, "tesseract", 0.1),
            OCRResult("ABCD", 0.80, "paddleocr", 0.2),
            OCRResult("BCDE", 0.70, "ddddocr", 0.15),
        ]

        # Vote
        consensus = self.pipeline.vote_ocr_results(results)

        # Should pick "ABCD" (2 votes)
        self.assertEqual(consensus.text, "ABCD")
        self.assertGreater(consensus.confidence, 0.8)
        self.assertEqual(consensus.method, "consensus")

    def test_consensus_with_empty_results(self):
        """Test consensus with some empty results"""
        results = [
            OCRResult("", 0.0, "tesseract", 0.0),
            OCRResult("TEST", 0.85, "paddleocr", 0.2),
            OCRResult("TEST", 0.80, "ddddocr", 0.15),
        ]

        consensus = self.pipeline.vote_ocr_results(results)

        self.assertEqual(consensus.text, "TEST")
        self.assertGreater(consensus.confidence, 0.75)

    def test_consensus_tie(self):
        """Test consensus when results differ"""
        results = [
            OCRResult("AAAA", 0.8, "tesseract", 0.1),
            OCRResult("BBBB", 0.85, "paddleocr", 0.2),
            OCRResult("CCCC", 0.75, "ddddocr", 0.15),
        ]

        consensus = self.pipeline.vote_ocr_results(results)

        # Should pick one based on confidence weighting
        self.assertIn(consensus.text, ["AAAA", "BBBB", "CCCC"])
        self.assertGreater(consensus.confidence, 0.0)


class TestPipelineIntegration(unittest.TestCase):
    """Test complete pipeline end-to-end"""

    def setUp(self):
        """Initialize pipeline"""
        model_path = "/Users/jeremy/runs/classify/runs/classify/captcha_classifier3/weights/best.pt"

        if not Path(model_path).exists():
            self.skipTest("YOLO model not ready (training in progress)")

        self.pipeline = CaptchaSolverPipeline(model_path)

    def test_solve_text_captcha(self):
        """Test solving Text CAPTCHA end-to-end"""
        test_images = list(
            Path("/Users/jeremy/dev/Delqhi-Platform/training/Text_Captcha").glob("*.jpg")
        )

        if not test_images:
            self.skipTest("No Text_Captcha images for testing")

        for img_path in test_images[:3]:
            result = self.pipeline.solve_captcha(str(img_path))

            # Check result structure
            self.assertIn("type", result)
            self.assertIn("answer", result)
            self.assertIn("confidence", result)
            self.assertIn("success", result)

            logger.info(
                f"Solved {img_path.name}: {result['answer']} (conf: {result['confidence']:.2f})"
            )

    def test_pipeline_speed(self):
        """Test complete pipeline speed (classify + OCR)"""
        test_images = list(Path("/Users/jeremy/dev/Delqhi-Platform/training").glob("*/*.jpg"))[:5]

        if not test_images:
            self.skipTest("No training images found")

        times = []
        for img_path in test_images:
            start = time.time()
            result = self.pipeline.solve_captcha(str(img_path))
            elapsed = time.time() - start
            times.append(elapsed)

        avg_time = np.mean(times)
        max_time = np.max(times)

        logger.info(f"Pipeline speed:")
        logger.info(f"  Average: {avg_time:.2f}s")
        logger.info(f"  Max: {max_time:.2f}s")

        self.assertLess(avg_time, 5.0, "Pipeline should complete in < 5s")

    def test_invalid_image(self):
        """Test pipeline with invalid image"""
        result = self.pipeline.solve_captcha("/nonexistent/image.jpg")

        self.assertFalse(result.get("success", False))
        self.assertIn("error", result)


class TestPerformanceMetrics(unittest.TestCase):
    """Test performance metrics and benchmarks"""

    def test_tesseract_accuracy_estimate(self):
        """Estimate Tesseract accuracy on Text CAPTCHA"""
        tesseract = TesseractOCREngine()

        test_images = list(
            Path("/Users/jeremy/dev/Delqhi-Platform/training/Text_Captcha").glob("*.jpg")
        )

        if not test_images or not tesseract.available:
            self.skipTest("Tesseract not available or no test images")

        confidences = []
        for img_path in test_images[:10]:
            result = tesseract.extract_text(str(img_path))
            confidences.append(result.confidence)

        avg_conf = np.mean(confidences)
        logger.info(f"Tesseract average confidence: {avg_conf:.2f}")

        # Should extract text with reasonable confidence
        self.assertGreater(avg_conf, 0.3, "Tesseract should have > 30% avg confidence")

    def test_paddleocr_accuracy_estimate(self):
        """Estimate PaddleOCR accuracy on Text CAPTCHA"""
        paddleocr = PaddleOCREngine()

        test_images = list(
            Path("/Users/jeremy/dev/Delqhi-Platform/training/Text_Captcha").glob("*.jpg")
        )

        if not test_images or not paddleocr.available:
            self.skipTest("PaddleOCR not available or no test images")

        confidences = []
        for img_path in test_images[:10]:
            result = paddleocr.extract_text(str(img_path))
            confidences.append(result.confidence)

        avg_conf = (
            np.mean([c for c in confidences if c > 0.0])
            if any(c > 0.0 for c in confidences)
            else 0.0
        )
        logger.info(f"PaddleOCR average confidence: {avg_conf:.2f}")


def run_suite(verbose=True):
    """Run all tests"""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()

    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestOCREngines))
    suite.addTests(loader.loadTestsFromTestCase(TestYOLOClassification))
    suite.addTests(loader.loadTestsFromTestCase(TestOCRConsensus))
    suite.addTests(loader.loadTestsFromTestCase(TestPipelineIntegration))
    suite.addTests(loader.loadTestsFromTestCase(TestPerformanceMetrics))

    # Run
    runner = unittest.TextTestRunner(verbosity=2 if verbose else 1)
    result = runner.run(suite)

    return result


if __name__ == "__main__":
    result = run_suite(verbose=True)
    exit(0 if result.wasSuccessful() else 1)
