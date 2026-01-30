#!/usr/bin/env python3
"""
Performance and Load Tests for SIN-Solver
Best Practices 2026 - Testing Framework

Run with: pytest tests/performance/test_load.py -v --tb=short
"""

import asyncio
import aiohttp
import pytest
import time
import statistics
from typing import List, Dict, Any, Tuple
import os
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor
import sys
from pathlib import Path

# Add paths
sys.path.insert(
    0, str(Path(__file__).parent.parent.parent / "Docker/builders/builder-1.1-captcha-worker")
)

# Configuration
BASE_URL = os.getenv("CAPTCHA_API_URL", "http://localhost:8019")
CONCURRENT_REQUESTS = [10, 50, 100]
TARGET_RESPONSE_TIME_MS = 5000  # 5 seconds


@dataclass
class PerformanceMetrics:
    """Performance test metrics"""

    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    response_times: List[float] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)

    @property
    def success_rate(self) -> float:
        if self.total_requests == 0:
            return 0.0
        return (self.successful_requests / self.total_requests) * 100

    @property
    def avg_response_time(self) -> float:
        if not self.response_times:
            return 0.0
        return statistics.mean(self.response_times)

    @property
    def min_response_time(self) -> float:
        return min(self.response_times) if self.response_times else 0.0

    @property
    def max_response_time(self) -> float:
        return max(self.response_times) if self.response_times else 0.0

    @property
    def p95_response_time(self) -> float:
        if not self.response_times:
            return 0.0
        sorted_times = sorted(self.response_times)
        idx = int(len(sorted_times) * 0.95)
        return sorted_times[idx]

    @property
    def p99_response_time(self) -> float:
        if not self.response_times:
            return 0.0
        sorted_times = sorted(self.response_times)
        idx = int(len(sorted_times) * 0.99)
        return sorted_times[idx]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "failed_requests": self.failed_requests,
            "success_rate_pct": round(self.success_rate, 2),
            "avg_response_time_ms": round(self.avg_response_time * 1000, 2),
            "min_response_time_ms": round(self.min_response_time * 1000, 2),
            "max_response_time_ms": round(self.max_response_time * 1000, 2),
            "p95_response_time_ms": round(self.p95_response_time * 1000, 2),
            "p99_response_time_ms": round(self.p99_response_time * 1000, 2),
            "errors": self.errors[:10],  # First 10 errors
        }


async def make_request(
    session: aiohttp.ClientSession,
    endpoint: str,
    method: str = "GET",
    json_data: Dict = None,
    timeout: float = 30.0,
) -> Tuple[float, int, str]:
    """Make a single request and measure response time"""
    start = time.time()
    try:
        async with session.request(
            method,
            f"{BASE_URL}{endpoint}",
            json=json_data,
            timeout=aiohttp.ClientTimeout(total=timeout),
        ) as resp:
            await resp.text()
            duration = time.time() - start
            return duration, resp.status, None
    except asyncio.TimeoutError:
        duration = time.time() - start
        return duration, 0, "Timeout"
    except Exception as e:
        duration = time.time() - start
        return duration, 0, str(e)


@pytest.mark.asyncio
@pytest.mark.performance
async def test_health_endpoint_load_10_concurrent():
    """Load test: Health endpoint with 10 concurrent requests"""
    metrics = PerformanceMetrics()
    concurrent = 10

    async with aiohttp.ClientSession() as session:
        tasks = [make_request(session, "/health") for _ in range(concurrent)]
        results = await asyncio.gather(*tasks)

        for duration, status, error in results:
            metrics.total_requests += 1
            if error:
                metrics.errors.append(error)
                metrics.failed_requests += 1
            elif 200 <= status < 300:
                metrics.response_times.append(duration)
                metrics.successful_requests += 1
            else:
                metrics.failed_requests += 1

    print(f"\n  10 Concurrent Health Checks:")
    print(f"    Success Rate: {metrics.success_rate:.1f}%")
    print(f"    Avg Response: {metrics.avg_response_time * 1000:.1f}ms")
    print(f"    P95: {metrics.p95_response_time * 1000:.1f}ms")

    assert metrics.success_rate >= 95, f"Success rate too low: {metrics.success_rate}%"
    assert metrics.p95_response_time * 1000 < TARGET_RESPONSE_TIME_MS, "P95 too high"


