# 📝 Loki - Log Aggregation & Search

> **Centralized Logging for SIN-Solver Platform**

**Service:** room-28-loki-logs  
**Port:** 3100  
**Domain:** loki.delqhi.com  
**Version:** 2.9.0  
**Status:** ✅ Active

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Promtail](#promtail)
5. [LogQL](#logql)
6. [Labels](#labels)
7. [Storage](#storage)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)

---

## Overview

Loki is a horizontally-scalable, highly-available log aggregation system inspired by Prometheus:

- **Index-free:** Only indexes labels, not full log content
- **Cost-effective:** Lower storage costs than traditional solutions
- **Prometheus-style:** Same labels, same query language patterns
- **Grafana-native:** Built-in integration with Grafana
- **Scalable:** Handles millions of log lines

### Key Features

| Feature | Description |
|---------|-------------|
| **Label-based** | Index only labels, not content |
| **LogQL** | Powerful query language |
| **Multi-tenant** | Separate log streams per tenant |
| **Grafana Integration** | Native Explore support |
| **Scalable** | Horizontal scaling support |
| **Cost-effective** | Object storage backend |

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      LOKI ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    LOG COLLECTION                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │  │
│  │  │   Promtail  │  │   Docker    │  │   Other Agents  │  │  │
│  │  │  (Primary)  │  │   Driver    │  │   (Fluent Bit)  │  │  │
│  │  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │  │
│  │         │                │                   │          │  │
│  │         └────────────────┴───────────────────┘          │  │
│  │                          │                              │  │
│  │                          ▼                              │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │              DISTRIBUTOR / INGESTER               │  │  │
│  │  │  • Parse labels                                  │  │  │
│  │  │  • Validate streams                              │  │  │
│  │  │  • Write to storage                              │  │  │
│  │  └──────────────────────┬───────────────────────────┘  │  │
│  │                         │                               │  │
│  └─────────────────────────┼───────────────────────────────┘  │
│                            │                                    │
│  ┌─────────────────────────┼───────────────────────────────┐  │
│  │                    STORAGE LAYER                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │  │
│  │  │  Index Store│  │  Chunk Store│  │  Object Storage │  │  │
│  │  │  (Labels)   │  │  (Log Data) │  │  (S3/GCS/Azure) │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │  │
│  └─────────────────────────┼───────────────────────────────┘  │
│                            │                                    │
│  ┌─────────────────────────┼───────────────────────────────┐  │
│  │                    QUERY LAYER                            │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │  │
│  │  │   Querier   │  │  Query Front│  │    Ruler        │  │  │
│  │  │  (LogQL)    │  │  (Cache)    │  │  (Alerting)     │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Installation

### Docker Compose

```yaml
# Docker/rooms/room-28-loki/docker-compose.yml
version: '3.8'

services:
  room-28-loki-logs:
    image: grafana/loki:2.9.0
    container_name: room-28-loki-logs
    hostname: room-28-loki-logs
    restart: unless-stopped
    ports:
      - "3100:3100"
    volumes:
      - ./config/loki.yml:/etc/loki/local-config.yaml:ro
      - loki_data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - sin-network
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider http://localhost:3100/ready || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  # Promtail - Log collector
  promtail:
    image: grafana/promtail:2.9.0
    container_name: promtail
    hostname: promtail
    restart: unless-stopped
    volumes:
      - ./config/promtail.yml:/etc/promtail/config.yml:ro
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - promtail_data:/var/lib/promtail
    command: -config.file=/etc/promtail/config.yml
    networks:
      - sin-network
    depends_on:
      - room-28-loki-logs

volumes:
  loki_data:
    driver: local
  promtail_data:
    driver: local

networks:
  sin-network:
    external: true
```

### Start Service

```bash
# Start Loki and Promtail
cd /Users/jeremy/dev/SIN-Solver/Docker/rooms/room-28-loki
docker-compose up -d

# Verify status
docker-compose ps
docker logs room-28-loki-logs

# Access API
curl http://localhost:3100/ready
```

---

## Configuration

### Loki Configuration (loki.yml)

```yaml
# config/loki.yml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096
  log_level: info

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

query_range:
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 100

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    cache_ttl: 24h
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

compactor:
  working_directory: /loki/boltdb-shipper-compactor
  shared_store: filesystem
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
  retention_delete_worker_count: 150

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  ingestion_rate_mb: 10
  ingestion_burst_size_mb: 20
  per_stream_rate_limit: 3MB
  per_stream_rate_limit_burst: 15MB
  max_entries_limit_per_query: 5000
  max_query_series: 500
  max_query_parallelism: 32

chunk_store_config:
  max_look_back_period: 0s

table_manager:
  retention_deletes_enabled: true
  retention_period: 720h  # 30 days

ruler:
  storage:
    type: local
    local:
      directory: /loki/rules
  rule_path: /loki/rules-temp
  alertmanager_url: http://room-27-alertmanager-alerts:9093
  ring:
    kvstore:
      store: inmemory
  enable_api: true
```

### Promtail Configuration (promtail.yml)

```yaml
# config/promtail.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /var/lib/promtail/positions.yaml

clients:
  - url: http://room-28-loki-logs:3100/loki/api/v1/push
    batchwait: 1s
    batchsize: 1048576
    timeout: 10s
    backoff_config:
      min_period: 100ms
      max_period: 5s
      max_retries: 10

scrape_configs:
  # Docker container logs
  - job_name: docker
    static_configs:
      - targets:
          - localhost
        labels:
          job: docker
          __path__: /var/lib/docker/containers/*/*.log
    pipeline_stages:
      - json:
          expressions:
            output: log
            stream: stream
            attrs:
      - json:
          expressions:
            tag:
          source: attrs
      - regex:
          expression: (?P<container_name>[^/]+)
          source: tag
      - timestamp:
          format: RFC3339Nano
          source: time
      - labels:
          stream:
          container_name:
      - output:
          source: output

  # System logs
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: system
          __path__: /var/log/syslog
      - targets:
          - localhost
        labels:
          job: system
          __path__: /var/log/auth.log
    pipeline_stages:
      - regex:
          expression: '^(?P<time\w{3} \d{2} \d{2}:\d{2}:\d{2}) (?P<host>\S+) (?P<process>\S+): (?P<message>.*)$'
      - timestamp:
          source: time
          format: 'Jan 02 15:04:05'
      - output:
          source: message

  # SIN-Solver Agent logs
  - job_name: sin-solver-agents
    static_configs:
      - targets:
          - localhost
        labels:
          job: agent-01-n8n
          __path__: /var/log/sin-solver/agent-01-n8n/*.log
      - targets:
          - localhost
        labels:
          job: agent-05-steel
          __path__: /var/log/sin-solver/agent-05-steel/*.log
      - targets:
          - localhost
        labels:
          job: agent-06-skyvern
          __path__: /var/log/sin-solver/agent-06-skyvern/*.log
      - targets:
          - localhost
        labels:
          job: agent-03-agentzero
          __path__: /var/log/sin-solver/agent-03-agentzero/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            msg: message
            timestamp: timestamp
      - labels:
          level:
      - timestamp:
          source: timestamp
          format: RFC3339
      - output:
          source: msg

  # SIN-Solver Infrastructure logs
  - job_name: sin-solver-infrastructure
    static_configs:
      - targets:
          - localhost
        labels:
          job: room-03-postgres
          __path__: /var/log/sin-solver/room-03-postgres/*.log
      - targets:
          - localhost
        labels:
          job: room-04-redis
          __path__: /var/log/sin-solver/room-04-redis/*.log
      - targets:
          - localhost
        labels:
          job: room-13-api-brain
          __path__: /var/log/sin-solver/room-13-api-brain/*.log
      - targets:
          - localhost
        labels:
          job: room-01-dashboard
          __path__: /var/log/sin-solver/room-01-dashboard/*.log
      - targets:
          - localhost
        labels:
          job: room-30-scira
          __path__: /var/log/sin-solver/room-30-scira/*.log

  # SIN-Solver Solver logs
  - job_name: sin-solver-solvers
    static_configs:
      - targets:
          - localhost
        labels:
          job: solver-1.1-captcha
          __path__: /var/log/sin-solver/solver-1.1-captcha/*.log
      - targets:
          - localhost
        labels:
          job: solver-2.1-survey
          __path__: /var/log/sin-solver/solver-2.1-survey/*.log
```

---

## Promtail

### Promtail Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PROMTAIL ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    TARGET DISCOVERY                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │  │
│  │  │  Static     │  │  File       │  │  Docker         │  │  │
│  │  │  Config     │  │  Discovery  │  │  Service        │  │  │
│  │  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │  │
│  │         │                │                   │          │  │
│  │         └────────────────┴───────────────────┘          │  │
│  │                          │                              │  │
│  │                          ▼                              │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │              LOG COLLECTION                       │  │  │
│  │  │  • Tail files                                    │  │  │
│  │  │  • Track positions                               │  │  │
│  │  │  • Handle rotation                               │  │  │
│  │  └──────────────────────┬───────────────────────────┘  │  │
│  │                         │                               │  │
│  │                         ▼                               │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │              PIPELINE STAGES                      │  │  │
│  │  │  • Parse (json, regex, etc)                      │  │  │
│  │  │  • Extract labels                                │  │  │
│  │  │  • Transform timestamps                          │  │  │
│  │  │  • Filter                                        │  │  │
│  │  └──────────────────────┬───────────────────────────┘  │  │
│  │                         │                               │  │
│  │                         ▼                               │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │              PUSH TO LOKI                         │  │  │
│  │  │  • Batch logs                                    │  │  │
│  │  │  • Retry on failure                              │  │  │
│  │  │  • Handle backpressure                           │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                                                              │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Pipeline Stages

| Stage | Purpose | Example |
|-------|---------|---------|
| **docker** | Parse Docker JSON logs | `{"log": "...", "stream": "stdout"}` |
| **json** | Extract JSON fields | `{"level": "error", "msg": "..."}` |
| **regex** | Parse with regex | Apache, syslog formats |
| **timestamp** | Parse timestamps | RFC3339, Unix, custom |
| **labels** | Extract labels | `level`, `job`, `instance` |
| **output** | Set log line content | Final message |
| **match** | Filter logs | Drop debug logs |

---

## LogQL

### Basic Queries

```logql
# All logs from a job
{job="agent-01-n8n"}

# Logs with multiple labels
{job="room-13-api-brain", level="error"}

# Regex match on label
{job=~"agent-.*"}

# Exclude label values
{job!="system"}
```

### Filter Expressions

```logql
# Contains string
{job="sin-solver"} |= "ERROR"

# Does not contain
{job="sin-solver"} != "DEBUG"

# Regex match
{job="sin-solver"} |~ "error|exception|fail"

# Regex exclude
{job="sin-solver"} !~ "success|ok"
```

### Parser Expressions

```logql
# Parse JSON
{job="sin-solver"} | json

# Parse logfmt (key=value)
{job="sin-solver"} | logfmt

# Parse with regex
{job="sin-solver"} | regexp "(?P<level>\w+) (?P<msg>.*)"

# Pattern (simplified regex)
{job="sin-solver"} | pattern "<level> <msg>"

# Unpack JSON into labels
{job="sin-solver"} | json level="level", message="msg"
```

### Line Format Expressions

```logql
# Add label to line
{job="sin-solver"} | json | line_format "{{.level}}: {{.message}}"

# Template output
{job="sin-solver"} | json | line_format "{{.timestamp}} [{{.level}}] {{.message}}"
```

### Label Filter Expressions

```logql
# Filter after parsing
{job="sin-solver"} | json | level="error"

# Numeric comparison
{job="sin-solver"} | json | duration > 1s

# Multiple filters
{job="sin-solver"} | json | level="error", duration > 500ms
```

### Aggregation Queries

```logql
# Count logs over time
sum by (level) (count_over_time({job="sin-solver"} [5m]))

# Rate of logs
sum by (job) (rate({job=~"agent-.*"} [5m]))

# Bytes per second
sum by (job) (bytes_rate({job=~"agent-.*"} [5m]))

# Top 10 error sources
topk(10, sum by (job) (rate({level="error"} [5m])))
```

### Range Vectors

```logql
# Count in time range
count_over_time({job="sin-solver"} [5m])

# Bytes in time range
bytes_over_time({job="sin-solver"} [1h])

# Rate of logs
rate({job="sin-solver"} [5m])
```

### Advanced Examples

```logql
# Find slow queries
{job="room-03-postgres"} |= "duration:" | logfmt | duration > 1s

# HTTP 5xx errors with trace ID
{job="room-13-api-brain"} |= "status_code=5" | json | line_format "{{.trace_id}} - {{.error}}"

# Error rate by service
sum by (job) (rate({level="error"} [5m])) / sum by (job) (rate({job=~"agent-.*"} [5m]))

# Unique error messages
count by (msg) (sum by (msg) (count_over_time({level="error"} [1h])))
```

---

## Labels

### Standard Labels

| Label | Description | Example |
|-------|-------------|---------|
| **job** | Service name | `agent-01-n8n`, `room-13-api-brain` |
| **instance** | Host:port | `localhost:5678` |
| **level** | Log level | `debug`, `info`, `warn`, `error` |
| **container_name** | Docker container | `room-25-prometheus` |
| **stream** | stdout/stderr | `stdout` |

### Custom Labels

```yaml
# Add custom labels in Promtail
pipeline_stages:
  - json:
      expressions:
        environment: env
        version: app_version
  - labels:
      environment:
      version:
```

### Label Best Practices

1. **Use consistent naming** - `job`, not `service` or `app`
2. **Limit cardinality** - Avoid high-cardinality labels (user_id, request_id)
3. **Use static values** - Labels should group, not identify individual items
4. **Index important labels** - Only indexed labels are searchable

---

## Storage

### Storage Configuration

```yaml
# Local filesystem storage (development)
storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    cache_ttl: 24h
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

# S3 storage (production)
# storage_config:
#   aws:
#     s3: s3://region/bucket
#     access_key_id: ${AWS_ACCESS_KEY}
#     secret_access_key: ${AWS_SECRET_KEY}
```

### Retention

```yaml
# Retention settings
compactor:
  retention_enabled: true
  retention_delete_delay: 2h

table_manager:
  retention_deletes_enabled: true
  retention_period: 720h  # 30 days

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h  # 7 days
```

### Storage Metrics

```promql
# Loki storage metrics
loki_boltdb_shipper_compact_tables_operation_total
loki_ingester_chunk_utilization
loki_chunk_store_index_entries_per_chunk
```

---

## API Reference

### Push API

```bash
# Push logs
curl -X POST http://localhost:3100/loki/api/v1/push \
  -H "Content-Type: application/json" \
  -d '{
    "streams": [
      {
        "stream": {
          "job": "test",
          "level": "info"
        },
        "values": [
          ["'$(date +%s%N)'", "Test log message"]
        ]
      }
    ]
  }'
```

### Query API

```bash
# Query logs
curl -G http://localhost:3100/loki/api/v1/query \
  --data-urlencode 'query={job="agent-01-n8n"}'

# Query range
curl -G http://localhost:3100/loki/api/v1/query_range \
  --data-urlencode 'query={job="agent-01-n8n"} |= "ERROR"' \
  --data-urlencode 'start=2024-01-01T00:00:00Z' \
  --data-urlencode 'end=2024-01-01T23:59:59Z' \
  --data-urlencode 'limit=100'

# Get labels
curl http://localhost:3100/loki/api/v1/label/job/values

# Get label values
curl http://localhost:3100/loki/api/v1/label/level/values
```

### Tail API (Live Logs)

```bash
# Tail logs (WebSocket)
curl -N http://localhost:3100/loki/api/v1/tail \
  --data-urlencode 'query={job="agent-01-n8n"}'
```

---

## Troubleshooting

### Common Issues

#### No Logs Appearing

```bash
# Check Promtail status
docker logs promtail

# Verify positions file
cat /var/lib/promtail/positions.yaml

# Test log push manually
curl -X POST http://localhost:3100/loki/api/v1/push \
  -H "Content-Type: application/json" \
  -d '{"streams":[{"stream":{"job":"test"},"values":[["'$(date +%s%N)'","test"]]}]}'

# Check Loki readiness
curl http://localhost:3100/ready
```

#### High Memory Usage

```bash
# Check ingestion rate
curl http://localhost:3100/metrics | grep loki_ingester_memory

# Reduce retention
# Edit loki.yml limits_config

# Check chunk size
# Adjust chunk_target_size in config
```

#### Query Timeouts

```bash
# Check query limits
# limits_config.max_query_parallelism

# Enable query caching
# query_range.results_cache

# Reduce time range
# Query smaller time windows
```

### Debug Commands

```bash
# Check Loki metrics
curl http://localhost:3100/metrics

# Verify label values
curl http://localhost:3100/loki/api/v1/label/job/values

# Test query
curl -G http://localhost:3100/loki/api/v1/query \
  --data-urlencode 'query={job="test"}'

# Check Promtail targets
curl http://localhost:9080/api/v1/status/targets
```

---

## References

- [Loki Documentation](https://grafana.com/docs/loki/)
- [LogQL Reference](https://grafana.com/docs/loki/latest/logql/)
- [Promtail Configuration](https://grafana.com/docs/loki/latest/clients/promtail/configuration/)
- [Best Practices](https://grafana.com/docs/loki/latest/best-practices/)

---

<div align="center">

**Loki Log Aggregation**  
*Centralized Logging for SIN-Solver*

[← AlertManager](./04-alertmanager.md) · [Jaeger →](./06-jaeger.md)

</div>
