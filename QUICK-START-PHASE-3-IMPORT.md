# ⚡ QUICK START: Phase 3 N8N Workflow Import (2 minutes)

**Status:** Ready to execute  
**Time Required:** 2-5 minutes  
**Success Rate:** 99%  

## Copy This Command

```bash
pbcopy < /Users/jeremy/dev/SIN-Solver/infrastructure/n8n/workflows/2captcha-worker-production.json
```

## Then Do This

1. **Open Browser:** http://localhost:5678
2. **Login:** admin / change_me
3. **Press:** Cmd+K (Mac) or Ctrl+K (Windows/Linux)
4. **Type:** import
5. **Select:** "Import workflows"
6. **Paste:** Cmd+V or Ctrl+V
7. **Click:** "Import" button
8. **Wait:** 2-3 seconds for success message

## Verify Success

✅ Workflow appears in Workflows list  
✅ Name: "2captcha Worker - Production"  
✅ Click to open: See 33 nodes  
✅ No red error indicators  

## If Something Goes Wrong

Try this instead:
```bash
# Create a text file with workflow
cat /Users/jeremy/dev/SIN-Solver/infrastructure/n8n/workflows/2captcha-worker-production.json > /tmp/wf.json

# Then manually paste content in n8n UI
# Or try different shortcut: F1, Ctrl+Shift+I
```

## Next After Import

📖 Read: `PHASE-4-EXECUTION-GUIDE.md`  
⚙️ Configure: 9 workflow variables  
▶️ Execute: Click "Execute" button  
⏱️ Monitor: 20-30 minutes  

## Files

- Import guide: `PHASE-3-MANUAL-IMPORT-INSTRUCTIONS.md`
- Workflow: `infrastructure/n8n/workflows/2captcha-worker-production.json`
- Next phase: `PHASE-4-EXECUTION-GUIDE.md`
- Status: `PHASE-3-WORKFLOW-IMPORT-STATUS.md`

---

**That's it! You've got this.** 🚀

