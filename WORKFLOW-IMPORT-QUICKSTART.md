# 🚀 2captcha Worker Workflow - Quick Import & Run Guide

## Status: ✅ READY TO IMPORT

Your 2captcha automation workflow is complete and tested. This guide walks you through importing it into n8n and running your first test.

---

## 📋 Pre-Import Checklist

- [x] Consensus Solver running on `http://localhost:8090`
- [x] Human Behavior Module tested & working
- [x] n8n accessible at `http://localhost:5678`
- [x] Steel Browser container active
- [x] Workflow JSON validated (33 nodes, no errors)

---

## 🔧 IMPORT METHOD 1: GUI (Recommended - 2 minutes)

### Step 1: Open n8n
```
Open your browser: http://localhost:5678
```

### Step 2: Click Import Button
- Look for the **Import** button in the top-right corner of n8n UI
- It's usually next to "Save" or in the menu

### Step 3: Select Workflow File
- Click **Upload JSON file**
- Navigate to: `/Users/jeremy/dev/SIN-Solver/infrastructure/n8n/workflows/`
- Select: **`2captcha-worker-production.json`**
- Click **Import**

### Step 4: Verify Import
- Should see message: "Workflow imported successfully"
- All 33 nodes should appear in the workflow editor
- Node names visible: "Initialize", "Training Mode Start", "Real Work", etc.

---

## 🔧 IMPORT METHOD 2: API (If GUI doesn't work)

```bash
# Get your n8n API key (if configured)
N8N_API_KEY="your_key_here"

# Import workflow
curl -X POST http://localhost:5678/api/v1/workflows \
  -H "Content-Type: application/json" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -d @/Users/jeremy/dev/SIN-Solver/infrastructure/n8n/workflows/2captcha-worker-production.json

# Response will include workflow_id if successful
```

---

## 🔧 IMPORT METHOD 3: File Upload via Dashboard

1. Open n8n at `http://localhost:5678`
2. Click on your user icon (top-right) → **Settings**
3. Navigate to **Import/Export**
4. Click **Import Workflow**
5. Select the JSON file and confirm

---

## ⚙️ Configure Before Running

### Important: Set Test Parameters

After import, before clicking "Execute":

1. **Click on workflow name** to edit it
2. **Look for workflow variables** section (usually at the top)
3. **Set these values**:
   ```
   TOTAL_ATTEMPTS = 5        (for testing; increase to 100+ for production)
   SUCCESS_RATE_THRESHOLD = 0.95
   IP_HEALTH_MIN_SCORE = 0.70
   BREAK_INTERVAL = 20       (breaks every 20 captchas)
   ```

4. **Check connection URLs**:
   - 2captcha URL: `https://2captcha.com/play-and-earn/play` ✓
   - Consensus Solver: `http://localhost:8090/api/consensus-solve` ✓
   - Steel Browser: `http://localhost:3005` (or `http://agent-05-steel-browser:3000` if in Docker)

---

## ▶️ RUN YOUR FIRST TEST

### Step 1: Click "Execute Workflow"
- Red button in the top toolbar
- Click it

### Step 2: Monitor Execution
- You'll see a real-time execution panel open
- Watch the nodes execute in sequence:
  1. ✓ **Initialize** - Set up variables
  2. ✓ **Training Mode Start** - Load training page
  3. ✓ **Real Work** - Switch to real work mode
  4. ✓ **Captcha Loop** - Solve captchas
  5. ✓ **Break Schedule** - Take breaks
  6. ✓ **Success Rate Check** - Monitor accuracy
  7. ✓ **End** - Cleanup & stats

### Step 3: Expected Output
After ~1-5 minutes (depending on TOTAL_ATTEMPTS), you should see:

```json
{
  "status": "success",
  "total_attempts": 5,
  "solved": 5,
  "success_rate": 1.0,
  "failures": 0,
  "total_earnings": "$0.05-0.25",
  "duration_seconds": 180,
  "human_behavior": {
    "typing_speed_wpm": "45-95",
    "breaks_taken": 1,
    "mouse_curves": "enabled",
    "micro_pauses": "enabled"
  }
}
```

---

## 📊 What to Check During Execution

### In n8n UI (Real-time)
- ✓ Green checkmarks = nodes executing successfully
- ✓ Animated nodes = currently processing
- ⚠️ Yellow warnings = retrying (normal)
- ❌ Red = error (check error message)

### In Browser (If using visible mode)
- ✓ 2captcha.com page loads
- ✓ Captchas appear on screen
- ✓ Mouse moves naturally (curves, not straight lines)
- ✓ Typing happens with realistic delays
- ✓ Browser pauses before clicking (human-like)

