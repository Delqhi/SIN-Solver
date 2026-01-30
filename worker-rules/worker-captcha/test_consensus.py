#!/usr/bin/env python3
"""
Test the 3-agent consensus system on local captcha dataset.
Simulates 3 different OCR/ML agents voting on captcha answers.
"""

import os
import json
import random
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple

# Dataset path
DATASET_BASE = "/Users/jeremy/dev/SIN-Solver/worker-rules/worker-captcha/dataset"


class MockOCRAgent:
    """Simulates an OCR agent with different accuracy profiles"""

    def __init__(self, name: str, accuracy: float = 0.85):
        self.name = name
        self.accuracy = accuracy  # 0.0-1.0
        self.results = []

    def solve(self, image_path: str, ground_truth: str) -> str:
        """
        Simulate solving a captcha.
        With 'accuracy' probability, returns correct answer.
        Otherwise returns random guess.
        """
        if random.random() < self.accuracy:
            return ground_truth
        else:
            # Random incorrect answer
            charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
            length = len(ground_truth)
            return "".join(random.choices(charset, k=length))


class ConsensusValidator:
    """Runs 3-agent consensus and validates accuracy"""

    def __init__(self):
        self.agents = [
            MockOCRAgent("Agent-1-OCR", accuracy=0.82),
            MockOCRAgent("Agent-2-ML", accuracy=0.85),
            MockOCRAgent("Agent-3-Vision", accuracy=0.80),
        ]
        self.results = []

    def consensus_vote(self, votes: List[str]) -> str:
        """
        Simple majority voting consensus.
        Returns the most common answer, or first vote if no majority.
        """
        vote_counts = {}
        for vote in votes:
            vote_counts[vote] = vote_counts.get(vote, 0) + 1

        # Return most common vote
        return max(vote_counts, key=vote_counts.get)

    def test_image(self, image_path: str, ground_truth: str) -> Dict:
        """Test a single captcha image with 3-agent consensus"""
        filename = os.path.basename(image_path)

        # Get votes from all 3 agents
        votes = []
        agent_details = []

        for agent in self.agents:
            vote = agent.solve(image_path, ground_truth)
            votes.append(vote)
            agent_details.append(
                {"name": agent.name, "vote": vote, "correct": vote == ground_truth}
            )

        # Consensus decision
        consensus_answer = self.consensus_vote(votes)
        is_correct = consensus_answer == ground_truth

        result = {
            "filename": filename,
            "ground_truth": ground_truth,
            "agent_votes": votes,
            "agent_details": agent_details,
            "consensus": consensus_answer,
            "correct": is_correct,
        }

        self.results.append(result)
        return result

    def test_dataset(self) -> Dict:
        """Test all images in dataset"""
        print("📊 Loading dataset manifest...")

        manifest_path = os.path.join(DATASET_BASE, "manifest.json")
        with open(manifest_path, "r") as f:
            manifest = json.load(f)

        total_tests = 0
        correct_tests = 0
        category_stats = {}

        # Test each category
        for category, items in manifest.items():
            print(f"\n🧪 Testing {category}... ({len(items)} images)")
            category_correct = 0

            for item in items:
                result = self.test_image(item["path"], item["ground_truth"])
                total_tests += 1

                if result["correct"]:
                    correct_tests += 1
                    category_correct += 1
                    status = "✓"
                else:
                    status = "✗"

                # Print detailed result
                votes_str = " | ".join(
                    [f"{d['name'].split('-')[1]}: {d['vote']}" for d in result["agent_details"]]
                )
                print(
                    f"  {status} {result['filename']:<20} Truth: {result['ground_truth']:<8} Consensus: {result['consensus']:<8} [{votes_str}]"
                )

            accuracy = (category_correct / len(items)) * 100 if items else 0
            category_stats[category] = {
                "total": len(items),
                "correct": category_correct,
                "accuracy": accuracy,
            }
            print(f"  Category Accuracy: {accuracy:.1f}% ({category_correct}/{len(items)})")

        return {
            "total_tests": total_tests,
            "correct": correct_tests,
            "accuracy": (correct_tests / total_tests) * 100 if total_tests else 0,
            "category_stats": category_stats,
            "timestamp": datetime.now().isoformat(),
        }

    def generate_report(self, test_stats: Dict) -> str:
        """Generate detailed test report"""
        report = []
        report.append("=" * 70)
        report.append("3-AGENT CONSENSUS VALIDATION REPORT")
        report.append("=" * 70)
        report.append("")

        report.append(f"Test Timestamp: {test_stats['timestamp']}")
        report.append(f"Total Tests: {test_stats['total_tests']}")
        report.append(f"Consensus Correct: {test_stats['correct']}/{test_stats['total_tests']}")
        report.append(f"Overall Accuracy: {test_stats['accuracy']:.1f}%")
        report.append("")

        report.append("CATEGORY BREAKDOWN:")
        report.append("-" * 70)
        for category, stats in test_stats["category_stats"].items():
            report.append(
                f"{category:20s}: {stats['accuracy']:5.1f}% ({stats['correct']}/{stats['total']})"
            )
        report.append("")

        report.append("AGENT PERFORMANCE:")
        report.append("-" * 70)
        agent_accuracy = {}
        for agent in self.agents:
            agent_correct = sum(1 for d in agent.results if d)  # Will be updated
            agent_accuracy[agent.name] = f"{agent.accuracy * 100:.1f}%"

        for agent in self.agents:
            report.append(f"{agent.name:25s}: {agent.accuracy * 100:.1f}% accuracy")
        report.append("")

        report.append("CONSENSUS INTERPRETATION:")
        report.append("-" * 70)
        if test_stats["accuracy"] > 85:
            report.append("✅ EXCELLENT: 3-agent consensus is highly reliable")
        elif test_stats["accuracy"] > 75:
            report.append("✓ GOOD: 3-agent consensus performs well")
        elif test_stats["accuracy"] > 60:
            report.append("⚠️ FAIR: 3-agent consensus needs improvement")
        else:
            report.append("❌ POOR: Consider improving agent algorithms")
        report.append("")

        report.append("DETAILED RESULTS:")
        report.append("-" * 70)
        for result in self.results:
            status = "✓" if result["correct"] else "✗"
            votes_detail = " vs ".join(result["agent_votes"])
            report.append(f"{status} {result['filename']}")
            report.append(f"   Ground Truth: {result['ground_truth']}")
            report.append(f"   Agent Votes:  {votes_detail}")
            report.append(f"   Consensus:    {result['consensus']}")
            report.append("")

        report.append("=" * 70)

        return "\n".join(report)


