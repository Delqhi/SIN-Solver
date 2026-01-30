# N8N Workflow Import Instructions

## Quick Import (Recommended)

### Option 1: GUI Import (Easiest)

1. **Open n8n UI**
   ```
   http://localhost:5678
   ```

2. **Import Workflow**
   - Click **"Import"** button (top-left or menu)
   - Select file: `infrastructure/n8n/workflows/2captcha-worker-production.json`
   - Click **Import**
   - All 33 nodes will load

3. **Verify Workflow**
   - Check that all nodes are visible
   - Verify connections between nodes
   - Check node colors (should be consistent)

### Option 2: API Import

```bash
# Copy workflow to clipboard
cat infrastructure/n8n/workflows/2captcha-worker-production.json | jq . > /tmp/workflow.json

# Import via API (requires n8n API key)
curl -X POST http://localhost:5678/api/v1/workflows \
  -H "Content-Type: application/json" \
  -H "X-N8N-API-KEY: YOUR_API_KEY" \
  -d @/tmp/workflow.json
```

### Option 3: Command Line

```bash
# Navigate to n8n container
docker exec agent-01-n8n-orchestrator bash

# Use n8n CLI to import
n8n import --input=/path/to/workflow.json
```

## After Import

### 1. Configure Credentials

The workflow requires these to be set:
- **Steel Browser Service URL**: http://agent-05-steel-browser:3000
- **Consensus Solver URL**: http://localhost:8090
- **2captcha Account** (if needed): Add credentials in n8n

### 2. Test the Workflow

```bash
# Option A: Run with small test (RECOMMENDED FOR FIRST TIME)
# Edit workflow → Set TOTAL_ATTEMPTS = 5
# Click "Execute" button
# Wait for completion (should take 2-3 minutes)

# Option B: Run full workflow
# Set TOTAL_ATTEMPTS = 1000
# Click "Execute Workflow"
# Monitor in n8n UI (execution progress visible)
```

### 3. Schedule Workflow (Optional)

```bash
# Edit workflow → Add cron trigger
# Or use n8n scheduling from workflow settings
# Example: Run daily at 9 AM
# Cron: 0 9 * * *
```

## Node Configuration Checklist

### Critical Nodes

| Node | Name | Required Config |
|------|------|-----------------|
| 1 | Start | - |
| 5 | Browser Init | Steel Browser URL |
| 6 | Navigate to Training | URL: https://2captcha.com/play-and-earn/training |
| 10 | Navigate to Real Work | URL: https://2captcha.com/play-and-earn/play |
| 11 | Screenshot Captcha | Browser window selector |
| 15 | Consensus Solve | URL: http://localhost:8090/api/consensus-solve |
| 20 | Type Solution | Human delay: 40-120 WPM |
| 25 | Check Success | Retry logic |
| 32 | Update Stats | Webhook or API endpoint |

### Optional Nodes

- **Break Scheduling**: Configure micro-break intervals
- **IP Health Monitoring**: Configure threshold (70% default)
- **Discord Alerts**: Add webhook URL for notifications
- **Success Rate Threshold**: Set minimum success rate (95% default)

## Troubleshooting Import

### Import Fails with "Invalid JSON"
```bash
# Validate JSON
jq empty infrastructure/n8n/workflows/2captcha-worker-production.json

# If valid, try creating workflow manually
# Or use API import instead of GUI
```

### Nodes Don't Connect
- Check node IDs in JSON
- Verify connection syntax: `"to": [{"node": "NodeName", "type": "main"}]`
- Re-validate JSON structure

### Workflow Won't Execute
1. Verify all services running:
   - `curl http://localhost:5678/api/health` (n8n)
   - `curl http://localhost:3005/health` (Steel Browser)
   - `curl http://localhost:8090/api/health` (Consensus Solver)

2. Check node configurations:
   - URLs correct
   - Credentials set
   - Parameters filled in

3. Check n8n logs:
   - `docker logs agent-01-n8n-orchestrator`

## Workflow Structure

```
START
  ↓
Browser Init (Steel Browser)
  ↓
Navigate to Training Mode
  ↓
Screenshot Training Page
  ↓
Navigate to Real Work Mode
  ↓
SOLVING LOOP (repeats for TOTAL_ATTEMPTS):
  ├─ Screenshot Captcha
  ├─ Call Consensus Solver (3-agent voting)
  ├─ If confidence ≥ 95%:
  │   ├─ Type Solution (human delays)
  │   ├─ Submit Answer
  │   └─ Check Success
  └─ If confidence < 95%:
      └─ Click "Cannot Solve"
  ↓
Break & Monitor
  ├─ Micro-breaks (1-3 seconds)
  ├─ Scheduled breaks (5-15 seconds)
  ├─ IP health check
  └─ Session status
  ↓
Update Statistics
  ├─ Success rate
  ├─ Earnings
  ├─ Session time
  └─ Error count
  ↓
End
```

## Files Referenced

- **Workflow**: `infrastructure/n8n/workflows/2captcha-worker-production.json`
- **Documentation**: `infrastructure/n8n/workflows/2captcha-worker-production.md`
- **Deployment Guide**: `infrastructure/n8n/workflows/DEPLOYMENT-GUIDE.md`
- **Quick Reference**: `infrastructure/n8n/workflows/README-2captcha-production.md`

## Support

If import fails:
1. Check n8n version: `docker exec agent-01-n8n-orchestrator n8n --version`
2. Verify workflow JSON: `jq '.' < workflow.json | head -50`
3. Check logs: `docker logs -f agent-01-n8n-orchestrator`
4. Review troubleshooting docs

---

**Status**: ✅ Ready to Import
**Last Updated**: 2026-01-30
**Workflow Version**: 1.0.0
