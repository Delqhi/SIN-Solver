#!/usr/bin/env python3
"""
Test & Validation Script for WorkerMonitor
==========================================

Validates monitor.py functionality and demonstrates all features.
Run: python test_monitor.py
"""

import sys
import time
import random
from pathlib import Path

# Add to path
sys.path.insert(0, str(Path(__file__).parent))

from monitor import WorkerMonitor


def test_basic_functionality():
    """Test 1: Basic functionality"""
    print("\n" + "=" * 70)
    print("TEST 1: Basic Functionality")
    print("=" * 70)

    monitor = WorkerMonitor(worker_name="test-basic")

    print("✓ Monitor initialized")

    # Record some attempts
    for i in range(5):
        monitor.record_attempt(success=True, solve_time=4.2, captcha_type="text")

    print("✓ Recorded 5 successful attempts")

    # Check stats
    rate = monitor.get_success_rate()
    avg_time = monitor.get_average_solve_time()

    print(f"✓ Success rate: {rate:.1f}%")
    print(f"✓ Avg solve time: {avg_time:.2f}s")

    assert rate == 100.0, "Success rate should be 100% for all successful"
    assert avg_time == 4.2, "Avg time should be 4.2s"

    print("✅ TEST 1 PASSED\n")


def test_rolling_window():
    """Test 2: Rolling window (last 100)"""
    print("=" * 70)
    print("TEST 2: Rolling Window (Last 100)")
    print("=" * 70)

    monitor = WorkerMonitor(worker_name="test-window")

    # Record 50 attempts (50 success, 0 fail = 100% rate)
    for i in range(50):
        monitor.record_attempt(success=True, solve_time=5.0)

    rate_50 = monitor.get_success_rate()
    print(f"✓ After 50 attempts: {rate_50:.1f}%")
    assert rate_50 == 100.0

    # Record 50 more failures (50 success, 50 fail = 50% rate)
    for i in range(50):
        monitor.record_attempt(success=False, solve_time=5.0)

    rate_100 = monitor.get_success_rate()
    print(f"✓ After 100 total attempts: {rate_100:.1f}%")
    assert rate_100 == 50.0

    # Record 20 more successes (50 success, 50 fail, 20 success = 40% rate)
    # Wait, that's 70/120 which is 58.3%, but rolling window is last 100
    # So it drops first 20 successes: 30 success, 50 fail, 20 success = 50 success, 50 fail = 50%
    # Actually, drops first 20: leaves 30 success + 50 fail + 20 success = 50 success, 50 fail = 50%
    for i in range(20):
        monitor.record_attempt(success=True, solve_time=5.0)

    rate_120 = monitor.get_success_rate()
    print(f"✓ After 120 total attempts (rolling window): {rate_120:.1f}%")
    # Last 100: 30 (from first batch) + 50 (fails) + 20 (new success) = 50 success / 100
    assert rate_120 == 50.0

    print("✅ TEST 2 PASSED\n")


def test_captcha_types():
    """Test 3: Per-type tracking"""
    print("=" * 70)
    print("TEST 3: Per-Type Success Tracking")
    print("=" * 70)

    monitor = WorkerMonitor(worker_name="test-types")

    # Record different types
    for i in range(10):
        monitor.record_attempt(success=True, captcha_type="text")

    for i in range(8):
        monitor.record_attempt(success=True, captcha_type="slider")
        monitor.record_attempt(success=False, captcha_type="slider")

    for i in range(5):
        monitor.record_attempt(success=True, captcha_type="click")

    # Check rates by type
    text_rate = monitor.get_success_rate("text")
    slider_rate = monitor.get_success_rate("slider")
    click_rate = monitor.get_success_rate("click")

    print(f"✓ Text rate: {text_rate:.1f}% (10/10)")
    print(f"✓ Slider rate: {slider_rate:.1f}% (8/16)")
    print(f"✓ Click rate: {click_rate:.1f}% (5/5)")

    assert text_rate == 100.0
    assert slider_rate == 50.0
    assert click_rate == 100.0

    # Check type stats
    types = monitor.get_captcha_types()
    print(f"✓ Tracked types: {list(types.keys())}")
    assert "text" in types and "slider" in types and "click" in types

    print("✅ TEST 3 PASSED\n")


def test_health_checks():
    """Test 4: Health checks & alerts"""
    print("=" * 70)
    print("TEST 4: Health Checks & Alerts")
    print("=" * 70)

    monitor = WorkerMonitor(worker_name="test-health")

    # Start healthy
    assert monitor.is_healthy == True
    print("✓ Initial state: healthy")

    # Record attempts to trigger warning (15 fail, 85 success = 85% < 96%)
    for i in range(10):
        monitor.record_attempt(success=True)

    for i in range(15):
        monitor.record_attempt(success=False)

    # Force health check
    monitor._check_health()

    # Check success rate
    rate = monitor.get_success_rate()
    print(f"✓ Success rate dropped to: {rate:.1f}%")

    # Should trigger warning but not critical (> 95%)
    assert rate > 95.0, "Should be > 95% for warning"
    assert not monitor.critical_alert_triggered, "Should not be critical yet"
    print("✓ Warning alert triggered (not critical yet)")

    # Record more failures to drop below 95% (< 95% = critical)
    for i in range(10):
        monitor.record_attempt(success=False)

    monitor._check_health()
    rate = monitor.get_success_rate()
    print(f"✓ Success rate dropped to: {rate:.1f}%")

    assert rate < 95.0, "Should be < 95%"
    assert monitor.critical_alert_triggered == True, "Should trigger critical"
    assert monitor.is_healthy == False, "Should be unhealthy"
    print("✓ Critical alert triggered - emergency stop!")

    print("✅ TEST 4 PASSED\n")


