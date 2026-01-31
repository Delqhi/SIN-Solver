#!/usr/bin/env python3
"""
🤖 CONSENSUS AGENTS - Multi-Agent CAPTCHA Solving Framework
==============================================================
Abstract agent interface and concrete implementations for CAPTCHA consensus solving.

This module defines:
1. CaptchaAgent (ABC) - Abstract interface for all agents
2. MockOCRAgent - Simulated OCR with configurable accuracy
3. RealOCRAgent - Placeholder for real OCR implementations (Phase 3A)
4. CustomModelAgent - Placeholder for trained model agents (Phase 4)

The consensus solver uses these agents in a voting pool to achieve
higher accuracy than any single agent alone.

Author: Sisyphus Engineering
Date: 2026-01-29
"""

import asyncio
import random
import logging
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
import numpy as np
from pathlib import Path
import json

logger = logging.getLogger(__name__)


@dataclass
class AgentResult:
    """Result from a single agent solving attempt"""

    success: bool
    solution: str
    confidence: float
    agent_name: str
    solve_time_ms: int = 0
    error: Optional[str] = None
    metadata: Dict[str, Any] = None


class CaptchaAgent(ABC):
    """
    Abstract base class for CAPTCHA-solving agents.

    All agents must:
    1. Implement async solve() method
    2. Return solution string or raise exception
    3. Track solve time and confidence
    4. Support per-agent configuration
    """

    def __init__(self, name: str, accuracy: Optional[float] = None):
        """
        Initialize agent.

        Args:
            name: Unique agent identifier
            accuracy: Optional accuracy override (for mocking)
        """
        self.name = name
        self.accuracy = accuracy
        self.solve_count = 0
        self.success_count = 0

    @abstractmethod
    async def solve(self, image: np.ndarray) -> AgentResult:
        """
        Solve CAPTCHA from image.

        Args:
            image: numpy array (RGB/BGR format)

        Returns:
            AgentResult with solution or error
        """
        pass

    def get_stats(self) -> Dict[str, Any]:
        """Get agent performance statistics"""
        actual_accuracy = self.success_count / self.solve_count if self.solve_count > 0 else 0
        return {
            "name": self.name,
            "total_attempts": self.solve_count,
            "successful": self.success_count,
            "actual_accuracy": actual_accuracy,
            "configured_accuracy": self.accuracy,
        }


class MockOCRAgent(CaptchaAgent):
    """
    Simulated OCR agent for testing and development.

    Features:
    - Configurable accuracy (default: 84%)
    - Reproducible with seed
    - Simulates realistic OCR errors
    - Fast execution (no actual ML)

    Usage:
        agent = MockOCRAgent("agent-a", accuracy=0.84, seed=42)
        result = await agent.solve(image)
    """

    def __init__(
        self,
        name: str = "MockOCR",
        accuracy: float = 0.84,
        seed: Optional[int] = None,
    ):
        """
        Initialize mock OCR agent.

        Args:
            name: Agent identifier
            accuracy: Success rate (0.0-1.0)
            seed: Random seed for reproducibility
        """
        super().__init__(name, accuracy)
        self.accuracy = max(0.0, min(1.0, accuracy))  # Clamp to [0, 1]
        self.seed = seed
        if seed is not None:
            random.seed(seed)

    async def solve(self, image: np.ndarray) -> AgentResult:
        """
        Simulate OCR solving with configurable accuracy.

        Algorithm:
        1. Extract ground truth from image filename (embedded in dataset generation)
        2. Decide success/failure based on accuracy probability
        3. If fail: return corrupted solution (realistic OCR errors)
        4. Return AgentResult with solution and confidence

        Args:
            image: numpy array (should have filename context in practice)

        Returns:
            AgentResult with simulated OCR result
        """
        import time

        start_time = time.time()

        self.solve_count += 1

        try:
            # Extract ground truth from image if available
            # In practice, this would come from filename or metadata
            ground_truth = self._extract_ground_truth(image)

            # Simulate OCR success/failure
            if random.random() < self.accuracy:
                # Success: return correct solution
                self.success_count += 1
                confidence = 0.85 + random.uniform(-0.15, 0.15)  # 70-100%
                solution = ground_truth
            else:
                # Failure: simulate OCR error (character substitution)
                confidence = 0.45 + random.uniform(-0.20, 0.20)  # 25-65%
                solution = self._corrupt_solution(ground_truth)

            solve_time_ms = int((time.time() - start_time) * 1000)

            return AgentResult(
                success=True,
                solution=solution,
                confidence=min(1.0, max(0.0, confidence)),
                agent_name=self.name,
                solve_time_ms=solve_time_ms,
            )

        except Exception as e:
            solve_time_ms = int((time.time() - start_time) * 1000)
            return AgentResult(
                success=False,
                solution="",
                confidence=0.0,
                agent_name=self.name,
                solve_time_ms=solve_time_ms,
                error=str(e),
            )

    def _extract_ground_truth(self, image: np.ndarray) -> str:
        """
        Extract ground truth from image.

        In the actual dataset, we extract this from the filename.
        For now, this is a placeholder that returns a dummy value.

        Args:
            image: numpy array

        Returns:
            Ground truth string
        """
        # TODO: In Phase 3B, extract from dataset metadata
        # For now, return a reasonable dummy value
        return "ABC123"

    def _corrupt_solution(self, solution: str) -> str:
        """
        Simulate realistic OCR errors by substituting characters.

        Common confusions:
        - 0 ↔ O
        - 1 ↔ I ↔ l
        - 5 ↔ S
        - 8 ↔ B
        - etc.

        Args:
            solution: Correct solution

        Returns:
            Corrupted solution (1-2 character changes)
        """
        if not solution or len(solution) == 0:
            return solution

        # Character confusion map (typical OCR errors)
        confusions = {
            "0": ["O", "Q"],
            "1": ["I", "l", "|"],
            "5": ["S"],
            "8": ["B"],
            "O": ["0", "Q"],
            "I": ["1", "l"],
            "S": ["5"],
            "B": ["8"],
        }

        result = list(solution)
        num_errors = random.randint(1, min(2, len(solution)))

        for _ in range(num_errors):
            pos = random.randint(0, len(result) - 1)
            char = result[pos]

            if char in confusions:
                result[pos] = random.choice(confusions[char])

        return "".join(result)


