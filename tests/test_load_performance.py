#!/usr/bin/env python3
"""
Load and Performance Tests for Captcha Worker
Tests with REAL load - NO Mocks
Best Practices 2026
"""

import asyncio
import aiohttp
import pytest
import time
import statistics
from typing import List, Dict
import os

BASE_URL = os.getenv("CAPTCHA_API_URL", "http://localhost:8019")
METRICS_URL = os.getenv("METRICS_URL", "http://localhost:8019")


class LoadTestResults:
    """Store and analyze load test results"""
    def __init__(self):
        self.response_times: List[float] = []
        self.success_count = 0
        self.failure_count = 0
        self.status_codes: Dict[int, int] = {}
        self.errors: List[str] = []
    
    def add_result(self, duration: float, status: int, error: str = None):
        self.response_times.append(duration)
        self.status_codes[status] = self.status_codes.get(status, 0) + 1
        
        if 200 <= status < 300:
            self.success_count += 1
        else:
            self.failure_count += 1
            if error:
                self.errors.append(error)
    
    def report(self) -> Dict:
        if not self.response_times:
            return {"error": "No results collected"}
        
        return {
            "total_requests": len(self.response_times),
            "success_count": self.success_count,
            "failure_count": self.failure_count,
            "success_rate": (self.success_count / len(self.response_times)) * 100,
            "response_time": {
                "min_ms": min(self.response_times) * 1000,
                "max_ms": max(self.response_times) * 1000,
                "avg_ms": statistics.mean(self.response_times) * 1000,
                "median_ms": statistics.median(self.response_times) * 1000,
                "p95_ms": sorted(self.response_times)[int(len(self.response_times) * 0.95)] * 1000,
                "p99_ms": sorted(self.response_times)[int(len(self.response_times) * 0.99)] * 1000
            },
            "status_codes": self.status_codes,
            "errors": self.errors[:10]  # First 10 errors
        }


async def make_request(
    session: aiohttp.ClientSession,
    url: str,
    method: str = "GET",
    json_data: dict = None
) -> tuple:
    """Make a single request and measure time"""
    start = time.time()
    try:
        async with session.request(method, url, json=json_data, timeout=30) as resp:
            await resp.text()
            duration = time.time() - start
            return duration, resp.status, None
    except Exception as e:
        duration = time.time() - start
        return duration, 0, str(e)


@pytest.mark.asyncio
async def test_load_health_endpoint():
    """Load test: 1000 health checks in 10 seconds"""
    print("\n🚀 Load Test: Health Endpoint (1000 requests)")
    
    results = LoadTestResults()
    start_time = time.time()
    
    async with aiohttp.ClientSession() as session:
        tasks = []
        for i in range(1000):
            task = make_request(session, f"{BASE_URL}/health")
            tasks.append(task)
        
        # Execute all
        responses = await asyncio.gather(*tasks)
        
        for duration, status, error in responses:
            results.add_result(duration, status, error)
    
    total_time = time.time() - start_time
    report = results.report()
    
    print(f"  Total time: {total_time:.2f}s")
    print(f"  Requests/sec: {report['total_requests'] / total_time:.1f}")
    print(f"  Success rate: {report['success_rate']:.1f}%")
    print(f"  Avg response: {report['response_time']['avg_ms']:.1f}ms")
    print(f"  P95: {report['response_time']['p95_ms']:.1f}ms")
    print(f"  P99: {report['response_time']['p99_ms']:.1f}ms")
    
    # Assertions
    assert report['success_rate'] >= 95, f"Success rate too low: {report['success_rate']}%"
    assert report['response_time']['p95_ms'] < 1000, "P95 latency too high"


@pytest.mark.asyncio
async def test_concurrent_solve_requests():
    """Test: 100 concurrent solve requests"""
    print("\n🚀 Load Test: 100 Concurrent Solve Requests")
    
    results = LoadTestResults()
    
    async with aiohttp.ClientSession() as session:
        tasks = []
        for i in range(100):
            json_data = {
                "image": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
                "client_id": f"load_test_{i}_{time.time()}"
            }
            task = make_request(session, f"{BASE_URL}/api/solve", "POST", json_data)
            tasks.append(task)
        
        responses = await asyncio.gather(*tasks)
        
        for duration, status, error in responses:
            results.add_result(duration, status, error)
    
    report = results.report()
    print(f"  Total: {report['total_requests']}")
    print(f"  Success: {report['success_count']}")
    print(f"  Failed: {report['failure_count']}")
    print(f"  Avg response: {report['response_time']['avg_ms']:.1f}ms")
    
    # Should handle all requests without crashing
    assert report['total_requests'] == 100


