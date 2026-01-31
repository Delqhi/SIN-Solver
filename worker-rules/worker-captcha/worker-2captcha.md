# 2Captcha.com Worker Rules - ABSOLUTE COMPLIANCE REQUIRED

## ⚠️ CRITICAL WARNING

**ACCOUNT BAN RISK: 100% if rules violated!**
- 2Captcha has ZERO tolerance for low accuracy
- One strike = Account deleted permanently
- No second chances, no appeals

---

## 🎯 GOLDEN RULES (NON-NEGOTIABLE)

### RULE 1: MINIMUM 95% ACCURACY
```
SUCCESS RATE: ≥ 95% (absolute minimum)
TARGET RATE:  ≥ 98% (recommended)
```
- Below 95% = Account review → DELETION
- Monitor accuracy in real-time
- Stop solving if accuracy drops below 95%

### RULE 2: MULTI-MODEL CONSENSUS (TRIPLE VERIFICATION)
```
CAPTCHA SOLVING WORKFLOW:

1. CAPTCHA arrives from 2Captcha.com
2. Send to Agent 1 (Primary Model) → Gets answer A
3. Send to Agent 2 (Secondary Model) → Gets answer B  
4. Send to Agent 3 (Tertiary Model) → Gets answer C
5. COMPARE ANSWERS:
   
   IF (A == B == C) with ≥95% confidence:
      → SUBMIT ANSWER to 2Captcha
   
   IF (2 of 3 match) with ≥95% confidence:
      → SUBMIT MAJORITY ANSWER to 2Captcha
   
   IF (all different) OR (confidence < 95%):
      → CLICK "CANNOT SOLVE" BUTTON
      → DO NOT GUESS!
      → DO NOT SUBMIT!
```

### RULE 3: "CANNOT SOLVE" IS ACCEPTABLE
```
When to click "Cannot Solve":
- All 3 agents disagree
- Confidence below 95%
- CAPTCHA type not supported
- Image quality too poor
- Timeout approaching

NEVER guess to maintain speed!
Quality > Quantity on 2Captcha!
```

---

## 🤖 AGENT CONFIGURATION

### Agent 1: Primary Solver (Skyvern/Steel)
- **Role**: First analysis
- **Model**: High-accuracy vision model
- **Timeout**: 30 seconds
- **Confidence threshold**: 95%

### Agent 2: Secondary Solver (GPT-4V/Claude)
- **Role**: Verification
- **Model**: Different architecture than Agent 1
- **Timeout**: 30 seconds
- **Confidence threshold**: 95%

### Agent 3: Tertiary Solver (Local OCR/YOLO)
- **Role**: Final check
- **Model**: On-device model (ddddocr)
- **Timeout**: 15 seconds
- **Confidence threshold**: 95%

### Consensus Engine (Skyvern Controller)
- **Role**: Decision maker
- **Logic**: Compare A, B, C
- **Action**: Submit OR Cannot Solve
- **Logging**: All decisions logged

---

## 📊 ACCURACY MONITORING

### Real-Time Metrics
```python
accuracy_stats = {
    "total_attempts": 0,
    "correct_solves": 0,
    "cannot_solve": 0,
    "current_accuracy": 100.0,
    "hourly_accuracy": [],
    "daily_accuracy": []
}

# Update after each CAPTCHA
if submitted_answer:
    accuracy_stats["total_attempts"] += 1
    # Wait for 2Captcha feedback (async)
    # Update correct_solves based on feedback
    accuracy_stats["current_accuracy"] = (
        accuracy_stats["correct_solves"] / 
        accuracy_stats["total_attempts"] * 100
    )
```

### Auto-Stop Triggers
```
IF accuracy < 95% for 10 consecutive CAPTCHAs:
    → PAUSE solving
    → ALERT operator
    → INVESTIGATE models
    → RESUME only after fix

IF accuracy < 90% at any time:
    → EMERGENCY STOP
    → DO NOT RESUME without human review
```

---

## 🔄 WORKER WORKFLOW

### Step 1: Login to 2Captcha.com
```
1. Open https://2captcha.com
2. Login with worker credentials
3. Navigate to "Start Work" / "Solve CAPTCHAs"
4. Wait for CAPTCHA assignment
```

### Step 2: Receive CAPTCHA
```
1. 2Captcha presents CAPTCHA image
2. Worker captures image/screenshot
3. Worker has 60-120 seconds to solve
4. Timer visible on page
```

### Step 3: Multi-Agent Analysis
```
1. Send image to Agent 1 → Answer A (confidence %)
2. Send image to Agent 2 → Answer B (confidence %)
3. Send image to Agent 3 → Answer C (confidence %)
4. Wait for all 3 responses (max 30s)
```

### Step 4: Consensus Decision
```
IF A == B == C AND all confidences ≥ 95%:
    → Submit Answer A
    → Log: "UNANIMOUS: {answer}"

ELIF (A == B OR A == C OR B == C) AND confidences ≥ 95%:
    → Submit majority answer
    → Log: "MAJORITY: {answer} (2/3)"

ELSE:
    → Click "CANNOT SOLVE"
    → Log: "NO CONSENSUS - SKIPPED"
```

### Step 5: Submit or Skip
```
IF submitting:
    → Type answer in text field
    → Click "Submit" button
    → Wait for next CAPTCHA

IF cannot solve:
    → Click "Cannot Solve" button
    → Wait for next CAPTCHA
```

