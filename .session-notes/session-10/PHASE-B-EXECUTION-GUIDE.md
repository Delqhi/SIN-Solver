# 🚀 PHASE B EXECUTION GUIDE - AUTO-MERGE PR #6

**Timestamp:** 2026-01-30 01:33:32 UTC  
**Expected Start:** 2026-01-30 03:10-03:30 UTC (when Docker Build completes)  
**Duration:** <1 minute  
**Status:** READY - Monitor will auto-execute  

## What Happens in Phase B

When Docker Build completes with conclusion = SUCCESS:

**Monitor Script Will Automatically Execute:**
```bash
# Step 1: Approve PR #6
gh pr review 6 --approve --body "✅ Docker build timeout fix verified and tested successfully."

# Step 2: Merge PR #6 to main
gh pr merge 6 --merge --subject "fix: Critical - Apply Docker build timeout fix to main branch (120 min)"

# Step 3: Log the completion with timestamp
echo "✅ PR #6 MERGED SUCCESSFULLY at HH:MM:SS UTC"
```

## How to Know Phase B Has Completed

**Check the monitor log:**
```bash
tail -20 /tmp/enhanced_monitor.log
```

Look for:
```
[YYYY-MM-DD HH:MM:SS UTC] 🎉 DOCKER BUILD COMPLETED SUCCESSFULLY!
[YYYY-MM-DD HH:MM:SS UTC] ✅ APPROVING PR #6...
[YYYY-MM-DD HH:MM:SS UTC] ✅ MERGING PR #6...
[YYYY-MM-DD HH:MM:SS UTC] ✅ PR #6 MERGED SUCCESSFULLY!
```

**Or check PR #6 status:**
```bash
cd /Users/jeremy/dev/SIN-Solver
gh pr view 6 --json state
# Should show: {"state":"MERGED"}
```

## What Happens After Phase B

**Automatically (by GitHub Actions):**
1. GitHub detects that main branch was updated (by PR #6 merge)
2. GitHub automatically re-triggers all checks for PR #5
3. PR #5 branch will see the updated timeout in main's workflow
4. Docker build will run again on PR #5 with 120-minute timeout

**Timeline:**
- Phase B Complete: ~03:11-03:31 UTC
- Phase C Starts: ~03:12-03:32 UTC (auto-triggered)
- Phase C Duration: ~70 minutes (until ~04:22-04:42 UTC)

## If Phase B Doesn't Auto-Execute

**Scenario:** Docker Build completes but monitor fails to merge PR #6

**Recovery Steps:**
```bash
cd /Users/jeremy/dev/SIN-Solver

# Check if Docker Build succeeded
gh run view 21500935646 --json conclusion,status
# Should show: {"conclusion":"success","status":"completed"}

# If YES, manually execute Phase B:
gh pr review 6 --approve --body "✅ Docker build verified."
gh pr merge 6 --merge

# If NO (Docker Build failed):
# See TROUBLESHOOTING GUIDE below
```

## If Docker Build FAILS Before Reaching 120 Minutes

**What This Means:**
- Docker build exited with error code before timeout
- Something is wrong with the build itself, not the timeout

**How to Investigate:**
```bash
cd /Users/jeremy/dev/SIN-Solver

# Get the full build output
gh run view 21500935646 --log > /tmp/docker_build_full_log.txt

# Look for the error
grep -i "error\|failed\|exception" /tmp/docker_build_full_log.txt | tail -50

# Or check the web UI for more details
open "https://github.com/Delqhi/SIN-Solver/actions/runs/21500935646"
```

**Common Docker Build Failures:**
1. **Authentication Error** - GHCR login failed
   - Solution: Check `GITHUB_TOKEN` has `write:packages` scope
2. **Network Timeout** - Docker registry unreachable
   - Solution: Wait 5 min and manually re-run: `gh run rerun 21500935646`
3. **Disk Space** - Runner out of disk space
   - Solution: Reduce image size or use cleanup step
4. **Memory** - OOM killed build process
   - Solution: Built-in to sequential builds (should not happen)

## Success Criteria for Phase B

All of these must be TRUE:

- [ ] Docker Build completed with conclusion = SUCCESS
- [ ] Monitor script detected the success and logged it
- [ ] PR #6 approved by monitor script
- [ ] PR #6 merged to main branch
- [ ] `gh pr view 6` shows state = MERGED
- [ ] Main branch's `.github/workflows/build.yml` now has `timeout-minutes: 120`

## What Not to Do in Phase B

❌ **DO NOT manually merge PR #6** if monitor hasn't done it  
- Monitor has all the logic and will merge correctly
- Manual merge loses the log entry

❌ **DO NOT abort the monitor** while Phase B is executing  
- Let it finish the merge operation

❌ **DO NOT force push** to main branch  
- Would lose the merge commit and revert timeout fix

## Monitoring Phase B

```bash
# Option 1: Watch the log file (Real-time)
tail -f /tmp/enhanced_monitor.log

# Option 2: Periodic checks (Every 1 minute)
watch -n 60 'tail -5 /tmp/enhanced_monitor.log'

# Option 3: Check PR status directly
watch -n 30 'cd /Users/jeremy/dev/SIN-Solver && gh pr view 6 --json state'
```

## Timeline from Now Until Phase B Completes

```
NOW: 01:33:32 UTC
  │
  ├─ 1h 30-50 min ─→ 03:10-03:30 UTC
  │  (Docker Build running)
  │
  └─ <1 min ─→ 03:11-03:31 UTC
     (Phase B: Auto-merge PR #6)

TOTAL WAIT TIME: ~1.5 hours
```

## After Phase B Completes: What Comes Next

**Phase C will start automatically:**
- GitHub re-triggers PR #5 checks
- Docker Build runs again on PR #5
- PR #5 uses the new 120-minute timeout from main
- Duration: ~70 minutes (until ~04:22-04:42 UTC)

**Phase D is your manual step:**
- Around 04:23-04:43 UTC
- You merge PR #5
- Quick 5-minute step

---

**NEXT STEP:** Come back in ~1.5 hours to verify Phase B completed, then check Phase C progress.

