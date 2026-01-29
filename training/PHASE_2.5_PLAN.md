# Phase 2.5: OCR Integration & Pipeline Design

**Status:** Planning Phase (Training Phase 2.4e in progress)  
**Created:** 2026-01-29 Session 11  
**Estimated Duration:** 4-6 hours

---

## 🎯 Objectives

### Primary Goals
1. **Tesseract OCR Integration** - Text CAPTCHA recognition (English + multi-language)
2. **PaddleOCR Integration** - Backup OCR engine for Chinese characters & special cases
3. **Pipeline Architecture** - YOLO Classification → OCR Routing → Solver Output
4. **Consensus Voting** - 3-way OCR voting (Tesseract + PaddleOCR + ddddocr existing)
5. **Integration Testing** - End-to-end testing with real CAPTCHA samples
6. **Performance Benchmarking** - Speed and accuracy metrics

### Secondary Goals
- Update documentation with OCR architecture
- Create API endpoint for OCR routing
- Add monitoring and logging
- Prepare Phase 3 integration

---

## 📋 Phase 2.5a: Tesseract OCR Installation & Configuration

### Research & Installation
**Tesseract Overview:**
- Official OCR engine by Google
- Supports 100+ languages
- Excellent for English text CAPTCHA
- Free & open-source
- ~20-50ms per image on CPU

**Installation Steps:**
```bash
# macOS
brew install tesseract

# Verify installation
tesseract --version

# Install English + Additional Language Packs
brew install tesseract-lang

# For Python integration
pip install pytesseract pillow numpy
```

**Configuration:**
```python
import pytesseract
from PIL import Image
import cv2

# Basic text extraction
def extract_text_tesseract(image_path):
    img = Image.open(image_path)
    text = pytesseract.image_to_string(img)
    return text.strip()

# With preprocessing for better accuracy
def extract_text_tesseract_advanced(image_path):
    img = cv2.imread(image_path)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 150, 255, cv2.THRESH_BINARY)
    text = pytesseract.image_to_string(thresh, config='--psm 8')
    return text.strip()
```

**PSM Modes:**
- 6: Assume single uniform block of text
- 7: Single text line
- 8: Single word
- 11: Sparse text
- 13: Raw line (auto orientation)

---

## 📋 Phase 2.5b: PaddleOCR Installation & Integration

### Research & PaddleOCR
**PaddleOCR Overview:**
- Developed by PaddlePaddle (Baidu)
- Multi-language support (Chinese, English, etc.)
- Pre-trained models (fast & accurate)
- Better for curved/rotated text
- ~100-200ms per image on CPU
- Automatic language detection

**Installation Steps:**
```bash
# Install PaddleOCR
pip install paddleocr

# First run (auto-downloads model)
python3 << 'EOF'
from paddleocr import PaddleOCR

# Initialize (downloads model ~300MB on first run)
ocr = PaddleOCR(use_angle_cls=True, lang='en')

# Test
result = ocr.ocr('path/to/image.jpg', cls=True)
print(result)
EOF
```

**Integration Code:**
```python
from paddleocr import PaddleOCR
import numpy as np

class PaddleOCRExtractor:
    def __init__(self):
        self.ocr = PaddleOCR(use_angle_cls=True, lang='en')
    
    def extract_text(self, image_path):
        result = self.ocr.ocr(image_path, cls=True)
        if result:
            texts = []
            for line in result:
                for word_info in line:
                    text = word_info[1][0]
                    confidence = word_info[1][1]
                    texts.append((text, confidence))
            return texts
        return []
    
    def extract_text_with_confidence(self, image_path, min_confidence=0.5):
        texts = self.extract_text(image_path)
        filtered = [(t, c) for t, c in texts if c >= min_confidence]
        result_text = ''.join([t for t, c in filtered])
        avg_confidence = np.mean([c for t, c in filtered]) if filtered else 0
        return result_text, avg_confidence
```

---

## 📋 Phase 2.5c: Pipeline Architecture Design

### YOLO → OCR Routing Pipeline

The pipeline works as follows:

1. **CAPTCHA Image Input** - Raw image from browser
2. **YOLO Classification** - Determine CAPTCHA type (12 classes)
3. **Route by Type** - Direct to specific solver
4. **OCR/Detection** - Apply appropriate method
5. **Consensus** - Vote among multiple methods
6. **Output** - Return solved answer

**Class-Specific Routing:**

**Text_Captcha:**
- Image preprocessing (grayscale, threshold, denoise)
- Tesseract OCR (PSM 8 - single word)
- Confidence > 75% → SOLVED
- Confidence < 75% → PaddleOCR (fallback)

**Image_Click_Captcha:**
- Element detection via OpenCV
- Match with ddddocr existing implementation
- Return click coordinates

**Slider_Captcha:**
- YOLO Pose Detection (find slider handle)
- Extract handle position
- Calculate required slide distance
- Return slide parameters

---

