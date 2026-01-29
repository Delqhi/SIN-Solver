# 🐳 Delqhi-Platform Docker Infrastructure Deployment Guide

**Version:** 18.3 (Modular Edition)  
**Status:** PRODUCTION READY  
**Last Updated:** 2026-01-28  
**Compliance:** MANDATE 0.8, V18.3 Anti-Monolith

---

## 📋 QUICK START

### Minimum Requirements
```bash
- Docker 24.0+ with compose v2
- 8GB RAM available
- 20GB disk space
- macOS/Linux (Windows via WSL2)
```

### Deploy Full Stack (5 phases)
```bash
cd /Users/jeremy/dev/Delqhi-Platform/Docker
./startup.sh
```

This will:
1. **Phase 1:** Start infrastructure (Postgres, Redis)
2. **Phase 2:** Start agents (n8n, Agent Zero, Steel, Skyvern)
3. **Phase 3:** Start solvers (Captcha, Survey)
4. **Phase 4:** Start user interfaces (Dashboard)
5. **Phase 5:** Verify all health checks

**Estimated Time:** 2-3 minutes for full startup

---

## 📊 COMPLETE SERVICE INVENTORY

### 9 Services, 100% Documented

**PHASE 1: Infrastructure (🔴 CRITICAL)**
- `room-03-postgres-master` (5432) - Primary database
- `room-04-redis-cache` (6379) - System cache & sessions

**PHASE 2: Agents (🟡 HIGH)**
- `agent-01-n8n-orchestrator` (5678) - Workflow engine
- `agent-03-agentzero-coder` (8050) - AI code generation
- `agent-05-steel-browser` (3005) - Stealth browser automation
- `agent-06-skyvern-solver` (8030) - Visual task solving

**PHASE 3: Solvers (🟢 MEDIUM)**
- `solver-1.1-captcha-worker` (8019) - Captcha solving
- `solver-2.1-survey-worker` (8018) - Survey automation

**PHASE 4: Interfaces (🔴 CRITICAL)**
- `room-01-dashboard-cockpit` (3011) - Central dashboard

---

## 🚀 DEPLOYMENT MODES

### Mode 1: Full Stack (Recommended for Development)
```bash
./startup.sh
```
Starts all 9 services with health checks.

### Mode 2: Single Service (Testing)
```bash
cd agents/agent-01-n8n
docker-compose up -d

# Then verify
docker-compose logs -f
docker-compose ps
```

### Mode 3: Infrastructure Only (First-time Setup)
```bash
cd infrastructure/room-03-postgres && docker-compose up -d
cd ../room-04-redis && docker-compose up -d

# Verify
docker ps | grep room-
```

### Mode 4: Verify Compliance
```bash
./check-services.sh
```
Shows deployment status and compliance with V18.3 naming convention.

---

## 🔧 ENVIRONMENT CONFIGURATION

Each service has its own `.env` file:

```
Docker/
├── infrastructure/
│   ├── room-03-postgres/.env          # DB credentials
│   └── room-04-redis/.env             # Cache configuration
├── agents/
│   ├── agent-01-n8n/.env              # n8n API keys
│   ├── agent-03-agentzero/.env        # OpenCode credentials
│   ├── agent-05-steel/.env            # Browser settings
│   └── agent-06-skyvern/.env          # Vision model API
├── solvers/
│   ├── solver-1.1-captcha/.env        # Captcha solver config
│   └── solver-2.1-survey/.env         # Survey platform API keys
└── rooms/
    └── room-01-dashboard/.env         # Dashboard secrets
```

### Initial Setup (Copy Templates)
```bash
cd /Users/jeremy/dev/Delqhi-Platform/Docker

# Copy all .env.example files to .env
for dir in $(find . -name ".env.example" -type f); do
  cp "$dir" "${dir%.example}"
done

# Edit each .env file with real credentials
nano infrastructure/room-03-postgres/.env
nano agents/agent-03-agentzero/.env
# ... etc
```

### Required Credentials (Before Deployment)
| Service | Variable | Where to Get |
|---------|----------|--------------|
| agent-03-agentzero | OPENCODE_API_KEY | opencode.ai dashboard |
| agent-06-skyvern | VISION_API_KEY | OpenAI/Gemini/Groq |
| solver-2.1-survey | Survey Platform APIs | Create accounts on platforms |

