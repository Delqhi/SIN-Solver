#!/bin/bash
# Production Validation Script - 2captcha Automation System
# Checks all services and prerequisites before deployment

set -e

echo "🚀 2captcha Worker System - Production Validation"
echo "=================================================="
echo ""

PASS=0
FAIL=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check() {
    local name=$1
    local command=$2
    local expected=$3
    
    echo -n "Checking $name... "
    
    if eval "$command" > /dev/null 2>&1; then
        if [ -z "$expected" ] || eval "$command" | grep -q "$expected"; then
            echo -e "${GREEN}✓ PASS${NC}"
            ((PASS++))
            return 0
        fi
    fi
    
    echo -e "${RED}✗ FAIL${NC}"
    ((FAIL++))
    return 1
}

# Check prerequisites
echo "📋 Prerequisites"
echo "---"
check "Node.js installed" "node --version" "v1"
check "npm installed" "npm --version" ""
check "jq installed" "jq --version" "jq"
echo ""

# Check services
echo "🔧 Services Status"
echo "---"
check "Consensus Solver (localhost:8090)" "curl -s http://localhost:8090/api/health | jq .status" "healthy"
check "Steel Browser Docker" "docker ps | grep steel" "agent-05-steel-browser"
check "n8n Docker" "docker ps | grep n8n" "agent-01-n8n"
echo ""

# Check files
echo "📁 Required Files"
echo "---"
check "Workflow JSON exists" "test -f infrastructure/n8n/workflows/2captcha-worker-production.json" ""
check "Workflow JSON valid" "jq empty infrastructure/n8n/workflows/2captcha-worker-production.json" ""
check "Consensus solver script" "test -f consensus-server.js" ""
check "Human behavior module" "test -f agents/human-behavior-module.js" ""
check "Production setup guide" "test -f PRODUCTION-SETUP.md" ""
echo ""

# Check connectivity
echo "🌐 External Connectivity"
echo "---"
check "2captcha.com reachable" "curl -s -I https://2captcha.com/play-and-earn/play | head -1" "200"
echo ""

# Summary
echo "=================================================="
echo "📊 Validation Summary"
echo "---"
echo -e "Passed: ${GREEN}$PASS${NC}"
echo -e "Failed: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! System is ready for deployment.${NC}"
    echo ""
    echo "📖 Next steps:"
    echo "1. Open http://localhost:5678 in your browser"
    echo "2. Import: infrastructure/n8n/workflows/2captcha-worker-production.json"
    echo "3. Set TOTAL_ATTEMPTS=5 for test run"
    echo "4. Click 'Execute Workflow'"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some checks failed. Please fix the issues above.${NC}"
    echo ""
    echo "📖 Troubleshooting:"
    echo "- Consensus solver: nohup node consensus-server.js > /tmp/consensus-solver.log 2>&1 &"
    echo "- Docker: docker-compose up -d"
    echo "- n8n: Visit http://localhost:5678"
    echo ""
    exit 1
fi
