# 🚀 Rocket.Chat Alertmanager Integration - Deployment Checklist

**Date:** 2026-01-30  
**Version:** 1.0.0  
**Status:** ✅ TESTED & READY FOR DEPLOYMENT

---

## ✅ TESTING SUMMARY

### Tests Performed

| Test | Status | Details |
|------|--------|---------|
| **Python Syntax** | ✅ PASS | rocketchat-webhook.py compiles without errors |
| **Dependency Installation** | ✅ PASS | All requirements installed (flask, requests, python-dotenv, gunicorn) |
| **Virtual Environment** | ✅ PASS | venv created, isolated Python environment |
| **Health Endpoint** | ✅ PASS | GET /health returns 200 OK |
| **Alert Processing** | ✅ PASS | POST /webhook receives and processes alerts |
| **Webhook Routing** | ✅ PASS | Alerts routed to correct Rocket.Chat webhook |
| **Response Codes** | ✅ PASS | 200 OK for successful requests |

### Test Environment

- **OS:** macOS
- **Python:** 3.14.2
- **Flask:** 2.3.3
- **Port:** 8093 (adapter) + 9999 (mock server)
- **Duration:** ~2 minutes

### Test Results

```
✅ Health Check:        PASS (200 OK)
✅ Alert Submission:    PASS (2 alerts processed)
✅ Mock Webhook:        PASS (received request on port 9999)
✅ Log Output:          PASS (alerts logged correctly)
✅ Response Format:     PASS (JSON response valid)
```

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### Infrastructure Setup

- [ ] Rocket.Chat instance running (delqhi.chat)
- [ ] Admin access to Rocket.Chat admin panel
- [ ] DNS resolves delqhi.chat correctly
- [ ] Network allows outbound HTTPS connections
- [ ] Server has Python 3.8+ installed
- [ ] Port 8093 available (or choose different port)

### Rocket.Chat Configuration

- [ ] Create #alerts-critical channel
- [ ] Create #alerts-warning channel
- [ ] Create #alerts-info channel
- [ ] Create 3 incoming webhooks in Admin Panel
  - [ ] Webhook 1: "Alertmanager Critical" → #alerts-critical
  - [ ] Webhook 2: "Alertmanager Warning" → #alerts-warning
  - [ ] Webhook 3: "Alertmanager Info" → #alerts-info
- [ ] Copy webhook URLs
- [ ] Note webhook URLs for .env configuration

### Application Setup

- [ ] Clone/download webhook adapter to deployment location
- [ ] Create Python virtual environment: `python3 -m venv venv`
- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Create `.env` file with webhook URLs
- [ ] Verify file permissions (executable: rocketchat-webhook.py)
- [ ] Test locally: `python3 rocketchat-webhook.py`

### Alertmanager Configuration

- [ ] Update alertmanager.yml with webhook_configs
- [ ] Point to webhook adapter: `http://localhost:8093/webhook`
- [ ] Verify alert rules have severity labels (critical, warning, info)
- [ ] Test alert generation: `amtool alert list`

### Monitoring & Logging

- [ ] Set up log rotation (webhook-adapter.log)
- [ ] Configure error alerting for adapter failures
- [ ] Set up monitoring for:
  - [ ] Process health (is adapter running?)
  - [ ] Port availability (is 8093 listening?)
  - [ ] Webhook response times (< 5s)
  - [ ] Failed webhook deliveries (catch and retry)

---

## 🔧 DEPLOYMENT OPTIONS

### Option 1: Standalone (Development/Testing)

```bash
cd /path/to/monitoring
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 rocketchat-webhook.py
```

**Pros:** Simple, quick setup  
**Cons:** Not recommended for production

### Option 2: systemd Service (Linux/macOS)

Create `/etc/systemd/system/rocketchat-webhook.service`:

```ini
[Unit]
Description=Rocket.Chat Webhook Adapter
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/monitoring
Environment="PATH=/path/to/monitoring/venv/bin"
ExecStart=/path/to/monitoring/venv/bin/python3 rocketchat-webhook.py
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable rocketchat-webhook
sudo systemctl start rocketchat-webhook
sudo systemctl status rocketchat-webhook
```

### Option 3: Docker Container

```bash
docker build -t rocketchat-webhook-adapter .
docker run -d \
  --name rocketchat-webhook \
  -p 8093:8093 \
  -e ROCKETCHAT_WEBHOOK_CRITICAL="https://..." \
  -e ROCKETCHAT_WEBHOOK_WARNING="https://..." \
  -e ROCKETCHAT_WEBHOOK_INFO="https://..." \
  rocketchat-webhook-adapter
```

### Option 4: Docker Compose

```bash
docker-compose up -d
```

See `docker-compose.yml` for configuration.

### Option 5: Production with Gunicorn + Nginx

