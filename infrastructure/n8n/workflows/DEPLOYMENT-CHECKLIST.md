# Production Deployment Checklist

**Status:** Pre-Deployment  
**Severity:** Critical Path  
**Estimated Time:** 60 minutes end-to-end  
**Last Updated:** 2026-01-30

## 🎯 Quick Start (TL;DR - 5 Minutes)

```bash
# 1. Copy template
cp .env.example .env

# 2. Edit .env with your values (6 variables)
nano .env

# 3. Import into n8n
# Open n8n → New → Import from File → Select 2captcha-worker-n8n.json

# 4. Test
# Click "Execute Workflow" (manual trigger)

# 5. Activate
# Toggle "Active" → ON
# Schedule starts firing every 2.5 hours
```

---

## 📋 PHASE 1: PREREQUISITES (10 minutes)

### 1.1 System Requirements

- [ ] **Operating System**
  - [ ] Linux (Ubuntu 20.04+) OR
  - [ ] macOS (12+) OR
  - [ ] Windows 10+ with WSL2

- [ ] **Node.js**
  ```bash
  node --version  # Must be 18.0.0 or higher
  npm --version   # Must be 9.0.0 or higher
  ```

- [ ] **Disk Space**
  - [ ] n8n installation: 500 MB
  - [ ] Docker containers: 2-5 GB
  - [ ] Database: 100 MB minimum

- [ ] **Network**
  - [ ] Outbound HTTPS (443) allowed
  - [ ] 2captcha.com accessible (no geo-blocks)
  - [ ] Port 5678 available for n8n (local) or 80/443 (cloud)

### 1.2 Accounts & Services

- [ ] **2captcha.com Account**
  - [ ] Registered at https://2captcha.com
  - [ ] Email verified
  - [ ] At least $0.10 balance (or connected payment method)
  - [ ] Account NOT flagged/banned
  - [ ] 2-Factor Authentication DISABLED (required)
  
- [ ] **Telegram Account**
  - [ ] Active Telegram account (@telegram on mobile/desktop)
  - [ ] BotFather bot token ready (from @BotFather)
  - [ ] Chat ID noted (from @userinfobot)
  
- [ ] **Steel Browser Account**
  - [ ] Subscription active (if cloud-hosted)
  - [ ] API key/bearer token obtained
  - [ ] Server reachable (test with curl)

- [ ] **Consensus Solver Service**
  - [ ] Webhook endpoint URL obtained
  - [ ] YOLO v8 model trained (or pre-trained available)
  - [ ] Service running and responding to test calls

### 1.3 Documentation Review

- [ ] **Read Before Proceeding**
  - [ ] README.md (overview)
  - [ ] QUICK-START-IMPORT.md (simplified version)
  - [ ] INTEGRATION-GUIDE.md (architecture)
  - [ ] 2CAPTCHA-WORKFLOW-GUIDE.md (technical reference)
  - [ ] IMPLEMENTATION-STATUS.md (testing report)

---

## 📋 PHASE 2: ENVIRONMENT SETUP (15 minutes)

### 2.1 Configuration File

- [ ] **Create .env file**
  ```bash
  cp .env.example .env
  ```

- [ ] **Edit .env with your values**
  ```bash
  nano .env  # or vim, code, etc.
  ```

### 2.2 Required Variables (MUST FILL ALL 6)

#### STEEL_BROWSER_URL ⚙️
```bash
# Local (self-hosted):
STEEL_BROWSER_URL=http://localhost:3000

# Cloud (if subscribed):
STEEL_BROWSER_URL=https://api.steelbrowser.io

# Test it:
curl -X GET {{ STEEL_BROWSER_URL }}/health
# Should return: 200 OK
```

#### STEEL_API_KEY 🔐
```bash
STEEL_API_KEY=sk_live_your_actual_api_key_here

# Obtain from Steel Browser dashboard
# Format: sk_live_[alphanumeric]
```

#### TWOCAPTCHA_EMAIL 📧
```bash
TWOCAPTCHA_EMAIL=your-email@example.com

# Must match registered 2captcha.com email
# Should NOT contain special characters (except @)
```

