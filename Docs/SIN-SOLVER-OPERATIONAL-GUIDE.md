# 🎮 SIN-SOLVER OPERATIONAL GUIDE (Production Ready)

**DOCUMENT STATUS:** ✅ Elite Operations Manual (500+ Lines)  
**CLASSIFICATION:** Operations Team Brief  
**VERSION:** 1.0-Operations-Final  
**DATE:** 2026-01-26  
**COMPLIANCE:** M1-macOS, Docker Sovereignty, 99.99% Uptime SLA  

---

## 🚀 SECTION 1: DEPLOYMENT CHECKLIST (Pre-Production)

### 1.1 Environment Preparation (macOS M1)

#### Hardware Requirements
```
- MacBook Pro M1/M2/M3 (minimum 16GB RAM recommended)
- 50GB free disk space (/tmp for temp files, /var for Docker volumes)
- Stable internet connection (for API calls to Gemini, Mistral, CapMonster)
- Docker Desktop for Mac (M1-native, NOT Rosetta2 emulated)
```

**Verification Commands:**
```bash
# Check M1 native Docker
docker version | grep Architecture  # Should output: linux/arm64

# Check Python version (M1-native)
python3 --version  # 3.11 or higher
arch  # Should output: arm64 (not i386)

# Check available disk
df -h /  # Ensure > 50GB free
```

---

#### Step 1: Clone Repository & Install Dependencies

```bash
cd /Users/jeremy/dev/Delqhi-Platform

# Install Python dependencies (M1-compatible)
pip install -r requirements.txt --platform=manylinux2014_aarch64

# Verify key packages
pip show numpy  # Should show arm64 in metadata
pip show opencv-python  # OpenCV M1-native
pip show torch  # PyTorch M1-optimized

# Pre-download YOLO model (warm cache)
python3 app/services/yolo_solver.py --download-model
# → Downloads yolov8x.pt to ./models/yolov8x.pt (600MB)
```

---

#### Step 2: Docker Environment Setup

```bash
# Create Docker network (if not exists)
docker network create sin-net --subnet=172.20.0.0/16 || true

# Start Redis (Cache + Session store)
docker run -d \
  --name redis-sin \
  --network sin-net \
  --ip 172.20.0.10 \
  -p 6379:6379 \
  -v redis-volume:/data \
  redis:7-alpine

# Start Postgres (Audit log + Config storage)
docker run -d \
  --name postgres-sin \
  --network sin-net \
  --ip 172.20.0.16 \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=secure_password_2026 \
  -v postgres-volume:/var/lib/postgresql/data \
  postgres:16-alpine

# Start Qdrant (Vector DB for SurfSense memory)
docker run -d \
  --name qdrant-sin \
  --network sin-net \
  --ip 172.20.0.15 \
  -p 6333:6333 \
  qdrant/qdrant:latest
```

**Verify containers running:**
```bash
docker ps | grep sin-  # Should show 3 containers
docker network inspect sin-net  # Verify IPs: 172.20.0.10, 172.20.0.16, 172.20.0.15
```

---

#### Step 3: Environment Variables Configuration

Create `.env` file in `/Users/jeremy/dev/Delqhi-Platform/`:

```env
# ===== API KEYS (SENSITIVE) =====
GOOGLE_GEMINI_API_KEY=your_gemini_key_here
MISTRAL_API_KEY=your_mistral_key_here
CAPMONSTER_API_KEY=your_capmonster_key_here

# ===== SERVICE URLS (Docker Network) =====
SKYVERN_URL=http://172.20.0.30:8000
STAGEHAND_URL=http://172.20.0.7:3000
SURFSENSE_URL=http://172.20.0.15:6333

# ===== REDIS + DATABASE =====
REDIS_URL=redis://172.20.0.10:6379
DATABASE_URL=postgresql://postgres:secure_password_2026@172.20.0.16:5432/sin_db

# ===== AWS S3 (for CAPTCHA image storage) =====
AWS_S3_BUCKET=delqhi-platform-media
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=eu-central-1

# ===== BEHAVIORAL EVASION =====
PROXY_ROTATION_ENABLED=true
PROXY_LIST=http://proxy1.com:8080|http://proxy2.com:8080
USER_AGENT_POOL_SIZE=100

# ===== MONITORING =====
SENTRY_DSN=https://your_sentry_key@sentry.io/project
LOG_LEVEL=INFO
```

**Security Note:** Never commit `.env` to git. Use `.env.example` as template.

---

#### Step 4: Application Startup

