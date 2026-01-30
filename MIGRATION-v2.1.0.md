# MIGRATION GUIDE: v2.1.0 Security Hardening

**Last Updated:** 2026-01-30  
**Migration Deadline:** 2026-02-02  
**Severity:** 🔴 **CRITICAL** - All API clients must update

---

## 🚨 Overview

SIN-Solver **v2.1.0** introduces **mandatory API authentication** and **CORS hardening**. This is a **breaking change** - all API clients must be updated by **2026-02-02** to continue working.

### What Changed

| Change | Impact | Action Required |
|--------|--------|-----------------|
| **API Authentication** | ✅ REQUIRED | Add `Authorization` header |
| **CORS Origins** | ✅ RESTRICTED | Requests from unlisted origins will fail |
| **Secret Management** | ✅ UPDATED | Use environment variables instead of hardcoded values |
| **Response Format** | ✅ NO CHANGE | Response structure remains identical |
| **Endpoint URLs** | ✅ NO CHANGE | All endpoints remain at same paths |

### Who Is Affected

- ✅ **All external API clients** using `/api/solve` endpoints
- ✅ **All web applications** calling the API
- ✅ **All integrations** with SIN-Solver
- ✅ **Both** user-facing and backend services
- ✅ **Everyone** - no exceptions

### Migration Timeline

| Date | Milestone | Action |
|------|-----------|--------|
| 2026-01-30 | v2.1.0 Released | Update your code now |
| 2026-02-02 | Deadline | Old API key stops working |
| 2026-02-05 | Legacy Support Ends | v2.0.x no longer available |
| 2026-02-10 | v2.0 Sunset | All traffic must be v2.1+ |

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Get Your API Key

Contact your account manager or obtain from:
```
https://delqhi.com/dashboard/api-keys
```

**Your API Key Format:**
```
sk-captcha-worker-production-2026
```

### Step 2: Update Your Environment

Create or update your `.env` file:

```bash
# .env
CAPTCHA_API_KEY=sk-captcha-worker-production-2026
CAPTCHA_API_URL=https://api.delqhi.com
```

### Step 3: Update Your Code

Choose your language and follow the example below.

#### Python (requests library)

**Before v2.1.0:**
```python
import requests

response = requests.post(
    'https://api.delqhi.com/api/solve',
    json={'image': base64_image}
)
```

**After v2.1.0:**
```python
import os
import requests

api_key = os.getenv('CAPTCHA_API_KEY')

response = requests.post(
    'https://api.delqhi.com/api/solve',
    headers={
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    },
    json={'image': base64_image}
)

if response.status_code == 401:
    print("ERROR: Invalid or missing API key")
elif response.status_code == 403:
    print("ERROR: CORS origin not allowed")
elif response.status_code == 200:
    result = response.json()
    print(f"Solution: {result['solution']}")
```

#### JavaScript (fetch)

**Before v2.1.0:**
```javascript
const response = await fetch('https://api.delqhi.com/api/solve', {
  method: 'POST',
  body: JSON.stringify({ image: base64Image })
});
```

**After v2.1.0:**
```javascript
const apiKey = process.env.REACT_APP_CAPTCHA_API_KEY;

const response = await fetch('https://api.delqhi.com/api/solve', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ image: base64Image })
});

if (response.status === 401) {
  console.error('ERROR: Invalid or missing API key');
} else if (response.status === 403) {
  console.error('ERROR: Origin not allowed');
} else if (response.ok) {
  const { solution } = await response.json();
  console.log(`Solution: ${solution}`);
}
```

#### JavaScript (axios)

**Before v2.1.0:**
```javascript
const { data } = await axios.post(
  'https://api.delqhi.com/api/solve',
  { image: base64Image }
);
```

