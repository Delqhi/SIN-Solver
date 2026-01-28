#!/bin/bash
# Phase 7 Health Check Script

echo "╔═════════════════════════════════════════╗"
echo "║   PHASE 7 INFRASTRUCTURE HEALTH CHECK   ║"
echo "╚═════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test PostgreSQL
echo -n "PostgreSQL... "
if docker exec room-03-postgres-master pg_isready -U postgres > /dev/null 2>&1; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
fi

# Test Redis
echo -n "Redis... "
if docker exec room-04-redis-cache redis-cli -a "sinredis2026!SecurePass" ping > /dev/null 2>&1; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
fi

# Test Services
for service in agent-01-n8n-orchestrator agent-03-agentzero-coder agent-05-steel-browser agent-06-skyvern-solver solver-1.1-captcha-worker solver-2.1-survey-worker; do
  echo -n "$service... "
  if docker ps | grep -q "$service"; then
    echo -e "${GREEN}✅${NC}"
  else
    echo -e "${RED}❌${NC}"
  fi
done

echo ""
echo "✅ Health check complete"
