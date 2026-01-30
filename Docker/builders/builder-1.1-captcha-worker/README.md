# CAPTCHA Worker v2.1.0

**Service:** CAPTCHA Solving Automation  
**Container Name:** `builder-1.1-captcha-worker`  
**Port:** 8019  
**Public URL:** https://captcha.delqhi.com  
**Status:** ✅ Production Ready (Hardened)

---

## Overview

CAPTCHA Worker is a high-performance, distributed CAPTCHA solving service that handles multiple CAPTCHA types using AI-powered consensus mechanisms. The service is fully containerized, security-hardened, and production-ready.

**Key Features:**
- ✅ **Multiple CAPTCHA Types:** Text, Image, Grid, Puzzle, Slider
- ✅ **AI Consensus:** Combines multiple solvers for 95%+ accuracy
- ✅ **API Authentication:** HTTPBearer token validation on all endpoints
- ✅ **CORS Restrictions:** Explicit origin whitelist (no wildcard)
- ✅ **Secret Management:** Environment-based configuration
- ✅ **Rate Limiting:** Circuit breaker for protection
- ✅ **Monitoring:** Prometheus metrics + health checks

---

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Python 3.10+
- 2GB RAM minimum
- 100MB disk space

### Installation

```bash
# Clone/navigate to service directory
cd Docker/builders/builder-1.1-captcha-worker

# Copy configuration template
cp .env.example .env

# Edit with production values
nano .env

# Start service
docker-compose up -d

# Verify service is running
curl http://localhost:8019/health
```

### First Request

```bash
# Solve a CAPTCHA with valid API key
curl -X POST http://localhost:8019/api/solve \
  -H "Authorization: Bearer sk-captcha-worker-production-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "image_data": "base64_encoded_image",
    "timeout": 30
  }'
```

---

## Configuration

### Environment Variables

**File:** `.env` (never commit)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CAPTCHA_API_KEY` | ✅ YES | `sk-test-captcha-worker-2026` | Bearer token for API auth |
| `ALLOWED_ORIGINS` | ✅ YES | `http://localhost:3000` | Comma-separated CORS whitelist |
| `LOG_LEVEL` | NO | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |
| `CAPTCHA_MODEL` | NO | `yolo-v8-consensus` | ML model for detection |
| `PUZZLE_DETECTION` | NO | `enabled` | Enable puzzle solver |
| `REDIS_URL` | NO | `redis://localhost:6379` | Redis cache connection |

### Example .env

```bash
# SECURITY (REQUIRED FOR PRODUCTION)
CAPTCHA_API_KEY=sk-captcha-worker-production-2026
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3011,http://room-13-api-brain:8000

# AI SERVICE API KEYS
MISTRAL_API_KEY=your-key-here
KIMI_API_KEY=your-key-here
STEEL_API_URL=https://steel-instance.delqhi.com

# LOGGING
LOG_LEVEL=INFO

# MODEL CONFIGURATION
CAPTCHA_MODEL=yolo-v8-consensus
PUZZLE_DETECTION=enabled
```

---

## API Reference

### Authentication

All `/api/*` endpoints require Bearer token in Authorization header:

```
Authorization: Bearer {CAPTCHA_API_KEY}
```

**Error (Missing Token):**
```json
{
  "detail": "Invalid or missing API key"
}
```
**Status:** 401 Unauthorized

### Endpoints

#### Public (No Auth Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health status |
| `/ready` | GET | Readiness probe |
| `/metrics` | GET | Prometheus metrics |
| `/rate-limits` | GET | Current rate limits |
| `/stats` | GET | Service statistics |

#### Protected (Auth Required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/solve` | POST | Solve CAPTCHA (auto-detect type) |
| `/api/solve/text` | POST | Solve text CAPTCHA |
| `/api/solve/image-grid` | POST | Solve grid/hCaptcha |
| `/api/solve/browser` | POST | Browser-automated solving |
| `/api/solve/batch` | POST | Batch solve multiple CAPTCHAs |

### Example Requests

**Solve CAPTCHA (Auto-Detect):**
```bash
curl -X POST http://localhost:8019/api/solve \
  -H "Authorization: Bearer sk-captcha-worker-production-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "image_data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "timeout": 30,
    "priority": "high"
  }'
```

**Response:**
```json
{
  "success": true,
  "result": "1234567890",
  "confidence": 0.98,
  "solver_used": "consensus",
  "time_ms": 2345
}
```

**Solve Text CAPTCHA:**
```bash
curl -X POST http://localhost:8019/api/solve/text \
  -H "Authorization: Bearer sk-captcha-worker-production-2026" \
  -H "Content-Type: application/json" \
  -d '{
    "image_data": "base64_image",
    "language": "en"
  }'
```

---

## Security

### 🔐 Three-Layer Security Hardening

1. **API Authentication**
   - HTTPBearer token validation
   - All `/api/*` endpoints protected
   - Public endpoints available without auth

2. **CORS Restrictions**
   - Explicit origin whitelist in `.env`
   - No wildcard allowed
   - Preflight requests handled

3. **Secret Management**
   - All secrets in `.env`
   - `.env` in `.gitignore`
   - Never commit secrets to git

### Security Documentation

See **[SECURITY.md](./SECURITY.md)** for:
- Complete authentication guide
- CORS configuration details
- Secret rotation procedures
- Incident response playbooks

