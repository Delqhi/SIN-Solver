#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     📊 SIN-SOLVER: SYSTEM STATUS                             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}🐳 CONTAINER STATUS:${NC}"
echo ""
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || docker-compose ps

echo ""
echo -e "${BLUE}🏥 HEALTH CHECKS:${NC}"
echo ""

check_health() {
    local name=$1
    local url=$2
    local response
    
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$url" 2>/dev/null)
    
    if [ "$response" = "200" ]; then
        echo -e "  ${GREEN}✅ $name${NC} ($url)"
    elif [ "$response" = "000" ]; then
        echo -e "  ${RED}❌ $name${NC} (not reachable)"
    else
        echo -e "  ${YELLOW}⚠️  $name${NC} (HTTP $response)"
    fi
}

check_health "Redis" "http://localhost:6379"
check_health "PostgreSQL" "http://localhost:5432"
check_health "API Coordinator" "http://localhost:8000/health"
check_health "Dashboard" "http://localhost:3001"
check_health "n8n" "http://localhost:5678/healthz"
check_health "Steel Browser" "http://localhost:3000"
check_health "Chronos" "http://localhost:3001/health"
check_health "OpenCode" "http://localhost:3002/health"
check_health "ClawdBot" "http://localhost:8004/health"
check_health "QA Service" "http://localhost:8005/health"
check_health "MCP Plugins" "http://localhost:8006/health"
check_health "Evolution" "http://localhost:8007/health"

echo ""
echo -e "${BLUE}💾 RESOURCE USAGE:${NC}"
echo ""
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>/dev/null | head -20

echo ""
echo -e "${BLUE}🔗 NETWORK:${NC}"
docker network inspect haus-netzwerk --format '{{range .Containers}}{{.Name}}: {{.IPv4Address}}{{"\n"}}{{end}}' 2>/dev/null | sort || echo "Network not found"

echo ""
echo -e "${YELLOW}💡 Commands:${NC}"
echo "  ./start.sh  - Start all services"
echo "  ./stop.sh   - Stop all services"
echo "  docker-compose logs -f [service]  - View logs"
