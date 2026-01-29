# Room-01 Dashboard Cockpit - Scaling

## Scaling Guide

This document describes strategies and procedures for scaling the Room-01 Dashboard Cockpit.

---

## Scaling Dimensions

### Horizontal Scaling (Scale Out)
- Adding more instances
- Load balancing
- Distributed processing

### Vertical Scaling (Scale Up)
- Increasing resources per instance
- CPU, memory, disk

### Functional Scaling
- Separating concerns
- Microservices architecture

---

## Horizontal Scaling

### Load Balancer Configuration

```nginx
# nginx.conf
upstream dashboard_backend {
    least_conn;
    
    server room-01-dashboard-1:3011 weight=5;
    server room-01-dashboard-2:3011 weight=5;
    server room-01-dashboard-3:3011 backup;
    
    keepalive 32;
}

server {
    listen 80;
    server_name dashboard.delqhi.com;
    
    location / {
        proxy_pass http://dashboard_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    location /api/logs/stream {
        proxy_pass http://dashboard_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400s;
    }
}
```

### Docker Compose Scaling

```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  room-01-dashboard:
    image: room-01-dashboard-cockpit:latest
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure
    environment:
      - REDIS_URL=redis://room-04-redis:6379
      - DATABASE_URL=postgresql://postgres:password@room-03-postgres:5432/dashboard
    networks:
      - delqhi-platform

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - room-01-dashboard
    networks:
      - delqhi-platform

networks:
  delqhi-platform:
    external: true
```

### Kubernetes Scaling

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: room-01-dashboard
spec:
  replicas: 3
  selector:
    matchLabels:
      app: room-01-dashboard
  template:
    metadata:
      labels:
        app: room-01-dashboard
    spec:
      containers:
      - name: dashboard
        image: room-01-dashboard-cockpit:latest
        ports:
        - containerPort: 3011
        resources:
          requests:
            memory: "128Mi"
            cpu: "250m"
          limits:
            memory: "256Mi"
            cpu: "500m"
        env:
        - name: REDIS_URL
          value: "redis://redis-service:6379"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: room-01-dashboard-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: room-01-dashboard
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## Session Management

### Redis Session Store

```javascript
// lib/session.js
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL
});

redisClient.connect().catch(console.error);

export const sessionMiddleware = session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
});
```

---

## Database Scaling

### Read Replicas

```yaml
# docker-compose.db.yml
services:
  room-03-postgres-primary:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: dashboard
    volumes:
      - postgres_primary:/var/lib/postgresql/data
    command: |
      postgres
      -c wal_level=replica
      -c max_wal_senders=10
      -c max_replication_slots=10

  room-03-postgres-replica:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_replica:/var/lib/postgresql/data
    command: |
      bash -c "
        pg_basebackup -h room-03-postgres-primary -D /var/lib/postgresql/data -U replicator -v -P -W
        postgres
      "
```

### Connection Pooling

```yaml
# pgbouncer configuration
services:
  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    environment:
      DATABASES_HOST: room-03-postgres
      DATABASES_PORT: 5432
      DATABASES_DATABASE: dashboard
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 1000
      DEFAULT_POOL_SIZE: 20
```

---

## Caching Strategy

### Multi-Level Caching

```javascript
// lib/cache/multi-tier.js
import NodeCache from 'node-cache';
import Redis from 'ioredis';

// L1: In-memory cache (per instance)
const localCache = new NodeCache({ stdTTL: 5 });

// L2: Redis cache (shared)
const redisCache = new Redis(process.env.REDIS_URL);

export async function getCached(key, fetchFn, ttl = 10) {
  // Try L1 cache
  const local = localCache.get(key);
  if (local) return local;
  
  // Try L2 cache
  const remote = await redisCache.get(key);
  if (remote) {
    const data = JSON.parse(remote);
    localCache.set(key, data, 5); // Cache locally for 5s
    return data;
  }
  
  // Fetch from source
  const data = await fetchFn();
  
  // Populate caches
  localCache.set(key, data, 5);
  await redisCache.setex(key, ttl, JSON.stringify(data));
  
  return data;
}
```

---

## Performance Optimization

### CDN Integration

```javascript
// next.config.js
module.exports = {
  assetPrefix: process.env.NODE_ENV === 'production' 
    ? 'https://cdn.delqhi.com' 
    : undefined,
  
  async headers() {
    return [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ];
  }
};
```

### Database Query Optimization

```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_containers_status 
ON containers(status);

CREATE INDEX CONCURRENTLY idx_container_logs_container_time 
ON container_logs(container_id, timestamp DESC);

-- Partition large tables
CREATE TABLE container_logs_2026_01 PARTITION OF container_logs
FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

---

## Monitoring at Scale

### Distributed Tracing

```javascript
// lib/tracing.js
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: 'http://jaeger:14268/api/traces'
  })
});

sdk.start();
```

### Metrics Aggregation

```yaml
# prometheus federation
scrape_configs:
  - job_name: 'federate'
    scrape_interval: 15s
    honor_labels: true
    metrics_path: '/federate'
    params:
      'match[]':
        - '{__name__=~"^container_.*"}'
        - '{__name__=~"^http_.*"}'
    static_configs:
      - targets:
        - 'prometheus-1:9090'
        - 'prometheus-2:9090'
        - 'prometheus-3:9090'
```

---

## Capacity Planning

### Metrics to Monitor

| Metric | Warning | Critical |
|--------|---------|----------|
| CPU Usage | > 70% | > 90% |
| Memory Usage | > 80% | > 95% |
| Disk Usage | > 80% | > 90% |
| Response Time | > 500ms | > 2s |
| Error Rate | > 1% | > 5% |
| Active Connections | > 1000 | > 2000 |

### Scaling Triggers

```yaml
# keda scaled object
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: room-01-dashboard-scaler
spec:
  scaleTargetRef:
    name: room-01-dashboard
  minReplicaCount: 3
  maxReplicaCount: 20
  triggers:
  - type: cpu
    metadata:
      type: Utilization
      value: "70"
  - type: memory
    metadata:
      type: Utilization
      value: "80"
  - type: prometheus
    metadata:
      serverAddress: http://prometheus:9090
      metricName: http_requests_per_second
      threshold: '1000'
      query: sum(rate(http_requests_total[2m]))
```

---

## Disaster Recovery

### Multi-Region Deployment

```yaml
# Primary region
deployment:
  region: us-east-1
  replicas: 5

# Secondary region  
deployment:
  region: us-west-2
  replicas: 3
  
# Global load balancer
dns:
  weighted_routing:
    us-east-1: 70
    us-west-2: 30
```

### Database Replication

```bash
# Set up streaming replication
# On primary:
psql -c "CREATE USER replicator WITH REPLICATION ENCRYPTED PASSWORD 'secret';"

# On replica:
pg_basebackup -h primary -D /var/lib/postgresql/data -U replicator -v -P
```

---

## Cost Optimization

### Resource Right-Sizing

```yaml
# Start small and scale up
services:
  room-01-dashboard:
    deploy:
      resources:
        reservations:
          cpus: '0.25'
          memory: 128M
        limits:
          cpus: '0.5'
          memory: 256M
```

### Spot Instances

```yaml
# k8s spot deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: room-01-dashboard-spot
spec:
  template:
    spec:
      nodeSelector:
        node-type: spot
      tolerations:
      - key: "spot"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
```

---

## Related Documentation

- [09-performance.md](./09-room-01-performance.md) - Performance optimization
- [11-monitoring.md](./11-room-01-monitoring.md) - Monitoring setup
- [14-backup.md](./14-room-01-backup.md) - Backup procedures
