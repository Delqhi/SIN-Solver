# Room-01 Dashboard Cockpit - Backup

## Backup and Restore

This document describes backup and restore procedures for the Room-01 Dashboard Cockpit.

---

## Backup Strategy

### 3-2-1 Rule

- **3** copies of data
- **2** different media types
- **1** offsite copy

### Backup Types

| Type | Frequency | Retention | Description |
|------|-----------|-----------|-------------|
| Full | Weekly | 4 weeks | Complete system backup |
| Incremental | Daily | 7 days | Changes since last backup |
| Database | Hourly | 24 hours | Database dumps |
| Configuration | On change | 10 versions | Config files |

---

## Automated Backups

### Database Backup

```bash
#!/bin/bash
# scripts/backup-database.sh

BACKUP_DIR="/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker exec room-03-archiv-postgres pg_dump \
  -U postgres \
  -Fc \
  dashboard > $BACKUP_DIR/dashboard_$DATE.dump

# Compress
gzip $BACKUP_DIR/dashboard_$DATE.dump

# Upload to S3
aws s3 cp $BACKUP_DIR/dashboard_$DATE.dump.gz \
  s3://delqhi-platform-backups/database/

# Clean old backups
find $BACKUP_DIR -name "*.dump.gz" -mtime +$RETENTION_DAYS -delete
aws s3 ls s3://delqhi-platform-backups/database/ | \
  awk '{print $4}' | \
  sort -r | \
  tail -n +8 | \
  xargs -I {} aws s3 rm s3://delqhi-platform-backups/database/{}

echo "Database backup completed: dashboard_$DATE.dump.gz"
```

### Redis Backup

```bash
#!/bin/bash
# scripts/backup-redis.sh

BACKUP_DIR="/backups/redis"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Trigger BGSAVE
docker exec room-04-memory-redis redis-cli BGSAVE

# Wait for save to complete
sleep 5

# Copy dump file
docker cp room-04-memory-redis:/data/dump.rdb \
  $BACKUP_DIR/redis_$DATE.rdb

# Compress
gzip $BACKUP_DIR/redis_$DATE.rdb

# Upload to S3
aws s3 cp $BACKUP_DIR/redis_$DATE.rdb.gz \
  s3://delqhi-platform-backups/redis/

# Clean old backups (keep 7 days)
find $BACKUP_DIR -name "*.rdb.gz" -mtime +7 -delete

echo "Redis backup completed: redis_$DATE.rdb.gz"
```

### Configuration Backup

```bash
#!/bin/bash
# scripts/backup-config.sh

BACKUP_DIR="/backups/config"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup configuration files
tar czf $BACKUP_DIR/config_$DATE.tar.gz \
  .env \
  .env.* \
  docker-compose.yml \
  docker-compose.*.yml \
  nginx.conf \
  prometheus.yml \
  --exclude='*.backup' \
  --exclude='*.old'

# Upload to S3
aws s3 cp $BACKUP_DIR/config_$DATE.tar.gz \
  s3://delqhi-platform-backups/config/

# Keep last 10 versions
ls -t $BACKUP_DIR/config_*.tar.gz | tail -n +11 | xargs rm -f

echo "Configuration backup completed: config_$DATE.tar.gz"
```

### Full System Backup

```bash
#!/bin/bash
# scripts/backup-full.sh

BACKUP_DIR="/backups/full"
DATE=$(date +%Y%m%d)
VOLUME_PREFIX="delqhi-platform"

mkdir -p $BACKUP_DIR

# Stop services gracefully
docker compose stop

# Backup all volumes
for volume in $(docker volume ls -q | grep $VOLUME_PREFIX); do
  docker run --rm \
    -v $volume:/data \
    -v $BACKUP_DIR:/backup \
    alpine \
    tar czf /backup/${volume}_$DATE.tar.gz -C /data .
done

# Start services
docker compose start

# Create manifest
cat > $BACKUP_DIR/manifest_$DATE.json << EOF
{
  "date": "$DATE",
  "version": "$(git describe --tags --always)",
  "volumes": $(docker volume ls -q | grep $VOLUME_PREFIX | jq -R . | jq -s .),
  "containers": $(docker ps --format '{{.Names}}' | jq -R . | jq -s .)
}
EOF

# Upload to S3
aws s3 sync $BACKUP_DIR/ s3://delqhi-platform-backups/full/$DATE/

# Clean old backups (keep 4 weeks)
aws s3 ls s3://delqhi-platform-backups/full/ | \
  awk '{print $2}' | \
  sort -r | \
  tail -n +5 | \
  xargs -I {} aws s3 rm --recursive s3://delqhi-platform-backups/full/{}

echo "Full backup completed: $DATE"
```

---

## Cron Schedule

```bash
# /etc/cron.d/delqhi-platform-backup

# Database backup - every hour
0 * * * * root /opt/delqhi-platform/scripts/backup-database.sh >> /var/log/delqhi-platform/backup.log 2>&1

# Redis backup - every 6 hours
0 */6 * * * root /opt/delqhi-platform/scripts/backup-redis.sh >> /var/log/delqhi-platform/backup.log 2>&1

# Configuration backup - daily at 2 AM
0 2 * * * root /opt/delqhi-platform/scripts/backup-config.sh >> /var/log/delqhi-platform/backup.log 2>&1

# Full backup - weekly on Sunday at 3 AM
0 3 * * 0 root /opt/delqhi-platform/scripts/backup-full.sh >> /var/log/delqhi-platform/backup.log 2>&1
```

