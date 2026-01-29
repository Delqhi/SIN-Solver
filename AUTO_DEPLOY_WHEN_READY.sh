#!/bin/bash
# Automatic deployment trigger - waits for YOLO completion then executes deployment

set -e

PROJECT_ROOT="/Users/jeremy/dev/Delqhi-Platform"
RESULTS_FILE="/Users/jeremy/runs/classify/runs/classify/captcha_classifier3/results.csv"

echo "🔄 AUTOMATIC DEPLOYMENT TRIGGER ACTIVATED"
echo "========================================================================"
echo "Monitoring YOLO training for completion..."
echo ""

# Function to check YOLO completion
check_yolo_complete() {
    if [ -f "$RESULTS_FILE" ]; then
        EPOCHS=$(tail -n +2 "$RESULTS_FILE" 2>/dev/null | wc -l)
        if [ "$EPOCHS" -ge 20 ]; then
            return 0
        fi
    fi
    return 1
}

# Monitor YOLO with polling
POLL_COUNT=0
POLL_MAX=120  # Max 2 hours of polling (1 check every 60 seconds)

while [ $POLL_COUNT -lt $POLL_MAX ]; do
    if check_yolo_complete; then
        echo ""
        echo "✅ YOLO TRAINING COMPLETE!"
        echo ""
        break
    fi
    
    POLL_COUNT=$((POLL_COUNT + 1))
    
    # Show progress every few checks
    if [ $((POLL_COUNT % 2)) -eq 0 ]; then
        python3 << 'PYEOF'
import csv
from pathlib import Path
rows = list(csv.DictReader(open(Path('/Users/jeremy/runs/classify/runs/classify/captcha_classifier3/results.csv'))))
epochs = len(rows)
print(f"  Status: {epochs}/20 epochs ({epochs*5}%)")
PYEOF
    fi
    
    sleep 60
done

if ! check_yolo_complete; then
    echo "❌ Timeout waiting for YOLO (2 hours elapsed)"
    echo "   Check YOLO training manually"
    exit 1
fi

# YOLO is complete - execute deployment
echo ""
echo "🚀 EXECUTING DEPLOYMENT SCRIPT..."
echo "========================================================================"
echo ""

cd "$PROJECT_ROOT"
bash FINAL_TEST_AND_DEPLOY.sh

