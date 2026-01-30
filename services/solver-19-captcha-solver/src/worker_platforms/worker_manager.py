#!/usr/bin/env python3
"""
Worker Manager - Multi-Account Multi-Platform Worker Orchestrator
Manages multiple worker accounts across different platforms
"""

import asyncio
import logging
import os
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

from .twocaptcha_worker import TwoCaptchaWorker

logger = logging.getLogger("WorkerManager")


class PlatformType(str, Enum):
    TWOCAPTCHA = "2captcha"
    ANTICAPTCHA = "anticaptcha"
    CAPMONSTER = "capmonster"


@dataclass
class WorkerAccount:
    """Represents a worker account configuration"""

    id: str
    platform: PlatformType
    username: str
    password: str
    enabled: bool = True
    max_concurrent: int = 1
    steel_browser_url: str = "http://agent-05-steel-browser:3005"
    stats: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WorkerInstance:
    """Running worker instance"""

    account: WorkerAccount
    worker: Any
    task: Optional[asyncio.Task] = None
    started_at: datetime = field(default_factory=datetime.now)


class WorkerManager:
    """
    Manages multiple worker instances across platforms
    - Auto-starts workers from configuration
    - Monitors earnings and performance
    - Rotates accounts to maximize earnings
    """

    def __init__(self):
        self.accounts: Dict[str, WorkerAccount] = {}
        self.workers: Dict[str, WorkerInstance] = {}
        self.is_running = False
        self.monitor_task: Optional[asyncio.Task] = None

    def load_accounts_from_env(self) -> int:
        """Load worker accounts from environment variables"""
        count = 0

        # Load 2captcha accounts
        # Format: TWOCAPTCHA_ACCOUNTS=user1:pass1,user2:pass2
        twocaptcha_accounts = os.getenv("TWOCAPTCHA_ACCOUNTS", "")
        if twocaptcha_accounts:
            for i, account_str in enumerate(twocaptcha_accounts.split(",")):
                if ":" in account_str:
                    username, password = account_str.split(":", 1)
                    account = WorkerAccount(
                        id=f"2captcha_{i}",
                        platform=PlatformType.TWOCAPTCHA,
                        username=username.strip(),
                        password=password.strip(),
                    )
                    self.accounts[account.id] = account
                    count += 1
                    logger.info(f"📋 Loaded 2captcha account: {username}")

        # Also check for individual account vars
        # Format: TWOCAPTCHA_USERNAME_1, TWOCAPTCHA_PASSWORD_1
        i = 1
        while True:
            username = os.getenv(f"TWOCAPTCHA_USERNAME_{i}")
            password = os.getenv(f"TWOCAPTCHA_PASSWORD_{i}")
            if not username or not password:
                break

            account_id = f"2captcha_{i}"
            if account_id not in self.accounts:
                account = WorkerAccount(
                    id=account_id,
                    platform=PlatformType.TWOCAPTCHA,
                    username=username,
                    password=password,
                )
                self.accounts[account_id] = account
                count += 1
                logger.info(f"📋 Loaded 2captcha account: {username}")
            i += 1

        logger.info(f"✅ Loaded {count} worker accounts")
        return count

    def add_account(self, account: WorkerAccount):
        """Add a worker account manually"""
        self.accounts[account.id] = account
        logger.info(f"📋 Added account: {account.id}")

    async def start_worker(self, account_id: str) -> bool:
        """Start a specific worker"""
        if account_id in self.workers:
            logger.warning(f"⚠️ Worker {account_id} already running")
            return False

        account = self.accounts.get(account_id)
        if not account:
            logger.error(f"❌ Account {account_id} not found")
            return False

        if not account.enabled:
            logger.info(f"ℹ️ Account {account_id} is disabled")
            return False

        try:
            logger.info(f"🚀 Starting worker for {account.platform.value}: {account.username}")

            if account.platform == PlatformType.TWOCAPTCHA:
                worker = TwoCaptchaWorker(
                    username=account.username,
                    password=account.password,
                    steel_browser_url=account.steel_browser_url,
                    max_concurrent=account.max_concurrent,
                )

                # Initialize
                if not await worker.initialize():
                    logger.error(f"❌ Failed to initialize worker {account_id}")
                    return False

                # Login
                if not await worker.login():
                    logger.error(f"❌ Failed to login worker {account_id}")
                    await worker.stop()
                    return False

                # Start work
                if not await worker.start_work():
                    logger.error(f"❌ Failed to start work for {account_id}")
                    await worker.stop()
                    return False

                # Start work loop in background
                task = asyncio.create_task(worker.work_loop())

                # Store instance
                instance = WorkerInstance(account=account, worker=worker, task=task)
                self.workers[account_id] = instance

                logger.info(f"✅ Worker {account_id} started successfully")
                return True

            else:
                logger.error(f"❌ Unsupported platform: {account.platform}")
                return False

        except Exception as e:
            logger.error(f"❌ Failed to start worker {account_id}: {e}")
            return False

    async def stop_worker(self, account_id: str):
        """Stop a specific worker"""
        instance = self.workers.get(account_id)
        if not instance:
            logger.warning(f"⚠️ Worker {account_id} not running")
            return

        logger.info(f"🛑 Stopping worker {account_id}...")

        # Stop worker
        if instance.worker:
            await instance.worker.stop()

        # Cancel task
        if instance.task:
            instance.task.cancel()
            try:
                await instance.task
            except asyncio.CancelledError:
                pass

        # Remove from dict
        del self.workers[account_id]
        logger.info(f"✅ Worker {account_id} stopped")

    async def start_all(self):
        """Start all enabled workers"""
        logger.info("🚀 Starting all workers...")

        for account_id in self.accounts:
            await self.start_worker(account_id)
            # Small delay to avoid overwhelming the system
            await asyncio.sleep(2)

        logger.info(f"✅ Started {len(self.workers)} workers")

    async def stop_all(self):
        """Stop all workers"""
        logger.info("🛑 Stopping all workers...")

        self.is_running = False

        if self.monitor_task:
            self.monitor_task.cancel()
            try:
                await self.monitor_task
            except asyncio.CancelledError:
                pass

        for account_id in list(self.workers.keys()):
            await self.stop_worker(account_id)

        logger.info("✅ All workers stopped")

    async def monitor_loop(self):
        """Monitor workers and restart failed ones"""
        logger.info("📊 Starting monitor loop...")

        while self.is_running:
            try:
                for account_id, instance in list(self.workers.items()):
                    # Check if worker is still running
                    if instance.task and instance.task.done():
                        logger.warning(f"⚠️ Worker {account_id} died, restarting...")
                        await self.stop_worker(account_id)
                        await asyncio.sleep(5)
                        await self.start_worker(account_id)

                    # Update stats
                    if hasattr(instance.worker, "get_stats"):
                        instance.account.stats = instance.worker.get_stats()

                await asyncio.sleep(30)  # Check every 30 seconds

            except Exception as e:
                logger.error(f"❌ Monitor loop error: {e}")
                await asyncio.sleep(5)

    async def run(self):
        """Run the manager - start all workers and monitor"""
        self.is_running = True

        # Load accounts
        if not self.accounts:
            self.load_accounts_from_env()

        # Start all workers
        await self.start_all()

        # Start monitor
        self.monitor_task = asyncio.create_task(self.monitor_loop())

        logger.info("✅ Worker Manager is running")

        # Keep running
        try:
            while self.is_running:
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            logger.info("⛔ Manager cancelled")
        finally:
            await self.stop_all()

    def get_stats(self) -> Dict[str, Any]:
        """Get statistics for all workers"""
        total_earnings = 0.0
        total_solved = 0
        total_failed = 0

        worker_stats = {}
        for account_id, instance in self.workers.items():
            stats = instance.account.stats
            worker_stats[account_id] = {
                "platform": instance.account.platform.value,
                "username": instance.account.username,
                "earnings_usd": stats.get("earnings_usd", 0),
                "total_solved": stats.get("total_solved", 0),
                "total_failed": stats.get("total_failed", 0),
                "uptime_hours": stats.get("uptime_hours", 0),
                "avg_per_hour": stats.get("avg_per_hour", 0),
                "is_running": stats.get("is_running", False),
            }

            total_earnings += stats.get("earnings_usd", 0)
            total_solved += stats.get("total_solved", 0)
            total_failed += stats.get("total_failed", 0)

        return {
            "total_workers": len(self.workers),
            "total_earnings_usd": total_earnings,
            "total_solved": total_solved,
            "total_failed": total_failed,
            "workers": worker_stats,
            "is_running": self.is_running,
        }


# Singleton instance
_manager: Optional[WorkerManager] = None


def get_worker_manager() -> WorkerManager:
    """Get or create singleton worker manager"""
    global _manager
    if _manager is None:
        _manager = WorkerManager()
    return _manager


async def main():
    """Test the worker manager"""
    manager = get_worker_manager()

    # Load accounts
    count = manager.load_accounts_from_env()

    if count == 0:
        logger.error("❌ No accounts configured. Set TWOCAPTCHA_ACCOUNTS env var.")
        logger.info("Example: export TWOCAPTCHA_ACCOUNTS=user1:pass1,user2:pass2")
        return

    # Run manager
    try:
        await manager.run()
    except KeyboardInterrupt:
        logger.info("⛔ Interrupted by user")
    finally:
        await manager.stop_all()


if __name__ == "__main__":
    asyncio.run(main())
