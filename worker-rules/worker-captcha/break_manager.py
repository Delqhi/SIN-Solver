#!/usr/bin/env python3
"""
Break Manager for Captcha Worker
Handles work schedules, breaks, and session limits
"""

import time
import random
import logging
from datetime import datetime, timedelta
from typing import Optional
from dataclasses import dataclass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class WorkSession:
    """Tracks a work session"""

    start_time: float
    captchas_solved: int = 0
    breaks_taken: int = 0
    last_break_time: float = 0.0


class BreakManager:
    """
    Manages work breaks and session limits

    Rules:
    - Max 2.5 hours continuous work
    - 5-15 minute break after 2.5 hours
    - Micro-breaks every 20-40 captchas
    - Progressive difficulty detection
    """

    def __init__(self):
        self.max_work_minutes = 150  # 2.5 hours
        self.break_duration_range = (5, 15)  # minutes
        self.micro_break_captcha_range = (20, 40)
        self.micro_break_duration_range = (30, 90)  # seconds

        self.session = WorkSession(start_time=time.time())
        self.difficulty_baseline = None

    def get_work_duration_minutes(self) -> float:
        """Get current work session duration"""
        return (time.time() - self.session.start_time) / 60

    def should_take_major_break(self) -> bool:
        """Check if major break is needed (2.5 hours)"""
        return self.get_work_duration_minutes() >= self.max_work_minutes

    def should_take_micro_break(self) -> bool:
        """Check if micro-break is needed (every 20-40 captchas)"""
        if self.session.captchas_solved == 0:
            return False

        interval = random.randint(*self.micro_break_captcha_range)
        return self.session.captchas_solved % interval == 0

    def get_major_break_duration(self) -> int:
        """Get random major break duration (5-15 minutes)"""
        return random.randint(*self.break_duration_range)

    def get_micro_break_duration(self) -> int:
        """Get random micro-break duration (30-90 seconds)"""
        return random.randint(*self.micro_break_duration_range)

    def take_major_break(self):
        """Take a major break (logout, wait, relogin)"""
        duration = self.get_major_break_duration()

        logger.info(f"🛑 MAJOR BREAK: {duration} minutes")
        logger.info("   Logging out...")

        # Simulate logout
        time.sleep(2)

        # Break countdown
        for minute in range(duration, 0, -1):
            if minute % 5 == 0:
                logger.info(f"   Break remaining: {minute} minutes")
            time.sleep(60)

        # Reset session
        self.session = WorkSession(start_time=time.time())
        logger.info("✅ Break complete! Starting new session...")

    def take_micro_break(self):
        """Take a micro-break (30-90 seconds idle)"""
        duration = self.get_micro_break_duration()

        logger.info(f"☕ Micro-break: {duration} seconds")

        # Simulate idle behavior
        time.sleep(duration)

        self.session.breaks_taken += 1
        self.session.last_break_time = time.time()
        logger.info("✅ Micro-break complete")

    def record_captcha_solved(self):
        """Record successful captcha solve"""
        self.session.captchas_solved += 1

    def detect_difficulty_increase(self, recent_solve_times: list) -> bool:
        """
        Detect if captchas are getting harder (bot suspicion)

        Signs:
        - Solve time increased >50%
        - More complex captchas
        - Higher rejection rate
        """
        if len(recent_solve_times) < 10:
            return False

        if self.difficulty_baseline is None:
            self.difficulty_baseline = sum(recent_solve_times) / len(recent_solve_times)
            return False

        recent_avg = sum(recent_solve_times[-10:]) / 10

        if recent_avg > self.difficulty_baseline * 1.5:
            logger.warning(
                f"⚠️ Difficulty increased: {recent_avg:.1f}s vs {self.difficulty_baseline:.1f}s baseline"
            )
            return True

        return False

    def get_time_until_break(self) -> str:
        """Get human-readable time until next major break"""
        minutes_worked = self.get_work_duration_minutes()
        minutes_left = self.max_work_minutes - minutes_worked

        if minutes_left <= 0:
            return "BREAK NOW!"

        hours = int(minutes_left // 60)
        mins = int(minutes_left % 60)

        if hours > 0:
            return f"{hours}h {mins}m"
        else:
            return f"{mins}m"


class AutoLogoutManager:
    """Manages automatic logout and session limits"""

    def __init__(self, break_manager: BreakManager):
        self.break_manager = break_manager
        self.last_activity = time.time()
        self.inactivity_timeout = 300  # 5 minutes

    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = time.time()

    def check_inactivity(self) -> bool:
        """Check if worker is inactive"""
        inactive_time = time.time() - self.last_activity
        return inactive_time > self.inactivity_timeout

    def auto_logout(self):
        """Perform automatic logout"""
        logger.info("🚪 Auto-logout due to inactivity/session end")
        # Implementation depends on browser automation
        pass


# Example usage
if __name__ == "__main__":
    break_mgr = BreakManager()

    print(f"Work session started!")
    print(f"Max work time: {break_mgr.max_work_minutes} minutes")

    # Simulate work
    for i in range(50):
        # Check if major break needed
        if break_mgr.should_take_major_break():
            break_mgr.take_major_break()

        # Check if micro-break needed
        if break_mgr.should_take_micro_break():
            break_mgr.take_micro_break()

        # Solve captcha
        break_mgr.record_captcha_solved()
        time.sleep(0.1)  # Simulate work

        if i % 10 == 0:
            print(f"Solved: {i}, Time until break: {break_mgr.get_time_until_break()}")

    print(f"\nSession complete!")
    print(f"Total captchas: {break_mgr.session.captchas_solved}")
    print(f"Breaks taken: {break_mgr.session.breaks_taken}")
