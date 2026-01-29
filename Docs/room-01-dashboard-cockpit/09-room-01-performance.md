# Room-01 Dashboard Cockpit - Performance

## Performance Optimization

This document provides guidance on optimizing the performance of the Room-01 Dashboard Cockpit.

---

## Performance Metrics

### Target Metrics

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| Page Load Time | < 2s | < 5s | > 5s |
| Time to Interactive | < 3s | < 6s | > 6s |
| API Response Time | < 200ms | < 500ms | > 500ms |
| Container List Load | < 1s | < 2s | > 2s |
| Log Stream Latency | < 100ms | < 500ms | > 500ms |
| Memory Usage | < 256MB | < 512MB | > 512MB |
| CPU Usage | < 50% | < 80% | > 80% |

---

## Frontend Optimization

### Code Splitting

```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons']
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all'
          }
        }
      };
    }
    return config;
  }
};
```

### Lazy Loading Components

```javascript
// components/Docker/ContainerList.js
import dynamic from 'next/dynamic';

const LogViewer = dynamic(() => import('@/components/Terminal/LogViewer'), {
  loading: () => <Skeleton height={400} />,
  ssr: false
});

const MetricChart = dynamic(() => import('@/components/UI/MetricChart'), {
  loading: () => <Skeleton height={200} />
});
```

### Image Optimization

```javascript
// components/UI/ContainerIcon.js
import Image from 'next/image';

export function ContainerIcon({ src, alt }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={48}
      height={48}
      loading="lazy"
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,..."
    />
  );
}
```

### State Management Optimization

```javascript
// hooks/useContainers.js
import { useQuery } from '@tanstack/react-query';

export function useContainers() {
  return useQuery({
    queryKey: ['containers'],
    queryFn: fetchContainers,
    refetchInterval: 5000,
    staleTime: 3000,
    cacheTime: 60000,
    select: (data) => {
      // Transform data once
      return data.map(container => ({
        ...container,
        displayName: getDisplayName(container.name),
        statusColor: getStatusColor(container.status)
      }));
    }
  });
}
```

---

## Backend Optimization

### Caching Strategy

```javascript
// lib/cache.js
import NodeCache from 'node-cache';

const cache = new NodeCache({
  stdTTL: 10,  // 10 seconds default
  checkperiod: 60,
  useClones: false
});

export async function getCachedOrFetch(key, fetchFn, ttl = 10) {
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }
  
  const data = await fetchFn();
  cache.set(key, data, ttl);
  return data;
}

// Usage
const containers = await getCachedOrFetch(
  'containers:list',
  () => docker.listContainers(),
  5  // 5 second TTL
);
```

### Redis Caching

```javascript
// lib/redis.js
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getCachedContainers() {
  const cached = await redis.get('containers:list');
  if (cached) {
    return JSON.parse(cached);
  }
  
  const containers = await docker.listContainers();
  await redis.setex('containers:list', 5, JSON.stringify(containers));
  return containers;
}
```

### Database Query Optimization

```javascript
// lib/db/queries.js
// Use indexes
const createIndexes = async () => {
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_container_logs_container_id 
    ON container_logs(container_id);
    
    CREATE INDEX IF NOT EXISTS idx_container_logs_timestamp 
    ON container_logs(timestamp DESC);
  `);
};

// Paginated queries
export async function getContainerLogs(containerId, { page = 1, limit = 100 }) {
  const offset = (page - 1) * limit;
  
  const { rows } = await db.query(`
    SELECT * FROM container_logs
    WHERE container_id = $1
    ORDER BY timestamp DESC
    LIMIT $2 OFFSET $3
  `, [containerId, limit, offset]);
  
  return rows;
}
```

---

## Docker API Optimization

### Efficient Polling

```javascript
// lib/docker/polling.js
class DockerPoller {
  constructor(options = {}) {
    this.interval = options.interval || 5000;
    this.callbacks = new Map();
    this.timers = new Map();
  }
  
  subscribe(key, fetchFn, callback) {
    this.callbacks.set(key, { fetchFn, callback });
    this.start(key);
  }
  
  start(key) {
    const poll = async () => {
      try {
        const { fetchFn, callback } = this.callbacks.get(key);
        const data = await fetchFn();
        callback(null, data);
      } catch (error) {
        callback(error);
      }
      
      this.timers.set(key, setTimeout(poll, this.interval));
    };
    
    poll();
  }
  
  stop(key) {
    clearTimeout(this.timers.get(key));
    this.timers.delete(key);
    this.callbacks.delete(key);
  }
}

export const dockerPoller = new DockerPoller();
```

### Streaming vs Polling

```javascript
// For real-time logs, use streaming instead of polling
export function streamContainerLogs(containerId, onData) {
  const container = docker.getContainer(containerId);
  
  const stream = await container.logs({
    follow: true,
    stdout: true,
    stderr: true,
    timestamps: true,
    tail: 100
  });
  
  stream.on('data', (chunk) => {
    const log = parseLogChunk(chunk);
    onData(log);
  });
  
  return () => stream.destroy();
}
```

---

## Network Optimization

### Compression

```javascript
// server.js
import compression from 'compression';

