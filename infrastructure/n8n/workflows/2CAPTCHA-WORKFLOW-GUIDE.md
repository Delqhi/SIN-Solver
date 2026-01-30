# n8n 2captcha Worker Workflow - Configuration Guide

## File Location
`/Users/jeremy/dev/SIN-Solver/infrastructure/n8n/workflows/2captcha-worker-n8n.json`

## Workflow Overview

**Purpose:** Automated 2captcha.com Play & Earn worker using Steel Browser with consensus solver integration

**Key Features:**
- ✅ Manual trigger OR automatic scheduling (every 2.5 hours)
- ✅ Steel Browser session management with stealth mode
- ✅ 100 iterations per session
- ✅ Consensus solver with 95% confidence threshold
- ✅ Automatic break handling (5-15 min random breaks)
- ✅ Session expiry detection & auto-relogin
- ✅ Complete error handling
- ✅ Telegram notifications for session status

## Required Environment Variables

Create these in your n8n environment or .env file:

```bash
# 2captcha Credentials
TWOCAPTCHA_EMAIL="your-2captcha-email@example.com"
TWOCAPTCHA_PASSWORD="your-secure-password"

# Steel Browser (Stealth Browser)
STEEL_BROWSER_URL="http://localhost:3000"  # Or your Steel Browser instance

# Consensus Solver Webhook
CONSENSUS_SOLVER_WEBHOOK_URL="http://localhost:8080/api/solve"  # Your webhook endpoint

# Notifications
TELEGRAM_WEBHOOK_URL="https://api.telegram.org/bot<TOKEN>/sendMessage"
TELEGRAM_CHAT_ID="<YOUR_CHAT_ID>"
```

## Node Configuration Details

### 1. Triggers
- **Manual Trigger:** Run workflow on demand
- **Schedule Trigger:** Automatically run every 2.5 hours (150 minutes)

### 2. Steel Browser Operations
| Node | Action | Selectors |
|------|--------|-----------|
| Steel: Navigate | Open 2captcha.com/play-and-earn/play | URL only |
| Steel: Login | Fill email + password + click submit | Auto-detected |
| Steel: Screenshot | Capture captcha image | Full page false |
| Steel: Type Solution | Enter answer in input field | `input[class*='answer']` |
| Steel: Submit Answer | Click submit button | `button[type='submit']` |
| Steel: Click Cannot Solve | Skip captcha if low confidence | `button:contains('Skip')` |
| Steel: Logout | End session | `a[href*='logout']` |

### 3. Consensus Solver Integration
- **Endpoint:** `{{ $env.CONSENSUS_SOLVER_WEBHOOK_URL }}`
- **Input:** Base64 screenshot + captcha type
- **Output:** `{ solution: "...", confidence: 97.5 }`
- **Threshold:** 95% confidence minimum

### 4. Decision Logic

**If: Confidence >= 95%**
- TRUE → Type solution + Submit
- FALSE → Click "Cannot Solve" button

**If: Iterations < 100**
- TRUE → Loop back to screenshot
- FALSE → Continue to time check

**If: Time >= 2.5 hours**
- TRUE → Logout + Break + Relogin
- FALSE → Continue solving

## Iteration Loop Flow

```
┌─────────────────────────────────────┐
│ 1. Screenshot Captcha               │
├─────────────────────────────────────┤
│ 2. Send to Consensus Solver         │
├─────────────────────────────────────┤
│ 3. If Confidence >= 95%             │
│    → Type Solution + Submit         │
│    → successCount++                 │
│    Else                             │
│    → Click Skip                     │
│    → skipCount++                    │
├─────────────────────────────────────┤
│ 4. Track Statistics                 │
├─────────────────────────────────────┤
│ 5. Check Conditions:                │
│    • Iterations < 100? → LOOP       │
│    • Time >= 2.5h? → BREAK          │
│    • Else: CONTINUE                 │
└─────────────────────────────────────┘
```

## Break Scheduling

**After 150 minutes (2.5 hours) of solving:**

1. **Logout** from 2captcha account
2. **Wait** 5-15 minutes (random to avoid detection)
3. **Re-navigate** to 2captcha.com/play-and-earn/play
4. **Re-login** with credentials
5. **Reset** iteration counter
6. **Continue** solving for another 2.5 hours

## Error Handling

### Session Expiry
- Check session status every iteration
- If status == "expired":
  - Create new Steel Browser session
  - Send Telegram notification
  - Auto-login with stored credentials
  - Resume from next captcha

### Network Errors
- Steel Browser timeout → Retry (auto via n8n)
- Solver webhook timeout → Skip captcha
- Login failure → Wait 30s + retry

### Notifications
- Session started: ℹ️ Info log
- Break initiated: ⏸ Break notification
- Session expiry: ⚠️ Alert notification
- Session complete: ✅ Summary with stats

