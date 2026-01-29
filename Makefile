# SIN-Solver Modular Docker Management
# Best Practices 2026: CEO Master Mode
# One Container = One docker-compose.yml

.PHONY: help start-all stop-all status start-infrastructure start-agents start-rooms start-solvers

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

help:
	@echo "$(BLUE)SIN-Solver Modular Docker Management$(NC)"
	@echo "========================================"
	@echo ""
	@echo "$(GREEN)Quick Commands:$(NC)"
	@echo "  make start-all          Start all services"
	@echo "  make stop-all           Stop all services"
	@echo "  make status             Show status of all services"
	@echo "  make restart-all        Restart all services"
	@echo ""
	@echo "$(GREEN)Category Commands:$(NC)"
	@echo "  make start-infrastructure  Start infrastructure (Postgres, Redis, Vault)"
	@echo "  make start-agents          Start all agents"
	@echo "  make start-rooms           Start all rooms"
	@echo "  make start-solvers         Start all solvers"
	@echo ""
	@echo "$(GREEN)Individual Service:$(NC)"
	@echo "  make start-service SERVICE=agent-01-n8n-orchestrator"
	@echo "  make stop-service SERVICE=room-03-postgres-master"
	@echo "  make logs SERVICE=agent-05-steel-browser"
	@echo ""
	@echo "$(GREEN)Setup:$(NC)"
	@echo "  make create-network     Create shared Docker network"
	@echo "  make init               Initial setup (network + infrastructure)"
	@echo ""

# Create shared network
create-network:
	@echo "$(BLUE)Creating shared Docker network...$(NC)"
	@docker network create sin-solver-network 2>/dev/null || echo "$(YELLOW)Network already exists$(NC)"

# Initialize infrastructure
init: create-network start-infrastructure
	@echo "$(GREEN)✓ Initialization complete$(NC)"

# Start all services
start-all: create-network start-infrastructure start-agents start-rooms start-solvers
	@echo "$(GREEN)✓ All services started$(NC)"

# Stop all services
stop-all:
	@echo "$(RED)Stopping all services...$(NC)"
	@docker compose -f Docker/rooms/room-03-postgres-master/docker-compose.yml down
	@docker compose -f Docker/rooms/room-04-redis-cache/docker-compose.yml down
	@docker compose -f Docker/rooms/room-02-tresor-vault/docker-compose.yml down
	@docker compose -f Docker/rooms/room-02-tresor-api/docker-compose.yml down
	@docker compose -f Docker/agents/agent-01-n8n-orchestrator/docker-compose.yml down
	@docker compose -f Docker/agents/agent-05-steel-browser/docker-compose.yml down 2>/dev/null || true
	@docker compose -f Docker/agents/agent-06-skyvern-solver/docker-compose.yml down 2>/dev/null || true
	@echo "$(GREEN)✓ All services stopped$(NC)"

# Restart all services
restart-all: stop-all start-all

# Start infrastructure only
start-infrastructure:
	@echo "$(BLUE)Starting Infrastructure...$(NC)"
	@docker compose -f Docker/rooms/room-03-postgres-master/docker-compose.yml up -d
	@docker compose -f Docker/rooms/room-04-redis-cache/docker-compose.yml up -d
	@docker compose -f Docker/rooms/room-02-tresor-vault/docker-compose.yml up -d
	@sleep 5
	@docker compose -f Docker/rooms/room-02-tresor-api/docker-compose.yml up -d
	@echo "$(GREEN)✓ Infrastructure started$(NC)"

# Start agents
start-agents:
	@echo "$(BLUE)Starting Agents...$(NC)"
	@docker compose -f Docker/agents/agent-01-n8n-orchestrator/docker-compose.yml up -d
	@echo "$(GREEN)✓ Agents started$(NC)"

# Start rooms
start-rooms:
	@echo "$(BLUE)Starting Rooms...$(NC)"
	@echo "$(YELLOW)Rooms started with infrastructure$(NC)"

# Start solvers
start-solvers:
	@echo "$(BLUE)Starting Solvers...$(NC)"
	@echo "$(YELLOW)Solvers not yet migrated$(NC)"

# Start individual service
start-service:
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)Error: SERVICE not specified$(NC)"; \
		echo "Usage: make start-service SERVICE=agent-01-n8n-orchestrator"; \
		exit 1; \
	fi
	@echo "$(BLUE)Starting $(SERVICE)...$(NC)"
	@docker compose -f Docker/*/$(SERVICE)/docker-compose.yml up -d

# Stop individual service
stop-service:
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)Error: SERVICE not specified$(NC)"; \
		echo "Usage: make stop-service SERVICE=agent-01-n8n-orchestrator"; \
		exit 1; \
	fi
	@echo "$(RED)Stopping $(SERVICE)...$(NC)"
	@docker compose -f Docker/*/$(SERVICE)/docker-compose.yml down

# Show logs for service
logs:
	@if [ -z "$(SERVICE)" ]; then \
		echo "$(RED)Error: SERVICE not specified$(NC)"; \
		echo "Usage: make logs SERVICE=agent-01-n8n-orchestrator"; \
		exit 1; \
	fi
	@docker compose -f Docker/*/$(SERVICE)/docker-compose.yml logs -f

# Status of all services
status:
	@echo "$(BLUE)========================================$(NC)"
	@echo "$(BLUE)SIN-Solver Service Status$(NC)"
	@echo "$(BLUE)========================================$(NC)"
	@echo ""
	@echo "$(YELLOW)Infrastructure:$(NC)"
	@docker ps --filter "name=room-03-postgres-master" --format "  {{.Names}}: {{.Status}}" 2>/dev/null || echo "  room-03-postgres-master: Not running"
	@docker ps --filter "name=room-04-redis-cache" --format "  {{.Names}}: {{.Status}}" 2>/dev/null || echo "  room-04-redis-cache: Not running"
	@docker ps --filter "name=room-02-tresor-vault" --format "  {{.Names}}: {{.Status}}" 2>/dev/null || echo "  room-02-tresor-vault: Not running"
	@docker ps --filter "name=room-02-tresor-api" --format "  {{.Names}}: {{.Status}}" 2>/dev/null || echo "  room-02-tresor-api: Not running"
	@echo ""
	@echo "$(YELLOW)Agents:$(NC)"
	@docker ps --filter "name=agent-01-n8n-orchestrator" --format "  {{.Names}}: {{.Status}}" 2>/dev/null || echo "  agent-01-n8n-orchestrator: Not running"
	@echo ""
	@echo "$(GREEN)========================================$(NC)"
