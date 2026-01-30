#!/usr/bin/env python3
"""
Example Full Workflow - Complete Integrated Captcha Worker Demo
================================================================

This demonstrates the complete lifecycle of the IntegratedCaptchaWorker:
1. Initialize worker with config
2. Start worker and monitoring dashboard
3. Solve batch of captchas with human behavior
4. Check health metrics and statistics
5. Handle emergency stops gracefully
6. Stop and cleanup

Usage:
    python3 example_full_workflow.py

Then visit:
    - Dashboard: http://localhost:8080
    - API: http://localhost:8000

Usage with custom ports:
    python3 example_full_workflow.py --dashboard-port 8081 --api-port 8001
"""

import asyncio
import time
import logging
import argparse
from pathlib import Path
from datetime import datetime

from captcha_worker_integrated import IntegratedCaptchaWorker, WorkerConfig

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class CaptchaExample:
    """Simulated captcha for demonstration"""

    def __init__(self, captcha_id: str, captcha_type: str = "text"):
        self.id = captcha_id
        self.type = captcha_type
        self.image_data = b"fake_image_data"
        self.created_at = datetime.now()


def simulate_solve_captcha(captcha: CaptchaExample, human_behavior) -> tuple[bool, float]:
    """
    Simulate solving a captcha with human-like behavior.

    In production, this would:
    1. Call the actual YOLO classifier
    2. Use human behavior methods for anti-detection
    3. Actually submit the solution

    For this example, we simulate with random success based on health.
    """
    import random

    # Simulate human behavior
    human_behavior.wait_before_action()

    # Simulate solving (random success rate ~96%)
    start_time = time.time()

    # 96% success rate for demo
    success = random.random() < 0.96

    # Simulate solve time (3-6 seconds)
    simulated_solve_time = random.uniform(3.0, 6.0)
    time.sleep(min(simulated_solve_time / 10, 0.5))  # Sleep shorter for demo

    solve_time = time.time() - start_time

    if success:
        # Simulate human behavior after success
        human_behavior.take_micro_break()

    return success, solve_time