## Statistics Tracked

Per session:
- `iterationCount` - Total attempts (0-100)
- `successCount` - Correctly solved
- `skipCount` - Skipped/low confidence
- `errorCount` - Failed requests
- `elapsedMinutes` - Total time
- `startTime` - ISO timestamp
- `lastBreakTime` - Last break timestamp

## Telegram Notification Format

**Session Start:**
```
🤖 2captcha Worker Started
Session ID: <id>
Time: <ISO timestamp>
```

**Break Scheduled:**
```
⏸ 2captcha Worker - Break Time
📊 Statistics:
  Iterations: 100
  Successful: 87
  Skipped: 13
  Elapsed: 150 minutes
🔄 Resuming in 5-15 minutes...
```

**Session Expiry Alert:**
```
⚠️ 2captcha Worker - Session Expired
Session ID: <id>
Action: Auto-relogin initiated
Time: <ISO timestamp>
```

## URLs Reference

| Purpose | URL | Notes |
|---------|-----|-------|
| Work URL | `https://2captcha.com/play-and-earn/play` | ✅ CORRECT |
| Old URL | `https://2captcha.com/work/start` | ❌ 404 (DO NOT USE) |
| Steel Browser | `http://localhost:3000` | Environment configurable |
| Solver Webhook | `http://localhost:8080/api/solve` | Environment configurable |

## Deployment Steps

### 1. Import Workflow into n8n
```bash
# In n8n UI: Workflow → Import → Select JSON file
# Or via API:
curl -X POST http://localhost:5678/api/v1/workflows \
  -H "Content-Type: application/json" \
  -d @2captcha-worker-n8n.json
```

### 2. Set Environment Variables
```bash
# In n8n: Settings → Variables
export TWOCAPTCHA_EMAIL="..."
export TWOCAPTCHA_PASSWORD="..."
export STEEL_BROWSER_URL="http://localhost:3000"
export CONSENSUS_SOLVER_WEBHOOK_URL="http://localhost:8080/api/solve"
export TELEGRAM_WEBHOOK_URL="https://api.telegram.org/..."
export TELEGRAM_CHAT_ID="..."
```

### 3. Configure HTTP Basic Auth
- For Steel Browser nodes, use "HTTP Basic Auth"
- Create credential with Steel Browser API key

### 4. Test Manually
- Click "Test workflow" button
- Watch execution in detail view
- Verify: Screenshot → Solver → Decision → Next iteration

### 5. Enable Scheduling
- Schedule Trigger is enabled
- Runs every 2.5 hours automatically
- Manual trigger also available

## Troubleshooting

### Login Fails
- ✅ Verify TWOCAPTCHA_EMAIL is correct
- ✅ Verify TWOCAPTCHA_PASSWORD has no special chars (URL encode if needed)
- ✅ Check 2captcha hasn't changed login selectors
- ⚠️ If MFA enabled, Steel Browser may fail

### Solver Webhook Timeout
- ✅ Verify webhook URL is accessible
- ✅ Check webhook returns valid JSON: `{ "solution": "...", "confidence": 95 }`
- ✅ Verify consensus solver service is running

### Break Loop Doesn't Execute
- ✅ Check "If: Time >= 2.5 hours" node condition
- ✅ Verify `elapsedMinutes` is calculated correctly
- ✅ Check decimal vs integer comparison

### Steel Browser Session Expired
- ✅ Verify STEEL_BROWSER_URL is correct
- ✅ Check Steel Browser service is running
- ✅ Verify network connectivity

## Performance Notes

- **Screenshot:** ~2s per captcha
- **Solver API:** ~3s per request
- **Iteration:** ~5-8s total per captcha
- **100 iterations:** ~8-13 minutes solving time
- **With breaks:** ~2.5 hours per cycle

## Security Notes

⚠️ **DO NOT:**
- ❌ Hardcode credentials in JSON (use env vars)
- ❌ Commit TWOCAPTCHA_PASSWORD to git
- ❌ Share TELEGRAM_WEBHOOK_URL publicly
- ❌ Use production credentials in test

✅ **DO:**
- ✅ Store credentials in n8n secrets
- ✅ Use separate email for testing
- ✅ Rotate credentials regularly
- ✅ Monitor logs for suspicious activity

## Integration Requirements

| Component | Purpose | Status |
|-----------|---------|--------|
| Steel Browser (room-05) | Stealth browsing | Required |
| n8n (room-01) | Workflow orchestration | Required |
| Consensus Solver | Image classification | Required |
| Telegram Bot | Notifications | Optional |
| 2captcha.com | Target platform | Required |

## References

- [2captcha Play & Earn](https://2captcha.com/play-and-earn/play)
- [n8n Documentation](https://docs.n8n.io)
- [Steel Browser API](http://localhost:3000/docs)
- [Telegram Bot API](https://core.telegram.org/bots/api)