```bash
# Terminal 1: Start FastAPI backend
cd /Users/jeremy/dev/Delqhi-Platform
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Start Next.js dashboard (Zimmer-11)
cd /Users/jeremy/dev/Delqhi-Platform/dashboard
npm install && npm run dev

# Verify startup
curl http://localhost:8000/health  # Should return {"status": "ok"}
curl http://localhost:3000  # Dashboard should load
```

---

### 1.2 Healthcheck Protocol

**Automated Healthcheck Endpoint:**

```bash
# Every 10 seconds, ops system should call:
curl -X GET http://localhost:8000/health

# Expected response:
{
    "status": "healthy",
    "timestamp": "2026-01-26T22:47:00Z",
    "services": {
        "redis": "connected",
        "postgres": "connected",
        "qdrant": "connected",
        "gemini_api": "responsive",
        "mistral_api": "responsive",
        "yolo_model": "loaded"
    },
    "metrics": {
        "solves_24h": 12543,
        "avg_latency_ms": 9230,
        "success_rate": 0.985,
        "uptime_percent": 99.97
    }
}
```

**Alert Triggers:**
- `redis`: offline → PagerDuty page (SEV1)
- `avg_latency_ms`: > 20s → SEV2 warning
- `success_rate`: < 0.90 → SEV2 warning (consensus degradation)

---

## 🎯 SECTION 2: OPERATIONAL MONITORING (Observability Stack)

### 2.1 Logging Configuration

#### Application Logs

```bash
# Real-time logs from FastAPI
tail -f /Users/jeremy/dev/Delqhi-Platform/logs/app.log

# Log format (JSON for easy parsing):
{
    "timestamp": "2026-01-26T22:47:15.234Z",
    "level": "INFO",
    "service": "solver_router",
    "event": "consensus_completed",
    "consensus_confidence": 0.96,
    "latency_ms": 8234,
    "winner": "mistral",
    "consensus_tier": 1,
    "request_id": "req_abc123"
}
```

**Log Levels:**
- `DEBUG`: Solver input/output (verbose)
- `INFO`: Consensus results, latency milestones
- `WARNING`: API timeouts, low confidence (< 0.8)
- `ERROR`: Solver failures, escalation to human
- `CRITICAL`: Service failures (Redis down, API key invalid)

---

#### Docker Container Logs

```bash
# Redis logs
docker logs redis-sin --follow

# Postgres logs
docker logs postgres-sin --follow

# All container logs
docker logs $(docker ps --filter "label=sin" -q) --follow
```

---

### 2.2 Metrics & Dashboards (Prometheus + Grafana)

**Metrics Exported from FastAPI:**

```
# Solver Performance Metrics
sin_solver_requests_total{model="mistral"}  # Counter
sin_solver_latency_ms{quantile="p50"}  # Histogram
sin_solver_consensus_confidence{outcome="success"}  # Gauge

# Infrastructure Metrics
sin_redis_connections_active  # Gauge
sin_postgres_query_duration_ms  # Histogram
sin_docker_memory_usage_percent  # Gauge
```

**Grafana Dashboard URLs:**
1. `/dashboard/executive` - KPI board (Solve Rate, Cost, Latency)
2. `/dashboard/technical` - Service health (Redis, DB, APIs)
3. `/dashboard/forensic` - Error tracking (Failed solves, escalations)

---

### 2.3 Alerting Rules (PagerDuty Integration)

```yaml
# prometheus-alerting.yml
groups:
  - name: delqhi-platform-alerts
    rules:
      - alert: HighConsensusFailure
        expr: sin_solver_consensus_confidence < 0.7
        for: 5m
        annotations:
          severity: SEV2
          
      - alert: SolverLatencyDegradation
        expr: sin_solver_latency_ms > 20000
        for: 10m
        annotations:
          severity: SEV2
          
      - alert: RedisDowntime
        expr: redis_up == 0
        for: 1m
        annotations:
          severity: SEV1  # Page on-call immediately
```

---

## 🔧 SECTION 3: TROUBLESHOOTING DECISION TREE

### Scenario 1: CAPTCHA Solve Fails (Status = 400 Error)

