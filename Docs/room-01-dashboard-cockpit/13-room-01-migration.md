# Room-01 Dashboard Cockpit - Migration

## Migration Procedures

This document provides procedures for migrating the Room-01 Dashboard Cockpit between versions, environments, or infrastructure.

---

## Migration Types

### 1. Version Migration
Upgrading from one version to another (e.g., v1.x to v2.0)

### 2. Environment Migration
Moving between environments (dev → staging → production)

### 3. Infrastructure Migration
Moving to new hardware or cloud provider

### 4. Database Migration
Schema changes and data migration

---

## Pre-Migration Checklist

- [ ] Backup current data and configuration
- [ ] Review release notes for breaking changes
- [ ] Test migration in staging environment
- [ ] Notify users of maintenance window
- [ ] Prepare rollback plan
- [ ] Verify disk space availability
- [ ] Check network connectivity

---

## Version Migration

### From v1.x to v2.0

#### Step 1: Backup Current Installation

```bash
# Backup database
docker exec room-03-archiv-postgres pg_dump -U postgres dashboard > backup-v1.sql

# Backup Redis
docker exec room-04-memory-redis redis-cli BGSAVE
docker cp room-04-memory-redis:/data/dump.rdb ./redis-backup.rdb

# Backup configuration
cp .env .env.backup
cp docker-compose.yml docker-compose.yml.backup

# Backup volumes
docker run --rm -v sin-solver_dashboard_data:/data -v $(pwd):/backup alpine tar czf /backup/dashboard-data.tar.gz -C /data .
```

#### Step 2: Review Breaking Changes

| Change | Impact | Action Required |
|--------|--------|-----------------|
| New authentication system | All users must re-login | Notify users |
| API endpoint changes | Custom integrations may break | Update API clients |
| Database schema changes | Migration scripts required | Run migrations |
| Configuration changes | New env vars required | Update .env |

#### Step 3: Update Configuration

```bash
# Add new required variables
cat >> .env << 'EOF'

# New in v2.0
JWT_SECRET=$(openssl rand -base64 32)
CACHE_ENABLED=true
POLLING_INTERVAL=5000
EOF
```

#### Step 4: Pull New Image

```bash
# Pull latest image
docker pull room-01-dashboard-cockpit:v2.0

# Or build from source
git pull origin main
docker build -t room-01-dashboard-cockpit:v2.0 .
```

#### Step 5: Run Database Migrations

```bash
# Start database container
docker compose up -d room-03-archiv-postgres

# Run migrations
docker run --rm \
  --network sin-solver_default \
  -e DATABASE_URL=$DATABASE_URL \
  room-01-dashboard-cockpit:v2.0 \
  npm run migrate
```

#### Step 6: Deploy New Version

```bash
# Stop current version
docker compose stop room-01-dashboard-cockpit

# Update docker-compose.yml to use v2.0
sed -i 's/:latest/:v2.0/g' docker-compose.yml

# Start new version
docker compose up -d room-01-dashboard-cockpit

# Verify health
curl http://localhost:3011/api/health
```

#### Step 7: Post-Migration Verification

```bash
# Check logs
docker logs room-01-dashboard-cockpit

# Verify all containers visible
curl http://localhost:3011/api/docker/containers | jq '.containers | length'

# Test key functionality
curl -X POST http://localhost:3011/api/docker/containers/test-container/restart \
  -H "Authorization: Bearer $(get-token)"
```

---

## Database Migration

### Schema Migration Strategy

```javascript
// migrations/001_initial_schema.js
exports.up = async (knex) => {
  await knex.schema.createTable('containers', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.string('status');
    table.jsonb('metadata');
    table.timestamps(true, true);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('containers');
};
```

### Running Migrations

```bash
# Check migration status
npm run migrate:status

# Run pending migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Rollback all migrations
npm run migrate:rollback --all
```

### Data Migration Script

```javascript
// scripts/migrate-data.js
async function migrateData() {
  const oldDb = createOldConnection();
  const newDb = createNewConnection();
  
  // Migrate in batches
  const batchSize = 1000;
  let offset = 0;
  
  while (true) {
    const rows = await oldDb.query(
      'SELECT * FROM old_table LIMIT ? OFFSET ?',
      [batchSize, offset]
    );
    
    if (rows.length === 0) break;
    
    // Transform data
    const transformed = rows.map(transformRow);
    
    // Insert into new table
    await newDb.batchInsert('new_table', transformed);
    
    offset += batchSize;
    console.log(`Migrated ${offset} rows...`);
  }
  
  console.log('Migration complete');
}

function transformRow(oldRow) {
  return {
    id: oldRow.id,
    name: oldRow.container_name,  // Renamed field
    status: normalizeStatus(oldRow.state),
    created_at: new Date(oldRow.created)
  };
}
```

---

## Environment Migration

### Dev → Staging → Production

#### Step 1: Export Configuration

```bash
# Export environment variables
export $(cat .env | xargs)

# Create environment-specific config
./scripts/export-config.sh staging > staging-config.json
```

#### Step 2: Transform for Target Environment

```javascript
// scripts/transform-config.js
const config = require('./staging-config.json');

// Update URLs
config.api_brain_url = config.api_brain_url.replace('localhost', 'staging-api.delqhi.com');
config.redis_url = config.redis_url.replace('localhost', 'staging-redis.delqhi.com');

// Update credentials
config.database_url = process.env.STAGING_DATABASE_URL;

// Write transformed config
fs.writeFileSync('.env.staging', Object.entries(config)
  .map(([k, v]) => `${k.toUpperCase()}=${v}`)
  .join('\n')
);
```

