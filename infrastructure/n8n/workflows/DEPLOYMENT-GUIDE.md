# 2captcha Worker - Deployment Guide

**Status:** ✅ PRODUCTION READY  
**Date:** 2026-01-30  
**Version:** 1.0.0

## Quick Start (5 minutes)

### Step 1: Verify Dependencies
```bash
# Check if n8n is running
curl -s http://localhost:5678/api/health | jq .

# Check if Steel Browser is running
curl -s http://localhost:3005/health | jq .

# Check if consensus solver is running
curl -s http://localhost:8090/api/health | jq .
```

If any fail, start them:
```bash
# n8n (if using Docker)
docker run -d -p 5678:5678 n8nio/n8n

# Steel Browser (agent-05)
docker-compose -f Docker/agents/agent-05-steel-browser/docker-compose.yml up -d

# Consensus Solver
cd solvers && node consensus-solver.js &
```

### Step 2: Import Workflow to n8n
```bash
curl -X POST http://localhost:5678/api/workflows \
  -H "Content-Type: application/json" \
  -d @infrastructure/n8n/workflows/2captcha-worker-production.json
```

**Or manually via n8n UI:**
1. Open http://localhost:5678
2. Create new workflow
3. Menu → Import from File
4. Select `2captcha-worker-production.json`

### Step 3: Configure Environment Variables

In n8n workflow settings:
```json
{
  "TOTAL_ATTEMPTS": 1000,
  "SUCCESS_RATE_THRESHOLD": 0.95,
  "IP_HEALTH_MIN_SCORE": 0.70,
  "BREAK_INTERVAL": 20
}
```

### Step 4: Test with Small Run
```
In n8n UI:
1. Click "Execute Workflow"
2. Wait for first 5 captchas to complete
3. Check success rate in console
4. Verify stats endpoint receives updates
5. Confirm cookie file created
```

### Step 5: Deploy to Production
```bash
# If success rate > 95%:
1. Increase TOTAL_ATTEMPTS to desired value
2. Set up scheduler (optional): 0 9 * * * (daily 9 AM)
3. Enable notifications (Slack/Discord)
4. Monitor dashboard
```

## Architecture Overview

```
2captcha.com
     ↓
Steel Browser (agent-05:3005)
     ↓
n8n Workflow (32 nodes)
     ├─→ 3-Agent Consensus Solver
     │    ├─ agent-03 (code analysis)
     │    ├─ agent-06 (browser automation)
     │    └─ agent-07 (research/detective)
     ├─→ Human Behavior Module
     │    ├─ Variable typing speed
     │    ├─ Curved mouse movement
     │    └─ Random micro-pauses
     └─→ IP Health Monitor
          ├─ Health scoring
          ├─ Auto-reconnect trigger
          └─ Proxy rotation
```

## File Locations

```
/Users/jeremy/dev/SIN-Solver/
├── infrastructure/n8n/workflows/
│   ├── 2captcha-worker-production.json       (main workflow)
│   ├── 2captcha-worker-production.md         (detailed docs)
│   └── README-2captcha-production.md         (this file)
├── solvers/
│   └── consensus-solver.js                   (3-agent voting)
├── agents/
│   └── human-behavior-module.js              (delay simulation)
└── .cookies/
    └── 2captcha-session.json                 (session persistence)
```

## Monitoring

### Real-time Dashboard
```bash
# Monitor stats updates
watch -n 5 curl -s http://localhost:8090/api/stats | jq .

# Watch n8n execution
curl -s http://localhost:5678/api/executions \
  -H "Authorization: Bearer {TOKEN}" | jq .

# Check log files
tail -f /Users/jeremy/dev/SIN-Solver/logs/2captcha-worker.log
```

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Success Rate | >95% | <95% → STOP |
| IP Health | >0.80 | <0.70 → RECONNECT |
| Avg Solve Time | 30-45s | >60s → INVESTIGATE |
| Earnings/Hour | $0.60-1.50 | <$0.30 → STOP |
| Session Duration | 2-4 hours | >4 → PAUSE |

### Alerts Setup

#### Discord Webhook
```javascript
// Add to workflow (POST to Discord)
{
  "webhook_url": "https://discordapp.com/api/webhooks/YOUR_WEBHOOK_ID",
  "content": "🚨 2captcha: Success rate {{successRate}}%",
  "embeds": [{
    "title": "Worker Status",
    "fields": [
      {"name": "Earned", "value": "{{earned}}"},
      {"name": "Solved", "value": "{{solved}}"},
      {"name": "IP Health", "value": "{{ipHealth}}"}
    ]
  }]
}
```

#### Slack Webhook
```javascript
{
  "webhook_url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
  "text": "🚨 2captcha Alert",
  "blocks": [{
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "*2captcha Worker*\n*Success Rate:* {{successRate}}%"
    }
  }]
}
```

## Troubleshooting

### Workflow Won't Start
```bash
# Check n8n logs
docker logs n8n

# Verify JSON syntax
jq . infrastructure/n8n/workflows/2captcha-worker-production.json

# Check node connectivity
curl -v http://localhost:5678
```