---

## 📊 SERVICE DEPENDENCIES

```
room-01-dashboard-cockpit
  └─ room-03-postgres-master (DB)
  └─ room-04-redis-cache (Sessions)

agent-01-n8n-orchestrator
  └─ room-03-postgres-master (DB)
  └─ room-04-redis-cache (Sessions)

agent-03-agentzero-coder
  └─ room-03-postgres-master (DB)
  └─ room-04-redis-cache (Sessions)

agent-05-steel-browser
  └─ room-03-postgres-master (DB)
  └─ room-04-redis-cache (Sessions)

agent-06-skyvern-solver
  └─ room-03-postgres-master (DB)
  └─ room-04-redis-cache (Sessions)

solver-1.1-captcha-worker
  └─ room-03-postgres-master (DB)
  └─ room-04-redis-cache (Sessions)

solver-2.1-survey-worker
  └─ room-03-postgres-master (DB)
  └─ room-04-redis-cache (Sessions)
  └─ solver-1.1-captcha-worker (Captcha API)
```

**Startup Order (Enforced by health checks):**
1. PostgreSQL (foundation)
2. Redis (foundation)
3. All other services (parallel)

---

## 🌐 ACCESS POINTS (After Deployment)

```
Dashboard         http://localhost:3011
n8n Editor        http://localhost:5678
Agent Zero        http://localhost:8050
Steel Browser CDP http://localhost:3005
Skyvern           http://localhost:8030
Captcha Solver    http://localhost:8019
Survey Worker     http://localhost:8018
PostgreSQL        localhost:5432
Redis             localhost:6379
```

### Example Curl Checks
```bash
# Check dashboard
curl http://localhost:3011/api/health

# Check n8n
curl http://localhost:5678/api/health

# Check all services
docker ps | grep -E "room-|agent-|solver-"
```

---

## 🔍 MONITORING & DEBUGGING

### View Service Logs
```bash
# Real-time logs (all services)
cd Docker && docker-compose logs -f

# Specific service
docker logs agent-01-n8n-orchestrator -f

# Last 100 lines
docker logs agent-01-n8n-orchestrator --tail 100

# Since 1 hour ago
docker logs agent-01-n8n-orchestrator --since 1h
```

### Health Status
```bash
# All containers
docker ps

# Specific container details
docker inspect agent-01-n8n-orchestrator

# Service health check
docker exec room-03-postgres-master pg_isready -U sinuser
docker exec room-04-redis-cache redis-cli ping
```

### Network Debugging
```bash
# Test DNS resolution (inside container)
docker exec agent-01-n8n-orchestrator nslookup room-03-postgres-master

# Test connectivity (inside container)
docker exec agent-01-n8n-orchestrator curl -v http://room-03-postgres-master:5432
```

---

## 📈 UPDATES & MAINTENANCE

### Update Single Service
```bash
cd Docker/agents/agent-01-n8n
docker-compose pull              # Get latest image
docker-compose build             # Rebuild if needed
docker-compose down              # Stop service
docker-compose up -d             # Restart service
docker-compose logs -f           # Check logs
```

### Update All Services
```bash
cd Docker
for dir in */*/; do
  cd "$dir"
  docker-compose pull
  docker-compose build
  cd ../..
done
```

### Database Backup
```bash
# Backup Postgres
docker exec room-03-postgres-master pg_dump -U sinuser sin_solver > backup.sql

# Restore from backup
docker exec -i room-03-postgres-master psql -U sinuser sin_solver < backup.sql

# Backup Redis
docker exec room-04-redis-cache redis-cli --rdb /var/lib/redis/dump.rdb
```

---

## ⚠️ TROUBLESHOOTING

### Service Won't Start
```bash
# Check logs
docker logs <container-name>

# Common issues:
# - Port already in use: lsof -i :PORT
# - Out of memory: increase Docker memory
# - Missing environment variables: check .env file
```

### Connection Errors
```bash
# Test inter-service connectivity
docker exec agent-01-n8n-orchestrator curl -v http://room-03-postgres-master:5432

# Check network
docker network inspect bridge
```

