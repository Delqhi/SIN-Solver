"""
Integrated Captcha Worker - Combines SessionManager, Monitor, and Human Behavior
==================================================================================

This module orchestrates the complete worker system with:
- Session management & IP rotation (SessionManager)
- Real-time monitoring & health tracking (WorkerMonitor)
- Human-like behavior simulation (HumanBehavior)
- Multi-account isolation & fault tolerance
"""

import asyncio
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Callable, Dict, List
from dataclasses import dataclass

from session_manager import SessionManager, HealthMetrics
from monitor import WorkerMonitor
from human_behavior import HumanBehavior

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@dataclass
class WorkerConfig:
    """Configuration for integrated worker"""

    account_id: str
    captcha_type: str = "text"  # text, slider, click, image, audio
    target_success_rate: float = 96.0
    baseline_solve_time: float = 30.0
    router_config: Optional[Dict] = None
    stats_dir: Optional[Path] = None
    max_retries: int = 3
    emergency_stop_threshold: float = 95.0


class IntegratedCaptchaWorker:
    """
    Combines SessionManager, Monitor, and HumanBehavior for complete worker system.

    Features:
    - IP rotation with geographic cooldown
    - Session persistence & recovery
    - Real-time monitoring dashboard
    - Human-like behavior simulation
    - Automatic emergency stop on degradation
    - Multi-account isolation
    """

    def __init__(self, config: WorkerConfig):
        self.config = config
        self.logger = logging.getLogger(f"worker-{config.account_id}")

        # Initialize components
        self.session_manager = SessionManager(
            account_id=config.account_id, router_config=config.router_config or {}
        )

        self.monitor = WorkerMonitor(
            worker_name=f"captcha-{config.account_id}",
            stats_dir=str(config.stats_dir or Path.home() / ".sin-solver" / "workers"),
        )

        self.behavior = HumanBehavior()

        # State tracking
        self.is_running = False
        self.emergency_stop = False
        self.total_solves = 0
        self.successful_solves = 0

        # Callbacks
        self.on_health_degraded: List[Callable] = []
        self.on_session_reconnected: List[Callable] = []
        self.on_solve_completed: List[Callable[[bool, float], None]] = []

    async def start(self):
        """Start the worker system"""
        self.logger.info(f"Starting worker for account: {self.config.account_id}")

        self.session_manager.start_session()
        self.monitor.start_dashboard(port=8080)
        self.monitor.start_stats_saver()

        self.is_running = True
        self.emergency_stop = False

        self.logger.info("Worker started successfully")

    async def stop(self):
        """Stop the worker system"""
        self.logger.info("Stopping worker...")

        self.is_running = False

        self.session_manager.end_session()
        self.monitor.stop()

        self.logger.info("Worker stopped")

    async def solve_captcha(self, captcha_data: dict) -> tuple[bool, Optional[str]]:
        """
        Solve a single captcha with full integration.

        Args:
            captcha_data: Captcha image/data to solve

        Returns:
            (success, solution) tuple
        """
        start_time = time.time()
        solve_time = 0
        success = False
        solution = None

        try:
            self.behavior.wait_before_action()

            if not await self.session_manager.check_ip_health():
                self.logger.warning("IP health degraded, triggering reconnection...")
                await self._handle_reconnection()

            solve_time = await self._solve_captcha_internal(captcha_data)
            success = solve_time > 0

            self.total_solves += 1
            if success:
                self.successful_solves += 1

            self.monitor.record_attempt(
                success=success, solve_time=solve_time, captcha_type=self.config.captcha_type
            )

            self.session_manager.record_solve_attempt(success=success, solve_time=solve_time)

            self.behavior.take_micro_break()

            await self._check_worker_health()

            for callback in self.on_solve_completed:
                try:
                    callback(success, solve_time)
                except Exception as e:
                    self.logger.error(f"Callback error: {e}")

        except Exception as e:
            self.logger.error(f"Error solving captcha: {e}", exc_info=True)
            solve_time = 0
            success = False

        return success, solution

    async def solve_batch(self, captchas: List[dict], batch_size: int = 10) -> Dict:
        """
        Solve a batch of captchas with automatic recovery.

        Args:
            captchas: List of captcha data
            batch_size: Number of captchas to solve before health check

        Returns:
            Statistics dictionary
        """
        batch_start = time.time()
        batch_stats = {
            "total": len(captchas),
            "successful": 0,
            "failed": 0,
            "errors": [],
            "duration_seconds": 0,
            "avg_solve_time": 0,
            "success_rate": 0.0,
        }

        solve_times = []

        for i, captcha in enumerate(captchas):
            if self.emergency_stop:
                self.logger.warning("Emergency stop triggered, halting batch")
                break

            success, _ = await self.solve_captcha(captcha)

            if success:
                batch_stats["successful"] += 1
            else:
                batch_stats["failed"] += 1

            # Health check every batch_size solves
            if (i + 1) % batch_size == 0:
                await self._check_worker_health()
                self.logger.info(
                    f"Batch progress: {i + 1}/{len(captchas)} "
                    f"({batch_stats['successful']} success, "
                    f"{batch_stats['failed']} failed)"
                )

        # Final statistics
        batch_stats["duration_seconds"] = time.time() - batch_start
        batch_stats["success_rate"] = (
            batch_stats["successful"] / batch_stats["total"] * 100
            if batch_stats["total"] > 0
            else 0
        )

        self.logger.info(f"Batch complete: {batch_stats}")

        return batch_stats

    async def _check_worker_health(self):
        """Check worker health and trigger reconnection if degraded"""
        health = self.session_manager.health
        success_rate = self.monitor.get_success_rate()

        # Check if degraded
        if health.is_degraded or success_rate < self.config.emergency_stop_threshold:
            self.logger.warning(
                f"Worker degraded - solve_time: {health.current_solve_time:.1f}s, "
                f"rejection_rate: {health.rejection_rate:.1f}%, "
                f"success_rate: {success_rate:.1f}%"
            )

            # Trigger callbacks
            for callback in self.on_health_degraded:
                try:
                    callback(health, success_rate)
                except Exception as e:
                    self.logger.error(f"Health callback error: {e}")

            # Check if we should emergency stop
            if success_rate < self.config.emergency_stop_threshold:
                self.logger.critical("SUCCESS RATE BELOW THRESHOLD - EMERGENCY STOP")
                self.emergency_stop = True
                return False

            # Attempt reconnection
            await self._handle_reconnection()

        return True

    async def _handle_reconnection(self):
        """Handle IP rotation and reconnection"""
        self.logger.info("Initiating reconnection sequence...")

        try:
            await self.session_manager.reconnect_and_cooldown()

            # Trigger callbacks
            for callback in self.on_session_reconnected:
                try:
                    callback()
                except Exception as e:
                    self.logger.error(f"Reconnection callback error: {e}")

            self.logger.info("Reconnection complete")

        except Exception as e:
            self.logger.error(f"Reconnection failed: {e}", exc_info=True)
            self.emergency_stop = True

    async def _solve_captcha_internal(self, captcha_data: dict) -> float:
        """
        Internal captcha solving logic.

        This is a placeholder - replace with actual solver implementation.
        Returns solve time in seconds (0 if failed).
        """
        # Simulate solving
        await asyncio.sleep(0.1)

        # 95% success rate for testing
        import random

        if random.random() < 0.95:
            return 25.0 + random.uniform(-5, 5)  # Varies 20-30 seconds
        else:
            return 0  # Failed

    def get_stats(self) -> Dict:
        """Get current worker statistics"""
        success_rate = (
            (self.successful_solves / self.total_solves * 100) if self.total_solves > 0 else 0
        )

        return {
            "account_id": self.config.account_id,
            "total_solves": self.total_solves,
            "successful_solves": self.successful_solves,
            "failed_solves": self.total_solves - self.successful_solves,
            "success_rate": f"{success_rate:.2f}%",
            "is_running": self.is_running,
            "emergency_stop": self.emergency_stop,
            "session_health": self.session_manager.health.to_dict(),
            "monitor_stats": self.monitor.get_dashboard_data(),
        }


