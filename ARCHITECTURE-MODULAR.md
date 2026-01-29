# 🏗️ SIN-SOLVER MODULAR ARCHITECTURE (Best Practices 2026)

**Principle:** ONE Container = ONE docker-compose.yml file

---

## 📁 Directory Structure (TARGET)

```
/Users/jeremy/dev/Delqhi-Platform/
├── Docker/
│   ├── agents/
│   │   ├── agent-01-n8n-orchestrator/
│   │   │   └── docker-compose.yml
│   │   ├── agent-02-chronos-scheduler/
│   │   │   └── docker-compose.yml
│   │   ├── agent-03-agentzero-coder/
│   │   │   └── docker-compose.yml
│   │   ├── agent-04-opencode-secretary/
│   │   │   └── docker-compose.yml
│   │   ├── agent-05-steel-browser/
│   │   │   └── docker-compose.yml
│   │   ├── agent-06-skyvern-solver/
│   │   │   └── docker-compose.yml
│   │   ├── agent-07-stagehand-research/
│   │   │   └── docker-compose.yml
│   │   ├── agent-08-playwright-tester/
│   │   │   └── docker-compose.yml
│   │   ├── agent-09-clawdbot-messenger/
│   │   │   └── docker-compose.yml
│   │   └── agent-12-evolution-optimizer/
│   │       └── docker-compose.yml
│   │
│   ├── rooms/
│   │   ├── room-00-cloudflared-tunnel/
│   │   │   └── docker-compose.yml
│   │   ├── room-01-dashboard-cockpit/
│   │   │   └── docker-compose.yml
│   │   ├── room-02-tresor-vault/
│   │   │   └── docker-compose.yml
│   │   ├── room-02-tresor-api/
│   │   │   └── docker-compose.yml
│   │   ├── room-03-postgres-master/
│   │   │   └── docker-compose.yml
│   │   ├── room-04-redis-cache/
│   │   │   └── docker-compose.yml
│   │   ├── room-10-postgres-knowledge/  # To be merged
│   │   │   └── docker-compose.yml
│   │   ├── room-11-plane-mcp/
│   │   │   └── docker-compose.yml
│   │   ├── room-13-api-brain/
│   │   │   └── docker-compose.yml
│   │   ├── room-15-surfsense-archiv/
│   │   │   └── docker-compose.yml
│   │   ├── room-16-supabase-studio/
│   │   │   └── docker-compose.yml
│   │   ├── room-17-sin-plugins/
│   │   │   └── docker-compose.yml
│   │   └── room-20-x-mcps/              # All MCP services
│   │       ├── room-20.3-social-mcp/
│   │       ├── room-20.4-research-mcp/
│   │       └── room-20.5-video-mcp/
│   │
│   └── solvers/
│       ├── solver-14-worker-automation/
│       │   └── docker-compose.yml
│       ├── solver-18-survey-worker/
│       │   └── docker-compose.yml
│       └── solver-19-captcha-worker/
│           └── docker-compose.yml
│
├── infrastructure/
│   └── cloudflare/
│       └── config.yml
│
├── mcp-wrappers/                          # MCP stdio wrappers
│   ├── plane-mcp-wrapper.js
│   └── README.md
│
├── scripts/
│   ├── start-all.sh                       # Start all services
│   ├── stop-all.sh                        # Stop all services
│   └── status.sh                          # Check all statuses
│
├── docker-compose.yml                     # TEMPORARY (legacy)
├── docker-compose.override.yml            # Local overrides
├── Makefile                               # Make commands
└── README.md
```

---

## 🚀 Quick Commands (After Migration)

```bash
# Start all services
make start-all

# Start specific category
make start-agents
make start-rooms
make start-solvers

# Start single service
docker compose -f Docker/agents/agent-05-steel-browser/docker-compose.yml up -d

# View all running
make status

# Stop all
make stop-all
```

---

## 🔧 Migration Plan

### Phase 1: Infrastructure (Done First)
- [x] room-00-cloudflared-tunnel
- [x] room-03-postgres-master
- [x] room-04-redis-cache

### Phase 2: Core Services
- [ ] room-13-api-brain
- [ ] room-02-tresor-vault
- [ ] room-02-tresor-api

### Phase 3: Agents (One by One)
- [ ] agent-01-n8n-orchestrator
- [ ] agent-05-steel-browser
- [ ] agent-06-skyvern-solver
- ... (all others)

### Phase 4: Solvers
- [ ] solver-14-worker-automation
- [ ] solver-18-survey-worker
- [ ] solver-19-captcha-worker

### Phase 5: Cleanup
- [ ] Remove monolithic docker-compose.yml
- [ ] Update documentation
- [ ] Test everything

---

## 📖 Example: Single Container docker-compose.yml

```yaml
# Docker/agents/agent-05-steel-browser/docker-compose.yml
version: '3.9'

services:
  agent-05-steel-browser:
    image: ghcr.io/steel-dev/steel-browser:latest
    platform: linux/amd64  # For Mac M1 compatibility
    container_name: agent-05-steel-browser
    hostname: agent-05-steel-browser
    ports:
      - "3000:3000"
      - "9222:9222"
    environment:
      PORT: 3000
      DEBUGGER_PORT: 9222
      STEALTH_MODE: "true"
    volumes:
      - steel_data:/home/pptruser/.config/google-chrome
    networks:
      - delqhi-platform-network
    healthcheck:
      test: ["CMD-SHELL", "nc -z localhost 3000 || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
    restart: unless-stopped

volumes:
  steel_data:
    driver: local

networks:
  delqhi-platform-network:
    external: true
```

---

## 🎯 Benefits of This Architecture

| Benefit | Description |
|---------|-------------|
| **Independent Updates** | Update one service without touching others |
| **Better Monitoring** | Clear ownership per service |
| **Easier Debugging** | Isolated logs and configs |
| **Team Scaling** | Different teams own different directories |
| **Resource Control** | Fine-grained resource limits per service |
| **Faster Startup** | Start only what you need |
| **Clear Dependencies** | Each service declares its own deps |

---

## ⚠️ CURRENT STATE WARNING

**RIGHT NOW:** All services are in ONE docker-compose.yml (monolithic)

**TARGET:** Each service has its own directory and docker-compose.yml

**DO NOT:** Add more services to the root docker-compose.yml!

**DO:** Create new services in their own directories under Docker/

---

## 🔗 Shared Resources

All services share:
- **Network:** `delqhi-platform-network` (created once)
- **Volumes:** Named volumes (defined per service)
- **Environment:** `.env` file (loaded by all)

---

**Last Updated:** 2026-01-29  
**Status:** Migration In Progress  
**Next Action:** Create first modular service
