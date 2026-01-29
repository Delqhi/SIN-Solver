#!/bin/bash
# Real-time YOLO monitoring script

RESULTS="/Users/jeremy/runs/classify/runs/classify/captcha_classifier3/results.csv"

while true; do
    clear
    echo "🔄 YOLO TRAINING MONITOR (Refreshing every 10 seconds)"
    echo "========================================================================"
    echo ""
    
    if [ -f "$RESULTS" ]; then
        EPOCHS=$(tail -1 "$RESULTS" 2>/dev/null | wc -l)
        LINES=$(wc -l < "$RESULTS")
        EPOCHS=$((LINES - 1))  # Subtract header
        PERCENTAGE=$((EPOCHS * 5))
        REMAINING=$((20 - EPOCHS))
        
        echo "📊 Progress: $EPOCHS/20 epochs ($PERCENTAGE%)"
        echo "   ⏱️  ETA: ~${REMAINING}0 minutes"
        echo ""
        
        if [ $EPOCHS -ge 20 ]; then
            echo "✅ TRAINING COMPLETE!"
            echo ""
            echo "Next step: cd /Users/jeremy/dev/Delqhi-Platform && bash FINAL_TEST_AND_DEPLOY.sh"
            break
        else
            # Show last metric
            tail -2 "$RESULTS" | head -1 | awk -F',' '{print "   Loss: " $2 ", Val: " $3 ", Acc: " $4}'
        fi
    else
        echo "⚠️  Results file not found yet"
    fi
    
    echo ""
    sleep 10
done
