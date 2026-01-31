# RB-009: Performance Issue Debugging Runbook

**Purpose:** Diagnose and resolve performance issues across SIN-Solver services.

**Scope:** All services, databases, and infrastructure components

**Prerequisites:**
- Access to monitoring systems (Prometheus, Grafana)
- Docker stats access
- Understanding of service architecture

---

## Table of Contents

1. [Performance Baselines](#1-performance-baselines)
2. [Detection Methods](#2-detection-methods)
3. [Diagnostic Procedures](#3-diagnostic-procedures)
4. [Common Issues & Solutions](#4-common-issues--solutions)
5. [Optimization Techniques](#5-optimization-techniques)
6. [Monitoring Setup](#6-monitoring-setup)

---

## 1. Performance Baselines

### 1.1 Expected Performance Metrics

| Service | Metric | Target | Warning | Critical |
|---------|--------|--------|---------|----------|
| **API Brain** | Response Time | <100ms | 100-500ms | >500ms |
| **API Brain** | Throughput | >1000 req/s | 500-1000 | <500 |
| **PostgreSQL** | Query Time | <10ms | 10-100ms | >100ms |
| **PostgreSQL** | Connections | <80% | 80-90% | >90% |
| **Redis** | Latency | <1ms | 1-5ms | >5ms |
| **Dashboard** | Page Load | <2s | 2-5s | >5s |
| **n8n** | Workflow Exec | <5s | 5-30s | >30s |

### 1.2 Resource Baselines

| Service | CPU | Memory | Disk I/O |
|---------|-----|--------|----------|
| API Brain | <50% | <1GB | <10MB/s |
| PostgreSQL | <70% | <2GB | <50MB/s |
| Redis | <30% | <256MB | Minimal |
| Dashboard | <50% | <512MB | Minimal |

---

## 2. Detection Methods

### 2.1 Automated Alerting

```bash
# Check Prometheus alerts
curl -s http://localhost:9090/api/v1/alerts | jq '.data.alerts[] | select(.labels.severity=="warning" or .labels.severity=="critical")'

# Check Grafana annotations
# Open: http://localhost:3001 (Grafana dashboard)

# Check Loki for slow queries
curl -s "http://localhost:3100/loki/api/v1/query?query=\n  {job=\"postgres\"} |= \"duration:\" |~ \"[0-9]+s\"" | jq
```

### 2.2 Manual Detection

```bash
# Quick performance check script
cat > /tmp/perf-check.sh <> 'EOF'
#!/bin/bash

echo "=== Performance Check ==="
echo "Timestamp: $(date)"
echo ""

# API Response Time
echo "API Response Times:"
for i in {1..5}; do
  curl -s -o /dev/null -w "%{time_total}\n" http://localhost:8000/health
done | awk '{sum+=$1; count++} END {print "Average: " sum/count "s"}'

# Database Query Time
echo ""
echo "Database Query Time:"
docker exec room-03-postgres-master psql -U ceo_admin -c "
  SELECT 'SELECT 1' as query, 
         avg(query_duration) as avg_time
  FROM pg_stat_statements 
  WHERE query LIKE '%SELECT%'
  LIMIT 1;
"

# Container Resources
echo ""
echo "Container Resource Usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | head -10

# Network I/O
echo ""
echo "Network I/O (last 5 min):"
docker exec room-13-api-brain cat /proc/net/dev | grep eth0
EOF

chmod +x /tmp/perf-check.sh
/tmp/perf-check.sh
```

---

## 3. Diagnostic Procedures

### 3.1 API Performance Analysis

```bash
# Test API response times
echo "Testing API Brain performance..."

# Single endpoint test
ab -n 1000 -c 10 http://localhost:8000/health

# Multiple endpoints
ENDPOINTS=(
  "/health"
  "/api/services"
  "/api/metrics"
)

for endpoint in "${ENDPOINTS[@]}"; do
  echo "Testing: $endpoint"
  curl -s -o /dev/null -w "Status: %{http_code}, Time: %{time_total}s, Size: %{size_download}b\n" \
    "http://localhost:8000$endpoint"
done

# Check for slow requests in logs
docker logs room-13-api-brain --since 10m 2>&1 | grep -E "[0-9]+\.[0-9]+s" | tail -20
```

### 3.2 Database Performance Analysis

```bash
# Check slow queries
docker exec room-03-postgres-master psql -U ceo_admin -c "
  SELECT query,
         calls,
         mean_exec_time,
         total_exec_time
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"

# Check active connections
docker exec room-03-postgres-master psql -U ceo_admin -c "
  SELECT state, count(*)
  FROM pg_stat_activity
  GROUP BY state;
"

# Check table bloat
docker exec room-03-postgres-master psql -U ceo_admin -c "
  SELECT schemaname, tablename,
         pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
  FROM pg_tables
  WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
  LIMIT 10;
"

# Check index usage
docker exec room-03-postgres-master psql -U ceo_admin -c "
  SELECT schemaname, tablename, indexname, idx_scan
  FROM pg_stat_user_indexes
  ORDER BY idx_scan DESC
  LIMIT 10;
"
```

### 3.3 Container Resource Analysis

```bash
# Detailed container stats
docker stats --no-stream --format "
Name: {{.Name}}
CPU: {{.CPUPerc}}
Memory: {{.MemUsage}} / {{.MemLimit}} ({{.MemPerc}})
Net I/O: {{.NetIO}}
Block I/O: {{.BlockIO}}
PIDs: {{.PIDs}}
---
"

# Check for resource limits being hit
docker inspect room-13-api-brain --format='
Memory Limit: {{.HostConfig.Memory}}
CPU Limit: {{.HostConfig.CpuQuota}}
'

# Check process list inside container
docker exec room-13-api-brain ps aux --sort=-%cpu | head -10
```

### 3.4 Network Performance Analysis

```bash
# Check network latency
ping -c 10 room-03-postgres-master

# Check connection counts
netstat -an | grep :8000 | wc -l

# Check bandwidth usage
iftop -i eth0 -t -s 10 2>/dev/null || echo "iftop not available"

# Docker network stats
docker network inspect delqhi-platform-network --format '{{json .}}' | jq '.[0].Containers | to_entries[] | {name: .value.Name, ipv4: .value.IPv4Address}'
```

---

## 4. Common Issues & Solutions

### 4.1 High CPU Usage

**Symptoms:**
```
CPU usage > 80% sustained
Response times increasing
```

**Diagnosis:**
```bash
# Find high CPU processes
docker exec room-13-api-brain ps aux --sort=-%cpu | head -5

# Check for infinite loops or runaway processes
docker logs room-13-api-brain --tail 100 | grep -i "error\|exception"

# Profile the application (if Python)
docker exec room-13-api-brain python -m cProfile -s cumulative app.py
```

**Solutions:**
```bash
# 1. Restart service
docker restart room-13-api-brain

# 2. Scale up CPU allocation
docker update --cpus=2 room-13-api-brain

# 3. Add resource limits to prevent runaway processes
# Edit docker-compose.yml:
# deploy:
#   resources:
#     limits:
#       cpus: '1.5'
#       memory: 2G
```

### 4.2 High Memory Usage

**Symptoms:**
```
Memory usage approaching limit
Container OOM killed
```

**Diagnosis:**
```bash
# Check memory usage over time
docker stats room-13-api-brain --no-stream

# Check for memory leaks
docker logs room-13-api-brain | grep -i "memory\|oom\|killed"

# Check heap usage (Node.js)
docker exec room-01-dashboard-cockpit node -e "console.log(process.memoryUsage())"
```

**Solutions:**
```bash
# 1. Restart to free memory
docker restart room-13-api-brain

# 2. Increase memory limit
docker update --memory=4g room-13-api-brain

# 3. Enable swap (if not already)
docker update --memory-swap=8g room-13-api-brain
```

### 4.3 Slow Database Queries

**Symptoms:**
```
Query time > 100ms
Connection pool exhausted
```

**Diagnosis:**
```bash
# Identify slow queries
docker exec room-03-postgres-master psql -U ceo_admin -c "
  SELECT query, mean_exec_time, calls
  FROM pg_stat_statements
  WHERE mean_exec_time > 100
  ORDER BY mean_exec_time DESC
  LIMIT 5;
"

# Check for missing indexes
docker exec room-03-postgres-master psql -U ceo_admin -c "
  SELECT schemaname, tablename, seq_scan, seq_tup_read
  FROM pg_stat_user_tables
  WHERE seq_scan > 0
  ORDER BY seq_tup_read DESC
  LIMIT 10;
"
```

**Solutions:**
```bash
# 1. Add missing indexes
docker exec room-03-postgres-master psql -U ceo_admin -c "
  CREATE INDEX CONCURRENTLY idx_table_column ON table_name(column_name);
"

# 2. Vacuum and analyze
docker exec room-03-postgres-master psql -U ceo_admin -c "VACUUM ANALYZE;"

# 3. Increase connection pool
docker exec room-03-postgres-master psql -U ceo_admin -c "
  ALTER SYSTEM SET max_connections = 200;
  SELECT pg_reload_conf();
"

# 4. Restart PostgreSQL to apply changes
docker restart room-03-postgres-master
```

### 4.4 Redis Performance Issues

**Symptoms:**
```
Redis latency > 5ms
Eviction rate high
```

**Diagnosis:**
```bash
# Check Redis stats
docker exec room-04-redis-cache redis-cli INFO stats
docker exec room-04-redis-cache redis-cli INFO memory

# Check for slow commands
docker exec room-04-redis-cache redis-cli SLOWLOG GET 10

# Check memory usage
docker exec room-04-redis-cache redis-cli INFO memory | grep used_memory
```

**Solutions:**
```bash
# 1. Increase memory limit
docker update --memory=512m room-04-redis-cache

# 2. Update Redis config
docker exec room-04-redis-cache redis-cli CONFIG SET maxmemory 512mb
docker exec room-04-redis-cache redis-cli CONFIG SET maxmemory-policy allkeys-lru

# 3. Clear old keys (careful!)
docker exec room-04-redis-cache redis-cli --eval "
  local keys = redis.call('keys', 'pattern:*')
  for i=1,#keys do
    redis.call('del', keys[i])
  end
  return #keys
"
```

### 4.5 Network Latency

**Symptoms:**
```
Inter-service communication slow
Timeouts between services
```

**Diagnosis:**
```bash
# Test inter-service latency
docker exec room-13-api-brain ping -c 10 room-03-postgres-master

# Check DNS resolution time
docker exec room-13-api-brain time nslookup room-03-postgres-master

# Check connection pool exhaustion
netstat -an | grep ESTABLISHED | wc -l
```

**Solutions:**
```bash
# 1. Restart network stack
docker network disconnect delqhi-platform-network room-13-api-brain
docker network connect delqhi-platform-network room-13-api-brain

# 2. Recreate network (nuclear option)
docker network rm delqhi-platform-network
docker network create delqhi-platform-network
# Then restart all containers
```

---

## 5. Optimization Techniques

### 5.1 Database Optimization

```bash
# Regular maintenance
docker exec room-03-postgres-master psql -U ceo_admin -c "
  -- Update statistics
  ANALYZE;
  
  -- Vacuum dead tuples
  VACUUM;
  
  -- Reindex if needed
  REINDEX INDEX CONCURRENTLY idx_name;
"

# Connection pooling with PgBouncer (if implemented)
# Update postgresql.conf for better performance
docker exec room-03-postgres-master psql -U ceo_admin -c "
  ALTER SYSTEM SET shared_buffers = '1GB';
  ALTER SYSTEM SET effective_cache_size = '3GB';
  ALTER SYSTEM SET work_mem = '16MB';
  SELECT pg_reload_conf();
"
```

### 5.2 Application Optimization

```bash
# Enable connection pooling
docker exec room-13-api-brain python -c "
import psycopg2.pool
pool = psycopg2.pool.ThreadedConnectionPool(
    minconn=5, maxconn=20,
    host='room-03-postgres-master',
    database='sin_solver_production',
    user='ceo_admin'
)
"

# Enable caching
docker exec room-04-redis-cache redis-cli CONFIG SET activedefrag yes
```

### 5.3 Container Optimization

```bash
# Update resource limits
cat > docker-compose.override.yml <> 'EOF'
version: '3.9'
services:
  room-13-api-brain:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '0.5'
          memory: 1G
  room-03-postgres-master:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
EOF

docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

---

## 6. Monitoring Setup

### 6.1 Prometheus Queries

```promql
# High latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5

# High error rate
rate(http_requests_total{status=~"5.."}[5m]) > 0.1

# High CPU
rate(container_cpu_usage_seconds_total{name="room-13-api-brain"}[5m]) > 0.8

# High memory
container_memory_usage_bytes{name="room-13-api-brain"} / container_spec_memory_limit_bytes > 0.9

# Database connections
postgres_stat_activity_count{state="active"} > 80

# Slow queries
rate(postgresql_stat_statements_seconds_total[5m]) > 0.1
```

### 6.2 Grafana Dashboard

Key panels to add:
- Response Time (p50, p95, p99)
- Request Rate
- Error Rate
- CPU Usage by Service
- Memory Usage by Service
- Database Query Time
- Redis Latency
- Network I/O

### 6.3 Alerting Rules

```yaml
# prometheus-alerts.yml
groups:
  - name: performance
    rules:
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 0.5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
          
      - alert: HighCPUUsage
        expr: rate(container_cpu_usage_seconds_total[5m]) > 0.8
        for: 10m
        labels:
          severity: warning
```

---

## Quick Reference

### Performance Commands

```bash
# Quick health check
./scripts/health-check-all.sh

# API load test
ab -n 1000 -c 10 http://localhost:8000/health

# Database slow queries
docker exec room-03-postgres-master psql -U ceo_admin -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Container stats
docker stats --no-stream

# Restart slow service
docker restart room-13-api-brain
```

### Performance Targets

```
API Response: <100ms (p95)
Database Query: <10ms (avg)
Page Load: <2s
CPU Usage: <70%
Memory Usage: <80%
```

---

**Last Updated:** 2026-01-30  
**Version:** 1.0  
**Owner:** Performance Team  
**Review Cycle:** Monthly
