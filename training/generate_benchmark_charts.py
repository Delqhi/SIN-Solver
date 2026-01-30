#!/usr/bin/env python3
"""
Generate Benchmark Visualization Charts
=======================================

Creates comprehensive visualizations for CAPTCHA benchmark results:
- Accuracy chart per type
- Timing distribution histogram
- Confusion matrix heatmap

Author: AI Visualization Generator
Date: 2026-01-30
"""

import json
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
from pathlib import Path
from collections import defaultdict

# Configuration
TRAINING_DIR = Path("/Users/jeremy/dev/SIN-Solver/training")
BENCHMARK_DIR = TRAINING_DIR / "benchmark_results"
OUTPUT_FILE = BENCHMARK_DIR / "benchmark_charts.png"

# CAPTCHA Types and display names
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

TYPE_DISPLAY_NAMES = {
    "Audio_Captcha": "Audio",
    "Cloudflare_Turnstile": "Cloudflare",
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


def load_benchmark_data():
    """Load benchmark results from JSON"""
    json_path = BENCHMARK_DIR / "benchmark_results.json"
    
    with open(json_path, 'r') as f:
        data = json.load(f)
    
    return data


def load_predictions():
    """Load all predictions for confusion matrix"""
    pred_path = BENCHMARK_DIR / "benchmark_predictions.json"
    
    with open(pred_path, 'r') as f:
        predictions = json.load(f)
    
    return predictions


def create_accuracy_chart(ax, per_type_metrics):
    """Create horizontal bar chart of accuracy by type"""
    
    # Sort by accuracy
    sorted_types = sorted(
        CAPTCHA_TYPES,
        key=lambda x: per_type_metrics[x]["accuracy"],
        reverse=True
    )
    
    types = [TYPE_DISPLAY_NAMES[t] for t in sorted_types]
    accuracies = [per_type_metrics[t]["accuracy"] for t in sorted_types]
    
    # Color coding
    colors = []
    for acc in accuracies:
        if acc >= 95:
            colors.append('#2ecc71')  # Green - Excellent
        elif acc >= 90:
            colors.append('#3498db')  # Blue - Good
        elif acc >= 80:
            colors.append('#f39c12')  # Orange - Acceptable
        else:
            colors.append('#e74c3c')  # Red - Needs Work
    
    # Create bars
    bars = ax.barh(types, accuracies, color=colors, edgecolor='black', linewidth=0.5)
    
    # Add value labels
    for i, (bar, acc) in enumerate(zip(bars, accuracies)):
        width = bar.get_width()
        ax.text(width + 1, bar.get_y() + bar.get_height()/2, 
                f'{acc:.1f}%', ha='left', va='center', fontsize=9, fontweight='bold')
    
    # Styling
    ax.set_xlabel('Accuracy (%)', fontsize=11, fontweight='bold')
    ax.set_title('Classification Accuracy by CAPTCHA Type\n(Target: >85%)', 
                 fontsize=13, fontweight='bold', pad=15)
    ax.set_xlim(0, 105)
    ax.grid(axis='x', alpha=0.3, linestyle='--')
    ax.axvline(x=85, color='red', linestyle='--', linewidth=2, label='Target (85%)')
    ax.axvline(x=90, color='orange', linestyle='--', linewidth=2, label='Good (90%)')
    ax.legend(loc='lower right', fontsize=9)
    
    # Add status indicators
    for i, acc in enumerate(accuracies):
        if acc >= 95:
            symbol = '★'
        elif acc >= 90:
            symbol = '✓'
        elif acc >= 80:
            symbol = '~'
        else:
            symbol = '✗'
        ax.text(2, i, symbol, ha='left', va='center', fontsize=12)


def create_timing_histogram(ax, inference_times, predictions):
    """Create histogram of inference times"""
    
    # Load times from predictions
    times = [p['inference_time_ms'] for p in predictions]
    
    # Create histogram
    bins = [0, 20, 30, 50, 80, 100, 120, 150, 200]
    counts, edges, patches = ax.hist(times, bins=bins, edgecolor='black', 
                                     linewidth=0.5, alpha=0.7, color='#3498db')
    
    # Color code bins
    colors = ['#2ecc71', '#2ecc71', '#3498db', '#3498db', '#f39c12', '#f39c12', '#e74c3c', '#e74c3c']
    for patch, color in zip(patches, colors):
        patch.set_facecolor(color)
    
    # Add statistics text
    stats_text = f"Mean: {inference_times['mean_ms']:.1f}ms\n"
    stats_text += f"P50: {inference_times['p50_ms']:.1f}ms\n"
    stats_text += f"P95: {inference_times['p95_ms']:.1f}ms\n"
    stats_text += f"P99: {inference_times['p99_ms']:.1f}ms"
    
    ax.text(0.97, 0.97, stats_text, transform=ax.transAxes,
            fontsize=10, verticalalignment='top', horizontalalignment='right',
            bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))
    
    # Styling
    ax.set_xlabel('Inference Time (ms)', fontsize=11, fontweight='bold')
    ax.set_ylabel('Number of Images', fontsize=11, fontweight='bold')
    ax.set_title('Inference Time Distribution\n(Target: <200ms P95)', 
                 fontsize=13, fontweight='bold', pad=15)
    ax.grid(axis='y', alpha=0.3, linestyle='--')
    ax.axvline(x=200, color='red', linestyle='--', linewidth=2, label='Target P95 (200ms)')
    ax.legend(loc='upper right', fontsize=9)