async def main():
    """Main workflow demonstrating the integrated captcha worker"""

    parser = argparse.ArgumentParser(description="Integrated Captcha Worker Demo")
    parser.add_argument("--dashboard-port", type=int, default=8080, help="Dashboard port")
    parser.add_argument("--api-port", type=int, default=8000, help="API port")
    parser.add_argument("--num-captchas", type=int, default=20, help="Number of captchas to solve")
    parser.add_argument("--worker-id", type=str, default="demo-worker-001", help="Worker ID")
    args = parser.parse_args()

    logger.info("=" * 70)
    logger.info("🚀 INTEGRATED CAPTCHA WORKER - FULL WORKFLOW EXAMPLE")
    logger.info("=" * 70)

    # ====================
    # PHASE 1: INITIALIZE
    # ====================
    logger.info("\n📋 PHASE 1: INITIALIZATION")
    logger.info("-" * 70)

    try:
        config = WorkerConfig(
            account_id=args.worker_id,
            captcha_type="text",
            target_success_rate=96.0,
            baseline_solve_time=30.0,
            stats_dir=Path.home() / ".sin-solver" / "workers",
            max_retries=3,
            emergency_stop_threshold=95.0,
        )
        logger.info(f"✅ Config created: {config}")

        worker = IntegratedCaptchaWorker(config)
        logger.info(f"✅ Worker initialized: {args.worker_id}")

    except Exception as e:
        logger.error(f"❌ Initialization failed: {e}")
        return

    # ====================
    # PHASE 2: START SERVICES
    # ====================
    logger.info("\n🎯 PHASE 2: START SERVICES")
    logger.info("-" * 70)

    try:
        # Start dashboard
        worker.monitor.start_dashboard(port=args.dashboard_port)
        logger.info(f"✅ Dashboard started: http://localhost:{args.dashboard_port}")

        # Start stats saver
        worker.monitor.start_stats_saver()
        logger.info("✅ Stats saver started")

        # Brief pause for services to start
        await asyncio.sleep(1)
        logger.info(f"\n📊 Dashboard URL: http://localhost:{args.dashboard_port}")
        logger.info(f"📊 Refresh this page in your browser to see live updates")

    except Exception as e:
        logger.error(f"❌ Service startup failed: {e}")
        return

    # ====================
    # PHASE 3: SOLVE BATCH
    # ====================
    logger.info(f"\n🔓 PHASE 3: SOLVE BATCH ({args.num_captchas} CAPTCHAS)")
    logger.info("-" * 70)

    solved_count = 0
    success_count = 0
    start_time = time.time()

    try:
        for i in range(args.num_captchas):
            # Create simulated captcha
            captcha = CaptchaExample(captcha_id=f"captcha-{i + 1:04d}", captcha_type="text")

            # Solve with human behavior
            success, solve_time = simulate_solve_captcha(captcha, worker.behavior)

            # Record attempt
            worker.monitor.record_attempt(
                success=success, solve_time=solve_time, captcha_type="text"
            )

            solved_count += 1
            if success:
                success_count += 1

            # Log progress
            rate = (success_count / solved_count * 100) if solved_count > 0 else 0
            status = "✅" if success else "❌"
            logger.info(
                f"{status} [{i + 1}/{args.num_captchas}] "
                f"ID: {captcha.id} | "
                f"Time: {solve_time:.2f}s | "
                f"Rate: {rate:.1f}%"
            )

            # Check health (emergency stop if needed)
            if not worker.monitor.check_health():
                logger.warning(f"🚨 EMERGENCY STOP TRIGGERED at {solved_count}/{args.num_captchas}")
                break

            # Brief pause between attempts
            await asyncio.sleep(0.1)

    except KeyboardInterrupt:
        logger.warning("⚠️  Interrupted by user")
    except Exception as e:
        logger.error(f"❌ Batch solving failed: {e}")

    elapsed_time = time.time() - start_time

    # ====================
    # PHASE 4: CHECK HEALTH
    # ====================
    logger.info(f"\n💪 PHASE 4: HEALTH METRICS")
    logger.info("-" * 70)

    health = worker.session_manager.health
    health_dict = health.to_dict()

    logger.info(f"Health Metrics:")
    logger.info(f"  - Baseline Solve Time: {health_dict['baseline_solve_time']:.2f}s")
    logger.info(f"  - Current Solve Time: {health_dict['current_solve_time']:.2f}s")
    logger.info(f"  - Total Solves: {health_dict['total_solves']}")
    logger.info(f"  - Rejected Solves: {health_dict['rejected_solves']}")
    logger.info(f"  - Rejection Rate: {health_dict['rejection_rate']}")
    logger.info(f"  - Is Degraded: {health_dict['is_degraded']}")

    # ====================
    # PHASE 5: STATISTICS
    # ====================
    logger.info(f"\n📊 PHASE 5: STATISTICS")
    logger.info("-" * 70)

    stats = worker.get_stats()

    success_rate = (success_count / solved_count * 100) if solved_count > 0 else 0
    earnings = (solved_count / 1000) * 0.10  # $0.10 per 1000 solves

    logger.info(f"Session Results:")
    logger.info(f"  - Captchas Solved: {solved_count}/{args.num_captchas}")
    logger.info(f"  - Successful: {success_count}")
    logger.info(f"  - Failed: {solved_count - success_count}")
    logger.info(f"  - Success Rate: {success_rate:.2f}%")
    logger.info(f"  - Elapsed Time: {elapsed_time:.2f}s")
    logger.info(f"  - Average Time/Captcha: {elapsed_time / solved_count:.2f}s")
    logger.info(f"  - Session Earnings: ${earnings:.4f}")
    logger.info(f"  - Rate: ${0.10 / 1000:.6f} per solve")

    # ====================
    # PHASE 6: DASHBOARD
    # ====================
    logger.info(f"\n📈 PHASE 6: DASHBOARD DATA")
    logger.info("-" * 70)
    logger.info(f"🌐 Visit dashboard to see live metrics:")
    logger.info(f"   → http://localhost:{args.dashboard_port}")
    logger.info(f"\n   The dashboard shows:")
    logger.info(f"   • Real-time success rate")
    logger.info(f"   • Session duration")
    logger.info(f"   • Estimated earnings")
    logger.info(f"   • Per-type statistics")
    logger.info(f"   • Control buttons (pause/resume/stop)")

    # ====================
    # PHASE 7: CLEANUP
    # ====================
    logger.info(f"\n🧹 PHASE 7: CLEANUP")
    logger.info("-" * 70)

    try:
        # Keep dashboard running for a few seconds so user can see results
        logger.info("Keeping dashboard alive for 30 seconds...")
        logger.info("Press Ctrl+C to stop early")

        for i in range(30):
            try:
                await asyncio.sleep(1)
            except KeyboardInterrupt:
                logger.info("\nStopping early...")
                break

        # Graceful shutdown
        logger.info("Stopping monitor...")
        worker.monitor.stop()
        logger.info("✅ Monitor stopped")

        logger.info("Stopping dashboard...")
        worker.monitor.stop_dashboard()
        logger.info("✅ Dashboard stopped")

    except Exception as e:
        logger.error(f"⚠️  Cleanup warning: {e}")

    # ====================
    # COMPLETION
    # ====================
    logger.info("\n" + "=" * 70)
    logger.info("✅ WORKFLOW COMPLETED SUCCESSFULLY")
    logger.info("=" * 70)
    logger.info("\nSummary:")
    logger.info(f"  • Total captchas solved: {solved_count}")
    logger.info(f"  • Success rate: {success_rate:.2f}%")
    logger.info(f"  • Session earnings: ${earnings:.4f}")
    logger.info(f"  • Total time: {elapsed_time:.2f}s")
    logger.info(f"\nNext steps:")
    logger.info(f"  1. Check ~/.sin-solver/workers/ for persistent stats")
    logger.info(f"  2. Review captcha_worker_integrated.py for integration")
    logger.info(f"  3. Customize solve_captcha() for real YOLO models")
    logger.info(f"  4. Integrate with your captcha service")
    logger.info("=" * 70 + "\n")


if __name__ == "__main__":
    # Run the workflow
    asyncio.run(main())
