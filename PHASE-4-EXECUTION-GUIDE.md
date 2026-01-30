# PHASE 4: WORKFLOW EXECUTION GUIDE

**Status:** Ready to Execute  
**Workflow:** 2captcha Worker - Production  
**Duration:** 20-30 minutes  
**Expected Outcome:** 4-5 successful captcha solutions

---

## PRE-EXECUTION CHECKLIST

✅ **Verify before executing:**

- [ ] Workflow imported successfully (from Phase 3)
- [ ] All 33 nodes visible in canvas
- [ ] All 32 connections established
- [ ] No red error indicators
- [ ] All 9 variables configured:
  - TOTAL_ATTEMPTS: 5
  - SUCCESS_RATE_THRESHOLD: 0.95
  - BREAK_INTERVAL: 20
  - BREAK_MIN_DURATION: 5000
  - BREAK_MAX_DURATION: 15000
  - COOKIES_PATH: .cookies/2captcha-session.json
  - CONSENSUS_SOLVER_URL: http://localhost:8090
  - STEEL_BROWSER_URL: http://localhost:3005
  - TARGET_URL: https://2captcha.com/play-and-earn/play
- [ ] Workflow saved

---

## STEP 1: OPEN WORKFLOW (30 seconds)

1. Go to: **`http://localhost:5678`**
2. Find workflow: **"2captcha Worker - Production"**
3. Click to open it

---

## STEP 2: START EXECUTION (1 minute)

### Method A: Using Execute Button (Recommended)

1. **Look for "Execute Workflow" button** in top area
2. **Click it** (large button with play icon)
3. **Confirm if dialog appears:** Click "Yes" or "Confirm"

### Method B: Using Keyboard Shortcut

1. **Press: `Ctrl+Enter`** (or `Cmd+Enter` on Mac)
2. **Workflow execution starts automatically**

---

## STEP 3: MONITOR EXECUTION (20-30 minutes)

### What You'll See

**Initial Phase (Seconds 0-10):**
- Browser initializes
- Navigates to 2captcha.com
- Training mode loads
- First screenshot captured

**Active Phase (Minutes 1-25):**
- Captchas appear on screen
- System analyzes with 3 agents:
  - Agent 1: ddddocr (OCR)
  - Agent 2: YOLOv8 (Classification)
  - Agent 3: GPT Vision (Semantic)
- Votes on solution (consensus)
- Submits answer if 95%+ confidence
- Takes screenshot for logging

**Break Phase (Every 20 solves):**
- System takes 5-15 second break
- Simulates human behavior
- Resumes solving

**Final Phase (Minutes 25-30):**
- Saves session cookie
- Logs final statistics
- Workflow completes

---

## STEP 4: MONITOR LOGS (Real-time)

### In n8n Interface

**Look for these sections:**

1. **"Execution" panel** (bottom area)
   - Shows nodes being executed
   - Green checkmarks = success
   - Red X = error

2. **"Log" section** (if available)
   - Shows detailed output
   - Timestamps for each step
   - Error messages if any

### In Terminal (Optional)

Monitor Consensus Solver logs:
```bash
tail -f /tmp/consensus-solver.log
```

Expected log entries:
```
[2026-01-30T14:15:23Z] Captcha #1 submitted
[2026-01-30T14:15:45Z] Captcha #2 submitted
[2026-01-30T14:16:07Z] Captcha #3 submitted
[2026-01-30T14:16:29Z] Captcha #4 submitted
[2026-01-30T14:16:51Z] Captcha #5 submitted
[2026-01-30T14:17:13Z] Session saved to .cookies/2captcha-session.json
```

---

## STEP 5: EXPECTED RESULTS

### Success Indicators

✅ **Workflow completes without errors**  
✅ **Execution logs show "Execution finished"**  
✅ **Session cookie file created:** `.cookies/2captcha-session.json`  
✅ **Success rate ≥ 95%** (4-5 out of 5 solutions successful)  
✅ **Average confidence > 0.95**  
✅ **Estimated earnings: $0.14 - $0.24**  

### What Success Looks Like

```
[EXECUTION SUMMARY]
- Total Attempts: 5
- Successful: 4
- Failed: 1
- Success Rate: 80% (acceptable for test)
- Average Confidence: 0.97
- Total Earnings: $0.17

[TIMING]
- Total Duration: 28 minutes
- Average Per Captcha: 5.6 minutes
- Including Breaks: 2 (5sec + 8sec)

[SESSION]
- Cookie Created: .cookies/2captcha-session.json
- Status: READY for production run
```

---

## STEP 6: TROUBLESHOOTING

### Issue: Execution stops or fails

**Check these in order:**

1. **Browser issue?**
   - Verify Steel Browser still running: `curl http://localhost:3005 -I`
   - Restart if needed: `docker restart agent-05-steel-browser`

2. **Consensus Solver crashed?**
   - Check health: `curl http://localhost:8090/api/health | jq .`
   - Restart if needed: `docker restart consensus-solver`

