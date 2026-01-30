"""
Human Behavior Simulation Module for Anti-Bot Protection
=========================================================

Simulates realistic human behavior patterns to bypass anti-bot detection systems.
Includes mouse movement, typing patterns, response delays, and break simulation.

Author: OpenCode AI
Version: 1.0.0
"""

import time
import logging
import random
from typing import Tuple, List, Dict, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import numpy as np
from abc import ABC, abstractmethod


# Configure logging
logging.basicConfig(
    level=logging.DEBUG, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class MouseBehavior(Enum):
    """Mouse movement behavior types"""

    NORMAL = "normal"
    JITTERY = "jittery"
    HESITANT = "hesitant"
    CONFIDENT = "confident"


@dataclass
class BehaviorConfig:
    """Configuration for human behavior simulation"""

    # Mouse movement
    mouse_min_speed: float = 100  # pixels/second
    mouse_max_speed: float = 500  # pixels/second
    mouse_path_deviation: float = 0.15  # 15% deviation from straight path
    mouse_overshoot_probability: float = 0.10  # 10% chance of overshoot
    mouse_overshoot_distance: Tuple[float, float] = (10, 50)  # pixels

    # Typing behavior
    typing_speed_mean: float = 120  # ms per character
    typing_speed_std: float = 40  # ms standard deviation
    typing_min_delay: float = 50  # ms minimum between characters
    typing_typo_probability: float = 0.03  # 3% typo rate
    typing_pause_probability: float = 0.15  # 15% chance of pause between words
    typing_pause_duration: Tuple[float, float] = (200, 600)  # ms

    # Response delays
    response_base_delay: float = 2.5  # seconds
    response_delay_std: float = 0.8  # seconds standard deviation
    response_char_delay: float = 0.3  # seconds per character
    response_extra_delay: Tuple[float, float] = (0, 1.0)  # seconds

    # Break behavior
    micro_break_interval: Tuple[int, int] = (20, 40)  # captchas
    micro_break_duration: Tuple[float, float] = (30, 90)  # seconds
    major_break_threshold: float = 9000  # 2.5 hours in seconds
    major_break_duration: Tuple[float, float] = (300, 900)  # 5-15 minutes

    # Idle behavior during breaks
    idle_mouse_movements: int = 3
    idle_scroll_probability: float = 0.3


@dataclass
class BehaviorMetrics:
    """Metrics and statistics for behavior tracking"""

    actions_performed: int = 0
    captchas_solved: int = 0
    micro_breaks_taken: int = 0
    major_breaks_taken: int = 0
    total_runtime: float = 0.0

    typos_made: int = 0
    overshoots: int = 0
    misses: int = 0

    last_action_time: Optional[datetime] = None
    session_start_time: Optional[datetime] = field(default_factory=datetime.now)


class CurveInterpolator:
    """Generates smooth Bezier curves for realistic mouse movement"""

    @staticmethod
    def quadratic_bezier(p0: np.ndarray, p1: np.ndarray, p2: np.ndarray, t: float) -> np.ndarray:
        """
        Calculate point on quadratic Bezier curve

        Args:
            p0: Start point
            p1: Control point
            p2: End point
            t: Parameter (0-1)

        Returns:
            Point on curve
        """
        return (1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t**2 * p2

    @staticmethod
    def cubic_bezier(
        p0: np.ndarray, p1: np.ndarray, p2: np.ndarray, p3: np.ndarray, t: float
    ) -> np.ndarray:
        """
        Calculate point on cubic Bezier curve

        Args:
            p0: Start point
            p1: First control point
            p2: Second control point
            p3: End point
            t: Parameter (0-1)

        Returns:
            Point on curve
        """
        return (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t**2 * p2 + t**3 * p3

    @staticmethod
    def generate_curve_path(
        start: Tuple[int, int], end: Tuple[int, int], num_points: int = 100, deviation: float = 0.15
    ) -> List[Tuple[int, int]]:
        """
        Generate realistic curved path from start to end position

        Args:
            start: Starting coordinates
            end: Ending coordinates
            num_points: Number of points in the path
            deviation: Path deviation from straight line (0-1)

        Returns:
            List of coordinates representing the curved path
        """
        start_arr = np.array(start, dtype=float)
        end_arr = np.array(end, dtype=float)

        # Calculate midpoint and perpendicular offset
        midpoint = (start_arr + end_arr) / 2
        direction = end_arr - start_arr
        distance = np.linalg.norm(direction)

        if distance < 1:
            return [tuple(end)]

        # Create perpendicular vector
        perp = np.array([-direction[1], direction[0]])
        perp = perp / np.linalg.norm(perp)

        # Random control point offset
        offset_distance = distance * deviation * random.uniform(-1, 1)
        control_point = midpoint + perp * offset_distance

        # Generate Bezier curve
        path: List[Tuple[int, int]] = []
        for i in range(num_points + 1):
            t = i / num_points
            point = CurveInterpolator.quadratic_bezier(start_arr, control_point, end_arr, t)
            path.append((int(point[0]), int(point[1])))

        logger.debug(f"Generated curved path: {start} -> {end} ({num_points} points)")
        return path


class HumanBehavior:
    """
    Main class for simulating human-like behavior patterns
    """

    def __init__(self, config: Optional[BehaviorConfig] = None):
        """
        Initialize human behavior simulator

        Args:
            config: BehaviorConfig instance for customization
        """
        self.config = config or BehaviorConfig()
        self.metrics = BehaviorMetrics()
        self.curve_gen = CurveInterpolator()

        self.current_position: Tuple[int, int] = (0, 0)
        self.mouse_behavior_type = MouseBehavior.NORMAL

        logger.info("HumanBehavior module initialized")

    # ==================== MOUSE MOVEMENT ====================

    def generate_mouse_speed(self) -> float:
        """
        Generate realistic mouse speed with Gaussian distribution

        Returns:
            Speed in pixels per second
        """
        speed = random.gauss(
            (self.config.mouse_min_speed + self.config.mouse_max_speed) / 2,
            (self.config.mouse_max_speed - self.config.mouse_min_speed) / 6,
        )
        return max(self.config.mouse_min_speed, min(self.config.mouse_max_speed, speed))

    def generate_curve_path(self, target: Tuple[int, int]) -> List[Tuple[int, int]]:
        """
        Generate Bezier curve path from current position to target

        Args:
            target: Target coordinates

        Returns:
            List of coordinates forming the curved path
        """
        distance = np.sqrt(
            (target[0] - self.current_position[0]) ** 2
            + (target[1] - self.current_position[1]) ** 2
        )

        # Calculate number of points based on distance
        num_points = max(50, int(distance / 5))

        path = self.curve_gen.generate_curve_path(
            self.current_position,
            target,
            num_points=num_points,
            deviation=self.config.mouse_path_deviation,
        )

        return path

    def move_mouse_to(self, x: int, y: int, smooth: bool = True) -> float:
        """
        Move mouse to target position with realistic behavior

        Args:
            x: Target X coordinate
            y: Target Y coordinate
            smooth: Use smooth curved movement (default: True)

        Returns:
            Time taken for movement (seconds)
        """
        target = (x, y)
        distance = np.sqrt(
            (x - self.current_position[0]) ** 2 + (y - self.current_position[1]) ** 2
        )

        logger.debug(
            f"Mouse movement: {self.current_position} -> {target} (distance: {distance:.1f}px)"
        )

        if smooth and distance > 10:
            # Curved movement
            path = self.generate_curve_path(target)
            speed = self.generate_mouse_speed()

            # Simulate speed variation (slower near target)
            movement_time = distance / speed

            # Variable speed over path
            for i, point in enumerate(path):
                progress = i / max(1, len(path) - 1)
                # Speed up initially, slow down near target
                current_speed = speed * (1 - (progress**2) * 0.5)
                self.current_position = point
                time.sleep(min(movement_time / len(path), 0.01))

        else:
            # Direct movement for short distances
            self.current_position = target
            movement_time = distance / self.generate_mouse_speed()
            time.sleep(min(movement_time, 0.1))

        # Check for overshoot
        if random.random() < self.config.mouse_overshoot_probability:
            self._overshoot_and_correct(target)
            movement_time += self._calculate_overshoot_time(target)

        self.metrics.actions_performed += 1
        logger.info(f"Mouse moved to {target} in {movement_time:.3f}s")

        return movement_time

    def _overshoot_and_correct(self, target: Tuple[int, int]) -> None:
        """
        Simulate mouse overshoot and correction (realistic human behavior)

        Args:
            target: Original target position
        """
        overshoot_dist = random.uniform(*self.config.mouse_overshoot_distance)
        angle = random.uniform(0, 2 * np.pi)

        overshoot_pos = (
            int(target[0] + overshoot_dist * np.cos(angle)),
            int(target[1] + overshoot_dist * np.sin(angle)),
        )

        logger.debug(f"Mouse overshoot detected: moving to {overshoot_pos}")

        # Move to overshoot position
        path = self.curve_gen.generate_curve_path(
            self.current_position, overshoot_pos, num_points=20
        )
        for point in path:
            self.current_position = point
            time.sleep(0.005)

        # Correct back to target
        correction_path = self.curve_gen.generate_curve_path(overshoot_pos, target, num_points=15)
        for point in correction_path:
            self.current_position = point
            time.sleep(0.005)

        self.current_position = target
        self.metrics.overshoots += 1

    def _calculate_overshoot_time(self, target: Tuple[int, int]) -> float:
        """Calculate additional time for overshoot and correction"""
        return random.uniform(0.1, 0.3)

    def click_with_variation(self, x: int, y: int, button: str = "left") -> None:
        """
        Click with potential slight miss and correction

        Args:
            x: Target X coordinate
            y: Target Y coordinate
            button: Mouse button ('left', 'right', 'middle')
        """
        # 20% chance of slight miss
        if random.random() < 0.2:
            miss_offset = random.randint(-15, 15), random.randint(-15, 15)
            miss_x, miss_y = x + miss_offset[0], y + miss_offset[1]

            logger.debug(f"Click miss: aiming for ({x}, {y}), clicking at ({miss_x}, {miss_y})")

            # Move to miss position
            self.move_mouse_to(miss_x, miss_y)
            time.sleep(random.uniform(0.05, 0.15))  # Realize the miss

            # Correct and click at target
            self.move_mouse_to(x, y, smooth=False)
            self.metrics.misses += 1
        else:
            # Normal click
            self.move_mouse_to(x, y)

        # Simulate click delay
        time.sleep(random.uniform(0.05, 0.15))
        logger.info(f"Click performed at ({x}, {y}) using {button} button")
        self.metrics.actions_performed += 1

    # ==================== TYPING SIMULATION ====================

    def generate_character_delay(self) -> float:
        """
        Generate realistic character delay with Gaussian distribution

        Returns:
            Delay in seconds
        """
        delay_ms = max(
            self.config.typing_min_delay,
            random.gauss(self.config.typing_speed_mean, self.config.typing_speed_std),
        )
        return delay_ms / 1000.0

    def type_text(self, text: str) -> float:
        """
        Type text with realistic delays, typos, and pauses

        Args:
            text: Text to type

        Returns:
            Total time taken (seconds)
        """
        total_time = 0.0
        words = text.split(" ")

        logger.debug(f"Starting to type: '{text}'")

        for word_idx, word in enumerate(words):
            for char_idx, char in enumerate(word):
                # Random typo
                if random.random() < self.config.typing_typo_probability:
                    typo_char = random.choice("abcdefghijklmnopqrstuvwxyz0123456789")
                    logger.debug(f"Typo: typed '{typo_char}' instead of '{char}'")

                    char_delay = self.generate_character_delay()
                    total_time += char_delay
                    time.sleep(char_delay)
                    self.metrics.typos_made += 1

                    # Backspace to correct
                    backspace_delay = random.uniform(0.1, 0.2)
                    total_time += backspace_delay
                    time.sleep(backspace_delay)

                    logger.debug(f"Backspace correction")

                # Type correct character
                char_delay = self.generate_character_delay()
                total_time += char_delay
                time.sleep(char_delay)

            # Pause between words
            if word_idx < len(words) - 1:
                if random.random() < self.config.typing_pause_probability:
                    pause_duration = random.uniform(*self.config.typing_pause_duration) / 1000.0
                    total_time += pause_duration
                    time.sleep(pause_duration)
                    logger.debug(f"Pause between words: {pause_duration:.3f}s")

        logger.info(f"Text typed in {total_time:.3f}s: '{text}'")
        self.metrics.actions_performed += 1

        return total_time

    # ==================== RESPONSE DELAYS ====================

    def calculate_response_delay(self, solution_length: int = 0) -> float:
        """
        Calculate realistic response delay before action

        Args:
            solution_length: Length of solution text (for additional delay)

        Returns:
            Delay time in seconds
        """
        base = random.gauss(self.config.response_base_delay, self.config.response_delay_std)
        char_delay = solution_length * self.config.response_char_delay
        extra = random.uniform(*self.config.response_extra_delay)

        total_delay = base + char_delay + extra
        total_delay = max(0.5, total_delay)  # Minimum 0.5s

        logger.debug(
            f"Response delay calculated: {total_delay:.3f}s "
            f"(base: {base:.3f}s, char: {char_delay:.3f}s, extra: {extra:.3f}s)"
        )

        return total_delay

    def wait_before_action(self, solution_length: int = 0) -> None:
        """
        Wait with realistic delay before performing an action

        Args:
            solution_length: Length of solution (affects delay)
        """
        delay = self.calculate_response_delay(solution_length)
        logger.info(f"Waiting {delay:.3f}s before action")
        time.sleep(delay)

    # ==================== BREAK SIMULATION ====================

    def should_take_micro_break(self) -> bool:
        """
        Determine if a micro break should be taken

        Returns:
            True if break should be taken
        """
        min_interval, max_interval = self.config.micro_break_interval
        break_interval = random.randint(min_interval, max_interval)

        should_break = (
            self.metrics.captchas_solved % break_interval
        ) == 0 and self.metrics.captchas_solved > 0
        return should_break

    def should_take_major_break(self) -> bool:
        """
        Determine if a major break should be taken based on runtime

        Returns:
            True if major break needed
        """
        if self.metrics.session_start_time is None:
            return False

        runtime = (datetime.now() - self.metrics.session_start_time).total_seconds()
        return runtime > self.config.major_break_threshold

    def take_micro_break(self) -> float:
        """
        Take a short micro break with idle behavior

        Returns:
            Duration of break (seconds)
        """
        duration = random.uniform(*self.config.micro_break_duration)

        logger.info(
            f"Taking micro break ({duration:.1f}s) after {self.metrics.captchas_solved} captchas"
        )

        # Perform idle behaviors
        idle_time = self._perform_idle_behavior()
        remaining_time = duration - idle_time

        if remaining_time > 0:
            time.sleep(remaining_time)

        self.metrics.micro_breaks_taken += 1
        logger.info(f"Micro break completed")

        return duration

    def take_major_break(self) -> float:
        """
        Take a major break (5-15 minutes)

        Returns:
            Duration of break (seconds)
        """
        duration = random.uniform(*self.config.major_break_duration)

        logger.warning(
            f"Taking major break ({duration / 60:.1f} minutes) - session runtime threshold reached"
        )

        # Just wait - no idle behavior for major breaks
        time.sleep(duration)

        self.metrics.major_breaks_taken += 1
        self.metrics.session_start_time = datetime.now()  # Reset session timer

        logger.warning(f"Major break completed, session timer reset")

        return duration

    def _perform_idle_behavior(self) -> float:
        """
        Perform idle behaviors during micro breaks

        Returns:
            Time spent in idle behavior (seconds)
        """
        idle_time = 0.0

        # Random mouse movements
        for _ in range(self.config.idle_mouse_movements):
            random_x = random.randint(100, 1000)
            random_y = random.randint(100, 600)

            logger.debug(f"Idle mouse movement to ({random_x}, {random_y})")
            move_time = self.move_mouse_to(random_x, random_y)
            idle_time += move_time

            time.sleep(random.uniform(0.2, 0.5))
            idle_time += random.uniform(0.2, 0.5)

        # Random scrolling
        if random.random() < self.config.idle_scroll_probability:
            scroll_duration = random.uniform(0.5, 1.5)
            logger.debug(f"Idle scrolling for {scroll_duration:.2f}s")
            time.sleep(scroll_duration)
            idle_time += scroll_duration

        return idle_time

    # ==================== METRICS & LOGGING ====================

    def record_captcha_solved(self) -> None:
        """Record completion of a captcha"""
        self.metrics.captchas_solved += 1
        self.metrics.last_action_time = datetime.now()
        logger.info(f"Captcha {self.metrics.captchas_solved} solved")

    def get_metrics(self) -> Dict:
        """
        Get current behavior metrics

        Returns:
            Dictionary of metrics
        """
        runtime = (
            (datetime.now() - self.metrics.session_start_time).total_seconds()
            if self.metrics.session_start_time
            else 0
        )

        metrics_dict = {
            "actions_performed": self.metrics.actions_performed,
            "captchas_solved": self.metrics.captchas_solved,
            "micro_breaks_taken": self.metrics.micro_breaks_taken,
            "major_breaks_taken": self.metrics.major_breaks_taken,
            "typos_made": self.metrics.typos_made,
            "overshoots": self.metrics.overshoots,
            "misses": self.metrics.misses,
            "runtime_seconds": runtime,
            "runtime_formatted": f"{int(runtime // 3600)}h {int((runtime % 3600) // 60)}m {int(runtime % 60)}s",
        }

        return metrics_dict

    def print_metrics(self) -> None:
        """Print formatted metrics report"""
        metrics = self.get_metrics()

        logger.info("=" * 60)
        logger.info("BEHAVIOR METRICS REPORT")
        logger.info("=" * 60)
        logger.info(f"Actions Performed:    {metrics['actions_performed']}")
        logger.info(f"Captchas Solved:      {metrics['captchas_solved']}")
        logger.info(f"Micro Breaks:         {metrics['micro_breaks_taken']}")
        logger.info(f"Major Breaks:         {metrics['major_breaks_taken']}")
        logger.info(f"Typos Made:           {metrics['typos_made']}")
        logger.info(f"Mouse Overshoots:     {metrics['overshoots']}")
        logger.info(f"Click Misses:         {metrics['misses']}")
        logger.info(f"Total Runtime:        {metrics['runtime_formatted']}")
        logger.info("=" * 60)


# ==================== CONVENIENCE FUNCTIONS ====================


def create_default_behavior() -> HumanBehavior:
    """Create HumanBehavior with default configuration"""
    return HumanBehavior()


def create_cautious_behavior() -> HumanBehavior:
    """Create HumanBehavior with cautious (slower) patterns"""
    config = BehaviorConfig(
        response_base_delay=3.5,
        response_delay_std=1.0,
        mouse_min_speed=80,
        mouse_max_speed=300,
        typing_speed_mean=150,
        typing_speed_std=50,
    )
    return HumanBehavior(config)


def create_confident_behavior() -> HumanBehavior:
    """Create HumanBehavior with confident (faster) patterns"""
    config = BehaviorConfig(
        response_base_delay=1.5,
        response_delay_std=0.5,
        mouse_min_speed=200,
        mouse_max_speed=600,
        typing_speed_mean=100,
        typing_speed_std=30,
    )
    return HumanBehavior(config)


if __name__ == "__main__":
    # Example usage
    print("=" * 60)
    print("HUMAN BEHAVIOR SIMULATION - EXAMPLE USAGE")
    print("=" * 60)

    behavior = create_default_behavior()

    # Simulate mouse movement
    print("\n1. Mouse Movement Test")
    behavior.move_mouse_to(x=500, y=300)

    # Simulate typing
    print("\n2. Typing Test")
    behavior.type_text("Hello World")

    # Simulate response delay
    print("\n3. Response Delay Test")
    behavior.wait_before_action(solution_length=10)

    # Simulate click
    print("\n4. Click Test")
    behavior.click_with_variation(x=600, y=400)

    # Simulate captcha completion
    print("\n5. Captcha Completion")
    behavior.record_captcha_solved()

    # Check if break needed
    if behavior.should_take_micro_break():
        print("\n6. Micro Break Test")
        behavior.take_micro_break()

    # Print metrics
    print("\n")
    behavior.print_metrics()

    print("\n" + "=" * 60)
