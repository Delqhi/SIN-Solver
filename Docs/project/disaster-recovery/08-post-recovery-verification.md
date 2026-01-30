# Post-Recovery Verification

**Last Updated:** 2026-01-30

## Verification Philosophy

Recovery is not complete until verified. Every recovery action must be validated before declaring the incident resolved.

## Verification Checklist

### Tier 1 Services (Critical)

#### PostgreSQL

```bash
# 1. Service availability
docker ps | grep room-03-postgres-master

# 2. Database connectivity
docker exec room-03-postgres-master pg_isready -U ceo_admin

# 3. Data integrity
docker exec room-03-postgres-master psql -U ceo_admin -c "
  SELECT 
    (SELECT count(*) FROM n8n.workflows) as workflow_count,
    (SELECT count(*) FROM n8n.executions) as execution_count,
    (SELECT count(*) FROM n8n.credentials) as credential_count;
"

# 4. Replication status (if applicable)
docker exec room-03-postgres-master psql -U ceo_admin -c "
  SELECT 
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    flush_lsn,
    replay_lsn
  FROM pg_stat_replication;
"

# 5. Performance baseline
# Compare query execution times to pre-incident baseline
```

**Acceptance Criteria:**
- [ ] Container running and healthy
- [ ] Accepting connections
- [ ] Data counts match expected values (within 1%)
- [ ] Replication lag < 1 minute (if replicated)
- [ ] Query performance within 10% of baseline

#### Redis

```bash
# 1. Service availability
docker ps | grep room-04-redis-cache

# 2. Connectivity test
docker exec room-04-redis-cache redis-cli ping
# Expected: PONG

# 3. Memory usage
docker exec room-04-redis-cache redis-cli info memory | grep used_memory_human

# 4. Key count
docker exec room-04-redis-cache redis-cli dbsize

# 5. Persistence status
docker exec room-04-redis-cache redis-cli info persistence | grep rdb_last_save_status
# Expected: ok
```

**Acceptance Criteria:**
- [ ] Container running and healthy
- [ ] Responding to PING
- [ ] Memory usage normal (< 80% of limit)
- [ ] Key count reasonable (not 0 or unexpectedly high)
- [ ] Last RDB save successful

#### Cloudflare Tunnel

```bash
# 1. Container status
docker ps | grep cloudflared-tunnel

# 2. Tunnel status
docker logs cloudflared-tunnel --tail 50 | grep -i "connected"

# 3. External connectivity
curl -s -o /dev/null -w "%{http_code}" https://your-domain.com/health
# Expected: 200

# 4. DNS resolution
nslookup your-domain.com
# Should resolve to Cloudflare IPs
```

**Acceptance Criteria:**
- [ ] Container running
- [ ] Tunnel connected to Cloudflare
- [ ] External health checks passing
- [ ] DNS resolving correctly

### Tier 2 Services (High Priority)

#### N8N Orchestrator

```bash
# 1. Container status
docker ps | grep agent-01-n8n-orchestrator

# 2. Health endpoint
curl -s http://localhost:5678/healthz
# Expected: {"status":"ok"}

# 3. Workflow count
curl -s http://localhost:5678/rest/workflows \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq '.data | length'

# 4. Recent executions
curl -s "http://localhost:5678/rest/executions?limit=5" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq '.data[].status'

# 5. Test workflow execution
# Trigger a simple test workflow and verify completion
```

**Acceptance Criteria:**
- [ ] Container running and healthy
- [ ] Health endpoint returns OK
- [ ] Workflows accessible via API
- [ ] Recent executions showing normal status
- [ ] Test workflow executes successfully

#### Steel Browser

```bash
# 1. Container status
docker ps | grep agent-05-steel-browser

# 2. Health check
curl -s http://localhost:3005/health
# Expected: {"status":"healthy"}

# 3. Browser pool status
curl -s http://localhost:3005/browsers | jq '.available'
# Expected: > 0

# 4. Test navigation
curl -X POST http://localhost:3005/navigate \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
# Expected: Success response
```

**Acceptance Criteria:**
- [ ] Container running and healthy
- [ ] Health endpoint returns healthy
- [ ] Browser pool has available instances
- [ ] Test navigation succeeds

#### Dashboard

```bash
# 1. Container status
docker ps | grep room-01-dashboard

# 2. Health endpoint
curl -s http://localhost:3011/api/health
# Expected: {"status":"ok","version":"x.x.x"}

# 3. UI accessibility
curl -s -o /dev/null -w "%{http_code}" http://localhost:3011
# Expected: 200

# 4. API endpoints
curl -s http://localhost:3011/api/status | jq '.services'
# Expected: All services showing "healthy"
```

**Acceptance Criteria:**
- [ ] Container running and healthy
- [ ] Health endpoint returns OK
- [ ] UI accessible and loading
- [ ] API endpoints responding
- [ ] All dependent services showing healthy

