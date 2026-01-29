#!/bin/bash

# Real-time training monitor
echo "════════════════════════════════════════════════════════════════"
echo "🎓 YOLO TRAINING MONITOR - Session 10"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Check process
if pgrep -f "python3.*train_yolo" > /dev/null; then
    echo "✅ Training Process: RUNNING"
    echo "   PID: $(pgrep -f 'python3.*train_yolo')"
else
    echo "⏸️ Training Process: STOPPED/COMPLETED"
fi

echo ""
echo "📊 Progress:"

# Check log file
if [ -f "training_session_10.log" ]; then
    LINES=$(wc -l < training_session_10.log)
    echo "   Log lines: $LINES"
    
    # Show last 15 lines
    echo ""
    echo "📝 Latest Output:"
    echo "────────────────────────────────────────────────────────────────"
    tail -15 training_session_10.log
else
    echo "   Log file not created yet"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"

# Check if results CSV exists
if [ -f "/Users/jeremy/runs/classify/runs/classify/captcha_classifier/results.csv" ]; then
    EPOCHS=$(( $(wc -l < /Users/jeremy/runs/classify/runs/classify/captcha_classifier/results.csv) - 1 ))
    echo "✅ Results CSV: $EPOCHS epochs completed"
else
    echo "⏳ Results CSV: Not yet created"
fi

echo ""
