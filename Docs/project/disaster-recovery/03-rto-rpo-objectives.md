# RTO/RPO Objectives

**Last Updated:** 2026-01-30

## Definitions

**RTO (Recovery Time Objective):** Maximum acceptable time to restore service after failure.
**RPO (Recovery Point Objective):** Maximum acceptable data loss measured in time.

## Service-Level Objectives

### Tier 1 - Critical Services

| Service | RTO Target | RTO Max | RPO Target | RPO Max |
|---------|-----------|---------|------------|---------|
| PostgreSQL | 10 min | 30 min | 5 min | 15 min |
| Redis | 5 min | 15 min | 0 min | 5 min |
| Cloudflare Tunnel | 5 min | 15 min | N/A | N/A |

### Tier 2 - High Priority Services

| Service | RTO Target | RTO Max | RPO Target | RPO Max |
|---------|-----------|---------|------------|---------|
| N8N Orchestrator | 20 min | 1 hour | 15 min | 30 min |
| Steel Browser | 20 min | 1 hour | 15 min | 30 min |
| Dashboard | 15 min | 45 min | 15 min | 30 min |

### Tier 3 - Medium Priority Services

| Service | RTO Target | RTO Max | RPO Target | RPO Max |
|---------|-----------|---------|------------|---------|
| Monitoring | 1 hour | 4 hours | 1 hour | 4 hours |
| Training Jobs | 2 hours | 8 hours | 1 hour | 4 hours |

### Tier 4 - Low Priority Services

| Service | RTO Target | RTO Max | RPO Target | RPO Max |
|---------|-----------|---------|------------|---------|
| Documentation | 4 hours | 24 hours | 24 hours | 72 hours |
| Archive Data | 8 hours | 48 hours | 24 hours | 72 hours |

## Recovery Procedures by RTO

### 0-5 Minutes: Automatic Failover
- Redis cache rebuild from persistent storage
- Cloudflare tunnel automatic restart
- Container health check recovery

### 5-15 Minutes: Rapid Recovery
- PostgreSQL point-in-time restore from latest backup
- Service container restart with persistent volumes
- Configuration restoration from Git

### 15-60 Minutes: Full Service Recovery
- Complete environment rebuild from backups
- Data consistency verification
- Integration testing

### 1-4 Hours: Extended Recovery
- Full infrastructure rebuild
- Historical data restoration
- Comprehensive testing

## RPO Achievement Methods

### Continuous (0-5 min RPO)
- PostgreSQL streaming replication
- Redis AOF persistence
- Real-time configuration sync

### Frequent (5-15 min RPO)
- Automated database backups every 5 minutes
- Volume snapshots
- Transaction log shipping

### Standard (15-60 min RPO)
- Hourly incremental backups
- Daily full backups
- Cross-region replication

### Archive (1-24 hour RPO)
- Daily backups
- Weekly full snapshots
- Cold storage for historical data
