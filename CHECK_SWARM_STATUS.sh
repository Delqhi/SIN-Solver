#!/bin/bash
# Quick status check for all 5 agents

echo "🐝 AGENT SWARM STATUS CHECKER"
echo "════════════════════════════════════════════════════"
echo ""

echo "📋 ACTIVE AGENTS:"
echo "  Agent #1: bg_c55dd09e (YOLO Monitor + Deploy Trigger)"
echo "  Agent #2: bg_85ea249f (Live Status Dashboard)"
echo "  Agent #3: bg_8e7dccb0 (Test Validation)"
echo "  Agent #4: bg_9810a849 (Git Verification)"
echo "  Agent #5: bg_75d47e04 (Model Verification)"
echo ""

echo "📊 LIVE STATUS FILE:"
if [ -f "/Users/jeremy/dev/SIN-Solver/LIVE_DEPLOYMENT_STATUS.txt" ]; then
    echo ""
    cat /Users/jeremy/dev/SIN-Solver/LIVE_DEPLOYMENT_STATUS.txt
else
    echo "  (Waiting for Agent #2 to create status file...)"
fi
echo ""

echo "📂 OUTPUT FILES CREATED:"
ls -lh /Users/jeremy/dev/SIN-Solver/ 2>/dev/null | grep -E "LIVE_|TEST_|COMPLETION|METADATA|FINAL" | awk '{print "  " $9 " (" $5 ")"}'
echo ""

echo "🔍 YOLO TRAINING PROGRESS:"
python3 << 'PYEOF'
import csv
from pathlib import Path
results_path = Path('/Users/jeremy/runs/classify/runs/classify/captcha_classifier3/results.csv')
if results_path.exists():
    rows = list(csv.DictReader(open(results_path)))
    epochs = len(rows)
    percentage = (epochs / 20) * 100
    bar = "█" * (int(percentage / 5)) + "░" * (20 - int(percentage / 5))
    print(f"  YOLO Training: [{bar}] {epochs}/20 ({percentage:.0f}%)")
    if epochs >= 20:
        print(f"  ✅ Training Complete - Deployment in progress")
    else:
        print(f"  ⏳ Training in progress (~{(20-epochs)*5} minutes remaining)")
else:
    print(f"  ❌ Training not started")
PYEOF
echo ""

echo "💾 DISK USAGE:"
du -sh /Users/jeremy/dev/SIN-Solver 2>/dev/null | awk '{print "  Project: " $1}'
du -sh /Users/jeremy/runs/classify 2>/dev/null | awk '{print "  YOLO runs: " $1}'
echo ""

echo "✨ To check individual agent output, use:"
echo "  background_output(task_id='bg_c55dd09e')  # Agent #1"
echo "  background_output(task_id='bg_85ea249f')  # Agent #2"
echo "  background_output(task_id='bg_8e7dccb0')  # Agent #3"
echo "  background_output(task_id='bg_9810a849')  # Agent #4"
echo "  background_output(task_id='bg_75d47e04')  # Agent #5"
echo ""

