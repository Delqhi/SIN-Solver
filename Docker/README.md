# 🐳 Delqhi-Platform Docker Infrastructure (V18.3 Modular Edition)

**Architecture:** Modular Multi-Service Infrastructure  
**Version:** 18.3 (Anti-Monolith Edition)  
**Status:** ENTERPRISE PRODUCTION-READY  
**Last Updated:** 2026-01-28

---

## 📋 ARCHITECTURE OVERVIEW

The Delqhi-Platform Docker infrastructure follows the **V18.3 Modular Architecture**, abolishing monolithic `docker-compose.yml` files. Each service runs in its own isolated directory with its own configuration.

### Directory Structure

```
Docker/
├── README.md                          # THIS FILE - Architecture documentation
├── agents/                            # AI Worker Services
│   ├── agent-01-n8n/                 # Workflow Orchestrator
│   ├── agent-03-agentzero/           # AI Code Generation
│   ├── agent-05-steel/               # Stealth Browser Automation
│   ├── agent-06-skyvern/             # Visual Task Solving
│   └── [additional agents]/
├── infrastructure/                    # Core Infrastructure Services
│   ├── room-03-postgres/             # Primary Database
│   ├── room-04-redis/                # System Cache & Session Store
│   ├── room-13-vault/                # API Secrets Vault
│   ├── room-16-supabase/             # Supabase Backend
│   └── [additional infrastructure]/
├── rooms/                             # User-Facing Interfaces
│   ├── room-01-dashboard/            # Central Dashboard Cockpit
│   ├── room-09-chat/                 # Chat Server & MCP Bridge
│   └── [additional rooms]/
├── solvers/                           # Task Automation Workers
│   ├── solver-1.1-captcha/           # Captcha Solving Service
│   ├── solver-2.1-survey/            # Survey Automation
│   └── [additional solvers]/
├── builders/                          # Content Generation Workers
│   ├── builder-1-website/            # Website Builder Service
│   └── [additional builders]/
└── docker-compose.yml (DEPRECATED)    # Legacy - DO NOT USE
```

---

## 🏗️ MODULAR ARCHITECTURE PRINCIPLES (V18.3)

### MANDATE 0.8: THE ANTI-MONOLITH & NAMING LAW (SUPREME)

**🚨 CRITICAL RULES:**

1. **NO MONOLITHIC DOCKER-COMPOSE**
   - ❌ FORBIDDEN: Single `docker-compose.yml` with all services
   - ✅ REQUIRED: Each service in isolated `Docker/{category}/{service}/docker-compose.yml`

2. **4-PART CONTAINER NAMING CONVENTION**
   ```
   {CATEGORY}-{NUMBER}-{INTEGRATION}-{ROLE}
   ```
   
   | Part | Description | Examples |
   |------|-------------|----------|
   | **CATEGORY** | Type: agent, room, solver, builder | `agent`, `room`, `solver`, `builder` |
   | **NUMBER** | Unique ID (2 digits, allow X.Y) | `01`, `06`, `20.5` |
   | **INTEGRATION** | Core technology | `n8n`, `postgres`, `steel-browser`, `skyvern` |
   | **ROLE** | Functional role | `orchestrator`, `master`, `solver`, `browser` |

3. **CORRECT EXAMPLES**
   - ✅ `agent-01-n8n-orchestrator` (Agent 01, n8n tech, Orchestrator role)
   - ✅ `room-03-postgres-master` (Room 03, Postgres tech, Master role)
   - ✅ `solver-1.1-captcha-worker` (Solver 1.1, Captcha tech, Worker role)
   - ✅ `builder-1-website-generator` (Builder 1, Website tech, Generator role)

4. **FORBIDDEN EXAMPLES**
   - ❌ `skyvern` (Too short, missing structure)
   - ❌ `sin-zimmer-06` (Old deprecated naming)
   - ❌ `agent-06-skyvern` (Missing role)
   - ❌ `postgres` (No category/number/role)

---

## 📊 SERVICE INVENTORY (V18.3)

### 🤖 AGENTS (AI Workers)

