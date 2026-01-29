# Room-01 Dashboard Cockpit - Maintenance

## Maintenance Procedures

This document describes routine maintenance procedures for the Room-01 Dashboard Cockpit.

---

## Maintenance Schedule

### Daily
- [ ] Check system health
- [ ] Review error logs
- [ ] Monitor resource usage

### Weekly
- [ ] Update container images
- [ ] Clean up old logs
- [ ] Review performance metrics
- [ ] Backup verification

### Monthly
- [ ] Security updates
- [ ] Dependency updates
- [ ] Database optimization
- [ ] Capacity review

### Quarterly
- [ ] Disaster recovery test
- [ ] Security audit
- [ ] Documentation review
- [ ] Performance tuning

---

## Routine Maintenance Tasks

### Health Check

```bash
#!/bin/bash
# scripts/health-check.sh

HEALTH_URL="http://localhost:3011/api/health"
WEBHOOK_URL="${SLACK_WEBHOOK_URL}"

response=$(curl -sf $HEALTH_URL)
status=$?

if [ $status -ne 0 ]; then
  curl -X POST $WEBHOOK_URL \
    -H 'Content-type: application/json' \
    -d '{"text":"ALERT: Dashboard health check failed!"}'
  exit 1
fi

echo "Health check passed"
```

### Log Rotation

```bash
#!/bin/bash
# scripts/rotate-logs.sh

LOG_DIR="/var/log/delqhi-platform"
RETENTION_DAYS=30

# Compress logs older than 7 days
find $LOG_DIR -name "*.log" -mtime +7 -exec gzip {} \;

# Delete logs older than retention period
find $LOG_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete

# Signal container to reopen log files
docker kill --signal=SIGUSR1 room-01-dashboard-cockpit
```

### Database Maintenance

```sql
-- Run weekly
VACUUM ANALYZE;

-- Reindex monthly
REINDEX DATABASE dashboard;

-- Clean old logs (retain 30 days)
DELETE FROM container_logs 
WHERE timestamp < NOW() - INTERVAL '30 days';

-- Update statistics
ANALYZE;
```

---

## Update Procedures

### Container Image Updates

```bash
#!/bin/bash
# scripts/update.sh

# Pull latest images
docker compose pull

# Stop services gracefully
docker compose stop

# Start with new images
docker compose up -d

# Verify health
sleep 10
curl -sf http://localhost:3011/api/health || exit 1

echo "Update completed successfully"
```

### Rolling Update

```bash
# Update without downtime
for container in room-01-dashboard-{1,2,3}; do
  echo "Updating $container..."
  docker stop $container
  docker rm $container
  docker run -d --name $container room-01-dashboard-cockpit:latest
  sleep 30
  curl -sf http://$container:3011/api/health || exit 1
done
```

---

## Cleanup Procedures

### Docker Cleanup

```bash
#!/bin/bash
# scripts/docker-cleanup.sh

# Remove unused images
docker image prune -af --filter "until=168h"

# Remove unused volumes
docker volume prune -f

# Remove stopped containers
docker container prune -f

# Remove unused networks
docker network prune -f

# Show disk usage
docker system df
```

### Cache Cleanup

```bash
# Clear Redis cache
docker exec room-04-memory-redis redis-cli FLUSHDB

# Clear Next.js cache
rm -rf .next/cache/*
```

---

## Troubleshooting Maintenance

### Common Issues

**High Memory Usage**
```bash
# Check memory usage
docker stats --no-stream

# Restart if needed
docker restart room-01-dashboard-cockpit

# Check for memory leaks in logs
docker logs room-01-dashboard-cockpit | grep -i "memory\|heap"
```

**Disk Space Full**
```bash
# Check disk usage
df -h

# Find large files
find /var/lib/docker -type f -size +100M -exec ls -lh {} \;

# Clean up
docker system prune -af
```

---

## Related Documentation

- [14-backup.md](./14-room-01-backup.md) - Backup procedures
- [03-troubleshooting.md](./03-room-01-troubleshooting.md) - Troubleshooting
- [11-monitoring.md](./11-room-01-monitoring.md) - Monitoring
