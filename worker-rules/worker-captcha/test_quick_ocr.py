#!/usr/bin/env python3
"""Quick OCR test on subset of images (10 images)"""

import os
import json
from pathlib import Path
from typing import Dict, List
import pytesseract
from PIL import Image

DATASET_DIR = Path("/Users/jeremy/dev/SIN-Solver/worker-rules/worker-captcha/dataset")

def load_manifest() -> Dict:
    """Load image manifest"""
    with open(DATASET_DIR / "manifest.json", "r") as f:
        return json.load(f)

def test_quick_ocr():
    """Run quick test on 10 random images"""
    manifest = load_manifest()
    images = manifest["images"][:10]  # Take first 10
    
    results = {
        "total": len(images),
        "correct": 0,
        "errors": []
    }
    
    print("🚀 Quick OCR Test (10 images)")
    print("=" * 60)
    
    for i, img_data in enumerate(images):
        try:
            filepath = DATASET_DIR / img_data["filename"]
            ground_truth = img_data["ground_truth"]
            
            # Open and extract text
            img = Image.open(filepath)
            text = pytesseract.image_to_string(img)
            
            # Clean up
            result = "".join(text.upper().split())
            result = "".join(c for c in result if c.isalnum())
            
            # Check if correct
            is_correct = result == ground_truth
            if is_correct:
                results["correct"] += 1
            
            status = "✅" if is_correct else "❌"
            print(f"{status} [{i+1}/10] {img_data['filename']}: '{ground_truth}' → '{result}'")
            
        except Exception as e:
            results["errors"].append({"image": img_data["filename"], "error": str(e)})
            print(f"❌ [{i+1}/10] {img_data['filename']}: ERROR - {e}")
    
    accuracy = (results["correct"] / results["total"] * 100) if results["total"] > 0 else 0
    print("=" * 60)
    print(f"Accuracy: {accuracy:.1f}% ({results['correct']}/{results['total']})")
    print(f"Status: {'✅ Ready for full test' if accuracy > 50 else '⚠️  Low accuracy - check Tesseract'}")

if __name__ == "__main__":
    test_quick_ocr()