#### TWOCAPTCHA_PASSWORD 🔑
```bash
TWOCAPTCHA_PASSWORD=your_password_here

# Use plaintext (n8n encrypts before storage)
# Recommended: Use app-specific password if available
# Can contain special chars but avoid quotes (' ")
```

#### CONSENSUS_SOLVER_WEBHOOK_URL 🤖
```bash
CONSENSUS_SOLVER_WEBHOOK_URL=https://solver.example.com/api/predict

# Must be publicly accessible URL (or internal if n8n can reach it)
# Should accept POST requests
# Expected response format:
# { "prediction": "4", "confidence": 0.987 }
```

#### TELEGRAM_BOT_TOKEN 🤖
```bash
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11

# Get from @BotFather on Telegram
# Format: [numeric]:[alphanumeric_with_dashes]
```

#### TELEGRAM_CHAT_ID 💬
```bash
TELEGRAM_CHAT_ID=987654321

# Get from @userinfobot on Telegram
# Numeric ID only (usually starts with 1-9)
# NOT your @username
```

### 2.3 Verification

- [ ] **Check all variables are filled**
  ```bash
  grep -v '^#' .env | grep -v '^$'
  # Should show exactly 6 lines, all with values
  ```

- [ ] **Test each endpoint**
  ```bash
  # Steel Browser
  curl -X GET $STEEL_BROWSER_URL/health
  
  # Consensus Solver
  curl -X POST $CONSENSUS_SOLVER_WEBHOOK_URL -H "Content-Type: application/json" -d '{"test": true}'
  
  # Telegram Bot
  curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe
  ```

---

## 📋 PHASE 3: n8n SETUP (15 minutes)

### 3.1 n8n Installation & Launch

- [ ] **Install n8n** (if not already installed)
  ```bash
  npm install -g n8n
  ```

- [ ] **Start n8n**
  ```bash
  # Simple (local, SQLite):
  n8n start
  
  # Or with custom port:
  N8N_PORT=5678 n8n start
  ```

- [ ] **Verify n8n is running**
  ```bash
  curl http://localhost:5678
  # Should return HTML of n8n web interface
  ```

- [ ] **Open n8n in browser**
  ```
  http://localhost:5678
  ```

### 3.2 n8n Initial Setup

- [ ] **Create admin user** (if first time)
  - Email: Your email
  - Password: Strong password (recommended: use password manager)
  - Save credentials

- [ ] **Skip any tutorials** (optional)
  - Click "Skip" on welcome screens

### 3.3 Create Credentials (Optional - for visualization)

- [ ] **Create HTTP Basic Auth credential**
  - Name: "Steel Browser Auth"
  - Username: `steel_api` (or blank)
  - Password: `{{ $env.STEEL_API_KEY }}`
  - This makes nodes cleaner (optional)

---

## 📋 PHASE 4: WORKFLOW IMPORT (10 minutes)

### 4.1 Import JSON File

- [ ] **Click "New" button**
  - Top-left of n8n dashboard

- [ ] **Select "Import from File"**
  - Option appears in dropdown menu

- [ ] **Choose 2captcha-worker-n8n.json**
  - File selector opens
  - Navigate to `/Users/jeremy/dev/SIN-Solver/infrastructure/n8n/workflows/`
  - Select file

- [ ] **Wait for import to complete**
  - Progress bar shows
  - 27 nodes should load
  - Should complete in <5 seconds

### 4.2 Verify Import Success

- [ ] **No error messages appear**
  - Red error boxes = import failed
  - Check file not corrupted (run `python3 -m json.tool`)

- [ ] **All 27 nodes visible**
  ```
  Triggers:           2 nodes (Manual, Schedule)
  Session Management: 4 nodes (Initialize, Create, Navigate, Login)
  Main Loop:         12 nodes (Screenshot, Webhook, Conditions, etc)
  Recovery:           2 nodes (Break logic, Relogin)
  Notifications:      2 nodes (Telegram summary, errors)
  Cleanup:            1 node (Close session)
  Helpers:            2 nodes (Merge, Statistics)
  ```

- [ ] **Workflow name shows correctly**
  - Should be: "2captcha.com Worker - Play & Earn"

### 4.3 Inspect Node Connections

