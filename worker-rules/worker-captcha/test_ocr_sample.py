#!/usr/bin/env python3
"""Test real Tesseract OCR on a sample of images (10 images only)"""

import json
from pathlib import Path
import pytesseract
from PIL import Image
from typing import Dict

DATASET_DIR = Path("/Users/jeremy/dev/SIN-Solver/worker-rules/worker-captcha/dataset")

def test_ocr_sample():
    """Test Tesseract on 10 sample images"""
    with open(DATASET_DIR / "manifest.json", "r") as f:
        manifest = json.load(f)
    
    # Take first image from each category for testing
    sample_images = manifest["images"][:10]
    
    correct = 0
    results = []
    
    print("🧪 Tesseract OCR Sample Test (10 images)")
    print("=" * 70)
    
    for i, img_data in enumerate(sample_images, 1):
        filepath = DATASET_DIR / img_data["filename"]
        ground_truth = img_data["ground_truth"]
        
        try:
            # Open image
            img = Image.open(filepath)
            
            # Extract text
            text = pytesseract.image_to_string(img, timeout=5)
            
            # Clean up
            result = "".join(text.upper().split())
            result = "".join(c for c in result if c.isalnum())
            
            # Check if correct
            is_correct = result == ground_truth
            if is_correct:
                correct += 1
            
            status = "✅" if is_correct else "❌"
            category = img_data["filename"].split("/")[0]
            print(f"{status} [{i:2d}] {category:15} {ground_truth:8} → {result:8}")
            
            results.append({
                "image": img_data["filename"],
                "ground_truth": ground_truth,
                "extracted": result,
                "correct": is_correct,
                "category": category
            })
            
        except Exception as e:
            print(f"❌ [{i:2d}] {img_data['filename']}: ERROR - {str(e)[:40]}")
    
    accuracy = (correct / len(sample_images) * 100) if sample_images else 0
    print("=" * 70)
    print(f"Tesseract Accuracy: {accuracy:.1f}% ({correct}/{len(sample_images)})")
    
    # Category breakdown
    print("\nBy category:")
    categories = {}
    for r in results:
        cat = r["category"]
        if cat not in categories:
            categories[cat] = {"total": 0, "correct": 0}
        categories[cat]["total"] += 1
        if r["correct"]:
            categories[cat]["correct"] += 1
    
    for cat in sorted(categories.keys()):
        stats = categories[cat]
        acc = (stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0
        print(f"  {cat}: {acc:.1f}% ({stats['correct']}/{stats['total']})")
    
    print("\n✅ Sample test complete!")
    return accuracy

if __name__ == "__main__":
    test_ocr_sample()
