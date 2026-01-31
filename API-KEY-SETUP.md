# 🔑 API KEY SETUP GUIDE FOR MTCAPTCHA PHASE C TEST

**Status:** ❌ API keys NOT configured  
**Last Updated:** 2026-01-30

---

## 🚨 CRITICAL: You Must Set These Before Running Tests

### API Key 1: Google Gemini Flash (Vision AI)

**Why needed:**
- Reads CAPTCHA images using vision AI
- Provides primary OCR capability
- FREE tier: 60 requests/minute (sufficient for testing)

**How to get:**

1. **Open** https://aistudio.google.com/app/apikeys
   - (Or go to Google AI Studio → API Keys)

2. **Create new API key:**
   - Click blue button: "Create API Key"
   - Select "Create API key in new Google Cloud project" OR existing project
   - Wait for project setup (2-3 seconds)
   - Key appears in popup (starts with `AIza...`)

3. **Copy the key** (click copy icon next to key)

4. **Set environment variable:**
   ```bash
   export GEMINI_API_KEY="AIzaSy_YOUR_ACTUAL_KEY_HERE"
   ```

5. **Verify it's set:**
   ```bash
   echo $GEMINI_API_KEY
   # Should output: AIzaSy_YOUR_ACTUAL_KEY_HERE
   ```

**⚠️ IMPORTANT:** This key is personal - don't share it in logs or screenshots!

---

### API Key 2: Groq API (Text Validation)

**Why needed:**
- Validates Gemini's answers using text AI
- Provides consensus voting for confidence
- 100% FREE - no credit card required
- Fast inference (optimized for speed)

**How to get:**

1. **Open** https://console.groq.com