- [ ] **Click on canvas to view full workflow**
  - Zoom out to see all 27 nodes
  - Keyboard: `Ctrl/Cmd + 0` to fit view

- [ ] **Check for red error indicators**
  - Red "X" on node = configuration error
  - Red line between nodes = missing connection
  - Should have ZERO red indicators for production

---

## 📋 PHASE 5: CONFIGURATION (15 minutes)

### 5.1 Node-by-Node Setup

#### Trigger Nodes (No config needed)
- [ ] **Manual Trigger** - Already configured
- [ ] **Schedule Trigger** - Already set to every 150 minutes

#### HTTP Request Nodes (5 nodes using environment variables)
- [ ] **Steel Browser: Create Session**
  - [ ] Headers include Bearer token
  - [ ] URL points to `$env.STEEL_BROWSER_URL`
  
- [ ] **Steel Browser: Navigate**
  - [ ] URL is exactly: `https://2captcha.com/play-and-earn/play` ✅
  - [ ] Uses session ID from previous node
  
- [ ] **Steel Browser: Login**
  - [ ] Email: `$env.TWOCAPTCHA_EMAIL`
  - [ ] Password: `$env.TWOCAPTCHA_PASSWORD`
  
- [ ] **Webhook: Consensus Solver**
  - [ ] URL: `$env.CONSENSUS_SOLVER_WEBHOOK_URL`
  - [ ] Payload format matches solver API
  
- [ ] **Telegram Nodes (2)**
  - [ ] Token: `$env.TELEGRAM_BOT_TOKEN`
  - [ ] Chat ID: `$env.TELEGRAM_CHAT_ID`

#### Conditional Nodes (3)
- [ ] **Confidence >= 95%**
  - [ ] Condition: `{{ $json.confidence >= 0.95 }}`
  
- [ ] **Iterations < 100**
  - [ ] Condition: `{{ $json.iteration < 100 }}`
  
- [ ] **Session Expired?**
  - [ ] Condition: Auto-detected from HTTP errors

### 5.2 Enable Environment Variable Loading

- [ ] **n8n must read .env at startup**
  ```bash
  # Option A: Run from same directory as .env
  cd /path/to/workflows && n8n start
  
  # Option B: Use env file flag
  n8n start --env-file /path/to/.env
  
  # Option C: Use dotenv npm package
  npm install dotenv
  # Then require('dotenv').config() in startup
  ```

- [ ] **Verify variables loaded**
  - [ ] Open any HTTP node
  - [ ] In "URL" field, type `{{ $env.STEEL_BROWSER_URL }}`
  - [ ] Hover over field → Tooltip should show actual URL
  - [ ] If shows "undefined" → variables not loaded (restart n8n)

---

## 📋 PHASE 6: TESTING (20 minutes)

### 6.1 Sanity Checks (No Execution)

- [ ] **Node output types match**
  - [ ] Screenshot node outputs: `{ screenshot: "base64..." }`
  - [ ] Webhook outputs: `{ prediction: "...", confidence: 0.XX }`
  - [ ] Condition nodes output: boolean true/false

- [ ] **No hardcoded secrets visible**
  - [ ] Passwords NOT in node config
  - [ ] Only using `$env.VAR` references
  - [ ] Keys NOT visible in node preview

### 6.2 Manual Trigger Test

- [ ] **Click "Execute Workflow"**
  - Button in top-right of editor
  - Workflow starts immediately

- [ ] **Monitor execution in real-time**
  - Nodes highlight as they execute (left sidebar)
  - Expected sequence:
    1. Manual Trigger (instant)
    2. Merge (instant)
    3. Initialize (instant)
    4. Create Session (5 sec)
    5. Navigate (10-15 sec)
    6. Login (5-10 sec)
    7. Wait 3s (3 sec)
    8. Screenshot (2-3 sec)
    9. Webhook Consensus (depends on solver)
    10. Conditional (instant)
    11. Track Stats (instant)
    12. Check conditions (instant, likely loops)

- [ ] **Watch for errors** (red indicators)
  - None should appear in first 5 steps
  - If error: Check console, read error message

- [ ] **First execution may fail** (expected)
  - Webhook may fail if solver not ready
  - 2captcha may require additional verification
  - This is OK for first test run

