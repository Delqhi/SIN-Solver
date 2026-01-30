"""
Integration Test: Monitor + Captcha Worker
=========================================

Comprehensive integration tests verifying that:
1. WorkerMonitor integrates seamlessly with IntegratedCaptchaWorker
2. Dashboard updates in real-time
3. Health checks trigger correctly
4. Stats are persisted properly
5. Multi-worker scenarios work correctly
"""

import asyncio
import json
import time
from pathlib import Path
from typing import List, Dict
import logging

from monitor import WorkerMonitor
from captcha_worker_integrated import IntegratedCaptchaWorker, WorkerConfig
from human_behavior import HumanBehavior

# Configure logging
logging.basicConfig(
    level=logging.DEBUG, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class IntegrationTestSuite:
    """Integration test suite for monitor + worker system"""

    def __init__(self, test_dir: Path = None):
        self.test_dir = test_dir or Path.home() / ".test_monitor_integration"
        self.test_dir.mkdir(parents=True, exist_ok=True)
        self.results = {"passed": [], "failed": [], "duration": 0}

    async def run_all_tests(self) -> Dict:
        """Run all integration tests"""
        logger.info("=" * 60)
        logger.info("STARTING INTEGRATION TEST SUITE")
        logger.info("=" * 60)

        start_time = time.time()

        try:
            await self.test_monitor_initialization()
            await self.test_worker_integration()
            await self.test_real_time_updates()
            await self.test_health_checks_and_alerts()
            await self.test_statistics_persistence()
            await self.test_multi_worker_scenario()
            await self.test_emergency_stop()
            await self.test_performance_under_load()
        except Exception as e:
            logger.error(f"Test suite error: {e}", exc_info=True)
            self.results["failed"].append(f"Test suite error: {e}")

        self.results["duration"] = time.time() - start_time

        # Print results
        self._print_results()

        return self.results

    async def test_monitor_initialization(self):
        """Test 1: Monitor initializes correctly"""
        logger.info("\n[TEST 1] Monitor Initialization")

        try:
            monitor = WorkerMonitor(
                worker_name="test-worker-001", stats_dir=self.test_dir / "test1"
            )

            # Verify initial state
            assert monitor.worker_name == "test-worker-001"
            assert monitor.get_success_rate() == 0.0
            assert monitor.get_average_solve_time() == 0.0

            # Record test attempt
            monitor.record_attempt(success=True, solve_time=5.0, captcha_type="text")

            assert monitor.get_success_rate() == 100.0
            assert monitor.get_average_solve_time() == 5.0

            monitor.stop()

            logger.info("✅ PASSED: Monitor initialization")
            self.results["passed"].append("test_monitor_initialization")

        except AssertionError as e:
            logger.error(f"❌ FAILED: {e}")
            self.results["failed"].append(f"test_monitor_initialization: {e}")

    async def test_worker_integration(self):
        """Test 2: Worker integrates with monitor correctly"""
        logger.info("\n[TEST 2] Worker Integration")

        try:
            config = WorkerConfig(
                account_id="test-account-001",
                captcha_type="text",
                stats_dir=self.test_dir / "test2",
            )

            worker = IntegratedCaptchaWorker(config)
            await worker.start()

            # Verify integration
            assert worker.is_running is True
            assert worker.monitor is not None
            assert worker.session_manager is not None

            # Solve some captchas
            for i in range(10):
                success, _ = await worker.solve_captcha({"id": i})
                await asyncio.sleep(0.1)

            # Check monitor recorded attempts
            monitor_rate = worker.monitor.get_success_rate()
            assert monitor_rate > 0

            await worker.stop()

            logger.info(f"✅ PASSED: Worker integration (success rate: {monitor_rate:.1f}%)")
            self.results["passed"].append("test_worker_integration")

        except Exception as e:
            logger.error(f"❌ FAILED: {e}")
            self.results["failed"].append(f"test_worker_integration: {e}")

    async def test_real_time_updates(self):
        """Test 3: Dashboard updates in real-time"""
        logger.info("\n[TEST 3] Real-Time Dashboard Updates")

        try:
            monitor = WorkerMonitor(
                worker_name="test-worker-realtime", stats_dir=self.test_dir / "test3"
            )

            monitor.start_dashboard(port=18080)
            monitor.start_stats_saver()

            # Record attempts and verify dashboard data
            for i in range(20):
                monitor.record_attempt(
                    success=i % 2 == 0,  # 50% success
                    solve_time=4.0 + i * 0.1,
                    captcha_type=["text", "slider", "click"][i % 3],
                )

                # Get dashboard data
                data = monitor.get_dashboard_data()

                # Verify structure
                assert "success_rate" in data
                assert "captchas_solved" in data
                assert "session_duration" in data
                assert "success_by_type" in data
                assert "current_ip" in data

                if (i + 1) % 5 == 0:
                    logger.info(f"  → {i + 1}/20: Success rate = {data['success_rate']:.1f}%")

                await asyncio.sleep(0.05)

            monitor.stop()

            logger.info("✅ PASSED: Real-time dashboard updates")
            self.results["passed"].append("test_real_time_updates")

        except Exception as e:
            logger.error(f"❌ FAILED: {e}")
            self.results["failed"].append(f"test_real_time_updates: {e}")

    async def test_health_checks_and_alerts(self):
        """Test 4: Health checks and alert triggers"""
        logger.info("\n[TEST 4] Health Checks & Alerts")

        try:
            monitor = WorkerMonitor(
                worker_name="test-worker-health", stats_dir=self.test_dir / "test4"
            )

            alert_triggered = []

            def on_health_change(is_healthy):
                alert_triggered.append({"timestamp": time.time(), "is_healthy": is_healthy})
                status = "✅ HEALTHY" if is_healthy else "🚨 UNHEALTHY"
                logger.info(f"  → Health alert: {status}")

            monitor.health_check_callbacks.append(on_health_change)

            # Record successful attempts (should be healthy)
            for i in range(30):
                monitor.record_attempt(success=True, solve_time=4.0, captcha_type="text")
                monitor.check_health()

            healthy_alerts = len([a for a in alert_triggered if a["is_healthy"]])

            # Record failed attempts (should trigger alert)
            alert_triggered.clear()
            for i in range(10):
                monitor.record_attempt(
                    success=False,  # 0% success
                    solve_time=4.0,
                    captcha_type="text",
                )
                monitor.check_health()
                await asyncio.sleep(0.05)

            unhealthy_alerts = len([a for a in alert_triggered if not a["is_healthy"]])

            assert unhealthy_alerts > 0, "Should trigger unhealthy alert"

            monitor.stop()

            logger.info(f"✅ PASSED: Health checks (unhealthy alerts: {unhealthy_alerts})")
            self.results["passed"].append("test_health_checks_and_alerts")

        except Exception as e:
            logger.error(f"❌ FAILED: {e}")
            self.results["failed"].append(f"test_health_checks_and_alerts: {e}")

    async def test_statistics_persistence(self):
        """Test 5: Statistics persist correctly"""
        logger.info("\n[TEST 5] Statistics Persistence")

        try:
            stats_dir = self.test_dir / "test5"

            # Create monitor and record data
            monitor1 = WorkerMonitor(worker_name="test-worker-persist", stats_dir=stats_dir)

            monitor1.start_stats_saver()

            # Record attempts
            for i in range(25):
                monitor1.record_attempt(success=i % 2 == 0, solve_time=5.0, captcha_type="text")

            stats_before = monitor1.get_dashboard_data()
            monitor1.stop()

            # Wait for stats to save
            await asyncio.sleep(1.0)

            # Load stats file and verify
            stats_file = stats_dir / "all_time_stats.json"
            assert stats_file.exists(), "Stats file not created"

            with open(stats_file) as f:
                saved_stats = json.load(f)

            assert saved_stats["total_captchas"] == 25

            logger.info(
                f"✅ PASSED: Statistics persistence ({saved_stats['total_captchas']} captchas saved)"
            )
            self.results["passed"].append("test_statistics_persistence")

        except Exception as e:
            logger.error(f"❌ FAILED: {e}")
            self.results["failed"].append(f"test_statistics_persistence: {e}")

    async def test_multi_worker_scenario(self):
        """Test 6: Multiple workers can run simultaneously"""
        logger.info("\n[TEST 6] Multi-Worker Scenario")

        try:
            # Create multiple workers
            workers = []
            for i in range(3):
                config = WorkerConfig(
                    account_id=f"test-account-{i:03d}",
                    captcha_type=["text", "slider", "click"][i],
                    stats_dir=self.test_dir / f"test6_worker{i}",
                )
                worker = IntegratedCaptchaWorker(config)
                await worker.start()
                workers.append(worker)

            # Run all workers in parallel
            async def solve_batch(worker_obj, batch_size=15):
                for j in range(batch_size):
                    await worker_obj.solve_captcha({"id": j})
                    await asyncio.sleep(0.05)

            await asyncio.gather(*[solve_batch(w) for w in workers])

            # Verify all workers have stats
            success_rates = []
            for worker in workers:
                rate = worker.monitor.get_success_rate()
                success_rates.append(rate)
                logger.info(f"  → {worker.config.account_id}: {rate:.1f}%")
                await worker.stop()

            assert all(rate > 0 for rate in success_rates)

            logger.info(f"✅ PASSED: Multi-worker scenario ({len(workers)} workers)")
            self.results["passed"].append("test_multi_worker_scenario")

        except Exception as e:
            logger.error(f"❌ FAILED: {e}")
            self.results["failed"].append(f"test_multi_worker_scenario: {e}")

    async def test_emergency_stop(self):
        """Test 7: Emergency stop mechanism"""
        logger.info("\n[TEST 7] Emergency Stop Mechanism")

        try:
            config = WorkerConfig(
                account_id="test-account-emergency",
                captcha_type="text",
                emergency_stop_threshold=95.0,
                stats_dir=self.test_dir / "test7",
            )

            worker = IntegratedCaptchaWorker(config)
            await worker.start()

            stop_triggered = []

            def on_degraded(health, success_rate):
                if success_rate < config.emergency_stop_threshold:
                    stop_triggered.append(success_rate)
                    logger.info(f"  → Emergency stop triggered at {success_rate:.1f}%")

            worker.on_health_degraded.append(on_degraded)

            # Record mostly failed attempts
            for i in range(30):
                await worker.solve_captcha({"id": i})

                if worker.emergency_stop:
                    logger.info(f"  → Worker stopped at attempt {i + 1}")
                    break

            # Verify emergency stop was set
            assert worker.emergency_stop is True, "Emergency stop should be triggered"

            await worker.stop()

            logger.info(f"✅ PASSED: Emergency stop mechanism")
            self.results["passed"].append("test_emergency_stop")

        except Exception as e:
            logger.error(f"❌ FAILED: {e}")
            self.results["failed"].append(f"test_emergency_stop: {e}")

    async def test_performance_under_load(self):
        """Test 8: Performance under load"""
        logger.info("\n[TEST 8] Performance Under Load")

        try:
            monitor = WorkerMonitor(
                worker_name="test-worker-load", stats_dir=self.test_dir / "test8"
            )

            monitor.start_stats_saver()

            # Measure overhead
            start_time = time.time()

            for i in range(100):
                monitor.record_attempt(success=True, solve_time=4.0, captcha_type="text")

            duration = time.time() - start_time
            overhead_per_attempt = (duration / 100) * 1000  # milliseconds

            logger.info(f"  → 100 attempts in {duration:.3f}s")
            logger.info(f"  → {overhead_per_attempt:.2f}ms per attempt")

            # Verify overhead is acceptable (<5ms per attempt)
            assert overhead_per_attempt < 5.0, f"Overhead too high: {overhead_per_attempt:.2f}ms"

            # Verify success rate calculation
            rate = monitor.get_success_rate()
            assert rate == 100.0

            monitor.stop()

            logger.info(f"✅ PASSED: Performance under load")
            self.results["passed"].append("test_performance_under_load")

        except Exception as e:
            logger.error(f"❌ FAILED: {e}")
            self.results["failed"].append(f"test_performance_under_load: {e}")

    def _print_results(self):
        """Print test results summary"""
        logger.info("\n" + "=" * 60)
        logger.info("TEST RESULTS SUMMARY")
        logger.info("=" * 60)

        passed = len(self.results["passed"])
        failed = len(self.results["failed"])
        total = passed + failed

        logger.info(f"\nTotal Tests: {total}")
        logger.info(f"✅ Passed: {passed}")
        logger.info(f"❌ Failed: {failed}")
        logger.info(f"⏱️  Duration: {self.results['duration']:.2f}s")

        if self.results["passed"]:
            logger.info("\n✅ PASSED TESTS:")
            for test in self.results["passed"]:
                logger.info(f"  ✓ {test}")

        if self.results["failed"]:
            logger.info("\n❌ FAILED TESTS:")
            for test in self.results["failed"]:
                logger.info(f"  ✗ {test}")

        # Overall status
        if failed == 0:
            logger.info("\n🎉 ALL TESTS PASSED!")
        else:
            logger.info(f"\n⚠️  {failed} test(s) failed")

        logger.info("=" * 60 + "\n")


async def main():
    """Run integration test suite"""
    suite = IntegrationTestSuite()
    results = await suite.run_all_tests()

    # Exit with appropriate code
    return 0 if len(results["failed"]) == 0 else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
