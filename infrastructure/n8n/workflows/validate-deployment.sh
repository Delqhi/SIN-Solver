#!/bin/bash

# 2captcha n8n Workflow - Pre-Deployment Validation Script
# Purpose: Test all prerequisites before importing workflow
# Run: bash validate-deployment.sh
# Status: 100% automated, no manual intervention needed

set -e  # Exit on first error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# Helper functions
pass() {
    echo -e "${GREEN}✅ PASS${NC}: $1"
    ((PASS_COUNT++))
}

fail() {
    echo -e "${RED}❌ FAIL${NC}: $1"
    ((FAIL_COUNT++))
}

warn() {
    echo -e "${YELLOW}⚠️  WARN${NC}: $1"
    ((WARN_COUNT++))
}

info() {
    echo -e "${BLUE}ℹ️  INFO${NC}: $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_summary() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "Test Results: ${GREEN}${PASS_COUNT} PASS${NC}, ${RED}${FAIL_COUNT} FAIL${NC}, ${YELLOW}${WARN_COUNT} WARN${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    if [ $FAIL_COUNT -eq 0 ]; then
        echo -e "${GREEN}🚀 READY FOR DEPLOYMENT${NC}"
        return 0
    else
        echo -e "${RED}⛔ FIX FAILURES BEFORE DEPLOYING${NC}"
        return 1
    fi
}

# ==================== TESTS ====================

print_header "SYSTEM REQUIREMENTS"

# Test 1: Node.js version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    if [[ "$NODE_VERSION" > "18.0.0" ]] || [[ "$NODE_VERSION" == "18.0.0" ]]; then
        pass "Node.js version: $NODE_VERSION"
    else
        fail "Node.js version too old (found: $NODE_VERSION, required: 18.0.0+)"
    fi
else
    fail "Node.js not installed"
fi

# Test 2: npm version
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    if [[ "$NPM_VERSION" > "9.0.0" ]] || [[ "$NPM_VERSION" == "9.0.0" ]]; then
        pass "npm version: $NPM_VERSION"
    else
        fail "npm version too old (found: $NPM_VERSION, required: 9.0.0+)"
    fi
else
    fail "npm not installed"
fi

# Test 3: Disk space
DISK_AVAILABLE=$(df . | tail -1 | awk '{print $4}')
if [ "$DISK_AVAILABLE" -gt 1000000 ]; then  # > 1GB
    pass "Disk space available: ${DISK_AVAILABLE}KB"
else
    fail "Insufficient disk space (available: ${DISK_AVAILABLE}KB, required: 1000000KB)"
fi

# Test 4: Python (optional, for YOLO training)
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    pass "Python version: $PYTHON_VERSION (optional, for YOLO training)"
else
    warn "Python3 not installed (optional, needed for YOLO model training)"
fi

print_header "FILE & CONFIGURATION CHECKS"

# Test 5: Check if JSON file exists and is valid
if [ -f "2captcha-worker-n8n.json" ]; then
    if python3 -m json.tool 2captcha-worker-n8n.json > /dev/null 2>&1; then
        pass "2captcha-worker-n8n.json is valid JSON"
    else
        fail "2captcha-worker-n8n.json has JSON syntax errors"
    fi
else
    fail "2captcha-worker-n8n.json not found in current directory"
fi

# Test 6: Check .env file exists
if [ -f ".env" ]; then
    pass ".env configuration file found"
    
    # Test 6a: Check for required variables
    REQUIRED_VARS=("STEEL_BROWSER_URL" "STEEL_API_KEY" "TWOCAPTCHA_EMAIL" "TWOCAPTCHA_PASSWORD" "CONSENSUS_SOLVER_WEBHOOK_URL" "TELEGRAM_BOT_TOKEN" "TELEGRAM_CHAT_ID")
    
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^${var}=" .env; then
            VALUE=$(grep "^${var}=" .env | cut -d'=' -f2-)
            if [ -z "$VALUE" ]; then
                fail "$var is defined but empty"
            else
                # Don't show actual value for security
                pass "$var is configured"
            fi
        else
            fail "$var not found in .env (required)"
        fi
    done
else
    fail ".env file not found - create from .env.example first"
fi

print_header "EXTERNAL SERVICES CONNECTIVITY"

# Test 7: Check 2captcha.com accessibility
info "Testing 2captcha.com accessibility..."
if timeout 5 curl -s -o /dev/null -w "%{http_code}" https://2captcha.com/play-and-earn/play | grep -q "200\|301\|302"; then
    pass "2captcha.com is reachable"
else
    warn "2captcha.com may be blocked or unreachable (check VPN/firewall)"
fi

# Test 8: Steel Browser connectivity (if URL provided)
if [ -f ".env" ]; then
    STEEL_URL=$(grep "^STEEL_BROWSER_URL=" .env | cut -d'=' -f2-)
    if [ ! -z "$STEEL_URL" ]; then
        info "Testing Steel Browser at $STEEL_URL..."
        if timeout 5 curl -s -o /dev/null -w "%{http_code}" "$STEEL_URL/health" | grep -q "200"; then
            pass "Steel Browser is responding"
        else
            warn "Steel Browser not responding at $STEEL_URL (may not be running)"
        fi
    fi
fi

# Test 9: Telegram Bot Token validation
if [ -f ".env" ]; then
    TELEGRAM_TOKEN=$(grep "^TELEGRAM_BOT_TOKEN=" .env | cut -d'=' -f2-)
    if [ ! -z "$TELEGRAM_TOKEN" ] && [[ "$TELEGRAM_TOKEN" =~ ^[0-9]+:[A-Za-z0-9_-]+$ ]]; then
        info "Testing Telegram Bot Token..."
        if timeout 5 curl -s "https://api.telegram.org/bot${TELEGRAM_TOKEN}/getMe" | grep -q "ok"; then
            pass "Telegram Bot Token is valid"
        else
            fail "Telegram Bot Token is invalid or API unreachable"
        fi
    else
        warn "Telegram Bot Token format invalid (should be: 123456:ABC-DEF...)"
    fi
fi

# Test 10: Consensus Solver Webhook reachability
if [ -f ".env" ]; then
    WEBHOOK_URL=$(grep "^CONSENSUS_SOLVER_WEBHOOK_URL=" .env | cut -d'=' -f2-)
    if [ ! -z "$WEBHOOK_URL" ]; then
        info "Testing Consensus Solver webhook at $WEBHOOK_URL..."
        if timeout 10 curl -s -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d '{"test": true}' > /dev/null 2>&1; then
            pass "Consensus Solver webhook is reachable"
        else
            warn "Consensus Solver webhook not responding (may not be running)"
        fi
    fi
fi

print_header "2CAPTCHA ACCOUNT VALIDATION"

# Test 11: 2captcha credentials format
if [ -f ".env" ]; then
    EMAIL=$(grep "^TWOCAPTCHA_EMAIL=" .env | cut -d'=' -f2-)
    if [ ! -z "$EMAIL" ] && [[ "$EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        pass "2captcha email format is valid"
    else
        fail "2captcha email format is invalid"
    fi
fi

# Test 12: Documentation files exist
info "Checking documentation..."
DOC_FILES=("README.md" "QUICK-START-IMPORT.md" "INTEGRATION-GUIDE.md" "DEPLOYMENT-CHECKLIST.md")
for doc in "${DOC_FILES[@]}"; do
    if [ -f "$doc" ]; then
        LINES=$(wc -l < "$doc")
        pass "$doc exists ($LINES lines)"
    else
        warn "$doc not found (helpful but not required)"
    fi
done

# Test 13: Environment setup
info "Checking environment..."
if [ -f ".env.example" ]; then
    pass ".env.example template available"
else
    warn ".env.example template not found"
fi

print_header "DEPLOYMENT READINESS ASSESSMENT"

# Test 14: n8n installation
info "Checking n8n installation..."
if npm list -g n8n > /dev/null 2>&1; then
    N8N_VERSION=$(npm view n8n version 2>/dev/null)
    pass "n8n is installed globally (latest: $N8N_VERSION)"
else
    warn "n8n not installed globally - install with: npm install -g n8n"
fi

# Test 15: Port availability (port 5678 for n8n)
info "Checking port 5678 availability..."
if ! lsof -Pi :5678 -sTCP:LISTEN -t >/dev/null 2>&1; then
    pass "Port 5678 is available"
else
    warn "Port 5678 is already in use (change N8N_PORT if needed)"
fi

print_summary

# Exit with appropriate code
if [ $FAIL_COUNT -eq 0 ]; then
    exit 0
else
    exit 1
fi