**After v2.1.0:**
```javascript
import axios from 'axios';

const apiKey = process.env.REACT_APP_CAPTCHA_API_KEY;

const client = axios.create({
  baseURL: 'https://api.delqhi.com',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
});

try {
  const { data } = await client.post('/api/solve', {
    image: base64Image
  });
  console.log(`Solution: ${data.solution}`);
} catch (error) {
  if (error.response?.status === 401) {
    console.error('ERROR: Invalid or missing API key');
  } else if (error.response?.status === 403) {
    console.error('ERROR: Origin not allowed');
  } else {
    console.error('ERROR:', error.message);
  }
}
```

#### cURL

**Before v2.1.0:**
```bash
curl -X POST https://api.delqhi.com/api/solve \
  -H "Content-Type: application/json" \
  -d '{"image": "...", "type": "text"}'
```

**After v2.1.0:**
```bash
# Set API key first
export CAPTCHA_API_KEY="sk-captcha-worker-production-2026"

curl -X POST https://api.delqhi.com/api/solve \
  -H "Authorization: Bearer $CAPTCHA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"image": "...", "type": "text"}'

# Or inline:
curl -X POST https://api.delqhi.com/api/solve \
  -H "Authorization: Bearer sk-captcha-worker-production-2026" \
  -H "Content-Type: application/json" \
  -d '{"image": "...", "type": "text"}'
```

#### Go

**Before v2.1.0:**
```go
resp, err := http.Post(
    "https://api.delqhi.com/api/solve",
    "application/json",
    bytes.NewBuffer(payload),
)
```

**After v2.1.0:**
```go
package main

import (
    "bytes"
    "fmt"
    "net/http"
    "os"
)

func main() {
    apiKey := os.Getenv("CAPTCHA_API_KEY")
    
    client := &http.Client{}
    req, _ := http.NewRequest(
        "POST",
        "https://api.delqhi.com/api/solve",
        bytes.NewBuffer(payload),
    )
    
    req.Header.Add("Authorization", fmt.Sprintf("Bearer %s", apiKey))
    req.Header.Add("Content-Type", "application/json")
    
    resp, err := client.Do(req)
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }
    defer resp.Body.Close()
    
    if resp.StatusCode == 401 {
        fmt.Println("ERROR: Invalid or missing API key")
    } else if resp.StatusCode == 200 {
        // Process response
    }
}
```

#### Java

**Before v2.1.0:**
```java
HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.delqhi.com/api/solve"))
    .POST(HttpRequest.BodyPublishers.ofString(payload))
    .build();

HttpResponse<String> response = client.send(request, 
    HttpResponse.BodyHandlers.ofString());
```

**After v2.1.0:**
```java
String apiKey = System.getenv("CAPTCHA_API_KEY");

HttpClient client = HttpClient.newHttpClient();
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.delqhi.com/api/solve"))
    .header("Authorization", "Bearer " + apiKey)
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(payload))
    .build();

HttpResponse<String> response = client.send(request,
    HttpResponse.BodyHandlers.ofString());

if (response.statusCode() == 401) {
    System.out.println("ERROR: Invalid or missing API key");
} else if (response.statusCode() == 200) {
    // Process response
}
```

### Step 4: Test Your Changes

```bash
# Test with cURL
curl -X POST https://api.delqhi.com/api/solve \
  -H "Authorization: Bearer $CAPTCHA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "iVBORw0KGgoAAAANSUhEUgAA...",
    "type": "text"
  }'

# Expected response (200 OK):
{
  "solution": "ABCD1234",
  "confidence": 0.95,
  "response_code": 0
}
```

### Step 5: Deploy Updated Code

Once tests pass locally, deploy to your staging environment first:

```bash
# 1. Stage the changes
git add .
git commit -m "chore: Update API calls for v2.1.0 authentication"

# 2. Deploy to staging
git push origin staging

# 3. Run integration tests
pytest tests/integration/test_captcha_api.py

# 4. If all tests pass, deploy to production
git push origin main
```

---

## 📊 Step-by-Step Detailed Guide

