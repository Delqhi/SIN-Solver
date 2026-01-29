#!/bin/bash

# Delqhi-Platform Docker Services Deployment Status
# V18.3 Modular Architecture Compliance Report
# Generated: 2026-01-28

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "🔍 Analyzing Docker Infrastructure V18.3 Compliance..."
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Stats
TOTAL_SERVICES=0
IMPLEMENTED=0
DOCUMENTED=0

# Function to check service
check_service() {
    local service_path=$1
    local service_name=$2
    local required_files=("docker-compose.yml" ".env.example")
    
    TOTAL_SERVICES=$((TOTAL_SERVICES + 1))
    
    if [ ! -d "$service_path" ]; then
        echo -e "${RED}❌ ${service_name}${NC} (directory missing)"
        return
    fi
    
    IMPLEMENTED=$((IMPLEMENTED + 1))
    
    # Check for required files
    local all_files_present=true
    for file in "${required_files[@]}"; do
        if [ ! -f "$service_path/$file" ]; then
            echo -e "${YELLOW}⚠️  ${service_name}${NC} (missing $file)"
            all_files_present=false
        fi
    done
    
    if [ "$all_files_present" = true ]; then
        DOCUMENTED=$((DOCUMENTED + 1))
        echo -e "${GREEN}✓ ${service_name}${NC}"
    fi
}

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 1: INFRASTRUCTURE SERVICES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
check_service "$SCRIPT_DIR/infrastructure/room-03-postgres" "room-03-postgres-master"
check_service "$SCRIPT_DIR/infrastructure/room-04-redis" "room-04-redis-cache"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 2: AGENT SERVICES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
check_service "$SCRIPT_DIR/agents/agent-01-n8n" "agent-01-n8n-orchestrator"
check_service "$SCRIPT_DIR/agents/agent-03-agentzero" "agent-03-agentzero-coder"
check_service "$SCRIPT_DIR/agents/agent-05-steel" "agent-05-steel-browser"
check_service "$SCRIPT_DIR/agents/agent-06-skyvern" "agent-06-skyvern-solver"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 3: SOLVER SERVICES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
check_service "$SCRIPT_DIR/solvers/solver-1.1-captcha" "solver-1.1-captcha-worker"
check_service "$SCRIPT_DIR/solvers/solver-2.1-survey" "solver-2.1-survey-worker"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 4: USER-FACING SERVICES${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
check_service "$SCRIPT_DIR/rooms/room-01-dashboard" "room-01-dashboard-cockpit"

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SUMMARY${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo "Total Services: $TOTAL_SERVICES"
echo "Implemented: $IMPLEMENTED ($((IMPLEMENTED * 100 / TOTAL_SERVICES))%)"
echo "Fully Documented: $DOCUMENTED ($((DOCUMENTED * 100 / TOTAL_SERVICES))%)"
echo ""

if [ $DOCUMENTED -eq $TOTAL_SERVICES ]; then
    echo -e "${GREEN}✓ All services fully implemented and documented!${NC}"
    echo ""
    echo "Ready to deploy with: ./startup.sh"
else
    echo -e "${YELLOW}⚠️  Some services are incomplete or missing files${NC}"
fi

echo ""
