#!/bin/bash

# Real-time monitoring of YOLO training

echo "📊 YOLO TRAINING MONITOR - Live Status"
echo "============================================================"

while true; do
    echo ""
    echo "⏱️  $(date '+%Y-%m-%d %H:%M:%S')"
    
    # Check if training is running
    if pgrep -f "python3.*YOLO" > /dev/null; then
        echo "✅ Training process: RUNNING"
    else
        echo "⏸️  Training process: STOPPED"
    fi
    
    # Show recent log lines
    if [ -f training_full.log ]; then
        echo ""
        echo "📝 Recent output:"
        tail -5 training_full.log | sed 's/^/   /'
    fi
    
    # Check model file size
    if [ -f /Users/jeremy/runs/classify/captcha_classifier/weights/best.pt ]; then
        SIZE=$(ls -lh /Users/jeremy/runs/classify/captcha_classifier/weights/best.pt | awk '{print $5}')
        echo ""
        echo "📦 Model file size: $SIZE"
    fi
    
    # Check CSV for progress
    if [ -f /Users/jeremy/runs/classify/captcha_classifier/results.csv ]; then
        EPOCHS=$(wc -l < /Users/jeremy/runs/classify/captcha_classifier/results.csv)
        EPOCHS=$((EPOCHS - 1))  # Subtract header
        echo ""
        echo "📈 Progress: $EPOCHS/20 epochs completed"
        
        # Show last epoch metrics
        if [ $EPOCHS -gt 0 ]; then
            LAST_LINE=$(tail -1 /Users/jeremy/runs/classify/captcha_classifier/results.csv)
            # Parse CSV: epoch, train/loss, top1, top5, val/loss
            TOP1=$(echo "$LAST_LINE" | awk -F',' '{print $4}')
            TOP5=$(echo "$LAST_LINE" | awk -F',' '{print $5}')
            echo "   • Last Epoch Top-1: $(echo "scale=2; $TOP1 * 100" | bc)%"
            echo "   • Last Epoch Top-5: $(echo "scale=2; $TOP5 * 100" | bc)%"
        fi
    fi
    
    echo ""
    echo "------------------------------------------------------------"
    echo "Refreshing in 10s... (Ctrl+C to exit)"
    sleep 10
done

