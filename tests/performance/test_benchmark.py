#!/usr/bin/env python3
"""
Benchmark Tests for SIN-Solver Components
Best Practices 2026 - Testing Framework

Measures OCR engine speed, solver performance, and response times.
"""

import asyncio
import pytest
import time
import base64
import numpy as np
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from typing import List, Dict, Any, Callable
import sys
from pathlib import Path
from unittest.mock import AsyncMock, Mock, patch
from statistics import mean, median, stdev

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "Docker/builders/builder-1.1-captcha-worker"))


class BenchmarkResult:
    """Store benchmark results"""
    def __init__(self, name: str):
        self.name = name
        self.times: List[float] = []
        
    def add(self, duration: float):
        self.times.append(duration)
    
    @property
    def avg_ms(self) -> float:
        return mean(self.times) * 1000 if self.times else 0
    
    @property
    def min_ms(self) -> float:
        return min(self.times) * 1000 if self.times else 0
    
    @property
    def max_ms(self) -> float:
        return max(self.times) * 1000 if self.times else 0
    
    @property
    def median_ms(self) -> float:
        return median(self.times) * 1000 if self.times else 0
    
    @property
    def std_ms(self) -> float:
        return stdev(self.times) * 1000 if len(self.times) > 1 else 0
    
    def __str__(self):
        return (f"{self.name}: avg={self.avg_ms:.1f}ms, "
                f"median={self.median_ms:.1f}ms, "
                f"min={self.min_ms:.1f}ms, max={self.max_ms:.1f}ms, "
                f"std={self.std_ms:.1f}ms")


def create_test_captcha(text: str = "ABCD12", size: Tuple[int, int] = (200, 80)) -> np.ndarray:
    """Create a test CAPTCHA image"""
    img = Image.new('RGB', size, color='white')
    draw = ImageDraw.Draw(img)
    
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 36)
    except:
        font = ImageFont.load_default()
    
    draw.text((50, 20), text, fill='black', font=font)
    return np.array(img)


def benchmark(func: Callable, iterations: int = 10) -> BenchmarkResult:
    """Benchmark a function"""
    result = BenchmarkResult(func.__name__)
    
    for _ in range(iterations):
        start = time.time()
        func()
        result.add(time.time() - start)
    
    return result


@pytest.mark.benchmark
class TestOCRBenchmarks:
    """Benchmark OCR engine performance"""
    
    def test_ocr_text_extraction_speed(self):
        """Benchmark OCR text extraction speed"""
        with patch('ddddocr.DdddOcr') as mock_ocr:
            mock_instance = Mock()
            mock_instance.classification = Mock(return_value="TEST123")
            mock_ocr.return_value = mock_instance
            
            from src.utils.ocr_detector import OcrElementDetector
            detector = OcrElementDetector()
            
            test_image = create_test_captcha("BENCH1")
            
            result = benchmark(lambda: detector.extract_text(test_image), iterations=10)
            
            print(f"\n  OCR Text Extraction: {result}")
            assert result.avg_ms < 1000, f"OCR too slow: {result.avg_ms}ms"
    
    def test_ocr_element_detection_speed(self):
        """Benchmark OCR element detection speed"""
        with patch('ddddocr.DdddOcr') as mock_ocr:
            mock_instance = Mock()
            mock_instance.classification = Mock(return_value="TEST")
            mock_ocr.return_value = mock_instance
            
            from src.utils.ocr_detector import OcrElementDetector
            detector = OcrElementDetector()
            
            test_image = create_test_captcha("TEST99")
            
            result = benchmark(lambda: detector.detect_elements(test_image), iterations=10)
            
            print(f"\n  OCR Element Detection: {result}")
            assert result.avg_ms < 500, f"Element detection too slow: {result.avg_ms}ms"


