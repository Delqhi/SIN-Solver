# Phase 2.5 Execution Checklist
**Ready When:** OCR packages installed  
**Status:** ⏳ WAITING FOR OCR INSTALL (ETA 13:50)

---

## ✅ PRE-EXECUTION VERIFICATION (Do First - 5 minutes)

### 1. Verify All Packages Installed
```bash
source /Users/jeremy/dev/Delqhi-Platform/ocr_env/bin/activate

# Test each package
python3 -c "import pytesseract; print('✅ pytesseract')" || echo "❌ MISSING"
python3 -c "import paddleocr; print('✅ paddleocr')" || echo "❌ MISSING"
python3 -c "import cv2; print('✅ opencv-python')" || echo "❌ MISSING"
python3 -c "import PIL; print('✅ pillow')" || echo "❌ MISSING"
python3 -c "import numpy; print('✅ numpy')" || echo "❌ MISSING"

# Expected output: 5 checkmarks
```

### 2. Verify System Tesseract
```bash
which tesseract && tesseract --version | head -1

# Expected: /opt/homebrew/bin/tesseract
#           tesseract 5.5.2 ...
```

### 3. Verify YOLO Installation (Global)
```bash
python3 -c "from ultralytics import YOLO; print('✅ YOLO v8 available')" || echo "❌ MISSING"

# Expected: ✅ YOLO v8 available
```

### 4. Check YOLO Model Status
```bash
ls -lh /Users/jeremy/runs/classify/runs/classify/captcha_classifier3/weights/best.pt

# Expected: -rw-r--r--  5.7M  ... best.pt
#           (Model file should exist)
```

---

## 🧪 TEST EXECUTION (20-30 minutes)

### Phase 2.5f - OCR Package Verification
```bash
cd /Users/jeremy/dev/Delqhi-Platform
source ocr_env/bin/activate

# Run just OCR engine tests (5 min)
python3 app/test_captcha_solver_pipeline.py::TestOCREngines -v

# Expected: 4 tests, 3-4 passing (ddddocr may be optional)
# Sample: test_tesseract_extraction PASS
#         test_paddleocr_extraction PASS
#         test_ocr_consistency PASS
```

### Phase 2.5g - Consensus Voting Tests
```bash
python3 app/test_captcha_solver_pipeline.py::TestOCRConsensus -v

# Expected: 3 tests, all passing
# Verifies: Voting logic, agreement bonus, confidence calculation
```

### Phase 2.5h - YOLO Classification Tests
```bash
python3 app/test_captcha_solver_pipeline.py::TestYOLOClassification -v

# Expected: 2 tests
# Status: MAY FAIL if model not ready yet (NORMAL)
# Once model ready: Both tests should PASS
```

### Phase 2.5i - Full Integration Tests
```bash
python3 app/test_captcha_solver_pipeline.py::TestPipelineIntegration -v

# Expected: 4 tests
# Tests: End-to-end pipeline, routing logic, error handling
# Status: Some may fail until YOLO model ready
```

### Phase 2.5j - Performance Tests
```bash
python3 app/test_captcha_solver_pipeline.py::TestPerformanceMetrics -v

# Expected: 3 tests
# Measures: Speed, accuracy, consensus agreement rate
# Benchmarks: < 2s per CAPTCHA, >= 80% accuracy
```

### Run ALL Tests
```bash
python3 app/test_captcha_solver_pipeline.py -v

# Expected summary:
# 16+ total tests
# X PASS (should increase as YOLO model trains)
# Y XFAIL (expected failures - YOLO model not ready)
# Z SKIP (any skipped tests)
```

---

## 🎯 SUCCESS CRITERIA

### Minimum Pass Rate (Phase 2.5f-j)
| Test Class | Pass Rate | Status |
|-----------|-----------|--------|
| TestOCREngines | 75%+ | REQUIRED |
| TestOCRConsensus | 100% | REQUIRED |
| TestYOLOClassification | 0% (OK) | EXPECTED FAIL (model training) |
| TestPipelineIntegration | 50%+ | PARTIAL OK |
| TestPerformanceMetrics | 50%+ | PARTIAL OK |

### When YOLO Model Complete
- All TestOCREngines tests: PASS
- All TestOCRConsensus tests: PASS
- All TestYOLOClassification tests: PASS
- All TestPipelineIntegration tests: PASS
- All TestPerformanceMetrics: PASS (< 2s/CAPTCHA)

---

## 🧩 OPTIONAL - EXTENDED TESTING (If Time)