### Reset Everything (Warning: Deletes all data!)
```bash
cd Docker
docker-compose down -v          # Stop all services, remove volumes
docker system prune -a          # Clean up images
# Restart: ./startup.sh
```

---

## 🛠️ MAINTENANCE TASKS

### Weekly
```bash
docker system prune              # Remove unused images/volumes
docker logs --prune              # Clean up old logs
```

### Monthly
```bash
docker exec room-03-postgres-master pg_dump -U sinuser sin_solver > monthly_backup.sql
# Upload backup to secure storage
```

### Quarterly
```bash
docker image prune --all         # Remove all dangling images
docker volume prune              # Remove unused volumes
# Test disaster recovery
```

---

## 🔐 SECURITY BEST PRACTICES

### Before Production Deployment

1. **Change All Passwords**
   ```bash
   # Edit all .env files and change:
   # - DB_PASSWORD
   # - REDIS_PASSWORD
   # - All API keys
   ```

2. **Enable Network Isolation**
   ```bash
   # Only expose essential ports
   # Close access to Postgres, Redis (internal only)
   ```

3. **Set Up Firewall Rules**
   ```bash
   # Only allow traffic from trusted sources
   # Restrict database access to app servers
   ```

4. **Enable SSL/TLS**
   ```bash
   # Use reverse proxy (nginx) for HTTPS
   # Configure certificates
   ```

5. **Enable Authentication**
   ```bash
   # All services should require API keys
   # Enable Redis password
   # Enable Postgres authentication
   ```

---

## 📚 FILE STRUCTURE

```
Docker/
├── README.md                          # Architecture documentation
├── MANIFEST.md                        # Service inventory
├── startup.sh                         # Full-stack startup script
├── check-services.sh                  # Compliance verification
│
├── infrastructure/
│   ├── room-03-postgres/
│   │   ├── docker-compose.yml         # Service definition
│   │   └── .env.example               # Configuration template
│   └── room-04-redis/
│       ├── docker-compose.yml
│       └── .env.example
│
├── agents/
│   ├── agent-01-n8n/
│   │   ├── docker-compose.yml
│   │   └── .env.example
│   ├── agent-03-agentzero/
│   │   ├── docker-compose.yml
│   │   └── .env.example
│   ├── agent-05-steel/
│   │   ├── docker-compose.yml
│   │   └── .env.example
│   └── agent-06-skyvern/
│       ├── docker-compose.yml
│       └── .env.example
│
├── solvers/
│   ├── solver-1.1-captcha/
│   │   ├── docker-compose.yml
│   │   └── .env.example
│   └── solver-2.1-survey/
│       ├── docker-compose.yml
│       └── .env.example
│
└── rooms/
    └── room-01-dashboard/
        ├── docker-compose.yml
        └── .env.example
```

---

## 🎯 NEXT STEPS

### Immediate (Today)
- [ ] Review this guide
- [ ] Run `./startup.sh`
- [ ] Verify all 9 services are healthy
- [ ] Test accessing http://localhost:3011 (Dashboard)

### Short-term (This week)
- [ ] Configure n8n workflows
- [ ] Set up API integrations
- [ ] Test inter-service communication
- [ ] Back up database

### Medium-term (This month)
- [ ] Deploy to staging environment
- [ ] Run security audit
- [ ] Set up monitoring/alerting
- [ ] Implement auto-backup

### Long-term (Q1 2026)
- [ ] Deploy to production
- [ ] Implement CI/CD pipeline
- [ ] Scale to multiple instances
- [ ] Multi-region deployment

---

## 📞 SUPPORT

### Documentation
- Docker: https://docs.docker.com/
- n8n: https://docs.n8n.io/
- PostgreSQL: https://www.postgresql.org/docs/
- Redis: https://redis.io/documentation/

### Troubleshooting Checklist
1. Run `./check-services.sh` to verify compliance
2. Check logs: `docker logs <service-name>`
3. Test connectivity: `docker exec <service> curl <other-service>`
4. Review .env files for missing credentials
5. Verify disk space: `docker system df`

---

**Document Version:** 1.0  
**Compliance:** MANDATE 0.8 (Anti-Monolith), BLUEPRINT.md, V18.3 Modular Architecture  
**Status:** PRODUCTION READY - FULL DEPLOYMENT SUPPORTED  
**Next Review:** 2026-02-01