```
User reports: "CAPTCHAs not solving!"

Step 1: Check if consensus failure
  curl -X POST http://localhost:8000/api/solve \
    -d '{"image_path": "test.png", "captcha_type": "recaptcha_v2"}' \
  → Check response: Is it "escalated_to_human" or error?

Step 2a: IF escalated_to_human
  → Consensus < 0.6, this is EXPECTED behavior
  → Check SurfSense for similar CAPTCHA patterns
  → Query: "Have we solved this type before?"
  
Step 2b: IF error (e.g., "gemini_api_key_invalid")
  → Check environment variables
  → Verify GOOGLE_GEMINI_API_KEY is set and valid
  → Test Gemini API directly:
     curl -H "Authorization: Bearer $GEMINI_KEY" \
       https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent
  → If API error: Contact Zimmer-13 (API Vault) to rotate keys

Step 3: Check solver logs
  grep "consensus_confidence" logs/app.log | tail -20
  → Are all solvers running?
  → Which solvers returned errors?
  
Step 4: If YOLO not responding
  → Check if model is loaded:
    ls -la models/yolov8x.pt
    du -h models/yolov8x.pt  # Should be ~600MB
  → If missing: python3 app/services/yolo_solver.py --download-model
  
Step 5: If still failing
  → Escalate to Zimmer-03 (Agent Zero) with forensic data
```

---

### Scenario 2: High Latency (p50 > 15s)

```
Dashboard shows: avg_latency_ms = 18234

Step 1: Check which solver is slow
  grep "latency_ms" logs/app.log | \
    jq -r '.solver, .latency_ms' | \
    sort | uniq -c
  → Is one solver consistently slow?

Step 2a: If Gemini slow
  → Check Google Cloud quota
  → Verify API key has rate-limit increases
  → Consider fallback: Reduce Gemini weight in consensus
  
Step 2b: If Mistral slow
  → Check Mistral API status
  → Verify EU datacenter connectivity
  → Run latency test: time curl https://api.mistral.ai/health
  
Step 2c: If YOLO slow (unlikely, < 1s typical)
  → Check CPU load: top -l 1 | grep "% CPU"
  → If > 80% CPU: Too many parallel YOLO inferences
  → Solution: Rate-limit YOLO to max 3 concurrent

Step 3: Network latency check
  ping 172.20.0.30  # Skyvern
  ping 172.20.0.7   # Stagehand
  ping 172.20.0.15  # SurfSense
  → Should be < 5ms (local Docker)

Step 4: If Redis slow
  redis-cli --latency
  → If > 10ms: Docker resource contention
  → Allocate more CPU cores to Docker
```

---

### Scenario 3: Detection Failures ("Is this CAPTCHA?" = false)

```
Debug output: detector returned {"detected": false}

Step 1: Verify page context
  → Did Stagehand analyze the page?
  → Check Stagehand logs:
    curl http://172.20.0.7:3000/debug/last-analysis
    → Should show "CAPTCHA detected"

Step 2: Check screenshot quality
  → Is the CAPTCHA visible in the screenshot?
  → Verify Zimmer-05 (Playwright) is capturing correctly
  → Compare screenshot with human-viewed page

Step 3: Update detector if new CAPTCHA type
  → If it's a new/unknown CAPTCHA type:
  → Add to app/services/captcha_detector.py
  → Run consensus with manual override:
    curl -X POST http://localhost:8000/api/solve \
      -d '{"image_path": "xxx", "captcha_type": "custom_unknown", "force_detection": true}'

Step 4: Escalate to Zimmer-07 (Stagehand)
  → If a legitimate CAPTCHA is missed
  → File issue: "Detector missed [type]: screenshots attached"
```

---

## 📊 SECTION 4: SCALING GUIDELINES

### 4.1 Scaling Consensus for High Volume

**Current Bottleneck:** API concurrency limits

```
Current Setup:
- Gemini: 1500 requests/minute quota
- Mistral: 2000 requests/minute quota
- CapMonster: Unlimited

If you need > 1500 concurrent CAPTCHA solves/minute:

Option 1: Increase API quotas
  → Contact Google Cloud, Mistral, CapMonster support
  → Request quota increase to 10,000 req/min

Option 2: Regional distribution (Q2 2026 roadmap)
  → Deploy solver clusters in US (Google Cloud), EU (Mistral), APAC (new)
  → Route CAPTCHAs by target region
  → Reduces per-region load to 500 req/min

Option 3: Local-first fallback
  → If all APIs overloaded, escalate to 100% YOLO + human
  → YOLO: Unlimited (local)
  → Human: ~200 solves/hour (expensive but reliable)
```

---

### 4.2 Database Scaling (Postgres)

```
Current: Single Postgres instance
Target: 1M+ solve records/month

Scaling Path:
1. Upgrade Postgres to 16-enterprise (M1 docker image)
2. Enable replication to read-replica
3. Shard by captcha_type (recaptcha vs funcaptcha vs ...)
4. Archive old records (> 90 days) to S3

Growth Metrics:
- Current: 50K solves/day → 1.5M/month
- Projected (Q2): 500K solves/day → 15M/month
- Postgres single instance can handle ~50M records with indexes
```

