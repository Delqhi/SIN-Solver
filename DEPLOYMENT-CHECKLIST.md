# Captcha Worker (solver-1.1-captcha-worker) - Deployment Checklist

**Version:** 2.1.0  
**Last Updated:** 2026-01-29 07:45 UTC  
**Status:** PRODUCTION-READY  
**Maintainer:** SIN-Solver Team

---

## 📋 PRE-DEPLOYMENT VERIFICATION

### System Requirements
- [ ] Docker 24.0+ installed (`docker --version`)
- [ ] Docker Compose 2.20+ installed (`docker-compose --version`)
- [ ] 8GB+ RAM available (`free -h` or `vm_stat`)
- [ ] 20GB+ disk space available (`df -h`)
- [ ] Network connectivity to external APIs (Gemini, Mistral, Qwen, Kimi)
- [ ] Redis server accessible (test: `redis-cli ping`)

### Code Quality Verification
- [x] No forbidden patterns found (mock, simulation, placeholder)
  - Verified: 2026-01-29 07:35 UTC
  - Command: `grep -r "mock\|simulation\|placeholder" src/ --include="*.py"`
  - Result: CLEAN (no matches except HTML placeholders)
- [x] All Python files syntax valid
  - Verified: 2026-01-29 07:35 UTC
  - Files checked: 13 Python files
  - Result: CLEAN (no syntax errors)
- [x] Docker image builds successfully
  - Verified: 2026-01-29 07:40 UTC
  - Build time: ~3-5 minutes (first build)
  - Image size: ~850MB (optimized multi-stage)
  - Result: SUCCESS

### Configuration Verification
- [ ] `.env` file created with all required variables
  - [ ] `GEMINI_API_KEY` set
  - [ ] `MISTRAL_API_KEY` set
  - [ ] `QWEN_API_KEY` set
  - [ ] `KIMI_API_KEY` set
  - [ ] `REDIS_URL` set (default: `redis://localhost:6379`)
  - [ ] `LOG_LEVEL` set (default: `INFO`)
  - [ ] `WORKERS` set (default: `4`)
  - [ ] `TIMEOUT` set (default: `30`)
  - [ ] `MAX_RETRIES` set (default: `3`)
  - [ ] `CIRCUIT_BREAKER_THRESHOLD` set (default: `5`)
  - [ ] `RATE_LIMIT_REQUESTS` set (default: `100`)
  - [ ] `RATE_LIMIT_WINDOW` set (default: `60`)
  - [ ] `PROMETHEUS_PORT` set (default: `9090`)

- [ ] `docker-compose.yml` reviewed and customized
  - [ ] Service name: `solver-1.1-captcha-worker`
  - [ ] Port mapping: `8019:8000` (external:internal)
  - [ ] Environment variables loaded from `.env`
  - [ ] Volume mounts configured (if needed)
  - [ ] Network configured (default: `bridge`)
  - [ ] Restart policy: `unless-stopped`
  - [ ] Health check configured (interval: 30s, timeout: 10s)

### API Keys & Secrets
- [ ] Gemini API key obtained and validated
  - [ ] Key format: `AIza...` (Google API key)
  - [ ] Quota verified (minimum 100 requests/day)
  - [ ] Billing enabled (if using paid tier)

- [ ] Mistral API key obtained and validated
  - [ ] Key format: `sk-...` (Mistral API key)
  - [ ] Quota verified (minimum 100 requests/day)
  - [ ] Billing enabled

- [ ] Qwen API key obtained and validated
  - [ ] Key format: `sk-...` (Qwen API key)
  - [ ] Quota verified (minimum 100 requests/day)
  - [ ] Billing enabled

- [ ] Kimi API key obtained and validated
  - [ ] Key format: `sk-...` (Kimi API key)
  - [ ] Quota verified (minimum 100 requests/day)
  - [ ] Billing enabled