### Phase 1: Understanding the Changes (10 mins)

1. **Read the release notes:** [v2.1.0-SECURITY-HARDENING.md](./RELEASES/v2.1.0-SECURITY-HARDENING.md)
2. **Review security guide:** [SECURITY.md](./Docker/builders/builder-1.1-captcha-worker/SECURITY.md)
3. **Check API docs:** [API-SECURITY.md](./Docs/API-SECURITY.md)

### Phase 2: Environment Setup (5 mins)

1. **Get API key** from your dashboard or account manager
2. **Create `.env` file:**
   ```bash
   cp .env.example .env
   nano .env  # Edit with your API key
   ```
3. **Add to `.gitignore` (if not already there):**
   ```bash
   .env
   *.key
   secrets/
   ```

### Phase 3: Code Updates (15-30 mins depending on codebase size)

1. **Identify all API calls** to `/api/solve*` endpoints
2. **Add Authorization header** to each request
3. **Load API key from environment** (never hardcode)
4. **Update error handling** for 401/403 responses
5. **Remove any API key from codebase** (use .env instead)

### Phase 4: Testing (10-20 mins)

1. **Test locally:**
   ```bash
   # Set environment variable
   export CAPTCHA_API_KEY="sk-captcha-worker-production-2026"
   
   # Run your application
   npm start  # or python app.py, etc.
   
   # Test API call
   curl -X POST https://api.delqhi.com/api/solve \
     -H "Authorization: Bearer $CAPTCHA_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"image": "...", "type": "text"}'
   ```

2. **Write integration tests:**
   ```python
   def test_api_authentication():
       """Test that API requires valid authentication"""
       # Without auth header - should fail with 401
       response = requests.post(
           'https://api.delqhi.com/api/solve',
           json={'image': base64_image}
       )
       assert response.status_code == 401
       
       # With auth header - should succeed
       response = requests.post(
           'https://api.delqhi.com/api/solve',
           headers={'Authorization': f'Bearer {api_key}'},
           json={'image': base64_image}
       )
       assert response.status_code == 200
   ```

3. **Run full test suite:**
   ```bash
   pytest tests/
   ```

### Phase 5: Deployment (5-10 mins)

1. **Deploy to staging environment**
2. **Run smoke tests** in staging
3. **Get approval** from team/security
4. **Deploy to production**
5. **Monitor** for errors in production

---

## 🔍 Common Issues & Troubleshooting

### Issue 1: 401 Unauthorized Error

**Error Message:**
```
HTTP 401 Unauthorized
Response: {"error": "Missing or invalid authorization header"}
```

**Causes:**
- Missing `Authorization` header
- Invalid API key format
- API key expired or revoked
- API key typo

**Solutions:**
```python
# ✅ CORRECT - Full header
headers = {
    'Authorization': 'Bearer sk-captcha-worker-production-2026',
    'Content-Type': 'application/json'
}

# ❌ WRONG - Missing 'Bearer' keyword
headers = {
    'Authorization': 'sk-captcha-worker-production-2026'  # Missing 'Bearer'
}

# ❌ WRONG - Missing header entirely
# (no Authorization header at all)

# ❌ WRONG - Expired key
headers = {
    'Authorization': 'Bearer sk-captcha-worker-production-2024'  # Old key
}
```

**Verification:**
```bash
# Verify your API key is correct
echo $CAPTCHA_API_KEY

# Should output:
# sk-captcha-worker-production-2026

# If not set, set it:
export CAPTCHA_API_KEY="sk-captcha-worker-production-2026"

# Test with curl
curl -v -X POST https://api.delqhi.com/api/solve \
  -H "Authorization: Bearer $CAPTCHA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"image": "test", "type": "text"}'
  
# Look for response headers:
# < HTTP/1.1 200 OK  (success)
# < HTTP/1.1 401 Unauthorized  (auth failed)
```

### Issue 2: 403 Forbidden (CORS Error)

