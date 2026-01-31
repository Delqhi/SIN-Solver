# 🚨 Alert Routing Configuration

> **Complete Alert Routing & Notification Setup**

**Service:** AlertManager (room-27-alertmanager-alerts)  
**Port:** 9093  
**Domain:** alerts.delqhi.com  
**Version:** 1.0.0  
**Status:** ✅ Active

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Routing Tree](#routing-tree)
3. [Notification Channels](#notification-channels)
4. [Severity-Based Routing](#severity-based-routing)
5. [Team-Based Routing](#team-based-routing)
6. [Inhibition Rules](#inhibition-rules)
7. [Silence Management](#silence-management)
8. [Testing](#testing)

---

## Overview

Alert routing determines how alerts are distributed to different notification channels based on their labels and severity.

### Routing Principles

1. **Severity First:** Critical alerts get immediate attention
2. **Team Ownership:** Route to responsible team
3. **Smart Grouping:** Group related alerts to prevent spam
4. **Escalation Path:** Clear escalation for unresolved alerts

### Alert Flow

```
Alert Generated (Prometheus/Grafana)
         │
         ▼
┌─────────────────────┐
│   AlertManager      │
│   Receives Alert    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Deduplication     │
│   & Grouping        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Routing Tree      │
│   Match & Route     │
└──────────┬──────────┘
           │
     ┌─────┴─────┬─────────┬─────────┐
     │           │         │         │
     ▼           ▼         ▼         ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│PagerDuty│ │  Slack │ │ Email  │ │Webhook │
│Critical │ │Warning │ │Digest  │ │Custom  │
└────────┘ └────────┘ └────────┘ └────────┘
```

---

## Routing Tree

### Complete Routing Configuration

```yaml
# AlertManager routing tree visualization
route:
  receiver: default                    # Fallback receiver
  group_by: [alertname, job, severity] # Group alerts
  group_wait: 30s                      # Initial wait
  group_interval: 5m                   # Between notifications
  repeat_interval: 4h                  # Repeat unresolved
  
  routes:
    # CRITICAL ALERTS - Immediate response
    - match:
        severity: critical
      receiver: pagerduty-critical
      continue: true                   # Continue to other routes
      routes:
        - receiver: slack-critical     # Also notify Slack
        - receiver: platform-team      # Notify team
    
    # WARNING ALERTS - Standard response
    - match:
        severity: warning
      receiver: slack-warnings
      group_wait: 1m                   # Longer wait for grouping
      group_interval: 10m
      repeat_interval: 12h
      routes:
        - match_re:
            team: platform|sre
          receiver: platform-team
        - match_re:
            team: dba|database
          receiver: dba-team
        - match:
            team: security
          receiver: security-team
    
    # INFO ALERTS - Daily digest
    - match:
        severity: info
      receiver: email-digest
      group_wait: 5m
      group_interval: 1h
      repeat_interval: 24h
    
    # TEAM-SPECIFIC ROUTING
    # Platform Team
    - match_re:
        team: platform|sre
      receiver: platform-team
      routes:
        - match:
            severity: critical
          receiver: pagerduty-platform
    
    # DBA Team
    - match_re:
        job: room-03-postgres.*|room-04-redis.*
      receiver: dba-team
      routes:
        - match:
            severity: critical
          receiver: pagerduty-dba
    
    # Security Team
    - match:
        category: security
      receiver: security-team
      routes:
        - match:
            severity: critical
          receiver: pagerduty-security
```

---

## Notification Channels

### PagerDuty Integration

```yaml
receivers:
  - name: pagerduty-critical
    pagerduty_configs:
      - service_key: '${PAGERDUTY_CRITICAL_KEY}'
        severity: critical
        description: '{{ .GroupLabels.alertname }}: {{ .CommonAnnotations.summary }}'
        details:
          firing: '{{ template "pagerduty.instances" .Alerts.Firing }}'
          resolved: '{{ template "pagerduty.instances" .Alerts.Resolved }}'
          runbook: '{{ .CommonAnnotations.runbook_url }}'
        send_resolved: true
  
  - name: pagerduty-platform
    pagerduty_configs:
      - service_key: '${PAGERDUTY_PLATFORM_KEY}'
        severity: '{{ .CommonLabels.severity }}'
        description: 'Platform: {{ .CommonAnnotations.summary }}'
        send_resolved: true
  
  - name: pagerduty-dba
    pagerduty_configs:
      - service_key: '${PAGERDUTY_DBA_KEY}'
        severity: '{{ .CommonLabels.severity }}'
        description: 'DBA: {{ .CommonAnnotations.summary }}'
        send_resolved: true
  
  - name: pagerduty-security
    pagerduty_configs:
      - service_key: '${PAGERDUTY_SECURITY_KEY}'
        severity: critical
        description: 'SECURITY: {{ .CommonAnnotations.summary }}'
        send_resolved: true
```

### Slack Integration

```yaml
receivers:
  - name: slack-critical
    slack_configs:
      - channel: '#alerts-critical'
        username: 'AlertManager'
        icon_emoji: ':fire:'
        title: '{{ template "slack.critical.title" . }}'
        text: '{{ template "slack.critical.text" . }}'
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
  
  - name: slack-warnings
    slack_configs:
      - channel: '#alerts-warnings'
        username: 'AlertManager'
        icon_emoji: ':warning:'
        title: '{{ template "slack.warning.title" . }}'
        text: '{{ template "slack.warning.text" . }}'
        send_resolved: true
  
  - name: platform-team
    slack_configs:
      - channel: '#platform-alerts'
        username: 'AlertManager'
        icon_emoji: ':gear:'
        title: '{{ template "slack.default.title" . }}'
        text: '{{ template "slack.default.text" . }}'
        send_resolved: true
  
  - name: dba-team
    slack_configs:
      - channel: '#dba-alerts'
        username: 'AlertManager'
        icon_emoji: ':database:'
        title: 'DB Alert: {{ .GroupLabels.alertname }}'
        text: '{{ template "slack.default.text" . }}'
        send_resolved: true
  
  - name: security-team
    slack_configs:
      - channel: '#security-alerts'
        username: 'AlertManager'
        icon_emoji: ':lock:'
        title: 'Security: {{ .GroupLabels.alertname }}'
        text: '{{ template "slack.security.text" . }}'
        send_resolved: true
```

### Email Integration

```yaml
receivers:
  - name: default
    email_configs:
      - to: 'platform@delqhi.com'
        subject: '[{{ .Status | toUpper }}] {{ .GroupLabels.alertname }}'
        html: '{{ template "email.html" . }}'
        send_resolved: true
  
  - name: email-digest
    email_configs:
      - to: 'alerts@delqhi.com'
        subject: '[SIN-Solver] Daily Alert Digest'
        html: '{{ template "email.digest" . }}'
        headers:
          Importance: low
          X-Priority: 5
        send_resolved: false
```

### Webhook Integration

```yaml
receivers:
  - name: webhook-custom
    webhook_configs:
      - url: 'https://api.delqhi.com/webhooks/alerts'
        send_resolved: true
        http_config:
          bearer_token: '${WEBHOOK_TOKEN}'
          tls_config:
            insecure_skip_verify: false
```

---

## Severity-Based Routing

### Critical Alerts (P1)

**Criteria:** `severity: critical`

**Routing:**
- PagerDuty (immediate)
- Slack #alerts-critical
- Platform team

**Examples:**
- ServiceDown
- HighErrorRate (>5%)
- DiskSpaceLow (>90%)
- DatabaseUnreachable

**Response Time:** 5 minutes

### Warning Alerts (P2)

**Criteria:** `severity: warning`

**Routing:**
- Slack #alerts-warnings
- Team-specific channels
- No PagerDuty

**Examples:**
- HighLatency (>500ms)
- HighMemoryUsage (>85%)
- DatabaseConnectionsHigh (>80%)
- CertificateExpiringSoon (<7 days)

**Response Time:** 15 minutes

### Info Alerts (P3)

**Criteria:** `severity: info`

**Routing:**
- Email digest only
- No immediate notification

**Examples:**
- CertificateExpiringSoon (<30 days)
- BackupCompleted
- DeploymentSuccessful

**Response Time:** 24 hours

---

## Team-Based Routing

### Platform Team

**Matchers:**
- `team: platform`
- `team: sre`
- Default (no team specified)

**Services:**
- agent-01-n8n
- agent-05-steel
- agent-06-skyvern
- agent-03-agentzero
- room-13-api-brain
- room-01-dashboard

**Channels:**
- Slack: #platform-alerts
- PagerDuty: Platform service

### DBA Team

**Matchers:**
- `team: dba`
- `job: room-03-postgres.*`
- `job: room-04-redis.*`

**Services:**
- room-03-postgres-master
- room-04-redis-cache

**Channels:**
- Slack: #dba-alerts
- PagerDuty: DBA service

### Security Team

**Matchers:**
- `team: security`
- `category: security`

**Channels:**
- Slack: #security-alerts
- PagerDuty: Security service

---

## Inhibition Rules

### Suppress Less Severe Alerts

```yaml
inhibit_rules:
  # If service is down, suppress latency/errors for same service
  - source_match:
      alertname: 'ServiceDown'
    target_match_re:
      alertname: 'HighLatency|HighErrorRate'
    equal: ['job', 'instance']
  
  # If critical alert fires, suppress warning for same service
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['job', 'instance']
  
  # If database is down, suppress connection alerts
  - source_match:
      alertname: 'PostgresDown'
    target_match:
      alertname: 'DatabaseConnectionsHigh'
    equal: ['job']
  
  # If disk is full, suppress disk predictions
  - source_match:
      alertname: 'DiskSpaceLow'
    target_match:
      alertname: 'DiskSpacePredictedToFill'
    equal: ['instance', 'mountpoint']
```

---

## Silence Management

### Creating Silences

**Via UI:**
1. Go to https://alerts.delqhi.com
2. Click "New Silence"
3. Add matchers
4. Set duration
5. Add comment

**Via API:**

```bash
# Create silence for maintenance
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
    "comment": "Scheduled maintenance - n8n upgrade"
  }'
```

### Silence Best Practices

1. **Always add comments** explaining why
2. **Set expiration** - never permanent
3. **Use specific matchers** - avoid broad silences
4. **Link to tickets** - reference issue/PR
5. **Review regularly** - clean up expired

---

## Testing

### Test Routing

```bash
# Test specific alert routing
amtool config routes test \
  --config.file=alertmanager.yml \
  --verify.receivers \
  severity=critical \
  job=agent-01-n8n

# Expected output:
# pagerduty-critical
# slack-critical
# platform-team
```

### Test Notifications

```bash
# Test Slack webhook
curl -X POST ${SLACK_WEBHOOK_URL} \
  -H 'Content-type: application/json' \
  -d '{"text":"Test alert from AlertManager"}'

# Test PagerDuty
curl -X POST https://events.pagerduty.com/v2/enqueue \
  -H 'Content-Type: application/json' \
  -d '{
    "routing_key": "${PAGERDUTY_KEY}",
    "event_action": "trigger",
    "payload": {
      "summary": "Test alert",
      "severity": "critical"
    }
  }'
```

### Validate Configuration

```bash
# Check config syntax
amtool check-config alertmanager.yml

# Check templates
amtool template render \
  --template.file=templates/default.tmpl
```

---

## Configuration Reference

### Complete alertmanager.yml

See [04-alertmanager.md](../04-alertmanager.md) for complete configuration.

### Environment Variables

| Variable | Description |
|----------|-------------|
| `PAGERDUTY_CRITICAL_KEY` | PagerDuty integration key for critical alerts |
| `PAGERDUTY_PLATFORM_KEY` | PagerDuty key for platform team |
| `PAGERDUTY_DBA_KEY` | PagerDuty key for DBA team |
| `PAGERDUTY_SECURITY_KEY` | PagerDuty key for security team |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL |
| `SMTP_PASSWORD` | SMTP password for email notifications |
| `WEBHOOK_TOKEN` | Bearer token for custom webhooks |

---

<div align="center">

**Alert Routing Configuration**  
*Intelligent Alert Distribution for SIN-Solver*

[← AlertManager](../04-alertmanager.md) · [Runbooks →](../runbooks/README.md)

</div>
