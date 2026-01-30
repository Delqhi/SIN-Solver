# SIN-Solver API Security Guide

**Last Updated:** 2026-01-30  
**Version:** 1.0  
**Status:** ✅ IMPLEMENTED

---

## Overview

This guide covers security implementation across all SIN-Solver API endpoints. All APIs implement:

1. **Bearer Token Authentication** (HTTPBearer)
2. **CORS Restrictions** (explicit origin whitelist)
3. **Environment-Based Secrets** (no hardcoded values)

---

## Core Security Principles

### 1. All APIs Require Authentication

Every API endpoint that modifies data or accesses sensitive functionality requires a valid Bearer token in the `Authorization` header.

**Format:**
```
Authorization: Bearer {API_KEY}
```

### 2. No Wildcard CORS

Cross-origin requests are restricted to explicitly whitelisted origins defined in environment configuration. Wildcard (`*`) is forbidden.

**Configuration:**
```bash
ALLOWED_ORIGINS=http://localhost:3000,http://room-13-api-brain:8000
```

### 3. Secrets in Environment Only

All sensitive credentials (API keys, tokens, secrets) are stored in environment variables, never in code or configuration files committed to git.

**Files:**
- `.env` - Production secrets (⚠️ NEVER commit)
- `.env.example` - Template with placeholders (✅ Safe to commit)
- `.gitignore` - Prevents `.env` from being committed

---

## Authentication Methods

### Bearer Token (Recommended)

**Used By:** All protected endpoints  
**Security Level:** 🔒 High  
**Implementation:** HTTPBearer header validation

```bash
curl -X POST https://api.example.com/endpoint \
  -H "Authorization: Bearer sk-your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{"data": "value"}'
```

**Response if Missing:**
```
401 Unauthorized
{"detail": "Invalid or missing API key"}
```

**Response if Invalid:**
```
401 Unauthorized
{"detail": "Invalid or missing API key"}
```

### API Key Rotation

**Recommended Frequency:** Every 90 days  
**Emergency Rotation:** Immediately if compromised

**Steps:**
1. Generate new key: `openssl rand -hex 16`
2. Update `.env` with new key
3. Restart service
4. Update all clients with new key
5. Monitor for authentication failures

---

## CORS Configuration

### Allowed Origins Format

Comma-separated list of fully qualified URLs:

```bash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3011,https://dashboard.delqhi.com
```

### Adding New Origin

1. Edit `.env`:
```bash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3011,https://new-domain.com
```

2. Restart service:
```bash
docker-compose down
docker-compose up -d
```

3. Test CORS:
```bash
curl -X OPTIONS https://api.example.com/endpoint \
  -H "Origin: https://new-domain.com" \
  -H "Access-Control-Request-Method: POST"
```

### CORS Response Headers

**If origin is allowed:**
```
Access-Control-Allow-Origin: https://new-domain.com
Access-Control-Allow-Methods: POST, GET, OPTIONS
Access-Control-Allow-Headers: authorization, content-type
Access-Control-Allow-Credentials: true
```

**If origin is NOT allowed:**
```
(No Access-Control-Allow-Origin header)
```

---

## Secret Management

### Environment File Hierarchy

1. **`.env`** (Production secrets)
   - ⚠️ NEVER commit to git
   - Contains real API keys and tokens
   - Each developer has unique copy
   - Protected by `.gitignore`

2. **`.env.example`** (Template)
   - ✅ SAFE to commit
   - Shows required variables
   - Contains placeholder values
   - Template for onboarding

3. **`.gitignore`** (Protection)
   - Lists `.env` to prevent commits
   - Enforced by pre-commit hooks
   - Verified in CI/CD pipeline

### Required Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `CAPTCHA_API_KEY` | Bearer token for API | `sk-captcha-worker-prod-xxx` |
| `ALLOWED_ORIGINS` | CORS whitelist | `http://localhost:3000,http://room-13:8000` |
| `LOG_LEVEL` | Logging verbosity | `INFO`, `DEBUG`, `ERROR` |
| `DATABASE_URL` | Database connection | `postgresql://user:pass@host:5432/db` |

### Secret Verification

**Check for leaked secrets:**
```bash
# These should return nothing (silent success)
grep -r "sk-" src/
grep -r "Bearer" src/
grep -r "api.key" src/
grep -r "password" src/
```

**Verify .env is gitignored:**
```bash
git check-ignore .env
# Returns: .env (if ignored correctly)
```

---

## API Endpoint Security

### Protected Endpoints (Require Bearer Token)

| Service | Endpoint | Method | Description |
|---------|----------|--------|-------------|
| **CAPTCHA Worker** | `/api/solve` | POST | Solve CAPTCHA |
| **CAPTCHA Worker** | `/api/solve/text` | POST | Text CAPTCHA solver |
| **CAPTCHA Worker** | `/api/solve/image-grid` | POST | Grid CAPTCHA solver |
| **CAPTCHA Worker** | `/api/solve/browser` | POST | Browser-based solving |
| **API Brain** | `/api/projects` | POST | Create project |
| **API Brain** | `/api/projects/{id}` | PUT | Update project |
| **API Brain** | `/api/projects/{id}` | DELETE | Delete project |

### Public Endpoints (No Authentication)

| Service | Endpoint | Method | Description |
|---------|----------|--------|-------------|
| **Any** | `/health` | GET | Health check |
| **Any** | `/ready` | GET | Readiness probe |
| **Any** | `/metrics` | GET | Prometheus metrics |
| **Any** | `/docs` | GET | API documentation |

### Request/Response Examples