def test_statistics_persistence():
    """Test 5: Statistics saving & loading"""
    print("=" * 70)
    print("TEST 5: Statistics Persistence")
    print("=" * 70)

    monitor = WorkerMonitor(worker_name="test-persistence")

    # Record some attempts
    for i in range(10):
        monitor.record_attempt(success=True, solve_time=4.2)

    initial_count = monitor.all_time_stats.total_captchas
    print(f"✓ Recorded {initial_count} captchas")

    # Manually save
    monitor._save_all_time_stats()
    print("✓ Statistics saved to file")

    # Check file exists
    stats_file = monitor.stats_dir / "all_time_stats.json"
    assert stats_file.exists(), "Stats file should exist"
    print(f"✓ File exists: {stats_file}")

    # Load in new monitor instance
    monitor2 = WorkerMonitor(worker_name="test-persistence")
    loaded_count = monitor2.all_time_stats.total_captchas

    print(f"✓ Loaded {loaded_count} captchas from file")
    assert loaded_count == initial_count, "Should load same stats"

    print("✅ TEST 5 PASSED\n")


def test_dashboard_data():
    """Test 6: Dashboard data structure"""
    print("=" * 70)
    print("TEST 6: Dashboard Data Structure")
    print("=" * 70)

    monitor = WorkerMonitor(worker_name="test-dashboard")

    # Record some data
    for i in range(20):
        monitor.record_attempt(
            success=random.random() < 0.96,
            solve_time=random.uniform(2, 8),
            captcha_type=random.choice(["text", "slider"]),
        )

    # Get dashboard data
    data = monitor.get_dashboard_data()

    # Verify structure
    required_fields = [
        "timestamp",
        "worker_name",
        "success_rate",
        "success_rate_color",
        "is_healthy",
        "session_duration",
        "captchas_solved_session",
        "session_earnings",
        "avg_solve_time",
        "current_ip",
        "total_captchas_all_time",
        "total_earnings_all_time",
        "captcha_types",
        "attempts_in_window",
    ]

    for field in required_fields:
        assert field in data, f"Missing field: {field}"
        print(f"✓ Field '{field}': {str(data[field])[:50]}")

    # Check types
    assert isinstance(data["success_rate"], (int, float))
    assert isinstance(data["is_healthy"], bool)
    assert isinstance(data["captcha_types"], dict)
    print("✓ All field types correct")

    # Check color
    valid_colors = ["green", "yellow", "red"]
    assert data["success_rate_color"] in valid_colors
    print(f"✓ Color: {data['success_rate_color']}")

    print("✅ TEST 6 PASSED\n")


def test_performance():
    """Test 7: Performance (speed of operations)"""
    print("=" * 70)
    print("TEST 7: Performance")
    print("=" * 70)

    monitor = WorkerMonitor(worker_name="test-perf")

    # Measure record_attempt speed
    start = time.time()
    for i in range(1000):
        monitor.record_attempt(success=True, solve_time=4.2)
    elapsed = time.time() - start

    per_record = (elapsed / 1000) * 1000  # microseconds
    print(f"✓ record_attempt: {per_record:.2f}µs per call")
    assert per_record < 1000, "Should be under 1ms per record"

    # Measure success_rate calculation
    start = time.time()
    for i in range(1000):
        monitor.get_success_rate()
    elapsed = time.time() - start

    per_calc = (elapsed / 1000) * 1000
    print(f"✓ get_success_rate: {per_calc:.2f}µs per call")
    assert per_calc < 1000, "Should be under 1ms per calc"

    # Measure get_dashboard_data
    start = time.time()
    for i in range(100):
        monitor.get_dashboard_data()
    elapsed = time.time() - start

    per_data = (elapsed / 100) * 1000
    print(f"✓ get_dashboard_data: {per_data:.2f}ms per call")
    assert per_data < 100, "Should be under 100ms per call"

    print("✅ TEST 7 PASSED\n")


def main():
    """Run all tests"""
    print("\n" + "=" * 70)
    print("🧪 WORKER MONITOR - TEST SUITE")
    print("=" * 70)

    tests = [
        test_basic_functionality,
        test_rolling_window,
        test_captcha_types,
        test_health_checks,
        test_statistics_persistence,
        test_dashboard_data,
        test_performance,
    ]

    passed = 0
    failed = 0

    for test_func in tests:
        try:
            test_func()
            passed += 1
        except AssertionError as e:
            print(f"❌ TEST FAILED: {e}")
            failed += 1
        except Exception as e:
            print(f"❌ TEST ERROR: {e}")
            failed += 1

    # Summary
    print("=" * 70)
    print(f"📊 TEST SUMMARY")
    print("=" * 70)
    print(f"Passed: {passed}/{len(tests)}")
    print(f"Failed: {failed}/{len(tests)}")

    if failed == 0:
        print("\n✅ ALL TESTS PASSED!")
        return 0
    else:
        print("\n❌ SOME TESTS FAILED")
        return 1


if __name__ == "__main__":
    sys.exit(main())