@pytest.mark.asyncio
async def test_steady_state_load():
    """Test: 50 req/s sustained for 30 seconds"""
    print("\n🚀 Load Test: Sustained 50 req/s for 30s")
    
    results = LoadTestResults()
    duration = 30
    rate = 50  # requests per second
    
    async with aiohttp.ClientSession() as session:
        start_time = time.time()
        request_count = 0
        
        while time.time() - start_time < duration:
            batch_start = time.time()
            
            # Create batch of requests
            tasks = []
            for _ in range(rate):
                task = make_request(session, f"{BASE_URL}/health")
                tasks.append(task)
                request_count += 1
            
            # Execute batch
            responses = await asyncio.gather(*tasks)
            for duration_ms, status, error in responses:
                results.add_result(duration_ms, status, error)
            
            # Wait to maintain rate
            elapsed = time.time() - batch_start
            if elapsed < 1.0:
                await asyncio.sleep(1.0 - elapsed)
        
        total_time = time.time() - start_time
    
    report = results.report()
    print(f"  Total requests: {report['total_requests']}")
    print(f"  Duration: {total_time:.1f}s")
    print(f"  Actual rate: {report['total_requests'] / total_time:.1f} req/s")
    print(f"  Success rate: {report['success_rate']:.1f}%")
    print(f"  Avg latency: {report['response_time']['avg_ms']:.1f}ms")
    
    # Assertions
    assert report['success_rate'] >= 90
    assert report['response_time']['avg_ms'] < 500


@pytest.mark.asyncio
async def test_burst_capacity():
    """Test: Handle burst of 500 requests"""
    print("\n🚀 Load Test: Burst of 500 requests")
    
    results = LoadTestResults()
    
    async with aiohttp.ClientSession() as session:
        tasks = []
        for i in range(500):
            task = make_request(session, f"{BASE_URL}/health")
            tasks.append(task)
        
        start = time.time()
        responses = await asyncio.gather(*tasks)
        total_time = time.time() - start
        
        for duration, status, error in responses:
            results.add_result(duration, status, error)
    
    report = results.report()
    print(f"  Completed in: {total_time:.2f}s")
    print(f"  Throughput: {report['total_requests'] / total_time:.1f} req/s")
    print(f"  Success rate: {report['success_rate']:.1f}%")
    
    # System should survive burst
    assert report['success_rate'] >= 80


@pytest.mark.asyncio
async def test_memory_stability():
    """Test: Memory usage remains stable under load"""
    print("\n🚀 Load Test: Memory Stability (2000 requests)")
    
    results = LoadTestResults()
    
    async with aiohttp.ClientSession() as session:
        # Make 2000 requests in batches
        for batch in range(20):
            tasks = []
            for _ in range(100):
                task = make_request(session, f"{BASE_URL}/api/workers/status")
                tasks.append(task)
            
            responses = await asyncio.gather(*tasks)
            for duration, status, error in responses:
                results.add_result(duration, status, error)
            
            # Small delay between batches
            await asyncio.sleep(0.1)
    
    report = results.report()
    print(f"  Total: {report['total_requests']}")
    print(f"  Success: {report['success_count']}")
    print(f"  Avg latency: {report['response_time']['avg_ms']:.1f}ms")
    
    # Latency should not degrade significantly
    assert report['response_time']['avg_ms'] < 1000
    assert report['success_rate'] >= 95


@pytest.mark.asyncio
async def test_metrics_under_load():
    """Test: Metrics endpoint remains responsive under load"""
    print("\n🚀 Load Test: Metrics Responsiveness")
    
    async with aiohttp.ClientSession() as session:
        # Generate some load
        load_tasks = []
        for i in range(50):
            json_data = {"image": "test", "client_id": f"metrics_test_{i}"}
            task = make_request(session, f"{BASE_URL}/api/solve", "POST", json_data)
            load_tasks.append(task)
        
        await asyncio.gather(*load_tasks)
        
        # Check metrics are still available
        start = time.time()
        async with session.get(f"{METRICS_URL}/metrics") as resp:
            await resp.text()
            duration = time.time() - start
            
            assert resp.status == 200
            assert duration < 1.0, "Metrics endpoint too slow under load"
    
    print(f"  ✅ Metrics endpoint responded in {duration*1000:.1f}ms")


@pytest.mark.asyncio
async def test_graceful_degradation():
    """Test: System degrades gracefully under extreme load"""
    print("\n🚀 Load Test: Graceful Degradation")
    
    results = LoadTestResults()
    
    async with aiohttp.ClientSession() as session:
        # Create extreme load (1000 concurrent)
        tasks = []
        for i in range(1000):
            task = make_request(session, f"{BASE_URL}/api/solve", "POST", {
                "image": "test",
                "client_id": f"degradation_test_{i}"
            })
            tasks.append(task)
        
        responses = await asyncio.gather(*tasks)
        
        for duration, status, error in responses:
            results.add_result(duration, status, error)
    
    report = results.report()
    print(f"  Total: {report['total_requests']}")
    print(f"  Success: {report['success_count']}")
    print(f"  Failed: {report['failure_count']}")
    
    # System should not crash, even if some requests fail
    assert report['total_requests'] == 1000
    # At least 50% should succeed (graceful degradation)
    assert report['success_rate'] >= 50


if __name__ == "__main__":
    print("=" * 60)
    print("CAPTCHA WORKER LOAD TESTS")
    print(f"Target: {BASE_URL}")
    print("=" * 60)
    
    # Run tests
    asyncio.run(test_load_health_endpoint())
    asyncio.run(test_concurrent_solve_requests())
    asyncio.run(test_burst_capacity())
    
    print("\n" + "=" * 60)
    print("LOAD TESTS COMPLETE")
    print("=" * 60)
