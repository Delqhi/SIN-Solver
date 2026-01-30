# Quick Start - Rocket.Chat Alertmanager Integration

TL;DR: Get alerts from Prometheus/Alertmanager to Rocket.Chat in 5 minutes

---

## 3 Simple Steps

### Step 1: Create Rocket.Chat Webhooks (2 min)

1. Login to https://delqhi.chat as admin
2. Go to Administration > Workspace > Integrations > New Integration > Incoming Webhook
3. Create 3 webhooks:
   - Name: Alertmanager Critical, Channel: #alerts-critical
   - Name: Alertmanager Warning, Channel: #alerts-warning
   - Name: Alertmanager Info, Channel: #alerts-info
4. Copy the webhook URLs

### Step 2: Configure Environment (1 min)

```bash
cd /Users/jeremy/dev/SIN-Solver/Docker/builders/builder-1.1-captcha-worker/monitoring

# Edit .env with your webhook URLs
cat > .env << 'ENVEOF'
ROCKETCHAT_WEBHOOK_CRITICAL=https://delqhi.chat/hooks/incoming/xxxxx
ROCKETCHAT_WEBHOOK_WARNING=https://delqhi.chat/hooks/incoming/yyyyy
ROCKETCHAT_WEBHOOK_INFO=https://delqhi.chat/hooks/incoming/zzzzz
PORT=8093
DEBUG=false
ENVEOF
```

### Step 3: Start Webhook Adapter (2 min)

**Option A: Standalone**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 rocketchat-webhook.py
```

**Option B: Docker**
```bash
docker-compose up -d
```

---

## Verify It Works

```bash
# Health check
curl http://localhost:8093/health

# Test with sample alert
curl -X POST http://localhost:8093/webhook \
  -H "Content-Type: application/json" \
  -d @test-alert.json

# Check Rocket.Chat for alerts in #alerts-critical
```

---

## Alert Routing

- Critical (P1): #alerts-critical, repeat every 30 min
- Warning (P2): #alerts-warning, repeat every 1 hour
- Info (P3): #alerts-info, repeat every 3 hours

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 8093 in use | Change PORT in .env |
| Flask not found | Run: source venv/bin/activate |
| Webhook not found | Check URLs in .env |
| No alerts in Rocket.Chat | Verify webhook URLs, check logs |

---

See SETUP-GUIDE.md for detailed setup and TESTING-REPORT.md for test results.

Status: Production Ready, 1.0.0