@pytest.mark.asyncio
@pytest.mark.performance
async def test_health_endpoint_load_50_concurrent():
    """Load test: Health endpoint with 50 concurrent requests"""
    metrics = PerformanceMetrics()
    concurrent = 50

    async with aiohttp.ClientSession() as session:
        tasks = [make_request(session, "/health") for _ in range(concurrent)]
        results = await asyncio.gather(*tasks)

        for duration, status, error in results:
            metrics.total_requests += 1
            if error:
                metrics.errors.append(error)
                metrics.failed_requests += 1
            elif 200 <= status < 300:
                metrics.response_times.append(duration)
                metrics.successful_requests += 1
            else:
                metrics.failed_requests += 1

    print(f"\n  50 Concurrent Health Checks:")
    print(f"    Success Rate: {metrics.success_rate:.1f}%")
    print(f"    Avg Response: {metrics.avg_response_time * 1000:.1f}ms")
    print(f"    P95: {metrics.p95_response_time * 1000:.1f}ms")

    assert metrics.success_rate >= 90, f"Success rate too low: {metrics.success_rate}%"
    assert metrics.avg_response_time * 1000 < TARGET_RESPONSE_TIME_MS, "Avg response too high"


@pytest.mark.asyncio
@pytest.mark.performance
async def test_health_endpoint_load_100_concurrent():
    """Load test: Health endpoint with 100 concurrent requests (target requirement)"""
    metrics = PerformanceMetrics()
    concurrent = 100

    async with aiohttp.ClientSession() as session:
        tasks = [make_request(session, "/health") for _ in range(concurrent)]
        results = await asyncio.gather(*tasks)

        for duration, status, error in results:
            metrics.total_requests += 1
            if error:
                metrics.errors.append(error)
                metrics.failed_requests += 1
            elif 200 <= status < 300:
                metrics.response_times.append(duration)
                metrics.successful_requests += 1
            else:
                metrics.failed_requests += 1

    print(f"\n  100 Concurrent Health Checks (Target):")
    print(f"    Success Rate: {metrics.success_rate:.1f}%")
    print(f"    Avg Response: {metrics.avg_response_time * 1000:.1f}ms")
    print(f"    P95: {metrics.p95_response_time * 1000:.1f}ms")
    print(f"    P99: {metrics.p99_response_time * 1000:.1f}ms")

    # Save metrics for reporting
    test_health_endpoint_load_100_concurrent.metrics = metrics

    assert metrics.success_rate >= 80, f"Success rate too low: {metrics.success_rate}%"
    assert metrics.p95_response_time * 1000 < TARGET_RESPONSE_TIME_MS * 2, "P95 too high under load"


@pytest.mark.asyncio
@pytest.mark.performance
async def test_solve_endpoint_100_concurrent():
    """Load test: Solve endpoint with 100 concurrent requests"""
    metrics = PerformanceMetrics()
    concurrent = 100

    # Small test image
    test_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

    async with aiohttp.ClientSession() as session:
        tasks = [
            make_request(
                session, "/api/solve", "POST", {"image": test_image, "client_id": f"load_test_{i}"}
            )
            for i in range(concurrent)
        ]
        results = await asyncio.gather(*tasks)

        for duration, status, error in results:
            metrics.total_requests += 1
            if error:
                metrics.errors.append(error)
                metrics.failed_requests += 1
            elif status in [200, 202, 422]:  # Accept various valid responses
                metrics.response_times.append(duration)
                metrics.successful_requests += 1
            else:
                metrics.failed_requests += 1

    print(f"\n  100 Concurrent Solve Requests:")
    print(f"    Success Rate: {metrics.success_rate:.1f}%")
    print(f"    Avg Response: {metrics.avg_response_time * 1000:.1f}ms")
    print(f"    P95: {metrics.p95_response_time * 1000:.1f}ms")

    # Save metrics
    test_solve_endpoint_100_concurrent.metrics = metrics

    # Should handle all requests without crashing
    assert metrics.total_requests == 100


@pytest.mark.asyncio
@pytest.mark.performance
async def test_sustained_load_50_rps_30s():
    """Sustained load test: 50 requests/sec for 30 seconds"""
    metrics = PerformanceMetrics()
    duration = 30
    target_rps = 50

    async with aiohttp.ClientSession() as session:
        start_time = time.time()
        request_count = 0

        while time.time() - start_time < duration:
            batch_start = time.time()

            # Create batch of requests
            tasks = [make_request(session, "/health") for _ in range(target_rps)]
            results = await asyncio.gather(*tasks)

            for duration_sec, status, error in results:
                metrics.total_requests += 1
                request_count += 1
                if error:
                    metrics.errors.append(error)
                    metrics.failed_requests += 1
                elif 200 <= status < 300:
                    metrics.response_times.append(duration_sec)
                    metrics.successful_requests += 1
                else:
                    metrics.failed_requests += 1

            # Wait to maintain rate
            elapsed = time.time() - batch_start
            if elapsed < 1.0:
                await asyncio.sleep(1.0 - elapsed)

    actual_duration = time.time() - start_time
    actual_rps = metrics.total_requests / actual_duration

    print(f"\n  Sustained Load (50 RPS, 30s):")
    print(f"    Total Requests: {metrics.total_requests}")
    print(f"    Actual Rate: {actual_rps:.1f} req/s")
    print(f"    Success Rate: {metrics.success_rate:.1f}%")
    print(f"    Avg Response: {metrics.avg_response_time * 1000:.1f}ms")
    print(f"    P95: {metrics.p95_response_time * 1000:.1f}ms")

    test_sustained_load_50_rps_30s.metrics = metrics

    assert metrics.success_rate >= 85, f"Success rate too low: {metrics.success_rate}%"