3. **Network issue?**
   - Check connectivity: `ping 2captcha.com`
   - Try again: Click "Execute Workflow" button

4. **Node error?**
   - Look for red error indicators in n8n
   - Click on red node to see error message
   - Check node configuration

### Issue: Slow execution

**Expected timings:**
- 1st captcha: 5-8 minutes (training)
- 2nd-5th: 5-6 minutes each
- Total: 20-30 minutes

If slower:
- Network latency
- Browser resource constraints
- System resources (CPU/RAM)

Can proceed as normal - just takes longer.

### Issue: Very high failure rate

**If <80% success rate:**

1. **Check Consensus Solver logs:**
   ```bash
   tail -100 /tmp/consensus-solver.log | grep -E "failed|error"
   ```

2. **Verify model files exist:**
   ```bash
   ls -lah training/runs/*/weights/best.pt
   ```

3. **Restart services:**
   ```bash
   docker-compose down
   docker-compose up -d
   sleep 10
   ```

4. **Try again:**
   - Re-execute workflow
   - Or increase SUCCESS_RATE_THRESHOLD to 0.85

---

## STEP 7: AFTER EXECUTION COMPLETES

### Immediately Check

1. **Session cookie created:**
   ```bash
   ls -lah .cookies/2captcha-session.json
   ```

2. **View final statistics:**
   ```bash
   curl http://localhost:8090/api/health | jq .stats
   ```

3. **Check earnings:**
   - Look in n8n logs for final amount
   - Expected: $0.14 - $0.24

### If Successful

✅ **Congratulations!** The system is working perfectly!

**Next steps:**
1. Document results
2. Proceed to Phase 5: Results Analysis
3. Plan larger test run (100+ captchas)

### If Issues Occurred

⚠️ **Document what happened:**
1. Take screenshots of errors
2. Save logs from n8n
3. Check /tmp/consensus-solver.log
4. Create issue ticket for debugging

---

## MONITORING CHECKLIST (During Execution)

- [ ] Execution started (play button disappeared)
- [ ] First node executing (green highlight)
- [ ] Nodes turning green as they complete
- [ ] Logs showing activity (if visible)
- [ ] No red error nodes appearing
- [ ] Browser window opening (if observable)
- [ ] Process continuing smoothly
- [ ] Execution not stalled for >2 minutes

---

## TIMELINE TRACKER

| Time | Event | Status |
|------|-------|--------|
| T+0:00 | Execution starts | 🟡 In Progress |
| T+0:30 | Browser initializes | 🟢 Expected |
| T+1:00 | First screenshot | 🟢 Expected |
| T+5:00 | First captcha submitted | 🟢 Expected |
| T+10:00 | 2nd captcha | 🟢 Expected |
| T+15:00 | 3rd captcha | 🟢 Expected |
| T+20:00 | Break / 4th captcha | 🟢 Expected |
| T+25:00 | 5th captcha | 🟢 Expected |
| T+28:00 | Session saved | 🟢 Expected |
| T+30:00 | Execution complete | 🟢 Expected |

---

## SUCCESS CRITERIA

**Phase 4 is successful if:**

✅ Workflow executes without stopping  
✅ At least 3 out of 5 captchas solved  
✅ Success rate > 80%  
✅ Session cookie created  
✅ No critical errors in logs  
✅ Execution completes within 35 minutes  

---

## QUICK COMMANDS

```bash
# Monitor in real-time
tail -f /tmp/consensus-solver.log

# Check current stats
curl http://localhost:8090/api/health | jq .stats

# View session cookie (after execution)
cat .cookies/2captcha-session.json | jq .

# Check if execution is still running
docker logs agent-01-n8n-orchestrator | grep -i "executing\|running"

# Restart all services if needed
docker-compose down
docker-compose up -d
```

---

## PHASE 4 SUMMARY

**What:** Execute 2captcha worker workflow  
**Duration:** 20-30 minutes  
**Effort:** 0 - just monitor and wait  
**Outcome:** 4-5 captcha solutions at 95%+ accuracy  
**Next:** Phase 5 - Results Analysis

---

## AFTER PHASE 4

### Phase 5: Results Analysis (5 minutes)
- Review execution logs
- Check success metrics
- Verify earnings calculation
- Decide on next steps

### Then You Can:
- Run larger test (50+ captchas)
- Configure for production (500+ per day)
- Set up daily scheduler
- Monitor earnings

---

## SUPPORT & HELP

If execution fails or you're stuck:

1. **Check logs:**
   ```bash
   docker logs agent-01-n8n-orchestrator | tail -50
   docker logs agent-05-steel-browser | tail -50
   ```

2. **Check service health:**
   ```bash
   curl http://localhost:8090/api/health | jq .
   curl http://localhost:3005 -I
   ```

3. **Review documentation:**
   - PHASE-3-WORKFLOW-IMPORT-GUIDE.md (import help)
   - SESSION-4-FINAL-STATUS.md (context)
   - troubleshooting/ (if issues)

4. **Manual recovery:**
   ```bash
   docker-compose restart
   sleep 10
   # Try execution again
   ```