### 6.3 Monitor Output

- [ ] **Check stdout/logs**
  - n8n logs should show execution progress
  - Look for warnings (yellow) vs errors (red)

- [ ] **Check session creation**
  - If Steel Browser call succeeds:
    - Output includes: `{ sessionId: "...", wsEndpoint: "..." }`
    - Indicates browser session created successfully

- [ ] **Check Telegram notification** (optional)
  - If execution completes:
    - Check Telegram for summary message
    - Verifies Telegram integration works

### 6.4 Detailed Logging

- [ ] **Enable debug mode** (optional, advanced)
  ```bash
  DEBUG=* n8n start
  # Verbose output for troubleshooting
  ```

- [ ] **Save execution output**
  - Click on execution in "Executions" list
  - Save output JSON for later review
  - Compare against expected output format

### 6.5 Error Scenarios (Optional - Test Edge Cases)

- [ ] **Test 2captcha login failure**
  - Temporarily use wrong password
  - Workflow should handle error gracefully
  - Revert to correct password

- [ ] **Test solver webhook timeout**
  - Kill solver service temporarily
  - Workflow should timeout & retry
  - Restart solver

- [ ] **Test Telegram failure**
  - Use wrong token temporarily
  - Workflow continues despite notification failure
  - Revert token

---

## 📋 PHASE 7: OPTIMIZATION (10 minutes)

### 7.1 Fine-Tune Parameters

- [ ] **Confidence threshold**
  - Default: 0.95 (95%)
  - Increase to 0.98 for higher accuracy (fewer attempts)
  - Decrease to 0.85 for higher volume (more submissions)
  - Location: Conditional node "Confidence >= 95%"

- [ ] **Iteration limit**
  - Default: 100 iterations per cycle
  - Can increase to 120 for longer sessions
  - Can decrease to 50 for shorter cycles
  - Location: Conditional node "Iterations < 100"

- [ ] **Break duration**
  - Default: 5-15 minutes random
  - Can adjust in "Wait" node
  - Shorter = faster earnings, higher risk of ban
  - Longer = slower earnings, lower detection risk

- [ ] **Wait times**
  - Default: 3 seconds after login
  - Can adjust if getting errors on screenshot

### 7.2 Performance Tuning

- [ ] **Database optimization** (if self-hosted)
  - Set up PostgreSQL instead of SQLite (for speed)
  - Run database vacuum weekly

- [ ] **Resource limits**
  - Set memory limit: 1 GB minimum, 2 GB recommended
  - Set CPU cores: At least 2 cores

- [ ] **Network optimization**
  - Ensure low-latency connection to 2captcha.com
  - Use VPN if experiencing blocks (optional)

---

## 📋 PHASE 8: ACTIVATION (5 minutes)

### 8.1 Schedule Enablement

- [ ] **Toggle workflow to ACTIVE**
  - Look for "Active" toggle in workflow settings
  - Switch to ON (should turn green)
  - Workflow now auto-executes on schedule

- [ ] **Verify schedule is set**
  - Schedule Trigger shows: "Every 150 minutes"
  - Next run time displayed: `[timestamp]`
  - Cannot be earlier than 150 minutes from now

- [ ] **First scheduled execution**
  - Will happen within next 150 minutes
  - Monitor "Executions" tab to confirm
  - Check for success/errors

### 8.2 Monitoring Setup

- [ ] **Set up execution alerts**
  - Click "Executions" tab
  - Enable notifications for failures (optional)
  - Set email/webhook for alerts

- [ ] **Monitor Telegram notifications**
  - Check Telegram daily
  - Look for session summaries every 2.5 hours
  - Alert messages indicate problems

- [ ] **Create monitoring dashboard**
  - Optional: Use Grafana/MetaMetrics
  - Track success rate over time
  - Monitor earnings trajectory

---

## 📋 PHASE 9: TROUBLESHOOTING (As Needed)

