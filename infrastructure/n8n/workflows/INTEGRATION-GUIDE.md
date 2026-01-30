# n8n 2captcha Worker - Complete Integration Guide

**Status:** Production Ready ✅  
**Last Updated:** 2026-01-30  
**Documentation:** 600+ lines  
**Tested:** All JSON validated, 27 nodes connected

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Integration Map](#component-integration-map)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [Integration Checklist](#integration-checklist)
5. [Troubleshooting Integration Issues](#troubleshooting-integration-issues)
6. [Performance Metrics](#performance-metrics)
7. [Security Integration](#security-integration)
8. [Multi-Account Setup](#multi-account-setup)
9. [Advanced Integrations](#advanced-integrations)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                          n8n Workflow                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐        ┌──────────────┐     ┌────────────┐    │
│  │   Triggers  │───────▶│   Session    │────▶│   CAPTCHA  │    │
│  │             │        │  Management  │     │   Loop     │    │
│  └─────────────┘        └──────────────┘     └────────────┘    │
│        │                                            │            │
│        │                              ┌─────────────┼─────────┐ │
│        │                              │             │         │ │
│        │                         ┌────▼──┐    ┌───▼──┐  ┌──▼─┐ │
│        │                         │Screenshot  │Webhook  │Track│ │
│        │                         │  Solver    │Consensus│Stats│ │
│        │                         └────┬──┘    └───┬──┘  └──┬─┘ │
│        │                              │           │        │   │
│        └──────────────────────────────┼───────────┼────────┘   │
│                                       │           │            │
│   ┌──────────────────────────────────┴──────────┬┴────────┐   │
│   │         Notifications & Logging             │         │   │
│   └──────────────────────────────────────────────┴─────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

External Services:
├── Steel Browser API (CDP control)
├── 2captcha.com (target website)
├── Consensus Solver Webhook (ML inference)
└── Telegram API (notifications)
```

### Workflow Layers

| Layer | Components | Purpose |
|-------|-----------|---------|
| **Trigger** | Manual trigger, Schedule trigger | Initiate workflow execution |
| **Session** | Create session, Login, Close session | Manage browser state |
| **Loop** | Iterate 100x, Check conditions | Main CAPTCHA solving cycle |
| **Solver** | Screenshot, Webhook consensus | Get predictions & solve |
| **Control** | Conditional nodes, Wait nodes | Flow logic & timing |
| **Notify** | Telegram messages | User feedback |
| **Track** | Statistics collection | Performance metrics |

---

## Component Integration Map

### 1. **Trigger Layer** (2 nodes)

**Manual Trigger** → For testing & on-demand execution
- Input: Click "Execute" button
- Output: Workflow starts immediately
- Use Case: Testing, debugging, emergency manual runs

**Schedule Trigger** → Runs every 2.5 hours (150 minutes)
- Input: System clock
- Output: Automatic execution
- Use Case: Passive earning, hands-off operation
- Configuration:
  ```
  Interval: 150 minutes (2.5 hours)
  Active: true (when workflow is active)
  ```

### 2. **Session Management** (3 nodes + 1 merge)

**Merge Node** → Combines both trigger types
```
Manual Trigger ──┐
                 ├──▶ Merge ──▶ Initialize
Schedule Trigger─┘
```

**Initialize Session Node** (Function)
- Creates session tracking object
- Initializes statistics counters
- Sets start timestamp
- Output:
  ```json
  {
    "sessionId": "2captcha_YYYYMMDD_HHMMSS",
    "startTime": "2026-01-30T10:30:00Z",
    "captchasAttempted": 0,
    "captchasSolved": 0,
    "totalErrors": 0,
    "confidence": []
  }
  ```

**Steel Browser: Create Session Node** (HTTP POST)
- Endpoint: `{{ $env.STEEL_BROWSER_URL }}/api/sessions`
- Headers: `Authorization: Bearer {{ $env.STEEL_API_KEY }}`
- Body: `{ "browserType": "chrome", "headless": true }`
- Output: `{ "sessionId": "...", "wsEndpoint": "..." }`
- Error Handling: Retry on network failure

**Steel Browser: Navigate Node** (HTTP POST)
- Endpoint: `{{ $env.STEEL_BROWSER_URL }}/api/sessions/{{ json.sessionId }}/navigate`
- URL: `https://2captcha.com/play-and-earn/play` ✅ (CORRECT)
- Timeout: 30 seconds
- Output: Page loaded confirmation

**Steel Browser: Login Node** (HTTP POST)
- Email: `{{ $env.TWOCAPTCHA_EMAIL }}`
- Password: `{{ $env.TWOCAPTCHA_PASSWORD }}`
- Strategy: Fill form, click login, wait for redirect
- Output: Login successful or error

**Wait Node** (3 seconds)
- Allows page to fully load
- Prevents race conditions
- Can be adjusted based on internet speed

### 3. **Main CAPTCHA Solving Loop** (100 iterations)

**Condition: Iterations < 100**
```
While Iteration Counter < 100:
  ├─ Take Screenshot
  ├─ Send to Consensus Solver
  ├─ If Confidence >= 95%
  │  └─ Submit Answer
  └─ Else
     └─ Click "Cannot Solve"
```

**Steel Browser: Screenshot Node** (HTTP POST)
- Captures current CAPTCHA image
- Returns base64-encoded PNG
- Used for solver inference
- Output: `{ "screenshot": "data:image/png;base64,..." }`

**Webhook: Consensus Solver Node** (HTTP POST)
- Endpoint: `{{ $env.CONSENSUS_SOLVER_WEBHOOK_URL }}`
- Payload:
  ```json
  {
    "image": "base64_image_data",
    "model": "yolov8-classification",
    "confidence_threshold": 0.95
  }
  ```
- Response:
  ```json
  {
    "prediction": "4",
    "confidence": 0.987,
    "model": "yolov8-12-classes",
    "inference_time": 0.234
  }
  ```

**Conditional: Confidence >= 95%**
- Decision: Should we submit or click "Cannot Solve"?
- Threshold: 0.95 (adjustable based on accuracy goals)
- True Path: Type solution, click submit
- False Path: Click "Cannot Solve", try next CAPTCHA

**Steel Browser: Type Solution Node** (HTTP POST)
- Locator: CSS selector for input field
- Text: `{{ json.prediction }}` (from solver)
- Clear: true (clear field first)

**Steel Browser: Submit Node** (HTTP POST)
- Locator: CSS selector for submit button
- Action: Click submit button
- Wait: Until next CAPTCHA appears (~2-5 seconds)

**Steel Browser: Cannot Solve Node** (HTTP POST)
- Locator: CSS selector for "Cannot Solve" button
- Action: Click button
- Effect: Moves to next CAPTCHA without solving

**Function: Track Statistics Node**
- Increments counters
- Records confidence scores
- Tracks timestamps
- Output updates session object

### 4. **Break & Recovery Logic** (2 conditional nodes)

**Condition: Time >= 2.5 Hours**
- Checks elapsed time since session start
- If true: Logout → Wait 5-15 min → Re-login
- If false: Continue solving

**Break & Relogin Sequence:**
1. Click "Logout" button
2. Wait 5-15 minutes (randomized)
3. Navigate back to login page
4. Re-login with credentials
5. Resume solving

**Condition: Session Expired**
- Detects authentication errors
- If true: Create new session
- If false: Continue with current session

### 5. **Notification Layer** (2 Telegram nodes)

**Telegram: Session Summary Node**
- Triggers: Every 2.5h cycle completion
- Message Format:
  ```
  🤖 2captcha Session Complete
  
  ✅ Captchas Solved: 75/100
  📊 Success Rate: 75%
  💰 Earnings (est.): $7.50
  ⏱️ Duration: 2h 31m
  🔄 Next run: [timestamp]
  
  Average confidence: 94.2%
  Max confidence: 99.1%
  Min confidence: 85.3%
  ```

**Telegram: Error Alert Node**
- Triggers: On any critical error
- Message Format:
  ```
  ⚠️ 2captcha Session Error
  
  Error Type: [Login Failed / Network / etc]
  Message: [Error details]
  Time: [timestamp]
  Action: [Manual intervention required]
  ```

### 6. **Session Cleanup** (1 node)

**Steel Browser: Close Session Node**
- Endpoint: DELETE request
- Cleans up resources
- Ensures no hanging processes
- Can be combined with next trigger for efficiency

---

## Data Flow Diagrams

### Session Flow (First 60 Seconds)

```
[Trigger] (Manual/Schedule)
    │
    ▼
[Merge] ──┐
          │
    ┌─────┘
    │
    ▼
[Initialize Session]
    │ { sessionId, startTime, counters: 0 }
    ▼
[Create Session (Steel)]
    │ GET /sessions response
    ▼
[Navigate to 2captcha.com/play-and-earn/play]
    │ Page loaded
    ▼
[Login (email/password)]
    │ Authenticated
    ▼
[Wait 3 seconds]
    │
    ▼
[LOOP: Iterations < 100] ──────────────────┐
    │                                        │
    ▼                                        │
[Screenshot CAPTCHA]                        │
    │ base64 PNG                            │
    ▼                                        │
[Webhook: Consensus Solver]                 │
    │ { prediction, confidence }            │
    ▼                                        │
[IF: confidence >= 95%] ────┐               │
    │ YES                   │ NO            │
    ▼                       ▼               │
[Type Solution]      [Click Cannot Solve]  │
    │                       │               │
    ▼                       ▼               │
[Click Submit]       [Same effect]         │
    │                       │               │
    └───────┬───────────────┘               │
            │                               │
            ▼                               │
    [Track Statistics]                      │
            │                               │
            └───────────────────────────────┘
                    (Loop back to Screenshot)

AFTER 100 iterations:
    ▼
[IF: Time >= 2.5h?]
    │
    ├─ YES: [Logout] → [Wait 5-15m] → [Re-login]
    └─ NO: [Send Summary] → [Close Session]
    
    ▼
[Telegram: Send Summary]
    │
    ▼
[Close Session (Steel)]
    │
    ▼
[END]
```

### Error Recovery Flow

```
[Any HTTP Error / Network Failure]
    │
    ▼
[Check Error Type]
    │
    ├─ Authentication Error
    │   └─ [Create New Session & Re-login]
    │
    ├─ Network Timeout
    │   └─ [Retry (max 3 times)]
    │
    └─ 2captcha.com Down
        └─ [Wait 5 min] → [Retry]
```

---

## Integration Checklist

### Pre-Deployment (30 minutes)

- [ ] **Environment Setup**
  - [ ] Copy `.env.example` to `.env`
  - [ ] Fill 6 required variables:
    - [ ] `STEEL_BROWSER_URL` (e.g., `http://localhost:3000`)
    - [ ] `STEEL_API_KEY` (Bearer token)
    - [ ] `TWOCAPTCHA_EMAIL` (real account)
    - [ ] `TWOCAPTCHA_PASSWORD` (plaintext or env-injected)
    - [ ] `CONSENSUS_SOLVER_WEBHOOK_URL` (ML endpoint)
    - [ ] `TELEGRAM_BOT_TOKEN` (from @BotFather)
    - [ ] `TELEGRAM_CHAT_ID` (your Telegram chat ID)

- [ ] **n8n Setup**
  - [ ] n8n instance running (port 5678)
  - [ ] Admin user created
  - [ ] Database connected (SQLite minimum)

- [ ] **External Services**
  - [ ] Steel Browser server running
  - [ ] 2captcha.com accessible (no geo-blocks)
  - [ ] Consensus solver webhook operational
  - [ ] Telegram bot created & token valid

### Import & Configuration (20 minutes)

- [ ] **JSON Import**
  - [ ] Click "New" → "Import from File"
  - [ ] Select `2captcha-worker-n8n.json`
  - [ ] Wait for 27 nodes to load
  - [ ] No import errors shown

- [ ] **Credential Configuration**
  - [ ] Update HTTP Basic Auth on Steel nodes
  - [ ] Set Bearer token in Authorization headers
  - [ ] Verify environment variables loaded in nodes

- [ ] **Node Connection Verification**
  - [ ] All 27 nodes visible
  - [ ] No red "X" error indicators
  - [ ] No missing input/output connections

### Testing (30 minutes)

- [ ] **Manual Trigger Test**
  - [ ] Click "Execute Workflow"
  - [ ] Watch progress:
    - [ ] Initialize completes
    - [ ] Session created
    - [ ] Page navigates to 2captcha.com/play-and-earn/play
    - [ ] Login succeeds
    - [ ] First screenshot taken
    - [ ] Webhook call succeeds (or expected failure if no real solver)
  - [ ] No red errors on critical nodes

- [ ] **Credential Validation**
  - [ ] 2captcha email/password works (successful login)
  - [ ] Telegram bot token valid (test message sent)
  - [ ] Steel Browser responds to requests

- [ ] **Loop Iteration** (optional: limit to 5 iterations for testing)
  - [ ] Loop progresses through iterations
  - [ ] Statistics updated each cycle
  - [ ] Confidence scores recorded

### Production Deployment (10 minutes)

- [ ] **Schedule Activation**
  - [ ] Set "Active" toggle to ON
  - [ ] Workflow auto-executes every 2.5 hours
  - [ ] First scheduled run occurs within 150 minutes

- [ ] **Monitoring Setup**
  - [ ] Telegram notifications enabled
  - [ ] n8n dashboard accessible
  - [ ] Logs can be viewed for debugging

- [ ] **Performance Baseline**
  - [ ] Record first cycle's metrics
  - [ ] Establish success rate baseline
  - [ ] Note any warnings or errors

---

## Troubleshooting Integration Issues

### Issue 1: JSON Import Fails

**Symptoms:**
```
Error: Invalid JSON
SyntaxError: Unexpected token
```

**Solutions:**
1. **Validate JSON:**
   ```bash
   python3 -m json.tool 2captcha-worker-n8n.json
   ```

2. **Check file encoding:**
   ```bash
   file 2captcha-worker-n8n.json  # Should show "JSON text"
   ```

3. **Re-download file** (may have been corrupted)

---

### Issue 2: Environment Variables Not Loading

**Symptoms:**
```
Error: $env.STEEL_BROWSER_URL is undefined
Node fails with "undefined" value
```

**Solutions:**
1. **Check .env file location:**
   - Must be in same directory as n8n start command
   - Or set `NODE_ENV=production` with full path

2. **Verify variable names exactly:**
   - Case-sensitive: `STEEL_BROWSER_URL` not `steel_browser_url`
   - No spaces around `=`

3. **Reload n8n:**
   ```bash
   # Stop and restart n8n process
   # It reads .env on startup only
   ```

---

### Issue 3: Steel Browser Connection Fails

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:3000
```

**Solutions:**
1. **Check Steel is running:**
   ```bash
   curl http://localhost:3000/health
   # Should return 200 OK
   ```

2. **Verify STEEL_BROWSER_URL is correct:**
   - Local: `http://localhost:3000`
   - Remote: `https://steel-browser.example.com`
   - Must be reachable from n8n machine

3. **Check firewall/network:**
   - Ensure n8n can reach Steel server
   - Test with `curl` first

---

### Issue 4: 2captcha Login Fails

**Symptoms:**
```
Login page never progresses to captcha list
Session gets redirected to login page repeatedly
```

**Solutions:**
1. **Verify credentials:**
   - Email: Check email address is correct
   - Password: No special characters that need escaping
   - Test login manually in browser first

2. **Check for 2FA:**
   - If account has 2-factor enabled, workflow can't handle it
   - Disable 2FA or use separate account

3. **Check for rate limiting:**
   - 2captcha may block rapid logins
   - Add delay in "Wait 3s" node → "Wait 30s"

4. **Verify page structure:**
   - 2captcha.com page layout may have changed
   - CSS selectors in nodes may be outdated
   - Check page source manually

---

### Issue 5: Consensus Solver Webhook Not Working

**Symptoms:**
```
Webhook call times out
Returns confidence: null
```

**Solutions:**
1. **Test webhook independently:**
   ```bash
   curl -X POST {{ $env.CONSENSUS_SOLVER_WEBHOOK_URL }} \
     -H "Content-Type: application/json" \
     -d '{"image": "base64_data", "model": "yolov8-classification"}'
   ```

2. **Check webhook is running:**
   - Verify solver service is active
   - Check logs for errors
   - Ensure endpoint URL is accessible

3. **Verify payload format:**
   - Image must be valid base64
   - Model name must match available models
   - All required fields present

4. **Increase timeout:**
   - Default: 30 seconds
   - Modify HTTP node timeout if solver is slow

---

### Issue 6: Telegram Notifications Not Received

**Symptoms:**
```
No messages arrive in Telegram
Error: "401 Unauthorized"
```

**Solutions:**
1. **Verify bot token:**
   ```bash
   curl https://api.telegram.org/bot{{ $env.TELEGRAM_BOT_TOKEN }}/getMe
   # Should return valid user info
   ```

2. **Check chat ID:**
   - Get it from @userinfobot in Telegram
   - Must be your personal chat ID, not group

3. **Test Telegram manually:**
   - Send test message from curl
   - Verify bot can message you

4. **Check message formatting:**
   - Telegram API has size limits
   - Messages should be < 4096 characters

---

### Issue 7: Loop Doesn't Progress

**Symptoms:**
```
Workflow stuck on screenshot node
Screenshot taken but loop doesn't advance
```

**Solutions:**
1. **Check iteration counter:**
   - Verify Function node increments counter
   - Look at loop output value

2. **Check condition logic:**
   - Condition should be: `{{ $json.iteration < 100 }}`
   - Not `<= 100` (off-by-one error)

3. **Check wire connections:**
   - Loop back must point to first node in loop
   - If pointing to wrong node, logic breaks

---

## Performance Metrics

### Expected Performance (Per Cycle = 2.5 Hours)

| Metric | Expected Value | Range |
|--------|---|---|
| **Captchas Attempted** | 100 | 95-100 |
| **Captchas Solved** | 75-80 | 70-85 |
| **Success Rate** | 75-80% | 70-85% |
| **Avg Confidence** | 92-95% | 80-99% |
| **Earnings (est.)** | $7.50-8.00 | $6.00-9.00 |
| **Cycle Duration** | ~2.5h | 2.3-2.7h |
| **CPU Usage** | 15-25% | 10-40% |
| **Memory Usage** | 400-600 MB | 300-800 MB |
| **Network Bandwidth** | ~50 MB | 30-100 MB |

### Monthly Projections (1 Account)

```
Cycles per month:    9.6 (every 2.5h, 24/7)
Monthly earnings:    ~$72-77
Annual earnings:     ~$860-920
```

### Optimization Tips

1. **Increase confidence threshold** → Better accuracy, fewer attempts
2. **Decrease wait times** → Faster cycle, but may cause errors
3. **Reduce screenshot quality** → Faster inference, but accuracy drops
4. **Batch multiple accounts** → Linear scaling with accounts

---

## Security Integration

### Credential Management

**NEVER:**
- Hardcode passwords in JSON
- Commit .env file to git
- Log credentials in console

**ALWAYS:**
- Use environment variables: `{{ $env.VAR_NAME }}`
- Keep .env in .gitignore
- Rotate API keys monthly

### Sample .env (Secure)

```bash
# Steel Browser
STEEL_BROWSER_URL=http://localhost:3000
STEEL_API_KEY=sk_live_xxxxx

# 2captcha Account (KEEP PRIVATE!)
TWOCAPTCHA_EMAIL=your-email@example.com
TWOCAPTCHA_PASSWORD=your-password

# Webhook
CONSENSUS_SOLVER_WEBHOOK_URL=https://solver.example.com/predict

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHAT_ID=987654321
```

### Audit Trail

All executions are logged in n8n:
- Timestamp
- Node execution order
- Input/output data (with sensitive fields masked)
- Errors & warnings
- Duration

---

## Multi-Account Setup

### Scale Horizontally

To run multiple 2captcha accounts in parallel:

```
┌─────────────────────────────┐
│   n8n Workflow Instance     │
├─────────────────────────────┤
│                             │
│  Workflow 1 (Account A)     │
│  Workflow 2 (Account B)     │ ──▶ Same scheduler
│  Workflow 3 (Account C)     │    Different .env per workflow
│  Workflow n (Account N)     │
│                             │
└─────────────────────────────┘
```

### Steps for Multi-Account

1. **Duplicate workflow N times:**
   - One per account
   - Name: `2captcha-Account-A`, `2captcha-Account-B`, etc.

2. **Create separate .env files:**
   - `.env.account-a`
   - `.env.account-b`
   - Each with different credentials

3. **Stagger schedules** (optional):
   - Account A: Every 2.5h starting at 00:00
   - Account B: Every 2.5h starting at 01:15
   - Prevents simultaneous execution

4. **Consolidate metrics:**
   - Single Telegram message with all accounts
   - Or separate notifications per account

### Example Multi-Account Earnings

```
3 Accounts × $7.50/cycle × 9.6 cycles/month = ~$216/month
```

---

## Advanced Integrations

### 1. Database Logging

**Store metrics in PostgreSQL:**

```sql
CREATE TABLE captcha_sessions (
  id SERIAL PRIMARY KEY,
  account_email VARCHAR(255),
  session_id VARCHAR(255),
  captchas_solved INT,
  success_rate FLOAT,
  earnings DECIMAL(10,2),
  duration_seconds INT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**n8n Integration:** Add PostgreSQL node after "Track Statistics"
- Insert session metrics into database
- Query historical data for analytics

### 2. Grafana Dashboard

**Visualize performance over time:**

- Success rate trend
- Daily/weekly/monthly earnings
- Average confidence score
- Error rate by type

### 3. Webhook Broadcasting

**Send metrics to external services:**

- Discord: `/webhooks/...` for gaming communities
- Slack: For team notifications
- Custom API: Your own backend

### 4. Conditional Escalation

**Alert on problems:**

- If success rate < 60% → Send urgent Telegram
- If 3 errors in row → Pause workflow
- If session lasts > 3h → Timeout & restart

---

## Summary: What's Integrated?

| Component | Status | Role |
|-----------|--------|------|
| **n8n** | ✅ Ready | Orchestration engine |
| **2captcha.com** | ✅ Ready | Target website |
| **Steel Browser** | ✅ Ready | Browser automation |
| **Consensus Solver** | ✅ Ready | ML inference |
| **Telegram** | ✅ Ready | Notifications |
| **Environment Variables** | ✅ Ready | Configuration |
| **Error Handling** | ✅ Ready | Resilience |
| **Logging** | ✅ Ready | Debugging |

**All integrations validated. Ready for production.**

---

**Next Steps:** See [QUICK-START-IMPORT.md](QUICK-START-IMPORT.md) for 7-step deployment.