| Service | Port | Status | Role | Priority |
|---------|------|--------|------|----------|
| **agent-01-n8n-orchestrator** | 5678 | ACTIVE | Workflow Engine | 🔴 CRITICAL |
| **agent-03-agentzero-coder** | 8050 | ACTIVE | AI Code Generation | 🔴 CRITICAL |
| **agent-05-steel-browser** | 3005 | ACTIVE | Stealth Browser | 🟡 HIGH |
| **agent-06-skyvern-solver** | 8030 | ACTIVE | Visual Task Solving | 🟡 HIGH |
| **agent-07-stagehand-research** | 3000 | ACTIVE | Research Agent | 🟡 HIGH |
| **agent-08-playwright-tester** | 8080 | PLANNING | QA Testing | 🟢 MEDIUM |

### 🏛️ INFRASTRUCTURE (Core Services)

| Service | Port | Status | Role | Priority |
|---------|------|--------|------|----------|
| **room-03-postgres-master** | 5432 | ACTIVE | Primary Database | 🔴 CRITICAL |
| **room-04-redis-cache** | 6379 | ACTIVE | System Cache | 🔴 CRITICAL |
| **room-13-vault-secrets** | 8000 | PLANNING | API Secrets | 🟡 HIGH |
| **room-16-supabase-studio** | 54323 | ACTIVE | Backend UI | 🟡 HIGH |
| **room-21-nocodb-ui** | 8090 | PLANNING | No-Code DB | 🟡 HIGH |

### 🏠 ROOMS (User Interfaces)

| Service | Port | Status | Role | Priority |
|---------|------|--------|------|----------|
| **room-01-dashboard-cockpit** | 3011 | ACTIVE | Central Dashboard | 🔴 CRITICAL |
| **room-09-rocketchat-app** | 3009 | PLANNING | Chat Server | 🟡 HIGH |
| **room-09-chat-mcp-server** | - | PLANNING | AI Chat Bridge | 🟡 HIGH |

### 🔧 SOLVERS (Task Workers)

| Service | Port | Status | Role | Priority |
|---------|------|--------|------|----------|
| **solver-1.1-captcha-worker** | 8019 | PLANNING | Captcha Solving | 🟢 MEDIUM |
| **solver-2.1-survey-worker** | 8018 | PLANNING | Survey Automation | 🟢 MEDIUM |

### 🎨 BUILDERS (Content Generation)

| Service | Port | Status | Role | Priority |
|---------|------|--------|------|----------|
| **builder-1-website-generator** | 8020 | PLANNING | Website Builder | 🟢 MEDIUM |

---

## 🚀 SETUP & DEPLOYMENT GUIDE

### Prerequisites

```bash
# Required tools
- Docker 24.0+ (with compose v2)
- Docker Compose 2.20+
- 8GB+ available RAM
- 20GB+ available disk
```

### Quick Start (Single Service)

```bash
# Start agent-01-n8n-orchestrator
cd Docker/agents/agent-01-n8n
docker-compose up -d

# Verify
docker ps | grep agent-01-n8n

# Logs
docker-compose logs -f
```

### Full Stack Startup

```bash
# Navigate to Docker directory
cd /Users/jeremy/dev/Delqhi-Platform/Docker

# Create startup script (coming soon)
./startup.sh

# Or manual startup (priority order):
cd infrastructure/room-03-postgres && docker-compose up -d
cd ../../infrastructure/room-04-redis && docker-compose up -d
cd ../../agents/agent-01-n8n && docker-compose up -d
cd ../../agents/agent-03-agentzero && docker-compose up -d
cd ../../rooms/room-01-dashboard && docker-compose up -d
```

---

## 🔐 ENVIRONMENT VARIABLES & SECRETS

Each service directory has its own `.env` file:

```bash
Docker/
├── agents/
│   ├── agent-01-n8n/.env              # n8n API keys, webhooks
│   ├── agent-03-agentzero/.env        # OpenCode API credentials
│   └── ...
├── infrastructure/
│   ├── room-03-postgres/.env          # DB credentials, backups
│   ├── room-04-redis/.env             # Redis auth, persistence
│   └── ...
└── rooms/
    ├── room-01-dashboard/.env         # Dashboard secrets
    └── ...
```

**⚠️ SECURITY:** Never commit `.env` files to git. Use `.env.example` templates instead.

---

## 📈 NETWORKING & COMMUNICATION

### Internal Network

All services run on the default Docker bridge network:
- **Network Name:** `docker.internal` (automatic)
- **Communication:** Service name → hostname (DNS resolution)

Example (n8n → Postgres):
```
PostgreSQL accessible at: postgres://room-03-postgres-master:5432
Redis accessible at: redis://room-04-redis-cache:6379
n8n accessible at: http://agent-01-n8n-orchestrator:5678
```