class RealOCRAgent(CaptchaAgent):
    """
    Real OCR agent using EasyOCR or similar.

    Placeholder for Phase 3A implementation.

    TODO (Phase 3A):
    - Install EasyOCR: pip install easyocr
    - Load model in __init__
    - Implement actual OCR in solve()
    - Handle image preprocessing
    - Return confidence from OCR model
    """

    def __init__(
        self,
        name: str = "RealOCR",
        model: str = "easyocr",  # or "paddleocr", "tesseract"
    ):
        """
        Initialize real OCR agent.

        Args:
            name: Agent identifier
            model: OCR model to use
        """
        super().__init__(name)
        self.model_type = model
        self.model = None
        # TODO: Load model here in Phase 3A

    async def solve(self, image: np.ndarray) -> AgentResult:
        """
        Real OCR solving (Phase 3A implementation).

        TODO:
        1. Preprocess image (resize, denoise, enhance contrast)
        2. Run OCR model
        3. Extract text and confidence
        4. Return AgentResult
        """
        return AgentResult(
            success=False,
            solution="",
            confidence=0.0,
            agent_name=self.name,
            error="RealOCRAgent not implemented yet (Phase 3A)",
        )


class CustomModelAgent(CaptchaAgent):
    """
    Custom trained model agent (e.g., CNN, YOLO).

    Placeholder for Phase 4 implementation.

    TODO (Phase 4):
    - Train custom CNN/YOLO model on 1000+ images
    - Save model weights
    - Load in __init__
    - Implement inference in solve()
    - Support quantization/optimization
    """

    def __init__(
        self,
        name: str = "CustomModel",
        model_path: Optional[str] = None,
    ):
        """
        Initialize custom model agent.

        Args:
            name: Agent identifier
            model_path: Path to trained model weights
        """
        super().__init__(name)
        self.model_path = model_path
        self.model = None
        # TODO: Load trained model in Phase 4

    async def solve(self, image: np.ndarray) -> AgentResult:
        """
        Custom model inference (Phase 4 implementation).

        TODO:
        1. Preprocess image for model
        2. Run inference
        3. Extract predictions and confidence
        4. Return AgentResult
        """
        return AgentResult(
            success=False,
            solution="",
            confidence=0.0,
            agent_name=self.name,
            error="CustomModelAgent not implemented yet (Phase 4)",
        )


class AgentPool:
    """
    Pool of consensus agents for distributed CAPTCHA solving.

    Features:
    - Initialize multiple agents with different configurations
    - Track per-agent statistics
    - Support dynamic agent addition/removal
    - Balance load across agents

    Usage:
        pool = AgentPool()
        pool.add_agent(MockOCRAgent("agent-a", accuracy=0.80))
        pool.add_agent(MockOCRAgent("agent-b", accuracy=0.87))
        results = await pool.solve_all(image)
    """

    def __init__(self):
        """Initialize empty agent pool"""
        self.agents: List[CaptchaAgent] = []

    def add_agent(self, agent: CaptchaAgent) -> None:
        """
        Add agent to pool.

        Args:
            agent: CaptchaAgent instance
        """
        if any(a.name == agent.name for a in self.agents):
            logger.warning(f"Agent {agent.name} already in pool, replacing")
            self.agents = [a for a in self.agents if a.name != agent.name]

        self.agents.append(agent)
        logger.info(f"Added agent {agent.name} (total: {len(self.agents)})")

    def remove_agent(self, agent_name: str) -> bool:
        """
        Remove agent from pool.

        Args:
            agent_name: Name of agent to remove

        Returns:
            True if removed, False if not found
        """
        original_count = len(self.agents)
        self.agents = [a for a in self.agents if a.name != agent_name]
        return len(self.agents) < original_count

    async def solve_all(self, image: np.ndarray) -> List[AgentResult]:
        """
        Run all agents in parallel on same image.

        Args:
            image: numpy array (image to solve)

        Returns:
            List of AgentResult from all agents
        """
        tasks = [agent.solve(image) for agent in self.agents]
        results = await asyncio.gather(*tasks, return_exceptions=False)
        return results

    def get_stats(self) -> Dict[str, Any]:
        """
        Get statistics for all agents in pool.

        Returns:
            Dict with per-agent and pool statistics
        """
        agent_stats = [agent.get_stats() for agent in self.agents]

        pool_accuracy = np.mean([s["actual_accuracy"] for s in agent_stats])

        return {
            "pool_size": len(self.agents),
            "agents": agent_stats,
            "average_accuracy": pool_accuracy,
        }
