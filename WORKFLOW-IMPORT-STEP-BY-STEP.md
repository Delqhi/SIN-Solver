# 🚀 WORKFLOW IMPORT - STEP-BY-STEP GUIDE

## ✅ PRE-IMPORT CHECKLIST (COMPLETED)

- [x] Workflow file validated: 33 nodes, 32 connections
- [x] All services running (consensus, n8n, steel browser)
- [x] n8n accessible at http://localhost:5678
- [x] File ready: `/Users/jeremy/dev/SIN-Solver/infrastructure/n8n/workflows/2captcha-worker-production.json` (23 KB)

**Status: READY FOR IMPORT** ✅

---

## 📋 STEP 1: OPEN n8n DASHBOARD (1 minute)

1. Open your web browser
2. Navigate to: **http://localhost:5678**
3. You should see the n8n dashboard

**Expected Screen**: 
- Main n8n interface with "Create New Workflow" button
- OR: Dashboard showing 0 workflows (empty state)

**If you see a login screen**:
- n8n doesn't have default auth, click through any prompts
- If blocked, try: http://localhost:5678/workflows

---

## 📋 STEP 2: IMPORT WORKFLOW (2-3 minutes)

### Method A: Using n8n UI Import Button (Recommended)

1. In the n8n dashboard, look for the **"Import"** button or menu
2. Click it
3. Select **"Import from file"** (if given options)
4. A file picker will open
5. Navigate to and select:
   ```
   /Users/jeremy/dev/SIN-Solver/infrastructure/n8n/workflows/2captcha-worker-production.json
   ```
6. Click "Open" or "Import"
7. Wait 5-10 seconds for import to complete

**Expected Result**:
- Dialog shows "Import Successful" or similar
- You're redirected to the workflow editor
- The workflow name appears: "2captcha Worker - Production"
- You see the workflow canvas with 33 nodes

### Method B: Using Command Line (If UI Import Doesn't Work)

If the UI import isn't available, try this alternative:

```bash
# Copy workflow to n8n's import location
cp /Users/jeremy/dev/SIN-Solver/infrastructure/n8n/workflows/2captcha-worker-production.json \
   ~/.n8n/workflows/

# Restart n8n to pick up the workflow
docker restart agent-01-n8n-orchestrator

# Wait for restart
sleep 10

# Verify it loaded
curl -s http://localhost:5678/api/v1/workflows | jq '.data | length'
```

---

## 📋 STEP 3: VERIFY WORKFLOW IMPORTED (1 minute)

After import completes, verify you see:

### In n8n UI:
- [ ] Workflow name: "2captcha Worker - Production"
- [ ] Node count: 33 nodes visible in the editor
- [ ] Workflow appears in dashboard/workflows list

### In Command Line (Verify via API):
```bash
curl -s http://localhost:5678/api/v1/workflows | jq '.data[0].name'
# Should output: "2captcha Worker - Production"
```

---

## ⚙️ STEP 4: CONFIGURE WORKFLOW VARIABLES (3-5 minutes)

Once the workflow is imported, you need to set variables for test mode:

### Via n8n UI:

1. In the workflow editor, look for the **"Variables"** tab or panel
2. Add or update these variables:

| Variable Name | Value | Purpose |
|---|---|---|
| `TOTAL_ATTEMPTS` | `5` | Run test with 5 captcha attempts |
| `SUCCESS_RATE_THRESHOLD` | `0.95` | 95% confidence threshold for solving |
| `BREAK_INTERVAL` | `20` | Take break every 20 attempts |
| `BREAK_MIN_DURATION` | `5000` | Minimum break: 5 seconds |
| `BREAK_MAX_DURATION` | `15000` | Maximum break: 15 seconds |
| `COOKIES_PATH` | `.cookies/2captcha-session.json` | Session persistence |
| `CONSENSUS_SOLVER_URL` | `http://localhost:8090` | Consensus solver API |
| `STEEL_BROWSER_URL` | `http://localhost:3005` | Steel browser CDP |
| `TARGET_URL` | `https://2captcha.com/play-and-earn/play` | Target website |

3. Click **"Save"** to persist variables

### Via Command Line (If UI Doesn't Support Variables):

Create a variables file:

```bash
cat > /tmp/workflow-variables.json << 'VARS'
{
  "TOTAL_ATTEMPTS": 5,
  "SUCCESS_RATE_THRESHOLD": 0.95,
  "BREAK_INTERVAL": 20,
  "BREAK_MIN_DURATION": 5000,
  "BREAK_MAX_DURATION": 15000,
  "COOKIES_PATH": ".cookies/2captcha-session.json",
  "CONSENSUS_SOLVER_URL": "http://localhost:8090",
  "STEEL_BROWSER_URL": "http://localhost:3005",
  "TARGET_URL": "https://2captcha.com/play-and-earn/play"
}
VARS
```

