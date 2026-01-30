# 🚀 PHASES C & D EXECUTION GUIDE

**Total Duration:** ~70 minutes (Phase C) + <1 minute (Phase D)  
**Expected Timeline:** 03:12-04:43 UTC  

---

## PHASE C: PR #5 Auto-Rerun & Docker Build

**Expected Start:** 2026-01-30 03:12-03:32 UTC (auto-triggered when main branch updates)  
**Duration:** ~70 minutes  
**Expected Complete:** 2026-01-30 04:22-04:42 UTC  
**Your Role:** Monitor progress (optional), no manual action needed

### What Happens in Phase C (Automatic)

When PR #6 is merged to main:
1. **GitHub detects main branch change** (PR #6 merge)
2. **PR #5 checks are automatically re-triggered** by GitHub
3. **PR #5 Docker Build runs** with the new 120-minute timeout from main
4. **All other PR #5 checks** (lint, tests, security) run
5. **Docker build completes successfully** within 120-minute window

### Timeline for Phase C

```
03:12-03:32 UTC: Phase C starts (auto-triggered)
    │
    ├─ 5-10 min: GitHub Actions queue & setup
    │
    ├─ 60-80 min: Docker Build running (sequential: API → Dashboard → Captcha)
    │
    └─ ~04:22-04:42 UTC: Phase C complete (all PR #5 checks = SUCCESS)
```

### How to Monitor Phase C Progress

**Option 1: Check PR #5 Status Directly**
```bash
cd /Users/jeremy/dev/SIN-Solver
gh pr view 5 --json statusCheckRollup
```

Expected output when complete:
```json
{
  "statusCheckRollup": [
    {"name": "🐳 Docker Build", "status": "COMPLETED", "conclusion": "SUCCESS"},
    {"name": "🐍 Python Lint", "status": "COMPLETED", "conclusion": "SUCCESS"},
    {"name": "📊 Dashboard Lint", "status": "COMPLETED", "conclusion": "SUCCESS"},
    {"name": "🔒 Security Scan", "status": "COMPLETED", "conclusion": "SUCCESS"},
    {"name": "🧪 Python Tests", "status": "COMPLETED", "conclusion": "SUCCESS"}
  ]
}
```

**Option 2: Watch for Updates (Every 10 seconds)**
```bash
watch -n 10 'cd /Users/jeremy/dev/SIN-Solver && gh pr view 5 --json statusCheckRollup | jq ".statusCheckRollup[] | {name, status, conclusion}" | grep -E "Docker Build|COMPLETED|SUCCESS|FAILURE"'
```

**Option 3: Check Web UI**
```bash
open "https://github.com/Delqhi/SIN-Solver/pulls/5"
```

### Success Criteria for Phase C

All checks for PR #5 must be TRUE:

- [ ] 🐳 **Docker Build** = COMPLETED with CONCLUSION = SUCCESS
- [ ] 🐍 **Python Lint** = COMPLETED with CONCLUSION = SUCCESS
- [ ] 📊 **Dashboard Lint** = COMPLETED with CONCLUSION = SUCCESS
- [ ] 🧪 **Python Tests** = COMPLETED with CONCLUSION = SUCCESS
- [ ] 🔒 **Security Scan** = COMPLETED with CONCLUSION = SUCCESS

### If Phase C Fails

**Scenario 1: Docker Build times out again (exceeds 120 minutes)**
```bash
cd /Users/jeremy/dev/SIN-Solver

# Check if 120-minute timeout was applied
gh run view <PR5_RUN_ID> --json timeoutMinutes

# If timeout is 45, main branch update didn't propagate
# Wait 5 minutes for GitHub cache to clear, then:
gh run rerun <PR5_RUN_ID>

# If timeout is 120 but still times out:
# Increase to 150 minutes in .github/workflows/build.yml
sed -i '' 's/timeout-minutes: 120/timeout-minutes: 150/' .github/workflows/build.yml
git add .github/workflows/build.yml
git commit -m "fix: Increase timeout to 150 minutes"
git push origin fix/critical-build-timeout-main

# GitHub will automatically retry PR #5
```

**Scenario 2: Docker Build fails before timeout**
```bash
# This means actual build error, not timeout
# Check the logs:
gh run view <PR5_RUN_ID> --log | grep -i "error\|failed" | tail -100
```

### When Phase C Completes

**At ~04:22-04:42 UTC:**
- All PR #5 checks will show SUCCESS
- You can proceed to Phase D
- Phase D involves manually merging PR #5 (takes <1 minute)

---

## PHASE D: Merge PR #5

**Expected Start:** 2026-01-30 04:23-04:43 UTC (when Phase C completes)  
**Duration:** <1 minute  
**Your Role:** Manual merge (easy copy-paste)  

### Prerequisites for Phase D

Before executing Phase D, verify Phase C is complete:

```bash
cd /Users/jeremy/dev/SIN-Solver

# Check all PR #5 checks are SUCCESS
gh pr view 5 --json statusCheckRollup | jq '.statusCheckRollup[] | select(.status == "COMPLETED") | {name, conclusion}'

# All should show conclusion = "SUCCESS"
```

### Execute Phase D: Merge PR #5

```bash
cd /Users/jeremy/dev/SIN-Solver

# Step 1: Approve PR #5 (optional but good practice)
gh pr review 5 --approve --body "✅ All checks passing. Docker build timeout fix verified. Merging."

# Step 2: Merge PR #5 to main
gh pr merge 5 --merge --subject "fix: Docker build timeout - use sequential builds"

# Step 3: Verify the merge
gh pr view 5 --json state
# Should show: {"state": "MERGED"}

echo "✅ Phase D Complete - PR #5 Merged!"
```

### Success Criteria for Phase D

- [ ] PR #5 approved (or skipped if you prefer)
- [ ] PR #5 merged to main (state = MERGED)
- [ ] Merge commit appears in main branch history
- [ ] All changes from PR #5 integrated into main

### What Gets Merged in Phase D

The following changes merge into main:

**File:** `docker-compose.yml`  
**Change:** Sequential Docker builds optimization
```yaml
# BEFORE (parallel - causes resource exhaustion):
# - Build API, Dashboard, Captcha Worker all at once
# - Uses ~90% disk, leads to OOM and failures

# AFTER (sequential - works reliably):
# - Build API first (~20-30 min)
# - Then build Dashboard (~20-30 min)
# - Then build Captcha Worker (~20-30 min)
# - Total: ~60-80 min (vs 120 min if using 45-minute timeout)
```

**Result:**
- More reliable Docker builds
- No more OOM errors
- No more disk exhaustion
- Faster overall completion (80 min instead of 120 min)

---

## FULL TIMELINE: All Phases

```
CURRENT: 01:33:32 UTC
│
├─ 1h 30-50 min ─→ 03:10-03:30 UTC (PHASE A)
│  Docker Build completes
│
├─ <1 min ─→ 03:11-03:31 UTC (PHASE B - AUTOMATIC)
│  PR #6 merged to main
│
├─ ~70 min ─→ 04:22-04:42 UTC (PHASE C - AUTOMATIC)
│  PR #5 auto-rerun completes
│  All checks = SUCCESS
│
├─ <1 min ─→ 04:23-04:43 UTC (PHASE D - YOU EXECUTE)
│  Merge PR #5 to main
│
└─ COMPLETE: Phase 15.1 Infrastructure Setup Done! ✅

TOTAL TIME: ~3 hours from now
```

---

## After Phase D: Verification Step

**When:** After Phase D completes (~04:44 UTC)  
**Duration:** ~5 minutes  
**What:** Verify 3 Docker images in GHCR

### Execute Phase E: Verify GHCR Images

```bash
cd /Users/jeremy/dev/SIN-Solver

# List all packages in GHCR
gh api /orgs/Delqhi/packages | jq '.[] | {name, updated_at}' | head -20

# Expected output (3 images):
# - ghcr.io/delqhi/sin-solver-api-brain:latest
# - ghcr.io/delqhi/sin-solver-dashboard:latest
# - ghcr.io/delqhi/sin-solver-captcha-worker:latest

# All should have updated_at timestamp within last 1-2 hours
```

---

## Summary for Phases C & D

| Phase | Start | Duration | Role | Status |
|-------|-------|----------|------|--------|
| **C** | 03:12-03:32 UTC | ~70 min | Monitor (optional) | AUTO |
| **D** | 04:23-04:43 UTC | <1 min | YOU (copy-paste) | MANUAL |
| **E** | 04:44 UTC | ~5 min | YOU (verify) | MANUAL |

**Total your involvement:** ~10 minutes of actual work  
**Total waiting:** ~3 hours total  
**Total hands-on:** Copy-paste 2 commands, then verify 3 images

---

## Troubleshooting for Phases C & D

### Phase C: Docker Build Times Out Again

```bash
# Check what timeout is being used
cd /Users/jeremy/dev/SIN-Solver
LATEST_RUN=$(gh run list --branch fix/docker-build-timeout --limit 1 --json databaseId | jq -r '.[0].databaseId')
gh run view $LATEST_RUN --json timeoutMinutes
# Should show: {"timeoutMinutes": 120}

# If still 45:
# - GitHub might be caching the old workflow
# - Force a cache clear by editing a different file:
touch .github/force-cache-clear
git add .github/force-cache-clear
git commit -m "chore: Force GitHub cache clear"
git push origin fix/docker-build-timeout

# Then wait 5 minutes and manually re-run
gh run rerun $LATEST_RUN
```

### Phase C: Docker Build Fails Before Timeout

```bash
# Get run ID
LATEST_RUN=$(gh run list --branch fix/docker-build-timeout --limit 1 --json databaseId | jq -r '.[0].databaseId')

# Check logs for actual error
gh run view $LATEST_RUN --log | tail -500 | grep -i "error\|failed\|exception"

# Common issues:
# 1. Network timeout pulling base images
#    → Solution: Wait 5 min, manually re-run
# 2. GHCR authentication failure
#    → Solution: Check GITHUB_TOKEN scopes
# 3. Out of disk space
#    → Solution: Add cleanup step to workflow (or wait for GH to fix)
```

### Phase D: PR #5 Won't Merge

```bash
cd /Users/jeremy/dev/SIN-Solver

# Check if there are blocking issues
gh pr view 5 --json statusCheckRollup,reviewDecisions

# Common issues:
# 1. Some checks still running
#    → Wait for all to complete
# 2. Branch protection requires approval
#    → You just approved it, so should be fine
# 3. Conflicts with main
#    → Shouldn't happen (PR was from updated main)

# Force merge (if you're confident):
gh pr merge 5 --merge --admin
```

---

## Final Checklist Before Declaring Phase 15.1 Complete

After Phase D completes and images are verified, check all boxes:

- [ ] PR #6 merged to main (state = MERGED)
- [ ] Main branch has updated `.github/workflows/build.yml` with `timeout-minutes: 120`
- [ ] PR #5 merged to main (state = MERGED)
- [ ] 3 Docker images verified in GHCR
- [ ] All images have recent timestamps (created/updated within last 2 hours)
- [ ] Repository main branch is clean (no pending changes)
- [ ] All session documentation is committed

**When all boxes are checked: Phase 15.1 is COMPLETE ✅**