**Error Message:**
```
HTTP 403 Forbidden
Response: {"error": "Origin not in CORS whitelist"}
```

**Causes:**
- Your domain is not in the CORS whitelist
- Request made from different origin than configured
- Protocol mismatch (http vs https)
- Port mismatch (3000 vs 3001)

**Solutions:**

1. **Check your current origin:**
   ```javascript
   // In browser console
   console.log(window.location.origin);
   // Output: http://localhost:3000
   ```

2. **Request addition to CORS whitelist:**
   - Email: support@delqhi.com
   - Include your domain/origin
   - Specify if you need http or https
   - Provide your use case

3. **Temporary workaround (development only):**
   ```javascript
   // Use backend proxy to forward requests
   // Your app (3000) → Your backend (5000) → API (delqhi.com)
   
   // In your backend:
   const response = await fetch('https://api.delqhi.com/api/solve', {
     headers: {
       'Authorization': `Bearer ${api_key}`
     }
   });
   ```

4. **Check CORS headers:**
   ```bash
   # See what origins are allowed
   curl -i -X OPTIONS https://api.delqhi.com/api/solve
   
   # Look for these headers in response:
   # Access-Control-Allow-Origin: http://localhost:3000
   # Access-Control-Allow-Methods: POST, GET, OPTIONS
   # Access-Control-Allow-Headers: Authorization, Content-Type
   ```

### Issue 3: API Key in Response Errors

**Problem:**
```
curl output shows your API key in error messages:
HTTP/1.1 500 Internal Server Error
Error details: ...Bearer sk-captcha-worker-production-2026...
```

**Solution:**
- Never share error messages with API key visible
- Don't log full request headers in production
- Use log filtering to redact sensitive data
- Report to security@delqhi.com if API key is exposed

### Issue 4: Different Environments Have Different Keys

**Problem:**
```
Development: sk-captcha-worker-development-2026
Staging: sk-captcha-worker-staging-2026
Production: sk-captcha-worker-production-2026
```

**Solution:**
```bash
# Use environment-specific configuration

# .env.local (development)
CAPTCHA_API_KEY=sk-captcha-worker-development-2026

# .env.staging (staging)
CAPTCHA_API_KEY=sk-captcha-worker-staging-2026

# .env.production (production)
CAPTCHA_API_KEY=sk-captcha-worker-production-2026

# Load based on NODE_ENV
const apiKey = process.env[`CAPTCHA_API_KEY_${process.env.NODE_ENV.toUpperCase()}`];
// or use package like dotenv-flow
```

### Issue 5: Batch API Still Uses Old Format

**Problem:**
```python
# Old format (v2.0)
response = requests.post(
    'https://api.delqhi.com/api/solve/batch',
    json={
        'images': [img1, img2, img3]
    }
)
```

**Solution:**
```python
# New format (v2.1.0)
api_key = os.getenv('CAPTCHA_API_KEY')

response = requests.post(
    'https://api.delqhi.com/api/solve/batch',
    headers={
        'Authorization': f'Bearer {api_key}',
        'Content-Type': 'application/json'
    },
    json={
        'images': [img1, img2, img3]
    }
)
```

---

## ✅ Verification Checklist

Before going live, verify:

### Code Changes
- [ ] All `/api/solve*` endpoints have `Authorization` header
- [ ] API key is loaded from environment variable
- [ ] No hardcoded API keys in source code
- [ ] Error handling for 401 and 403 responses added
- [ ] All authentication headers use `Bearer {api_key}` format

### Environment Setup
- [ ] `.env` file created with correct API key
- [ ] `.env` file added to `.gitignore`
- [ ] Environment variable `CAPTCHA_API_KEY` set on server
- [ ] Different keys for dev/staging/production configured

### Testing
- [ ] Local testing with authentication passes
- [ ] Integration tests written and passing
- [ ] Staging deployment tested
- [ ] Production API key verified
- [ ] 401 error handling tested
- [ ] 403 CORS error handling tested
- [ ] Batch API tested with new authentication

