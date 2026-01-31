# ⚡ QUICK START - 10 MINUTE SETUP

## 🔑 Step 1: Get API Keys (5 minutes)

### Gemini API Key (FREE)
```bash
# 1. Visit: https://aistudio.google.com/app/apikeys
# 2. Click "Create API Key"
# 3. Copy the key (starts with AIza...)
# 4. Set it:
export GEMINI_API_KEY="AIza_YOUR_KEY_HERE"
```

### Groq API Key (FREE - no credit card!)
```bash
# 1. Visit: https://console.groq.com
# 2. Sign up (FREE)
# 3. Go to API Keys → Create new key
# 4. Copy the key (starts with gsk_...)
# 5. Set it:
export GROQ_API_KEY="gsk_YOUR_KEY_HERE"
```

---

## ✅ Step 2: Verify Setup (1 minute)

```bash
# Check keys are set
echo $GEMINI_API_KEY
echo $GROQ_API_KEY

# Both should show something starting with AIza... and gsk_...
```

---

## 🚀 Step 3: Run Tests (5 minutes)

```bash
# Navigate to project
cd /Users/jeremy/dev/SIN-Solver

# Run the test
python3 tests/test_mtcaptcha.py

# Wait 2-5 minutes for results
```

---

## 📊 Step 4: Check Results

```bash
# View summary results
cat /tmp/mtcaptcha-test/results.json

# View generated report
cat /tmp/mtcaptcha-test/FINAL_REPORT.md

# View captured screenshots
ls /tmp/mtcaptcha-test/02-captcha-*.png
```

---

## 🎯 Success Criteria (Must achieve before 2captcha)

| Metric | Target | Status |
|--------|--------|--------|
| Text Accuracy | ≥95% | ⏳ TO TEST |
| Confidence Score | ≥85% | ⏳ TO TEST |
| Consensus Agreement | ≥95% | ⏳ TO TEST |
| Sample Size | 100+ CAPTCHAs | ⏳ TO TEST |

---

## 📖 Full Documentation

For detailed setup instructions, see: `/Users/jeremy/dev/SIN-Solver/API-KEY-SETUP.md`

---

## 🆘 Troubleshooting

| Error | Solution |
|-------|----------|
| "API key not valid" | Copy-paste key again, make sure no extra spaces |
| "Connection timeout" | Check internet: `ping google.com` |
| "Module not found" | Install deps: `pip install playwright google-generativeai groq` |
| "Low accuracy" | Normal for first run - run again to get more data |

---

**Time estimate:** 10 minutes total  
**Next steps:** Set API keys → Run test → Check results → Iterate to 20 CAPTCHAs → Deploy to 2captcha