See **[../../../docs/API-SECURITY.md](../../../docs/API-SECURITY.md)** for:
- Enterprise-wide API security
- Authentication patterns
- Error handling guidelines

### Running Security Tests

```bash
# Start service
docker-compose up -d

# Run security test suite
bash test-security.sh

# Expected output:
# ✅ All security tests PASSED!
```

---

## Deployment

### Docker Compose

**File:** `docker-compose.yml`

```yaml
version: '3.8'
services:
  captcha-worker:
    container_name: builder-1.1-captcha-worker
    build: .
    ports:
      - "8019:8000"
    environment:
      - CAPTCHA_API_KEY=${CAPTCHA_API_KEY}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
      - LOG_LEVEL=${LOG_LEVEL}
    volumes:
      - ./logs:/app/logs
      - ./models:/app/models
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### Production Deployment

```bash
# 1. Set production environment
export CAPTCHA_API_KEY=sk-captcha-worker-prod-xxx
export ALLOWED_ORIGINS=https://dashboard.delqhi.com,https://api.delqhi.com

# 2. Build image
docker build -t captcha-worker:2.1.0 .

# 3. Start service
docker run -d \
  --name builder-1.1-captcha-worker \
  -p 8019:8000 \
  -e CAPTCHA_API_KEY=${CAPTCHA_API_KEY} \
  -e ALLOWED_ORIGINS=${ALLOWED_ORIGINS} \
  -v /data/models:/app/models \
  -v /data/logs:/app/logs \
  --restart unless-stopped \
  captcha-worker:2.1.0

# 4. Verify deployment
curl https://captcha.delqhi.com/health
```

### Behind Cloudflare/Reverse Proxy

```bash
# Cloudflare DNS (A record)
captcha.delqhi.com → 172.20.0.81:8019

# Nginx Reverse Proxy Example
server {
    listen 443 ssl;
    server_name captcha.delqhi.com;
    
    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;
    
    location / {
        proxy_pass http://172.20.0.81:8019;
        proxy_set_header Host $host;
        proxy_set_header Authorization $http_authorization;
        proxy_pass_header Authorization;
    }
}
```

---

## Monitoring

### Health Checks

```bash
# Service health
curl http://localhost:8019/health

# Readiness
curl http://localhost:8019/ready

# Metrics
curl http://localhost:8019/metrics
```

### Logs

```bash
# Real-time logs
docker-compose logs -f

# Last 100 lines
docker logs builder-1.1-captcha-worker | tail -100

# Filter for errors
docker logs builder-1.1-captcha-worker | grep -i error
```

### Prometheus Metrics

```bash
# Export metrics
curl http://localhost:8019/metrics

# Example metrics:
# captcha_solve_attempts_total{type="text"} 1234
# captcha_solve_success_total{type="text"} 1200
# captcha_solve_latency_seconds_bucket{le="1.0"} 890
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs

# Verify .env exists
ls -la .env

# Verify environment variables
docker-compose config | grep -i captcha_api_key
```

### 401 Unauthorized Errors

```bash
# Verify API key is correct
grep CAPTCHA_API_KEY .env

# Verify header format
curl -H "Authorization: Bearer sk-..." http://localhost:8019/api/solve

# Check request was received
docker logs builder-1.1-captcha-worker | grep -i "401\|unauthorized"
```

### CORS Errors

```bash
# Verify allowed origins
grep ALLOWED_ORIGINS .env

# Test CORS
curl -X OPTIONS http://localhost:8019/api/solve \
  -H "Origin: http://localhost:3000"
```

---

## Development

### Local Development

```bash
# Create venv
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run service
python src/main.py

# Run tests
pytest tests/ -v
```

### File Structure

```
builder-1.1-captcha-worker/
├── src/
│   ├── main.py              # FastAPI application
│   ├── solvers/             # CAPTCHA solver modules
│   └── utils/               # Utilities (cache, rate limit, etc.)
├── tests/                   # Unit tests
├── models/                  # ML models
├── .env.example             # Configuration template
├── .env                     # Production config (⚠️ Don't commit)
├── .gitignore              # Git ignore rules
├── Dockerfile              # Container definition
├── docker-compose.yml      # Compose file
├── requirements.txt        # Python dependencies
├── SECURITY.md            # Security documentation
└── test-security.sh       # Security test suite
```

---

## Support & Issues

| Issue | Solution |
|-------|----------|
| **Port 8019 in use** | Kill existing process or use different port |
| **Out of memory** | Increase Docker memory limit to 4GB+ |
| **Slow responses** | Check Redis connection, model loading |
| **High error rate** | Review logs, update models, check CORS |

---

## Changelog

### v2.1.0 (2026-01-30) - Security Hardening

- ✅ Added API key authentication (HTTPBearer)
- ✅ Restricted CORS (whitelist instead of wildcard)
- ✅ Environment-based secret management
- ✅ Comprehensive security documentation
- ✅ Automated security test suite
- ✅ All CI/CD checks passed

### v2.0.0 (2026-01-25)

- Consensus solver implementation
- Multi-type CAPTCHA support
- Rate limiting & circuit breaker
- Prometheus metrics

---

## License

Internal Use Only - Delqhi Platform

---

## Contacts

- **Security Issues:** security@delqhi.com
- **Infrastructure:** infrastructure@delqhi.com
- **Support:** support@delqhi.com

---

**Last Updated:** 2026-01-30  
**Maintained By:** SIN-Solver Team  
**Status:** ✅ Production Ready