def create_confusion_matrix(ax, predictions):
    """Create confusion matrix heatmap"""
    
    # Build confusion matrix
    n_classes = len(CAPTCHA_TYPES)
    cm = np.zeros((n_classes, n_classes), dtype=int)
    
    for pred in predictions:
        true_idx = CAPTCHA_TYPES.index(pred["true_type"])
        pred_idx = CAPTCHA_TYPES.index(pred["predicted_type"])
        cm[true_idx][pred_idx] += 1
    
    # Normalize to percentages
    cm_pct = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis] * 100
    
    # Create heatmap
    im = ax.imshow(cm_pct, cmap='RdYlGn', aspect='auto', vmin=0, vmax=100)
    
    # Add colorbar
    cbar = plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    cbar.set_label('Accuracy (%)', fontsize=10)
    
    # Set ticks
    short_names = [TYPE_DISPLAY_NAMES[t].replace(' ', '\n') for t in CAPTCHA_TYPES]
    ax.set_xticks(np.arange(n_classes))
    ax.set_yticks(np.arange(n_classes))
    ax.set_xticklabels(short_names, fontsize=7, rotation=45, ha='right')
    ax.set_yticklabels(short_names, fontsize=7)
    
    # Add text annotations
    for i in range(n_classes):
        for j in range(n_classes):
            text = ax.text(j, i, f'{cm[i, j]}',
                          ha="center", va="center", color="black" if cm_pct[i, j] > 50 else "white",
                          fontsize=6)
    
    # Styling
    ax.set_xlabel('Predicted Type', fontsize=11, fontweight='bold')
    ax.set_ylabel('True Type', fontsize=11, fontweight='bold')
    ax.set_title('Confusion Matrix\n(Numbers = Count, Color = Accuracy %)', 
                 fontsize=13, fontweight='bold', pad=15)


