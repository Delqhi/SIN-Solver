# 📈 Grafana - Visualization & Dashboards

> **Primary Dashboard for SIN-Solver Observability**

**Service:** room-26-grafana-dashboard  
**Port:** 3001  
**Domain:** grafana.delqhi.com  
**Version:** 10.0.0  
**Status:** ✅ Active

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Data Sources](#data-sources)
5. [Dashboards](#dashboards)
6. [Alerting](#alerting)
7. [User Management](#user-management)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)

---

## Overview

Grafana is the primary visualization layer for SIN-Solver monitoring, providing:

- **Interactive Dashboards:** 10+ pre-configured dashboards
- **Multi-Source Support:** Prometheus, Loki, Jaeger, PostgreSQL
- **Alerting:** Visual alert creation and management
- **User Management:** Role-based access control
- **Annotations:** Event correlation
- **Plugins:** Extensible visualization ecosystem

### Key Features

| Feature | Description |
|---------|-------------|
| **Dashboards** | Pre-built and custom dashboards |
| **Data Sources** | Prometheus, Loki, Jaeger, Postgres |
| **Alerting** | Visual alert rule creation |
| **Variables** | Dynamic dashboard filters |
| **Sharing** | Links, snapshots, exports |
| **Plugins** | Panel and data source plugins |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    GRAFANA ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    USER INTERFACE                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │  │
│  │  │  Dashboards │  │  Explore    │  │  Alerting       │  │  │
│  │  │  (10+)      │  │  (Ad-hoc)   │  │  (Rules)        │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────┼───────────────────────────────┐  │
│  │                    QUERY ENGINE                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │  │
│  │  │  PromQL     │  │  LogQL      │  │  SQL            │  │  │
│  │  │  (Prometheus│  │  (Loki)     │  │  (Postgres)     │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │  │
│  └───────────────────────────┼───────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────┼───────────────────────────────┐  │
│  │                    DATA SOURCES                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │  │
│  │  │  Prometheus │  │    Loki     │  │     Jaeger      │  │  │
│  │  │  (Metrics)  │  │  (Logs)     │  │  (Traces)       │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │  │
│  │  ┌─────────────┐  ┌─────────────┐                        │  │
│  │  │  PostgreSQL │  │  AlertManager│                        │  │
│  │  │  (Metadata) │  │  (Alerts)    │                        │  │
│  │  └─────────────┘  └─────────────┘                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Installation

### Docker Compose

```yaml
# Docker/rooms/room-26-grafana/docker-compose.yml
version: '3.8'

services:
  room-26-grafana-dashboard:
    image: grafana/grafana:10.0.0
    container_name: room-26-grafana-dashboard
    hostname: room-26-grafana-dashboard
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_USERS_ALLOW_ORG_CREATE=false
      - GF_AUTH_DISABLE_LOGIN_FORM=false
      - GF_AUTH_ANONYMOUS_ENABLED=false
      - GF_INSTALL_PLUGINS=grafana-clock-panel,grafana-simple-json-datasource
      - GF_SERVER_ROOT_URL=https://grafana.delqhi.com
      - GF_SERVER_SERVE_FROM_SUB_PATH=false
      - GF_DATABASE_TYPE=postgres
      - GF_DATABASE_HOST=room-03-postgres-master:5432
      - GF_DATABASE_NAME=grafana
      - GF_DATABASE_USER=grafana
      - GF_DATABASE_PASSWORD=${GRAFANA_DB_PASSWORD}
      - GF_DATABASE_SSL_MODE=disable
      - GF_ALERTING_ENABLED=true
      - GF_UNIFIED_ALERTING_ENABLED=true
    volumes:
      - grafana_data:/var/lib/grafana
      - ./provisioning:/etc/grafana/provisioning:ro
      - ./dashboards:/var/lib/grafana/dashboards:ro
    networks:
      - sin-network
    depends_on:
      - room-03-postgres-master
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

volumes:
  grafana_data:
    driver: local

networks:
  sin-network:
    external: true
```

### Start Service

```bash
# Start Grafana
cd /Users/jeremy/dev/SIN-Solver/Docker/rooms/room-26-grafana
docker-compose up -d

# Verify status
docker-compose ps
docker logs room-26-grafana-dashboard

# Access UI
open https://grafana.delqhi.com
```

---

## Configuration

### Provisioning

#### Data Sources (provisioning/datasources/datasources.yml)

```yaml
apiVersion: 1

datasources:
  # Prometheus - Primary metrics source
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://room-25-prometheus-metrics:9090
    isDefault: true
    editable: false
    jsonData:
      timeInterval: "15s"
      httpMethod: POST
      manageAlerts: true
      alertmanagerUid: alertmanager
      prometheusType: Prometheus
      prometheusVersion: "2.45.0"
      cacheLevel: 'High'
      incrementalQuerying: true
      incrementalQueryOverlapWindow: 10m

  # Loki - Log aggregation
  - name: Loki
    type: loki
    access: proxy
    url: http://room-28-loki-logs:3100
    editable: false
    jsonData:
      maxLines: 1000
      derivedFields:
        - name: TraceID
          matcherRegex: '"trace_id":"([^"]+)"'
          url: '$${__value.raw}'
          datasourceUid: jaeger

  # Jaeger - Distributed tracing
  - name: Jaeger
    type: jaeger
    access: proxy
    url: http://room-29-jaeger-traces:16686
    editable: false
    uid: jaeger
    jsonData:
      tracesToLogs:
        datasourceUid: loki
        tags: ['job', 'instance', 'pod']
        mappedTags: [{ key: 'service.name', value: 'service' }]
        mapTagNamesEnabled: false
        spanStartTimeShift: '1h'
        spanEndTimeShift: '1h'
        filterByTraceID: false
        filterBySpanID: false
      tracesToMetrics:
        datasourceUid: prometheus
        tags: [{ key: 'service.name', value: 'service' }, { key: 'job' }]
        queries:
          - name: 'Request rate'
            query: 'sum(rate(http_requests_total{$$__tags}[5m]))'
      nodeGraph:
        enabled: true

  # PostgreSQL - Metadata queries
  - name: PostgreSQL
    type: postgres
    url: room-03-postgres-master:5432
    database: grafana
    user: grafana
    secureJsonData:
      password: ${GRAFANA_DB_PASSWORD}
    jsonData:
      sslmode: disable
      maxOpenConns: 100
      maxIdleConns: 100
      maxIdleConnsAuto: true
      connMaxLifetime: 14400
      postgresVersion: 1500
      timescaledb: false

  # AlertManager - Alert visualization
  - name: AlertManager
    type: alertmanager
    access: proxy
    url: http://room-27-alertmanager-alerts:9093
    editable: false
    uid: alertmanager
    jsonData:
      implementation: prometheus
```

#### Dashboards (provisioning/dashboards/dashboards.yml)

```yaml
apiVersion: 1

providers:
  - name: 'SIN-Solver Dashboards'
    orgId: 1
    folder: 'SIN-Solver'
    type: file
    disableDeletion: false
    editable: true
    updateIntervalSeconds: 30
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
      foldersFromFilesStructure: true
```

---

## Data Sources

### Prometheus

**URL:** http://room-25-prometheus-metrics:9090  
**Default:** Yes  
**Access:** Server (proxy)

#### Query Examples

```promql
# Service uptime
up{job=~"agent-.*"}

# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])

# P95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Memory usage
container_memory_usage_bytes{name=~"room-.*"}
```

### Loki

**URL:** http://room-28-loki-logs:3100  
**Access:** Server (proxy)

#### Query Examples

```logql
# All error logs
{job="sin-solver"} |= "ERROR"

# Specific service logs
{job="agent-01-n8n-orchestrator"}

# Slow queries
{job="room-03-postgres-master"} |= "duration:" | logfmt | duration > 1s

# HTTP errors
{job="room-13-api-brain"} |= "status_code=5"

# Parse JSON logs
{job="sin-solver"} | json | level="error"
```

### Jaeger

**URL:** http://room-29-jaeger-traces:16686  
**Access:** Server (proxy)

#### Query Examples

```
# Traces by service
service: room-13-api-brain

# Traces with errors
tags: error=true

# Slow traces
duration: >1s

# Specific operation
operation: POST /api/v1/workflows
```

---

## Dashboards

### Dashboard Inventory

| Dashboard | Description | Data Source | Path |
|-----------|-------------|-------------|------|
| **System Overview** | High-level platform health | Prometheus | `system-overview.json` |
| **API Performance** | Request rates, latencies, errors | Prometheus | `api-performance.json` |
| **Service Health** | Per-service health metrics | Prometheus | `service-health.json` |
| **Database Health** | Postgres & Redis metrics | Prometheus | `database-health.json` |
| **Container Metrics** | Docker container stats | Prometheus | `container-metrics.json` |
| **Error Analysis** | Error rates and patterns | Prometheus/Loki | `error-analysis.json` |
| **Log Explorer** | Interactive log viewing | Loki | `log-explorer.json` |
| **Trace Analysis** | Distributed trace view | Jaeger | `trace-analysis.json` |
| **Resource Usage** | CPU, memory, disk usage | Prometheus | `resource-usage.json` |
| **Alert Status** | Active alerts overview | AlertManager | `alert-status.json` |

### System Overview Dashboard

```json
{
  "dashboard": {
    "title": "SIN-Solver System Overview",
    "tags": ["overview", "system"],
    "timezone": "browser",
    "schemaVersion": 36,
    "refresh": "30s",
    "panels": [
      {
        "id": 1,
        "title": "Service Status",
        "type": "stat",
        "targets": [
          {
            "expr": "up",
            "legendFormat": "{{job}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "mappings": [
              {"options": {"0": {"text": "Down", "color": "red"}}, "type": "value"},
              {"options": {"1": {"text": "Up", "color": "green"}}, "type": "value"}
            ]
          }
        },
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Request Rate (req/s)",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum by (job) (rate(http_requests_total[5m]))",
            "legendFormat": "{{job}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0}
      },
      {
        "id": 3,
        "title": "P95 Latency (ms)",
        "type": "timeseries",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum by (job, le) (rate(http_request_duration_seconds_bucket[5m]))) * 1000",
            "legendFormat": "{{job}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8}
      },
      {
        "id": 4,
        "title": "Error Rate (%)",
        "type": "timeseries",
        "targets": [
          {
            "expr": "sum by (job) (rate(http_requests_total{status=~\"5..\"}[5m])) / sum by (job) (rate(http_requests_total[5m])) * 100",
            "legendFormat": "{{job}}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8}
      },
      {
        "id": 5,
        "title": "Active Alerts",
        "type": "table",
        "targets": [
          {
            "expr": "ALERTS{alertstate=\"firing\"}",
            "format": "table",
            "instant": true
          }
        ],
        "gridPos": {"h": 8, "w": 24, "x": 0, "y": 16}
      }
    ]
  }
}
```

### API Performance Dashboard

Key panels:
- Request rate by endpoint
- P50/P95/P99 latency percentiles
- Error rate by status code
- Top slowest endpoints
- Request volume over time

### Service Health Dashboard

Key panels:
- Service uptime (last 24h)
- Health check status
- Dependency health
- Circuit breaker status
- Service response times

### Database Health Dashboard

Key panels:
- Connection pool utilization
- Query performance (slow queries)
- Transaction rate
- Cache hit rates
- Replication lag

---

## Alerting

### Unified Alerting Configuration

```yaml
# provisioning/alerting/alerting.yaml
apiVersion: 1

contactPoints:
  - orgId: 1
    name: default
    receivers:
      - uid: default-email
        type: email
        settings:
          addresses: alerts@delqhi.com
          singleEmail: false

  - orgId: 1
    name: platform-team
    receivers:
      - uid: platform-slack
        type: slack
        settings:
          url: '${SLACK_WEBHOOK_URL}'
          title: '{{ template "default.title" . }}'
          text: '{{ template "default.message" . }}'

  - orgId: 1
    name: pagerduty-critical
    receivers:
      - uid: pd-critical
        type: pagerduty
        settings:
          integrationKey: '${PAGERDUTY_KEY}'
          severity: critical

policies:
  - orgId: 1
    receiver: default
    group_by: ['alertname', 'grafana_folder', 'job']
    routes:
      - receiver: pagerduty-critical
        matchers:
          - severity = critical
        continue: true
      - receiver: platform-team
        matchers:
          - severity = warning
        group_wait: 30s
        group_interval: 5m
        repeat_interval: 4h

templates:
  - orgId: 1
    name: default
    template: |
      {{ define "default.title" }}{{ .Status | toUpper }}: {{ .CommonLabels.alertname }}{{ end }}
      {{ define "default.message" }}{{ range .Alerts }}{{ .Annotations.summary }}
{{ .Annotations.description }}
{{ end }}{{ end }}
```

### Alert Rules

```yaml
# provisioning/alerting/rules.yml
apiVersion: 1
groups:
  - orgId: 1
    name: sin-solver-alerts
    folder: SIN-Solver
    interval: 30s
    rules:
      - uid: service-down
        title: Service Down
        condition: B
        data:
          - refId: A
            relativeTimeRange:
              from: 300
              to: 0
            datasourceUid: prometheus
            model:
              expr: up == 0
              refId: A
          - refId: B
            relativeTimeRange:
              from: 0
              to: 0
            datasourceUid: __expr__
            model:
              type: threshold
              expression: A
              conditions:
                - evaluator:
                    type: gt
                    params: [0]
        noDataState: NoData
        execErrState: Error
        for: 2m
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "Service {{ $labels.job }} has been down for more than 2 minutes"
        labels:
          severity: critical
```

---

## User Management

### Default Users

| Username | Role | Purpose |
|----------|------|---------|
| admin | Admin | Full platform access |
| viewer | Viewer | Read-only dashboards |
| editor | Editor | Can edit dashboards |

### Creating Users

```bash
# Create admin user
docker-compose exec room-26-grafana-dashboard \
  grafana-cli admin reset-admin-password ${NEW_PASSWORD}

# Create additional users via API
curl -X POST http://admin:${PASSWORD}@localhost:3001/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Platform Team",
    "email": "platform@delqhi.com",
    "login": "platform",
    "password": "temp_password",
    "OrgId": 1
  }'
```

### Role-Based Access

```yaml
# Organization roles
- Admin: Full access (datasources, users, org settings)
- Editor: Create/edit dashboards, alerts
- Viewer: View dashboards only

# Folder permissions
- System Overview: All users
- API Performance: Platform team
- Database Health: DBAs only
- Security: Security team only
```

---

## API Reference

### Dashboard API

```bash
# List dashboards
curl -H "Authorization: Bearer ${API_KEY}" \
  http://localhost:3001/api/search

# Get dashboard
curl -H "Authorization: Bearer ${API_KEY}" \
  http://localhost:3001/api/dashboards/uid/system-overview

# Create dashboard
curl -X POST -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  http://localhost:3001/api/dashboards/db \
  -d @dashboard.json

# Delete dashboard
curl -X DELETE -H "Authorization: Bearer ${API_KEY}" \
  http://localhost:3001/api/dashboards/uid/system-overview
```

### Data Source API

```bash
# List data sources
curl -H "Authorization: Bearer ${API_KEY}" \
  http://localhost:3001/api/datasources

# Test data source
curl -X POST -H "Authorization: Bearer ${API_KEY}" \
  http://localhost:3001/api/datasources/uid/prometheus/health
```

### Alerting API

```bash
# List alert rules
curl -H "Authorization: Bearer ${API_KEY}" \
  http://localhost:3001/api/alert-rules

# Get alert status
curl -H "Authorization: Bearer ${API_KEY}" \
  http://localhost:3001/api/alertmanager/grafana/api/v2/alerts
```

---

## Troubleshooting

### Common Issues

#### Dashboard Not Loading

```bash
# Check Grafana logs
docker logs room-26-grafana-dashboard

# Verify data source connectivity
# Grafana UI → Configuration → Data Sources → Test

# Check network connectivity
docker exec room-26-grafana-dashboard \
  curl http://room-25-prometheus-metrics:9090/api/v1/status/targets
```

#### Slow Dashboard Performance

```bash
# Check query performance
# Enable query logging in data source settings

# Optimize queries
# Use recording rules for complex calculations
# Reduce time range
# Increase scrape interval for non-critical metrics

# Check resource usage
docker stats room-26-grafana-dashboard
```

#### Alerts Not Firing

```bash
# Check alert rule evaluation
# Grafana UI → Alerting → Alert Rules

# Verify AlertManager connectivity
curl http://room-27-alertmanager-alerts:9093/api/v1/status

# Check alert state
curl http://localhost:3001/api/alertmanager/grafana/api/v2/alerts
```

### Debug Commands

```bash
# Check Grafana health
curl http://localhost:3001/api/health

# Get Grafana version
curl http://localhost:3001/api/health | jq

# List plugins
docker exec room-26-grafana-dashboard grafana-cli plugins ls

# Reset admin password
docker-compose exec room-26-grafana-dashboard \
  grafana-cli admin reset-admin-password newpassword
```

---

## References

- [Grafana Documentation](https://grafana.com/docs/)
- [Dashboard Best Practices](https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/)
- [Alerting](https://grafana.com/docs/grafana/latest/alerting/)
- [Provisioning](https://grafana.com/docs/grafana/latest/administration/provisioning/)

---

<div align="center">

**Grafana Visualization**  
*Dashboards for the SIN-Solver Platform*

[← Prometheus](./02-prometheus.md) · [AlertManager →](./04-alertmanager.md)

</div>