### Deployment
- [ ] Code reviewed by team member
- [ ] All tests passing in CI/CD
- [ ] Staging deployment successful
- [ ] Staging smoke tests passing
- [ ] Production deployment scheduled
- [ ] Monitoring configured for auth errors
- [ ] Team notified of deployment

### Post-Deployment
- [ ] Monitor for 401/403 errors in production
- [ ] Check application logs for auth issues
- [ ] Verify no API keys in logs
- [ ] Set up alerts for high 401 error rate
- [ ] Document any issues encountered

---

## 🎯 Testing Your Migration

### Local Testing Script

```bash
#!/bin/bash
# test-migration.sh

set -e

echo "🧪 Testing v2.1.0 Migration..."

# Test 1: Check environment variable
echo "Test 1: Checking API key environment variable..."
if [ -z "$CAPTCHA_API_KEY" ]; then
    echo "❌ FAILED: CAPTCHA_API_KEY not set"
    exit 1
fi
echo "✅ PASSED: API key is set"

# Test 2: Test without authentication (should fail)
echo "Test 2: Testing without authentication (should get 401)..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST https://api.delqhi.com/api/solve \
  -H "Content-Type: application/json" \
  -d '{"image": "test", "type": "text"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ PASSED: Got expected 401 Unauthorized"
else
    echo "❌ FAILED: Expected 401, got $HTTP_CODE"
    exit 1
fi

# Test 3: Test with authentication (should succeed)
echo "Test 3: Testing with valid authentication..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST https://api.delqhi.com/api/solve \
  -H "Authorization: Bearer $CAPTCHA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "image": "iVBORw0KGgoAAAANSUhEUgAA...",
    "type": "text"
  }')
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ PASSED: Got expected 200 OK"
else
    echo "⚠️  FAILED: Expected 200, got $HTTP_CODE"
    echo "Note: This could be due to invalid image format, not authentication"
fi

# Test 4: Verify API key format
echo "Test 4: Verifying API key format..."
if [[ $CAPTCHA_API_KEY == sk-captcha-worker-* ]]; then
    echo "✅ PASSED: API key has correct format"
else
    echo "❌ FAILED: API key format is incorrect"
    exit 1
fi

echo ""
echo "🎉 All migration tests passed!"
echo ""
echo "Next steps:"
echo "1. Deploy updated code to production"
echo "2. Monitor logs for authentication errors"
echo "3. Verify no API keys in logs"
```

**Run the test:**
```bash
chmod +x test-migration.sh
export CAPTCHA_API_KEY="sk-captcha-worker-production-2026"
./test-migration.sh
```

---

## 🚀 Rollback Procedure

If something goes wrong and you need to revert:

### Immediate Rollback (if v2.0.x still available)

```bash
# Option 1: Revert to previous API version
# If v2.0.x endpoint still active:
curl -X POST https://api.delqhi.com/api/v2.0/solve \
  -H "Content-Type: application/json" \
  -d '{"image": "...", "type": "text"}'

# Option 2: Revert your client code
git revert HEAD  # Undo last commit
git push origin main
```

### Longer-term Rollback

```bash
# Contact support immediately
# Email: support@delqhi.com
# Subject: v2.1.0 Rollback Request

# They can:
# 1. Issue new API key on old v2.0 endpoint
# 2. Keep old endpoint active longer
# 3. Provide assistance with migration
```

### Staying on v2.0 (Not Recommended)

```bash
# DO NOT do this - v2.0 will be sunset in 10 days
# Please migrate to v2.1.0 instead

# If you absolutely must stay on v2.0:
# 1. Contact support@delqhi.com
# 2. Provide detailed reason
# 3. Request extended v2.0 support
# 4. SLA may change for v2.0 requests
```

---

## 📞 Getting Help

### Support Channels