@pytest.mark.benchmark
class TestSolverBenchmarks:
    """Benchmark solver performance"""
    
    @pytest.mark.asyncio
    async def test_veto_engine_consensus_speed(self):
        """Benchmark veto engine consensus solving"""
        with patch('src.solvers.veto_engine.MistralSolver') as mock_mistral, \
             patch('src.solvers.veto_engine.QwenSolver') as mock_qwen, \
             patch('src.solvers.veto_engine.KimiSolver') as mock_kimi, \
             patch('src.solvers.veto_engine.SteelController'):
            
            # Fast mock responses
            mock_mistral.return_value.solve = AsyncMock(return_value="FAST123")
            mock_qwen.return_value.solve = AsyncMock(return_value="FAST123")
            mock_kimi.return_value.solve_with_context = AsyncMock(return_value="FAST123")
            
            from src.solvers.veto_engine import VetoEngine
            engine = VetoEngine()
            
            result = BenchmarkResult("veto_consensus")
            
            for _ in range(5):
                start = time.time()
                await engine.solve_text_captcha("fake_image")
                result.add(time.time() - start)
            
            print(f"\n  Veto Engine Consensus: {result}")
            # Note: Actual time depends on mocks, real test would be slower
    
    @pytest.mark.asyncio
    async def test_veto_engine_joker_fallback_speed(self):
        """Benchmark veto engine with joker fallback"""
        with patch('src.solvers.veto_engine.MistralSolver') as mock_mistral, \
             patch('src.solvers.veto_engine.QwenSolver') as mock_qwen, \
             patch('src.solvers.veto_engine.KimiSolver') as mock_kimi, \
             patch('src.solvers.veto_engine.SteelController'):
            
            # Disagreement triggers joker
            mock_mistral.return_value.solve = AsyncMock(return_value="ANSWER_A")
            mock_qwen.return_value.solve = AsyncMock(return_value="ANSWER_B")
            mock_kimi.return_value.solve_with_context = AsyncMock(return_value="ANSWER_C")
            
            from src.solvers.veto_engine import VetoEngine
            engine = VetoEngine()
            
            result = BenchmarkResult("veto_with_joker")
            
            for _ in range(5):
                start = time.time()
                await engine.solve_text_captcha("fake_image")
                result.add(time.time() - start)
            
            print(f"\n  Veto Engine with Joker: {result}")


@pytest.mark.benchmark
class TestCircuitBreakerBenchmarks:
    """Benchmark circuit breaker performance"""
    
    def test_circuit_breaker_check_speed(self):
        """Benchmark circuit breaker can_execute checks"""
        from src.utils.circuit_breaker import CircuitBreaker
        
        cb = CircuitBreaker("benchmark", failure_threshold=100)
        
        result = benchmark(lambda: cb.can_execute(), iterations=1000)
        
        print(f"\n  Circuit Breaker Check: {result}")
        # Should be very fast (microseconds)
        assert result.avg_ms < 1, f"Circuit breaker too slow: {result.avg_ms}ms"
    
    def test_circuit_breaker_record_speed(self):
        """Benchmark circuit breaker record operations"""
        from src.utils.circuit_breaker import CircuitBreaker
        
        cb = CircuitBreaker("benchmark", failure_threshold=10000)
        
        result = BenchmarkResult("circuit_record")
        
        for _ in range(1000):
            start = time.time()
            cb.record_success()
            result.add(time.time() - start)
        
        print(f"\n  Circuit Breaker Record: avg={result.avg_ms:.3f}ms")
        assert result.avg_ms < 1, f"Record operation too slow: {result.avg_ms}ms"


@pytest.mark.benchmark
class TestRateLimiterBenchmarks:
    """Benchmark rate limiter performance"""
    
    @pytest.mark.asyncio
    async def test_rate_limiter_check_speed(self):
        """Benchmark rate limiter check speed"""
        from src.utils.rate_limiter import RateLimiter
        
        mock_redis = Mock()
        mock_redis.increment = AsyncMock(return_value=1)
        mock_redis.get = AsyncMock(return_value="1")
        
        limiter = RateLimiter(mock_redis)
        
        result = BenchmarkResult("rate_limit_check")
        
        for _ in range(100):
            start = time.time()
            await limiter.is_rate_limited("client_1", max_requests=100)
            result.add(time.time() - start)
        
        print(f"\n  Rate Limiter Check: avg={result.avg_ms:.3f}ms")


@pytest.mark.benchmark
class TestImageProcessingBenchmarks:
    """Benchmark image processing operations"""
    
    def test_image_decode_speed(self):
        """Benchmark base64 image decode + OpenCV load"""
        import cv2
        
        # Create test image
        img = create_test_captcha("SPEED1")
        _, buffer = cv2.imencode('.png', img)
        b64_string = base64.b64encode(buffer).decode()
        
        def decode_image():
            img_data = base64.b64decode(b64_string)
            nparr = np.frombuffer(img_data, np.uint8)
            return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        result = benchmark(decode_image, iterations=100)
        
        print(f"\n  Image Decode: {result}")
        assert result.avg_ms < 10, f"Image decode too slow: {result.avg_ms}ms"
    
    def test_grayscale_conversion_speed(self):
        """Benchmark grayscale conversion"""
        import cv2
        
        img = create_test_captcha("GRAY12")
        
        result = benchmark(lambda: cv2.cvtColor(img, cv2.COLOR_RGB2GRAY), iterations=1000)
        
        print(f"\n  Grayscale Conversion: {result}")
        assert result.avg_ms < 1, f"Grayscale too slow: {result.avg_ms}ms"


@pytest.fixture(scope="session", autouse=True)
def print_benchmark_summary(request):
    """Print benchmark summary"""
    yield
    print("\n" + "="*60)
    print("BENCHMARK SUMMARY")
    print("="*60)
    print("All benchmarks completed.")
    print("="*60)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