---

## ⚡ PERFORMANCE TARGETS

### Speed vs Accuracy Balance
```
Target solve time: 15-30 seconds per CAPTCHA
Maximum solve time: 60 seconds (before timeout)

Speed is secondary to accuracy!
Better to skip than submit wrong answer!
```

### Daily Volume Targets
```
Conservative: 100-200 CAPTCHAs/day
Moderate: 200-500 CAPTCHAs/day
Aggressive: 500+ CAPTCHAs/day (only with proven 98%+ accuracy)

Start conservative, increase gradually!
```

---

## 🛡️ ANTI-BAN PROTECTION

### Behavior Patterns to Avoid
```
❌ NEVER:
- Solve too fast (< 5 seconds consistently)
- Solve 24/7 without breaks
- Submit same wrong answer repeatedly
- Use only one model/agent
- Guess when unsure
- Ignore "Cannot Solve" option

✅ ALWAYS:
- Vary solve times (10-45 seconds)
- Take breaks (5-10 min every hour)
- Use multiple models for consensus
- Click "Cannot Solve" when unsure
- Monitor accuracy continuously
- Stay above 95% accuracy
```

### Human-Like Behavior
```
- Random delays between CAPTCHAs
- Occasional "Cannot Solve" clicks (5-10%)
- Variable typing speed
- Mouse movements (if tracked)
- Breaks during "night hours"
```

---

## 📈 SUCCESS METRICS

### Daily Reports
```
Date: 2026-01-30
CAPTCHAs Attempted: 150
CAPTCHAs Solved: 142
CAPTCHAs Skipped: 8
Accuracy: 94.7% ⚠️ (BELOW 95%!)
Earnings: $X.XX
Status: ⚠️ WARNING - Accuracy low
```

### Weekly Reviews
```
- Review accuracy trends
- Adjust models if needed
- Update consensus thresholds
- Check for ban warnings
- Optimize for accuracy over speed
```

---

## 🚨 EMERGENCY PROCEDURES

### If Accuracy Drops Below 95%
```
1. IMMEDIATELY stop solving
2. Do NOT submit more answers
3. Click "Cannot Solve" for remaining
4. Log out of 2Captcha
5. Investigate model performance
6. Fix issues before resuming
7. Resume with conservative volume
```

### If Account Warning Received
```
1. STOP all solving immediately
2. Review last 100 submissions
3. Identify error patterns
4. Fix underlying issues
5. Wait 24 hours before resuming
6. Resume with 50% volume
7. Monitor extra carefully
```

### If Account Banned
```
1. Accept ban (no appeal possible)
2. Document what went wrong
3. Create new account with NEW:
   - Email
   - IP address (VPN/proxy)
   - Payment method
   - Behavior patterns
4. Start with ultra-conservative settings
5. Build reputation slowly
```

---

## 💰 EARNINGS OPTIMIZATION

### Rate per CAPTCHA (approximate)
```
Text CAPTCHA:    $0.0003 - $0.001
Image CAPTCHA:   $0.001 - $0.003
reCAPTCHA:       $0.002 - $0.005
hCAPTCHA:        $0.002 - $0.005
```

### Earnings Calculation
```
Daily Volume: 300 CAPTCHAs
Accuracy: 96%
Successful: 288 CAPTCHAs
Average rate: $0.002

Daily earnings: 288 × $0.002 = $0.576
Weekly earnings: ~$4.00
Monthly earnings: ~$17.00

WITH 98% ACCURACY:
Daily: 294 × $0.002 = $0.588
Monthly: ~$17.50

Accuracy improvement = More earnings!
```

---

## 🔧 TECHNICAL IMPLEMENTATION

### Required Components
```
1. Browser Automation (Skyvern/Steel)
2. CAPTCHA Detection (screenshot/analysis)
3. Multi-Agent Solver (3 models)
4. Consensus Engine (decision logic)
5. Accuracy Tracker (metrics)
6. Auto-Stop (safety)
7. Logging (audit trail)
```

### Tech Stack
```
- Browser: Steel Browser (stealth mode)
- Agents: Skyvern + GPT-4V + ddddocr
- Controller: Python/Node.js
- Monitoring: Real-time dashboard
- Alerts: Telegram/Slack integration
```

---

## ✅ PRE-LAUNCH CHECKLIST

Before starting 2Captcha work:

- [ ] All 3 agents tested individually
- [ ] Consensus engine tested
- [ ] Accuracy tracking implemented
- [ ] Auto-stop triggers configured
- [ ] Logging system active
- [ ] Dashboard monitoring ready
- [ ] Emergency procedures documented
- [ ] Test run: 50 CAPTCHAs with >95% accuracy
- [ ] USD currency selected in 2Captcha account
- [ ] Payment method configured

---

## 📚 RELATED DOCUMENTATION

- [Worker Architecture](../worker-architecture.md)
- [Captcha Types](../../captchas/captcha-types.md)
- [Model Consensus](../../ai/consensus-engine.md)
- [Ban Prevention](../../security/anti-ban-strategies.md)

---

**VERSION**: 1.0  
**LAST UPDATED**: 2026-01-30  
**COMPLIANCE**: MANDATORY - No exceptions  
**ENFORCEMENT**: Automatic accuracy monitoring
