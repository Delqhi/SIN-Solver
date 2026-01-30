#!/bin/bash
# Test script for Rocket.Chat Alertmanager integration

set -e

echo "🧪 Testing Rocket.Chat Alertmanager Integration"
echo "=================================================="

# Check if webhook adapter is running
echo ""
echo "1️⃣ Checking webhook adapter health..."
HEALTH=$(curl -s http://localhost:8093/health)
if echo "$HEALTH" | grep -q '"status": "healthy"'; then
    echo "✅ Webhook adapter is running"
else
    echo "❌ Webhook adapter is not responding"
    exit 1
fi

# Test sending a test alert
echo ""
echo "2️⃣ Sending test alert..."
TEST_RESPONSE=$(curl -s -X POST http://localhost:8093/webhook \
    -H "Content-Type: application/json" \
    -d @test-alert.json)

echo "Response: $TEST_RESPONSE"

if echo "$TEST_RESPONSE" | grep -q '"status": "ok"'; then
    echo "✅ Alert processed successfully"
else
    echo "⚠️ Alert processing returned: $TEST_RESPONSE"
fi

# Check environment variables are set
echo ""
echo "3️⃣ Checking Rocket.Chat webhook URLs..."
if [ -z "$ROCKETCHAT_WEBHOOK_CRITICAL" ]; then
    echo "⚠️ ROCKETCHAT_WEBHOOK_CRITICAL not set"
else
    echo "✅ ROCKETCHAT_WEBHOOK_CRITICAL is configured"
fi

if [ -z "$ROCKETCHAT_WEBHOOK_WARNING" ]; then
    echo "⚠️ ROCKETCHAT_WEBHOOK_WARNING not set"
else
    echo "✅ ROCKETCHAT_WEBHOOK_WARNING is configured"
fi

if [ -z "$ROCKETCHAT_WEBHOOK_INFO" ]; then
    echo "⚠️ ROCKETCHAT_WEBHOOK_INFO not set"
else
    echo "✅ ROCKETCHAT_WEBHOOK_INFO is configured"
fi

# Test Rocket.Chat connectivity
echo ""
echo "4️⃣ Testing Rocket.Chat connectivity..."
if command -v curl &> /dev/null; then
    RC_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://delqhi.chat)
    if [ "$RC_STATUS" == "200" ] || [ "$RC_STATUS" == "302" ] || [ "$RC_STATUS" == "401" ]; then
        echo "✅ Rocket.Chat is reachable"
    else
        echo "⚠️ Rocket.Chat returned status: $RC_STATUS"
    fi
else
    echo "⚠️ curl not available for connectivity test"
fi

echo ""
echo "🎉 Test complete!"
echo ""
echo "Next steps:"
echo "1. Check #alerts-critical, #alerts-warning, #alerts-info channels in Rocket.Chat"
echo "2. Verify test alert appeared in appropriate channel"
echo "3. Configure Prometheus Alertmanager to send to http://localhost:8093/webhook"