### Redis Configuration
- [ ] Redis server running and accessible
  - [ ] Test command: `redis-cli ping` → should return `PONG`
  - [ ] Port: 6379 (default) or custom configured
  - [ ] Authentication: configured if required
  - [ ] Persistence: enabled (RDB or AOF)
  - [ ] Memory limit: set to prevent OOM

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Build Docker Image
```bash
cd /Users/jeremy/dev/sin-solver/Docker/builders/builder-1.1-captcha-worker
docker build -t solver-1.1-captcha-worker:latest .
```
- [ ] Build completes without errors
- [ ] Image size: ~850MB
- [ ] Image ID: `docker images | grep solver-1.1-captcha-worker`

### Step 2: Start Container
```bash
cd /Users/jeremy/dev/sin-solver/Docker/builders/builder-1.1-captcha-worker
docker-compose up -d
```
- [ ] Container starts successfully
- [ ] Container status: `docker ps | grep solver-1.1-captcha-worker`
- [ ] No error logs: `docker logs solver-1.1-captcha-worker`

### Step 3: Verify Health Check
```bash
curl http://localhost:8019/health
```
- [ ] Response: `{"status": "healthy"}`
- [ ] HTTP Status: 200
- [ ] Response time: < 100ms

### Step 4: Verify Readiness Probe
```bash
curl http://localhost:8019/ready
```
- [ ] Response: `{"ready": true}`
- [ ] HTTP Status: 200
- [ ] All dependencies available

### Step 5: Test API Endpoints
```bash
# Test OCR detection
curl -X POST http://localhost:8019/api/v1/detect \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://example.com/captcha.png"}'

# Test batch processing
curl -X POST http://localhost:8019/api/v1/batch \
  -H "Content-Type: application/json" \
  -d '{"images": ["url1", "url2", "url3"]}'

# Test health metrics
curl http://localhost:8019/metrics
```
- [ ] All endpoints respond with 200 status
- [ ] Response times: < 5 seconds
- [ ] No error messages in responses

### Step 6: Verify Prometheus Metrics
```bash
curl http://localhost:9090/metrics
```
- [ ] Metrics endpoint accessible
- [ ] Metrics include:
  - [ ] `captcha_requests_total` (counter)
  - [ ] `captcha_processing_time_seconds` (histogram)
  - [ ] `captcha_success_rate` (gauge)
  - [ ] `circuit_breaker_state` (gauge)
  - [ ] `rate_limiter_tokens` (gauge)
  - [ ] `redis_connection_status` (gauge)
  - [ ] `api_errors_total` (counter)
  - [ ] `batch_processing_time_seconds` (histogram)

### Step 7: Monitor Logs
```bash
docker logs -f solver-1.1-captcha-worker
```
- [ ] No ERROR level logs
- [ ] No CRITICAL level logs
- [ ] INFO logs show normal operation
- [ ] Request logs show successful processing

### Step 8: Load Testing (Optional)
```bash
# Using Apache Bench
ab -n 100 -c 10 http://localhost:8019/health

# Using wrk
wrk -t4 -c100 -d30s http://localhost:8019/health
```
- [ ] P95 response time: < 500ms
- [ ] P99 response time: < 1000ms
- [ ] Error rate: < 1%
- [ ] Throughput: > 100 req/s

---

## ✅ POST-DEPLOYMENT VERIFICATION

### Container Health
- [ ] Container running: `docker ps | grep solver-1.1-captcha-worker`
- [ ] No restart loops: `docker inspect solver-1.1-captcha-worker | grep RestartCount`
- [ ] Memory usage: < 2GB
- [ ] CPU usage: < 50% (idle)

### API Functionality
- [ ] Health endpoint: 200 OK
- [ ] Readiness endpoint: 200 OK
- [ ] Detect endpoint: 200 OK (with valid image)
- [ ] Batch endpoint: 200 OK (with valid images)
- [ ] Metrics endpoint: 200 OK

### Data Persistence
- [ ] Redis connection: stable
- [ ] Cache operations: working
- [ ] Queue operations: working
- [ ] No data loss on restart