---

## Restore Procedures

### Database Restore

```bash
#!/bin/bash
# scripts/restore-database.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file>"
  exit 1
fi

# Download from S3 if not local
if [[ $BACKUP_FILE == s3://* ]]; then
  aws s3 cp $BACKUP_FILE /tmp/restore.dump.gz
  BACKUP_FILE=/tmp/restore.dump.gz
fi

# Decompress if needed
if [[ $BACKUP_FILE == *.gz ]]; then
  gunzip -c $BACKUP_FILE > /tmp/restore.dump
  BACKUP_FILE=/tmp/restore.dump
fi

# Stop application
docker compose stop room-01-dashboard-cockpit

# Restore database
docker exec -i room-03-archiv-postgres pg_restore \
  -U postgres \
  -d dashboard \
  --clean \
  --if-exists \
  < $BACKUP_FILE

# Start application
docker compose start room-01-dashboard-cockpit

# Verify
curl http://localhost:3011/api/health

echo "Database restore completed"
```

### Redis Restore

```bash
#!/bin/bash
# scripts/restore-redis.sh

BACKUP_FILE=$1

# Download from S3 if needed
if [[ $BACKUP_FILE == s3://* ]]; then
  aws s3 cp $BACKUP_FILE /tmp/restore.rdb.gz
  BACKUP_FILE=/tmp/restore.rdb.gz
fi

# Decompress
if [[ $BACKUP_FILE == *.gz ]]; then
  gunzip -c $BACKUP_FILE > /tmp/restore.rdb
  BACKUP_FILE=/tmp/restore.rdb
fi

# Stop Redis
docker compose stop room-04-memory-redis

# Copy dump file
docker cp $BACKUP_FILE room-04-memory-redis:/data/dump.rdb

# Start Redis
docker compose start room-04-memory-redis

# Verify
docker exec room-04-memory-redis redis-cli PING

echo "Redis restore completed"
```

### Full System Restore

```bash
#!/bin/bash
# scripts/restore-full.sh

BACKUP_DATE=$1

if [ -z "$BACKUP_DATE" ]; then
  echo "Usage: $0 <YYYY-MM-DD>"
  exit 1
fi

# Download from S3
aws s3 sync s3://delqhi-platform-backups/full/$BACKUP_DATE/ /tmp/restore/

# Stop all services
docker compose down

# Restore volumes
for backup in /tmp/restore/*.tar.gz; do
  volume=$(basename $backup | sed 's/_.*//')
  
  # Create volume if not exists
  docker volume create $volume 2>/dev/null || true
  
  # Restore data
  docker run --rm \
    -v $volume:/data \
    -v /tmp/restore:/backup \
    alpine \
    tar xzf /backup/$(basename $backup) -C /data
done

# Restore configuration
cp /tmp/restore/.env* .
cp /tmp/restore/docker-compose*.yml .

# Start services
docker compose up -d

# Verify
curl http://localhost:3011/api/health

echo "Full system restore completed"
```

---

## Point-in-Time Recovery

### PostgreSQL PITR

```bash
# Enable WAL archiving in postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://delqhi-platform-backups/wal/%f'

# Recovery to specific point
cat > /var/lib/postgresql/data/recovery.conf << EOF
restore_command = 'aws s3 cp s3://delqhi-platform-backups/wal/%f %p'
recovery_target_time = '2026-01-29 14:30:00'
recovery_target_action = 'promote'
EOF
```

---

## Backup Verification

### Automated Verification

```bash
#!/bin/bash
# scripts/verify-backup.sh

BACKUP_FILE=$1

# Check file exists and not empty
if [ ! -s "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file is empty or missing"
  exit 1
fi

# Verify checksum
if [ -f "${BACKUP_FILE}.md5" ]; then
  md5sum -c "${BACKUP_FILE}.md5" || exit 1
fi

# Test restore to temporary database (PostgreSQL)
if [[ $BACKUP_FILE == *postgres* ]]; then
  docker run --rm \
    -v $(dirname $BACKUP_FILE):/backup \
    postgres:latest \
    pg_restore -l /backup/$(basename $BACKUP_FILE) > /dev/null
  
  if [ $? -eq 0 ]; then
    echo "Backup verification successful"
  else
    echo "ERROR: Backup verification failed"
    exit 1
  fi
fi
```

---

## Backup Monitoring

### Backup Status Check

```bash
#!/bin/bash
# scripts/check-backup-status.sh

ALERT_WEBHOOK="${SLACK_WEBHOOK_URL}"
LAST_BACKUP_AGE=$(find /backups/database -name "*.dump.gz" -mmin -70 | wc -l)

if [ "$LAST_BACKUP_AGE" -eq 0 ]; then
  curl -X POST $ALERT_WEBHOOK \
    -H 'Content-type: application/json' \
    -d '{"text":"WARNING: No recent database backup found!"}'
fi
```

---

## Related Documentation

- [13-migration.md](./13-room-01-migration.md) - Migration procedures
- [16-maintenance.md](./16-room-01-maintenance.md) - Maintenance procedures
- [03-troubleshooting.md](./03-room-01-troubleshooting.md) - Troubleshooting
