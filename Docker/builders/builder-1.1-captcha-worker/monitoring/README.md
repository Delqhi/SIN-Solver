# Rocket.Chat Alertmanager Configuration

This directory contains the Alertmanager configuration for Rocket.Chat integration.

## Files

- **alertmanager.yml** - Main Alertmanager configuration with Rocket.Chat webhooks
- **rocketchat-webhook.py** - Python adapter to format alerts for Rocket.Chat
- **requirements.txt** - Python dependencies
- **.env.example** - Environment variable template

## Setup

### 1. Create Rocket.Chat Webhooks

In Rocket.Chat admin panel, create three webhooks:

**Critical Channel (#alerts-critical):**
1. Go to Administration → Workspace → Integrations
2. Create New Integration → Incoming Webhook
3. Set Name: "Alertmanager Critical"
4. Channel: #alerts-critical
5. Copy webhook URL to `ROCKETCHAT_WEBHOOK_CRITICAL`

**Warning Channel (#alerts-warning):**
1. Repeat above for #alerts-warning
2. Copy webhook URL to `ROCKETCHAT_WEBHOOK_WARNING`

**Info Channel (#alerts-info):**
1. Repeat above for #alerts-info
2. Copy webhook URL to `ROCKETCHAT_WEBHOOK_INFO`

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your Rocket.Chat URLs:

```bash
ROCKETCHAT_WEBHOOK_CRITICAL=https://delqhi.chat/hooks/incoming/...
ROCKETCHAT_WEBHOOK_WARNING=https://delqhi.chat/hooks/incoming/...
ROCKETCHAT_WEBHOOK_INFO=https://delqhi.chat/hooks/incoming/...
```

### 3. Start Webhook Adapter

```bash
# Install dependencies
pip install -r requirements.txt

# Run webhook adapter
python rocketchat-webhook.py
```

Default: Listens on `0.0.0.0:8093`

### 4. Configure Alertmanager

In your Alertmanager `alertmanager.yml`:

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'severity']
  receiver: 'rocketchat-warning'
  routes:
    - match:
        severity: critical
      receiver: 'rocketchat-critical'
    - match:
        severity: info
      receiver: 'rocketchat-info'

receivers:
  - name: 'rocketchat-critical'
    webhook_configs:
      - url: 'http://localhost:8093/webhook'
        send_resolved: true

  - name: 'rocketchat-warning'
    webhook_configs:
      - url: 'http://localhost:8093/webhook'
        send_resolved: true

  - name: 'rocketchat-info'
    webhook_configs:
      - url: 'http://localhost:8093/webhook'
        send_resolved: true
```

### 5. Test Configuration

```bash
# Test webhook endpoint
curl http://localhost:8093/health

# Send test alert
curl -X POST http://localhost:8093/webhook \
  -H "Content-Type: application/json" \
  -d @test-alert.json
```

## Alert Severity Levels

| Level | Channel | Color | Emoji | Priority |
|-------|---------|-------|-------|----------|
| **critical** | #alerts-critical | 🔴 Red | 🔴 | P1 - High |
| **warning** | #alerts-warning | 🟡 Orange | 🟡 | P2 - Medium |
| **info** | #alerts-info | 🔵 Blue | 🔵 | P3 - Low |

## Alert Suppression

The configuration includes inhibit rules to prevent alert storms:
- Critical alerts suppress warning alerts for same alertname
- Warning alerts suppress info alerts for same alertname

## Troubleshooting

### Webhook Not Receiving Alerts

1. Check Alertmanager is running: `curl http://prometheus:9090/-/healthy`
2. Check Alertmanager config is valid: `amtool config routes`
3. Check webhook adapter logs: `docker logs <container>`
4. Test webhook endpoint: `curl http://localhost:8093/health`

### Alerts Not Appearing in Rocket.Chat

1. Verify webhook URLs are correct
2. Check Rocket.Chat webhook is enabled (Integration → Active)
3. Check Rocket.Chat logs for errors
4. Test with curl: `curl -X POST <WEBHOOK_URL> -H "Content-Type: application/json" -d '{"text":"test"}'`

### High Alert Volume

Adjust grouping and repeat intervals in `alertmanager.yml`:
- Increase `group_wait` to batch more alerts
- Increase `repeat_interval` to reduce re-notifications
- Use inhibit rules to suppress less critical alerts

## Docker Integration

Mount this directory into your Prometheus/Alertmanager container:

```yaml
volumes:
  - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
  - ./monitoring/rocketchat-webhook.py:/app/rocketchat-webhook.py:ro
```

And start the webhook adapter as a separate service in docker-compose.yml:

```yaml
services:
  rocketchat-webhook:
    image: python:3.11-slim
    working_dir: /app
    command: python rocketchat-webhook.py
    ports:
      - "8093:8093"
    environment:
      ROCKETCHAT_WEBHOOK_CRITICAL: ${ROCKETCHAT_WEBHOOK_CRITICAL}
      ROCKETCHAT_WEBHOOK_WARNING: ${ROCKETCHAT_WEBHOOK_WARNING}
      ROCKETCHAT_WEBHOOK_INFO: ${ROCKETCHAT_WEBHOOK_INFO}
    volumes:
      - ./monitoring/rocketchat-webhook.py:/app/rocketchat-webhook.py:ro
      - ./monitoring/requirements.txt:/app/requirements.txt:ro
    restart: always
```

## References

- [Alertmanager Webhook Format](https://prometheus.io/docs/alerting/latest/configuration/#webhook_config)
- [Rocket.Chat Webhooks](https://developer.rocket.chat/reference/api/webhooks)
- [Prometheus Alerting](https://prometheus.io/docs/alerting/latest/overview/)
