# Room-01 Dashboard Cockpit - Monitoring

## Monitoring and Alerts

This document describes the monitoring setup, metrics collection, and alerting configuration for the Room-01 Dashboard Cockpit.

---

## Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MONITORING STACK                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      DASHBOARD APP                                   │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │  Application │  │   System     │  │   Business   │              │   │
│  │  │   Metrics    │  │   Metrics    │  │   Metrics    │              │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │   │
│  └─────────┼─────────────────┼─────────────────┼──────────────────────┘   │
│            │                 │                 │                           │
│            └─────────────────┼─────────────────┘                           │
│                              ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     PROMETHEUS                                       │   │
│  │              (Metrics Collection & Storage)                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                             │
│            ┌─────────────────┼─────────────────┐                           │
│            ▼                 ▼                 ▼                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                     │
│  │   GRAFANA    │  │   ALERTMANAGER│  │    LOKI      │                     │
│  │  (Dashboards)│  │   (Alerts)    │  │   (Logs)     │                     │
│  └──────────────┘  └──────────────┘  └──────────────┘                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Metrics Collection

### Application Metrics

```javascript
// lib/metrics.js
import { Counter, Histogram, Gauge, register } from 'prom-client';

// HTTP Request Metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// Container Metrics
export const containerStatus = new Gauge({
  name: 'container_status',
  help: 'Container status (1=running, 0=stopped)',
  labelNames: ['container_name', 'category']
});

export const containerCpuUsage = new Gauge({
  name: 'container_cpu_usage_percent',
  help: 'Container CPU usage percentage',
  labelNames: ['container_name']
});

export const containerMemoryUsage = new Gauge({
  name: 'container_memory_usage_bytes',
  help: 'Container memory usage in bytes',
  labelNames: ['container_name']
});

// Business Metrics
export const containerOperationsTotal = new Counter({
  name: 'container_operations_total',
  help: 'Total container operations',
  labelNames: ['operation', 'container_name', 'status']
});

export const activeUsers = new Gauge({
  name: 'active_users',
  help: 'Number of active users'
});
```

### Metrics Endpoint

```javascript
// app/api/metrics/route.js
import { register } from 'prom-client';

export async function GET() {
  const metrics = await register.metrics();
  
  return new Response(metrics, {
    headers: {
      'Content-Type': register.contentType
    }
  });
}
```

### Middleware for Metrics

```javascript
// middleware/metrics.js
import { httpRequestsTotal, httpRequestDuration } from '../lib/metrics';

export function metricsMiddleware(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode
    });
    
    httpRequestDuration.observe(
      { method: req.method, route },
      duration
    );
  });
  
  next();
}
```

---

## Prometheus Configuration

### prometheus.yml

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'room-01-dashboard'
    static_configs:
      - targets: ['room-01-dashboard-cockpit:3011']
    metrics_path: '/api/metrics'
    scrape_interval: 5s
    
  - job_name: 'docker'
    static_configs:
      - targets: ['cadvisor:8080']
    
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']
```

### Recording Rules

```yaml
# rules/dashboard.yml
groups:
  - name: dashboard
    rules:
      - record: container:cpu_usage:avg5m
        expr: avg_over_time(container_cpu_usage_percent[5m])
        
      - record: http:requests:rate5m
        expr: rate(http_requests_total[5m])
        
      - record: http:latency:p95
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

---

## Grafana Dashboards

### Dashboard JSON

```json
{
  "dashboard": {
    "title": "Room-01 Dashboard Cockpit",
    "panels": [
      {
        "title": "Container Status",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(container_status)",
            "legendFormat": "Running"
          }
        ]
      },
      {
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "container_cpu_usage_percent",
            "legendFormat": "{{container_name}}"
          }
        ]
      },
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{route}}"
          }
        ]
      },
      {
        "title": "Response Time (p95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "p95"
          }
        ]
      }
    ]
  }
}
```

---

## Alerting

### Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@sin-solver.io'
  smtp_auth_username: 'alerts@sin-solver.io'
  smtp_auth_password: '${SMTP_PASSWORD}'

route:
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
      continue: true
    - match:
        severity: warning
      receiver: 'slack'

receivers:
  - name: 'default'
    email_configs:
      - to: 'admin@sin-solver.io'

  - name: 'slack'
    slack_configs:
      - api_url: '${SLACK_WEBHOOK_URL}'
        channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ .CommonAnnotations.summary }}'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_KEY}'
```

### Alert Rules

```yaml
# alerts/dashboard.yml
groups:
  - name: dashboard_alerts
    rules:
      # High Error Rate
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      # High Response Time
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "p95 response time is {{ $value }}s"

      # Container Down
      - alert: ContainerDown
        expr: container_status == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Container {{ $labels.container_name }} is down"
          description: "Container has been down for more than 1 minute"

      # High CPU Usage
      - alert: HighCPUUsage
        expr: container_cpu_usage_percent > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "Container {{ $labels.container_name }} CPU usage is {{ $value }}%"

      # High Memory Usage
      - alert: HighMemoryUsage
        expr: (container_memory_usage_bytes / container_spec_memory_limit_bytes) > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"
          description: "Container {{ $labels.container_name }} memory usage is > 90%"

      # Disk Space Low
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space"
          description: "Disk space is < 10%"