# Example usage and integration
async def main():
    """Example: Run integrated worker"""

    config = WorkerConfig(
        account_id="worker-001",
        captcha_type="text",
        target_success_rate=96.0,
        baseline_solve_time=30.0,
        router_config={"type": "fritzbox", "host": "192.168.1.1", "password": "your_password"},
    )

    worker = IntegratedCaptchaWorker(config)

    # Register callbacks
    def on_health_degraded(health, success_rate):
        print(f"⚠️ Health degraded: success_rate={success_rate:.1f}%")

    def on_reconnected():
        print("✅ Session reconnected, IP rotated")

    def on_solve(success, solve_time):
        print(f"{'✓' if success else '✗'} Solve in {solve_time:.1f}s")

    worker.on_health_degraded.append(on_health_degraded)
    worker.on_session_reconnected.append(on_reconnected)
    worker.on_solve_completed.append(on_solve)

    # Start worker
    await worker.start()

    try:
        # Simulate solving batch
        captchas = [{"id": i, "image": None} for i in range(50)]
        stats = await worker.solve_batch(captchas, batch_size=10)

        print("\n=== FINAL STATS ===")
        print(f"Success Rate: {stats['success_rate']:.2f}%")
        print(f"Duration: {stats['duration_seconds']:.1f}s")
        print(f"Successful: {stats['successful']}/{stats['total']}")

        # Print worker stats
        print("\n=== WORKER STATS ===")
        import json

        print(json.dumps(worker.get_stats(), indent=2, default=str))

    finally:
        await worker.stop()


if __name__ == "__main__":
    asyncio.run(main())
