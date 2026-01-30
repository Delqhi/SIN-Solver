# PHASE 3: WORKFLOW IMPORT GUIDE

**Status:** Ready for Import  
**Workflow:** 2captcha Worker - Production  
**Nodes:** 33  
**Connections:** 32  
**Duration:** 12-15 minutes

---

## STEP 1: VERIFY PREREQUISITES (1 minute)

✅ **All verified:**
- n8n running at `http://localhost:5678`
- Consensus Solver healthy at `http://localhost:8090`
- Steel Browser running at `http://localhost:3005`
- Workflow file exists and validated
- .cookies/ directory created

---

## STEP 2: OPEN n8n INTERFACE (30 seconds)

1. Open your browser
2. Go to: **`http://localhost:5678`**
3. You should see the n8n dashboard

---

## STEP 3: ACCESS IMPORT MENU (2 minutes)

### Method A: Using Menu (Recommended)
1. Click the **☰ (hamburger menu)** in the top-left corner
2. Click **"Workflows"**
3. Click **"Import"**

### Method B: Using Keyboard Shortcut
1. Press **`Ctrl+K`** (or **`Cmd+K`** on Mac)
2. Type: **`import`**
3. Press **Enter**

---

## STEP 4: IMPORT WORKFLOW JSON (5 minutes)

### Option A: Direct File Copy (EASIEST)

1. **Get the JSON from file:**
   ```bash
   cat /Users/jeremy/dev/SIN-Solver/infrastructure/n8n/workflows/2captcha-worker-production.json | pbcopy
   ```
   (This copies to clipboard on Mac. On Linux: use `xclip -sel c` instead)

2. **In n8n import dialog:**
   - Click in the text area
   - Paste with **Ctrl+V** (or **Cmd+V** on Mac)
   - Click **"Import"**

### Option B: Manual Copy-Paste

1. **View the workflow file:**
   ```bash
   cat /Users/jeremy/dev/SIN-Solver/infrastructure/n8n/workflows/2captcha-worker-production.json | jq .
   ```

2. **Copy all output (from opening `{` to closing `}`)**

3. **Paste into n8n import dialog**

4. **Click "Import"**

### Option C: File Upload (If Available)

1. Some n8n versions allow file upload
2. Navigate to workflow file in file picker
3. Select: `/Users/jeremy/dev/SIN-Solver/infrastructure/n8n/workflows/2captcha-worker-production.json`

---

## STEP 5: VERIFY IMPORT SUCCESS (3 minutes)

After importing, you should see:

✅ **Workflow "2captcha Worker - Production" appears in list**

✅ **Opening workflow shows:**
- 33 nodes visible on canvas
- All nodes connected properly
- No red error indicators
- Start node in top-left

✅ **Visible nodes:**
```
1.  Start
2.  Initialize Steel Browser
3.  Navigate to Training Mode
4.  Screenshot Training Page
5.  Check Page State
6.  Navigate to Real Work Mode
7.  Capture Screenshot
8.  Analyze Captcha
... (27 more nodes)
```

---

## STEP 6: CONFIGURE VARIABLES (5 minutes)

### Access Variables Panel

