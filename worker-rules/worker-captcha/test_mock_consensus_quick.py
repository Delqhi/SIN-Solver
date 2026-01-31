#!/usr/bin/env python3
"""Fast mock consensus validation (no OCR)"""

import json
import random
from pathlib import Path
from typing import Dict, List

DATASET_DIR = Path("/Users/jeremy/dev/SIN-Solver/worker-rules/worker-captcha/dataset")

class MockOCRAgent:
    """Simulated OCR agent"""
    def __init__(self, name: str, accuracy: float = 0.85):
        self.name = name
        self.accuracy = accuracy
        self.correct_count = 0
        self.total_count = 0
    
    def solve(self, image_path: str, ground_truth: str) -> str:
        """Simulate solving with specified accuracy"""
        self.total_count += 1
        if random.random() < self.accuracy:
            self.correct_count += 1
            return ground_truth
        else:
            charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
            return "".join(random.choices(charset, k=len(ground_truth)))
    
    def get_accuracy(self) -> float:
        return (self.correct_count / self.total_count * 100) if self.total_count > 0 else 0

def validate_consensus(answers: List[str]) -> str:
    """Get consensus answer from 3 votes (majority voting)"""
    if len(answers) < 3:
        return None
    counts = {}
    for ans in answers[:3]:
        counts[ans] = counts.get(ans, 0) + 1
    
    for ans, count in counts.items():
        if count >= 2:  # 2+ agents agree
            return ans
    return answers[0]  # Fallback

def test_consensus():
    """Test 3-agent consensus on all images"""
    with open(DATASET_DIR / "manifest.json", "r") as f:
        manifest = json.load(f)
    
    # Create 3 mock agents with different accuracy
    agents = [
        MockOCRAgent("Agent-A", accuracy=0.82),
        MockOCRAgent("Agent-B", accuracy=0.85),
        MockOCRAgent("Agent-C", accuracy=0.80)
    ]
    
    consensus_correct = 0
    results = []
    
    print("🎯 3-Agent Consensus Test")
    print("=" * 70)
    print(f"Testing {len(manifest['images'])} images with 3-agent voting\n")
    
    for i, img_data in enumerate(manifest["images"]):
        filepath = DATASET_DIR / img_data["filename"]
        ground_truth = img_data["ground_truth"]
        
        # Get answers from all 3 agents
        answers = [agent.solve(str(filepath), ground_truth) for agent in agents]
        
        # Get consensus
        consensus = validate_consensus(answers)
        is_correct = consensus == ground_truth
        
        if is_correct:
            consensus_correct += 1
        
        results.append({
            "image": img_data["filename"],
            "ground_truth": ground_truth,
            "agent_answers": answers,
            "consensus": consensus,
            "correct": is_correct
        })
        
        if (i + 1) % 10 == 0:
            print(f"  ✓ Processed {i+1} images...")
    
    # Calculate statistics
    consensus_accuracy = (consensus_correct / len(manifest['images']) * 100)
    
    print("\n" + "=" * 70)
    print("📊 RESULTS")
    print("=" * 70)
    
    for agent in agents:
        print(f"{agent.name}: {agent.get_accuracy():.1f}% ({agent.correct_count}/{agent.total_count})")
    
    print(f"\n🤝 3-AGENT CONSENSUS: {consensus_accuracy:.1f}% ({consensus_correct}/{len(manifest['images'])})")
    print("=" * 70)
    
    # Show breakdown by category
    print("\nBreakdown by category:")
    categories = {}
    for result in results:
        cat = result["image"].split("/")[0]
        if cat not in categories:
            categories[cat] = {"total": 0, "correct": 0}
        categories[cat]["total"] += 1
        if result["correct"]:
            categories[cat]["correct"] += 1
    
    for cat, stats in sorted(categories.items()):
        acc = (stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0
        print(f"  {cat}: {acc:.1f}% ({stats['correct']}/{stats['total']})")
    
    print("\n✅ Test complete!")

if __name__ == "__main__":
    test_consensus()
