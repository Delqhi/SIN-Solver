# Docker Infrastructure & Zimmer Mapping - V17.10

## 🏛️ NETZWERK TOPOLOGIE

**Network Name:** `haus-netzwerk`  
**Subnet:** `172.20.0.0/16`  
**Gateway:** `172.20.0.1`

---

## 🏘️ VOLLSTÄNDIGE ZIMMER TOPOLOGY (20+ Services)

### Infrastruktur Services

| Zimmer | Container Name | IP | Port(s) | Rolle |
|--------|----------------|-----|---------|-------|
| **Infra** | `Zimmer-Speicher-Redis` | 172.20.0.10 | 6379 | In-Memory Cache & PubSub |
| **Infra** | `Zimmer-Archiv-Postgres` | 172.20.0.10 | 5432 | Primary Database |

### Core Services

| Zimmer | Container Name | IP | Port(s) | Rolle |
|--------|----------------|-----|---------|-------|
| **01** | `Zimmer-01-n8n-Manager` | 172.20.0.10 | 5678 | Workflow Orchestrator |
| **02** | `Zimmer-02-Chronos-Stratege` | 172.20.0.2 | 3001 | Scheduling & Timing |
| **03** | `Zimmer-03-Agent-Zero` | 172.20.0.50 | 8000 | Logic Core (Code Gen) |
| **04** | `Zimmer-04-OpenCode-Sekretaer` | 172.20.0.4 | 9000 | MCP Secretary |
| **05** | `Zimmer-05-Steel-Tarnkappe` | 172.20.0.20 | 3000, 9222 | Stealth Browser Engine |
| **06** | `Zimmer-06-Skyvern-Auge` | 172.20.0.30 | 8000 | Computer Vision (YOLOv8x) |
| **07** | `Zimmer-07-Stagehand-Detektiv` | 172.20.0.7 | 3000 | Browser Automation |
| **08** | `Zimmer-08-QA-Pruefer` | 172.20.0.8 | 8080 | Quality Assurance |
| **09** | `Zimmer-09-ClawdBot-Bote` | 172.20.0.9 | 8004→8080 | Multi-Messenger |
| **10** | `Zimmer-10-Postgres-Bibliothek` | 172.20.0.10 | 5432 | Database (Legacy Alias) |
| **11** | `Zimmer-11-Dashboard-Zentrale` | 172.20.0.60 | 3100→80 | React Web UI |
| **12** | `Zimmer-12-Evolution-Optimizer` | 172.20.0.12 | 8007→8080 | ML Optimization |
| **13** | `Zimmer-13-API-Koordinator` | 172.20.0.31 | 8000 | FastAPI Gateway |
| **14** | `Zimmer-14-Worker-Arbeiter-N` | 172.20.0.14 | 8080 | Task Workers (Scalable) |
| **15** | `Zimmer-15-Surfsense-Archiv` | 172.20.0.15 | 6333 | Vector DB (Qdrant) |
| **16** | `Zimmer-16-Supabase` | 172.20.0.16 | 5432 | Supabase Instance |
| **17** | `Zimmer-17-SIN-Plugins` | 172.20.0.40 | 8006→8000 | MCP Plugin Server |
| **18** | `Zimmer-18-Survey-Worker` | 172.20.0.80 | 8018 | Survey Automation |
| **19** | `Zimmer-19-Captcha-Worker` | 172.20.0.81 | 8019 | FREE Captcha Solving |
| **20.3** | `Zimmer-20-3-SIN-Social-MCP` | 172.20.0.203 | 8203 | Video Analysis & Posting |
| **20.4** | `Zimmer-20-4-SIN-Deep-Research-MCP` | 172.20.0.204 | 8204 | Ultimate Research Engine |

---

## 🚀 START COMMANDS

### Gesamtes System
```bash
cd /Users/jeremy/dev/SIN-Solver
docker-compose up -d
```

### Einzelne Container (Best Practice 2026)
```bash
# Infrastruktur
docker-compose up -d zimmer-speicher-redis zimmer-archiv-postgres

# Core API
docker-compose up -d zimmer-13-api-koordinator

# Workers
docker run -d --name Zimmer-14-Worker-Arbeiter-1 \
  --network haus-netzwerk \
  -e API_COORDINATOR_URL=http://172.20.0.31:8000 \
  sin-solver-zimmer-14-worker-arbeiter:latest

# Captcha Worker
./bin/zimmer-19-captcha-worker.sh start

# Survey Worker
./bin/zimmer-18-survey-worker.sh start
```

### Modulare Scripts
```bash
# Alle verfügbaren Scripts
ls -la bin/

# Verfügbare Scripts:
# - bin/zimmer-18-survey-worker.sh
# - bin/zimmer-19-captcha-worker.sh
# - bin/health-check.sh
# - sinctl (Master Control)
```

---

## 🔧 DOCKER COMPOSE STRUCTURE

### Main Compose File
```
/Users/jeremy/dev/SIN-Solver/docker-compose.yml
```