| Channel | Use For | Response Time |
|---------|---------|----------------|
| **Email** | General questions | 4-24 hours |
| **Slack** | Urgent issues | 1 hour |
| **GitHub Issues** | Feature requests | 24-48 hours |
| **Phone** | Critical outages | Immediate |

### Contact Information

- **Email:** support@delqhi.com
- **Slack:** #sin-solver-support
- **Phone:** +1-555-DELQHI-1 (24/7 for critical issues)
- **Status Page:** status.delqhi.com

### Escalation Path

1. Email support@delqhi.com with:
   - Your API key (last 4 chars only)
   - Error message
   - Steps to reproduce
   - Your environment (dev/staging/prod)

2. If no response in 4 hours, escalate to:
   - Slack: @support-team
   - Phone: +1-555-DELQHI-1

3. If still unresolved:
   - Email: escalations@delqhi.com
   - Include all previous communications

---

## 📚 Additional Resources

| Resource | Purpose | Link |
|----------|---------|------|
| **Release Notes** | v2.1.0 details | [RELEASES/v2.1.0-SECURITY-HARDENING.md](./RELEASES/v2.1.0-SECURITY-HARDENING.md) |
| **Security Guide** | Auth & CORS details | [SECURITY.md](./Docker/builders/builder-1.1-captcha-worker/SECURITY.md) |
| **API Security** | Advanced security topics | [API-SECURITY.md](./Docs/API-SECURITY.md) |
| **API Reference** | Complete API docs | [API-REFERENCE.md](./docs/API-REFERENCE.md) |
| **Security Tests** | Test suite | [test-security.sh](./Docker/builders/builder-1.1-captcha-worker/test-security.sh) |
| **Code Examples** | Sample implementations | [docs/examples/](./docs/examples/) |

---

## 🎓 FAQ

### Q: Will my old API key still work after 2026-02-02?
**A:** No. All requests must include a valid Bearer token with the new authentication scheme.

### Q: Can I request an extension to the migration deadline?
**A:** Extensions are available for enterprise customers. Contact support@delqhi.com with your request and use case.

### Q: Do I need to change my database?
**A:** No. v2.1.0 is backward compatible with v2.0 data. Only the API authentication layer changed.

### Q: Will the response format change?
**A:** No. Response format remains identical to v2.0. Only authentication is different.

### Q: What if I lose my API key?
**A:** Contact support@delqhi.com and they can issue a new one. Old key will be revoked.

### Q: Can I use the same API key in dev and production?
**A:** Technically yes, but not recommended. Use separate keys for different environments.

### Q: What if I make a request from a restricted origin?
**A:** You'll get a 403 Forbidden error. Email support@delqhi.com to add your origin to the whitelist.

### Q: How do I test the authentication locally?
**A:** Use the test scripts provided in this guide. Run:
```bash
export CAPTCHA_API_KEY="sk-captcha-worker-production-2026"
./test-migration.sh
```

### Q: What's the performance impact of authentication?
**A:** < 1ms. Bearer token validation is extremely lightweight.

### Q: Do I need to rotate my API key regularly?
**A:** Yes, recommended quarterly. Contact support@delqhi.com for key rotation.

---

## ✨ Summary

| What | Before v2.1.0 | After v2.1.0 | Your Action |
|------|----------------|--------------|------------|
| **API Authentication** | Optional | Required | Add Bearer header |
| **API Key Format** | N/A | `sk-captcha-worker-*` | Use provided key |
| **CORS Policy** | Wildcard `*` | Explicit whitelist | Request origin addition |
| **Secret Storage** | Hardcoded or env | Environment only | Move to .env |
| **Deadline** | N/A | 2026-02-02 | **Update NOW** |

---

**Questions? Contact support@delqhi.com**

**For detailed security information, see:** [RELEASES/v2.1.0-SECURITY-HARDENING.md](./RELEASES/v2.1.0-SECURITY-HARDENING.md)
