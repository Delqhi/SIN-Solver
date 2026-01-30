# Scenario 1: Total Data Loss

**Severity:** SEV 1 - Critical  
**RTO Target:** 1 hour  
**RPO Target:** 5 minutes  
**Last Updated:** 2026-01-30

## Scenario Description

Complete loss of all data including:
- PostgreSQL database
- Redis cache
- Configuration files
- Training data and models
- Application state

**Potential Causes:**
- Hardware failure (disk crash)
- Ransomware attack
- Accidental deletion (rm -rf /)
- Natural disaster
- Data center destruction

## Immediate Response (0-15 minutes)

### 1. Incident Declaration

```bash
# Log incident start time
INCIDENT_START=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
echo "INCIDENT START: $INCIDENT_START" >> /var/log/incidents.log

# Create incident channel/room
# Notify on-call engineer
# Page infrastructure team
```

### 2. Assessment

```bash
# Verify extent of data loss
ls -la /Users/jeremy/dev/SIN-Solver/
docker ps -a  # Check container status
df -h  # Check disk space

# Identify last known good backup
ls -lt /Users/jeremy/dev/SIN-Solver/backups/postgres/ | head -5
```

### 3. Stop All Services

```bash
# Prevent further damage
cd /Users/jeremy/dev/SIN-Solver
docker compose down

# Verify all containers stopped
docker ps -q | xargs -r docker stop
docker ps -q | xargs -r docker rm
```

## Recovery Phase 1: Infrastructure (15-30 minutes)

### 1. Prepare Clean Environment

```bash
# Create new data directories
mkdir -p /Users/jeremy/dev/SIN-Solver/data/postgres
mkdir -p /Users/jeremy/dev/SIN-Solver/data/redis
mkdir -p /Users/jeremy/dev/SIN-Solver/backups/temp

# Set permissions
chmod 700 /Users/jeremy/dev/SIN-Solver/data/postgres
chmod 700 /Users/jeremy/dev/SIN-Solver/data/redis
```

### 2. Restore Configuration

```bash
# Clone repository for clean configs
cd /tmp
git clone https://github.com/your-org/SIN-Solver.git sin-solver-clean
cp sin-solver-clean/docker-compose.yml /Users/jeremy/dev/SIN-Solver/
cp sin-solver-clean/.env.example /Users/jeremy/dev/SIN-Solver/.env

# Or restore from backup
cp /Volumes/Backup/sin-solver/configs/docker-compose.yml /Users/jeremy/dev/SIN-Solver/
cp /Volumes/Backup/sin-solver/configs/.env /Users/jeremy/dev/SIN-Solver/

# Edit .env with current secrets
nano /Users/jeremy/dev/SIN-Solver/.env
```

## Recovery Phase 2: Database Restoration (30-60 minutes)

### 1. Start PostgreSQL Container

```bash
cd /Users/jeremy/dev/SIN-Solver

# Start only PostgreSQL first
docker compose up -d room-03-postgres-master

# Wait for PostgreSQL to be ready
sleep 30
docker exec room-03-postgres-master pg_isready -U ceo_admin
```

### 2. Restore from Backup

```bash
# Identify latest backup
LATEST_BACKUP=$(ls -t /Users/jeremy/dev/SIN-Solver/backups/postgres/*.sql.gz | head -1)
echo "Restoring from: $LATEST_BACKUP"

# Restore database
docker exec -i room-03-postgres-master psql -U ceo_admin < <(gunzip < $LATEST_BACKUP)

# If using pg_dump (custom format):
# docker exec -i room-03-postgres-master pg_restore -U ceo_admin -d postgres < <(gunzip < $LATEST_BACKUP)

# Verify restoration
docker exec room-03-postgres-master psql -U ceo_admin -c "\l"
docker exec room-03-postgres-master psql -U ceo_admin -c "SELECT count(*) FROM n8n.workflows;"
```

### 3. Point-in-Time Recovery (if needed)

```bash
# If WAL archiving is enabled, recover to specific point
# This requires continuous archiving configuration

# Restore base backup first
docker exec -i room-03-postgres-master psql -U ceo_admin < base_backup.sql

# Apply WAL files
cp /backups/wal/*.wal /Users/jeremy/dev/SIN-Solver/data/postgres/pg_wal/
docker exec room-03-postgres-master pg_ctl promote
```