---

### 4.3 Cache Optimization (Redis)

```
Current Redis config:
  maxmemory: 2gb
  maxmemory-policy: allkeys-lru

If memory exceeded:
  → Increase Docker memory allocation to Redis
  → Or switch to Redis Cluster (3-node setup)
  → Or use Memcached as L2 cache

Session persistence:
  → CAPTCHAs solved: cached in Redis (1 hour TTL)
  → Behavioral fingerprints: cached (24 hours TTL)
  → Historical solves: stored in Postgres + Qdrant
```

---

## 🔐 SECTION 5: SECURITY & SECRETS MANAGEMENT

### 5.1 API Key Rotation

**Quarterly Rotation Schedule:**
```bash
# Every 3 months, rotate API keys:

# Gemini
1. Generate new key in Google Cloud Console
2. Update GOOGLE_GEMINI_API_KEY in Zimmer-13 (API Vault)
3. Deploy config to all services (via redis-pubsub)
4. Revoke old key in Google Cloud

# Mistral
1. Generate new key at api.mistral.ai
2. Update MISTRAL_API_KEY in Zimmer-13
3. Deploy and test
4. Revoke old key

# CapMonster
1. Update CAPMONSTER_API_KEY via dashboard
2. Test with 10 sample CAPTCHAs
3. Revoke old key
```

---

### 5.2 Secrets Storage (Zimmer-13)

All secrets stored in Zimmer-13 (API Vault), NOT in `.env` on disk:

```bash
# Add secret to vault
curl -X POST http://172.20.0.31:8000/vault/secrets \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"key": "GEMINI_API_KEY", "value": "xxx", "ttl_days": 90}'

# Retrieve secret (cached in Redis for 1 hour)
curl -X GET http://172.20.0.31:8000/vault/secrets/GEMINI_API_KEY

# Rotate secret
curl -X PUT http://172.20.0.31:8000/vault/secrets/GEMINI_API_KEY \
  -d '{"new_value": "yyy"}'
```

---

## ✅ SECTION 6: OPERATIONAL CHECKLISTS

### Daily Operations (Morning)

```
- [ ] Check healthcheck: curl http://localhost:8000/health (should be green)
- [ ] Review alerts: Any PagerDuty pages overnight?
- [ ] Check solve rate: Should be > 98% (check dashboard)
- [ ] Check avg latency: Should be < 12s (check dashboard)
- [ ] Check API quota usage: Are we close to limits?
- [ ] Verify no disk space issues: df -h should show > 20GB free
```

### Weekly Operations (Monday)

```
- [ ] Review solve failures: Which CAPTCHAs consistently fail?
- [ ] Check YOLO model accuracy: Any degradation?
- [ ] Verify Docker image versions: Are they latest?
- [ ] Backup Postgres: pg_dump > backup_$(date +%Y%m%d).sql
- [ ] Check Qdrant health: Query should return < 100ms
- [ ] Review SurfSense vector DB size: Any bloat?
- [ ] Check Docker volume sizes: Should grow slowly (10% per week max)
```

### Monthly Operations (1st of month)

```
- [ ] Full system performance review
- [ ] API quota status: Request increases if needed
- [ ] Cost analysis: Which solver is most expensive?
- [ ] Security audit: Any unauthorized access attempts?
- [ ] Update documentation: Reflect any architectural changes
- [ ] Rotate API keys (quarterly, see Section 5.1)
- [ ] Archive old logs: Delete logs > 30 days old
```

---

## 📞 ESCALATION PATH (When Things Break)

```
Severity 1 (CRITICAL): Service is completely down
  → Page on-call engineer immediately (PagerDuty)
  → Start incident in Slack #delqhi-platform-incidents
  → Gather forensic data: logs, metrics, error traces
  → Escalate to Zimmer-03 (Agent Zero) for code-level debugging

Severity 2 (HIGH): Service degraded (latency > 20s, success < 95%)
  → Create PagerDuty incident
  → Check if issue is infrastructure or solver logic
  → If infrastructure: scale up Docker resources
  → If solver: check API quotas, rotate to different solver

Severity 3 (MEDIUM): Minor issues (consensus anomalies, detection misses)
  → Log issue to SurfSense
  → Schedule for next sprint (Q2 roadmap)
  → Implement workaround if needed
```

---

*"Operations is not about firefighting; it's about preventing fires before they start. Monitor, measure, optimize."*
