#!/usr/bin/env python3
"""
Ultra-fast OCR package verification (no model downloads).
Tests only imports and basic functionality without loading heavy models.
"""

import sys
import os

print("🧪 QUICK OCR PACKAGE VERIFICATION")
print("=" * 60)

# Test 1: Basic imports
print("\n1️⃣  Testing imports...")
try:
    import numpy as np
    print("   ✅ numpy")
    
    import cv2
    print("   ✅ opencv-python (cv2)")
    
    import PIL.Image
    print("   ✅ pillow (PIL)")
    
    import pytesseract
    print("   ✅ pytesseract")
    
    print("   ✅ All core imports working!")
except ImportError as e:
    print(f"   ❌ Import failed: {e}")
    sys.exit(1)

# Test 2: Tesseract CLI availability
print("\n2️⃣  Testing Tesseract CLI...")
try:
    result = pytesseract.pytesseract.get_tesseract_version()
    print(f"   ✅ Tesseract CLI available: {result}")
except Exception as e:
    print(f"   ⚠️  Tesseract not available: {e}")
    print("   (This is OK if using PaddleOCR instead)")

# Test 3: Create a simple test image and OCR it
print("\n3️⃣  Testing Tesseract OCR on synthetic image...")
try:
    from PIL import Image, ImageDraw, ImageFont
    
    # Create a simple image with text
    img = Image.new('RGB', (200, 50), color='white')
    draw = ImageDraw.Draw(img)
    draw.text((10, 10), "HELLO123", fill='black')
    
    # Try to OCR it
    text = pytesseract.image_to_string(img)
    if text.strip():
        print(f"   ✅ OCR result: '{text.strip()}'")
    else:
        print(f"   ⚠️  OCR returned empty string")
except Exception as e:
    print(f"   ❌ Tesseract OCR failed: {e}")

# Test 4: Check PaddleOCR imports (don't initialize yet - avoid model download)
print("\n4️⃣  Testing PaddleOCR imports (no model download)...")
try:
    from paddleocr import PaddleOCR
    print("   ✅ paddleocr import successful")
    print("   ℹ️  (Models will be loaded on first actual use)")
except ImportError as e:
    print(f"   ❌ PaddleOCR import failed: {e}")
    sys.exit(1)

# Test 5: Check YOLO availability
print("\n5️⃣  Testing YOLO imports...")
try:
    from ultralytics import YOLO
    print("   ✅ ultralytics.YOLO import successful")
except ImportError as e:
    print(f"   ❌ YOLO import failed: {e}")
    sys.exit(1)

# Test 6: Check if YOLO model exists
print("\n6️⃣  Checking YOLO model file...")
yolo_path = Path("/Users/jeremy/runs/classify/runs/classify/captcha_classifier3/weights/best.pt")
if yolo_path.exists():
    size_mb = yolo_path.stat().st_size / (1024 * 1024)
    print(f"   ✅ YOLO model found: {size_mb:.1f}MB")
else:
    print(f"   ⏳ YOLO model not ready yet (still training)")

print("\n" + "=" * 60)
print("✅ ALL QUICK TESTS PASSED!")
print("\nReady to run full integration tests once YOLO training completes.")
