# Phase 3: Manual N8N Workflow Import

**Current Status:** Workflow file ready, n8n running, manual import method

## Quick Start (2 minutes)

### Step 1: Get Workflow JSON
```bash
# Copy to clipboard (macOS)
pbcopy < /Users/jeremy/dev/SIN-Solver/infrastructure/n8n/workflows/2captcha-worker-production.json

# Or copy manually:
cat /Users/jeremy/dev/SIN-Solver/infrastructure/n8n/workflows/2captcha-worker-production.json
```

### Step 2: Import in N8N UI
1. **Open n8n:** http://localhost:5678
2. **Login:** admin / change_me
3. **Import workflow:**
   - Press `Ctrl+K` (or Cmd+K on Mac) to open command palette
   - Type "import"
   - Select "Import workflows"
   - **Paste the workflow JSON** (Ctrl+V or Cmd+V)
   - Click "Import"

### Step 3: Verify Import
1. Go to Workflows page
2. Look for "2captcha Worker - Production"
3. Click to open
4. Verify:
   - ✅ 33 nodes visible
   - ✅ 32 connections intact
   - ✅ No red error nodes

## Detailed Instructions

### If Command Palette (Ctrl+K) Doesn't Work:

**Method 1: Via Menu**
1. Click "Workflows" in left sidebar
2. Click "New Workflow" button
3. Wait for blank workflow to load
4. Press `Ctrl+Shift+I` for import dialog (or find Import option in menu)
5. Paste workflow JSON

**Method 2: Via Browser Console**
1. Open n8n: http://localhost:5678
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Paste the workflow JSON there

### Workflow Details
- **Name:** 2captcha Worker - Production
- **Nodes:** 33
- **Connections:** 32
- **File Size:** 23 KB

## If Manual Import Fails

### Try This Workaround:

```bash
# 1. Copy workflow to clipboard
cat /Users/jeremy/dev/SIN-Solver/infrastructure/n8n/workflows/2captcha-worker-production.json | pbcopy

# 2. Create a text file with workflow JSON
cat > /tmp/workflow.txt << 'EOF2'
[PASTE ENTIRE WORKFLOW JSON HERE]
EOF2

# 3. Open http://localhost:5678 and manually paste content
```

## Expected Outcome

After successful import:
- Workflow appears in Workflows list
- Can click to view all 33 nodes
- Ready for configuration

## Next Steps After Import

1. **Configure Variables:** 9 workflow variables need values
2. **Save Workflow:** Click Save button
3. **Execute:** Click Execute button in Phase 4

## Variables to Configure (Next)

| Variable | Value | Purpose |
|----------|-------|---------|
| TOTAL_ATTEMPTS | 5 | Number of captchas to solve |
| SUCCESS_RATE_THRESHOLD | 0.95 | Min success rate |
| BREAK_INTERVAL | 20 | Solves before break |
| BREAK_MIN_DURATION | 5000 | Min break (ms) |
| BREAK_MAX_DURATION | 15000 | Max break (ms) |
| COOKIES_PATH | .cookies/2captcha-session.json | Session storage |
| CONSENSUS_SOLVER_URL | http://localhost:8090 | Solver service |
| STEEL_BROWSER_URL | http://localhost:3005 | Browser service |
| TARGET_URL | https://2captcha.com/play-and-earn/play | Target website |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Ctrl+K not working | Try F1 or Cmd+K on Mac, or use menu Import |
| Workflow not visible | Refresh browser, or restart n8n |
| JSON parse error | Verify JSON is complete, no extra quotes |
| Import button not clickable | Make sure you've pasted full JSON in dialog |

## Support

If manual import doesn't work:
1. Check n8n is running: `docker ps | grep n8n`
2. Check logs: `docker logs agent-01-n8n-orchestrator`
3. Try restarting: `docker-compose restart agent-01-n8n-orchestrator`
4. Check workflow file: `cat infrastructure/n8n/workflows/2captcha-worker-production.json | jq`