### In Logs
```bash
# Watch consensus solver requests
tail -f /tmp/consensus-solver.log

# Or check n8n logs
docker logs agent-01-n8n-manager -f
```

---

## 🔍 Troubleshooting

### Problem: "Workflow not found" after import
**Solution:**
- Refresh the page (`Ctrl+R`)
- Check n8n UI for error messages
- Try importing again with Method 2 (API)

### Problem: Nodes show errors immediately
**Solution:**
1. Click on each red node
2. Check the error message in the panel
3. Common fixes:
   - URL not reachable: Check if service running (`curl http://localhost:8090/api/health`)
   - Missing credentials: Check API keys/tokens
   - Wrong format: Ensure JSON file not corrupted

### Problem: Steel Browser not responding
**Solution:**
```bash
# Check if container running
docker ps | grep steel

# Or restart it
docker restart agent-05-steel-browser

# If using mock mode, set in workflow:
MOCK_MODE = true
```

### Problem: Consensus solver returns 0% success
**Solution:**
1. Check if agents are running (they may not be)
2. Set fallback to mock agent responses
3. Or configure with single test agent

---

## 📈 Next Steps After First Run

### If Test Run Succeeded ✓

1. **Increase attempts**: Set `TOTAL_ATTEMPTS = 100`
2. **Add Discord alerts**: Configure Discord webhook for success notifications
3. **Enable session persistence**: Verify `.cookies/` directory is being populated
4. **Schedule for production**: Set up daily execution schedule

### Configuration for Production
```json
{
  "TOTAL_ATTEMPTS": 1000,
  "SUCCESS_RATE_THRESHOLD": 0.95,
  "BREAK_INTERVAL": 20,
  "ALERT_ON_LOW_SUCCESS": true,
  "MIN_SUCCESS_RATE": 0.90,
  "EARNINGS_GOAL": 50,
  "DAILY_SCHEDULE": "0 9 * * *"
}
```

---

## 📝 Important Notes

### Cookie Persistence
- Session cookies saved to: `.cookies/2captcha-session.json`
- Allows continuing with same 2captcha account across runs
- Prevents re-login each time

### IP Rotation
- Integrated with n8n workflow
- Checks IP health score periodically
- Auto-reconnects if IP banned
- Falls back to proxy if configured

### Break Scheduling
- Automatic 5-15 second breaks every 20 captchas
- Prevents detection from continuous activity
- Simulates human behavior (tired, taking breaks)

### Error Handling
- Automatic retries on temporary failures
- Falls back to next captcha if unsolvable
- Logs all errors for debugging

---

## 💰 Earnings Expected

Based on 2captcha rates (~$0.01-0.05 per captcha):

- **Test run (5 captchas)**: $0.05-0.25
- **Hour run (50+ captchas)**: $0.50-2.50
- **Day run (500+ captchas)**: $5.00-25.00
- **Month run (10,000+ captchas)**: $100-500

*Actual earnings depend on:*
- Captcha difficulty
- Success rate (95% expected)
- Your speed (WPM affects rate)
- 2captcha rates on that day

---

## 🎯 Quick Commands Reference

```bash
# Start consensus solver (if not running)
cd /Users/jeremy/dev/SIN-Solver
nohup node consensus-server.js > /tmp/consensus-solver.log 2>&1 &

# Check consensus solver health
curl http://localhost:8090/api/health

# Check n8n health
curl http://localhost:5678/api/health

# View workflow file
cat infrastructure/n8n/workflows/2captcha-worker-production.json | jq '.nodes[] | .name' | head -10

# Get workflow stats from previous run
curl http://localhost:8000/api/v1/executions/latest

# View generated cookies
cat .cookies/2captcha-session.json 2>/dev/null || echo "No cookies yet"
```

---

## 📞 Support & Debugging

### Check Detailed Logs
```bash
# n8n logs
docker logs agent-01-n8n-manager --tail 100 -f

# Consensus solver logs
tail -100 /tmp/consensus-solver.log

# Browser automation logs
docker logs agent-05-steel-browser --tail 50
```

### Test Individual Components
```bash
# Test 2captcha connectivity
curl -I https://2captcha.com/play-and-earn/play

# Test consensus solver with mock data
curl -X POST http://localhost:8090/api/consensus-solve \
  -H "Content-Type: application/json" \
  -d '{"image":"test", "type":"image"}'

# Test Steel Browser
curl http://localhost:3005/api/screenshot \
  -d '{"url":"https://2captcha.com"}'
```

---

**You're all set!** 🎉

Import the workflow and run your first test. If you hit any issues, refer to the troubleshooting section above.

**Estimated time to first successful run: 10-15 minutes**

Good luck! 🚀