**Protected Endpoint - Success:**
```bash
curl -X POST https://captcha.delqhi.com/api/solve \
  -H "Authorization: Bearer sk-captcha-worker-prod" \
  -H "Content-Type: application/json" \
  -d '{"image_data": "base64_image"}'

# Response: 200 OK
{
  "success": true,
  "result": "1234567890"
}
```

**Protected Endpoint - Missing Auth:**
```bash
curl -X POST https://captcha.delqhi.com/api/solve \
  -H "Content-Type: application/json" \
  -d '{"image_data": "base64_image"}'

# Response: 401 Unauthorized
{
  "detail": "Invalid or missing API key"
}
```

**Public Endpoint - No Auth Needed:**
```bash
curl https://captcha.delqhi.com/health

# Response: 200 OK
{
  "status": "healthy",
  "uptime": "2h 34m"
}
```

---

## Error Handling & Security

### Don't Expose Sensitive Information

❌ **WRONG** - Leaks sensitive info:
```json
{
  "error": "Database password incorrect: myPassword123",
  "database": "postgresql://user:myPassword123@host:5432/db"
}
```

✅ **RIGHT** - Generic error message:
```json
{
  "error": "Authentication failed",
  "code": "AUTH_001"
}
```

### HTTP Status Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| `200` | OK | Successful request |
| `400` | Bad Request | Invalid input data |
| `401` | Unauthorized | Missing or invalid API key |
| `403` | Forbidden | Valid token but insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Server Error | Internal server error |

---

## Security Testing

### Test Authentication

```bash
# Test 1: Missing token (should fail)
curl -X POST https://api.example.com/api/protected \
  -H "Content-Type: application/json" \
  -d '{"data": "test"}'
# Expected: 401 Unauthorized

# Test 2: Invalid token (should fail)
curl -X POST https://api.example.com/api/protected \
  -H "Authorization: Bearer invalid-token" \
  -H "Content-Type: application/json" \
  -d '{"data": "test"}'
# Expected: 401 Unauthorized

# Test 3: Valid token (should succeed or fail gracefully)
curl -X POST https://api.example.com/api/protected \
  -H "Authorization: Bearer sk-valid-key" \
  -H "Content-Type: application/json" \
  -d '{"data": "test"}'
# Expected: 200/400/404 (NOT 401)
```

### Test CORS

```bash
# Test 1: Allowed origin (should work)
curl -X OPTIONS https://api.example.com/api/protected \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -v
# Expected: Access-Control-Allow-Origin header present

# Test 2: Disallowed origin (should be blocked)
curl -X OPTIONS https://api.example.com/api/protected \
  -H "Origin: http://evil-domain.com" \
  -H "Access-Control-Request-Method: POST" \
  -v
# Expected: No Access-Control-Allow-Origin header
```

### Test Secret Protection

```bash
# Check logs don't contain API keys
docker logs service-name | grep -i "sk-\|bearer\|password"
# Expected: No output (nothing found)

# Verify .env is in .gitignore
git check-ignore .env
# Expected: Output: .env

# Verify .env is not committed
git log --all --name-only | grep "^\.env$"
# Expected: No output (not in history)
```

---

## Security Checklist

### Before Deploying to Production

- [ ] All API endpoints require authentication
- [ ] `.env` file is in `.gitignore`
- [ ] CORS uses explicit origins (no wildcard)
- [ ] API key is changed from default/test value
- [ ] Secret rotation policy is documented
- [ ] Error messages don't leak sensitive data
- [ ] Logging doesn't include API keys
- [ ] HTTPS is enabled (TLS/SSL)
- [ ] Rate limiting is configured
- [ ] Monitoring and alerts are set up

### Runtime Monitoring

```bash
# Monitor for authentication failures
docker logs service-name | grep "401\|Unauthorized" | tail -10

# Monitor for CORS violations
docker logs service-name | grep "CORS\|Origin" | tail -10

# Monitor for rate limit hits
docker logs service-name | grep "429\|rate.limit" | tail -10

# Check system health
curl https://api.example.com/health
curl https://api.example.com/metrics
```

---

## Incident Response

### If API Key is Compromised

1. **Immediately rotate:**
   ```bash
   # Generate new key
   openssl rand -hex 16
   
   # Update .env
   echo "CAPTCHA_API_KEY=sk-new-key-$(date +%s)" >> .env
   
   # Restart service
   docker-compose restart
   ```

2. **Audit access:**
   ```bash
   # Check last 100 requests
   docker logs service-name | tail -100 | grep "POST /api"
   
   # Look for suspicious patterns
   docker logs service-name | grep -i "error\|failed\|unauthorized"
   ```

3. **Notify clients:**
   - Email: API consumers with new key
   - Slack: Send incident notification
   - Monitor: Watch for 401 errors from clients

4. **Review:**
   - Which clients used old key?
   - What was accessed?
   - Was sensitive data exposed?

### If Unauthorized Access Detected

1. **Block origin:**
   ```bash
   # Remove from ALLOWED_ORIGINS
   # Restart service
   docker-compose restart
   ```

2. **Enable debug logging:**
   ```bash
   # Set LOG_LEVEL=DEBUG
   # Restart
   docker-compose restart
   
   # Monitor requests
   docker logs -f service-name
   ```

3. **Implement blocking:**
   - IP-based blocking at firewall
   - WAF rules at CDN
   - Rate limiting per origin

---

## References

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [RFC 6750 - Bearer Token Syntax](https://datatracker.ietf.org/doc/html/rfc6750)
- [MDN - CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [12 Factor App - Config](https://12factor.net/config)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)

---

**Last Updated:** 2026-01-30  
**Next Review:** 2026-02-28  
**Status:** ✅ IMPLEMENTED & TESTED
