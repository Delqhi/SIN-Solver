# Rocket.Chat Alertmanager Integration - Setup Guide

## 🎯 Quick Start (5 minutes)

### 1. Create Rocket.Chat Webhooks

Login to your Rocket.Chat instance as admin:

1. Navigate to **Administration → Workspace → Integrations**
2. Click **New Integration → Incoming Webhook**
3. Create 3 webhooks:

```
┌─────────────────────────────────────────────────────┐
│ Name: Alertmanager Critical                         │
│ Channel: #alerts-critical                           │
│ Enabled: Yes                                        │
│ Save → Copy webhook URL                             │
│─────────────────────────────────────────────────────┤
│ Name: Alertmanager Warning                          │
│ Channel: #alerts-warning                            │
│ Enabled: Yes                                        │
│ Save → Copy webhook URL                             │
│─────────────────────────────────────────────────────┤
│ Name: Alertmanager Info                             │
│ Channel: #alerts-info                               │
│ Enabled: Yes                                        │
│ Save → Copy webhook URL                             │
└─────────────────────────────────────────────────────┘
```

### 2. Set Environment Variables

```bash
cd /Users/jeremy/dev/SIN-Solver/Docker/builders/builder-1.1-captcha-worker/monitoring

# Copy template
cp .env.example .env

# Edit .env with actual webhook URLs
cat > .env << 'ENVEOF'
ROCKETCHAT_WEBHOOK_CRITICAL=https://your-rocket.chat/hooks/incoming/xxxxx
ROCKETCHAT_WEBHOOK_WARNING=https://your-rocket.chat/hooks/incoming/yyyyy
ROCKETCHAT_WEBHOOK_INFO=https://your-rocket.chat/hooks/incoming/zzzzz
PORT=8093
DEBUG=false
ENVEOF
```

### 3. Create Virtual Environment & Install Dependencies

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Start the Webhook Adapter

```bash
# Development mode
source venv/bin/activate
python3 rocketchat-webhook.py

# Or production mode with gunicorn
source venv/bin/activate
gunicorn -w 4 -b 0.0.0.0:8093 rocketchat-webhook:app
```

### 5. Test the Integration

```bash
# Health check
curl http://localhost:8093/health

# Send test alert
curl -X POST http://localhost:8093/webhook \
  -H "Content-Type: application/json" \
  -d @test-alert.json
```

### 6. Configure Prometheus/Alertmanager

Point Alertmanager to your webhook adapter:

```yaml
# In prometheus/alertmanager.yml
global:
  resolve_timeout: 5m

route:
  receiver: 'rocketchat-warning'
  routes:
    - match:
        severity: critical
      receiver: 'rocketchat-critical'
    - match:
        severity: warning
      receiver: 'rocketchat-warning'
    - match:
        severity: info
      receiver: 'rocketchat-info'

receivers:
  - name: 'rocketchat-critical'
    webhook_configs:
      - url: 'http://localhost:8093/webhook'
  - name: 'rocketchat-warning'
    webhook_configs:
      - url: 'http://localhost:8093/webhook'
  - name: 'rocketchat-info'
    webhook_configs:
      - url: 'http://localhost:8093/webhook'
```

---

## 📁 File Structure

```
monitoring/
├── rocketchat-webhook.py      # Main webhook adapter
├── alertmanager.yml           # Alertmanager config (Rocket.Chat routing)
├── alerting-rules.yml         # Prometheus alert rules
├── requirements.txt           # Python dependencies
├── .env                       # Environment variables (not in git)
├── .env.example              # Template
├── docker-compose.yml         # Docker setup
├── test-alert.json           # Test alert payload
├── test.sh                    # Automated tests
├── README.md                  # Full documentation
└── SETUP-GUIDE.md            # This file
```

---

## 🔧 Webhook Adapter Configuration

**Default Port:** 8093

**Endpoints:**
- `GET /health` - Health check (returns JSON status)
- `POST /webhook` - Accept alerts from Alertmanager

**Environment Variables:**
```bash
ROCKETCHAT_WEBHOOK_CRITICAL     # Critical alerts webhook URL
ROCKETCHAT_WEBHOOK_WARNING      # Warning alerts webhook URL
ROCKETCHAT_WEBHOOK_INFO         # Info alerts webhook URL
PORT                            # Adapter port (default: 8093)
DEBUG                           # Debug logging (true/false)
```