app.use(compression({
  level: 6,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
```

### HTTP/2

```javascript
// server.js
import http2 from 'http2';
import fs from 'fs';

const server = http2.createSecureServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt'),
  allowHTTP1: true
}, app);
```

### CDN Configuration

```javascript
// next.config.js
module.exports = {
  assetPrefix: process.env.NODE_ENV === 'production' 
    ? 'https://cdn.delqhi.com' 
    : undefined,
  images: {
    domains: ['cdn.delqhi.com'],
    loader: 'custom',
    loaderFile: './lib/image-loader.js'
  }
};
```

---

## Memory Optimization

### Memory Leak Prevention

```javascript
// lib/memory-monitor.js
import v8 from 'v8';

export function monitorMemory() {
  const heapStats = v8.getHeapStatistics();
  const usedHeapSize = heapStats.used_heap_size;
  const totalHeapSize = heapStats.total_heap_size;
  const heapLimit = heapStats.heap_size_limit;
  
  const usagePercent = (usedHeapSize / heapLimit) * 100;
  
  if (usagePercent > 80) {
    console.warn(`High memory usage: ${usagePercent.toFixed(2)}%`);
    // Trigger garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
  
  return {
    used: usedHeapSize,
    total: totalHeapSize,
    limit: heapLimit,
    usagePercent
  };
}

// Run every 30 seconds
setInterval(monitorMemory, 30000);
```

### Resource Cleanup

```javascript
// hooks/useContainerLogs.js
import { useEffect, useRef } from 'react';

export function useContainerLogs(containerId) {
  const abortControllerRef = useRef(null);
  
  useEffect(() => {
    abortControllerRef.current = new AbortController();
    
    fetchLogs(containerId, {
      signal: abortControllerRef.current.signal
    });
    
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [containerId]);
}
```

---

## Database Optimization

### Connection Pooling

```javascript
// lib/db/pool.js
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export default pool;
```

### Query Optimization

```sql
-- Add composite indexes for common queries
CREATE INDEX idx_container_stats_lookup 
ON container_stats(container_id, timestamp DESC);

-- Use partial indexes for filtered queries
CREATE INDEX idx_running_containers 
ON containers(state) 
WHERE state = 'running';

-- Analyze and vacuum regularly
VACUUM ANALYZE;
```

---

## Monitoring & Profiling

### Performance Monitoring

```javascript
// lib/performance.js
export function measurePerformance(label, fn) {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  
  console.log(`[Performance] ${label}: ${duration.toFixed(2)}ms`);
  
  // Send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    sendMetric('performance', {
      label,
      duration,
      timestamp: new Date().toISOString()
    });
  }
  
  return result;
}
```

### Next.js Analytics

```javascript
// pages/_app.js
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
      <SpeedInsights />
    </>
  );
}
```

### Custom Metrics

```javascript
// lib/metrics.js
import { Counter, Histogram, register } from 'prom-client';

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const containerOperations = new Counter({
  name: 'container_operations_total',
  help: 'Total container operations',
  labelNames: ['operation', 'status']
});

export { httpRequestDuration, containerOperations };
```

---

## Load Testing

### K6 Load Test

```javascript
// tests/load/dashboard-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up
    { duration: '5m', target: 10 },   // Steady state
    { duration: '2m', target: 20 },   // Ramp up
    { duration: '5m', target: 20 },   // Steady state
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function () {
  const res = http.get('http://localhost:3011/api/docker/containers');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

### Run Load Test

```bash
k6 run tests/load/dashboard-load.js
```

---

## Optimization Checklist

### Frontend

- [ ] Code splitting implemented
- [ ] Images optimized and lazy-loaded
- [ ] CSS/JS minified
- [ ] Gzip/Brotli compression enabled
- [ ] CDN configured for static assets
- [ ] Service worker for caching
- [ ] Critical CSS inlined

### Backend

- [ ] Caching layer (Redis) configured
- [ ] Database queries optimized
- [ ] Connection pooling enabled
- [ ] Rate limiting implemented
- [ ] Compression middleware enabled
- [ ] Efficient Docker API polling
- [ ] Streaming for real-time data

### Infrastructure

- [ ] HTTP/2 enabled
- [ ] Load balancer configured
- [ ] Auto-scaling rules set
- [ ] Resource limits defined
- [ ] Health checks configured
- [ ] Monitoring and alerting active

---

## Related Documentation

- [04-architecture.md](./04-room-01-architecture.md) - System architecture
- [11-monitoring.md](./11-room-01-monitoring.md) - Monitoring setup
- [15-scaling.md](./15-room-01-scaling.md) - Scaling strategies