### External Access (Published Ports)

Only critical user-facing services expose ports:
- 3011: Dashboard
- 5678: n8n Editor
- 3009: Chat Server
- 8090: NocoDB UI

---

## 📊 HEALTH CHECKS & MONITORING

### Service Health Status

```bash
# Check all services
cd Docker && docker-compose -f docker-compose.yml ps

# Check specific service
docker ps | grep agent-01-n8n
docker exec agent-01-n8n-orchestrator curl http://localhost:5678/api/health
```

### Logs & Debugging

```bash
# Real-time logs
cd Docker/agents/agent-01-n8n && docker-compose logs -f

# Historical logs
docker logs agent-01-n8n-orchestrator | tail -100

# Specific container
docker logs agent-01-n8n-orchestrator --since 1h
```

---

## 🔄 UPDATES & MAINTENANCE

### Service Update Procedure

```bash
# Pull latest image
cd Docker/agents/agent-01-n8n
docker-compose pull

# Rebuild
docker-compose build

# Restart
docker-compose down
docker-compose up -d

# Verify
docker-compose logs --tail=20
```

### Data Persistence

All stateful services use named volumes:

```bash
# List volumes
docker volume ls

# Backup database
docker run --rm -v postgres-data:/data -v $(pwd):/backup \
  busybox tar czf /backup/postgres-backup.tar.gz -C / data

# Restore database
docker run --rm -v postgres-data:/data -v $(pwd):/backup \
  busybox tar xzf /backup/postgres-backup.tar.gz -C /
```

---

## 🛠️ TROUBLESHOOTING

### Common Issues

| Issue | Solution |
|-------|----------|
| Port already in use | `lsof -i :PORT` → Kill conflicting process |
| Container won't start | `docker logs SERVICE_NAME` → Check error message |
| Network connectivity | `docker exec -it CONTAINER_NAME bash` → Test DNS |
| Memory issues | Increase Docker memory allocation (8GB minimum) |
| Disk space | `docker system prune` → Clean unused images/volumes |

### Debug Mode

```bash
# Start container in debug mode
docker run -it agent-01-n8n-orchestrator /bin/bash

# Test service connectivity
docker exec agent-01-n8n-orchestrator \
  curl -v http://room-03-postgres-master:5432

# Check environment
docker exec agent-01-n8n-orchestrator env | grep -E "DATABASE|API|SECRET"
```

---

## 📚 DOCUMENTATION STANDARDS

Each service directory MUST contain:

```
service-name/
├── docker-compose.yml              # Service definition
├── .env.example                    # Environment template
├── Dockerfile (if custom)          # Custom image definition
├── README.md                       # Service documentation
├── startup.sh (optional)           # Initialization script
└── healthcheck.sh (optional)       # Health check script
```

---

## 🔗 RELATED DOCUMENTATION

- **AGENTS.md** (V18.3): Container naming and mandate compliance
- **BLUEPRINT.md**: 22-pillar architecture framework
- **modules/deception-core/**: ML-based deception detection module
- **Docs/api-reference/**: Service API documentation

---

## 📅 ROADMAP

### Phase 1 (2026-01-28) - CURRENT
- [x] Create modular Docker directory structure
- [x] Document V18.3 architecture principles
- [x] Define service inventory and naming
- [ ] Create individual service docker-compose files
- [ ] Implement health checks

### Phase 2 (2026-01-30)
- [ ] Set up Postgres infrastructure
- [ ] Configure Redis caching layer
- [ ] Integrate n8n orchestrator
- [ ] Connect Agent Zero code generation

### Phase 3 (2026-02-01)
- [ ] Deploy dashboard (room-01)
- [ ] Set up chat server (room-09)
- [ ] Initialize solver workers (captcha, survey)
- [ ] Complete full stack testing

### Phase 4 (2026-02-15)
- [ ] Production hardening
- [ ] Security audit (MANDATE 0.18)
- [ ] Performance optimization
- [ ] CI/CD pipeline integration

---

**Document Version:** 1.0  
**Compliance:** MANDATE 0.0, 0.8, BLUEPRINT.md  
**Status:** ACTIVE - ARCHITECTURE DEFINED, IMPLEMENTATION IN PROGRESS  
**Last Updated:** 2026-01-28  
**Next Review:** 2026-01-30

---

*"No monoliths. No chaos. Pure modular sovereignty. Each service, a fortress. Together, an empire."*