### Test with Sample Images
```bash
cd /Users/jeremy/dev/Delqhi-Platform
source ocr_env/bin/activate

python3 << 'PYEOF'
from app.captcha_solver_pipeline import CaptchaSolverPipeline

# Test on sample CAPTCHA types
pipeline = CaptchaSolverPipeline(
    yolo_model_path="/Users/jeremy/runs/classify/runs/classify/captcha_classifier3/weights/best.pt"
)

# Test Text CAPTCHA
result = pipeline.solve_captcha(
    image_path="/Users/jeremy/dev/Delqhi-Platform/training/Text_CAPTCHA/sample_001.jpg",
    captcha_type="Text"
)
print(f"Solved Text CAPTCHA: {result['solved_text']}")
print(f"Confidence: {result['confidence']:.2%}")
PYEOF
```

### Performance Benchmarking
```bash
python3 << 'PYEOF'
import time
from app.captcha_solver_pipeline import CaptchaSolverPipeline

pipeline = CaptchaSolverPipeline(model_ready=True)

# Measure performance
times = []
for i in range(10):
    start = time.time()
    result = pipeline.solve_captcha(f"image_{i}.jpg", "Text")
    times.append(time.time() - start)

print(f"Average: {sum(times)/len(times):.3f}s")
print(f"P95: {sorted(times)[9]:.3f}s")
print(f"Target: < 2s/CAPTCHA")
PYEOF
```

---

## 📊 MONITORING DURING TESTS

### Watch YOLO Training Progress
```bash
# In separate terminal
watch -n 30 'tail -5 /Users/jeremy/dev/Delqhi-Platform/training/training_session_10.log'
```

### Monitor System Resources
```bash
# In separate terminal
top -u simoneschulze
# Watch for: CPU usage, Memory, no thermal throttling
```

---

## 🔄 AFTER TESTS COMPLETE

### 1. Document Results
```bash
cat >> /Users/jeremy/dev/Delqhi-Platform/training/training-lastchanges.md << 'LOG'

## Phase 2.5 Test Results
- Total Tests: X
- Passed: Y
- Failed: Z (expected YOLO failures)
- Duration: M minutes
- Performance: N ms/CAPTCHA average
LOG
```

### 2. Commit Changes
```bash
cd /Users/jeremy/dev/Delqhi-Platform
git add -A
git commit -m "feat: Phase 2.5 OCR pipeline - complete tests and integration"
git log --oneline -5
```

### 3. Prepare Phase 3
```bash
# Phase 3: Docker Container Integration
# File: Phase 3 planning (solver-1.1-captcha-worker)

ls -la Docker/builders/builder-1.1-captcha-worker/
# Expected: Dockerfile, src/, config/, etc.
```

---

## 🎯 COMPLETION CHECKLIST

When all tests pass and documentation is complete:

- [ ] All OCR packages verified installed
- [ ] All 16+ tests executed
- [ ] OCR engine tests: PASS (75%+)
- [ ] Consensus voting tests: PASS (100%)
- [ ] YOLO integration: Ready (or passing)
- [ ] Performance benchmarks: < 2s/CAPTCHA
- [ ] Sample image testing: PASS
- [ ] Results documented in training-lastchanges.md
- [ ] Changes committed to git
- [ ] Phase 3 prep: Docker integration planned

**Phase 2.5 Status:** ✅ COMPLETE when all items checked

---

## 🆘 TROUBLESHOOTING

### If OCR Tests Fail
```bash
# Check installation
source ocr_env/bin/activate
pip list | grep -E "pytesseract|paddleocr|opencv|pillow|numpy"

# Reinstall if needed
pip install --force-reinstall pytesseract paddleocr
```

### If YOLO Tests Fail (Expected Until Model Complete)
```bash
# Check model existence
ls -lh /Users/jeremy/runs/classify/runs/classify/captcha_classifier3/weights/best.pt

# If missing, training still running
# Check: python3 << 'PYEOF'
# import csv
# rows = list(csv.DictReader(open("/path/to/results.csv")))
# print(f"Training: {len(rows)}/20 epochs")
# PYEOF
```

### If Test Suite Hangs
```bash
# Kill stuck processes
pkill -f "test_captcha"
ps aux | grep python | grep test

# Restart tests
python3 app/test_captcha_solver_pipeline.py -v --timeout=30
```

---

## ✅ READY WHEN

This checklist is **READY TO EXECUTE** when:
1. ✅ This file created
2. ✅ OCR packages fully installed
3. ✅ YOLO model training progressing (Epoch 4+ completed)
4. ✅ All phase 2.5 code files verified

**Target Execution:** 13:50 PM (when OCR install complete)
**Estimated Duration:** 30-60 minutes (until full Phase 2.5 complete)
