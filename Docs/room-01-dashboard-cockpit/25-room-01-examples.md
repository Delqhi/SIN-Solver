# Room-01 Dashboard Cockpit - Examples

## Usage Examples

This document provides practical examples of using the Room-01 Dashboard Cockpit.

---

## Basic Operations

### Starting a Container

```bash
# Via API
curl -X POST http://localhost:3011/api/docker/containers/agent-01-n8n-manager/start \
  -H "Authorization: Bearer YOUR_TOKEN"

# Via UI
# 1. Click container in sidebar
# 2. Click "Start" button
```

### Viewing Logs

```bash
# Via API
curl "http://localhost:3011/api/docker/containers/agent-01-n8n-manager/logs?tail=100" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Via UI
# 1. Click container
# 2. Click "Logs" tab
```

### Getting Container Stats

```bash
# Via API
curl http://localhost:3011/api/docker/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Automation Examples

### Auto-Restart Failed Containers

```bash
#!/bin/bash
# scripts/auto-restart.sh

CONTAINERS=$(curl -s http://localhost:3011/api/docker/containers \
  -H "Authorization: Bearer $TOKEN" | jq -r '.containers[] | select(.status == "exited") | .name')

for container in $CONTAINERS; do
  echo "Restarting $container..."
  curl -X POST "http://localhost:3011/api/docker/containers/$container/start" \
    -H "Authorization: Bearer $TOKEN"
done
```

### Daily Health Report

```bash
#!/bin/bash
# scripts/health-report.sh

REPORT=$(curl -s http://localhost:3011/api/docker/containers \
  -H "Authorization: Bearer $TOKEN" | jq -r '
    "Total: " + (.total | tostring) + "\n" +
    "Running: " + (.running | tostring) + "\n" +
    "Stopped: " + (.stopped | tostring)
  ')

echo "$REPORT" | mail -s "Daily Health Report" admin@delqhi-platform.io
```

---

## Integration Examples

### Slack Notification

```javascript
// Send alert when container stops
const { sendSlackNotification } = require('./lib/integrations/slack');

app.post('/api/webhooks/container-status', async (req, res) => {
  const { container, status } = req.body;
  
  if (status === 'exited') {
    await sendSlackNotification(
      `Container ${container} has stopped unexpectedly`
    );
  }
  
  res.json({ received: true });
});
```

### Prometheus Alert

```yaml
# Alert when dashboard is down
- alert: DashboardDown
  expr: up{job="room-01-dashboard"} == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Dashboard is down"
```

---

## Related Documentation

- [05-api-reference.md](./05-room-01-api-reference.md) - API documentation
- [12-integration.md](./12-room-01-integration.md) - Integration guide