---

## ✅ STEP 5: VERIFY EVERYTHING IS READY (1 minute)

Run these checks to ensure system is ready for Phase 4 (test execution):

### Check 1: All Services Running
```bash
# Consensus Solver
curl -s http://localhost:8090/api/health | jq .status

# n8n
curl -s http://localhost:5678 -I | grep HTTP

# Steel Browser
docker ps | grep steel
```

**Expected Output**:
```
"healthy"
HTTP/1.1 200 OK
agent-05-steel-browser   Up 3 hours
```

### Check 2: Workflow Imported
```bash
curl -s http://localhost:5678/api/v1/workflows | jq '.data[0] | {name, nodes: (.nodes | length)}'
```

**Expected Output**:
```json
{
  "name": "2captcha Worker - Production",
  "nodes": 33
}
```

### Check 3: Cookies Directory Exists
```bash
mkdir -p /Users/jeremy/dev/SIN-Solver/.cookies
ls -lad /Users/jeremy/dev/SIN-Solver/.cookies
```

---

## 🎯 PHASE 3 COMPLETION CHECKLIST

- [ ] Opened n8n dashboard (http://localhost:5678)
- [ ] Successfully imported workflow (33 nodes visible)
- [ ] Configured all 9 variables (or verified in workflow)
- [ ] Verified all 3 services are running
- [ ] Verified workflow appears in API (`/api/v1/workflows`)
- [ ] Created `.cookies/` directory

**Status After Phase 3**: Ready for Phase 4 (Test Execution) ✅

---

## ⏭️ NEXT PHASE: Phase 4 (Test Execution)

Once Phase 3 is complete, you can start Phase 4:

```bash
# In n8n UI, click "Execute Workflow" button
# OR via CLI (if n8n supports it):
curl -X POST http://localhost:5678/api/v1/workflows/{workflow-id}/execute
```

Expected execution time: 15-30 minutes
Expected output: 4-5 successful captcha solutions out of 5 attempts

---

## 🆘 TROUBLESHOOTING

### Problem: "Can't find Import button"
**Solution**: 
- Refresh the page (Ctrl+R or Cmd+R)
- Try accessing via: http://localhost:5678/workflows
- Look for "+ New" or "Create" button → "Import from file"

### Problem: "File not found when importing"
**Solution**:
```bash
# Verify file exists
ls -lh /Users/jeremy/dev/SIN-Solver/infrastructure/n8n/workflows/2captcha-worker-production.json

# If it doesn't exist, recreate it:
cd /Users/jeremy/dev/SIN-Solver
git checkout infrastructure/n8n/workflows/2captcha-worker-production.json
```

### Problem: "Import fails with error"
**Solution**:
1. Check workflow file is valid JSON:
   ```bash
   cat /Users/jeremy/dev/SIN-Solver/infrastructure/n8n/workflows/2captcha-worker-production.json | jq . > /dev/null
   ```
   
2. If invalid, restore from git:
   ```bash
   cd /Users/jeremy/dev/SIN-Solver
   git restore infrastructure/n8n/workflows/2captcha-worker-production.json
   ```

3. Try importing again

### Problem: "n8n Dashboard not responding"
**Solution**:
```bash
# Check if n8n is running
docker ps | grep n8n

# If not running, start it
docker start agent-01-n8n-orchestrator

# Wait 10 seconds
sleep 10

# Try accessing again
curl -s http://localhost:5678 -I
```

### Problem: "Can't find Variables section in n8n"
**Solution**:
- Variables might be called "Env Variables" or "Environment Variables"
- Look in the workflow settings/configuration area
- Or, variables might be configured per-node instead of globally
- Check the workflow nodes for variable references and update them directly

---

## 📊 CURRENT SYSTEM STATE

**As of 2026-01-30 13:15 UTC**:

| Component | Status | Details |
|-----------|--------|---------|
| **Repository** | ✅ Clean | 7 commits, all pushed |
| **Consensus Solver** | ✅ Running | localhost:8090, 2000+ sec uptime |
| **n8n** | ✅ Running | localhost:5678, ready for import |
| **Steel Browser** | ✅ Running | localhost:3005, CDP ready |
| **Workflow File** | ✅ Ready | 33 nodes, valid JSON, 23 KB |
| **System** | ✅ Ready | All prerequisites met |

**Overall Status**: 🟢 **PRODUCTION-READY FOR PHASE 3**

---

**Last Updated**: 2026-01-30 13:15 UTC
**Next Phase**: Phase 4 - Test Execution (approx. 20-30 minutes)
**Expected Outcome**: 4-5 successful captcha solutions
