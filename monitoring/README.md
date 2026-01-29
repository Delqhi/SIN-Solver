# SIN-Solver Enterprise Monitoring & Observability Stack

> **Version:** 2026.1.0  
> **Last Updated:** 2026-01-29

## Overview

Complete enterprise-grade monitoring and observability stack for the CAPTCHA solving system, featuring:

- **Metrics Collection** - Prometheus with custom CAPTCHA business metrics
- **Visualization** - Grafana with pre-configured dashboards
- **Log Aggregation** - Loki for centralized logging
- **Distributed Tracing** - Jaeger for request tracing
- **Alerting** - AlertManager with multi-channel routing
- **Auto-scaling Metrics** - Resource usage and capacity planning

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MONITORING STACK (Rooms 25-34)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│   │ Prometheus   │────▶│ AlertManager │────▶│   PagerDuty  │                │
│   │  :9090       │     │   :9093      │     │    / Slack   │                │
│   └──────────────┘     └──────────────┘     └──────────────┘                │
│          │                                                                    │
│          │              ┌──────────────┐                                      │
│          └─────────────▶│   Grafana    │                                      │
│                         │   :3000      │◀────────┐                           │
│                         └──────────────┘         │                           │
│                                                  │                           │
│   ┌──────────────┐     ┌──────────────┐         │                           │
│   │    Loki      │────▶│  Promtail    │─────────┤                           │
│   │  :3100       │     │  (agents)    │         │                           │
│   └──────────────┘     └──────────────┘         │                           │
│                                                  │                           │
│   ┌──────────────┐     ┌──────────────┐         │                           │
│   │   Jaeger     │────▶│  Application │─────────┘                           │
│   │  :16686      │     │  (instrumented)                                    │
│   └──────────────┘     └──────────────┘                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Start the Monitoring Stack

```bash
# Start all monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services are running
docker-compose -f docker-compose.monitoring.yml ps
```

### 2. Access the Components

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| Grafana | http://localhost:3001 | admin / sin-solver-admin-2026 |
| Prometheus | http://localhost:9090 | - |
| AlertManager | http://localhost:9093 | - |
| Jaeger UI | http://localhost:16686 | - |
| Loki | http://localhost:3100 | - |

### 3. View the Dashboard

1. Open Grafana: http://localhost:3001
2. Navigate to "Dashboards" → "CAPTCHA"
3. Select "SIN-Solver CAPTCHA System Dashboard"

## Components

### Room-25: Prometheus

**Purpose:** Metrics collection and storage

**Configuration:**
- Retention: 30 days or 50GB
- Scrape interval: 15s
- Recording rules for performance optimization
- Alert rules for automated monitoring

**Key Metrics:**
- `captcha_solves_total` - Total solves by type, status, solver
- `captcha_solve_duration_seconds` - Solve latency histogram
- `captcha_solve_cost_usd` - Cost per solve
- `ai_model_requests_total` - AI model usage
- `http_requests_total` - API request metrics

### Room-26: Grafana

**Purpose:** Visualization and dashboards

**Features:**
- Pre-configured CAPTCHA system dashboard
- Prometheus, Loki, Jaeger data sources
- Alert list and annotations
- Real-time auto-refresh (5s)

**Dashboards:**
- Overview KPIs (success rate, latency, cost)
- Solve rate by CAPTCHA type
- AI model performance comparison
- Error rates and detection metrics
- Cost analysis and distribution
- Live logs integration

### Room-27: AlertManager

**Purpose:** Alert routing and notification

**Routing:**
- `critical` → PagerDuty + Slack + Email (immediate)
- `warning` → Slack + Email (standard)
- `info` → Slack only (low priority)

**Alert Types:**
- High error rate (>10%)
- Low solve rate (<95%)
- High latency (P95 > 15s)
- Infrastructure issues
- Cost spikes
- Detection rate anomalies

### Room-28: Loki + Promtail

**Purpose:** Log aggregation and collection

**Features:**
- JSON structured logging
- LogQL queries
- Integration with Grafana
- 14-day retention
- Label-based filtering

### Room-29: Jaeger

**Purpose:** Distributed tracing

**Features:**
- OpenTelemetry compatible
- Trace to logs correlation
- Service dependency graphs
- Performance bottleneck identification

### Room-30: Node Exporter

**Purpose:** System-level metrics

**Metrics:**
- CPU, memory, disk usage
- Network I/O
- System load
- File descriptors

### Room-31: cAdvisor

**Purpose:** Container metrics

**Metrics:**
- Container resource usage
- Network statistics
- Filesystem metrics

## Python Integration

### Using Metrics in Your Code