2. **Sign up (it's FREE):**
   - Click "Sign Up" button
   - Use Google/GitHub login OR email signup
   - **NO credit card required**
   - Verify email if needed

3. **Create API key:**
   - Go to "API Keys" section (left sidebar)
   - Click "Create API Key"
   - Copy the key (appears in modal)

4. **Set environment variable:**
   ```bash
   export GROQ_API_KEY="gsk_YOUR_ACTUAL_KEY_HERE"
   ```

5. **Verify it's set:**
   ```bash
   echo $GROQ_API_KEY
   # Should output: gsk_YOUR_ACTUAL_KEY_HERE
   ```

**Rate Limits:**
- Free tier: Very generous (1000s of requests/day)
- Sufficient for testing and development
- Can be increased if needed

---

## ✅ COMPLETE SETUP (Step-by-step)

### In Your Terminal:

```bash
# Step 1: Open Gemini API key page
echo "Opening https://aistudio.google.com/app/apikeys"
# (You'll manually get the key from this page)

# Step 2: Copy your Gemini key and set it
export GEMINI_API_KEY="YOUR_GEMINI_KEY_HERE"

# Step 3: Verify Gemini key
echo $GEMINI_API_KEY
# Expected: AIza... (starts with AIza)

# Step 4: Open Groq console
echo "Opening https://console.groq.com"
# (Sign up and create API key)

# Step 5: Copy your Groq key and set it
export GROQ_API_KEY="YOUR_GROQ_KEY_HERE"

# Step 6: Verify Groq key
echo $GROQ_API_KEY
# Expected: gsk_... (starts with gsk_)

# Step 7: Run the validation script
python3 << 'VERIFY'
import os
gemini = os.getenv("GEMINI_API_KEY")
groq = os.getenv("GROQ_API_KEY")

print("=" * 60)
print("API KEY VERIFICATION")
print("=" * 60)
print(f"Gemini: {'✓ SET' if gemini else '✗ NOT SET'}")
print(f"Groq:   {'✓ SET' if groq else '✗ NOT SET'}")
print("=" * 60)

if gemini and groq:
    print("\n✓ READY TO RUN TESTS!")
    print("  Command: python3 tests/test_mtcaptcha.py")
else:
    print("\n✗ SETUP INCOMPLETE - Set both keys above")
VERIFY

# Step 8: Navigate to project and run test
cd /Users/jeremy/dev/SIN-Solver
python3 tests/test_mtcaptcha.py
```

---

## 🔐 Security Best Practices

**DO:**
- ✅ Keep keys in environment variables
- ✅ Set keys in terminal session (they expire when you close terminal)
- ✅ Use different keys for development vs production
- ✅ Rotate keys periodically
- ✅ Monitor usage in API dashboards

**DON'T:**
- ❌ Commit keys to GitHub
- ❌ Share keys in Slack/email/chat
- ❌ Hardcode keys in Python files
- ❌ Log keys in error messages
- ❌ Use production keys for testing

**If you accidentally leak a key:**
1. Immediately revoke it in the respective console
2. Create a new key
3. Update environment variable
4. Test again

---

## 🧪 Test Configuration

Once you have API keys set, the test will:

1. **Connect to MTCaptcha test site** (real website, free testing)
2. **Detect CAPTCHA elements** (up to 5 for first run)
3. **Solve using 3-agent consensus:**
   - Gemini Flash (vision) → confidence: 90%
   - Groq (validation) → confidence: 70%
   - Consensus score → confidence: 80%
4. **Submit solutions** (if confidence >= 95%)
5. **Verify results** (accepted/rejected)
6. **Generate report** with accuracy metrics

**Expected runtime:** 2-5 minutes for 5 CAPTCHAs

---

## 📊 What Success Looks Like

### Terminal Output (Success):
```
Phase A: Infrastructure Setup
  ✓ Browser initialization: PASS
  ✓ Page navigation: PASS

Phase B: Screenshot & Detection
  ✓ Captured page screenshot
  ✓ Found 5 CAPTCHA elements

Phase C: Consensus Solving
  ✓ captcha-1: ABC123 (confidence: 85.5%, agents: 2)
  ✓ captcha-2: XYZ789 (confidence: 88.0%, agents: 2)
  ✓ captcha-3: DEF456 (confidence: 72.5%, agents: 1) SKIPPED (low confidence)
  ✓ captcha-4: GHI012 (confidence: 91.2%, agents: 2)
  ✓ captcha-5: JKL345 (confidence: 86.8%, agents: 2)

Phase D: Submission
  ✓ Submitted 4 high-confidence answers
  ✓ Skipped 1 low-confidence answer

Phase E: Analysis
  RESULTS:
    Total:    5
    Passed:   4
    Failed:   0
    Accuracy: 100%
    Avg Confidence: 86.3%

✓ TEST PASSED: READY FOR PRODUCTION DEPLOYMENT
```

### Results File (`/tmp/mtcaptcha-test/results.json`):
```json
{
  "summary": {
    "total": 5,
    "passed": 4,
    "failed": 0,
    "accuracy": 100.0,
    "avg_confidence": 86.3
  },
  "tests": [
    {
      "captcha_id": "captcha-1",
      "solution": "ABC123",
      "confidence": 85.5,
      "agents_agreeing": 2,
      "status": "solved"
    }
  ]
}
```

---

## 🚨 If It Doesn't Work

### "API key not valid" error:
- **Check:** Is the key correct? (copy-paste again)
- **Check:** Did you export it? (run `echo $GEMINI_API_KEY`)
- **Check:** Is it the right format? (Gemini: `AIza...`, Groq: `gsk_...`)
- **Fix:** Delete key, create new one, export again

### "Connection timeout" error:
- **Check:** Internet connection (try `ping google.com`)
- **Check:** API status pages (are services down?)
- **Fix:** Wait 1-2 minutes and retry

### "Low accuracy" results (<80%):
- **This is normal for first run** - CAPTCHAs vary
- **Run multiple times** - Get more data points
- **Check screenshots** - Manually verify `02-captcha-*.png`
- **Increase test size** - Change from 5 to 20 CAPTCHAs

---

## ✅ Verification Checklist

Before running `python3 tests/test_mtcaptcha.py`, verify:

- [ ] GEMINI_API_KEY set (echo $GEMINI_API_KEY shows key starting with AIza)
- [ ] GROQ_API_KEY set (echo $GROQ_API_KEY shows key starting with gsk_)
- [ ] test_mtcaptcha.py exists (ls tests/test_mtcaptcha.py)
- [ ] No syntax errors (python3 -m py_compile tests/test_mtcaptcha.py)
- [ ] Internet connection working (ping google.com)
- [ ] /tmp/mtcaptcha-test/ directory exists or will be created

Once all ✓ complete, run test:
```bash
cd /Users/jeremy/dev/SIN-Solver
python3 tests/test_mtcaptcha.py
```

---

## 📝 Next Steps After Setup

1. **Run initial test** (5 CAPTCHAs) - see accuracy baseline
2. **Run expanded test** (20 CAPTCHAs) - get statistical significance
3. **Validate results** - check all success criteria
4. **Deploy to 2captcha** - production environment

**Success criteria to hit before 2captcha deployment:**
- Text Accuracy: ≥95%
- Consensus Agreement: ≥95%
- False Positive Rate: <1%
- Sample Size: 100+ CAPTCHAs tested

---

**Status:** Ready for API key setup  
**Estimated time:** 5 minutes for API keys + 5 minutes for test run = **10 minutes total**  
**Next:** Set environment variables and run test!
