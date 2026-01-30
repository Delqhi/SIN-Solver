# PHASE 3: MANUAL N8N WORKFLOW IMPORT

Since n8n requires API authentication, we'll import the workflow manually via the web UI.

## Quick 3-Step Process

### STEP 1: Open n8n Dashboard
- Open browser to: **http://localhost:5678**
- You'll see the n8n interface

### STEP 2: Copy Workflow JSON
Run this command to copy workflow to clipboard:
```bash
cat /Users/jeremy/dev/SIN-Solver/infrastructure/n8n/workflows/2captcha-worker-production.json | pbcopy
```

### STEP 3: Import Workflow
1. In n8n, press **Ctrl+K** (or **Cmd+K** on Mac)
2. Type: **"import"**
3. Press **Enter**
4. Paste the JSON: **Cmd+V**
5. Click **"Import"** button
6. Workflow should appear in the list!

## What to Expect

After import, you should see:
- ✓ Workflow name: "2captcha Worker - Production"  
- ✓ 33 nodes on the canvas
- ✓ All nodes connected (32 connections)
- ✓ No red error indicators

## Next Steps

Once imported:
1. Click on the workflow to open it
2. Each node will need variables configured
3. See PHASE-3-WORKFLOW-IMPORT-GUIDE.md for detailed configuration

## Troubleshooting

**"Import not found"?**
- Try clicking Menu (☰) → Workflows → Import

**"Workflow looks broken"?**
- Click each node and verify no red errors
- Check that all variables are configured

**"Can't paste"?**
- Use Option 2: Manually copy-paste entire JSON
- Or use: pbpaste | xsel (Linux)

## Alternative: Automation Script

If you prefer automation, we can also:
1. Create API key in n8n via SQLite
2. Use Python script to import via API

Let us know if you want to automate this!