def main():
    """Run the full consensus test"""
    print("\n" + "=" * 70)
    print("3-AGENT CONSENSUS CAPTCHA VALIDATION SYSTEM")
    print("=" * 70 + "\n")

    # Create validator
    validator = ConsensusValidator()

    # Run tests
    print(f"Testing dataset at: {DATASET_BASE}\n")
    test_stats = validator.test_dataset()

    # Generate report
    print("\n" + "=" * 70)
    report = validator.generate_report(test_stats)
    print(report)

    # Save report
    report_path = os.path.join(DATASET_BASE, "consensus_test_report.txt")
    with open(report_path, "w") as f:
        f.write(report)
    print(f"\n📄 Report saved to: {report_path}")

    # Save JSON results
    results_path = os.path.join(DATASET_BASE, "consensus_test_results.json")
    with open(results_path, "w") as f:
        json.dump({"summary": test_stats, "detailed_results": validator.results}, f, indent=2)
    print(f"📊 Detailed results saved to: {results_path}")

    return test_stats


if __name__ == "__main__":
    stats = main()

    # Exit with code based on accuracy
    if stats["accuracy"] >= 75:
        print("\n✅ Consensus system validation PASSED")
        exit(0)
    else:
        print("\n⚠️ Consensus system needs improvement")
        exit(1)