## Recovery Phase 3: Service Restoration (60-90 minutes)

### 1. Start Redis

```bash
# Start Redis container
docker compose up -d room-04-redis-cache

# Restore Redis data if available
LATEST_RDB=$(ls -t /Users/jeremy/dev/SIN-Solver/backups/redis/*.rdb | head -1)
if [ -f "$LATEST_RDB" ]; then
  docker cp $LATEST_RDB room-04-redis-cache:/data/dump.rdb
  docker restart room-04-redis-cache
fi

# Verify Redis
docker exec room-04-redis-cache redis-cli ping
```

### 2. Start Application Services

```bash
# Start remaining services
docker compose up -d

# Wait for services to initialize
sleep 60

# Check service health
docker compose ps
```

### 3. Restore Training Data

```bash
# Restore training data from backup
if [ -d "/Volumes/Backup/sin-solver/training" ]; then
  rsync -av /Volumes/Backup/sin-solver/training/ /Users/jeremy/dev/SIN-Solver/training/
fi

# Restore models
if [ -d "/Volumes/Backup/sin-solver/models" ]; then
  rsync -av /Volumes/Backup/sin-solver/models/ /Users/jeremy/dev/SIN-Solver/models/
fi
```

## Verification (90-120 minutes)

### 1. Service Health Checks

```bash
# PostgreSQL
docker exec room-03-postgres-master pg_isready -U ceo_admin

# Redis
docker exec room-04-redis-cache redis-cli ping

# N8N
curl -s http://localhost:5678/healthz

# Steel Browser
curl -s http://localhost:3005/health

# Dashboard
curl -s http://localhost:3011/api/health
```

### 2. Data Integrity Checks

```bash
# Verify critical data
docker exec room-03-postgres-master psql -U ceo_admin -c "
  SELECT 
    (SELECT count(*) FROM n8n.workflows) as workflows,
    (SELECT count(*) FROM n8n.executions) as executions,
    (SELECT count(*) FROM n8n.credentials) as credentials;
"

# Compare to expected counts from backup manifest
```

### 3. End-to-End Testing

```bash
# Run full test suite
cd /Users/jeremy/dev/SIN-Solver
./run_tests.sh

# Or manual verification
./scripts/health-check.sh
```

## Post-Recovery Actions

### 1. Update DNS/Cloudflare

```bash
# Verify Cloudflare tunnel is connected
docker logs cloudflared-tunnel --tail 20

# Test external access
curl -s https://your-domain.com/api/health
```

### 2. Notify Stakeholders

- Update status page to "Monitoring"
- Send resolution email to stakeholders
- Schedule post-mortem meeting

### 3. Enhance Monitoring

```bash
# Verify all monitoring is working
# Check alerts are flowing
# Review logs for any errors
```

## Rollback Procedure

If recovery fails:

```bash
# Stop all services
docker compose down

# Restore from earlier backup
# Or contact backup hosting provider for older backups

# Consider engaging professional data recovery services
```

## Communication Templates

### Initial Notification

```
Subject: [SEV 1] Total Data Loss - Recovery in Progress

We have experienced a total data loss incident affecting all services.
Our team is executing the disaster recovery plan.

Estimated Recovery Time: 2 hours
Next Update: 30 minutes

We apologize for the inconvenience.
```

### Progress Update

```
Subject: [UPDATE] Data Recovery Progress

Recovery Status:
- Database restoration: 75% complete
- Services restarting: In progress
- Data integrity: Being verified

Updated ETA: 45 minutes
```

### Resolution

```
Subject: [RESOLVED] All Services Restored

All services have been restored from backup.
Data loss: Minimal (last 5 minutes)
All systems operational.

Post-mortem meeting scheduled for tomorrow.
```

## Prevention Measures

After recovery, implement:

1. **Enhanced Backup Strategy:**
   - Increase backup frequency
   - Add off-site backups
   - Implement continuous replication

2. **Monitoring Improvements:**
   - Disk health monitoring
   - Backup verification alerts
   - Early warning systems

3. **Process Changes:**
   - Regular DR drills
   - Backup restoration tests
   - Access control reviews

## Related Documents

- [Backup Strategy](../04-backup-strategy.md)
- [Post-Recovery Verification](../08-post-recovery-verification.md)
- [Lessons Learned Process](../09-lessons-learned.md)
