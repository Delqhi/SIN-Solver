# Local Captcha Test Suite - Usage Guide

## 🎯 Overview

This test suite provides a **completely local, risk-free environment** to test captcha-solving strategies without any external websites or ban risks.

**File:** `test-captchas.html` (36KB, self-contained)

## 🚀 Quick Start

### Option 1: Direct Browser Open
```bash
# Just open in your browser (macOS)
open /Users/jeremy/dev/SIN-Solver/worker-rules/worker-captcha/test-captchas.html

# Or Windows/Linux
file:///Users/jeremy/dev/SIN-Solver/worker-rules/worker-captcha/test-captchas.html
```

### Option 2: Local HTTP Server (Recommended)
```bash
cd /Users/jeremy/dev/SIN-Solver/worker-rules/worker-captcha
python3 -m http.server 8000
# Then open: http://localhost:8000/test-captchas.html
```

## 📋 Test Sections Included

### 1. **Text Captcha** (5 challenges)
- **Type:** Distorted text recognition
- **Difficulty:** Easy → Hard
- **Real-world:** Most common captcha type
- **Test:** OCR-based solving approaches

Examples:
- `ABC123` (Easy) - Letters + numbers
- `XYZ789` (Medium) - Capital letters + digits  
- `P7K2WQ` (Hard) - 6 mixed characters

### 2. **Math Captcha** (3 challenges)
- **Type:** Simple arithmetic problems
- **Difficulty:** Easy → Medium
- **Real-world:** Used by many sites
- **Test:** Logic-based solving

Examples:
- `12 + 7 = ?` (Answer: 19)
- `45 - 13 = ?` (Answer: 32)
- `8 × 6 = ?` (Answer: 48)

### 3. **Image Selection** (3 challenges)
- **Type:** Click all images matching category
- **Format:** Grid with multiple selections
- **Real-world:** hCaptcha, Google reCAPTCHA v3+
- **Test:** Visual recognition and multi-selection

Examples:
- "Click all CATS" (2 correct out of 5)
- "Click all VEHICLES" (2 correct out of 5)
- "Click all TREES" (2 correct out of 5)

### 4. **Timer Challenge** (1 challenge)
- **Type:** Time-pressure test
- **Duration:** 20-second countdown
- **Problem:** `23 × 4 = ?` (Answer: 92)
- **Real-world:** Tests decision-making under pressure
- **Test:** Speed vs accuracy trade-off

### 5. **3-Agent Consensus Testing** (3 examples)
- **Purpose:** Validate if 3 different solving strategies reach consensus
- **Agents Simulated:**
  1. OCR/Calculator Agent (pattern-based)
  2. Logic/Pattern Agent (rule-based)
  3. ML Agent (model-based)
- **Success Metric:** 2+ agents agree on correct answer
- **Example Output:**
  ```
  Captcha: "DEMO7"
  - OCR Agent: DEMO7 ✓
  - Pattern Agent: DEMO7 ✓
  - ML Agent: DEMO7 ✓
  CONSENSUS REACHED (3/3 agents)
  ```

## 📊 Real-time Statistics

Dashboard tracks:
- **Total Solved:** Number of correct answers
- **Success Rate:** Percentage of attempts that were correct
- **Attempts:** Total number of submissions
- **Consensus Rate:** % of consensus tests that reached 2+ agent agreement

## 🎓 Testing Strategy

### For Single Agent:
1. Solve each captcha manually
2. Note success patterns
3. Identify weaknesses (e.g., "I struggle with distorted text")

### For 3-Agent Consensus:
1. Note each agent's individual answer
2. Check if consensus is reached (2+ agents agree)
3. Compare consensus answer vs correct answer
4. Refine strategy when consensus fails

### For Time Pressure:
1. Start the timer challenge
2. Complete under 20 seconds
3. Track accuracy at speed
4. Balance speed/accuracy needs

## 💡 Real-World Applications

### Text Captcha Solver
```python
# After testing in local suite:
- Train OCR model on distorted letters
- Test with text-captchas.html locally FIRST
- Deploy to solver after validation
```

### Image Selector
```python
# After testing consensus:
- Train YOLO v8 on image categories
- Run 3 inference agents
- Select answer only if 2+ agents agree
- Avoid false positives (ban risk)
```

### Timer Challenge Strategy
```python
# Test what's achievable in 20 seconds:
- Fastest correct: 2-3 seconds per captcha
- Slowest acceptable: 15 seconds per captcha
- Real sites may have different timeouts
```

## 🔧 Customization

### Add New Text Captcha
Edit `test-captchas.html` → Find `const textCaptchas = [` and add:
```javascript
{ answer: 'YOUR_TEXT', difficulty: 'hard', hint: 'Your hint' }
```

### Add New Math Problem
Find `const mathCaptchas = [` and add:
```javascript
{ problem: '50 + 25', answer: '75', difficulty: 'medium' }
```

### Add New Image Challenge
Find `const imageChallenges = [` and add:
```javascript
{
    target: 'dog',
    images: ['dog', 'cat', 'dog', 'bird', 'car'],
    correct: [0, 2]  // indices of correct images
}
```

## ⚖️ Safety & Risk Management

✅ **NO EXTERNAL WEBSITES** - Complete isolation
✅ **NO REAL ACCOUNTS** - Can't get banned
✅ **NO RATE LIMITING** - Test unlimited attempts
✅ **NO IP BLOCKING** - Safe testing environment
✅ **NO AUTHENTICATION** - Just open and test

## 📈 Performance Metrics

Track over time:
```
Week 1: Success Rate = 60%
Week 2: Success Rate = 75% (improving!)
Week 3: Success Rate = 85% (good progress!)
```

## 🐛 Troubleshooting

**Q: File won't open in browser?**
A: Try serving via Python server: `python3 -m http.server 8000`

**Q: JavaScript isn't running?**
A: Enable JavaScript in your browser (it should be enabled by default)

**Q: Stats not updating?**
A: Refresh the page (Cmd+R on macOS)

**Q: Need more test cases?**
A: Duplicate the HTML file and modify the `const` arrays at the top of the script section

## 🎯 Success Criteria

✓ Can solve all 5 text captchas correctly  
✓ Can solve all 3 math problems correctly  
✓ Can solve all 3 image selections correctly  
✓ Can solve timer challenge within 20 seconds  
✓ 3-agent consensus reaches 100% (3/3 agents agree)  
✓ Overall success rate > 80%

---

**Ready to test?** Open the file in your browser and start solving! 🚀