### Key Sections:
```yaml
version: "3.9"

networks:
  haus-netzwerk:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

services:
  zimmer-speicher-redis:
    image: redis:7-alpine
    networks:
      haus-netzwerk:
        ipv4_address: 172.20.0.10
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      
  zimmer-13-api-koordinator:
    build: ./services/zimmer-13-api-coordinator
    networks:
      haus-netzwerk:
        ipv4_address: 172.20.0.31
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:8000/health"]
```

---

## 📊 HEALTH CHECK BEST PRACTICES 2026

### IPv4 Only (Fix für Docker Desktop)
```yaml
healthcheck:
  test: ["CMD", "wget", "-qO-", "http://127.0.0.1:8000/health"]
  # NICHT: http://localhost:8000  (versucht IPv6 zuerst)
  interval: 30s
  timeout: 10s
  retries: 3
```

### Health Check Endpoints
| Service | Endpoint | Expected Response |
|---------|----------|-------------------|
| API Koordinator | `/health` | `{"status":"healthy",...}` |
| Captcha Worker | `/health` | `{"status":"healthy","solvers":{...}}` |
| Survey Worker | `/health` | `{"status":"active",...}` |
| ClawdBot | `/health` | `{"status":"healthy","messengers":{...}}` |
| Redis | `redis-cli ping` | `PONG` |
| Postgres | `pg_isready` | exit 0 |

---

## 🔌 PORT MAPPING ÜBERSICHT

### External Ports (Host → Container)
| Host Port | Container | Service |
|-----------|-----------|---------|
| 5678 | Zimmer-01 | n8n UI |
| 3000 | Zimmer-05 | Steel Browser |
| 9222 | Zimmer-05 | Chrome DevTools Protocol |
| 3001 | Zimmer-02 | Chronos API |
| 3100 | Zimmer-11 | Dashboard UI |
| 8000 | Zimmer-13 | API Gateway |
| 8004 | Zimmer-09 | ClawdBot API |
| 8018 | Zimmer-18 | Survey Worker |
| 8019 | Zimmer-19 | Captcha Worker |
| 8203 | Zimmer-20.3 | Social MCP |
| 8204 | Zimmer-20.4 | Research MCP |
| 5432 | Postgres | Database |
| 6379 | Redis | Cache |

---

## 🛠️ TROUBLESHOOTING

### Network Issues
```bash
# Netzwerk prüfen
docker network inspect haus-netzwerk

# Container IPs anzeigen
docker inspect --format='{{.Name}} - {{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $(docker ps -q)

# Network neu erstellen
docker network rm haus-netzwerk
docker network create --driver bridge --subnet 172.20.0.0/16 haus-netzwerk
```

### Container Logs
```bash
# Letzte 50 Zeilen
docker logs Zimmer-13-API-Koordinator --tail 50

# Live Logs
docker logs -f Zimmer-19-Captcha-Worker

# Alle Container Status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

### Health Check Debugging
```bash
# Health Status aller Container
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "healthy|unhealthy"

# Manueller Health Check
curl -s http://localhost:8000/health | jq .
```

---

## 📦 IMAGE MANAGEMENT

### Lokale Images
```bash
# Alle SIN-Solver Images
docker images | grep sin-solver

# Image Size
docker images --format "{{.Repository}}:{{.Tag}} - {{.Size}}" | grep sin-solver
```

### Build Commands
```bash
# Einzelnes Service bauen
docker-compose build zimmer-13-api-koordinator

# Alle Services bauen
docker-compose build

# Ohne Cache
docker-compose build --no-cache zimmer-19-captcha-worker
```

### Image Backup (Best Practice)
```bash
# Lokal speichern
docker save sin-solver-zimmer-19-captcha-worker:latest > /path/to/backup/zimmer-19.tar

# Wiederherstellen
docker load < /path/to/backup/zimmer-19.tar
```

---

## 🔒 SECURITY CONFIGURATION

### Network Isolation
- Alle Services im isolierten `haus-netzwerk`
- Keine direkte Internet-Exposition (außer explizit gewollt)
- Inter-Container Kommunikation über IPs/Hostnames

### Secrets Management
- Umgebungsvariablen in `.env` Dateien
- Keine Secrets in Images
- JWT für Service-to-Service Auth

### Firewall Rules (Optional)
```bash
# Nur lokalen Zugriff erlauben
iptables -A INPUT -p tcp --dport 8000 -s 127.0.0.1 -j ACCEPT
iptables -A INPUT -p tcp --dport 8000 -j DROP
```

---

## 📈 MONITORING

### Prometheus Metrics (Coming Soon)
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'sin-solver'
    static_configs:
      - targets:
        - '172.20.0.31:8000'  # API Koordinator
        - '172.20.0.81:8019'  # Captcha Worker
```

### Grafana Dashboards
- Worker Status Dashboard
- Task Completion Rates
- Captcha Success Rates
- Response Time Histograms

---

**Version:** V17.10  
**Last Updated:** 2026-01-27  
**Network:** haus-netzwerk (172.20.0.0/16)
