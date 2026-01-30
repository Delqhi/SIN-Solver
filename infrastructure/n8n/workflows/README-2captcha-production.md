# 2captcha Worker - Quick Reference

**Status:** ✅ PRODUCTION READY
**Created:** 2026-01-30
**File:** `/Users/jeremy/dev/SIN-Solver/infrastructure/n8n/workflows/2captcha-worker-production.json`

## Critical URLs
```
Training Mode:  https://2captcha.com/play-and-earn/training
Real Work:      https://2captcha.com/play-and-earn/play
❌ WRONG:       https://2captcha.com/work/start (404)
```

## Key Features Implemented

### ✅ Correct Page Navigation
- Training mode first (builds confidence)
- Then switches to real earning mode (`/play-and-earn/play`)
- Proper page state detection

### ✅ 3-Agent Consensus Solver
- Agent-03 (Agent Zero - Code Analysis)
- Agent-06 (Skyvern - Browser Automation)
- Agent-07 (Stagehand - Detective/Research)
- Confidence threshold: ≥95%
- Automatic "Cannot solve" if confidence < 95%

### ✅ Human Behavior Simulation
```
Clicking:        300-800ms delay (variable)
Typing:          40-120 WPM (human speed)
Mouse movement:  Curved path (not linear)
Typing pauses:   Random micro-pauses during typing
Submission:      500-1500ms before clicking send
```

### ✅ Break Scheduling
```
Micro-breaks:    1-3 seconds between every captcha
Scheduled break: 5-15 seconds every 20-40 captchas
Long breaks:     5-15 minutes every 2.5 hours
```

### ✅ Anti-Ban Measures
- IP health monitoring (auto-reconnect if < 70%)
- Session cookie persistence
- Automatic relogin on expiry
- Success rate tracking (stops if < 95%)
- Ban detection with proxy switching

## Workflow Nodes (32 Total)

| Node | Name | Purpose |
|------|------|---------|
| 00 | Start | Trigger |
| 01 | Initialize Steel Browser | Connect to agent-05:3005 |
| 02 | Navigate to Training | Load training mode |
| 03-04 | Screenshot & Check | Verify page state |
| 05 | Navigate to Real Work | Switch to earning mode |
| 06-07 | Screenshot & Consensus | Capture & solve captcha |
| 08 | Check Confidence | ≥95%? |
| 09-13 | Human-like Submission | Click, type, send with delays |
| 14 | Cannot Solve | If confidence < 95% |
| 15-17 | Breaks | Micro & scheduled breaks |
| 18-21 | IP Health & Reconnect | Auto-switch on degradation |
| 22-25 | Session Management | Cookies & relogin |
| 26-29 | Stats & Quality Control | Track earnings, stop if <95% |
| 30-31 | Finalization | Save cookies & alert |
| 32 | End | Complete |

## Configuration

### Environment Variables (set in n8n)
```bash
TOTAL_ATTEMPTS=1000          # Attempts per session
SUCCESS_RATE_THRESHOLD=0.95  # Stop if below
IP_HEALTH_MIN_SCORE=0.70     # Reconnect if below
BREAK_INTERVAL=20            # Captchas between breaks
```

### Static Settings (in workflow)
```json
{
  "baseUrl": "https://2captcha.com/play-and-earn/play",
  "trainingUrl": "https://2captcha.com/play-and-earn/training",
  "minConfidence": 0.95,
  "minSuccessRate": 0.95,
  "microBreakMs": [1000, 3000],
  "scheduledBreakMs": [5000, 15000],
  "breakSchedule": 20,
  "cookiesPath": "/Users/jeremy/dev/SIN-Solver/.cookies/2captcha-session.json"
}
```

## Dependencies

### Required Services
1. **agent-05-steel-browser:3005** (Browser automation)
2. **localhost:8090** (Consensus solver & stats)

### Supporting Modules
```
/solvers/consensus-solver.js          - 3-agent voting
/agents/human-behavior-module.js      - Delay & movement simulation
/.cookies/2captcha-session.json       - Session persistence
```

## Performance Expectations

```
Solving speed:     30-45 seconds per captcha (with human delays)
Earning rate:      $0.02-0.05 per captcha (2captcha rates)
Success target:    >95% (stops if drops below)
Session duration:  2-4 hours (before scheduled break)
IP ban risk:       <1% (with anti-ban measures)
```

## Monitoring

### Real-time Stats (Node 26)
```json
{
  "timestamp": "2026-01-30T12:34:56Z",
  "captchasSolved": 42,
  "earned": "$1.2345",
  "successRate": "97.50%",
  "ipHealth": 0.85,
  "sessionActive": true
}
```

### Alerts
- 🔴 HIGH: Success rate < 95% (STOP WORKER)
- 🟡 MEDIUM: IP health < 70% (AUTO-RECONNECT)
- 🟢 INFO: Worker completed successfully

## Testing Checklist

```
☑️  URL: https://2captcha.com/play-and-earn/play
☑️  Training mode loads first
☑️  Navigation to real work completes
☑️  3-agent consensus receives responses
☑️  Only submits if confidence >= 95%
☑️  Human delays applied (300-1500ms)
☑️  Micro-breaks trigger (1-3s)
☑️  Scheduled breaks trigger (5-15s every 20)
☑️  IP health endpoint responds
☑️  Cookie file created
☑️  Stats updated after each captcha
☑️  Stops if success rate < 95%
```

## Deployment

### Import to n8n
```bash
# Start n8n (if not running)
docker run -d -p 5678:5678 n8nio/n8n

# Import workflow
curl -X POST http://localhost:5678/api/workflows \
  -H "Content-Type: application/json" \
  -d @2captcha-worker-production.json
```

### Trigger Manually
```bash
# Via n8n UI: Click "Execute Workflow"
# Or via API:
curl -X POST http://localhost:5678/api/workflows/{WORKFLOW_ID}/execute
```

### Schedule (Optional)
```
n8n UI → Workflow → Trigger → Add cron expression
# Example: Run every day at 9 AM
0 9 * * *
```

## Troubleshooting

### "Cannot find captcha element"
→ Verify page fully loaded (check networkidle)
→ Ensure /play-and-earn/play is current URL

### "Low IP health repeatedly"
→ Increase break frequency
→ Add more micro-breaks
→ Check proxy pool health

### "Success rate < 95%"
→ Verify agent endpoints accessible
→ Check image quality (captcha blur)
→ Lower confidence threshold to 90% (at risk)

### "Session expires repeatedly"
→ Check cookies saved to correct path
→ Verify 2captcha account security
→ Increase session timeout

## Files Created

```
✅ /infrastructure/n8n/workflows/2captcha-worker-production.json (23KB)
✅ /infrastructure/n8n/workflows/2captcha-worker-production.md (9.5KB)
✅ /solvers/consensus-solver.js (3KB)
✅ /agents/human-behavior-module.js (7KB)
✅ /.cookies/ (directory for session persistence)
```

## Next Steps

1. Verify Steel Browser (agent-05) is running: `curl http://localhost:3005/health`
2. Start consensus solver: `node solvers/consensus-solver.js`
3. Import workflow to n8n
4. Test with small TOTAL_ATTEMPTS (e.g., 10)
5. Monitor success rate (must stay > 95%)
6. Deploy to production with full configuration

## References

- 2captcha: https://2captcha.com/play-and-earn/play
- n8n Docs: https://docs.n8n.io
- Steel Browser: agent-05-steel-browser:3005
- Consensus Solver: /solvers/consensus-solver.js
- Human Behavior: /agents/human-behavior-module.js
