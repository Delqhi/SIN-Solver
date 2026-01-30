#!/usr/bin/env python3
"""
CAPTCHA Solver Performance Benchmark
=====================================

Comprehensive benchmarking suite for the YOLO-based CAPTCHA classifier.
Tests all 528 training images across 12 CAPTCHA types.

Metrics Collected:
- Accuracy per CAPTCHA type
- Overall accuracy
- Inference time (P50, P95, P99)
- Per-image predictions
- Confusion matrix
- Performance visualizations

Author: AI Benchmark Automation
Date: 2026-01-29
"""

import os
import sys
import json
import time
from pathlib import Path
from datetime import datetime
from collections import defaultdict
import statistics
from typing import Dict, List, Tuple, Any

import numpy as np
from PIL import Image
from ultralytics import YOLO
import torch

# Configuration
TRAINING_DIR = Path("/Users/jeremy/dev/SIN-Solver/training")
MODEL_PATH = TRAINING_DIR / "runs/classify/runs/classify/captcha_classifier/weights/best.pt"
OUTPUT_DIR = TRAINING_DIR / "benchmark_results"

# CAPTCHA Types (matching data.yaml order)
CAPTCHA_TYPES = [
    "Audio_Captcha",
    "Cloudflare_Turnstile",
    "FunCaptcha",
    "GeeTest",
    "Image_Click_Captcha",
    "Math_Captcha",
    "Puzzle_Captcha",
    "Slide_Captcha",
    "Text_Captcha",
    "hCaptcha",
    "reCaptcha_v2",
    "reCaptcha_v3",
]

# Type name mapping for display
TYPE_DISPLAY_NAMES = {
    "Audio_Captcha": "Audio",
    "Cloudflare_Turnstile": "Cloudflare Turnstile",
    "FunCaptcha": "FunCaptcha",
    "GeeTest": "GeeTest",
    "Image_Click_Captcha": "Image Click",
    "Math_Captcha": "Math",
    "Puzzle_Captcha": "Puzzle",
    "Slide_Captcha": "Slider",
    "Text_Captcha": "Text",
    "hCaptcha": "hCaptcha",
    "reCaptcha_v2": "reCAPTCHA v2",
    "reCaptcha_v3": "reCAPTCHA v3",
}


