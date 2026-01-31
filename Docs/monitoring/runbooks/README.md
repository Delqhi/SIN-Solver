# 📋 Alert Runbooks

> **Operational Procedures for SIN-Solver Monitoring Alerts**

**Project:** SIN-Solver Platform  
**Version:** 1.0.0  
**Last Updated:** 2026-01-30  
**Status:** ✅ Production Ready

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Critical Alerts](#critical-alerts)
3. [Warning Alerts](#warning-alerts)
4. [Info Alerts](#info-alerts)
5. [Escalation Procedures](#escalation-procedures)

---

## Overview

This document contains operational runbooks for responding to alerts in the SIN-Solver platform.

### Alert Severity Levels

| Severity | Response Time | Notification | Action |
|----------|--------------|--------------|--------|
| **Critical** | 5 minutes | PagerDuty + Slack | Immediate action required |
| **Warning** | 15 minutes | Slack | Action required soon |
| **Info** | 24 hours | Email digest | Review when convenient |

### Quick Links

- [Grafana Dashboard](https://grafana.delqhi.com)
- [AlertManager](https://alerts.delqhi.com)
- [Jaeger Traces](https://jaeger.delqhi.com)
- [Loki Logs](https://grafana.delqhi.com/explore?orgId=1&left=%7B%22datasource%22:%22Loki%22%7D)

---

## Critical Alerts

### ServiceDown

**Alert:** `ServiceDown`  
**Severity:** Critical  
**Description:** Service has been down for more than 2 minutes

#### Symptoms
- Service not responding to health checks
- `up{job="service-name"} == 0`
- Requests to service failing

#### Diagnostic Steps

```bash
# 1. Check service container status
docker ps | grep <service-name>
docker logs <container-name> --tail 100

# 2. Check if container is running
docker inspect <container-name> --format='{{.State.Status}}'

# 3. Check service logs in Loki
# Grafana → Explore → Loki
# Query: {job="<service-name>"} |= "ERROR"

# 4. Check resource usage
docker stats <container-name> --no-stream

# 5. Check network connectivity
docker exec <container-name> wget -q --spider http://localhost:<port>/health
```

#### Resolution Steps

1. **If container is stopped:**
   ```bash
   docker start <container-name>
   ```

2. **If container is crashing:**
   ```bash
   # Check logs for error
   docker logs <container-name> --tail 500
   
   # Restart with resource limits
   docker-compose restart <service>
   ```

3. **If resource exhaustion:**
   ```bash
   # Check disk space
   df -h
   
   # Clean up if needed
   docker system prune -f
   docker volume prune -f
   ```

4. **If network issue:**
   ```bash
   # Check network
   docker network inspect sin-network
   
   # Recreate container
   docker-compose up -d --force-recreate <service>
   ```

#### Post-Resolution

- Document root cause
- Update runbook if needed
- Consider adding preventive alert

---

### HighErrorRate

**Alert:** `HighErrorRate`  
**Severity:** Critical  
**Description:** Error rate above 5% for more than 5 minutes

#### Symptoms
- `sin_solver:error_rate:rate5m > 0.05`
- Increased 5xx responses
- Failed requests in logs

#### Diagnostic Steps

```bash
# 1. Check error rate in Prometheus
# Query: rate(http_requests_total{status=~"5.."}[5m])

# 2. Check specific errors in logs
# Loki: {job="<service>"} |= "ERROR" | json

# 3. Check recent deployments
git log --oneline -10

# 4. Check traces for errors
# Jaeger: service=<service> tags:error=true

# 5. Check dependency health
# Verify downstream services are healthy
```

#### Resolution Steps

1. **Identify error type:**
   ```bash
   # Check most common errors
   # Loki: {job="<service>"} |= "ERROR" | json | line_format "{{.error}}"
   ```

2. **If database errors:**
   - Check database connectivity
   - Check connection pool exhaustion
   - Review slow query log

3. **If dependency errors:**
   - Check downstream service health
   - Verify network connectivity
   - Check for timeout issues

4. **If code errors:**
   - Review recent changes
   - Rollback if necessary
   - Deploy hotfix

5. **If resource exhaustion:**
   - Scale service horizontally
   - Increase resource limits
   - Optimize code

#### Post-Resolution

- Analyze error patterns
- Add specific error monitoring
- Update error handling

---

### DiskSpaceLow

**Alert:** `DiskSpaceLow`  
**Severity:** Critical  
**Description:** Disk usage above 90%

#### Symptoms
- `node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.1`
- Write operations failing
- Services may crash

#### Diagnostic Steps

```bash
# 1. Check disk usage
df -h

# 2. Check Docker disk usage
docker system df -v

# 3. Find large files/directories
du -sh /var/lib/docker/* | sort -hr | head -20

# 4. Check log sizes
du -sh /var/log/* | sort -hr | head -10

# 5. Check volume sizes
docker volume ls -q | xargs -I {} docker volume inspect {} --format='{{.Name}}: {{.UsageData.Size}}'
```

#### Resolution Steps

1. **Clean Docker:**
   ```bash
   # Remove unused containers
   docker container prune -f
   
   # Remove unused images
   docker image prune -af
   
   # Remove unused volumes
   docker volume prune -f
   
   # Remove unused networks
   docker network prune -f
   
   # Complete cleanup
   docker system prune -af --volumes
   ```

2. **Clean logs:**
   ```bash
   # Truncate large logs
   truncate -s 0 /var/log/<large-log-file>
   
   # Or use logrotate
   logrotate -f /etc/logrotate.conf
   ```

3. **Clean Loki/Prometheus data:**
   ```bash
   # Reduce retention temporarily
   # Edit config and restart
   
   # Or manually delete old data
   # (be careful with this)
   ```

4. **Add more storage:**
   - Expand volume if cloud
   - Add new disk if bare metal
   - Migrate to larger instance

#### Post-Resolution

- Set up automated cleanup
- Add disk usage dashboard
- Configure earlier warning alert (80%)

---

## Warning Alerts

### HighLatency

**Alert:** `HighLatency`  
**Severity:** Warning  
**Description:** P95 latency above 500ms for more than 5 minutes

#### Symptoms
- `sin_solver:latency:p95 > 0.5`
- Slow user experience
- Request timeouts

#### Diagnostic Steps

```bash
# 1. Check latency breakdown
# Prometheus: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# 2. Check traces
# Jaeger: service=<service> duration:>500ms

# 3. Check resource usage
docker stats <container>

# 4. Check database performance
# Postgres: slow query log
# Redis: latency metrics

# 5. Check downstream services
# Verify all dependencies are responsive
```

#### Resolution Steps

1. **If database bottleneck:**
   - Add indexes
   - Optimize queries
   - Scale database

2. **If resource constraints:**
   - Increase CPU/memory limits
   - Scale horizontally
   - Optimize code

3. **If downstream slow:**
   - Check dependency latency
   - Add caching
   - Implement circuit breaker

4. **If traffic spike:**
   - Scale service
   - Enable rate limiting
   - Add CDN

#### Post-Resolution

- Document performance baseline
- Add capacity planning
- Review architecture

---

### HighMemoryUsage

**Alert:** `HighMemoryUsage`  
**Severity:** Warning  
**Description:** Memory usage above 85% for more than 10 minutes

#### Symptoms
- `sin_solver:memory_usage_percent > 85`
- Container near OOM
- Performance degradation

#### Diagnostic Steps

```bash
# 1. Check memory usage
docker stats <container> --no-stream

# 2. Check for memory leaks
# Look at memory trend over time in Grafana

# 3. Check application memory
# Heap dumps, profiling if available

# 4. Check for memory-intensive operations
# Loki: {job="<service>"} |= "memory" | json
```

#### Resolution Steps

1. **If memory leak:**
   - Restart service
   - Profile application
   - Deploy fix

2. **If legitimate high usage:**
   - Increase memory limit
   - Optimize memory usage
   - Scale horizontally

3. **If cache using memory:**
   - Adjust cache size
   - Implement TTL
   - Use external cache

#### Post-Resolution

- Add memory profiling
- Set up memory leak detection
- Document memory requirements

---

### DatabaseConnectionsHigh

**Alert:** `DatabaseConnectionsHigh`  
**Severity:** Warning  
**Description:** Database connection pool above 80% utilization

#### Symptoms
- `sin_solver:db_connection_utilization > 80`
- Connection pool exhaustion
- Query timeouts

#### Diagnostic Steps

```bash
# 1. Check current connections
# Postgres: SELECT count(*) FROM pg_stat_activity;

# 2. Check connection states
# Postgres: SELECT state, count(*) FROM pg_stat_activity GROUP BY state;

# 3. Check for idle connections
# Postgres: SELECT * FROM pg_stat_activity WHERE state = 'idle';

# 4. Check application connection pool settings
# Review connection pool configuration
```

#### Resolution Steps

1. **If connection leak:**
   - Restart application
   - Fix connection handling
   - Add connection timeout

2. **If legitimate high usage:**
   - Increase connection pool size
   - Scale database
   - Add read replicas

3. **If idle connections:**
   - Reduce idle timeout
   - Implement connection pooling
   - Use pgbouncer

#### Post-Resolution

- Monitor connection usage
- Add connection metrics
- Document pool sizing

---

## Info Alerts

### CertificateExpiringSoon

**Alert:** `CertificateExpiringSoon`  
**Severity:** Info  
**Description:** SSL certificate expires in less than 30 days

#### Resolution Steps

1. Check certificate details:
   ```bash
   openssl x509 -in /path/to/cert.pem -text -noout | grep -A2 "Validity"
   ```

2. Renew certificate:
   ```bash
   # Let's Encrypt
   certbot renew
   
   # Or manual renewal process
   ```

3. Update certificate in services

4. Verify renewal:
   ```bash
   openssl s_client -connect domain.com:443 -servername domain.com | openssl x509 -noout -dates
   ```

---

## Escalation Procedures

### When to Escalate

| Scenario | Escalate To | Timeframe |
|----------|-------------|-----------|
| Critical alert unresolved after 30 min | Platform Lead | Immediate |
| Multiple critical alerts | Platform Lead + CTO | Immediate |
| Data loss suspected | Platform Lead + CTO + Legal | Immediate |
| Security incident | Security Team + CTO | Immediate |
| Warning alert unresolved after 2 hours | Platform Lead | Within 1 hour |

### Escalation Contacts

| Role | Contact | Method |
|------|---------|--------|
| Platform Lead | platform-lead@delqhi.com | PagerDuty |
| CTO | cto@delqhi.com | PagerDuty |
| Security Team | security@delqhi.com | Slack #security |
| On-Call Engineer | oncall@delqhi.com | PagerDuty |

### Post-Incident Process

1. **Immediate (within 1 hour):**
   - Resolve incident
   - Document timeline
   - Notify stakeholders

2. **Short-term (within 24 hours):**
   - Write incident report
   - Identify root cause
   - Implement immediate fixes

3. **Long-term (within 1 week):**
   - Conduct post-mortem
   - Implement preventive measures
   - Update runbooks
   - Share learnings

---

## Runbook Maintenance

### Review Schedule

- **Weekly:** Review triggered alerts
- **Monthly:** Update procedures based on incidents
- **Quarterly:** Full runbook review and testing

### Contributing

To update this runbook:

1. Create branch: `git checkout -b update-runbook-<name>`
2. Edit: `Docs/monitoring/runbooks/README.md`
3. Test: Verify procedures work
4. Review: Submit PR for review
5. Deploy: Merge and notify team

---

<div align="center">

**SIN-Solver Alert Runbooks**  
*Operational Procedures for Monitoring Alerts*

[Back to Monitoring Overview →](../01-overview.md)

</div>
