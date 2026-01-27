#!/bin/bash
set -e

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
echo "║     🚀 SIN-SOLVER: DAS HAUS - CEO EMPIRE 2026                ║"
echo "║     17-Room Distributed Fortress                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create .env file with required API keys."
    exit 1
fi

echo -e "${BLUE}📋 Loading environment...${NC}"
export $(grep -v '^#' .env | xargs)

echo -e "${BLUE}🔨 Building services...${NC}"
docker-compose build --parallel 2>/dev/null || docker-compose build

echo -e "${BLUE}🚀 Starting infrastructure (Redis, PostgreSQL)...${NC}"
docker-compose up -d zimmer-speicher-redis zimmer-archiv-postgres zimmer-10-postgres-bibliothek

echo -e "${YELLOW}⏳ Waiting for databases to be healthy...${NC}"
sleep 5

timeout=60
elapsed=0
while [ $elapsed -lt $timeout ]; do
    if docker-compose exec -T zimmer-archiv-postgres pg_isready -U ceo_admin -d sin_solver_production >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
        break
    fi
    sleep 2
    elapsed=$((elapsed + 2))
    echo -ne "\r${YELLOW}⏳ Waiting for PostgreSQL... ${elapsed}s${NC}"
done

if [ $elapsed -ge $timeout ]; then
    echo -e "${RED}❌ PostgreSQL failed to start within ${timeout}s${NC}"
    exit 1
fi

echo -e "${BLUE}🌐 Starting browser automation (Steel)...${NC}"
docker-compose up -d zimmer-05-steel-tarnkappe
sleep 3

echo -e "${BLUE}🧠 Starting API Coordinator (Zimmer-13)...${NC}"
docker-compose up -d zimmer-13-api-koordinator
sleep 3

echo -e "${BLUE}🤖 Starting all microservices...${NC}"
docker-compose up -d \
    zimmer-01-n8n-manager \
    zimmer-02-chronos-stratege \
    zimmer-04-opencode-sekretaer \
    zimmer-08-qa-pruefer \
    zimmer-09-clawdbot-bote \
    zimmer-11-dashboard-zentrale \
    zimmer-12-evolution-optimizer \
    zimmer-14-worker-arbeiter \
    zimmer-17-sin-plugins

echo -e "${BLUE}📚 Starting supporting services...${NC}"
docker-compose up -d \
    zimmer-06-skyvern-auge \
    zimmer-15-surfsense-archiv \
    zimmer-16-supabase-studio \
    zimmer-16-pg-meta \
    2>/dev/null || true

echo -e "${YELLOW}⏳ Waiting for services to initialize...${NC}"
sleep 10

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ SIN-SOLVER STARTED SUCCESSFULLY                       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}📊 SERVICE ENDPOINTS:${NC}"
echo -e "  ${BLUE}Dashboard:${NC}        http://localhost:3001"
echo -e "  ${BLUE}API Coordinator:${NC}  http://localhost:8000"
echo -e "  ${BLUE}n8n Workflows:${NC}    http://localhost:5678"
echo -e "  ${BLUE}OpenCode:${NC}         http://localhost:3002"
echo -e "  ${BLUE}Chronos:${NC}          http://localhost:3001"
echo -e "  ${BLUE}ClawdBot:${NC}         http://localhost:8004"
echo -e "  ${BLUE}QA Service:${NC}       http://localhost:8005"
echo -e "  ${BLUE}MCP Plugins:${NC}      http://localhost:8006"
echo -e "  ${BLUE}Evolution:${NC}        http://localhost:8007"
echo -e "  ${BLUE}Steel Browser:${NC}    http://localhost:3000"
echo -e "  ${BLUE}SurfSense:${NC}        http://localhost:3003"
echo -e "  ${BLUE}Supabase Studio:${NC}  http://localhost:3004"
echo ""
echo -e "${YELLOW}💡 Run ./status.sh to check service health${NC}"
echo -e "${YELLOW}💡 Run ./stop.sh to stop all services${NC}"
