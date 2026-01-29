#!/bin/bash
# =============================================================================
# SIN-Solver Quick Start Script
# Get everything running with one command
# =============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Banner
echo -e "${CYAN}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   ███████╗██╗███╗   ██╗      ███████╗ ██████╗ ██╗    ██╗   ██╗███████╗██████╗║
║   ██╔════╝██║████╗  ██║      ██╔════╝██╔═══██╗██║    ██║   ██║██╔════╝██╔══██╗
║   ███████╗██║██╔██╗ ██║█████╗███████╗██║   ██║██║    ██║   ██║█████╗  ██████╔╝
║   ╚════██║██║██║╚██╗██║╚════╝╚════██║██║   ██║██║    ╚██╗ ██╔╝██╔══╝  ██╔══██╗
║   ███████║██║██║ ╚████║      ███████║╚██████╔╝███████╗╚████╔╝ ███████╗██║  ██║
║   ╚══════╝╚═╝╚═╝  ╚═══╝      ╚══════╝ ╚═════╝ ╚══════╝ ╚═══╝  ╚══════╝╚═╝  ╚═╝
║                                                                              ║
║   Enterprise CAPTCHA Solving Engine with Multi-AI Consensus                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check prerequisites
echo -e "${BLUE}${BOLD}[1/5] Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker first.${NC}"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not found. Please install Docker Compose.${NC}"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker daemon not running. Please start Docker.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is ready${NC}"

# Check/create .env
echo -e "${BLUE}${BOLD}[2/5] Checking environment configuration...${NC}"

if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo -e "${YELLOW}⚠️  .env not found, creating from .env.example${NC}"
        cp .env.example .env
        echo -e "${YELLOW}📝 Please edit .env with your API keys, then run this script again.${NC}"
        echo -e "   Required: GEMINI_API_KEY"
        exit 0
    else
        echo -e "${RED}❌ .env.example not found${NC}"
        exit 1
    fi
fi

# Validate required env vars
if grep -q "your_gemini_api_key_here" .env 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Please set GEMINI_API_KEY in .env file${NC}"
    echo -e "   Get a free key at: https://aistudio.google.com/apikey"
    exit 0
fi

echo -e "${GREEN}✅ Environment configured${NC}"

# Start infrastructure
echo -e "${BLUE}${BOLD}[3/5] Starting core infrastructure...${NC}"

docker compose up -d \
    room-04-redis-cache \
    room-03-postgres-master \
    2>/dev/null || docker-compose up -d \
    room-04-redis-cache \
    room-03-postgres-master

# Wait for databases
echo -e "${YELLOW}   Waiting for databases...${NC}"
timeout=60
elapsed=0
while [ $elapsed -lt $timeout ]; do
    if docker compose exec -T room-03-postgres-master pg_isready -U ceo_admin -d sin_solver_production >/dev/null 2>&1; then
        break
    fi
    sleep 2
    elapsed=$((elapsed + 2))
    printf "\r${YELLOW}   Waiting for PostgreSQL... %ds${NC}" "$elapsed"
done
echo ""

if [ $elapsed -ge $timeout ]; then
    echo -e "${RED}❌ PostgreSQL failed to start${NC}"
    docker compose logs room-03-postgres-master
    exit 1
fi

echo -e "${GREEN}✅ Infrastructure ready (PostgreSQL, Redis)${NC}"

# Start browser automation
echo -e "${BLUE}${BOLD}[4/5] Starting browser automation...${NC}"

docker compose up -d agent-05-steel-browser 2>/dev/null || docker-compose up -d agent-05-steel-browser
sleep 3

echo -e "${GREEN}✅ Steel Browser ready${NC}"

# Start dashboard and API
echo -e "${BLUE}${BOLD}[5/5] Starting dashboard and API...${NC}"

docker compose up -d \
    room-13-fastapi-coordinator \
    room-11-dashboard-cockpit \
    2>/dev/null || docker-compose up -d \
    room-13-fastapi-coordinator \
    room-11-dashboard-cockpit

# Wait for services
echo -e "${YELLOW}   Waiting for services to initialize...${NC}"
sleep 10

# Final status
echo ""
echo -e "${GREEN}${BOLD}"
cat << "EOF"
╔══════════════════════════════════════════════════════════════════════════════╗
║                     ✅ SIN-SOLVER IS READY!                                  ║
╚══════════════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${CYAN}${BOLD}🌐 ACCESS POINTS:${NC}"
echo ""
echo -e "   ${BOLD}Dashboard${NC}     →  ${BLUE}http://localhost:3011${NC}"
echo -e "   ${BOLD}API${NC}           →  ${BLUE}http://localhost:8000${NC}"
echo -e "   ${BOLD}API Docs${NC}      →  ${BLUE}http://localhost:8000/docs${NC}"
echo ""

echo -e "${CYAN}${BOLD}📋 QUICK COMMANDS:${NC}"
echo ""
echo -e "   ${YELLOW}./status.sh${NC}       Check service health"
echo -e "   ${YELLOW}./stop.sh${NC}         Stop all services"
echo -e "   ${YELLOW}docker compose logs -f${NC}  View live logs"
echo ""

echo -e "${CYAN}${BOLD}🧪 TEST THE API:${NC}"
echo ""
echo -e '   curl http://localhost:8000/health'
echo ""

echo -e "${GREEN}Happy solving! 🚀${NC}"