### Common Issues & Quick Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| **JSON import fails** | File corrupted | Re-download 2captcha-worker-n8n.json |
| **Environment var undefined** | .env not loaded | Restart n8n from same directory as .env |
| **Steel connection fails** | Steel server down | `curl $STEEL_BROWSER_URL/health` |
| **Login fails** | Wrong credentials | Test in browser manually first |
| **Solver webhook times out** | Solver too slow | Increase timeout in HTTP node to 60s |
| **No Telegram messages** | Wrong token/chat ID | Verify with @userinfobot, @BotFather |
| **Loop doesn't progress** | Bad condition | Check: `$json.iteration < 100` |
| **High error rate** | 2captcha page changed | Update CSS selectors in Steel nodes |

### Deep Debugging

- [ ] **Check n8n logs**
  ```bash
  # If running with PM2:
  pm2 logs n8n
  
  # If running in Docker:
  docker logs container_name
  ```

- [ ] **Check network connectivity**
  ```bash
  curl -v https://2captcha.com/play-and-earn/play
  # Should get 200 OK
  ```

- [ ] **Check solver endpoint**
  ```bash
  curl -X POST $CONSENSUS_SOLVER_WEBHOOK_URL \
    -H "Content-Type: application/json" \
    -d '{"image": "test", "model": "yolov8"}'
  # Should return valid JSON
  ```

---

## 📋 PHASE 10: PRODUCTION LAUNCH (1 minute)

### Final Checklist Before Going Live

- [ ] ✅ All 6 environment variables filled in .env
- [ ] ✅ n8n running and accessible
- [ ] ✅ JSON file imported successfully (27 nodes)
- [ ] ✅ Manual test execution passed
- [ ] ✅ No red error indicators visible
- [ ] ✅ Schedule trigger set to every 150 minutes
- [ ] ✅ Workflow toggled to ACTIVE
- [ ] ✅ Telegram notifications working
- [ ] ✅ Steel Browser connection verified
- [ ] ✅ 2captcha account ready to earn

### Launch Command

```bash
# If you stopped n8n for configuration changes:
n8n start
# Workflow auto-starts on schedule (no manual action needed)
```

### Expected Behavior (After Launch)

**Hour 1 (Now):**
- Workflow is ACTIVE
- Schedule trigger is armed
- Next execution: ~150 minutes from now

**Within 2.5 hours:**
- First scheduled execution fires
- Telegram receives session summary
- Workflow loops 100 iterations, earns ~$7.50

**Daily:**
- ~9-10 cycles run automatically
- ~$72-77 earned per day
- Passive income (no manual intervention)

**Weekly:**
- ~500+ CAPTCHAs solved
- ~$500+ earned
- Monitor via Telegram notifications

---

## 🎯 Post-Launch Maintenance

### Daily (2 minutes)

- [ ] Check Telegram for error alerts
- [ ] Verify at least one execution ran successfully
- [ ] Check current account balance on 2captcha.com

### Weekly (10 minutes)

- [ ] Review success rate in n8n dashboard
- [ ] Check average confidence score
- [ ] Estimate earnings vs projections

### Monthly (30 minutes)

- [ ] Rotate 2captcha.com password
- [ ] Rotate Telegram bot token
- [ ] Review logs for patterns/errors
- [ ] Update documentation if needed
- [ ] Consider parameter optimization

### As Needed

- [ ] If 2captcha page layout changes → Update Steel nodes
- [ ] If solver accuracy drops → Retrain YOLO model
- [ ] If getting rate-limited → Increase break duration
- [ ] If session expiry increases → Check network stability

---

## 📞 Support Resources

| Question | Resource |
|----------|----------|
| **How to import JSON?** | QUICK-START-IMPORT.md |
| **Workflow architecture?** | INTEGRATION-GUIDE.md |
| **Node-by-node details?** | 2CAPTCHA-WORKFLOW-GUIDE.md |
| **Test results?** | IMPLEMENTATION-STATUS.md |
| **General overview?** | README.md |
| **Issues not covered?** | Check GitHub issues or create support ticket |

---

**Status After This Checklist: DEPLOYMENT READY ✅**

Next: Monitor first execution in ~2.5 hours, then enjoy passive income!

---

*Last Updated: 2026-01-30*  
*Document Version: 1.0*  
*Estimated Read Time: 8 minutes*  
*Estimated Execution Time: 60 minutes*
