# RB-002: Database Backup & Restore Runbook

**Purpose:** Create, manage, and restore backups for all SIN-Solver databases.

**Scope:** PostgreSQL, Redis, Vault, n8n data, Steel profiles

**Prerequisites:**
- Docker access
- Sufficient disk space (minimum 10GB free)
- Backup directory: `/backups` or configurable path
- Read/write permissions to Docker volumes

---

## Table of Contents

1. [Backup Strategy Overview](#1-backup-strategy-overview)
2. [Automated Daily Backups](#2-automated-daily-backups)
3. [Manual Backup Procedures](#3-manual-backup-procedures)
4. [Restore Procedures](#4-restore-procedures)
5. [Backup Verification](#5-backup-verification)
6. [Backup Cleanup & Retention](#6-backup-cleanup--retention)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Backup Strategy Overview

### 1.1 Backup Schedule

| Service | Frequency | Retention | Method | Location |
|---------|-----------|-----------|--------|----------|
| PostgreSQL | Daily | 30 days | pg_dumpall | `/backups/postgres/` |
| Redis | Daily | 7 days | RDB snapshot | `/backups/redis/` |
| Vault | Daily | 30 days | Raft snapshot | `/backups/vault/` |
| n8n | Daily | 7 days | Volume tar | `/backups/n8n/` |
| Steel Profiles | Weekly | 30 days | Volume tar | `/backups/steel/` |

### 1.2 Backup Storage Locations

```bash
# Primary backup directory
BACKUP_BASE="/Users/jeremy/backups/sin-solver"

# Subdirectories
mkdir -p "$BACKUP_BASE"/{postgres,redis,vault,n8n,steel,logs}

# Verify structure
ls -la "$BACKUP_BASE"

# Expected Output:
# drwxr-xr-x  user  staff  postgres/
# drwxr-xr-x  user  staff  redis/
# drwxr-xr-x  user  staff  vault/
# drwxr-xr-x  user  staff  n8n/
# drwxr-xr-x  user  staff  steel/
# drwxr-xr-x  user  staff  logs/
```

---

## 2. Automated Daily Backups

### 2.1 Create Backup Script

```bash
# Create backup script
cat > /Users/jeremy/dev/SIN-Solver/scripts/backup-all.sh << 'EOF'
#!/bin/bash
set -e

# Configuration
BACKUP_BASE="/Users/jeremy/backups/sin-solver"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$BACKUP_BASE/logs/backup-$DATE.log"

# Create log file
exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

echo "========================================"
echo "SIN-Solver Backup Started: $(date)"
echo "========================================"

# Create backup directories
mkdir -p "$BACKUP_BASE"/{postgres,redis,vault,n8n,steel}

# Function to check if container is running
check_container() {
    local container=$1
    if ! docker ps --format "{{.Names}}" | grep -q "^${container}$"; then
        echo "❌ Container $container is not running, skipping..."
        return 1
    fi
    return 0
}

# 1. PostgreSQL Backup
echo ""
echo "📦 Backing up PostgreSQL..."
if check_container "room-03-postgres-master"; then
    docker exec room-03-postgres-master pg_dumpall -U ceo_admin \
        > "$BACKUP_BASE/postgres/postgres-full-$DATE.sql" 2>&1
    
    if [ $? -eq 0 ]; then
        # Compress backup
        gzip "$BACKUP_BASE/postgres/postgres-full-$DATE.sql"
        echo "✅ PostgreSQL backup completed: postgres-full-$DATE.sql.gz"
        ls -lh "$BACKUP_BASE/postgres/postgres-full-$DATE.sql.gz"
    else
        echo "❌ PostgreSQL backup failed"
    fi
else
    echo "⚠️ PostgreSQL container not running"
fi

# 2. Redis Backup
echo ""
echo "📦 Backing up Redis..."
if check_container "room-04-redis-cache"; then
    # Trigger BGSAVE
    docker exec room-04-redis-cache redis-cli BGSAVE
    
    # Wait for save to complete
    sleep 5
    
    # Copy dump file
    docker cp room-04-redis-cache:/data/dump.rdb \
        "$BACKUP_BASE/redis/redis-dump-$DATE.rdb"
    
    if [ $? -eq 0 ]; then
        echo "✅ Redis backup completed: redis-dump-$DATE.rdb"
        ls -lh "$BACKUP_BASE/redis/redis-dump-$DATE.rdb"
    else
        echo "❌ Redis backup failed"
    fi
else
    echo "⚠️ Redis container not running"
fi

# 3. Vault Backup
echo ""
echo "📦 Backing up Vault..."
if check_container "room-02-tresor-vault"; then
    # Create snapshot
    docker exec room-02-tresor-vault vault operator raft snapshot save \
        /tmp/vault-$DATE.snap
    
    # Copy from container
    docker cp room-02-tresor-vault:/tmp/vault-$DATE.snap \
        "$BACKUP_BASE/vault/vault-snapshot-$DATE.snap"
    
    if [ $? -eq 0 ]; then
        echo "✅ Vault backup completed: vault-snapshot-$DATE.snap"
        ls -lh "$BACKUP_BASE/vault/vault-snapshot-$DATE.snap"
    else
        echo "❌ Vault backup failed"
    fi
else
    echo "⚠️ Vault container not running"
fi

# 4. n8n Backup
echo ""
echo "📦 Backing up n8n..."
if check_container "agent-01-n8n-orchestrator"; then
    docker run --rm \
        -v n8n_data:/data \
        -v "$BACKUP_BASE/n8n:/backup" \
        busybox tar czf "/backup/n8n-data-$DATE.tar.gz" -C /data .
    
    if [ $? -eq 0 ]; then
        echo "✅ n8n backup completed: n8n-data-$DATE.tar.gz"
        ls -lh "$BACKUP_BASE/n8n/n8n-data-$DATE.tar.gz"
    else
        echo "❌ n8n backup failed"
    fi
else
    echo "⚠️ n8n container not running"
fi

# 5. Steel Profiles Backup (Weekly only - check day)
if [ "$(date +%u)" -eq 7 ]; then  # Sunday
    echo ""
    echo "📦 Backing up Steel Profiles (Weekly)..."
    if check_container "agent-05-steel-browser"; then
        docker run --rm \
            -v agent-05-profiles:/data \
            -v "$BACKUP_BASE/steel:/backup" \
            busybox tar czf "/backup/steel-profiles-$DATE.tar.gz" -C /data .
        
        if [ $? -eq 0 ]; then
            echo "✅ Steel profiles backup completed: steel-profiles-$DATE.tar.gz"
            ls -lh "$BACKUP_BASE/steel/steel-profiles-$DATE.tar.gz"
        else
            echo "❌ Steel profiles backup failed"
        fi
    else
        echo "⚠️ Steel browser container not running"
    fi
fi

# Summary
echo ""
echo "========================================"
echo "Backup Summary: $(date)"
echo "========================================"
du -sh "$BACKUP_BASE"/* 2>/dev/null | grep -v logs
echo ""
echo "Log file: $LOG_FILE"
echo "✅ Backup process completed"
EOF

# Make executable
chmod +x /Users/jeremy/dev/SIN-Solver/scripts/backup-all.sh

echo "✅ Backup script created at: /Users/jeremy/dev/SIN-Solver/scripts/backup-all.sh"
```

### 2.2 Schedule with Cron (macOS/Linux)

```bash
# Edit crontab
crontab -e

# Add daily backup at 2:00 AM
0 2 * * * /Users/jeremy/dev/SIN-Solver/scripts/backup-all.sh

# Verify cron job
crontab -l | grep backup-all

# Expected Output:
# 0 2 * * * /Users/jeremy/dev/SIN-Solver/scripts/backup-all.sh
```

### 2.3 Schedule with LaunchAgent (macOS Alternative)

```bash
# Create LaunchAgent plist
cat > ~/Library/LaunchAgents/com.sin-solver.backup.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.sin-solver.backup</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/jeremy/dev/SIN-Solver/scripts/backup-all.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/Users/jeremy/backups/sin-solver/logs/backup-launchd.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/jeremy/backups/sin-solver/logs/backup-launchd-error.log</string>
</dict>
</plist>
EOF

# Load the LaunchAgent
launchctl load ~/Library/LaunchAgents/com.sin-solver.backup.plist

# Verify it's loaded
launchctl list | grep com.sin-solver.backup
```

---

## 3. Manual Backup Procedures

### 3.1 PostgreSQL Manual Backup

```bash
# Single database backup
docker exec room-03-postgres-master pg_dump -U ceo_admin sin_solver_production \
    > /Users/jeremy/backups/sin-solver/postgres/sin_solver-$(date +%Y%m%d).sql

# All databases backup
docker exec room-03-postgres-master pg_dumpall -U ceo_admin \
    > /Users/jeremy/backups/sin-solver/postgres/postgres-full-$(date +%Y%m%d).sql

# Compressed backup
docker exec room-03-postgres-master pg_dumpall -U ceo_admin | gzip \
    > /Users/jeremy/backups/sin-solver/postgres/postgres-full-$(date +%Y%m%d).sql.gz

# Verify backup
ls -lh /Users/jeremy/backups/sin-solver/postgres/

# Check backup integrity
gunzip -t /Users/jeremy/backups/sin-solver/postgres/postgres-full-*.sql.gz
echo "✅ Backup integrity verified"
```

### 3.2 Redis Manual Backup

```bash
# Trigger RDB save
docker exec room-04-redis-cache redis-cli BGSAVE

# Wait for save to complete
sleep 5

# Copy dump file
docker cp room-04-redis-cache:/data/dump.rdb \
    /Users/jeremy/backups/sin-solver/redis/redis-dump-$(date +%Y%m%d).rdb

# Verify backup
ls -lh /Users/jeremy/backups/sin-solver/redis/
redis-check-rdb /Users/jeremy/backups/sin-solver/redis/redis-dump-*.rdb
```

### 3.3 Vault Manual Backup

```bash
# Create snapshot
docker exec room-02-tresor-vault vault operator raft snapshot save \
    /tmp/vault-manual.snap

# Copy to backup location
docker cp room-02-tresor-vault:/tmp/vault-manual.snap \
    /Users/jeremy/backups/sin-solver/vault/vault-snapshot-$(date +%Y%m%d).snap

# Verify backup
ls -lh /Users/jeremy/backups/sin-solver/vault/
```

### 3.4 n8n Manual Backup

```bash
# Backup n8n data volume
docker run --rm \
    -v n8n_data:/data \
    -v /Users/jeremy/backups/sin-solver/n8n:/backup \
    busybox tar czf "/backup/n8n-data-$(date +%Y%m%d).tar.gz" -C /data .

# Verify backup
ls -lh /Users/jeremy/backups/sin-solver/n8n/

tar -tzf /Users/jeremy/backups/sin-solver/n8n/n8n-data-*.tar.gz | head -20
```

### 3.5 Steel Profiles Manual Backup

```bash
# Backup Steel browser profiles
docker run --rm \
    -v agent-05-profiles:/data \
    -v /Users/jeremy/backups/sin-solver/steel:/backup \
    busybox tar czf "/backup/steel-profiles-$(date +%Y%m%d).tar.gz" -C /data .

# Verify backup
ls -lh /Users/jeremy/backups/sin-solver/steel/
```

---

## 4. Restore Procedures

### 4.1 PostgreSQL Restore

```bash
# ⚠️ WARNING: This will overwrite existing data!
# Ensure you have a current backup before proceeding

# Step 1: Stop dependent services
cd /Users/jeremy/dev/SIN-Solver
make stop-agents
make stop-solvers

# Step 2: Backup current data (just in case)
docker exec room-03-postgres-master pg_dumpall -U ceo_admin \
    > /Users/jeremy/backups/sin-solver/postgres/pre-restore-backup-$(date +%Y%m%d_%H%M%S).sql

# Step 3: Identify backup file to restore
BACKUP_FILE="/Users/jeremy/backups/sin-solver/postgres/postgres-full-20260130.sql.gz"

# Step 4: Restore from backup
# If compressed:
gunzip -c "$BACKUP_FILE" | docker exec -i room-03-postgres-master psql -U ceo_admin

# If uncompressed:
# docker exec -i room-03-postgres-master psql -U ceo_admin < "$BACKUP_FILE"

# Step 5: Verify restoration
docker exec room-03-postgres-master psql -U ceo_admin -c "\l"

# Expected Output:
#                                   List of databases
#    Name        |  Owner   | Encoding |   Collate   |    Ctype    |   Access privileges
# ---------------+----------+----------+-------------+-------------+-----------------------
#  n8n           | ceo_admin| UTF8     | en_US.UTF-8 | en_US.UTF-8 |
#  plane         | ceo_admin| UTF8     | en_US.UTF-8 | en_US.UTF-8 |
#  postgres      | ceo_admin| UTF8     | en_US.UTF-8 | en_US.UTF-8 |
#  sin_solver... | ceo_admin| UTF8     | en_US.UTF-8 | en_US.UTF-8 |

# Step 6: Restart services
make start-agents
make start-solvers

# Step 7: Verify services are healthy
./scripts/health-check-all.sh
```

### 4.2 Redis Restore

```bash
# ⚠️ WARNING: This will overwrite current Redis data!

# Step 1: Stop Redis
docker stop room-04-redis-cache

# Step 2: Backup current data
docker cp room-04-redis-cache:/data/dump.rdb \
    /Users/jeremy/backups/sin-solver/redis/pre-restore-dump-$(date +%Y%m%d_%H%M%S).rdb

# Step 3: Identify backup file
BACKUP_FILE="/Users/jeremy/backups/sin-solver/redis/redis-dump-20260130.rdb"

# Step 4: Copy backup to Redis data directory
docker cp "$BACKUP_FILE" room-04-redis-cache:/data/dump.rdb

# Step 5: Start Redis
docker start room-04-redis-cache

# Step 6: Verify restoration
docker exec room-04-redis-cache redis-cli ping
# Expected: PONG

docker exec room-04-redis-cache redis-cli INFO keyspace
# Expected: Shows database statistics
```

### 4.3 Vault Restore

```bash
# ⚠️ WARNING: Vault restore requires unsealing!

# Step 1: Check Vault status
docker exec room-02-tresor-vault vault status

# Step 2: If sealed, unseal first
docker exec room-02-tresor-vault vault operator unseal <unseal-key-1>
docker exec room-02-tresor-vault vault operator unseal <unseal-key-2>
docker exec room-02-tresor-vault vault operator unseal <unseal-key-3>

# Step 3: Identify backup file
BACKUP_FILE="/Users/jeremy/backups/sin-solver/vault/vault-snapshot-20260130.snap"

# Step 4: Copy backup to container
docker cp "$BACKUP_FILE" room-02-tresor-vault:/tmp/restore.snap

# Step 5: Restore snapshot
docker exec room-02-tresor-vault vault operator raft snapshot restore /tmp/restore.snap

# Step 6: Verify restoration
docker exec room-02-tresor-vault vault kv list secret/
```

### 4.4 n8n Restore

```bash
# ⚠️ WARNING: This will overwrite current n8n data!

# Step 1: Stop n8n
docker stop agent-01-n8n-orchestrator

# Step 2: Backup current data
docker run --rm \
    -v n8n_data:/data \
    -v /Users/jeremy/backups/sin-solver/n8n:/backup \
    busybox tar czf "/backup/n8n-pre-restore-$(date +%Y%m%d_%H%M%S).tar.gz" -C /data .

# Step 3: Clear current data
docker run --rm -v n8n_data:/data busybox rm -rf /data/*

# Step 4: Identify backup file
BACKUP_FILE="/Users/jeremy/backups/sin-solver/n8n/n8n-data-20260130.tar.gz"

# Step 5: Extract backup
docker run --rm \
    -v n8n_data:/data \
    -v "$BACKUP_FILE:/backup/n8n-backup.tar.gz:ro" \
    busybox tar xzf /backup/n8n-backup.tar.gz -C /data

# Step 6: Start n8n
docker start agent-01-n8n-orchestrator

# Step 7: Verify restoration
curl -s http://localhost:5678/healthz
echo "✅ n8n restored successfully"
```

### 4.5 Steel Profiles Restore

```bash
# ⚠️ WARNING: This will overwrite current browser profiles!

# Step 1: Stop Steel Browser
docker stop agent-05-steel-browser

# Step 2: Backup current profiles
docker run --rm \
    -v agent-05-profiles:/data \
    -v /Users/jeremy/backups/sin-solver/steel:/backup \
    busybox tar czf "/backup/steel-pre-restore-$(date +%Y%m%d_%H%M%S).tar.gz" -C /data .

# Step 3: Clear current profiles
docker run --rm -v agent-05-profiles:/data busybox rm -rf /data/*

# Step 4: Identify backup file
BACKUP_FILE="/Users/jeremy/backups/sin-solver/steel/steel-profiles-20260130.tar.gz"

# Step 5: Extract backup
docker run --rm \
    -v agent-05-profiles:/data \
    -v "$BACKUP_FILE:/backup/steel-backup.tar.gz:ro" \
    busybox tar xzf /backup/steel-backup.tar.gz -C /data

# Step 6: Start Steel Browser
docker start agent-05-steel-browser

# Step 7: Verify restoration
curl -s http://localhost:3005/health
echo "✅ Steel profiles restored successfully"
```

---

## 5. Backup Verification

### 5.1 Automated Verification Script

```bash
cat > /Users/jeremy/dev/SIN-Solver/scripts/verify-backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/Users/jeremy/backups/sin-solver"
DATE=$(date +%Y%m%d)

verify_postgres() {
    echo "Verifying PostgreSQL backup..."
    local latest=$(ls -t $BACKUP_DIR/postgres/*.sql.gz 2>/dev/null | head -1)
    if [ -z "$latest" ]; then
        echo "❌ No PostgreSQL backup found"
        return 1
    fi
    
    if gunzip -t "$latest" 2>/dev/null; then
        echo "✅ PostgreSQL backup valid: $(basename $latest)"
        ls -lh "$latest"
        return 0
    else
        echo "❌ PostgreSQL backup corrupted: $(basename $latest)"
        return 1
    fi
}

verify_redis() {
    echo "Verifying Redis backup..."
    local latest=$(ls -t $BACKUP_DIR/redis/*.rdb 2>/dev/null | head -1)
    if [ -z "$latest" ]; then
        echo "❌ No Redis backup found"
        return 1
    fi
    
    if redis-check-rdb "$latest" 2>/dev/null | grep -q "checksum"; then
        echo "✅ Redis backup valid: $(basename $latest)"
        ls -lh "$latest"
        return 0
    else
        echo "❌ Redis backup may be invalid: $(basename $latest)"
        return 1
    fi
}

verify_vault() {
    echo "Verifying Vault backup..."
    local latest=$(ls -t $BACKUP_DIR/vault/*.snap 2>/dev/null | head -1)
    if [ -z "$latest" ]; then
        echo "❌ No Vault backup found"
        return 1
    fi
    
    if [ -s "$latest" ]; then
        echo "✅ Vault backup exists: $(basename $latest)"
        ls -lh "$latest"
        return 0
    else
        echo "❌ Vault backup is empty: $(basename $latest)"
        return 1
    fi
}

verify_n8n() {
    echo "Verifying n8n backup..."
    local latest=$(ls -t $BACKUP_DIR/n8n/*.tar.gz 2>/dev/null | head -1)
    if [ -z "$latest" ]; then
        echo "❌ No n8n backup found"
        return 1
    fi
    
    if tar -tzf "$latest" > /dev/null 2>&1; then
        echo "✅ n8n backup valid: $(basename $latest)"
        ls -lh "$latest"
        return 0
    else
        echo "❌ n8n backup corrupted: $(basename $latest)"
        return 1
    fi
}

echo "========================================"
echo "Backup Verification: $(date)"
echo "========================================"

verify_postgres
verify_redis
verify_vault
verify_n8n

echo ""
echo "========================================"
echo "Verification Complete"
echo "========================================"
EOF

chmod +x /Users/jeremy/dev/SIN-Solver/scripts/verify-backup.sh
```

### 5.2 Run Verification

```bash
/Users/jeremy/dev/SIN-Solver/scripts/verify-backup.sh
```

---

## 6. Backup Cleanup & Retention

### 6.1 Automated Cleanup Script

```bash
cat > /Users/jeremy/dev/SIN-Solver/scripts/cleanup-backups.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/Users/jeremy/backups/sin-solver"
LOG_FILE="$BACKUP_DIR/logs/cleanup-$(date +%Y%m%d).log"

exec 1> >(tee -a "$LOG_FILE")
exec 2>&1

echo "========================================"
echo "Backup Cleanup: $(date)"
echo "========================================"

# PostgreSQL: Keep 30 days
echo "Cleaning PostgreSQL backups (keep 30 days)..."
find "$BACKUP_DIR/postgres" -name "*.sql.gz" -type f -mtime +30 -delete

# Redis: Keep 7 days
echo "Cleaning Redis backups (keep 7 days)..."
find "$BACKUP_DIR/redis" -name "*.rdb" -type f -mtime +7 -delete

# Vault: Keep 30 days
echo "Cleaning Vault backups (keep 30 days)..."
find "$BACKUP_DIR/vault" -name "*.snap" -type f -mtime +30 -delete

# n8n: Keep 7 days
echo "Cleaning n8n backups (keep 7 days)..."
find "$BACKUP_DIR/n8n" -name "*.tar.gz" -type f -mtime +7 -delete

# Steel: Keep 30 days
echo "Cleaning Steel backups (keep 30 days)..."
find "$BACKUP_DIR/steel" -name "*.tar.gz" -type f -mtime +30 -delete

# Logs: Keep 90 days
echo "Cleaning old logs (keep 90 days)..."
find "$BACKUP_DIR/logs" -name "*.log" -type f -mtime +90 -delete

echo ""
echo "Current backup sizes:"
du -sh "$BACKUP_DIR"/* 2>/dev/null

echo ""
echo "✅ Cleanup completed"
EOF

chmod +x /Users/jeremy/dev/SIN-Solver/scripts/cleanup-backups.sh
```

### 6.2 Schedule Cleanup

```bash
# Add to crontab (run weekly on Sundays at 3 AM)
crontab -e

# Add line:
0 3 * * 0 /Users/jeremy/dev/SIN-Solver/scripts/cleanup-backups.sh
```

---

## 7. Troubleshooting

### 7.1 Backup Fails - Insufficient Disk Space

```bash
# Check disk space
df -h

# Check backup directory size
du -sh /Users/jeremy/backups/sin-solver

# Free up space
/Users/jeremy/dev/SIN-Solver/scripts/cleanup-backups.sh

# If still insufficient, move old backups to external storage
mkdir -p /Volumes/External/backups/sin-solver-archive
find /Users/jeremy/backups/sin-solver -name "*.tar.gz" -mtime +7 -exec mv {} /Volumes/External/backups/sin-solver-archive/ \;
```

### 7.2 PostgreSQL Backup Fails

```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs room-03-postgres-master --tail 50

# Test connection
docker exec room-03-postgres-master pg_isready -U ceo_admin

# If authentication fails, check credentials
docker exec room-03-postgres-master cat /var/lib/postgresql/data/pg_hba.conf
```

### 7.3 Redis Backup Fails

```bash
# Check Redis is running
docker ps | grep redis

# Test connection
docker exec room-04-redis-cache redis-cli ping

# Check if BGSAVE is already running
docker exec room-04-redis-cache redis-cli INFO persistence | grep rdb_bgsave_in_progress

# If stuck, restart Redis
docker restart room-04-redis-cache
```

### 7.4 Vault Backup Fails

```bash
# Check Vault status
docker exec room-02-tresor-vault vault status

# If sealed, unseal
docker exec room-02-tresor-vault vault operator unseal <unseal-key>

# Check token permissions
docker exec room-02-tresor-vault vault token lookup
```

### 7.5 Restore Fails - Data Corruption

```bash
# If restore fails, try previous backup
ls -lt /Users/jeremy/backups/sin-solver/postgres/*.sql.gz

# Use second most recent backup
BACKUP_FILE=$(ls -t /Users/jeremy/backups/sin-solver/postgres/*.sql.gz | sed -n '2p')

# Retry restore with older backup
gunzip -c "$BACKUP_FILE" | docker exec -i room-03-postgres-master psql -U ceo_admin
```

---

## Quick Reference

### Backup Commands

```bash
# Run all backups
/Users/jeremy/dev/SIN-Solver/scripts/backup-all.sh

# Backup single service
# PostgreSQL
docker exec room-03-postgres-master pg_dumpall -U ceo_admin > backup.sql

# Redis
docker exec room-04-redis-cache redis-cli BGSAVE

# Vault
docker exec room-02-tresor-vault vault operator raft snapshot save /tmp/backup.snap
```

### Restore Commands

```bash
# Restore PostgreSQL
gunzip -c backup.sql.gz | docker exec -i room-03-postgres-master psql -U ceo_admin

# Restore Redis
docker cp backup.rdb room-04-redis-cache:/data/dump.rdb
docker restart room-04-redis-cache

# Restore Vault
docker cp backup.snap room-02-tresor-vault:/tmp/restore.snap
docker exec room-02-tresor-vault vault operator raft snapshot restore /tmp/restore.snap
```

---

**Last Updated:** 2026-01-30  
**Version:** 1.0  
**Owner:** Database Team  
**Review Cycle:** Monthly
