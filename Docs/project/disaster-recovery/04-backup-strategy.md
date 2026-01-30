# Backup Strategy

**Last Updated:** 2026-01-30

## Backup Architecture

```
Primary Site                    Backup Storage
------------                    --------------
PostgreSQL ───────┐         ┌─── Local SSD (hourly)
Redis ────────────┼─────────┼─── External HDD (daily)
Config Files ─────┤         ├─── Cloud Storage (encrypted)
Training Data ────┘         └─── Git Repository (continuous)
```

## Backup Schedule

### PostgreSQL

| Type | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| Continuous WAL | Real-time | 7 days | Local + Cloud |
| Incremental | Every 5 min | 24 hours | Local SSD |
| Full Backup | Hourly | 7 days | Local SSD |
| Daily Full | Daily | 30 days | External HDD |
| Weekly Archive | Weekly | 90 days | Cloud Storage |

### Redis

| Type | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| RDB Snapshot | Every 15 min | 24 hours | Local SSD |
| AOF Rewrite | Hourly | 7 days | Local SSD |
| Full Backup | Daily | 30 days | External HDD |

### Configuration & Code

| Type | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| Git Push | Every commit | Forever | GitHub |
| .env Backup | On change | 10 versions | Encrypted Cloud |
| Docker Compose | On change | 10 versions | GitHub |

### Training Data & Models

| Type | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| Model Checkpoints | Every epoch | 5 latest | Local SSD |
| Training Data | Daily | 30 days | External HDD |
| Final Models | On completion | Forever | Cloud Storage |

## Backup Procedures

### Automated Backups

All backups are automated via cron jobs and systemd timers:

```bash
# PostgreSQL backup (runs every 5 minutes)
0-59/5 * * * * /usr/local/bin/pg-backup.sh

# Redis backup (runs every 15 minutes)
0-59/15 * * * * /usr/local/bin/redis-backup.sh

# Configuration backup (runs hourly)
0 * * * * /usr/local/bin/config-backup.sh
```

### Manual Backup Commands

```bash
# PostgreSQL immediate backup
docker exec room-03-postgres-master pg_dumpall -U ceo_admin > backup_$(date +%Y%m%d_%H%M%S).sql

# Redis immediate backup
docker exec room-04-redis-cache redis-cli BGSAVE

# Configuration backup
tar -czf config_backup_$(date +%Y%m%d_%H%M%S).tar.gz .env docker-compose.yml
```

## Backup Verification

### Automated Verification (Daily)

```bash
# Test backup integrity
pg_restore --list backup_file.sql.gz > /dev/null && echo "PostgreSQL backup OK"
redis-check-dump backup_file.rdb && echo "Redis backup OK"

# Test restoration to staging environment
./scripts/verify-backup.sh
```

### Monthly Restoration Test

1. Provision isolated test environment
2. Restore from production backup
3. Verify data integrity
4. Run smoke tests
5. Document results

## Backup Storage Locations

### Primary (Local SSD)
- Path: `/Users/jeremy/dev/SIN-Solver/backups/`
- Capacity: 500GB
- Retention: 7 days
- Access: Immediate

### Secondary (External HDD)
- Path: `/Volumes/Backup/sin-solver/`
- Capacity: 2TB
- Retention: 30 days
- Access: 5 minutes

### Tertiary (Cloud Storage)
- Provider: [Cloud Provider]
- Encryption: AES-256
- Retention: 90 days
- Access: 15-30 minutes

## Encryption

All backups are encrypted at rest:

```bash
# Encrypt backup
gpg --symmetric --cipher-algo AES256 backup_file.sql

# Decrypt backup
gpg --decrypt backup_file.sql.gpg > backup_file.sql
```

## Monitoring & Alerting

| Alert Condition | Severity | Notification |
|----------------|----------|--------------|
| Backup failed | High | Slack + Email |
| Backup size anomaly | Medium | Slack |
| Storage > 80% | Medium | Slack |
| Backup verification failed | Critical | Slack + Email + SMS |

## Recovery Procedures

See scenario-specific runbooks for detailed recovery procedures:
- [Total Data Loss](./scenarios/01-total-data-loss.md)
- [Database Corruption](./scenarios/04-database-corruption.md)