## 📋 Phase 2.5d: Integration Implementation

### Solver Pipeline Class

```python
from typing import Tuple, Optional, List
from dataclasses import dataclass
import numpy as np

class OCRResult:
    def __init__(self, text, confidence, method):
        self.text = text
        self.confidence = confidence
        self.method = method

class CaptchaSolverPipeline:
    def __init__(self):
        from pytesseract import pytesseract
        from paddleocr import PaddleOCR
        
        self.tesseract = pytesseract
        self.paddleocr = PaddleOCR(use_angle_cls=True, lang='en')
        self.yolo_model = None
    
    def classify_captcha(self, image_path: str):
        results = self.yolo_model.predict(image_path)
        top_class = results[0].probs.top1
        top_conf = results[0].probs.top1conf.item()
        return top_class, top_conf
    
    def ocr_text_captcha(self, image_path: str):
        results = []
        
        # Method 1: Tesseract
        try:
            from PIL import Image
            text_tess = self.tesseract.image_to_string(Image.open(image_path))
            results.append(OCRResult(text_tess.strip(), 0.7, 'tesseract'))
        except Exception as e:
            print(f"Tesseract error: {e}")
        
        # Method 2: PaddleOCR
        try:
            text_paddle = self.paddleocr.ocr(image_path, cls=True)
            if text_paddle:
                extracted = ''.join([word[1][0] for line in text_paddle for word in line])
                results.append(OCRResult(extracted, 0.75, 'paddleocr'))
        except Exception as e:
            print(f"PaddleOCR error: {e}")
        
        # Voting mechanism
        return self._vote_results(results)
    
    @staticmethod
    def _vote_results(results: List):
        if not results:
            return OCRResult("", 0.0, "none")
        
        text_counts = {}
        for r in results:
            text_counts[r.text] = text_counts.get(r.text, []) + [r]
        
        best_text = max(text_counts.items(), key=lambda x: len(x[1]))
        votes = best_text[1]
        
        avg_conf = np.mean([v.confidence for v in votes])
        if len(votes) > 1:
            avg_conf = min(0.95, avg_conf * 1.1)
        
        return OCRResult(best_text[0], avg_conf, f"voted({len(votes)})")
```

---

## 📋 Phase 2.5e: Testing & Validation

### Test Suite Structure

```python
import pytest
from pathlib import Path

class TestCaptchaSolver:
    def test_text_captcha_recognition(self, solver):
        test_images = Path('/dev/Delqhi-Platform/training').glob('**/Text_Captcha/*.jpg')
        results = []
        for img in test_images[:10]:
            result = solver.ocr_text_captcha(str(img))
            results.append(result.confidence)
        
        avg_confidence = np.mean(results)
        assert avg_confidence > 0.75
    
    def test_classification_accuracy(self, solver):
        for class_name in solver.yolo_model.names.values():
            test_dir = Path(f'/dev/Delqhi-Platform/training/{class_name}')
            if test_dir.exists():
                images = list(test_dir.glob('*.jpg'))[:5]
                correct = sum(1 for img in images if solver.classify_captcha(str(img))[0] == class_name)
                accuracy = correct / len(images) if images else 0
                print(f"{class_name}: {accuracy:.1%}")
```

---

## 📊 Expected Outcomes

### Phase 2.5 Deliverables
- Tesseract + PaddleOCR installed and configured
- CaptchaSolverPipeline class (300+ lines)
- OCR voting mechanism implemented
- Integration with YOLO model from Phase 2.4e
- Unit tests (50+ test cases)
- Documentation (500+ lines)

### Performance Targets
- **Text CAPTCHA**: 80%+ accuracy, <1s per image
- **Image Click**: 75%+ accuracy, <0.5s per image
- **Overall Pipeline**: < 2s per CAPTCHA (classification + solving)

### Success Criteria
- Tesseract installed and working
- PaddleOCR installed and working
- YOLO model loads successfully
- OCR voting consensus implemented
- 10+ test cases passing
- Documentation complete
- Ready for Phase 3 integration

---

## 📅 Timeline (Session 11)

| Phase | Est. Time |
|-------|-----------|
| 2.5a - Tesseract install | 30 min |
| 2.5b - PaddleOCR install | 30 min |
| 2.5c - Pipeline design | 30 min |
| 2.5d - Implementation | 90 min |
| 2.5e - Testing | 60 min |
| Documentation | 30 min |
| **TOTAL** | **~4 hours** |

---

## 🔗 References

**Tesseract:**
- GitHub: https://github.com/UB-Mannheim/pytesseract

**PaddleOCR:**
- GitHub: https://github.com/PaddlePaddle/PaddleOCR

**YOLO v8:**
- Classification: https://docs.ultralytics.com/tasks/classify/

**Existing Implementation:**
- ddddocr: `/Docker/builders/builder-1.1-captcha-worker/src/utils/ocr_detector.py`
- CAPTCHA Solver: `/app/tools/captcha_solver.py`