```

---

## Log Aggregation

### Loki Configuration

```yaml
# loki-config.yml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1

schema_config:
  configs:
    - from: 2026-01-01
      store: boltdb
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 168h

storage_config:
  boltdb:
    directory: /tmp/loki/index
  filesystem:
    directory: /tmp/loki/chunks
```

### Promtail Configuration

```yaml
# promtail-config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: dashboard
    static_configs:
      - targets:
          - localhost
        labels:
          job: dashboard
          __path__: /app/logs/*.log
    
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        target_label: 'container'
```

---

## Health Checks

### Health Check Endpoint

```javascript
// app/api/health/route.js
import docker from '@/lib/docker';
import redis from '@/lib/redis';

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    version: process.env.npm_package_version,
    services: {}
  };
  
  // Check Docker
  try {
    await docker.ping();
    checks.services.docker = 'connected';
  } catch (error) {
    checks.services.docker = 'disconnected';
    checks.status = 'unhealthy';
  }
  
  // Check Redis
  try {
    await redis.ping();
    checks.services.redis = 'connected';
  } catch (error) {
    checks.services.redis = 'disconnected';
    checks.status = 'unhealthy';
  }
  
  // Check API Brain
  try {
    const response = await fetch(`${process.env.API_BRAIN_URL}/health`);
    checks.services.api_brain = response.ok ? 'reachable' : 'unreachable';
  } catch (error) {
    checks.services.api_brain = 'unreachable';
  }
  
  const statusCode = checks.status === 'healthy' ? 200 : 503;
  
  return Response.json(checks, { status: statusCode });
}
```

### Docker Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3011/api/health || exit 1
```

---

## Uptime Monitoring

### Uptime Kuma

```yaml
# docker-compose.yml
services:
  uptime-kuma:
    image: louislam/uptime-kuma:1
    container_name: uptime-kuma
    volumes:
      - ./uptime-kuma-data:/app/data
    ports:
      - "3001:3001"
    restart: unless-stopped
```

### Monitors

| Monitor | Type | Interval | Alert After |
|---------|------|----------|-------------|
| Dashboard | HTTP | 60s | 2 failures |
| API | HTTP | 60s | 2 failures |
| Docker | Ping | 60s | 3 failures |
| Redis | TCP | 60s | 3 failures |

---

## Custom Metrics

### Business Metrics

```javascript
// Track user actions
import { containerOperationsTotal, activeUsers } from '@/lib/metrics';

// In your API route
export async function POST(req, { params }) {
  const { id } = params;
  const { action } = await req.json();
  
  try {
    await performContainerAction(id, action);
    
    containerOperationsTotal.inc({
      operation: action,
      container_name: id,
      status: 'success'
    });
    
    return Response.json({ success: true });
  } catch (error) {
    containerOperationsTotal.inc({
      operation: action,
      container_name: id,
      status: 'failure'
    });
    
    throw error;
  }
}
```

### Real-time User Count

```javascript
// Track active WebSocket connections
import { activeUsers } from '@/lib/metrics';

let connections = 0;

wss.on('connection', (ws) => {
  connections++;
  activeUsers.set(connections);
  
  ws.on('close', () => {
    connections--;
    activeUsers.set(connections);
  });
});
```

---

## Performance Monitoring

### Web Vitals

```javascript
// lib/vitals.js
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function reportWebVitals(metric) {
  // Send to analytics
  fetch('/api/analytics/vitals', {
    method: 'POST',
    body: JSON.stringify(metric)
  });
}

// In _app.js
useEffect(() => {
  getCLS(reportWebVitals);
  getFID(reportWebVitals);
  getFCP(reportWebVitals);
  getLCP(reportWebVitals);
  getTTFB(reportWebVitals);
}, []);
```

---

## Troubleshooting Monitoring

### Common Issues

**Issue: Metrics not appearing**
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check metrics endpoint
curl http://localhost:3011/api/metrics
```

**Issue: Alerts not firing**
```bash
# Check alert rules
promtool check rules alerts/dashboard.yml

# Test alert
curl -X POST http://localhost:9093/-/reload
```

**Issue: Logs not appearing in Loki**
```bash
# Check Promtail status
curl http://localhost:9080/api/v1/status

# Check Loki
curl http://localhost:3100/ready
```

---

## Related Documentation

- [09-performance.md](./09-room-01-performance.md) - Performance optimization
- [10-testing.md](./10-room-01-testing.md) - Testing monitoring
- [03-troubleshooting.md](./03-room-01-troubleshooting.md) - Troubleshooting