---

## 📊 Alert Routing

| Severity | Channel | Group Wait | Repeat Interval | Priority |
|----------|---------|-----------|-----------------|----------|
| **critical** | #alerts-critical | 0s | 30m | 🔴 P1 |
| **warning** | #alerts-warning | 10s | 1h | 🟡 P2 |
| **info** | #alerts-info | 30s | 3h | 🔵 P3 |

---

## 🧪 Testing

### Test Health Endpoint

```bash
curl http://localhost:8093/health
# Response: {"service":"rocketchat-webhook-adapter","status":"healthy","version":"1.0.0"}
```

### Test with Sample Alert

```bash
curl -X POST http://localhost:8093/webhook \
  -H "Content-Type: application/json" \
  -d @test-alert.json
```

### Expected Response

```json
{"status":"alerts_received","count":2,"severity":"critical"}
```

### Run Full Test Suite

```bash
./test.sh
```

---

## 🚀 Docker Deployment

### Using docker-compose

```bash
docker-compose up -d
```

### Manual Docker Run

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

---

## 🔐 Security Best Practices

### DO's ✅
- Store webhook URLs in `.env` files
- Use HTTPS for all webhook URLs
- Validate incoming payloads
- Log for audit trail
- Use authentication tokens in webhooks

### DON'Ts ❌
- Hardcode webhook URLs
- Commit `.env` to git
- Log sensitive data
- Use HTTP for webhooks
- Expose URLs in error messages

---

## 🐛 Troubleshooting

### Webhook Adapter Won't Start

```bash
# Check logs
cat webhook-adapter.log

# Verify port is free
lsof -i :8093

# Check Python installation
python3 --version
source venv/bin/activate
pip list | grep flask
```

### Health Endpoint Not Responding

```bash
# Verify service is running
ps aux | grep rocketchat-webhook

# Check port binding
netstat -an | grep 8093

# Test localhost
curl -v http://127.0.0.1:8093/health
```

### Alerts Not Reaching Rocket.Chat

```bash
# Check webhook URLs in .env
cat .env | grep ROCKETCHAT

# Test webhook URL directly
curl -X POST https://your-rocket.chat/hooks/incoming/xxxxx \
  -H "Content-Type: application/json" \
  -d '{"text":"Test message"}'

# Check adapter logs for errors
tail -f webhook-adapter.log
```

### DNS Resolution Error

```bash
# Verify Rocket.Chat domain is accessible
ping delqhi.chat
nslookup delqhi.chat

# Check DNS settings
cat /etc/resolv.conf
```

---

## 📈 Monitoring the Adapter

### View Logs

```bash
# Real-time logs
tail -f webhook-adapter.log

# Last 50 lines
tail -50 webhook-adapter.log

# Search for errors
grep "ERROR" webhook-adapter.log
```

### Check Process

```bash
# List Python processes
ps aux | grep python

# Check open ports
lsof -i :8093

# Monitor resource usage
top -p <pid>
```

---

## 🔄 Scaling & HA

### Multiple Instances

```bash
# Start multiple adapters on different ports
PORT=8093 python3 rocketchat-webhook.py
PORT=8094 python3 rocketchat-webhook.py
PORT=8095 python3 rocketchat-webhook.py

# Load balance with nginx
upstream alertmanager_webhooks {
  server 127.0.0.1:8093;
  server 127.0.0.1:8094;
  server 127.0.0.1:8095;
}
```

### Production Deployment with Gunicorn

```bash
gunicorn -w 4 \
  -b 0.0.0.0:8093 \
  --access-logfile webhook-access.log \
  --error-logfile webhook-error.log \
  rocketchat-webhook:app
```

---

## 📞 Support & References

**Alertmanager Documentation:**
https://prometheus.io/docs/alerting/latest/

**Rocket.Chat Webhooks:**
https://developer.rocket.chat/reference/api/webhooks/

**Prometheus Configuration:**
https://prometheus.io/docs/prometheus/latest/configuration/

---

**Last Updated:** 2026-01-30  
**Version:** 1.0.0  
**Status:** Production Ready ✅