#### Step 3: Deploy to New Environment

```bash
# Set environment
export ENVIRONMENT=staging

# Deploy
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d

# Verify
curl https://dashboard-staging.delqhi.com/api/health
```

---

## Infrastructure Migration

### Migrating to New Server

#### Step 1: Prepare New Server

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Configure firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3011/tcp
ufw enable
```

#### Step 2: Transfer Data

```bash
# From old server: Create backup archive
tar czf migration.tar.gz \
  docker-compose.yml \
  .env \
  data/ \
  docs/

# Transfer to new server
scp migration.tar.gz new-server:/tmp/

# On new server: Extract
cd /opt/sin-solver
tar xzf /tmp/migration.tar.gz
```

#### Step 3: Update Configuration

```bash
# Update any server-specific settings
sed -i 's/old-server/new-server/g' .env

# Update IP addresses
sed -i 's/192.168.1.100/192.168.1.200/g' .env
```

#### Step 4: Start Services

```bash
docker compose pull
docker compose up -d

# Verify
docker ps
curl http://localhost:3011/api/health
```

#### Step 5: DNS Cutover

```bash
# Update DNS to point to new server
# TTL should be lowered before migration

# Verify DNS propagation
dig dashboard.delqhi.com

# Test from external
curl https://dashboard.delqhi.com/api/health
```

---

## Cloud Migration

### On-Premises to AWS

#### Step 1: Prepare AWS Infrastructure

```bash
# Create ECR repository
aws ecr create-repository --repository-name room-01-dashboard

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier dashboard-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password $DB_PASSWORD

# Create ElastiCache cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id dashboard-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1
```

#### Step 2: Migrate Data

```bash
# Export PostgreSQL data
pg_dump -h old-db -U postgres dashboard | gzip > dashboard.sql.gz

# Import to RDS
gunzip -c dashboard.sql.gz | psql -h $RDS_ENDPOINT -U postgres dashboard

# Export Redis data
redis-cli -h old-redis BGSAVE
# Copy dump.rdb to S3
aws s3 cp dump.rdb s3://sin-solver-backups/redis/
```

#### Step 3: Deploy to ECS

```yaml
# ecs-task-definition.json
{
  "family": "room-01-dashboard",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "dashboard",
      "image": "${ECR_REPO}:latest",
      "portMappings": [
        {
          "containerPort": 3011,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "DATABASE_URL",
          "value": "${RDS_URL}"
        }
      ],
      "secrets": [
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:..."
        }
      ]
    }
  ]
}
```

---

## Rollback Procedures

### Version Rollback

```bash
# Stop current version
docker compose stop room-01-dashboard-cockpit

# Restore previous image
docker compose pull room-01-dashboard-cockpit:v1.9

# Update docker-compose.yml
sed -i 's/:v2.0/:v1.9/g' docker-compose.yml

# Restore database (if needed)
docker exec -i room-03-archiv-postgres psql -U postgres dashboard < backup-v1.sql

# Start previous version
docker compose up -d room-01-dashboard-cockpit

# Verify
curl http://localhost:3011/api/health
```

### Database Rollback

```bash
# Rollback migrations
npm run migrate:rollback

# Or restore from backup
docker exec -i room-03-archiv-postgres psql -U postgres dashboard < backup-pre-migration.sql
```

---

## Migration Verification

### Automated Verification Script

```bash
#!/bin/bash
# scripts/verify-migration.sh

echo "Verifying migration..."

# Check health
if ! curl -sf http://localhost:3011/api/health; then
  echo "ERROR: Health check failed"
  exit 1
fi

# Check container count
CONTAINER_COUNT=$(curl -s http://localhost:3011/api/docker/containers | jq '.total')
if [ "$CONTAINER_COUNT" -lt 1 ]; then
  echo "ERROR: No containers found"
  exit 1
fi

# Check API response time
RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null http://localhost:3011/api/docker/containers)
if (( $(echo "$RESPONSE_TIME > 2.0" | bc -l) )); then
  echo "WARNING: API response time is slow: ${RESPONSE_TIME}s"
fi

# Check logs for errors
if docker logs room-01-dashboard-cockpit 2>&1 | grep -q "ERROR"; then
  echo "WARNING: Errors found in logs"
fi

echo "Migration verification complete"
```

---

## Migration Checklist

### Before Migration

- [ ] Full backup created
- [ ] Migration tested in staging
- [ ] Rollback plan documented
- [ ] Maintenance window scheduled
- [ ] Team notified
- [ ] Monitoring alerts configured

### During Migration

- [ ] Services stopped gracefully
- [ ] Data migrated successfully
- [ ] Configuration updated
- [ ] New version deployed
- [ ] Health checks passing

### After Migration

- [ ] All functionality tested
- [ ] Performance verified
- [ ] Logs checked for errors
- [ ] Users can access system
- [ ] Monitoring dashboards reviewed
- [ ] Old resources cleaned up

---

## Related Documentation

- [07-deployment.md](./07-room-01-deployment.md) - Deployment procedures
- [14-backup.md](./14-room-01-backup.md) - Backup procedures
- [03-troubleshooting.md](./03-room-01-troubleshooting.md) - Troubleshooting
