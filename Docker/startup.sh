#!/bin/bash

# Delqhi-Platform Docker Full Stack Startup Script (V18.3 Modular)
# Starts all services in proper dependency order

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "🚀 Delqhi-Platform Docker Stack Startup"
echo "📍 Working directory: $SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to start a service
start_service() {
    local service_name=$1
    local service_path=$2
    
    echo -e "${BLUE}▶ Starting ${service_name}...${NC}"
    
    cd "${SCRIPT_DIR}${service_path}"
    
    # Create .env if it doesn't exist
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            echo -e "${YELLOW}ℹ Created .env from .env.example - update with your values${NC}"
        fi
    fi
    
    docker-compose up -d
    
    # Wait for service to be healthy
    sleep 5
    
    echo -e "${GREEN}✓ ${service_name} started${NC}"
}

# Function to check service health
check_health() {
    local service_name=$1
    local container_name=$2
    local health_check=$3
    
    echo -e "${BLUE}⊗ Checking ${service_name}...${NC}"
    
    if [ -z "$health_check" ]; then
        # Simple container check
        if docker ps | grep -q "$container_name"; then
            echo -e "${GREEN}✓ ${service_name} is running${NC}"
            return 0
        else
            echo -e "${RED}✗ ${service_name} is NOT running${NC}"
            return 1
        fi
    else
        # Custom health check
        eval "$health_check" && \
            echo -e "${GREEN}✓ ${service_name} is healthy${NC}" || \
            echo -e "${YELLOW}⚠ ${service_name} health check failed${NC}"
    fi
}

# PHASE 1: Infrastructure Services (CRITICAL)
echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 1: Core Infrastructure Services${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

start_service "PostgreSQL Master (room-03)" "/infrastructure/room-03-postgres"
start_service "Redis Cache (room-04)" "/infrastructure/room-04-redis"

# PHASE 2: Agent Services
echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 2: Agent Worker Services${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

start_service "n8n Orchestrator (agent-01)" "/agents/agent-01-n8n"
start_service "Agent Zero Code Generator (agent-03)" "/agents/agent-03-agentzero"
start_service "Steel Browser (agent-05)" "/agents/agent-05-steel"
start_service "Skyvern Visual Solver (agent-06)" "/agents/agent-06-skyvern"

# PHASE 3: User-Facing Services
echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 3: Solver & Builder Services${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

start_service "Captcha Worker (solver-1.1)" "/solvers/solver-1.1-captcha"
start_service "Survey Worker (solver-2.1)" "/solvers/solver-2.1-survey"

# PHASE 4: User-Facing Services
echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 4: User Interface Services${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

start_service "Dashboard Cockpit (room-01)" "/rooms/room-01-dashboard"

# PHASE 5: Health Checks
echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}PHASE 5: Service Health Verification${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

check_health "PostgreSQL" "room-03-postgres-master" "docker exec room-03-postgres-master pg_isready -U postgres"
check_health "Redis" "room-04-redis-cache" "docker exec room-04-redis-cache redis-cli ping"
check_health "n8n" "agent-01-n8n-orchestrator" "curl -sf http://localhost:5678/api/health > /dev/null"
check_health "Agent Zero" "agent-03-agentzero-coder" "curl -sf http://localhost:8050/health > /dev/null"
check_health "Steel Browser" "agent-05-steel-browser" "curl -sf http://localhost:3005/health > /dev/null"
check_health "Skyvern" "agent-06-skyvern-solver" "curl -sf http://localhost:8030/health > /dev/null"
check_health "Captcha Worker" "solver-1.1-captcha-worker" "curl -sf http://localhost:8019/health > /dev/null"
check_health "Survey Worker" "solver-2.1-survey-worker" "curl -sf http://localhost:8018/health > /dev/null"
check_health "Dashboard" "room-01-dashboard-cockpit" "curl -sf http://localhost:3011/api/health > /dev/null"

# Final Summary
echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Delqhi-Platform Docker Stack Startup Complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}\n"

echo "📊 Service Status:"
docker ps --filter "label!=com.docker.compose.project" --format "table {{.Names}}\t{{.Status}}" | grep -E "room-|agent-|solver-|builder-"

echo -e "\n🌐 Access Points:"
echo "  Dashboard         → http://localhost:3011"
echo "  n8n Editor        → http://localhost:5678"
echo "  Agent Zero        → http://localhost:8050"
echo "  Steel Browser CDP → http://localhost:3005"
echo "  Skyvern           → http://localhost:8030"
echo "  Captcha Solver    → http://localhost:8019"
echo "  Survey Worker     → http://localhost:8018"
echo "  PostgreSQL        → localhost:5432"
echo "  Redis             → localhost:6379"

echo -e "\n📚 Next Steps:"
echo "  1. Review logs: docker-compose logs -f"
echo "  2. Configure workflows in n8n"
echo "  3. Set up API integrations"
echo "  4. Deploy additional agents/solvers as needed"

echo -e "\n${YELLOW}ℹ To stop all services:${NC}"
echo "  docker-compose -f Docker/docker-compose.yml down"

echo -e "\n${GREEN}🚀 System Ready!${NC}\n"