class CaptchaBenchmark:
    """Comprehensive CAPTCHA solver benchmark"""

    def __init__(self, training_dir: Path, model_path: Path):
        self.training_dir = training_dir
        self.model_path = model_path
        self.output_dir = OUTPUT_DIR
        self.output_dir.mkdir(exist_ok=True)

        self.model = None
        self.device = None

        # Results storage
        self.results = {
            "benchmark_info": {
                "timestamp": datetime.now().isoformat(),
                "model_path": str(model_path),
                "total_images": 0,
                "captcha_types": len(CAPTCHA_TYPES),
            },
            "overall_metrics": {},
            "per_type_metrics": {},
            "inference_times": [],
            "predictions": [],
            "confusion_matrix": {},
            "errors": [],
        }

        print(f"\n{'=' * 80}")
        print(f"🎯 CAPTCHA SOLVER PERFORMANCE BENCHMARK")
        print(f"{'=' * 80}")
        print(f"📍 Training Directory: {self.training_dir}")
        print(f"🤖 Model Path: {self.model_path}")
        print(f"💾 Output Directory: {self.output_dir}")
        print(f"{'=' * 80}\n")

    def load_model(self) -> bool:
        """Load the trained YOLO model"""
        print("📦 Loading YOLO model...")

        if not self.model_path.exists():
            print(f"❌ ERROR: Model not found at {self.model_path}")
            return False

        try:
            self.model = YOLO(str(self.model_path))
            self.device = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"

            model_size_mb = self.model_path.stat().st_size / (1024 * 1024)

            print(f"✅ Model loaded successfully")
            print(f"   • Model size: {model_size_mb:.2f} MB")
            print(f"   • Device: {self.device}")
            print(f"   • Classes: {len(CAPTCHA_TYPES)}")

            return True

        except Exception as e:
            print(f"❌ ERROR loading model: {str(e)}")
            return False

    def discover_images(self) -> Dict[str, List[Path]]:
        """Discover all training images organized by type"""
        print("\n🔍 Discovering images...")

        images_by_type = {}
        total_images = 0

        for captcha_type in CAPTCHA_TYPES:
            captcha_dir = self.training_dir / captcha_type

            if not captcha_dir.exists():
                print(f"⚠️  WARNING: {captcha_type} directory not found")
                images_by_type[captcha_type] = []
                continue

            # Find all PNG images
            images = sorted(captcha_dir.glob("*.png"))
            images_by_type[captcha_type] = images
            total_images += len(images)

            print(f"   • {captcha_type:20s}: {len(images):3d} images")

        print(f"\n📊 Total images discovered: {total_images}")
        self.results["benchmark_info"]["total_images"] = total_images

        return images_by_type

    def calculate_percentile(self, values: List[float], percentile: float) -> float:
        """Calculate percentile value"""
        if not values:
            return 0.0
        return np.percentile(values, percentile)

    def run_benchmark(self, images_by_type: Dict[str, List[Path]]) -> bool:
        """Run comprehensive benchmark on all images"""
        print(f"\n{'=' * 80}")
        print(f"🚀 STARTING BENCHMARK")
        print(f"{'=' * 80}\n")

        # Initialize per-type metrics
        for captcha_type in CAPTCHA_TYPES:
            self.results["per_type_metrics"][captcha_type] = {
                "total": 0,
                "correct": 0,
                "incorrect": 0,
                "accuracy": 0.0,
                "inference_times": [],
                "predictions": [],
            }

        # Initialize confusion matrix
        self.results["confusion_matrix"] = {
            "true_labels": [],
            "predicted_labels": [],
            "labels": CAPTCHA_TYPES,
        }

        total_correct = 0
        total_images = 0
        all_inference_times = []

        # Process each CAPTCHA type
        for captcha_type in CAPTCHA_TYPES:
            images = images_by_type.get(captcha_type, [])

            if not images:
                print(f"⚠️  Skipping {captcha_type} - no images found")
                continue

            print(f"\n📸 Testing {captcha_type} ({len(images)} images)...")

            type_correct = 0
            type_times = []

            for idx, image_path in enumerate(images, 1):
                try:
                    # Load image
                    img = Image.open(image_path)

                    # Measure inference time
                    start_time = time.perf_counter()
                    results = self.model.predict(img, verbose=False)
                    end_time = time.perf_counter()

                    inference_time = (end_time - start_time) * 1000  # Convert to ms
                    type_times.append(inference_time)
                    all_inference_times.append(inference_time)

                    # Get prediction
                    if len(results) > 0 and len(results[0].probs) > 0:
                        predicted_class_idx = results[0].probs.top1
                        confidence = results[0].probs.top1conf.item()
                        predicted_class = CAPTCHA_TYPES[predicted_class_idx]
                    else:
                        predicted_class = "unknown"
                        confidence = 0.0

                    # Check if correct
                    is_correct = predicted_class == captcha_type
                    if is_correct:
                        type_correct += 1
                        total_correct += 1

                    # Store prediction
                    prediction = {
                        "image": str(image_path.name),
                        "true_type": captcha_type,
                        "predicted_type": predicted_class,
                        "confidence": confidence,
                        "inference_time_ms": inference_time,
                        "correct": is_correct,
                    }
                    self.results["predictions"].append(prediction)
                    self.results["per_type_metrics"][captcha_type]["predictions"].append(prediction)

                    # Update confusion matrix
                    self.results["confusion_matrix"]["true_labels"].append(captcha_type)
                    self.results["confusion_matrix"]["predicted_labels"].append(predicted_class)

                    # Progress indicator
                    if idx % 10 == 0:
                        print(f"   Progress: {idx}/{len(images)} images")

                except Exception as e:
                    error_msg = f"Error processing {image_path}: {str(e)}"
                    print(f"   ❌ {error_msg}")
                    self.results["errors"].append(error_msg)

            # Calculate type metrics
            total_images += len(images)
            type_accuracy = (type_correct / len(images)) * 100 if images else 0

            self.results["per_type_metrics"][captcha_type]["total"] = len(images)
            self.results["per_type_metrics"][captcha_type]["correct"] = type_correct
            self.results["per_type_metrics"][captcha_type]["incorrect"] = len(images) - type_correct
            self.results["per_type_metrics"][captcha_type]["accuracy"] = type_accuracy
            self.results["per_type_metrics"][captcha_type]["inference_times"] = type_times

            print(
                f"   ✅ {captcha_type}: {type_accuracy:.1f}% accuracy ({type_correct}/{len(images)})"
            )

        # Calculate overall metrics
        overall_accuracy = (total_correct / total_images) * 100 if total_images else 0

        self.results["overall_metrics"] = {
            "total_images": total_images,
            "correct_predictions": total_correct,
            "incorrect_predictions": total_images - total_correct,
            "accuracy": overall_accuracy,
        }

        self.results["inference_times"] = {
            "all_times_ms": all_inference_times,
            "count": len(all_inference_times),
            "mean_ms": statistics.mean(all_inference_times) if all_inference_times else 0,
            "median_ms": statistics.median(all_inference_times) if all_inference_times else 0,
            "min_ms": min(all_inference_times) if all_inference_times else 0,
            "max_ms": max(all_inference_times) if all_inference_times else 0,
            "std_ms": statistics.stdev(all_inference_times) if len(all_inference_times) > 1 else 0,
            "p50_ms": self.calculate_percentile(all_inference_times, 50),
            "p95_ms": self.calculate_percentile(all_inference_times, 95),
            "p99_ms": self.calculate_percentile(all_inference_times, 99),
        }

        print(f"\n{'=' * 80}")
        print(f"✅ BENCHMARK COMPLETE")
        print(f"{'=' * 80}")
        print(f"📊 Overall Accuracy: {overall_accuracy:.2f}%")
        print(f"⏱️  Average Inference Time: {self.results['inference_times']['mean_ms']:.2f} ms")
        print(f"{'=' * 80}\n")

        return True

    def generate_text_report(self) -> str:
        """Generate comprehensive text report"""
        lines = []
        lines.append("=" * 80)
        lines.append("CAPTCHA SOLVER BENCHMARK REPORT")
        lines.append("=" * 80)
        lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"Model: {self.model_path.name}")
        lines.append(f"Device: {self.device}")
        lines.append("")

        # Overall Metrics
        lines.append("-" * 80)
        lines.append("OVERALL METRICS")
        lines.append("-" * 80)
        overall = self.results["overall_metrics"]
        lines.append(f"Total Images Tested:    {overall['total_images']}")
        lines.append(f"Correct Predictions:    {overall['correct_predictions']}")
        lines.append(f"Incorrect Predictions:  {overall['incorrect_predictions']}")
        lines.append(f"Overall Accuracy:       {overall['accuracy']:.2f}%")
        lines.append("")

        # Inference Time Statistics
        lines.append("-" * 80)
        lines.append("INFERENCE TIME STATISTICS")
        lines.append("-" * 80)
        times = self.results["inference_times"]
        lines.append(f"Total Inferences:       {times['count']}")
        lines.append(f"Mean:                   {times['mean_ms']:.2f} ms")
        lines.append(f"Median (P50):           {times['p50_ms']:.2f} ms")
        lines.append(f"P95:                    {times['p95_ms']:.2f} ms")
        lines.append(f"P99:                    {times['p99_ms']:.2f} ms")
        lines.append(f"Min:                    {times['min_ms']:.2f} ms")
        lines.append(f"Max:                    {times['max_ms']:.2f} ms")
        lines.append(f"Std Dev:                {times['std_ms']:.2f} ms")
        lines.append("")

        # Per-Type Metrics
        lines.append("-" * 80)
        lines.append("PER-TYPE ACCURACY")
        lines.append("-" * 80)
        lines.append(f"{'Type':<25} {'Total':>8} {'Correct':>8} {'Incorrect':>10} {'Accuracy':>10}")
        lines.append("-" * 80)

        # Sort by accuracy (ascending) to show weakest first
        sorted_types = sorted(
            CAPTCHA_TYPES, key=lambda x: self.results["per_type_metrics"][x]["accuracy"]
        )

        for captcha_type in sorted_types:
            metrics = self.results["per_type_metrics"][captcha_type]
            display_name = TYPE_DISPLAY_NAMES.get(captcha_type, captcha_type)
            lines.append(
                f"{display_name:<25} {metrics['total']:>8} {metrics['correct']:>8} "
                f"{metrics['incorrect']:>10} {metrics['accuracy']:>9.1f}%"
            )

        lines.append("-" * 80)
        lines.append("")

        # Weak Spots Analysis
        lines.append("-" * 80)
        lines.append("WEAK SPOTS ANALYSIS")
        lines.append("-" * 80)

        weak_types = [
            t for t in sorted_types if self.results["per_type_metrics"][t]["accuracy"] < 90.0
        ]
        if weak_types:
            lines.append("Types with accuracy < 90% (need improvement):")
            for captcha_type in weak_types:
                metrics = self.results["per_type_metrics"][captcha_type]
                display_name = TYPE_DISPLAY_NAMES.get(captcha_type, captcha_type)
                lines.append(f"  ⚠️  {display_name}: {metrics['accuracy']:.1f}%")
        else:
            lines.append("✅ All types achieve ≥90% accuracy!")

        lines.append("")

        # Performance Tiers
        lines.append("-" * 80)
        lines.append("PERFORMANCE TIERS")
        lines.append("-" * 80)

        excellent = [
            t for t in CAPTCHA_TYPES if self.results["per_type_metrics"][t]["accuracy"] >= 95.0
        ]
        good = [
            t
            for t in CAPTCHA_TYPES
            if 90.0 <= self.results["per_type_metrics"][t]["accuracy"] < 95.0
        ]
        needs_work = [
            t for t in CAPTCHA_TYPES if self.results["per_type_metrics"][t]["accuracy"] < 90.0
        ]

        lines.append(f"🌟 Excellent (≥95%):     {len(excellent)} types")
        for t in excellent:
            lines.append(f"    • {TYPE_DISPLAY_NAMES.get(t, t)}")

        lines.append(f"✅ Good (90-95%):        {len(good)} types")
        for t in good:
            lines.append(f"    • {TYPE_DISPLAY_NAMES.get(t, t)}")

        lines.append(f"⚠️  Needs Work (<90%):   {len(needs_work)} types")
        for t in needs_work:
            lines.append(f"    • {TYPE_DISPLAY_NAMES.get(t, t)}")

        lines.append("")
        lines.append("=" * 80)
        lines.append("END OF REPORT")
        lines.append("=" * 80)

        return "\n".join(lines)

    def generate_ascii_charts(self) -> str:
        """Generate ASCII-based performance charts"""
        lines = []
        lines.append("\n" + "=" * 80)
        lines.append("PERFORMANCE VISUALIZATIONS (ASCII)")
        lines.append("=" * 80)
        lines.append("")

        # Accuracy Bar Chart
        lines.append("ACCURACY BY CAPTCHA TYPE")
        lines.append("-" * 80)

        sorted_types = sorted(
            CAPTCHA_TYPES,
            key=lambda x: self.results["per_type_metrics"][x]["accuracy"],
            reverse=True,
        )

        max_name_len = max(len(TYPE_DISPLAY_NAMES.get(t, t)) for t in CAPTCHA_TYPES)

        for captcha_type in sorted_types:
            metrics = self.results["per_type_metrics"][captcha_type]
            display_name = TYPE_DISPLAY_NAMES.get(captcha_type, captcha_type)
            accuracy = metrics["accuracy"]

            # Create bar (50 chars = 100%)
            bar_len = int(accuracy / 2)
            bar = "█" * bar_len

            # Color coding based on accuracy
            if accuracy >= 95:
                symbol = "🌟"
            elif accuracy >= 90:
                symbol = "✅"
            else:
                symbol = "⚠️ "

            lines.append(f"{display_name:<{max_name_len}} │{bar:<50}│ {accuracy:5.1f}% {symbol}")

        lines.append("-" * 80)
        lines.append("")

        # Inference Time Distribution
        lines.append("INFERENCE TIME DISTRIBUTION")
        lines.append("-" * 80)

        times = self.results["inference_times"]["all_times_ms"]
        if times:
            # Create histogram buckets
            buckets = [0, 5, 10, 20, 50, 100, 200, 500, 1000, float("inf")]
            bucket_labels = [
                "0-5ms",
                "5-10ms",
                "10-20ms",
                "20-50ms",
                "50-100ms",
                "100-200ms",
                "200-500ms",
                "500ms-1s",
                ">1s",
            ]
            bucket_counts = [0] * (len(buckets) - 1)

            for t in times:
                for i in range(len(buckets) - 1):
                    if buckets[i] <= t < buckets[i + 1]:
                        bucket_counts[i] += 1
                        break

            max_count = max(bucket_counts) if bucket_counts else 1

            for i, (label, count) in enumerate(zip(bucket_labels, bucket_counts)):
                bar_len = int((count / max_count) * 40) if max_count > 0 else 0
                bar = "█" * bar_len
                percentage = (count / len(times)) * 100 if times else 0
                lines.append(f"{label:>10} │{bar:<40}│ {count:4d} ({percentage:4.1f}%)")

        lines.append("-" * 80)
        lines.append("")

        return "\n".join(lines)

    def generate_confusion_matrix_text(self) -> str:
        """Generate text-based confusion matrix"""
        lines = []
        lines.append("\n" + "=" * 80)
        lines.append("CONFUSION MATRIX (Sample)")
        lines.append("=" * 80)
        lines.append("(Showing misclassifications only)")
        lines.append("")

        # Count misclassifications
        misclassifications = defaultdict(lambda: defaultdict(int))

        for pred in self.results["predictions"]:
            true_type = pred["true_type"]
            predicted_type = pred["predicted_type"]
            if true_type != predicted_type:
                misclassifications[true_type][predicted_type] += 1

        if misclassifications:
            lines.append("Common misclassifications:")
            lines.append(f"{'True Type':<20} → {'Predicted As':<20} {'Count':>6}")
            lines.append("-" * 80)

            # Sort by count
            errors = []
            for true_type, preds in misclassifications.items():
                for pred_type, count in preds.items():
                    errors.append((true_type, pred_type, count))

            errors.sort(key=lambda x: x[2], reverse=True)

            for true_type, pred_type, count in errors[:20]:  # Top 20 errors
                true_display = TYPE_DISPLAY_NAMES.get(true_type, true_type)
                pred_display = TYPE_DISPLAY_NAMES.get(pred_type, pred_type)
                lines.append(f"{true_display:<20} → {pred_display:<20} {count:>6}")
        else:
            lines.append("✅ No misclassifications found!")

        lines.append("")
        return "\n".join(lines)

    def save_results(self) -> bool:
        """Save benchmark results to JSON and text files"""
        print("\n💾 Saving benchmark results...")

        try:
            # Save JSON results
            json_path = self.output_dir / "benchmark_results.json"

            # Create a copy without the full predictions list for smaller JSON
            json_results = self.results.copy()
            json_results["predictions_sample"] = self.results["predictions"][:100]  # First 100
            del json_results["predictions"]  # Remove full list

            # Also remove full inference times list (keep statistics)
            if "inference_times" in json_results:
                del json_results["inference_times"]["all_times_ms"]

            with open(json_path, "w") as f:
                json.dump(json_results, f, indent=2)

            print(f"   ✅ JSON results saved: {json_path}")

            # Save full predictions to separate file
            predictions_path = self.output_dir / "benchmark_predictions.json"
            with open(predictions_path, "w") as f:
                json.dump(self.results["predictions"], f, indent=2)

            print(f"   ✅ Predictions saved: {predictions_path}")

            # Save text report
            report_path = self.output_dir / "benchmark_report.txt"
            report = self.generate_text_report()
            charts = self.generate_ascii_charts()
            confusion = self.generate_confusion_matrix_text()

            with open(report_path, "w") as f:
                f.write(report)
                f.write(charts)
                f.write(confusion)

            print(f"   ✅ Text report saved: {report_path}")

            # Print report to console
            print("\n" + report)
            print(charts)
            print(confusion)

            return True

        except Exception as e:
            print(f"   ❌ ERROR saving results: {str(e)}")
            return False

    def generate_recommendations(self) -> List[str]:
        """Generate improvement recommendations"""
        recommendations = []

        # Identify weak types
        weak_types = []
        for captcha_type in CAPTCHA_TYPES:
            accuracy = self.results["per_type_metrics"][captcha_type]["accuracy"]
            if accuracy < 90.0:
                weak_types.append((captcha_type, accuracy))

        if weak_types:
            recommendations.append("=" * 80)
            recommendations.append("IMPROVEMENT RECOMMENDATIONS")
            recommendations.append("=" * 80)
            recommendations.append("")
            recommendations.append("1. FOCUS ON WEAK CAPTCHA TYPES:")
            for captcha_type, accuracy in sorted(weak_types, key=lambda x: x[1]):
                display_name = TYPE_DISPLAY_NAMES.get(captcha_type, captcha_type)
                recommendations.append(
                    f"   • {display_name}: Currently {accuracy:.1f}% - needs more training data"
                )

            recommendations.append("")
            recommendations.append("2. DATA AUGMENTATION SUGGESTIONS:")
            recommendations.append("   • Add more diverse samples for weak types")
            recommendations.append("   • Include edge cases and variations")
            recommendations.append("   • Consider synthetic data generation")

            recommendations.append("")
            recommendations.append("3. MODEL IMPROVEMENTS:")
            recommendations.append("   • Try larger YOLO models (yolov8s-cls, yolov8m-cls)")
            recommendations.append("   • Increase training epochs for weak types")
            recommendations.append("   • Implement focal loss for imbalanced data")

            recommendations.append("")
            recommendations.append("4. ENSEMBLE APPROACH:")
            recommendations.append("   • Combine multiple model predictions")
            recommendations.append("   • Use voting or stacking methods")
        else:
            recommendations.append("=" * 80)
            recommendations.append("✅ ALL SYSTEMS OPTIMAL")
            recommendations.append("=" * 80)
            recommendations.append("")
            recommendations.append("All CAPTCHA types achieve ≥90% accuracy.")
            recommendations.append("No immediate improvements required.")
            recommendations.append("")
            recommendations.append("Future optimizations:")
            recommendations.append("  • Continue monitoring for drift")
            recommendations.append("  • Collect real-world performance data")
            recommendations.append("  • Consider model quantization for faster inference")

        return recommendations

    def run(self) -> bool:
        """Execute complete benchmark pipeline"""

        # 1. Load model
        if not self.load_model():
            return False

        # 2. Discover images
        images_by_type = self.discover_images()

        # 3. Run benchmark
        if not self.run_benchmark(images_by_type):
            return False

        # 4. Save results
        if not self.save_results():
            return False

        # 5. Print recommendations
        recommendations = self.generate_recommendations()
        print("\n".join(recommendations))

        # Save recommendations to file
        rec_path = self.output_dir / "benchmark_recommendations.txt"
        with open(rec_path, "w") as f:
            f.write("\n".join(recommendations))
        print(f"\n💾 Recommendations saved: {rec_path}")

        print(f"\n{'=' * 80}")
        print(f"🎉 BENCHMARK COMPLETE - All results saved to: {self.output_dir}")
        print(f"{'=' * 80}\n")

        return True


def main():
    """Main entry point"""

    # Create benchmark instance
    benchmark = CaptchaBenchmark(TRAINING_DIR, MODEL_PATH)

    # Run benchmark
    success = benchmark.run()

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
