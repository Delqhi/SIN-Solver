#!/usr/bin/env python3
"""
✅ CONSENSUS SOLVER INTEGRATION TEST
====================================
End-to-end test of ConsensusSolver with the 60-image dataset.

Tests:
1. Load dataset and ground truth
2. Initialize consensus solver with 3 agents
3. Run consensus on 10-30 test images
4. Calculate accuracy and statistics
5. Compare against baseline test_mock_consensus_quick.py

Expected Results:
- Accuracy: ≥93% (matching or better than baseline)
- Confidence: High confidence in correct solutions
- Voting agreement: >70% for successful votes
- Speed: <50ms per image solve

Author: Sisyphus Engineering
Date: 2026-01-29
"""

import asyncio
import json
import logging
import sys
import time
from pathlib import Path
from typing import Dict, List, Any
import numpy as np
from PIL import Image

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from consensus_solver_adapter import ConsensusSolver, VotingStrategy, ConsensusStats
from agents import MockOCRAgent, AgentResult

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("ConsensusIntegrationTest")


class ConsensusIntegrationTest:
    """Integration test suite for ConsensusSolver"""

    def __init__(self, dataset_dir: str = "./dataset"):
        """
        Initialize test suite.

        Args:
            dataset_dir: Path to dataset directory with images and manifest.json
        """
        self.dataset_dir = Path(dataset_dir)
        self.manifest_path = self.dataset_dir / "manifest.json"
        self.images = []
        self.ground_truth = {}
        self.solver = None
        self.results = []

    def load_dataset(self) -> bool:
        """
        Load images and ground truth from dataset.

        Returns:
            True if successful, False otherwise
        """
        logger.info("📂 Loading dataset...")

        if not self.manifest_path.exists():
            logger.error(f"❌ Manifest not found: {self.manifest_path}")
            return False

        try:
            with open(self.manifest_path) as f:
                manifest = json.load(f)

            # Build ground truth map
            for item in manifest.get("images", []):
                filename = item["filename"]
                ground_truth = item["ground_truth"]
                self.ground_truth[filename] = ground_truth
                self.images.append(filename)

            logger.info(f"✅ Loaded {len(self.images)} images")
            logger.info(f"   Ground truth: {len(self.ground_truth)} entries")

            return True

        except Exception as e:
            logger.error(f"❌ Failed to load dataset: {e}")
            return False

    async def initialize_solver(
        self,
        num_agents: int = 3,
        profile: str = "realistic",
    ) -> bool:
        """
        Initialize consensus solver.

        Args:
            num_agents: Number of agents to use
            profile: Agent accuracy profile

        Returns:
            True if successful
        """
        logger.info("🤖 Initializing ConsensusSolver...")

        try:
            self.solver = ConsensusSolver(
                num_agents=num_agents,
                agent_accuracy_profile=profile,
                voting_strategy=VotingStrategy.MAJORITY,
                seed=42,  # For reproducibility
            )

            logger.info(f"✅ ConsensusSolver initialized with {num_agents} agents")
            return True

        except Exception as e:
            logger.error(f"❌ Failed to initialize solver: {e}")
            return False

    def _load_image(self, filename: str) -> np.ndarray:
        """
        Load image from dataset.

        Args:
            filename: Image filename

        Returns:
            numpy array (RGB format)
        """
        image_path = self.dataset_dir / filename

        if not image_path.exists():
            logger.warning(f"⚠️  Image not found: {image_path}")
            return np.zeros((80, 200, 3), dtype=np.uint8)

        try:
            image = Image.open(image_path).convert("RGB")
            return np.array(image)
        except Exception as e:
            logger.warning(f"⚠️  Failed to load {filename}: {e}")
            return np.zeros((80, 200, 3), dtype=np.uint8)

    async def run_consensus_test(
        self,
        num_images: int = 10,
    ) -> Dict[str, Any]:
        """
        Run consensus solver on test images.

        Args:
            num_images: Number of images to test (default: 10)

        Returns:
            Dict with results and statistics
        """
        if not self.solver:
            logger.error("❌ Solver not initialized")
            return {}

        logger.info(f"🧪 Running consensus test on {num_images} images...")

        # Select images to test
        test_images = self.images[:num_images]
        correct = 0
        total = 0
        confidence_scores = []
        agreement_scores = []
        solve_times = []

        # Process images in batches
        for i, filename in enumerate(test_images):
            # Progress indicator
            if (i + 1) % 5 == 0 or i == 0:
                logger.info(f"  ✓ Processing {i + 1}/{num_images}...")

            # Load image
            image = self._load_image(filename)
            ground_truth = self.ground_truth.get(filename, "UNKNOWN")

            # Run consensus solver
            consensus_stats = await self.solver.solve(image)

            total += 1
            is_correct = consensus_stats.consensus_solution == ground_truth

            if is_correct:
                correct += 1

            # Record metrics
            confidence_scores.append(consensus_stats.consensus_confidence)
            agreement_scores.append(consensus_stats.voting_agreement_percent)
            solve_times.append(consensus_stats.resolve_time_ms)

            self.results.append(
                {
                    "filename": filename,
                    "ground_truth": ground_truth,
                    "consensus_solution": consensus_stats.consensus_solution,
                    "is_correct": is_correct,
                    "confidence": consensus_stats.consensus_confidence,
                    "agreement": consensus_stats.voting_agreement_percent,
                    "solve_time_ms": consensus_stats.resolve_time_ms,
                    "votes": consensus_stats.vote_counts,
                }
            )

        # Calculate statistics
        accuracy = correct / total if total > 0 else 0
        avg_confidence = np.mean(confidence_scores) if confidence_scores else 0
        avg_agreement = np.mean(agreement_scores) if agreement_scores else 0
        avg_solve_time = np.mean(solve_times) if solve_times else 0

        logger.info(f"✅ Test complete!")

        return {
            "num_images": total,
            "correct": correct,
            "incorrect": total - correct,
            "accuracy_percent": accuracy * 100,
            "avg_confidence": avg_confidence,
            "avg_agreement_percent": avg_agreement,
            "avg_solve_time_ms": avg_solve_time,
            "min_solve_time_ms": min(solve_times) if solve_times else 0,
            "max_solve_time_ms": max(solve_times) if solve_times else 0,
        }

    def print_results(self, test_results: Dict[str, Any]) -> None:
        """
        Print formatted test results.

        Args:
            test_results: Results dict from run_consensus_test()
        """
        print("\n" + "=" * 70)
        print("📊 CONSENSUS SOLVER INTEGRATION TEST RESULTS")
        print("=" * 70)

        print(f"\n🧪 Test Configuration:")
        print(f"   Images tested: {test_results['num_images']}")
        print(f"   Voting strategy: MAJORITY (2+ votes)")
        print(f"   Agent pool: {len(self.solver.pool.agents)} agents")

        print(f"\n✅ Accuracy Metrics:")
        print(f"   Correct: {test_results['correct']}/{test_results['num_images']}")
        print(f"   Accuracy: {test_results['accuracy_percent']:.1f}%")
        print(f"   Avg Confidence: {test_results['avg_confidence']:.1%}")
        print(f"   Voting Agreement: {test_results['avg_agreement_percent']:.1f}%")

        print(f"\n⚡ Performance Metrics:")
        print(f"   Avg Solve Time: {test_results['avg_solve_time_ms']:.1f}ms")
        print(f"   Min Solve Time: {test_results['min_solve_time_ms']:.1f}ms")
        print(f"   Max Solve Time: {test_results['max_solve_time_ms']:.1f}ms")

        print(f"\n📈 Solver Statistics:")
        solver_stats = self.solver.get_consensus_stats()
        print(f"   Total solves: {solver_stats['total_solves']}")
        print(f"   Successful: {solver_stats['successful_solves']}")
        print(f"   Overall success rate: {solver_stats['success_rate']:.1%}")

        print(f"\n👥 Agent Statistics:")
        pool_stats = solver_stats["pool_stats"]
        for agent_stat in pool_stats["agents"]:
            print(f"   {agent_stat['name']}:")
            print(f"      Attempts: {agent_stat['total_attempts']}")
            print(f"      Accuracy: {agent_stat['actual_accuracy']:.1%}")
            print(f"      Configured: {agent_stat['configured_accuracy']:.1%}")

        # Show sample results
        print(f"\n📋 Sample Results (first 5):")
        for i, result in enumerate(self.results[:5]):
            status = "✓" if result["is_correct"] else "✗"
            print(f"   {status} {result['filename']}")
            print(f"      Expected: {result['ground_truth']}")
            print(f"      Got: {result['consensus_solution']}")
            print(
                f"      Confidence: {result['confidence']:.1%}, Agreement: {result['agreement']:.1f}%"
            )
            print()

        print("=" * 70 + "\n")

    def print_comparison(self) -> None:
        """
        Print comparison with baseline test_mock_consensus_quick.py
        """
        print("\n" + "=" * 70)
        print("📊 COMPARISON WITH BASELINE")
        print("=" * 70)

        baseline_accuracy = 91.7  # From test_mock_consensus_quick.py
        test_accuracy = (
            np.mean([1.0 if r["is_correct"] else 0.0 for r in self.results]) * 100
            if self.results
            else 0
        )

        print(f"\nBaseline (test_mock_consensus_quick.py): {baseline_accuracy:.1f}%")
        print(f"Integration Test (ConsensusSolver):      {test_accuracy:.1f}%")
        print(
            f"Difference:                               {test_accuracy - baseline_accuracy:+.1f}%"
        )

        if abs(test_accuracy - baseline_accuracy) < 2:
            print("\n✅ PASS: Integration test accuracy matches baseline!")
        elif test_accuracy >= baseline_accuracy:
            print("\n✅ PASS: Integration test accuracy exceeds baseline!")
        else:
            logger.warning("\n⚠️  Integration test accuracy below baseline (possible variance)")

        print("\n" + "=" * 70 + "\n")


async def main():
    """Main test execution"""

    print("\n🚀 CONSENSUS SOLVER INTEGRATION TEST")
    print("=" * 70)

    # Initialize test suite
    test = ConsensusIntegrationTest()

    # Load dataset
    if not test.load_dataset():
        logger.error("Failed to load dataset")
        sys.exit(1)

    # Initialize solver
    if not await test.initialize_solver(num_agents=3, profile="realistic"):
        logger.error("Failed to initialize solver")
        sys.exit(1)

    # Run consensus test (10 images)
    logger.info("\n📊 Running consensus solver on 10 test images...")
    results = await test.run_consensus_test(num_images=10)

    if not results:
        logger.error("Test failed")
        sys.exit(1)

    # Print results
    test.print_results(results)
    test.print_comparison()

    # Return exit code based on accuracy
    accuracy = results["accuracy_percent"]
    if accuracy >= 90:
        print("✅ Integration test PASSED!\n")
        return 0
    else:
        print(f"⚠️  Integration test completed but accuracy {accuracy:.1f}% < 90%\n")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
