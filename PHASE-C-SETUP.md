# MTCaptcha Test Suite - Phase C Implementation Guide

## Prerequisites Setup

### 1. Install Required Libraries

```bash
# Install Python dependencies
pip install playwright google-generativeai groq ultralytics

# Install Playwright browsers
playwright install

# Verify installations
python3 -c "import playwright; print('✓ Playwright OK')"
python3 -c "import google.generativeai; print('✓ Gemini OK')"
python3 -c "import groq; print('✓ Groq OK')"
python3 -c "import ultralytics; print('✓ YOLOv8 OK')"
```

### 2. Get API Keys

#### Gemini Flash (via Google AI Studio)
```bash
# Visit: https://aistudio.google.com/app/apikeys
# Create new API key
# Set environment variable:
export GEMINI_API_KEY="your-gemini-key-here"

# Verify
echo $GEMINI_API_KEY
```

**Why Gemini?**
- Free tier: 60 requests/minute
- Vision capabilities for CAPTCHA solving
- High accuracy for OCR
- Part of Google Antigravity integration

#### Groq API (FREE - Required)
```bash
# Visit: https://console.groq.com
# Sign up (FREE)
# Create API key
# Set environment variable:
export GROQ_API_KEY="your-groq-key-here"

# Verify
echo $GROQ_API_KEY
```

**Why Groq?**
- 100% FREE (no credit card required)
- Fast inference (~100ms)
- Fallback for text analysis
- Excellent for consensus validation

### 3. Verify Configuration

```bash
# Check all API keys are set
python3 << 'EOF'
import os

keys = {
    "GEMINI_API_KEY": os.getenv("GEMINI_API_KEY"),
    "GROQ_API_KEY": os.getenv("GROQ_API_KEY"),
}

print("API Configuration Status:")
print("-" * 50)
for key, value in keys.items():
    if value:
        # Show only first 10 and last 5 chars for security
        masked = f"{value[:10]}...{value[-5:]}"
        print(f"✓ {key}: {masked}")
    else:
        print(f"⚠ {key}: NOT SET")

all_set = all(keys.values())
if all_set:
    print("\n✓ All API keys configured correctly")
else:
    print("\n❌ Missing API keys - see setup instructions above")
EOF
```

---

## Running Phase C: 3-Agent Consensus Solving

### Quick Start

```bash
# Navigate to test directory
cd /Users/jeremy/dev/SIN-Solver/tests

# Run Phase C implementation
python3 test_mtcaptcha.py
```

### Expected Output

```
======================================================================
MTCaptcha Validation Test Suite
======================================================================
Test URL: https://www.mtcaptcha.com/de/test-multiple-captcha
Screenshots: /tmp/mtcaptcha-test

[PHASE A] Browser Setup
----------------------------------------------------------------------
✓ Playwright available

[PHASE B] Navigate and Capture
----------------------------------------------------------------------
Navigating to https://www.mtcaptcha.com/de/test-multiple-captcha...
✓ Screenshot saved: 01-mtcaptcha-page.png
✓ Page loaded - Found 91 captcha references

[PHASE C] 3-Agent Consensus Solving
----------------------------------------------------------------------
Agents:
  1. Gemini Flash (vision + OCR) - Primary
  2. Groq (text recognition)    - Fallback
  3. YOLOv8 (classification)    - Fallback

Confidence threshold: 95%

✓ AI libraries available
✓ API keys configured

Navigating to https://www.mtcaptcha.com/de/test-multiple-captcha...
Found 5 captchas to solve (limited to 5 for testing)

Solving captcha 1/5...
  Type: text
  Gemini: 'abcd1234' (confidence: 90%)
  Groq: 'abcd1234' (confidence: 70%)
  ✓ Consensus: 'abcd1234' (confidence: 80%, agreement: 100%)

Solving captcha 2/5...
  Type: text
  Gemini: 'xyz9876' (confidence: 90%)
  Groq: 'xyz9876' (confidence: 70%)
  ✓ Consensus: 'xyz9876' (confidence: 80%, agreement: 100%)

Solving captcha 3/5...
  Type: text
  Gemini: 'test123' (confidence: 90%)
  Groq: 'different' (confidence: 70%)
  ⚠ Low confidence: 80% (skipping submission)

Solving captcha 4/5...
  Type: text
  Gemini: 'captcha5' (confidence: 90%)
  Groq: 'captcha5' (confidence: 70%)
  ✓ Consensus: 'captcha5' (confidence: 80%, agreement: 100%)

Solving captcha 5/5...
  Type: text
  Gemini: 'final99' (confidence: 90%)
  Groq: 'final99' (confidence: 70%)
  ✓ Consensus: 'final99' (confidence: 80%, agreement: 100%)

✓ Phase C complete: 4/5 solved

[PHASE D] Submit and Verify
----------------------------------------------------------------------
Navigating to https://www.mtcaptcha.com/de/test-multiple-captcha...
✓ captcha-1: Accepted
✓ captcha-2: Accepted
✓ captcha-4: Accepted
✓ captcha-5: Accepted

✓ Phase D complete: 4 submitted, 4 accepted

[PHASE E] Analysis
----------------------------------------------------------------------
✓ Results saved: results.json

======================================================================
TEST SUMMARY
======================================================================
✓ Total Captchas: 5
✓ Solved: 4/5 (80.0%)
✓ Failed: 1
✓ Avg Solve Time: 2.45s

Success Criteria Check:
  ✓ Text Captcha >= 95%
  ⚠ Solve Time < 3s
  ✓ False Positive Rate < 1%

⚠ DECISION: NEEDS IMPROVEMENT

======================================================================

✓ Test suite complete
✓ Results saved to: /tmp/mtcaptcha-test
```

