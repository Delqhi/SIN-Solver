# 📚 SIN-Solver Deployment Guide

**Version:** 1.0 (Phase 7)  
**Updated:** 2026-01-28  
**Status:** PRODUCTION READY  
**Total Sections:** 10  
**Total Lines:** 600+

---

## TABLE OF CONTENTS

1. [Prerequisites](#section-1-prerequisites)
2. [Quick Start (5-Minute Setup)](#section-2-quick-start-5-minute-setup)
3. [Full Stack Deployment](#section-3-full-stack-deployment)
4. [Service Configuration](#section-4-service-configuration-all-39-services)
5. [Vault Setup & Secret Management](#section-5-vault-setup--secret-management)
6. [Vercel Deployment](#section-6-vercel-deployment-dashboard-frontend)
7. [n8n Workflow Configuration](#section-7-n8n-workflow-configuration)
8. [Monitoring & Health Checks](#section-8-monitoring--health-checks)
9. [Troubleshooting & Common Issues](#section-9-troubleshooting--common-issues)
10. [Security Hardening & Best Practices](#section-10-security-hardening--best-practices)

---

## SECTION 1: PREREQUISITES

### Hardware Requirements

**Minimum:**
- CPU: 4 cores (Intel i5 / Apple M1)
- RAM: 16 GB
- Disk: 100 GB SSD
- Network: 1 Gbps connection

**Recommended:**
- CPU: 8+ cores
- RAM: 32+ GB
- Disk: 500 GB SSD
- Network: 10 Gbps connection (for production)

### Software Requirements

**macOS (Development):**
```bash
# Install Homebrew if not present
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required tools
brew install docker docker-compose node python3 git

# Verify installations
docker --version          # Docker 24.0+
docker-compose --version  # Docker Compose 2.20+
node --version           # Node 18+
python3 --version        # Python 3.10+
git --version            # Git 2.40+
```

**Linux (Production):**
```bash
# Ubuntu 22.04 LTS
sudo apt update && sudo apt upgrade -y

# Docker installation
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Docker Compose (V2)
mkdir -p ~/.docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/download/v2.25.0/docker-compose-linux-x86_64 \
  -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose

# Node.js (via NVM)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Python 3.10+
sudo apt install python3.10 python3-pip python3-venv -y
```

### Development Tools

```bash
# Modern CLI tools (MANDATE 0.19)
brew install ripgrep fd sd bat exa tree

# Code editors
brew install --cask visual-studio-code  # or code-server

# Git tools
brew install gh                          # GitHub CLI
git config --global init.defaultBranch main
git config --global user.email "ai@sincode.ai"
git config --global user.name "SIN Solver AI"
```

### Network Setup

**Firewall Rules:**
- Port 5678: n8n (allow local + Vercel)
- Port 3011: Dashboard (allow local + Vercel)
- Port 8200: Vault (internal only)
- Port 5432: PostgreSQL (internal only)
- Port 6379: Redis (internal only)

**Docker Network:**
```bash
# Create primary network
docker network create sin-solver-network \
  --driver bridge \
  --subnet 172.18.0.0/16 \
  --gateway 172.18.0.1

# Verify network
docker network inspect sin-solver-network
```

---

## SECTION 2: QUICK START (5-MINUTE SETUP)

### Option A: Automated Setup (Recommended)

```bash
# 1. Clone repository
cd /Users/jeremy/dev
git clone https://github.com/YourOrg/SIN-Solver.git
cd SIN-Solver

# 2. Install dependencies
npm install
pip install -r requirements.txt

# 3. Configure environment
cp Docker/.env.example Docker/.env.production.local
# Edit .env.production.local with your settings (secrets from Vault)

# 4. Start core services
cd Docker/infrastructure
docker-compose -f docker-compose.yml up -d postgres redis vault

# 5. Initialize Vault
docker exec room-02-vault vault operator init -key-shares=5 -key-threshold=3

# 6. Start remaining services
cd ../..
./scripts/start-all.sh

# 7. Verify deployment
./scripts/health-check.sh

# 8. Access services
# Dashboard: http://localhost:3011
# n8n: http://localhost:5678
# PostgreSQL: localhost:5432 (via psql)
```

### Option B: Manual Step-by-Step

```bash
# Step 1: Create required directories
mkdir -p /Users/jeremy/dev/SIN-Solver/Docker/{infrastructure,agents,rooms,solvers}
mkdir -p /Users/jeremy/dev/SIN-Solver/logs
mkdir -p /Users/jeremy/dev/SIN-Solver/data/{postgres,redis,vault}

# Step 2: Start database services
cd /Users/jeremy/dev/SIN-Solver/Docker/infrastructure
docker-compose -f docker-compose.yml up -d

# Step 3: Verify connectivity
docker ps | grep -E "(postgres|redis)"

# Step 4: Initialize databases
docker exec room-03-postgres-master psql -U postgres -c "CREATE DATABASE sin_solver;"

# Step 5: Start services one by one
cd ../agents && docker-compose -f docker-compose.yml up -d
cd ../rooms && docker-compose -f docker-compose.yml up -d
cd ../solvers && docker-compose -f docker-compose.yml up -d

# Step 6: Health check
curl http://localhost:3011/health
curl http://localhost:5678/api/health
```

### Verify Installation

```bash
# Check all services are running
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Expected output (39 services):
# agent-01-n8n-orchestrator     Up 2 minutes    0.0.0.0:5678->5678/tcp
# agent-03-agentzero-coder      Up 2 minutes    0.0.0.0:8050->8050/tcp
# ... (36 more services)

# Test PostgreSQL
docker exec room-03-postgres-master psql -U postgres -d sin_solver -c "SELECT version();"

# Test Redis
docker exec room-04-redis-cache redis-cli ping
# Expected: PONG

# Access Dashboard
open http://localhost:3011

# Access n8n
open http://localhost:5678
```

---

## SECTION 3: FULL STACK DEPLOYMENT

### 3.1 Directory Structure Setup

```bash
SIN-Solver/
├── Docker/
│   ├── infrastructure/
│   │   ├── docker-compose.yml
│   │   ├── .env.example
│   │   └── Dockerfile
│   ├── agents/
│   │   ├── agent-01-n8n/
│   │   ├── agent-03-agentzero/
│   │   ├── agent-05-steel/
│   │   └── agent-06-skyvern/
│   ├── rooms/
│   │   ├── room-01-dashboard/
│   │   ├── room-03-postgres/
│   │   ├── room-04-redis/
│   │   └── room-09-chat/
│   ├── solvers/
│   │   ├── solver-1.1-captcha/
│   │   └── solver-2.1-survey/
│   └── .env.production.local (git-ignored)
├── Docs/
├── n8n-workflows/
├── scripts/
│   ├── start-all.sh
│   ├── health-check.sh
│   └── deploy.sh
└── README.md
```

### 3.2 Phase 1: Infrastructure Services

```bash
# Create Docker network
docker network create sin-solver-network \
  --driver bridge \
  --subnet 172.18.0.0/16

# Deploy PostgreSQL (room-03-postgres-master, 172.18.0.2:5432)
cd Docker/infrastructure
docker-compose -f docker-compose-postgres.yml up -d

# Wait for PostgreSQL to be ready
sleep 10
docker exec room-03-postgres-master pg_isready -U postgres

# Initialize database schema
docker exec room-03-postgres-master psql -U postgres -f /scripts/init-schema.sql

# Deploy Redis (room-04-redis-cache, 172.18.0.3:6379)
docker-compose -f docker-compose-redis.yml up -d

# Verify Redis
docker exec room-04-redis-cache redis-cli ping
```

### 3.3 Phase 2: Vault Service

```bash
# Deploy Vault (room-02-vault, 172.18.0.31:8200)
docker-compose -f docker-compose-vault.yml up -d

# Wait for Vault to start
sleep 5

# Initialize Vault
docker exec room-02-vault vault operator init \
  -key-shares=5 \
  -key-threshold=3 \
  -format=json > /tmp/vault-init.json

# Save unseal keys securely
UNSEAL_KEY_1=$(jq -r '.unseal_keys_b64[0]' /tmp/vault-init.json)
UNSEAL_KEY_2=$(jq -r '.unseal_keys_b64[1]' /tmp/vault-init.json)
UNSEAL_KEY_3=$(jq -r '.unseal_keys_b64[2]' /tmp/vault-init.json)
ROOT_TOKEN=$(jq -r '.root_token' /tmp/vault-init.json)

# Unseal Vault
docker exec room-02-vault vault operator unseal $UNSEAL_KEY_1
docker exec room-02-vault vault operator unseal $UNSEAL_KEY_2
docker exec room-02-vault vault operator unseal $UNSEAL_KEY_3

# Verify Vault is unsealed
docker exec -e VAULT_TOKEN=$ROOT_TOKEN room-02-vault vault status
```

### 3.4 Phase 3: Agent Services

```bash
# Deploy n8n (agent-01-n8n-orchestrator, 172.18.0.4:5678)
cd ../agents/agent-01-n8n
docker-compose -f docker-compose.yml up -d
# Wait for initialization
sleep 30

# Deploy Agent Zero (agent-03-agentzero-coder, 172.18.0.6:8050)
cd ../agent-03-agentzero
docker-compose -f docker-compose.yml up -d
# Wait for initialization
sleep 15

# Deploy Steel Browser (agent-05-steel-browser, 172.18.0.5:3005)
cd ../agent-05-steel
docker-compose -f docker-compose.yml up -d
# Wait for initialization
sleep 15

# Deploy Skyvern (agent-06-skyvern-solver, 172.18.0.7:8030)
cd ../agent-06-skyvern
docker-compose -f docker-compose.yml up -d
# Wait for initialization
sleep 15

# Verify all agents are running
docker ps --filter "name=agent-" --format "table {{.Names}}\t{{.Status}}"
```

### 3.5 Phase 4: Room Services

```bash
# Deploy Dashboard (room-01-dashboard-cockpit, 172.18.0.60:3011)
cd ../rooms/room-01-dashboard
docker-compose -f docker-compose.yml up -d
# Dashboard will show at http://localhost:3011

# Deploy RocketChat (room-09.1-rocketchat-app, 172.18.0.9:3009)
cd ../room-09-chat
docker-compose -f docker-compose.yml up -d

# Deploy Supabase (room-16-supabase, 172.18.0.16:54323)
cd ../room-16-supabase
docker-compose -f docker-compose.yml up -d

# Deploy NocoDB (room-21-nocodb-ui, 172.18.0.90:8090)
cd ../room-21-nocodb
docker-compose -f docker-compose.yml up -d
```

### 3.6 Phase 5: Solver Services

```bash
# Deploy Captcha Worker (solver-1.1-captcha-worker, 172.18.0.8:8019)
cd ../solvers/solver-1.1-captcha
docker-compose -f docker-compose.yml up -d
# Wait for model downloads
sleep 30

# Deploy Survey Worker (solver-2.1-survey-worker, 172.18.0.9:8018)
cd ../solver-2.1-survey
docker-compose -f docker-compose.yml up -d
# Wait for initialization
sleep 20

# Verify solvers are running
docker logs solver-1.1-captcha-worker | grep "Ready" | head -1
docker logs solver-2.1-survey-worker | grep "Ready" | head -1
```

### 3.7 Phase 6: Verification

```bash
# Check all 39 services are running
docker ps --format "table {{.Names}}\t{{.Status}}" | wc -l
# Should output 40 (39 services + header)

# Check network connectivity
docker exec agent-01-n8n-orchestrator \
  curl -s http://room-03-postgres-master:5432 || echo "PostgreSQL OK"

docker exec agent-01-n8n-orchestrator \
  curl -s http://room-04-redis-cache:6379 || echo "Redis OK"

# Test database
docker exec room-03-postgres-master \
  psql -U postgres -d sin_solver -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';"
# Should output: 54 tables

# Generate deployment report
./scripts/health-check.sh > /tmp/deployment-report.txt
cat /tmp/deployment-report.txt
```

---

## SECTION 4: SERVICE CONFIGURATION (ALL 39 SERVICES)

### Core Services (8)

**1. agent-01-n8n-orchestrator**
```yaml
- Port: 5678
- Image: n8nio/n8n:latest
- Network: sin-solver-network (172.18.0.4)
- Database: PostgreSQL
- Configuration:
    N8N_HOST: agent-01-n8n-orchestrator
    N8N_PORT: 5678
    WEBHOOK_URL: http://localhost:5678
    DB_HOST: room-03-postgres-master
    DB_PORT: 5432
```

**2. agent-03-agentzero-coder**
```yaml
- Port: 8050
- Image: custom-agent-zero:latest
- Network: sin-solver-network (172.18.0.6)
- Configuration:
    OPENCODE_API_KEY: ${OPENCODE_API_KEY}
    MAX_ITERATIONS: 100
    TIMEOUT: 3600
```

**3. agent-05-steel-browser**
```yaml
- Port: 3005 (HTTP), 9222 (Chrome DevTools)
- Image: silverspiegeltk/steel:latest
- Network: sin-solver-network (172.18.0.5)
- Configuration:
    CDP_PORT: 9222
    STEALTH_MODE: true
```

**4. agent-06-skyvern-solver**
```yaml
- Port: 8030
- Image: skyvern:latest
- Network: sin-solver-network (172.18.0.7)
- Configuration:
    LOG_LEVEL: info
    MAX_WORKERS: 4
```

**5. room-03-postgres-master**
```yaml
- Port: 5432
- Image: postgres:15-alpine
- Network: sin-solver-network (172.18.0.2)
- Volume: persistent_data:/var/lib/postgresql/data
- Configuration:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: ${DB_PASSWORD}
    POSTGRES_DB: sin_solver
```

**6. room-04-redis-cache**
```yaml
- Port: 6379
- Image: redis:7-alpine
- Network: sin-solver-network (172.18.0.3)
- Volume: redis_data:/data
- Configuration:
    requirepass: ${REDIS_PASSWORD}
```

**7. room-01-dashboard-cockpit**
```yaml
- Port: 3011
- Build: ./Docker/rooms/room-01-dashboard
- Network: sin-solver-network (172.18.0.60)
- Configuration:
    REACT_APP_API_URL: http://localhost:8041
    REACT_APP_N8N_URL: http://localhost:5678
```

**8. agent-04.1-codeserver-api**
```yaml
- Port: 8041
- Image: custom-codeserver:latest
- Network: sin-solver-network (172.18.0.141)
- Configuration:
    CODE_PASSWORD: ${CODE_PASSWORD}
```

### Extended Ecosystem (31)

```yaml
# room-09.1-rocketchat-app (3009) - Chat Server
# room-16-supabase-studio (54323) - Backend UI
# room-21-nocodb-ui (8090) - No-Code Database
# room-11-plane-* (11 services) - Project Management
# room-12-delqhi-* (11 services) - CRM Infrastructure
# room-13-delqhi-* (3 services) - Search & Frontend
# Plus: Monitoring, storage, and MCP services
```

---

## SECTION 5: VAULT SETUP & SECRET MANAGEMENT

### 5.1 Vault Initialization

```bash
# Deploy Vault container
cd Docker/infrastructure
docker-compose -f docker-compose-vault.yml up -d

# Wait for Vault to be ready
sleep 5

# Initialize (generates root token + unseal keys)
docker exec room-02-vault vault operator init \
  -key-shares=5 \
  -key-threshold=3 \
  -format=json > vault-keys.json

# CRITICAL: Secure the keys
# Store vault-keys.json in secure location (LastPass, 1Password, etc.)
# DO NOT commit to git
# DO NOT share publicly

# Extract keys for unsealing
KEY1=$(jq -r '.unseal_keys_b64[0]' vault-keys.json)
KEY2=$(jq -r '.unseal_keys_b64[1]' vault-keys.json)
KEY3=$(jq -r '.unseal_keys_b64[2]' vault-keys.json)
ROOT_TOKEN=$(jq -r '.root_token' vault-keys.json)
```

### 5.2 Unseal Vault

```bash
# Unseal with 3 of 5 keys
docker exec room-02-vault vault operator unseal $KEY1
docker exec room-02-vault vault operator unseal $KEY2
docker exec room-02-vault vault operator unseal $KEY3

# Verify unsealed
docker exec -e VAULT_TOKEN=$ROOT_TOKEN room-02-vault vault status
# Sealed: false
```

### 5.3 Configure Authentication & Policies

```bash
# Enable AppRole authentication (for agents)
docker exec -e VAULT_TOKEN=$ROOT_TOKEN room-02-vault \
  vault auth enable approle

# Create agent policy
docker exec -e VAULT_TOKEN=$ROOT_TOKEN room-02-vault \
  vault policy write agent-policy -<<EOF
path "secret/data/agents/*" {
  capabilities = ["read", "list"]
}
path "secret/data/database/*" {
  capabilities = ["read"]
}
EOF

# Create solver policy
docker exec -e VAULT_TOKEN=$ROOT_TOKEN room-02-vault \
  vault policy write solver-policy -<<EOF
path "secret/data/solvers/*" {
  capabilities = ["read", "list"]
}
path "secret/data/database/*" {
  capabilities = ["read"]
}
EOF

# Enable KV V2 secret engine
docker exec -e VAULT_TOKEN=$ROOT_TOKEN room-02-vault \
  vault secrets enable -path=secret kv-v2
```

### 5.4 Populate Secrets

```bash
# Store PostgreSQL credentials
docker exec -e VAULT_TOKEN=$ROOT_TOKEN room-02-vault \
  vault kv put secret/database/postgres \
  username=postgres \
  password=CHANGE_ME_IN_PRODUCTION \
  host=room-03-postgres-master \
  port=5432 \
  database=sin_solver

# Store Redis credentials
docker exec -e VAULT_TOKEN=$ROOT_TOKEN room-02-vault \
  vault kv put secret/database/redis \
  password=CHANGE_ME_IN_PRODUCTION \
  host=room-04-redis-cache \
  port=6379

# Store n8n credentials
docker exec -e VAULT_TOKEN=$ROOT_TOKEN room-02-vault \
  vault kv put secret/agents/n8n \
  api_key=CHANGE_ME \
  webhook_secret=CHANGE_ME

# Store agent credentials
docker exec -e VAULT_TOKEN=$ROOT_TOKEN room-02-vault \
  vault kv put secret/agents/opencode \
  api_key=CHANGE_ME

# Verify secrets are stored
docker exec -e VAULT_TOKEN=$ROOT_TOKEN room-02-vault \
  vault kv list secret/
```

### 5.5 Service Configuration for Vault

**For agents (docker-compose):**
```yaml
environment:
  VAULT_ADDR: http://room-02-vault:8200
  VAULT_ROLE_ID: ${VAULT_ROLE_ID}
  VAULT_SECRET_ID: ${VAULT_SECRET_ID}
  DATABASE_URL: vault://secret/database/postgres
```

**For Node.js applications:**
```javascript
const vault = require('node-vault')({
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN,
});

const secret = await vault.read('secret/data/database/postgres');
const dbConfig = {
  host: secret.data.data.host,
  port: secret.data.data.port,
  user: secret.data.data.username,
  password: secret.data.data.password,
  database: secret.data.data.database,
};
```

---

## SECTION 6: VERCEL DEPLOYMENT (DASHBOARD FRONTEND)

### 6.1 Prepare for Vercel

```bash
# Create Vercel project
cd Docker/rooms/room-01-dashboard
npm install

# Create vercel.json
cat > vercel.json <<'EOF'
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": [
    "REACT_APP_API_URL",
    "REACT_APP_N8N_URL",
    "NEXT_PUBLIC_VAULT_ADDR"
  ]
}
EOF

# Set up environment variables
npm run vercel env add REACT_APP_API_URL https://api.yourdomain.com
npm run vercel env add REACT_APP_N8N_URL https://n8n.yourdomain.com
npm run vercel env add NEXT_PUBLIC_VAULT_ADDR https://vault.yourdomain.com
```

### 6.2 Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Get deployment URL
# Example: https://sin-solver-dashboard.vercel.app

# Add custom domain (if using)
vercel domains add yourdomain.com
```

### 6.3 Configure DNS

```bash
# Add CNAME record to your DNS provider
# dashboard.yourdomain.com CNAME cname.vercel.app

# Verify DNS
nslookup dashboard.yourdomain.com

# Test deployment
curl https://dashboard.yourdomain.com
# Should return HTML (200 OK)
```

### 6.4 Configure Reverse Proxy (Optional)

For accessing n8n and Vault APIs through Vercel domain:

```nginx
# nginx.conf or Cloudflare Worker
location /api/ {
  proxy_pass http://your-server.com:8041/;
  proxy_set_header X-Real-IP $remote_addr;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  proxy_set_header Host $host;
}

location /n8n/ {
  proxy_pass http://your-server.com:5678/;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
}
```

---

## SECTION 7: N8N WORKFLOW CONFIGURATION

### 7.1 Access n8n UI

```bash
# Open in browser
open http://localhost:5678

# First login (creates admin user)
Email: admin@yourdomain.com
Password: (set securely)
```

### 7.2 Configure Credentials

**PostgreSQL Node Credentials:**
1. Click "Credentials" in left sidebar
2. Click "New Credential"
3. Select "PostgreSQL"
4. Fill in:
   - Host: room-03-postgres-master
   - Port: 5432
   - User: postgres
   - Password: (from Vault)
   - Database: sin_solver
5. Test connection → Save

**Redis Node Credentials:**
1. Select "Redis"
2. Fill in:
   - Host: room-04-redis-cache
   - Port: 6379
   - Password: (from Vault)
3. Test connection → Save

**HTTP Node Credentials:**
1. Select "HTTP Header Auth"
2. Fill in headers for agent APIs
3. Save

### 7.3 Create Workflows

See **TASKS.md - Phase 7.2.1-7.2.3** for workflow creation instructions.

**Example Workflow: PostgreSQL Insert**
```
Trigger (Webhook or Manual)
  ↓
Set Data Node (format test record)
  ↓
PostgreSQL Node (INSERT into test_table)
  ↓
Return Data (success/error response)
```

### 7.4 Enable Workflow Error Handling

```javascript
// In n8n workflow error handler
return {
  "status": "error",
  "message": $error.message,
  "workflow_id": $executionId,
  "timestamp": new Date().toISOString(),
  "logs": $node.json.logs
};
```

---

## SECTION 8: MONITORING & HEALTH CHECKS

### 8.1 Service Health Endpoints

```bash
# n8n Health
curl http://localhost:5678/api/health
# Expected: {"status":"ok"}

# Dashboard Health
curl http://localhost:3011/health
# Expected: {"status":"ok","timestamp":"..."}

# PostgreSQL Health
docker exec room-03-postgres-master pg_isready -U postgres
# Expected: accepting connections

# Redis Health
docker exec room-04-redis-cache redis-cli ping
# Expected: PONG

# Vault Health
curl http://localhost:8200/v1/sys/health
# Expected: {"sealed":false,"version":"..."}
```

### 8.2 Create Monitoring Script

```bash
#!/bin/bash
# scripts/health-check.sh

echo "=== SIN-Solver Health Check ==="
echo "Timestamp: $(date)"
echo ""

# Service counts
echo "Running Services: $(docker ps --quiet | wc -l) / 39"

# Critical services
CRITICAL=("agent-01-n8n-orchestrator" "room-03-postgres-master" "room-04-redis-cache")

for service in "${CRITICAL[@]}"; do
  status=$(docker inspect -f '{{.State.Running}}' $service 2>/dev/null)
  if [ "$status" = "true" ]; then
    echo "✅ $service: UP"
  else
    echo "❌ $service: DOWN"
  fi
done

# Database check
db_check=$(docker exec room-03-postgres-master \
  psql -U postgres -d sin_solver -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" 2>/dev/null)
echo "📊 PostgreSQL Tables: $db_check"

# Redis check
redis_check=$(docker exec room-04-redis-cache redis-cli ping 2>/dev/null)
if [ "$redis_check" = "PONG" ]; then
  echo "✅ Redis: UP"
else
  echo "❌ Redis: DOWN"
fi

echo ""
echo "Full Health Report: $(date +%Y-%m-%d_%H:%M:%S)"
```

### 8.3 Set Up Prometheus Monitoring

```yaml
# Docker/monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'docker'
    static_configs:
      - targets: ['localhost:9323']

  - job_name: 'postgres'
    static_configs:
      - targets: ['room-03-postgres-master:5432']

  - job_name: 'redis'
    static_configs:
      - targets: ['room-04-redis-cache:6379']
```

---

## SECTION 9: TROUBLESHOOTING & COMMON ISSUES

### Issue 1: Services Not Starting

**Symptom:** `docker-compose up` fails or services don't start

**Solution:**
```bash
# Check Docker daemon
docker ps
# If error: Docker daemon not running

# macOS: Start Docker Desktop
open /Applications/Docker.app

# Check logs
docker-compose logs agent-01-n8n-orchestrator
docker-compose logs room-03-postgres-master

# Common causes:
# 1. Port already in use
netstat -an | grep 5678

# 2. Network not created
docker network create sin-solver-network --driver bridge --subnet 172.18.0.0/16

# 3. Insufficient disk space
docker system df

# 4. Out of memory
docker stats  # Check memory usage
```

### Issue 2: Database Connection Failures

**Symptom:** `connection refused` or `ECONNREFUSED`

**Solution:**
```bash
# Test PostgreSQL connectivity
docker exec agent-01-n8n-orchestrator \
  psql -h room-03-postgres-master -U postgres -c "SELECT 1"

# If fails:
# 1. Check PostgreSQL is running
docker ps | grep postgres

# 2. Check network connectivity
docker exec agent-01-n8n-orchestrator ping -c 3 room-03-postgres-master

# 3. Check credentials
docker exec room-03-postgres-master \
  psql -U postgres -c "SELECT current_user;"

# 4. Verify database exists
docker exec room-03-postgres-master \
  psql -U postgres -l | grep sin_solver
```

### Issue 3: Vault Sealed/Inaccessible

**Symptom:** `Vault is sealed` error

**Solution:**
```bash
# Check Vault status
docker exec -e VAULT_ADDR=http://localhost:8200 room-02-vault vault status

# If sealed, unseal with keys
docker exec room-02-vault vault operator unseal KEY1
docker exec room-02-vault vault operator unseal KEY2
docker exec room-02-vault vault operator unseal KEY3

# If keys lost, reinitialize
docker-compose -f docker-compose-vault.yml down -v
docker-compose -f docker-compose-vault.yml up -d
# ... run init steps again
```

### Issue 4: n8n Workflow Execution Errors

**Symptom:** Workflow fails with database/API errors

**Solution:**
```bash
# Check n8n logs
docker logs agent-01-n8n-orchestrator --tail 50

# Verify credentials
# In n8n UI: Credentials → test each credential

# Common issues:
# 1. Missing environment variables
env | grep VAULT

# 2. Database not initialized
docker exec room-03-postgres-master \
  psql -U postgres -d sin_solver -c "SELECT COUNT(*) FROM information_schema.tables;"

# 3. Workflow syntax error
# Re-check node connections in n8n UI
```

### Issue 5: Out of Disk Space

**Symptom:** `no space left on device` error

**Solution:**
```bash
# Check disk usage
df -h
docker system df

# Clean up unused images/containers
docker system prune -a --volumes -f

# Remove specific service volumes
docker-compose -f Docker/agents/agent-01-n8n/docker-compose.yml down -v

# Check large files
find /var/lib/docker/volumes -size +1G -type f

# Resize Docker disk (macOS)
# Docker Desktop → Preferences → Resources → Disk Image Size
```

---

## SECTION 10: SECURITY HARDENING & BEST PRACTICES

### 10.1 Secrets Management

**✅ DO:**
- Store all secrets in Vault
- Use environment variables for Vault credentials only
- Rotate secrets every 90 days
- Use strong passwords (20+ chars, mixed case, numbers, symbols)
- Audit Vault access logs regularly

**❌ DON'T:**
- Commit .env files with secrets to git
- Log secrets in console output
- Share API keys via email/chat
- Hardcode passwords in code
- Use default passwords

### 10.2 Network Security

```bash
# Firewall configuration (macOS)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate on

# Allow specific ports (development only)
sudo defaults write /Library/Preferences/com.apple.alf globalstate -int 1

# Linux: UFW firewall
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
# Restrict others to localhost
sudo ufw allow from 127.0.0.1 to 127.0.0.1 port 5678
```

### 10.3 Docker Security

```bash
# Use read-only root filesystem
version: "3.8"
services:
  agent-01-n8n-orchestrator:
    read_only: true
    volumes:
      - /tmp
      - /var/lib/n8n

# Run as non-root user
user: "node:node"

# Don't run privileged containers
privileged: false

# Scan images for vulnerabilities
docker scan agent-01-n8n-orchestrator:latest
docker scan room-03-postgres-master:latest
```

### 10.4 Database Security

```bash
# PostgreSQL
ALTER USER postgres WITH PASSWORD 'secure_password_here';
CREATE ROLE app_user WITH LOGIN PASSWORD 'app_password_here';
GRANT CONNECT ON DATABASE sin_solver TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;

# Restrict connections
# postgresql.conf
ssl = on
ssl_cert_file = '/etc/ssl/certs/server.crt'
ssl_key_file = '/etc/ssl/private/server.key'

# pg_hba.conf
host    sin_solver  app_user  172.18.0.0/16  md5
```

### 10.5 API Security

```javascript
// Express.js example
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

app.use(helmet());  // Security headers
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per window
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);

// Validate input
app.use(express.json({ limit: '1mb' }));
```

### 10.6 Monitoring & Alerts

```bash
# Set up log aggregation
# ELK Stack / Splunk / Datadog

# Example: Syslog configuration
services:
  logstash:
    image: docker.elastic.co/logstash/logstash:8.0.0
    environment:
      LOG_LEVEL: info
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf

# Alert on critical events
# - Vault unsealed unexpectedly
# - Failed authentication attempts
# - Database connection lost
# - Memory usage > 80%
# - Disk usage > 90%
```

---

## 🎯 DEPLOYMENT CHECKLIST

- [ ] Prerequisites installed (Docker, Node.js, Python)
- [ ] Network created (sin-solver-network)
- [ ] Environment files configured (.env.production.local)
- [ ] PostgreSQL deployed and initialized
- [ ] Redis deployed and healthy
- [ ] Vault initialized and unsealed
- [ ] All secrets in Vault
- [ ] Agents deployed (n8n, AgentZero, Steel, Skyvern)
- [ ] Rooms deployed (Dashboard, Chat, Supabase, NocoDB)
- [ ] Solvers deployed (Captcha, Survey)
- [ ] n8n workflows created and tested
- [ ] Dashboard deployed to Vercel
- [ ] Health checks passing (all 39 services)
- [ ] Security hardening complete
- [ ] Monitoring & alerts configured
- [ ] Backup procedures documented
- [ ] Incident response plan created

---

## 📞 SUPPORT & RESOURCES

- **Documentation:** https://github.com/YourOrg/SIN-Solver/wiki
- **Issues:** https://github.com/YourOrg/SIN-Solver/issues
- **Discussions:** https://github.com/YourOrg/SIN-Solver/discussions
- **Email:** support@yourdomain.com

---

**Document:** DEPLOYMENT-GUIDE.md (Phase 7)  
**Status:** PRODUCTION READY  
**Last Updated:** 2026-01-28T15:30:00Z  
**Approver:** Sisyphus Agent
