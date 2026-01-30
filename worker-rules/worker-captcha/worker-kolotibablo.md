# Kolotibablo Worker Rules & Anti-Ban Protocol

> **⚠️ CRITICAL: Account Survival = 95%+ Success Rate**
> 
> Kolotibablo monitors worker performance. Below 95% success rate = Account suspension.

**Last Updated:** 2026-01-30  
**Status:** PRODUCTION READY  
**Priority:** 🟡 HIGH

---

## 🎯 CORE PRINCIPLE: HUMAN SIMULATION

Same as 2captcha: We are NOT a bot. We are a HUMAN worker using AI assistance.

---

## 📋 ABSOLUTE RULES (Same as 2captcha)

### Rule 1: 95% Success Rate Minimum
```
SUCCESS_RATE = (Correct_Solves / Total_Attempts) × 100

IF Success_Rate < 95%:
    → ACCOUNT_SUSPENDED
    → NO_SECOND_CHANCE
```

### Rule 2: 3-Agent Consensus System
- Vision Agent + OCR Agent + Pattern Agent
- Minimum 2 agents must agree 100%
- OR all 3 agents with 95%+ similarity

### Rule 3: Cannot Solve is DEFAULT
```
IF Confidence < 95%:
    → CLICK "Don't know" / "Skip"
    → NO penalty for skipping
```

### Rule 4: NO Parallel Workers
```
MAX_WORKERS_PER_PROVIDER = 1
```

### Rule 5: Session Continuity
- Cookies must persist
- Same IP per session
- 5-15 min break on IP change

---

## 🔗 KoloTibablo Specifics

### Website
```
https://kolotibablo.com
```

### Entry Points
- Login: https://kolotibablo.com/login
- Work: https://kolotibablo.com/work/

### Captcha Types
1. **Text Captchas** (most common)
   - Distorted letters/numbers
   - 4-6 characters
   - Case insensitive

2. **Image Captchas**
   - "Select all images with X"
   - Similar to reCAPTCHA v2

3. **Math Captchas**
   - Simple arithmetic
   - "What is 5 + 3?"

### Interface Elements
```
┌─────────────────────────────────────┐
│ Kolotibablo Work Interface          │
├─────────────────────────────────────┤
│ Balance: $X.XX                      │
│ Today's earnings: $X.XX             │
├─────────────────────────────────────┤
│ [Captcha Image]                     │
│                                     │
│ [Input field]                       │
│                                     │
│ [Send] [Don't know] [Ban]           │
├─────────────────────────────────────┤
│ Stats: X captchas solved            │
│ Success rate: XX%                   │
└─────────────────────────────────────┘
```

### Buttons
- **Send** (Enter) - Submit solution
- **Don't know** (Esc) - Skip captcha
- **Ban** - Report bad captcha

---

## 🤖 ANTI-BOT PROTECTION

Same as 2captcha:
- Human-like mouse movements
- Variable typing speeds
- Random delays
- Micro-breaks every 20-40 captchas
- Major break after 2.5 hours

---

## 💰 Earnings

- Rate: ~$0.50-1.00 per 1000 captchas (higher than 2captcha!)
- Payment: WebMoney, PayPal, Bitcoin
- Minimum payout: $1-5 (varies)

---

## 🎮 WORKFLOW

```python
while True:
    # 1. Navigate to work page
    goto("https://kolotibablo.com/work/")
    
    # 2. Wait for captcha
    captcha = wait_for_captcha()
    
    # 3. Screenshot
    screenshot = take_screenshot()
    
    # 4. 3-Agent Analysis
    result = consensus_solver.solve(screenshot)
    
    # 5. Decision
    if result.confidence >= 0.95:
        type_with_delays(result.solution)
        click_send()
    else:
        click_dont_know()
    
    # 6. Check breaks
    if should_take_break():
        take_break()
```

---

## 📊 DIFFERENCES: 2captcha vs Kolotibablo

| Feature | 2captcha | Kolotibablo |
|---------|----------|-------------|
| Rate | $0.10/1000 | $0.50-1.00/1000 |
| Min Payout | $0.50 | $1-5 |
| Captcha Types | Text, Image | Text, Image, Math |
| Interface | Modern | Older/Simpler |
| Ban Policy | Strict | Moderate |
| Training | Required | Optional |

---

## 🔗 RELATED

- [2Captcha Rules](./worker-2captcha.md)
- [Anti-Ban Strategies](../anti-ban-strategies.md)
- [Multi-Account Setup](../multi-account-setup.md)

---

**⚠️ REMEMBER: We are HUMANS using AI tools, not bots.**
