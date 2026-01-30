# AGENT-SOLVER DEPLOYMENT GUIDE v1.0

**Last Updated:** 2026-01-30  
**Version:** 1.0  
**Status:** Production Ready  
**Build:** BUILD-3 Multi-Agent CAPTCHA Solver

---

## 📋 TABLE OF CONTENTS

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Docker Deployment](#docker-deployment)
3. [Environment Configuration](#environment-configuration)
4. [Kubernetes Deployment](#kubernetes-deployment)
5. [Performance Optimization](#performance-optimization)
6. [Monitoring & Logging](#monitoring--logging)
7. [Scaling Strategies](#scaling-strategies)
8. [Troubleshooting](#troubleshooting)

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### Code Readiness
- [ ] All tests passing: `npm test`
- [ ] No TypeScript errors: `npm run typecheck`
- [ ] Linting clean: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Example runs without errors: `npx ts-node src/solvers/example.ts`

### Configuration
- [ ] `.env` file created with all required variables
- [ ] API keys verified and working
- [ ] Environment variables documented in README
- [ ] Secrets not committed to git
- [ ] `.gitignore` includes `.env`, `*.key`, `credentials.json`

### Dependencies
- [ ] Node.js 18+ available
- [ ] Python 3.8+ available (for ddddocr)
- [ ] All npm packages installed
- [ ] ddddocr dependencies installed: `pip install ddddocr opencv-python pillow`

### Testing
- [ ] Solved sample CAPTCHAs successfully
- [ ] All 3 agents working correctly
- [ ] Error handling tested
- [ ] Timeout handling tested
- [ ] Load testing completed (see below)

### Security
- [ ] API keys not in code
- [ ] Rate limiting configured
- [ ] CORS headers set appropriately
- [ ] Input validation in place
- [ ] Error messages don't leak sensitive info

---

## 🐳 DOCKER DEPLOYMENT

### Dockerfile

```dockerfile
# Multi-stage build for smaller image

FROM node:20-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install ddddocr==1.4.13 opencv-python pillow numpy --no-cache-dir

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Build TypeScript
COPY src ./src
RUN npm run build

# ============================================
# Runtime stage
# ============================================
FROM node:20-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
  python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*

# Install Python dependencies for runtime
RUN pip install ddddocr==1.4.13 opencv-python pillow numpy --no-cache-dir

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Create non-root user
RUN useradd -m -u 1000 appuser && \
  chown -R appuser:appuser /app

USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { if (r.statusCode !== 200) throw new Error(r.statusCode) })"

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start application
CMD ["node", "dist/index.js"]
```

---

### docker-compose.yml

```yaml
version: '3.8'

services:
  captcha-solver:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      LOG_LEVEL: info
      VISION_PROVIDER: openai
      VISION_API_KEY: ${VISION_API_KEY}
      VISION_MODEL: gpt-4-vision-preview
      SKYVERN_API_URL: http://skyvern:8000
      SKYVERN_API_KEY: ${SKYVERN_API_KEY}
      DDDDOCR_PYTHON_PATH: python3
      CACHE_ENABLED: "true"
      CACHE_TTL_SECONDS: 3600
      METRICS_ENABLED: "true"
      REQUEST_TIMEOUT_MS: 30000
    volumes:
      - ./logs:/app/logs
      - /tmp/ddddocr:/tmp/ddddocr
    depends_on:
      - skyvern
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 5s
    networks:
      - captcha-network
    deploy:
      resources:
        limits:
          cpus: "2"
          memory: 2G
        reservations:
          cpus: "1"
          memory: 1G

  # Optional: Skyvern service
  skyvern:
    image: skyvern/skyvern:latest
    ports:
      - "8000:8000"
    environment:
      SKYVERN_API_KEY: ${SKYVERN_API_KEY}
    networks:
      - captcha-network
    restart: unless-stopped

  # Optional: Redis for caching
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - captcha-network
    restart: unless-stopped

volumes:
  redis_data:

networks:
  captcha-network:
    driver: bridge
```

---

### Build & Deploy

```bash
# Build image
docker build -t captcha-solver:latest .

# Run container
docker run -p 3000:3000 \
  -e VISION_API_KEY=$VISION_API_KEY \
  -e SKYVERN_API_KEY=$SKYVERN_API_KEY \
  captcha-solver:latest

# Using docker-compose
docker-compose up -d

# View logs
docker-compose logs -f captcha-solver

# Stop services
docker-compose down
```

---

## 🔧 ENVIRONMENT CONFIGURATION

### Production .env File

```bash
# ============================================
# CAPTCHA SOLVER - PRODUCTION CONFIG
# ============================================

# Node Environment
NODE_ENV=production
PORT=3000

# ============================================
# VISION MODEL AGENT
# ============================================
VISION_PROVIDER=openai
VISION_API_KEY=sk-proj-xxxxx...
VISION_MODEL=gpt-4-vision-preview
OPENAI_API_URL=https://api.openai.com/v1

# Optional: Anthropic as fallback
ANTHROPIC_API_KEY=sk-ant-xxxxx...

# ============================================
# SKYVERN AGENT
# ============================================
SKYVERN_API_URL=http://skyvern:8000
SKYVERN_API_KEY=your-key
SKYVERN_TIMEOUT=30000
SKYVERN_RETRY_COUNT=2

# ============================================
# DDDDOCR AGENT
# ============================================
DDDDOCR_PYTHON_PATH=python3
DDDDOCR_TEMP_DIR=/tmp/ddddocr
DDDDOCR_TIMEOUT=15000

# ============================================
# PERFORMANCE & RELIABILITY
# ============================================
REQUEST_TIMEOUT_MS=30000
MAX_PARALLEL_SOLVERS=3
HEALTH_CHECK_INTERVAL=30000

# ============================================
# CACHING
# ============================================
CACHE_ENABLED=true
CACHE_TTL_SECONDS=3600
CACHE_BACKEND=redis
REDIS_URL=redis://redis:6379/0

# ============================================
# LOGGING & MONITORING
# ============================================
LOG_LEVEL=info
LOG_FORMAT=json
METRICS_ENABLED=true
METRICS_PORT=9090
SENTRY_DSN=https://key@sentry.io/project

# ============================================
# SECURITY
# ============================================
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=60000
CORS_ORIGIN=https://yourdomain.com
```

---

## ☸️ KUBERNETES DEPLOYMENT

### Deployment YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: captcha-solver
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: captcha-solver
  template:
    metadata:
      labels:
        app: captcha-solver
    spec:
      containers:
      - name: captcha-solver
        image: captcha-solver:v1.0.0
        imagePullPolicy: IfNotPresent
        
        ports:
        - name: http
          containerPort: 3000
        - name: metrics
          containerPort: 9090
        
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: VISION_API_KEY
          valueFrom:
            secretKeyRef:
              name: captcha-solver-secrets
              key: vision-api-key
        - name: SKYVERN_API_URL
          value: "http://skyvern:8000"
        - name: CACHE_BACKEND
          value: "redis"
        - name: REDIS_URL
          value: "redis://redis:6379/0"
        
        resources:
          requests:
            memory: "1Gi"
            cpu: "1000m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 30
          timeoutSeconds: 5
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 3
        
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL

---
apiVersion: v1
kind: Service
metadata:
  name: captcha-solver
  namespace: production
spec:
  type: ClusterIP
  selector:
    app: captcha-solver
  ports:
  - name: http
    port: 80
    targetPort: 3000
  - name: metrics
    port: 9090
    targetPort: 9090

---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: captcha-solver
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: captcha-solver
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

---
apiVersion: v1
kind: Secret
metadata:
  name: captcha-solver-secrets
  namespace: production
type: Opaque
stringData:
  vision-api-key: "sk-proj-xxxxx..."
  skyvern-api-key: "your-key"
```

---

### Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace production

# Create secrets
kubectl create secret generic captcha-solver-secrets \
  --from-literal=vision-api-key=$VISION_API_KEY \
  --from-literal=skyvern-api-key=$SKYVERN_API_KEY \
  -n production

# Deploy
kubectl apply -f deployment.yaml

# Check status
kubectl get pods -n production
kubectl describe pod captcha-solver-xxx -n production

# View logs
kubectl logs -f deployment/captcha-solver -n production

# Port forward (for testing)
kubectl port-forward svc/captcha-solver 3000:80 -n production
```

---

## 🚀 PERFORMANCE OPTIMIZATION

### 1. Connection Pooling

```typescript
// connection-pool.ts
import { createDefaultMultiAgentSolver } from './solvers';

class SolverPool {
  private solvers: any[] = [];
  private poolSize: number;
  private currentIndex: number = 0;

  constructor(poolSize: number = 5) {
    this.poolSize = poolSize;
  }

  async initialize() {
    for (let i = 0; i < this.poolSize; i++) {
      const solver = await createDefaultMultiAgentSolver();
      this.solvers.push(solver);
    }
  }

  getSolver() {
    const solver = this.solvers[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.poolSize;
    return solver;
  }
}

export const solverPool = new SolverPool(5);
await solverPool.initialize();
```

---

### 2. Caching Layer

```typescript
// cache.ts
import Redis from 'ioredis';
import { createHash } from 'crypto';

const redis = new Redis(process.env.REDIS_URL);

export async function getCachedResult(imageBuffer: Buffer) {
  const hash = createHash('sha256').update(imageBuffer).digest('hex');
  const cached = await redis.get(`captcha:${hash}`);
  
  if (cached) {
    return JSON.parse(cached);
  }
  
  return null;
}

export async function setCachedResult(imageBuffer: Buffer, result: any) {
  const hash = createHash('sha256').update(imageBuffer).digest('hex');
  const ttl = parseInt(process.env.CACHE_TTL_SECONDS || '3600');
  
  await redis.setex(
    `captcha:${hash}`,
    ttl,
    JSON.stringify(result)
  );
}
```

---

### 3. Load Balancing

```typescript
// load-balancer.ts
import express from 'express';

const app = express();
const UPSTREAM_SERVERS = [
  'http://solver-1:3000',
  'http://solver-2:3000',
  'http://solver-3:3000'
];

let currentIndex = 0;

app.use((req, res) => {
  const target = UPSTREAM_SERVERS[currentIndex];
  currentIndex = (currentIndex + 1) % UPSTREAM_SERVERS.length;
  
  // Forward request
  // (use httpProxy.createProxyServer)
});

app.listen(8000, () => console.log('Load balancer listening on 8000'));
```

---

## 📊 MONITORING & LOGGING

### Prometheus Metrics

```typescript
// metrics.ts
import promClient from 'prom-client';

export const solveDuration = new promClient.Histogram({
  name: 'captcha_solve_duration_ms',
  help: 'CAPTCHA solve duration in milliseconds',
  buckets: [100, 500, 1000, 2000, 5000, 10000, 30000]
});

export const solveAttempts = new promClient.Counter({
  name: 'captcha_solve_attempts_total',
  help: 'Total CAPTCHA solve attempts',
  labelNames: ['status', 'agent']
});

export const confidenceScore = new promClient.Gauge({
  name: 'captcha_confidence_score',
  help: 'Average confidence score of last solve',
  labelNames: ['agent']
});

// Usage in solver
const startTime = Date.now();
const result = await solver.solve(imageBuffer);
const duration = Date.now() - startTime;

solveDuration.observe(duration);
solveAttempts.inc({ status: result.success ? 'success' : 'failure', agent: result.model });
confidenceScore.set({ agent: result.model }, result.confidence);
```

---

### Winston Logging

```typescript
// logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'captcha-solver' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;
```

---

### ELK Stack Integration

```yaml
# docker-compose.yml with ELK
version: '3.8'

services:
  captcha-solver:
    # ... existing config
    depends_on:
      - elasticsearch
      - logstash
    environment:
      LOGSTASH_HOST: logstash
      LOGSTASH_PORT: 5000

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"

  logstash:
    image: docker.elastic.co/logstash/logstash:8.0.0
    ports:
      - "5000:5000"
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf

  kibana:
    image: docker.elastic.co/kibana/kibana:8.0.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
```

---

## 📈 SCALING STRATEGIES

### Horizontal Scaling (Multiple Instances)

```bash
# Deploy 5 instances with load balancer
docker-compose up -d --scale captcha-solver=5

# Or with Kubernetes
kubectl scale deployment captcha-solver --replicas=5 -n production

# Monitor scaling
kubectl top nodes
kubectl top pods -n production
```

---

### Vertical Scaling (Larger Instances)

```yaml
# Kubernetes resource requests
resources:
  requests:
    memory: "4Gi"      # Increase from 1Gi
    cpu: "4000m"       # Increase from 1000m
  limits:
    memory: "8Gi"
    cpu: "8000m"
```

---

## 🔍 TROUBLESHOOTING

### Issue: High Memory Usage

**Symptoms:**
- Memory usage grows over time
- Eventually crashes with OOM error

**Solutions:**
```typescript
// 1. Check for memory leaks
// Add memory profiling
const heapdump = require('heapdump');
heapdump.writeSnapshot(`./heap-${Date.now()}.heapsnapshot`);

// 2. Ensure solver instance reuse
// BAD: Creating new solver on each request
app.post('/solve', async (req, res) => {
  const solver = await createDefaultMultiAgentSolver(); // ❌
  const result = await solver.solve(buffer);
});

// GOOD: Reuse solver instance
const solver = await createDefaultMultiAgentSolver();
app.post('/solve', async (req, res) => {
  const result = await solver.solve(buffer);  // ✅
});

// 3. Configure garbage collection
NODE_OPTIONS=--max-old-space-size=2048
```

---

### Issue: Slow Response Times

**Solutions:**
```bash
# 1. Check timeouts
SKYVERN_TIMEOUT=20000  # Reduce from 30s
DDDDOCR_TIMEOUT=10000  # Reduce from 15s

# 2. Enable caching
CACHE_ENABLED=true
CACHE_TTL_SECONDS=7200

# 3. Profile endpoint
curl -w "@curl-format.txt" http://localhost:3000/api/solve-captcha

# 4. Reduce minConfidence for faster falloff
curl "http://localhost:3000/api/solve-captcha?minConfidence=0.6"
```

---

### Issue: API Key Errors

**Solutions:**
```bash
# 1. Verify secrets
kubectl get secret captcha-solver-secrets -n production -o yaml

# 2. Check environment
docker exec <container> env | grep VISION_API

# 3. Test API directly
curl -H "Authorization: Bearer $VISION_API_KEY" \
  https://api.openai.com/v1/models

# 4. Check logs for detailed errors
docker logs <container> | grep -i "api"
```

---

## 📋 DEPLOYMENT CHECKLIST

Before going to production:

- [ ] All tests passing
- [ ] Dockerfile builds successfully
- [ ] docker-compose works locally
- [ ] Environment variables documented
- [ ] Secrets not in code
- [ ] Health check endpoint working
- [ ] Logging configured
- [ ] Metrics enabled
- [ ] Rate limiting in place
- [ ] CORS configured
- [ ] Error handling complete
- [ ] Load testing completed
- [ ] Cost estimation done
- [ ] Monitoring & alerting setup
- [ ] Backup & recovery plan ready
- [ ] Documentation updated

---

**END OF AGENT-SOLVER-DEPLOYMENT.md v1.0**