---

## Output Files

All test results are saved to `/tmp/mtcaptcha-test/`:

### Key Files
- **01-mtcaptcha-page.png** - Full page screenshot (91 captchas)
- **02-captcha-{01-05}.png** - Individual captcha screenshots (Phase C)
- **results.json** - Detailed test results in JSON format
- **TEST_REPORT.md** - Previous analysis document

### Results JSON Structure
```json
{
  "timestamp": "2026-01-29T...",
  "url": "https://www.mtcaptcha.com/de/test-multiple-captcha",
  "tests": [
    {
      "captcha_id": "captcha-1",
      "solution": "abcd1234",
      "confidence": 80.0,
      "agents_agreeing": 2,
      "status": "solved",
      "submission_status": "accepted"
    }
  ],
  "summary": {
    "total": 5,
    "passed": 4,
    "failed": 1,
    "accuracy": 80.0,
    "avg_solve_time": 2.45
  }
}
```

---

## Troubleshooting

### Issue: "GEMINI_API_KEY not set"
```bash
# Solution: Set environment variable
export GEMINI_API_KEY="your-key"

# Verify it's set
echo $GEMINI_API_KEY

# Make it permanent (add to ~/.zshrc or ~/.bash_profile)
echo 'export GEMINI_API_KEY="your-key"' >> ~/.zshrc
source ~/.zshrc
```

### Issue: "GROQ_API_KEY not set"
```bash
# Get free key at: https://console.groq.com
# Set environment variable
export GROQ_API_KEY="your-key"

# Verify
echo $GROQ_API_KEY
```

### Issue: "Playwright not available"
```bash
# Install Playwright
pip install playwright

# Install browsers
playwright install

# Verify
python3 -c "from playwright.async_api import async_playwright; print('OK')"
```

### Issue: API calls failing
```bash
# Check internet connection
ping google.com

# Verify API keys are correct (no typos)
echo $GEMINI_API_KEY | wc -c  # Should be > 20 chars
echo $GROQ_API_KEY | wc -c     # Should be > 20 chars

# Test API connectivity
python3 << 'EOF'
import google.generativeai as genai
import os

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.0-flash")
response = model.generate_content("Say OK")
print("✓ Gemini API working:", response.text[:20])
EOF
```

### Issue: Low accuracy (<80%)
```bash
# This is expected for initial run
# Next steps:
# 1. Review failed captchas in /tmp/mtcaptcha-test/02-captcha-*.png
# 2. Analyze confidence scores in results.json
# 3. Check if API models are in correct mode
# 4. Consider retraining YOLOv8 models

# For now, re-run to get different captcha samples
python3 test_mtcaptcha.py
```

---

## Next Steps (Phase D & E)

### Phase D: Submit and Verify
After Phase C produces 95%+ accuracy:
```bash
# Automatic submission and verification
# Updates results.json with acceptance/rejection
# Logs successful submissions
```

### Phase E: Analysis
```bash
# Generate final report with:
# - Accuracy metrics by captcha type
# - Consensus agreement rates
# - Deployment recommendation
# - 2captcha readiness assessment
```

---

## Success Criteria (MUST HIT BEFORE 2CAPTCHA)

| Metric | Target | Phase |
|--------|--------|-------|
| Text Captcha Accuracy | 95%+ | C-E |
| Image Captcha Accuracy | 85%+ | C-E |
| Consensus Agreement | 95%+ | C-E |
| Solve Time | < 3 sec | C-E |
| False Positive Rate | < 1% | D-E |

---

## Production Deployment (After Validation)

Once Phase E confirms readiness:

```bash
# 1. Create 2captcha account
# https://2captcha.com

# 2. Set up captcha worker service
cd /Users/jeremy/dev/SIN-Solver/Docker/builders/builder-1.1-captcha-worker
docker-compose up -d

# 3. Configure 2captcha integration
export CAPTCHA_API_URL="https://2captcha.com"
export CAPTCHA_API_KEY="your-2captcha-key"

# 4. Start sending captchas
# Money earned per solved CAPTCHA based on type and difficulty
```

---

## Documentation References

- **Main Setup:** `/Users/jeremy/dev/SIN-Solver/README.md`
- **CAPTCHA Worker:** `/Users/jeremy/dev/SIN-Solver/Docker/builders/builder-1.1-captcha-worker/README.md`
- **Deployment Guide:** `/Users/jeremy/dev/SIN-Solver/docs/DEPLOYMENT-GUIDE.md`
- **API Reference:** `/Users/jeremy/dev/SIN-Solver/docs/API-REFERENCE.md`

---

**Last Updated:** 2026-01-29  
**Status:** Phase C Implementation Complete ✓  
**Next:** Run test and validate Phase D & E
