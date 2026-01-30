#!/bin/bash
# Quick Status Checker for Phase 15.1

echo "═══════════════════════════════════════════════════════════"
echo "PHASE 15.1 - DOCKER BUILD MONITOR STATUS CHECK"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check monitor process
echo "📍 Monitor Process:"
if ps aux | grep -q "enhanced_monitor.sh" | grep -v grep; then
    PID=$(cat /tmp/enhanced_monitor.pid 2>/dev/null)
    echo "   ✅ Running (PID: $PID)"
else
    echo "   ❌ NOT running"
fi
echo ""

# Check monitor log
echo "📝 Monitor Log (last 20 lines):"
if [ -f /tmp/enhanced_monitor.log ]; then
    tail -20 /tmp/enhanced_monitor.log
else
    echo "   ⚠️  Log file not found"
fi
echo ""

# Check PR #6 status
echo "🔄 PR #6 Docker Build Status:"
cd /Users/jeremy/dev/SIN-Solver
gh pr view 6 --json statusCheckRollup 2>/dev/null | \
jq '.statusCheckRollup[] | select(.name == "🐳 Docker Build") | {status, conclusion}' || \
echo "   ⚠️  Could not fetch status"
echo ""

# Quick timeline
echo "⏱️  Timeline:"
echo "   Docker Build started: 2026-01-30 01:21:46 UTC"
echo "   Expected completion: 03:10-03:30 UTC (~40-50 min remaining)"
echo "   Phase B (auto-merge): <1 minute after Docker Build"
echo "   Phase C (PR #5 rerun): ~70 minutes"
echo "   Phase D (merge PR #5): MANUAL after Phase C"
echo "   Phase E (verify): ~5 minutes"
echo ""

echo "═══════════════════════════════════════════════════════════"