```python
from app.core.monitoring import get_metrics, traced, start_span

# Get metrics instance
metrics = get_metrics()

# Record a CAPTCHA solve
metrics.record_solve(
    captcha_type="recaptcha_v2",
    status="success",
    solver="gemini",
    duration=5.2,
    cost=0.018,
    confidence=0.98,
    retries=0,
)

# Record AI model usage
metrics.record_model_request(
    model="gemini-pro-vision",
    provider="google",
    status="success",
    latency=2.1,
    input_tokens=150,
    output_tokens=50,
)

# Distributed tracing
@traced(name="solve_captcha", attributes={"captcha_type": "recaptcha_v2"})
async def solve_captcha(image: bytes) -> str:
    # Your solving logic here
    pass

# Manual span creation
with start_span("processing_step", {"step": "image_preprocessing"}):
    # Processing code
    pass
```

### Structured Logging

```python
from app.core.logging_config import get_logger, LogContext

# Get logger
logger = get_logger("solver")

# With context
def handle_request(request_id: str):
    with LogContext(request_id=request_id, user_id="user_123"):
        logger.info("Processing request", extra={"captcha_type": "hcaptcha"})
        # Logs will include correlation_id, request_id, user_id automatically
```

## Alerting Configuration

### Environment Variables

Create a `.env.monitoring` file:

```bash
# AlertManager
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
PAGERDUTY_SERVICE_KEY=your-pagerduty-key
PAGERDUTY_PLATFORM_KEY=your-platform-key
SMTP_PASSWORD=your-smtp-password

# Grafana
GRAFANA_ADMIN_PASSWORD=your-secure-password

# Database
POSTGRES_GRAFANA_PASSWORD=grafana-readonly-password
```

### Custom Alert Rules

Add to `monitoring/prometheus/alerts.yml`:

```yaml
- alert: CustomMetricThreshold
  expr: your_metric > threshold
  for: 5m
  labels:
    severity: warning
    team: your-team
  annotations:
    summary: "Custom alert description"
```

## API Endpoints

The monitoring stack adds these endpoints to your API:

| Endpoint | Description |
|----------|-------------|
| `GET /metrics` | Prometheus metrics export |
| `GET /health` | Health check with component status |
| `GET /ready` | Kubernetes readiness probe |
| `GET /startup` | Kubernetes startup probe |

## Performance Optimization

### Recording Rules

Pre-computed metrics for faster queries:
- `captcha:solve_rate_5m` - 5-minute solve rate
- `captcha:avg_solve_duration_5m` - Average solve duration
- `captcha:p95_solve_duration` - P95 latency by type
- `ai:model_success_rate` - AI model success rates

### Query Optimization

Use recording rules for dashboard queries:

```promql
# Fast (uses recording rule)
captcha:solve_rate_5m

# Slower (raw calculation)
sum(rate(captcha_solves_total{status="success"}[5m])) / sum(rate(captcha_solves_total[5m]))
```

## Maintenance

### Backup

```bash
# Backup Prometheus data
docker exec room-25-prometheus tar czf - /prometheus > prometheus-backup-$(date +%Y%m%d).tar.gz

# Backup Grafana
docker exec room-26-grafana tar czf - /var/lib/grafana > grafana-backup-$(date +%Y%m%d).tar.gz
```

### Cleanup

```bash
# Remove old data (Prometheus handles this automatically)
# Force retention cleanup
curl -X POST http://localhost:9090/api/v1/admin/tsdb/clean_tombstones
```

## Troubleshooting

### No Metrics in Grafana

1. Check Prometheus targets: http://localhost:9090/targets
2. Verify API is exposing metrics: `curl http://localhost:8000/metrics`
3. Check network connectivity between containers

### Alerts Not Firing

1. Check AlertManager: http://localhost:9093/#/status
2. Verify alert rules are loaded: http://localhost:9090/rules
3. Check AlertManager logs: `docker logs room-27-alertmanager`

### Missing Logs

1. Verify Promtail is running: `docker logs room-28-promtail`
2. Check log file paths in promtail-config.yml
3. Ensure log files are readable by Promtail

## Security Considerations

1. **Change Default Passwords** - Update Grafana admin password
2. **Network Isolation** - Monitoring stack on dedicated network
3. **TLS** - Enable TLS for production deployments
4. **Authentication** - Enable Grafana auth proxy if needed
5. **Sensitive Data** - Logs are automatically redacted for secrets

## Integration with Existing Infrastructure

### Docker Compose Integration

Add to your main docker-compose.yml:

```yaml
services:
  api:
    environment:
      - JAEGER_ENDPOINT=http://172.20.0.29:14268/api/traces
      - PROMETHEUS_MULTIPROC_DIR=/tmp/prometheus
    networks:
      - sin-solver-network
```

### Kubernetes Integration

See `k8s/monitoring/` for Kubernetes manifests (if applicable).

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [OpenTelemetry](https://opentelemetry.io/docs/)

## License

Apache 2.0 - See LICENSE file for details.