1. Click **"Execute Workflow"** button (don't click yet!)
2. Before executing, look for **"Variables"** section
3. Click to expand

### Configure These 9 Variables

| Variable | Value | Purpose |
|----------|-------|---------|
| **TOTAL_ATTEMPTS** | `5` | How many captchas to solve |
| **SUCCESS_RATE_THRESHOLD** | `0.95` | Minimum 95% confidence required |
| **BREAK_INTERVAL** | `20` | Solve 20 captchas then take break |
| **BREAK_MIN_DURATION** | `5000` | Min break time (5 seconds) in ms |
| **BREAK_MAX_DURATION** | `15000` | Max break time (15 seconds) in ms |
| **COOKIES_PATH** | `.cookies/2captcha-session.json` | Where to save session |
| **CONSENSUS_SOLVER_URL** | `http://localhost:8090` | 3-agent consensus API |
| **STEEL_BROWSER_URL** | `http://localhost:3005` | Browser automation API |
| **TARGET_URL** | `https://2captcha.com/play-and-earn/play` | Website to automate |

### How to Set Variables in n8n

1. **Find the variable input field** (usually near Execute button)
2. **For each variable:**
   - Click the field
   - Enter the value from table above
   - Press Enter or Tab to confirm

3. **Example settings:** 
   ```
   TOTAL_ATTEMPTS: 5
   SUCCESS_RATE_THRESHOLD: 0.95
   BREAK_INTERVAL: 20
   BREAK_MIN_DURATION: 5000
   BREAK_MAX_DURATION: 15000
   COOKIES_PATH: .cookies/2captcha-session.json
   CONSENSUS_SOLVER_URL: http://localhost:8090
   STEEL_BROWSER_URL: http://localhost:3005
   TARGET_URL: https://2captcha.com/play-and-earn/play
   ```

---

## STEP 7: SAVE WORKFLOW (1 minute)

1. **Click "Save" button** in top-right
2. **Wait for confirmation** (should say "Saved")
3. **Workflow is now ready for execution**

---

## ✅ PHASE 3 COMPLETE CHECKLIST

- [ ] Opened n8n at `http://localhost:5678`
- [ ] Clicked Menu → Workflows → Import
- [ ] Copied workflow JSON (or pasted from file)
- [ ] Clicked "Import"
- [ ] Verified 33 nodes imported successfully
- [ ] No red error indicators on nodes
- [ ] Configured all 9 variables correctly
- [ ] Clicked "Save"
- [ ] Workflow shows as ready

---

## TROUBLESHOOTING

### Issue: "Import Failed" Error
- **Solution:** Check JSON is valid: `cat workflow.json | jq .`
- **Solution:** Try copy-pasting in smaller chunks if JSON is large

### Issue: Nodes show red error indicators
- **Possible Cause:** Variables not set correctly
- **Solution:** Check all 9 variables are configured
- **Solution:** Verify CONSENSUS_SOLVER_URL and STEEL_BROWSER_URL are correct

### Issue: Can't find Import button
- **Solution:** Make sure you're logged in to n8n
- **Solution:** Try keyboard shortcut: `Ctrl+K` → type "import"
- **Solution:** Check if menu (☰) appears in top-left corner

### Issue: Browser won't start at localhost:5678
- **Solution:** Check if n8n container is running: `docker ps | grep n8n`
- **Solution:** Restart n8n: `docker-compose down && docker-compose up -d`
- **Solution:** Wait 30 seconds for n8n to fully start

### Issue: Workflow imported but looks incomplete
- **Solution:** Scroll the canvas to see all nodes
- **Solution:** Click "Zoom Fit" button to see entire workflow
- **Solution:** Refresh page with F5

---

## NEXT STEPS (AFTER THIS PHASE)

### Phase 4: Execute Workflow (20-30 minutes)
1. Click "Execute Workflow" button
2. Watch as system solves 5 test captchas
3. Monitor progress in logs below canvas

### Phase 5: Review Results (5 minutes)
1. Check execution logs for success metrics
2. Verify session cookie created: `.cookies/2captcha-session.json`
3. Calculate earnings: $0.14-$0.24 (expected)

---

## ESTIMATED TIMELINE

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 3A: Import Workflow | 5 min | 👈 **YOU ARE HERE** |
| Phase 3B: Configure Variables | 5 min | Next |
| Phase 3C: Save & Verify | 2 min | Next |
| Phase 4: Execute Test | 20-30 min | After Phase 3 |
| Phase 5: Analyze Results | 5 min | After Phase 4 |
| **TOTAL** | **37-47 min** | Starting now |

---

## QUICK COMMANDS (For Reference)

```bash
# Verify n8n is running
curl http://localhost:5678 -I

# View workflow file
cat /Users/jeremy/dev/SIN-Solver/infrastructure/n8n/workflows/2captcha-worker-production.json | jq .

# Copy to clipboard (Mac)
cat /Users/jeremy/dev/SIN-Solver/infrastructure/n8n/workflows/2captcha-worker-production.json | pbcopy

# Verify Consensus Solver is running
curl http://localhost:8090/api/health | jq .

# Check Steel Browser is running
curl http://localhost:3005 -I
```

---

## SUCCESS INDICATORS

**When Phase 3 is complete, you should have:**

✅ Workflow "2captcha Worker - Production" in n8n  
✅ All 33 nodes visible and connected  
✅ All 9 variables configured  
✅ No red error indicators  
✅ Workflow saved and ready to execute  

**Then you can proceed to Phase 4: Execute Workflow**

---

## SUPPORT

If anything goes wrong:
1. Check troubleshooting section above
2. Verify all services running: `docker ps`
3. Check logs: `docker logs agent-01-n8n-orchestrator`
4. Restart services: `docker-compose restart`

