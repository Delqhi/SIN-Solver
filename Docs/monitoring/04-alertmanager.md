# 🚨 AlertManager - Alert Routing & Notifications

> **Centralized Alert Management for SIN-Solver**

**Service:** room-27-alertmanager-alerts  
**Port:** 9093  
**Domain:** alerts.delqhi.com  
**Version:** v0.25.0  
**Status:** ✅ Active

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Routing](#routing)
5. [Notification Channels](#notification-channels)
6. [Silences](#silences)
7. [API Reference](#api-reference)
8. [Troubleshooting](#troubleshooting)

---

## Overview

AlertManager handles alerts from Prometheus and Grafana, providing:

- **Alert Routing:** Route alerts based on labels
- **Deduplication:** Remove duplicate alerts
- **Grouping:** Group related alerts
- **Inhibition:** Suppress related alerts
- **Silencing:** Mute alerts temporarily
- **Notifications:** Send to multiple channels

### Key Features

| Feature | Description |
|---------|-------------|
| **Routing Tree** | Hierarchical alert routing |
| **Grouping** | Group by alertname, severity, etc. |
| **Inhibition** | Suppress warning if critical fires |
| **Silences** | Temporary alert muting |
| **Multi-channel** | Slack, PagerDuty, Email, Webhooks |
| **Templates** | Custom notification formatting |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ALERTMANAGER ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    ALERT RECEPTION                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │  │
│  │  │  Prometheus │  │   Grafana   │  │   Other Sources │  │  │
│  │  │  (Primary)  │  │  (Unified)  │  │   (Webhooks)    │  │  │
│  │  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │  │
│  │         │                │                   │          │  │
│  │         └────────────────┴───────────────────┘          │  │
│  │                          │                              │  │
│  │                          ▼                              │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │              ALERT PROCESSING PIPELINE            │  │  │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │  │  │
│  │  │  │  Deduplicate│  │   Group     │  │  Inhibit  │ │  │  │
│  │  │  │  (fingerprint)│  │  (labels)  │  │  (rules)  │ │  │  │
│  │  │  └─────────────┘  └─────────────┘  └───────────┘ │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                          │                              │  │
│  │                          ▼                              │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │              ROUTING ENGINE                       │  │  │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │  │  │
│  │  │  │  Route Tree │  │  Matchers   │  │  Continue │ │  │  │
│  │  │  │  (hierarchical)│ (label-based)│  │  (chains) │ │  │  │
│  │  │  └─────────────┘  └─────────────┘  └───────────┘ │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                          │                              │  │
│  │                          ▼                              │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │              NOTIFICATION DISPATCH                │  │  │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐ │  │  │
│  │  │  │  Slack   │ │PagerDuty │ │  Email   │ │Webhook│ │  │  │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────┘ │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                                                              │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Installation

### Docker Compose

```yaml
# Docker/rooms/room-27-alertmanager/docker-compose.yml
version: '3.8'

services:
  room-27-alertmanager-alerts:
    image: prom/alertmanager:v0.25.0
    container_name: room-27-alertmanager-alerts
    hostname: room-27-alertmanager-alerts
    restart: unless-stopped
    ports:
      - "9093:9093"
    volumes:
      - ./config/alertmanager.yml:/etc/alertmanager/alertmanager.yml:ro
      - ./config/templates:/etc/alertmanager/templates:ro
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
      - '--web.external-url=https://alerts.delqhi.com'
      - '--web.route-prefix=/'
      - '--cluster.listen-address=0.0.0.0:9094'
      - '--log.level=info'
    networks:
      - sin-network
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider http://localhost:9093/-/healthy || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

volumes:
  alertmanager_data:
    driver: local

networks:
  sin-network:
    external: true
```

### Start Service

```bash
# Start AlertManager
cd /Users/jeremy/dev/SIN-Solver/Docker/rooms/room-27-alertmanager
docker-compose up -d

# Verify status
docker-compose ps
docker logs room-27-alertmanager-alerts

# Access UI
open https://alerts.delqhi.com
```

---

## Configuration

### Main Configuration (alertmanager.yml)

```yaml
# config/alertmanager.yml
global:
  # Default SMTP settings
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@delqhi.com'
  smtp_auth_username: 'alerts@delqhi.com'
  smtp_auth_password: '${SMTP_PASSWORD}'
  
  # Slack API URL
  slack_api_url: '${SLACK_WEBHOOK_URL}'
  
  # PagerDuty integration key
  pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'
  
  # HipChat, OpsGenie, VictorOps settings...
  
  # Resolve timeout
  resolve_timeout: 5m

# Templates for notification formatting
templates:
  - '/etc/alertmanager/templates/*.tmpl'

# Inhibition rules - suppress less severe alerts
inhibit_rules:
  # If critical alert fires, suppress warning for same service
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['job', 'instance']
  
  # If service is down, suppress high latency alerts
  - source_match:
      alertname: 'ServiceDown'
    target_match_re:
      alertname: 'HighLatency|HighErrorRate'
    equal: ['job']

# Routing tree
route:
  # Default receiver
  receiver: 'default'
  
  # Group alerts by these labels
  group_by: ['alertname', 'job', 'severity']
  
  # Wait before sending notification (allows grouping)
  group_wait: 30s
  
  # Interval between notifications for same group
  group_interval: 5m
  
  # Interval to resend resolved notification
  repeat_interval: 4h
  
  # Routes
  routes:
    # Critical alerts → PagerDuty + Slack
    - match:
        severity: critical
      receiver: pagerduty-critical
      continue: true
      routes:
        - receiver: slack-critical
    
    # Warning alerts → Slack only
    - match:
        severity: warning
      receiver: slack-warnings
      group_wait: 1m
      group_interval: 10m
      repeat_interval: 12h
    
    # Info alerts → Email digest
    - match:
        severity: info
      receiver: email-digest
      group_wait: 5m
      group_interval: 1h
      repeat_interval: 24h
    
    # Platform team alerts
    - match_re:
        team: platform|sre
      receiver: platform-team
      routes:
        - match:
            severity: critical
          receiver: pagerduty-platform
    
    # Database alerts → DBA team
    - match_re:
        job: room-03-postgres.*|room-04-redis.*
      receiver: dba-team
      routes:
        - match:
            severity: critical
          receiver: pagerduty-dba
    
    # Security alerts → Security team
    - match:
        category: security
      receiver: security-team
      routes:
        - match:
            severity: critical
          receiver: pagerduty-security

# Receivers (notification channels)
receivers:
  # Default receiver
  - name: 'default'
    email_configs:
      - to: 'platform@delqhi.com'
        subject: '{{ template "email.default.subject" . }}'
        body: '{{ template "email.default.body" . }}'
        send_resolved: true

  # PagerDuty - Critical
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_CRITICAL_KEY}'
        severity: critical
        description: '{{ .GroupLabels.alertname }}: {{ .CommonAnnotations.summary }}'
        details:
          firing: '{{ template "pagerduty.default.instances" .Alerts.Firing }}'
          resolved: '{{ template "pagerduty.default.instances" .Alerts.Resolved }}'
        send_resolved: true

  # PagerDuty - Platform
  - name: 'pagerduty-platform'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_PLATFORM_KEY}'
        severity: '{{ .CommonLabels.severity }}'
        description: '{{ .GroupLabels.alertname }}: {{ .CommonAnnotations.summary }}'
        send_resolved: true

  # PagerDuty - DBA
  - name: 'pagerduty-dba'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_DBA_KEY}'
        severity: '{{ .CommonLabels.severity }}'
        description: 'DB Alert: {{ .CommonAnnotations.summary }}'
        send_resolved: true

  # PagerDuty - Security
  - name: 'pagerduty-security'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_SECURITY_KEY}'
        severity: critical
        description: 'Security: {{ .CommonAnnotations.summary }}'
        send_resolved: true

  # Slack - Critical
  - name: 'slack-critical'
    slack_configs:
      - channel: '#alerts-critical'
        username: 'AlertManager'
        icon_emoji: ':fire:'
        title: '{{ template "slack.default.title" . }}'
        text: '{{ template "slack.default.text" . }}'
        send_resolved: true
        actions:
          - type: button
            text: 'Runbook'
            url: '{{ .CommonAnnotations.runbook_url }}'
          - type: button
            text: 'Dashboard'
            url: '{{ .CommonAnnotations.dashboard_url }}'
          - type: button
            text: 'Silence'
            url: '{{ .ExternalURL }}/#/silences/new?filter=%7B{{ .CommonLabels | urlquery }}%7D'

  # Slack - Warnings
  - name: 'slack-warnings'
    slack_configs:
      - channel: '#alerts-warnings'
        username: 'AlertManager'
        icon_emoji: ':warning:'
        title: '{{ template "slack.warning.title" . }}'
        text: '{{ template "slack.warning.text" . }}'
        send_resolved: true

  # Platform Team
  - name: 'platform-team'
    slack_configs:
      - channel: '#platform-alerts'
        username: 'AlertManager'
        icon_emoji: ':gear:'
        title: '{{ template "slack.default.title" . }}'
        text: '{{ template "slack.default.text" . }}'
        send_resolved: true
    email_configs:
      - to: 'platform@delqhi.com'
        subject: '[Platform] {{ .GroupLabels.alertname }}'
        send_resolved: true

  # DBA Team
  - name: 'dba-team'
    slack_configs:
      - channel: '#dba-alerts'
        username: 'AlertManager'
        icon_emoji: ':database:'
        title: 'DB Alert: {{ .GroupLabels.alertname }}'
        text: '{{ template "slack.default.text" . }}'
        send_resolved: true
    email_configs:
      - to: 'dba@delqhi.com'
        subject: '[DBA] {{ .GroupLabels.alertname }}'
        send_resolved: true

  # Security Team
  - name: 'security-team'
    slack_configs:
      - channel: '#security-alerts'
        username: 'AlertManager'
        icon_emoji: ':lock:'
        title: 'Security: {{ .GroupLabels.alertname }}'
        text: '{{ template "slack.security.text" . }}'
        send_resolved: true
    email_configs:
      - to: 'security@delqhi.com'
        subject: '[SECURITY] {{ .GroupLabels.alertname }}'
        send_resolved: true

  # Email Digest
  - name: 'email-digest'
    email_configs:
      - to: 'alerts@delqhi.com'
        subject: '[SIN-Solver] Daily Alert Digest'
        headers:
          Importance: low
        send_resolved: false

  # Webhook - Custom integration
  - name: 'webhook-custom'
    webhook_configs:
      - url: 'https://api.delqhi.com/webhooks/alerts'
        send_resolved: true
        http_config:
          bearer_token: '${WEBHOOK_TOKEN}'
```

### Notification Templates

```go
// config/templates/default.tmpl
{{ define "email.default.subject" }}[{{ .Status | toUpper }}] {{ .GroupLabels.alertname }} ({{ .Alerts.Firing | len }} firing){{ end }}

{{ define "email.default.body" }}
Alert: {{ .GroupLabels.alertname }}
Status: {{ .Status | toUpper }}
Severity: {{ .CommonLabels.severity }}

{{ range .Alerts.Firing }}
---
Alert: {{ .Labels.alertname }}
Instance: {{ .Labels.instance }}
Job: {{ .Labels.job }}
Severity: {{ .Labels.severity }}

Summary: {{ .Annotations.summary }}
Description: {{ .Annotations.description }}
Runbook: {{ .Annotations.runbook_url }}

Started: {{ .StartsAt }}
{{ end }}

{{ range .Alerts.Resolved }}
---
RESOLVED: {{ .Labels.alertname }}
Instance: {{ .Labels.instance }}
Resolved at: {{ .EndsAt }}
{{ end }}
{{ end }}

{{ define "slack.default.title" }}{{ .Status | toUpper }}: {{ .GroupLabels.alertname }}{{ end }}

{{ define "slack.default.text" }}
{{ range .Alerts.Firing }}
*Alert:* {{ .Labels.alertname }}
*Instance:* {{ .Labels.instance }}
*Severity:* {{ .Labels.severity }}
*Summary:* {{ .Annotations.summary }}
*Started:* {{ .StartsAt | since }}
{{ end }}
{{ end }}

{{ define "slack.warning.title" }}⚠️ {{ .GroupLabels.alertname }}{{ end }}

{{ define "slack.warning.text" }}
{{ range .Alerts.Firing }}
*{{ .Labels.alertname }}* on {{ .Labels.instance }}
{{ .Annotations.summary }}
{{ end }}
{{ end }}

{{ define "slack.security.text" }}
🚨 SECURITY ALERT 🚨
{{ range .Alerts.Firing }}
*Alert:* {{ .Labels.alertname }}
*Severity:* {{ .Labels.severity }}
*Description:* {{ .Annotations.description }}
{{ end }}
{{ end }}

{{ define "pagerduty.default.instances" }}{{ range . }}{{ .Labels.instance }} {{ end }}{{ end }}
```

---

## Routing

### Routing Tree Visualization

```
                    ┌─────────────┐
                    │   default   │
                    │   (root)    │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┬───────────────┐
           │               │               │               │
    ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
    │  critical   │ │   warning   │ │    info     │ │    team     │
    │  severity   │ │   severity  │ │   severity  │ │   labels    │
    └──────┬──────┘ └─────────────┘ └─────────────┘ └──────┬──────┘
           │                                               │
     ┌─────┴─────┐                              ┌─────────┼─────────┐
     │           │                              │         │         │
┌────▼───┐ ┌────▼───┐                    ┌──────▼───┐ ┌────▼───┐ ┌────▼───┐
│pagerduty│ │ slack  │                    │ platform │ │  dba   │ │security│
│critical │ │critical│                    │   team   │ │  team  │ │  team  │
└─────────┘ └─────────┘                    └──────────┘ └────────┘ └────────┘
```

### Route Matching Examples

| Alert Labels | Route | Receiver |
|-------------|-------|----------|
| `severity=critical` | Root → Critical | PagerDuty + Slack |
| `severity=warning` | Root → Warning | Slack |
| `severity=info` | Root → Info | Email Digest |
| `team=platform, severity=critical` | Root → Platform → Critical | PagerDuty Platform |
| `job=room-03-postgres-master, severity=warning` | Root → DBA | DBA Team |
| `category=security, severity=critical` | Root → Security → Critical | PagerDuty Security |

---

## Notification Channels

### Slack Integration

**Setup:**
1. Create Slack app at https://api.slack.com/apps
2. Add Incoming Webhooks
3. Copy webhook URL to `${SLACK_WEBHOOK_URL}`

**Configuration:**
```yaml
slack_configs:
  - channel: '#alerts-critical'
    send_resolved: true
    actions:
      - type: button
        text: 'View Runbook'
        url: '{{ .CommonAnnotations.runbook_url }}'
```

### PagerDuty Integration

**Setup:**
1. Create service in PagerDuty
2. Get integration key
3. Add to configuration

**Configuration:**
```yaml
pagerduty_configs:
  - service_key: '${PAGERDUTY_KEY}'
    severity: '{{ .CommonLabels.severity }}'
    description: '{{ .CommonAnnotations.summary }}'
    details:
      firing: '{{ template "pagerduty.default.instances" .Alerts.Firing }}'
```

### Email Configuration

```yaml
email_configs:
  - to: 'alerts@delqhi.com'
    from: 'alerts@delqhi.com'
    smarthost: 'smtp.gmail.com:587'
    auth_username: 'alerts@delqhi.com'
    auth_password: '${SMTP_PASSWORD}'
    subject: '[{{ .Status | toUpper }}] {{ .GroupLabels.alertname }}'
    html: '{{ template "email.html" . }}'
    require_tls: true
```

### Webhook Integration

```yaml
webhook_configs:
  - url: 'https://api.delqhi.com/webhooks/alerts'
    send_resolved: true
    http_config:
      bearer_token: '${WEBHOOK_TOKEN}'
      tls_config:
        insecure_skip_verify: false
```

---

## Silences

### Creating Silences

**Via UI:**
1. Open https://alerts.delqhi.com
2. Click "New Silence"
3. Add matchers (e.g., `job=agent-01-n8n`)
4. Set duration
5. Add comment

**Via API:**

```bash
# Create silence
curl -X POST http://localhost:9093/api/v1/silences \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [
      {"name": "job", "value": "agent-01-n8n", "isRegex": false},
      {"name": "severity", "value": "warning", "isRegex": false}
    ],
    "startsAt": "2024-01-30T10:00:00Z",
    "endsAt": "2024-01-30T12:00:00Z",
    "createdBy": "platform-team",
    "comment": "Maintenance window - n8n upgrade"
  }'

# List silences
curl http://localhost:9093/api/v1/silences

# Delete silence
curl -X DELETE http://localhost:9093/api/v1/silence/{silence-id}
```

### Silence Best Practices

1. **Always add comments** explaining why
2. **Set expiration** - never permanent silences
3. **Use specific matchers** - avoid broad silences
4. **Review regularly** - clean up expired silences
5. **Document in runbooks** - link silence to maintenance

---

## API Reference

### Alert API

```bash
# Get active alerts
curl http://localhost:9093/api/v1/alerts | jq

# Get alert groups
curl http://localhost:9093/api/v1/alerts/groups | jq

# Get alert status
curl http://localhost:9093/api/v1/status | jq
```

### Silence API

```bash
# List silences
curl http://localhost:9093/api/v1/silences

# Create silence
curl -X POST http://localhost:9093/api/v1/silences \
  -H "Content-Type: application/json" \
  -d '{...}'

# Delete silence
curl -X DELETE http://localhost:9093/api/v1/silence/{id}
```

### Status API

```bash
# Get status
curl http://localhost:9093/api/v1/status

# Get configuration
curl http://localhost:9093/api/v1/status/config

# Get metrics
curl http://localhost:9093/metrics
```

---

## Troubleshooting

### Common Issues

#### Alerts Not Being Sent

```bash
# Check AlertManager logs
docker logs room-27-alertmanager-alerts

# Verify configuration
amtool check-config /etc/alertmanager/alertmanager.yml

# Test routing
amtool config routes test --config.file=alertmanager.yml severity=critical

# Check alert reception
curl http://localhost:9093/api/v1/alerts | jq
```

#### Duplicate Notifications

```bash
# Check grouping configuration
# Ensure group_by labels are appropriate

# Check group_interval
# May need to increase to prevent spam

# Verify fingerprint uniqueness
# Check if alerts have unique labels
```

#### Routing Not Working

```bash
# Test specific alert routing
amtool config routes test \
  --config.file=alertmanager.yml \
  --verify.receivers \
  severity=critical \
  job=agent-01-n8n

# Check matcher syntax
# Ensure label names/values are correct
```

### Debug Commands

```bash
# Check configuration syntax
docker run --rm -v $(pwd)/config:/config prom/alertmanager:v0.25.0 \
  amtool check-config /config/alertmanager.yml

# Test templates
docker run --rm -v $(pwd)/config:/config prom/alertmanager:v0.25.0 \
  amtool template render --template.file=/config/templates/default.tmpl

# View current configuration
curl http://localhost:9093/api/v1/status/config | jq

# Check AlertManager metrics
curl http://localhost:9093/metrics | grep alertmanager
```

### Metrics

```promql
# Alerts by status
alertmanager_alerts{state="active"}

# Notifications sent
alertmanager_notifications_total

# Notification latency
alertmanager_notification_latency_seconds

# Silences active
alertmanager_silences{state="active"}
```

---

## References

- [AlertManager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Configuration](https://prometheus.io/docs/alerting/latest/configuration/)
- [Notification Templates](https://prometheus.io/docs/alerting/latest/notifications/)
- [amtool CLI](https://prometheus.io/docs/alerting/latest/cli/)

---

<div align="center">

**AlertManager Alert Routing**  
*Intelligent Alert Management for SIN-Solver*

[← Grafana](./03-grafana.md) · [Loki →](./05-loki.md)

</div>
