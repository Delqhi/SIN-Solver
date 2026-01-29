#!/usr/bin/env python3
"""Minimal OCR package test - no PaddleOCR imports."""
import sys
from pathlib import Path

print("🧪 MINIMAL OCR PACKAGE TEST")
print("=" * 50)

# Test 1: numpy
try:
    import numpy as np
    print("✅ numpy")
except:
    print("❌ numpy failed")
    sys.exit(1)

# Test 2: cv2
try:
    import cv2
    print("✅ opencv-python (cv2)")
except:
    print("❌ opencv failed")
    sys.exit(1)

# Test 3: PIL
try:
    from PIL import Image
    print("✅ pillow (PIL)")
except:
    print("❌ PIL failed")
    sys.exit(1)

# Test 4: pytesseract
try:
    import pytesseract
    print("✅ pytesseract")
except:
    print("❌ pytesseract failed")
    sys.exit(1)

# Test 5: ultralytics (YOLO)
try:
    from ultralytics import YOLO
    print("✅ ultralytics (YOLO)")
except:
    print("❌ YOLO failed")
    sys.exit(1)

# Test 6: Check YOLO model
yolo_path = Path("/Users/jeremy/runs/classify/runs/classify/captcha_classifier3/weights/best.pt")
if yolo_path.exists():
    size_mb = yolo_path.stat().st_size / (1024 * 1024)
    print(f"✅ YOLO model: {size_mb:.1f}MB")
else:
    print("⏳ YOLO model not ready (still training)")

print("=" * 50)
print("✅ Core packages verified!")