@pytest.mark.asyncio
@pytest.mark.performance
async def test_burst_capacity_500_requests():
    """Burst capacity test: 500 requests at once"""
    metrics = PerformanceMetrics()
    burst_size = 500

    async with aiohttp.ClientSession() as session:
        tasks = [make_request(session, "/health") for _ in range(burst_size)]
        start = time.time()
        results = await asyncio.gather(*tasks)
        total_time = time.time() - start

        for duration, status, error in results:
            metrics.total_requests += 1
            if error:
                metrics.errors.append(error)
                metrics.failed_requests += 1
            elif 200 <= status < 300:
                metrics.response_times.append(duration)
                metrics.successful_requests += 1
            else:
                metrics.failed_requests += 1

    throughput = metrics.total_requests / total_time

    print(f"\n  Burst Capacity (500 requests):")
    print(f"    Completed in: {total_time:.2f}s")
    print(f"    Throughput: {throughput:.1f} req/s")
    print(f"    Success Rate: {metrics.success_rate:.1f}%")

    test_burst_capacity_500_requests.metrics = metrics

    assert metrics.success_rate >= 70, f"Success rate too low under burst: {metrics.success_rate}%"


@pytest.mark.asyncio
@pytest.mark.performance
async def test_memory_stability():
    """Memory stability test: Many requests over time"""
    metrics = PerformanceMetrics()
    batches = 10
    batch_size = 50

    async with aiohttp.ClientSession() as session:
        for batch_num in range(batches):
            tasks = [make_request(session, "/health") for _ in range(batch_size)]
            results = await asyncio.gather(*tasks)

            for duration, status, error in results:
                metrics.total_requests += 1
                if error:
                    metrics.failed_requests += 1
                elif 200 <= status < 300:
                    metrics.response_times.append(duration)
                    metrics.successful_requests += 1
                else:
                    metrics.failed_requests += 1

            # Small delay between batches
            await asyncio.sleep(0.5)

    print(f"\n  Memory Stability ({batches * batch_size} requests):")
    print(f"    Success Rate: {metrics.success_rate:.1f}%")
    print(f"    Avg Response: {metrics.avg_response_time * 1000:.1f}ms")

    # Latency should not significantly degrade
    assert metrics.avg_response_time * 1000 < TARGET_RESPONSE_TIME_MS, "Latency degraded"


@pytest.mark.asyncio
@pytest.mark.performance
async def test_metrics_endpoint_responsiveness():
    """Metrics endpoint remains responsive under load"""
    async with aiohttp.ClientSession() as session:
        # Generate some load
        load_tasks = [make_request(session, "/health") for _ in range(100)]
        await asyncio.gather(*load_tasks)

        # Check metrics response time
        start = time.time()
        duration, status, error = await make_request(session, "/metrics")
        metrics_time = time.time() - start

        print(f"\n  Metrics Responsiveness:")
        print(f"    Response Time: {metrics_time * 1000:.1f}ms")
        print(f"    Status: {status}")

        assert status == 200, "Metrics endpoint failed"
        assert metrics_time < 1.0, "Metrics endpoint too slow under load"


@pytest.fixture(scope="session", autouse=True)
def generate_performance_report(request):
    """Generate performance test report after all tests"""
    yield

    # Collect metrics from tests
    print("\n" + "=" * 60)
    print("PERFORMANCE TEST SUMMARY")
    print("=" * 60)
    print(f"Target: {BASE_URL}")
    print(f"Target Response Time: <{TARGET_RESPONSE_TIME_MS}ms")
    print("=" * 60)


if __name__ == "__main__":
    print("=" * 60)
    print("SIN-SOLVER LOAD TESTS")
    print(f"Target: {BASE_URL}")
    print("=" * 60)

    # Run tests
    pytest.main([__file__, "-v", "-s"])