## Integration Testing

### End-to-End Workflow Test

```bash
#!/bin/bash
# test-e2e-workflow.sh

echo "Testing complete workflow..."

# 1. Create test workflow in N8N
WORKFLOW_ID=$(curl -s -X POST http://localhost:5678/rest/workflows \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -H "Content-Type: application/json" \
  -d @test-workflow.json | jq -r '.id')

# 2. Execute workflow
EXECUTION_ID=$(curl -s -X POST "http://localhost:5678/rest/workflows/$WORKFLOW_ID/execute" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq -r '.executionId')

# 3. Wait for completion
sleep 10

# 4. Check execution status
STATUS=$(curl -s "http://localhost:5678/rest/executions/$EXECUTION_ID" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq -r '.status')

if [ "$STATUS" = "success" ]; then
  echo "E2E test PASSED"
  exit 0
else
  echo "E2E test FAILED: Status = $STATUS"
  exit 1
fi
```

## Performance Verification

### Baseline Comparison

| Metric | Baseline | Post-Recovery | Variance | Status |
|--------|----------|---------------|----------|--------|
| API Response Time | 50ms | 52ms | +4% | PASS |
| Database Query Time | 10ms | 11ms | +10% | PASS |
| Dashboard Load Time | 1.2s | 1.3s | +8% | PASS |
| Workflow Execution | 5s | 5.2s | +4% | PASS |

**Acceptance:** Variance < 20% from baseline

### Load Testing

```bash
# Quick load test to verify capacity
ab -n 1000 -c 10 http://localhost:3011/api/health

# Expected: 99%+ success rate, avg response < 100ms
```

## Data Integrity Verification

### Database Consistency Checks

```sql
-- Run in PostgreSQL
-- Check for orphaned records
SELECT 'orphaned_executions' as check_name, count(*) as count
FROM executions e
LEFT JOIN workflows w ON e.workflowId = w.id
WHERE w.id IS NULL;

-- Check for data anomalies
SELECT 'null_timestamps' as check_name, count(*) as count
FROM executions
WHERE startedAt IS NULL OR stoppedAt IS NULL;

-- Verify record counts by day
SELECT 
  date(created_at) as day,
  count(*) as records
FROM executions
WHERE created_at > now() - interval '7 days'
GROUP BY day
ORDER BY day;
```

### File System Verification

```bash
# Check backup integrity
find backups/ -name "*.sql.gz" -type f -exec gzip -t {} \;

# Verify training data
ls -la training/ | wc -l
# Compare to expected count

# Check model files
find models/ -name "*.pt" -type f -exec ls -lh {} \;
```

## Security Verification

### Access Control

```bash
# Verify authentication is working
curl -s http://localhost:5678/rest/workflows
# Expected: 401 Unauthorized (without API key)

curl -s http://localhost:5678/rest/workflows \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
# Expected: 200 OK (with valid key)
```

### Secrets Validation

```bash
# Verify no secrets in logs
docker logs room-03-postgres-master 2>&1 | grep -i password
# Expected: No matches

# Check file permissions
ls -la .env
# Expected: -rw------- (600)
```

## Final Sign-Off

### Incident Commander Checklist

- [ ] All Tier 1 services verified
- [ ] All Tier 2 services verified
- [ ] Integration tests passing
- [ ] Performance within acceptable range
- [ ] Data integrity confirmed
- [ ] Security controls validated
- [ ] Monitoring alerts cleared
- [ ] Status page updated to "Resolved"
- [ ] Stakeholders notified of resolution
- [ ] Post-mortem scheduled

### Sign-Off Template

```markdown
# Recovery Verification Sign-Off

**Incident ID:** INC-YYYY-MM-DD-XXX
**Date Resolved:** YYYY-MM-DD HH:MM
**Incident Commander:** [Name]

## Verification Summary

| Category | Status | Notes |
|----------|--------|-------|
| Service Availability | PASS | All services healthy |
| Data Integrity | PASS | No corruption detected |
| Performance | PASS | Within 10% of baseline |
| Security | PASS | All controls functional |

## Outstanding Items

- [ ] None
- [ ] [Item description] - Owner - ETA

## Declaration

I confirm that all recovery verification checks have been completed
and the system is fully operational.

**Signature:** _________________
**Date:** _________________
```

## Monitoring Post-Recovery

### Enhanced Monitoring (24-48 hours post-recovery)

| Metric | Check Frequency | Alert Threshold |
|--------|-----------------|-----------------|
| Error Rate | Every 5 min | > 0.1% |
| Response Time | Every 1 min | > 2x baseline |
| Resource Usage | Every 1 min | > 80% |
| Failed Jobs | Every 5 min | > 0 |

### Watch List

Monitor these items closely after recovery:
1. Database replication lag
2. Cache hit rates
3. Workflow execution failures
4. Browser pool utilization
5. Memory leaks in containers