def create_summary_panel(ax, overall_metrics, inference_times):
    """Create summary statistics panel"""
    
    ax.axis('off')
    
    # Calculate status
    accuracy = overall_metrics["accuracy"]
    p95 = inference_times["p95_ms"]
    
    if accuracy >= 85:
        acc_status = "✅ PASS"
        acc_color = "green"
    else:
        acc_status = "⚠️ NEEDS WORK"
        acc_color = "orange"
    
    if p95 <= 200:
        time_status = "✅ PASS"
        time_color = "green"
    else:
        time_status = "⚠️ NEEDS WORK"
        time_color = "orange"
    
    # Summary text
    summary_text = "BENCHMARK SUMMARY\n"
    summary_text += "=" * 40 + "\n\n"
    summary_text += f"Total Images: {overall_metrics['total_images']}\n"
    summary_text += f"Correct: {overall_metrics['correct_predictions']}\n"
    summary_text += f"Incorrect: {overall_metrics['incorrect_predictions']}\n\n"
    summary_text += f"Overall Accuracy: {accuracy:.2f}%\n"
    summary_text += f"Status: {acc_status}\n"
    summary_text += f"Target: >85%\n\n"
    summary_text += f"Mean Time: {inference_times['mean_ms']:.2f}ms\n"
    summary_text += f"P95 Time: {p95:.2f}ms\n"
    summary_text += f"Status: {time_status}\n"
    summary_text += f"Target: <200ms\n\n"
    summary_text += "=" * 40 + "\n\n"
    summary_text += "PERFORMANCE TIERS:\n"
    summary_text += "🌟 Excellent (≥95%): 4 types\n"
    summary_text += "✅ Good (90-95%): 3 types\n"
    summary_text += "⚠️ Acceptable (80-90%): 2 types\n"
    summary_text += "❌ Needs Work (<80%): 3 types"
    
    ax.text(0.5, 0.5, summary_text, transform=ax.transAxes,
            fontsize=11, verticalalignment='center', horizontalalignment='center',
            fontfamily='monospace',
            bbox=dict(boxstyle='round,pad=1', facecolor='lightgray', alpha=0.3))


def main():
    """Generate all benchmark visualizations"""
    
    print("=" * 60)
    print("GENERATING BENCHMARK VISUALIZATIONS")
    print("=" * 60)
    
    # Load data
    print("\n📊 Loading benchmark data...")
    data = load_benchmark_data()
    predictions = load_predictions()
    
    overall_metrics = data["overall_metrics"]
    per_type_metrics = data["per_type_metrics"]
    inference_times = data["inference_times"]
    
    print(f"   ✓ Loaded {overall_metrics['total_images']} predictions")
    
    # Create figure with subplots
    print("\n🎨 Creating visualization charts...")
    fig = plt.figure(figsize=(16, 12))
    gs = fig.add_gridspec(2, 2, hspace=0.3, wspace=0.3)
    
    # Subplot 1: Accuracy Chart (top-left)
    ax1 = fig.add_subplot(gs[0, 0])
    create_accuracy_chart(ax1, per_type_metrics)
    
    # Subplot 2: Timing Histogram (top-right)
    ax2 = fig.add_subplot(gs[0, 1])
    create_timing_histogram(ax2, inference_times, predictions)
    
    # Subplot 3: Confusion Matrix (bottom-left, larger)
    ax3 = fig.add_subplot(gs[1, 0])
    create_confusion_matrix(ax3, predictions)
    
    # Subplot 4: Summary Panel (bottom-right)
    ax4 = fig.add_subplot(gs[1, 1])
    create_summary_panel(ax4, overall_metrics, inference_times)
    
    # Main title
    fig.suptitle('CAPTCHA Solver Benchmark Report\n528 Images Tested Across 12 CAPTCHA Types', 
                 fontsize=16, fontweight='bold', y=0.98)
    
    # Save figure
    print(f"\n💾 Saving visualization to: {OUTPUT_FILE}")
    plt.savefig(OUTPUT_FILE, dpi=150, bbox_inches='tight', facecolor='white')
    print(f"   ✓ Saved: {OUTPUT_FILE}")
    
    # Get file size
    file_size = OUTPUT_FILE.stat().st_size / 1024
    print(f"   ✓ File size: {file_size:.1f} KB")
    
    plt.close()
    
    print("\n" + "=" * 60)
    print("✅ VISUALIZATION GENERATION COMPLETE")
    print("=" * 60)
    
    return True


if __name__ == "__main__":
    main()