### Monitoring & Alerting
- [ ] Prometheus scraping: active
- [ ] Metrics collection: working
- [ ] Grafana dashboard: updated (if applicable)
- [ ] Alert rules: configured (if applicable)

---

## 🔄 ROLLBACK PROCEDURE

### If Deployment Fails

**Step 1: Stop Current Container**
```bash
docker-compose down
```
- [ ] Container stopped
- [ ] Volumes preserved (if configured)

**Step 2: Revert to Previous Image**
```bash
docker tag solver-1.1-captcha-worker:previous solver-1.1-captcha-worker:latest
```
- [ ] Previous image tagged as latest

**Step 3: Start Previous Version**
```bash
docker-compose up -d
```
- [ ] Container starts with previous version
- [ ] Health check passes

**Step 4: Verify Rollback**
```bash
curl http://localhost:8019/health
docker logs solver-1.1-captcha-worker
```
- [ ] Health endpoint responds
- [ ] No error logs
- [ ] Service operational

---

## 📊 PERFORMANCE TARGETS

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Response Time (P95)** | < 500ms | TBD | ⏳ |
| **Response Time (P99)** | < 1000ms | TBD | ⏳ |
| **Throughput** | > 100 req/s | TBD | ⏳ |
| **Error Rate** | < 1% | TBD | ⏳ |
| **Memory Usage** | < 2GB | TBD | ⏳ |
| **CPU Usage (Idle)** | < 50% | TBD | ⏳ |
| **Uptime** | > 99.9% | TBD | ⏳ |
| **Circuit Breaker Trips** | < 1/day | TBD | ⏳ |

---

## 🐛 TROUBLESHOOTING

### Issue: Container fails to start
**Symptoms:** `docker-compose up` returns error
**Solution:**
1. Check logs: `docker logs solver-1.1-captcha-worker`
2. Verify `.env` file: all required variables set
3. Verify Redis connection: `redis-cli ping`
4. Rebuild image: `docker build --no-cache -t solver-1.1-captcha-worker:latest .`

### Issue: Health check fails
**Symptoms:** `curl http://localhost:8019/health` returns error
**Solution:**
1. Check container logs: `docker logs solver-1.1-captcha-worker`
2. Verify API keys: all keys valid and have quota
3. Verify Redis: `redis-cli ping`
4. Check network: `docker network ls`

### Issue: High error rate
**Symptoms:** API endpoints return 5xx errors
**Solution:**
1. Check circuit breaker state: `curl http://localhost:9090/metrics | grep circuit_breaker`
2. Check rate limiter: `curl http://localhost:9090/metrics | grep rate_limiter`
3. Check API quotas: verify all API keys have remaining quota
4. Check Redis memory: `redis-cli info memory`

### Issue: Slow response times
**Symptoms:** API endpoints take > 5 seconds
**Solution:**
1. Check CPU usage: `docker stats solver-1.1-captcha-worker`
2. Check memory usage: `docker stats solver-1.1-captcha-worker`
3. Check network latency: `ping api.gemini.google.com`
4. Check Redis latency: `redis-cli --latency`

---

## 📝 DEPLOYMENT SIGN-OFF

| Role | Name | Date | Signature |
|------|------|------|-----------|
| **Deployer** | [Name] | [Date] | [ ] |
| **QA Lead** | [Name] | [Date] | [ ] |
| **DevOps Lead** | [Name] | [Date] | [ ] |
| **Product Owner** | [Name] | [Date] | [ ] |

---

## 📚 RELATED DOCUMENTATION

- **Implementation Guide:** `/Users/jeremy/dev/sin-solver/Docker/builders/builder-1.1-captcha-worker/`
- **API Reference:** See `lastchanges.md` - CAPTCHA-WORKER-DEPLOYMENT-READY section
- **Environment Variables:** See `.env.example`
- **Docker Compose:** See `docker-compose.yml`
- **Requirements:** See `requirements.txt`

---

**Document Status:** PRODUCTION-READY  
**Last Verified:** 2026-01-29 07:45 UTC  
**Next Review:** 2026-02-05 (weekly)
