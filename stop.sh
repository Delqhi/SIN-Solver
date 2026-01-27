#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     🛑 SIN-SOLVER: STOPPING ALL SERVICES                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}⏳ Stopping all containers gracefully...${NC}"
docker-compose down

echo ""
echo -e "${GREEN}✅ All services stopped${NC}"
echo ""
echo -e "${YELLOW}💡 Data volumes are preserved. Run ./start.sh to restart.${NC}"
echo -e "${YELLOW}💡 To remove volumes: docker-compose down -v${NC}"