### Consensus Solver Returns Empty
```bash
# Test individual agents
curl -X POST http://agent-03:8000/solve/captcha -d '{"image":"..."}'
curl -X POST http://agent-06:8000/solve/captcha -d '{"image":"..."}'
curl -X POST http://agent-07:3000/solve/captcha -d '{"image":"..."}'

# Check consensus solver logs
ps aux | grep consensus-solver
# Restart if needed
pkill -f consensus-solver && node solvers/consensus-solver.js &
```

### Low IP Health Score
```
Cause: Too many rapid requests
Solution:
  1. Increase BREAK_INTERVAL (e.g., 15 instead of 20)
  2. Increase micro-break duration (3-5s instead of 1-3s)
  3. Check proxy pool: 
     curl http://localhost:3005/proxies/health
  4. Switch proxy rotation strategy
```

### Success Rate Below 95%
```
Causes:
  - Poor image quality (blur/distortion)
  - Agent endpoint failures
  - Network latency
  - Low confidence threshold

Solutions:
  1. Verify agent endpoints respond quickly
  2. Test with higher confidence threshold (0.95 → 0.97)
  3. Check image quality logs
  4. Increase timeout (15000 → 20000)
  5. Reduce parallel attempts if available
```

### Session Expires Repeatedly
```
Cause: 2captcha session timeout or account security

Solutions:
  1. Verify cookies saved: ls -la .cookies/
  2. Check 2captcha account for suspicious activity
  3. Clear cookies and re-authenticate:
     rm .cookies/2captcha-session.json
     (workflow will auto-create new session)
  4. Disable 2FA temporarily (if enabled)
  5. Check IP reputation: not on blacklist
```

## Performance Optimization

### For Higher Earnings
```
Current settings:
  BREAK_INTERVAL = 20 (break every 20 captchas)
  MICRO_BREAK = 1-3 seconds
  TYPING_SPEED = 40-120 WPM

To increase speed (at increased ban risk):
  BREAK_INTERVAL = 30 (less frequent breaks)
  MICRO_BREAK = 500-1000ms (shorter)
  TYPING_SPEED = 80-140 WPM (faster)
  
⚠️ Warning: Higher speed = higher ban risk!
```

### For Maximum Safety
```
Current settings are already conservative.
To be even more cautious:
  BREAK_INTERVAL = 15 (more frequent)
  MICRO_BREAK = 2-5 seconds (longer)
  TYPING_SPEED = 30-80 WPM (slower)
  ADD: Long pause every 100 captchas (5-10 min)
  
Result: Extremely low ban risk, lower earnings
```

## Scaling

### Multiple Parallel Workers
```bash
# Copy workflow
cp infrastructure/n8n/workflows/2captcha-worker-production.json \
   infrastructure/n8n/workflows/2captcha-worker-2.json

# Edit workflow ID and configuration
# Worker 2: Use different proxy pool
# Worker 3: Different account
# etc.

# Set different BREAK_INTERVAL for each:
# Worker 1: BREAK_INTERVAL=20
# Worker 2: BREAK_INTERVAL=25
# Worker 3: BREAK_INTERVAL=15
# (prevents synchronized patterns)
```

### Load Balancing
```javascript
// In consensus solver, distribute across agents
const agentEndpoints = {
  'agent-03': 'http://agent-03-1:8000',  // Primary
  'agent-03-2': 'http://agent-03-2:8000', // Load balance
  'agent-06': 'http://agent-06-1:8000',
  'agent-06-2': 'http://agent-06-2:8000'
};
```

## Security Considerations

### API Keys
```json
{
  "2captcha_api_key": "your_api_key",
  "2captcha_account": "your_email",
  "2captcha_password": "your_password"
}
```
**Store in:** n8n credentials, NOT in workflow JSON!

### Proxy Credentials
```bash
# If using proxy authentication:
PROXY_URL="http://user:pass@proxy-ip:port"
# Store in environment variable, not workflow
```

### Cookie Encryption
```bash
# Protect cookie file
chmod 600 .cookies/2captcha-session.json

# Optional: Encrypt cookies
gpg --symmetric --cipher-algo AES256 \
  .cookies/2captcha-session.json
```

## Maintenance Schedule

### Daily
- ✅ Check success rate (should be > 95%)
- ✅ Verify IP health (should be > 0.80)
- ✅ Monitor earnings rate

### Weekly
- ✅ Review logs for errors
- ✅ Test agent endpoints
- ✅ Verify proxy pool health
- ✅ Check 2captcha account status

### Monthly
- ✅ Review earnings trends
- ✅ Update agent modules
- ✅ Audit security (cookies, credentials)
- ✅ Performance tuning

## Support & References

### Debugging
1. Check n8n execution logs: http://localhost:5678/executions
2. Review console output: `docker logs n8n`
3. Test endpoints manually: See troubleshooting section
4. Enable verbose logging in workflow

### Documentation
- 2captcha: https://2captcha.com/play-and-earn/play
- n8n: https://docs.n8n.io
- Steel Browser: `agent-05-steel-browser:3005`
- Consensus Solver: `/solvers/consensus-solver.js`

### Contact
- For workflow issues: Check n8n documentation
- For consensus solver: See `/solvers/consensus-solver.js` comments
- For 2captcha issues: Support at 2captcha.com

---

**Created:** 2026-01-30  
**Last Updated:** 2026-01-30  
**Status:** ✅ PRODUCTION READY