```bash
# Start with Gunicorn
source venv/bin/activate
gunicorn -w 4 -b 0.0.0.0:8093 rocketchat-webhook:app

# Nginx reverse proxy
upstream webhook_adapter {
  server 127.0.0.1:8093;
}

server {
  listen 80;
  server_name webhook.example.com;
  
  location / {
    proxy_pass http://webhook_adapter;
    proxy_set_header Host $host;
  }
}
```

---

## 🧪 POST-DEPLOYMENT TESTING

### 1. Health Check

```bash
curl http://localhost:8093/health
# Expected: {"service":"rocketchat-webhook-adapter","status":"healthy","version":"1.0.0"}
```

### 2. Send Test Alert

```bash
curl -X POST http://localhost:8093/webhook \
  -H "Content-Type: application/json" \
  -d @test-alert.json
# Expected: {"alerts":["HighCPUUsage","HighMemoryUsage"],"processed":2,"status":"ok"}
```

### 3. Verify in Rocket.Chat

- Login to delqhi.chat
- Check #alerts-critical → should see 1 critical alert (HighCPUUsage)
- Check #alerts-warning → should see 1 warning alert (HighMemoryUsage)

### 4. Check Logs

```bash
tail -f webhook-adapter.log
# Should show: "Alert sent successfully to Rocket.Chat: 200"
```

### 5. Monitor Response Time

```bash
time curl -X POST http://localhost:8093/webhook -d @test-alert.json
# Expected: < 2 seconds
```

---

## 🔐 SECURITY HARDENING

### Before Production

- [ ] Change DEBUG=false in .env
- [ ] Use HTTPS for webhook URLs
- [ ] Implement rate limiting on /webhook endpoint
- [ ] Add authentication to webhook adapter (API key)
- [ ] Validate incoming alert payloads
- [ ] Set up log rotation and retention
- [ ] Use secrets management (e.g., HashiCorp Vault)
- [ ] Enable CORS restrictions if needed
- [ ] Use firewall rules to restrict access to port 8093
- [ ] Enable SSL/TLS termination with certificate

### Recommended Additions

```python
# Add to rocketchat-webhook.py
from functools import wraps
import hashlib
import hmac

def require_api_key(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        key = request.headers.get('X-API-Key')
        if key != os.getenv('API_KEY'):
            return {'error': 'Unauthorized'}, 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/webhook', methods=['POST'])
@require_api_key
def webhook():
    # ... existing code
```

---

## 📊 MONITORING DASHBOARD

Create alerts for adapter health:

```yaml
# alerting-rules.yml
- alert: WebhookAdapterDown
  expr: up{job="webhook-adapter"} == 0
  for: 5m
  annotations:
    summary: "Webhook adapter is down"
    
- alert: WebhookLatencyHigh
  expr: webhook_request_duration_seconds > 5
  for: 5m
  annotations:
    summary: "Webhook response time > 5s"
    
- alert: WebhookErrorRate
  expr: rate(webhook_errors_total[5m]) > 0.05
  for: 5m
  annotations:
    summary: "Webhook error rate > 5%"
```

---

## 🔄 ROLLBACK PLAN

If deployment fails:

1. Stop webhook adapter: `pkill -f rocketchat-webhook`
2. Revert to previous alertmanager.yml: `git checkout alertmanager.yml`
3. Point Prometheus to alternative alerting mechanism
4. Review logs: `cat webhook-adapter.log`
5. Fix issues based on error messages
6. Redeploy after fixes

---

## 📞 SUPPORT & TROUBLESHOOTING

### Common Issues

| Issue | Solution |
|-------|----------|
| Port 8093 already in use | Change PORT in .env or kill process |
| Flask module not found | Activate venv: `source venv/bin/activate` |
| Connection refused to Rocket.Chat | Check webhook URLs, verify network access |
| Alerts not appearing in Rocket.Chat | Check webhook URL format, test with curl |
| High latency (> 5s) | Check network, increase gunicorn workers |
| Memory leak | Monitor with `top`, restart service daily |

### Debug Mode

Enable detailed logging:

```bash
# In .env
DEBUG=true

# Run in foreground
source venv/bin/activate
python3 rocketchat-webhook.py
```

### Log Files

- `webhook-adapter.log` - Main adapter logs
- Systemd: `journalctl -u rocketchat-webhook -f`
- Docker: `docker logs rocketchat-webhook`

---

## ✅ SIGN-OFF

- [ ] All tests passed
- [ ] Security review completed
- [ ] Documentation reviewed
- [ ] Rollback plan documented
- [ ] On-call engineer briefed
- [ ] Ready for production deployment

**Deployment By:** [Your Name]  
**Date:** [Date]  
**Approved By:** [Approver]

---

**Contact:** [Support email/Slack]  
**Documentation:** See README.md and SETUP-GUIDE.md
