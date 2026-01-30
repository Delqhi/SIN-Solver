# Failover Procedures

**Last Updated:** 2026-01-30

## Failover Types

### Automatic Failover

Services configured with automatic failover:

| Service | Trigger | Action | Recovery Time |
|---------|---------|--------|---------------|
| Cloudflare Tunnel | Health check fails | Restart container | < 2 min |
| Redis | Connection timeout | Failover to replica | < 1 min |
| N8N | Process crash | Docker auto-restart | < 30 sec |
| Dashboard | Health endpoint fails | Container restart | < 1 min |

### Manual Failover

Requires operator intervention:

| Service | Trigger | Action | Recovery Time |
|---------|---------|--------|---------------|
| PostgreSQL | Primary failure | Promote replica | 5-10 min |
| Docker Host | Host crash | Start on backup host | 15-30 min |
| Full Environment | Catastrophic failure | DR site activation | 1-4 hours |

## Failover Decision Matrix

```
Service Down?
    |
    ├─ Yes → Health Check Failed?
    |           |
    |           ├─ Yes → Automatic Restart
    |           |           |
    |           |           └─ Success? → Monitor
    |           |           |
    |           |           └─ Failed? → Manual Intervention
    |           |
    |           └─ No → Infrastructure Issue?
    |                       |
    |                       ├─ Yes → Activate DR Procedures
    |                       |
    |                       └─ No → Investigate Application
    |
    └─ No → Continue Monitoring
```

## Automatic Failover Configuration

### Docker Restart Policies

```yaml
# docker-compose.yml
services:
  room-03-postgres-master:
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ceo_admin"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  room-04-redis-cache:
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
```

### Health Check Endpoints

| Service | Endpoint | Expected Response |
|---------|----------|-------------------|
| PostgreSQL | pg_isready | exit 0 |
| Redis | PING | PONG |
| N8N | /healthz | HTTP 200 |
| Steel Browser | /health | HTTP 200 |
| Dashboard | /api/health | HTTP 200 |

## Manual Failover Procedures

### PostgreSQL Primary Failover

```bash
# 1. Verify primary is down
docker exec room-03-postgres-master pg_isready

# 2. Promote replica to primary
docker exec room-03-postgres-replica pg_ctl promote

# 3. Update application connections
# Edit .env to point to new primary
# Restart dependent services

# 4. Verify failover
docker exec room-03-postgres-replica psql -c "SELECT pg_is_in_recovery();"
# Should return 'f' (false) indicating it's now primary
```

### Full Environment Failover

```bash
# 1. Activate DR site
ssh dr-host

# 2. Start core services
docker compose -f docker-compose.dr.yml up -d postgres redis

# 3. Restore latest backup
./scripts/restore-backup.sh --latest

# 4. Start remaining services
docker compose -f docker-compose.dr.yml up -d

# 5. Update DNS/Cloudflare to point to DR site
# Update tunnel configuration

# 6. Verify all services
./scripts/health-check.sh
```

## Failback Procedures

After primary site recovery:

```bash
# 1. Sync data from DR to primary
pg_dump -h dr-host -U ceo_admin | psql -h primary-host -U ceo_admin

# 2. Start primary services
docker compose up -d

# 3. Verify primary is healthy
./scripts/health-check.sh

# 4. Update DNS/Cloudflare to point to primary

# 5. Gracefully shutdown DR services
docker compose -f docker-compose.dr.yml down
```

## Monitoring During Failover

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| Failover time | Custom script | > 5 minutes |
| Data lag | PostgreSQL | > 1 minute |
| Service availability | Uptime monitor | < 99.9% |
| Error rate | Application logs | > 1% |

## Communication During Failover

1. **Immediate (0-5 min):** Acknowledge incident, begin failover
2. **Status Update (5 min):** Report failover progress
3. **Resolution (on completion):** Confirm service restoration
4. **Post-mortem (within 24h):** Document root cause and improvements
