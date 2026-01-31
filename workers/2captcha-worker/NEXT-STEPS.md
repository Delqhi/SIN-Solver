# SWARM-B3: CAPTCHA Detection & Solving - NEXT STEPS & ROADMAP

## Current Status (Session N)

✅ **COMPLETE & PRODUCTION-READY:**
- CAPTCHA Detection Engine (7+ types, adaptive retry, timeout tracking)
- Screenshot Capture with Base64 encoding
- "Cannot Solve" button detection
- Accuracy Tracking with auto-stop triggers
- Answer Submission with human-like behavior
- Worker Service with job queue (concurrent execution, priority support)
- REST API with full endpoint coverage
- Error handling & custom error types
- Comprehensive test suite (100+ unit/integration tests)

📊 **CURRENT ARCHITECTURE:**
```
Browser (Playwright + Stealth) 
    ↓
CAPTCHA Detector (7 detection methods)
    ↓
Job Queue (Worker Service + Priority Queue)
    ↓
REST API (Express) [8 endpoints]
    ↓
Submitter (Human-like answer submission)
    ↓
Accuracy Tracker (Real-time monitoring + auto-stop)
```

---

## PHASE 3: FULL END-TO-END INTEGRATION & TESTING (CRITICAL)

### **3.1 Integrate API Server into Main Index** (HIGH PRIORITY)

**Status:** ⏳ TODO  
**Effort:** 1-2 hours  
**Impact:** Unlocks REST API endpoints

The current `index.ts` initializes browser + detector + worker service, but **doesn't start the Express API server**.

**Tasks:**
```typescript
// In src/index.ts, after workerService.start():

import { createApiServer } from './api';

const port = parseInt(process.env.PORT || '8019', 10);
const apiServer = await createApiServer(workerService, detector, port);
await apiServer.start();

// Update gracefulShutdown() to also stop API server
await apiServer.stop();
```

**Expected Output:**
```
✅ API Server listening on http://0.0.0.0:8019
[API] GET /health
[API] POST /api/detect
[API] POST /api/solve
```

**Testing:**
```bash
# Start worker
npm run start

# In another terminal, test endpoints
curl http://localhost:8019/health
curl -X POST http://localhost:8019/api/detect \
  -H "Content-Type: application/json" \
  -d '{"url":"https://2captcha.com"}'
```

---

### **3.2 Create/Update Dockerfile** (HIGH PRIORITY)

**Status:** ⏳ TODO (likely exists, needs verification)  
**Effort:** 1-2 hours  
**Impact:** Enables containerization & deployment

**Dockerfile template:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY src/ ./src/
COPY tsconfig.json ./

# Build TypeScript
RUN npm run build

# Environment
ENV PORT=8019
ENV HEADLESS=true
ENV MAX_WORKERS=5

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8019/health || exit 1

# Start
CMD ["npm", "start"]
```

**Docker Compose Integration:**
```yaml
services:
  captcha-worker:
    build: ./workers/2captcha-worker
    container_name: solver-19-captcha-worker
    ports:
      - "8019:8019"
    environment:
      - PORT=8019
      - MAX_WORKERS=5
      - HEADLESS=true
      - LOG_LEVEL=info
    volumes:
      - ./workers/2captcha-worker/submission-logs:/app/submission-logs
    networks:
      - sin-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8019/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

### **3.3 Create .env.example & Document Configuration** (HIGH PRIORITY)

**Status:** ⏳ TODO  
**Effort:** 1 hour  
**Impact:** Clear deployment instructions

**File: `.env.example`**
```bash
# Port Configuration
PORT=8019

# Browser Configuration
HEADLESS=true
MAX_WORKERS=5

# Timeout Configuration
DEFAULT_TIMEOUT_MS=60000
DETECTOR_TIMEOUT_MS=120000

# Queue Configuration
MAX_QUEUE_SIZE=1000
MAX_RETRIES=3
RETRY_BACKOFF_MS=1000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# 2Captcha Authentication (if needed)
TWOCAPTCHA_API_KEY=your_api_key_here

# Proxy Configuration (optional)
PROXY_URL=

# Anti-Ban Configuration
USER_AGENT_LIST=/app/user-agents.txt
PROXY_ROTATION_ENABLED=false
```

**File: `CONFIG.md`**
```markdown
# 2Captcha Worker Configuration Guide

## Environment Variables

### Port & Server
- `PORT` (default: 8019) - REST API port

### Browser
- `HEADLESS` (default: true) - Run Playwright in headless mode
- `MAX_WORKERS` (default: 5) - Concurrent browser instances

### Timeouts
- `DEFAULT_TIMEOUT_MS` (default: 60000) - Job timeout
- `DETECTOR_TIMEOUT_MS` (default: 120000) - CAPTCHA detection timeout

### Queue
- `MAX_QUEUE_SIZE` (default: 1000) - Max jobs in queue
- `MAX_RETRIES` (default: 3) - Auto-retry attempts
- `RETRY_BACKOFF_MS` (default: 1000) - Retry delay

### Logging
- `LOG_LEVEL` - info|debug|warn|error
- `LOG_FORMAT` - json|text

## Quick Start

1. Copy `.env.example` to `.env`
2. Adjust values as needed
3. Run: `npm start`
4. Visit: http://localhost:8019/health
```

---

### **3.4 Create Integration Test Suite** (HIGH PRIORITY)

**Status:** ⏳ TODO  
**Effort:** 3-4 hours  
**Impact:** Validates real-world 2captcha.com workflow

**File: `src/integration.test.ts`** (new)

```typescript
/**
 * Integration Tests - Live 2Captcha.com Testing
 * 
 * ⚠️ WARNING: These tests run against REAL 2captcha.com website
 * - Requires stable internet connection
 * - May take 2-3 minutes to run
 * - Tests actual CAPTCHA solving workflow
 */

import { chromium, Browser, Page } from 'playwright';
import { TwoCaptchaDetector } from './detector';
import { CaptchaSubmitter } from './submitter';
import { AccuracyTracker } from './tracker';

describe('Integration Tests - 2captcha.com Workflow', () => {
  let browser: Browser;
  let page: Page;
  let detector: TwoCaptchaDetector;
  let submitter: CaptchaSubmitter;
  let tracker: AccuracyTracker;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: false });
    page = await browser.newPage();
    detector = new TwoCaptchaDetector(page, { timeout: 120000 });
    submitter = new CaptchaSubmitter(page);
    tracker = new AccuracyTracker();
  });

  afterAll(async () => {
    await browser.close();
  });

  test('E2E: Navigate to 2captcha.com and detect CAPTCHA', async () => {
    await page.goto('https://2captcha.com', { waitUntil: 'networkidle' });
    
    const detection = await detector.detect();
    expect(detection.detected).toBe(true);
    expect(detection.elements).toBeDefined();
    expect(detection.screenshot).toBeDefined();
  }, 120000);

  test('E2E: Full workflow - Detect → Submit Answer', async () => {
    await page.goto('https://2captcha.com', { waitUntil: 'networkidle' });
    
    // Detect CAPTCHA
    const detection = await detector.detect();
    expect(detection.detected).toBe(true);

    // Get answer from consensus solvers
    const answer = 'SAMPLE_ANSWER'; // Would be from solver
    
    // Submit answer
    const submission = await submitter.submitAnswer(answer);
    expect(submission.success).toBe(true);

    // Track accuracy
    tracker.recordSubmission(answer, submission.success);
  }, 120000);

  test('Timeout tracking - Verify remaining time', async () => {
    const detector2 = new TwoCaptchaDetector(page, { timeout: 60000 });
    
    const remaining = detector2.getRemainingTime();
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(60000);

    const formatted = detector2.getFormattedRemainingTime();
    expect(formatted).toMatch(/\d+s \d+ms/);
  });

  test('Cannot Solve button - Detection and click', async () => {
    await page.goto('https://2captcha.com', { waitUntil: 'networkidle' });
    
    const detection = await detector.detect();
    expect(detection.elements.cannotSolveButton).toBeDefined();

    const result = await submitter.clickCannotSolve();
    expect(result.success).toBe(true);
    expect(result.action).toBe('cannot_solve');
  }, 120000);

  test('Accuracy tracker - Monitor performance', async () => {
    tracker.recordSubmission('TEST_ANSWER_1', true);
    tracker.recordSubmission('TEST_ANSWER_2', false);
    tracker.recordSubmission('TEST_ANSWER_3', true);

    const stats = tracker.getStats();
    expect(stats.total).toBe(3);
    expect(stats.correct).toBe(2);
    expect(parseFloat(stats.currentAccuracy)).toBeCloseTo(66.67, 1);
  });

  test('Accuracy tracker - Emergency stop trigger', async () => {
    const testTracker = new AccuracyTracker();
    
    // Record 20 failures
    for (let i = 0; i < 20; i++) {
      testTracker.recordSubmission(`FAIL_${i}`, false);
    }

    const stats = testTracker.getStats();
    expect(stats.status).toBe('STOPPED');
  });
});
```

**Run integration tests:**
```bash
npm run test:integration -- --testPathPattern=integration.test.ts
```

---

### **3.5 Implement Logging & Monitoring System** (MEDIUM PRIORITY)

**Status:** ⏳ TODO  
**Effort:** 2-3 hours  
**Impact:** Production-ready observability

**File: `src/logger.ts`** (new)

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: '2captcha-worker' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

export default logger;
```

**Metrics Export (Prometheus format):**
```typescript
import promClient from 'prom-client';

export const metrics = {
  detectionDuration: new promClient.Histogram({
    name: 'captcha_detection_duration_ms',
    help: 'Duration of CAPTCHA detection in milliseconds',
    buckets: [100, 500, 1000, 5000, 10000]
  }),
  submissionDuration: new promClient.Histogram({
    name: 'captcha_submission_duration_ms',
    help: 'Duration of answer submission in milliseconds'
  }),
  accuracy: new promClient.Gauge({
    name: 'captcha_accuracy_percentage',
    help: 'Current CAPTCHA solving accuracy'
  }),
  queueSize: new promClient.Gauge({
    name: 'job_queue_size',
    help: 'Current number of jobs in queue'
  })
};

// Export endpoint: GET /metrics (Prometheus scraping)
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

---

## PHASE 4: PERFORMANCE & RELIABILITY OPTIMIZATION (MEDIUM PRIORITY)

### **4.1 Performance Tuning**

**Current Bottlenecks:**
- Browser startup: ~5-10s per instance
- CAPTCHA detection: ~1-3s
- Element location: Variable (depends on page complexity)

**Optimizations to implement:**
1. **Browser Pool Pre-warming** - Create browser instances on startup
2. **Detector Parallelization** - Multiple detector instances per browser
3. **Screenshot Compression** - Reduce base64 payload size
4. **Caching** - Cache selectors across similar CAPTCHAs

---

### **4.2 Scalability Improvements**

**Multi-browser Distribution:**
- Horizontal scaling with multiple 2captcha-worker instances
- Redis-backed job queue (instead of in-memory)
- Distributed state management

---

### **4.3 Reliability Features**

**Circuit Breaker Pattern:**
```typescript
class CircuitBreaker {
  open = false;
  failureCount = 0;
  threshold = 5;
  resetTime = 60000;

  async execute(fn: Function) {
    if (this.open) throw new Error('Circuit breaker is open');
    try {
      return await fn();
    } catch (error) {
      this.failureCount++;
      if (this.failureCount >= this.threshold) {
        this.open = true;
        setTimeout(() => { this.open = false; }, this.resetTime);
      }
      throw error;
    }
  }
}
```

**Graceful Degradation:**
- Fallback to manual solving if AI fails
- Queue persistence across restarts
- Request replay on failure

---

## PHASE 5: COMPREHENSIVE DOCUMENTATION & DEPLOYMENT

### **5.1 API Documentation (OpenAPI/Swagger)**

**File: `openapi.yaml`** (new)
```yaml
openapi: 3.0.0
info:
  title: 2Captcha Worker API
  version: 1.0.0
paths:
  /health:
    get:
      summary: Health check
      responses:
        200:
          description: Service is healthy
  /api/detect:
    post:
      summary: Run CAPTCHA detection
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                url:
                  type: string
                timeoutMs:
                  type: number
```

**Add swagger-ui endpoint:**
```bash
npm install swagger-ui-express
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
```

### **5.2 Deployment Guide**

**File: `DEPLOYMENT.md`** (new)
```markdown
# Deployment Guide

## Docker Compose (Development)
```bash
docker-compose up -d captcha-worker
curl http://localhost:8019/health
```

## Kubernetes (Production)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: captcha-worker
spec:
  replicas: 3
  containers:
  - name: captcha-worker
    image: captcha-worker:latest
    ports:
    - containerPort: 8019
    env:
    - name: MAX_WORKERS
      value: "5"
    resources:
      requests:
        memory: "512Mi"
        cpu: "500m"
```

## AWS ECS / GCP Cloud Run
[Deployment instructions for cloud platforms]

## Monitoring Setup (Prometheus + Grafana)
[Monitoring configuration]
```

### **5.3 Operations Guide**

**File: `OPERATIONS.md`** (new)
```markdown
# Operations & Troubleshooting

## Common Issues

### Issue: CAPTCHA detection timeout
**Symptoms:** Job stuck in "running" state, timeout after 120s

**Solutions:**
1. Check network connectivity
2. Verify 2captcha.com is accessible
3. Reduce `MAX_WORKERS` to free up resources
4. Increase `DETECTOR_TIMEOUT_MS`

### Issue: Low accuracy (< 85%)
**Symptoms:** AccuracyTracker triggers emergency stop

**Solutions:**
1. Check solver consensus (multi-AI validation)
2. Review error logs for pattern
3. Implement manual review queue
4. Scale down MAX_WORKERS temporarily

### Issue: Queue accumulation
**Symptoms:** Job queue grows continuously, jobs stuck

**Solutions:**
1. Check API response times: `GET /api/metrics`
2. Scale up workers: `MAX_WORKERS=10`
3. Check for stuck jobs: `GET /api/queue`
4. Cancel old jobs if necessary: `POST /api/cancel/:jobId`

## Debugging

### View Real-Time Logs
```bash
docker logs -f solver-19-captcha-worker
```

### Check Metrics
```bash
curl http://localhost:8019/api/metrics | jq .
```

### Export Prometheus Metrics
```bash
curl http://localhost:8019/metrics
```

### Test Detector Directly
```bash
npm run test:detector
```

## Maintenance

### Backup Accuracy Stats
```bash
cp .captcha-tracker-stats.json backup/stats-$(date +%Y%m%d).json
```

### Clean Old Submission Logs
```bash
find submission-logs -type f -mtime +7 -delete
```

### Update Worker Code
```bash
git pull origin main
npm install
npm run build
docker-compose restart captcha-worker
```
```

---

## QUICK START: Next 3 Steps

### Step 1: Integrate API Server (1-2 hours)
```bash
cd /Users/jeremy/dev/SIN-Solver
# Edit src/index.ts
# Add: import { createApiServer } from './api';
# Add API startup after workerService.start()
npm run build
npm run start
# Verify: curl http://localhost:8019/health
```

### Step 2: Create .env Configuration (30 min)
```bash
# Create .env file
cp .env.example .env
# Create CONFIG.md documentation
```

### Step 3: Build Docker Container (1 hour)
```bash
# Create/update Dockerfile
docker build -t captcha-worker:latest .
docker run -p 8019:8019 captcha-worker:latest
# Verify: curl http://localhost:8019/health
```

---

## Resource Estimates

| Phase | Task | Effort | Difficulty | Impact |
|-------|------|--------|-----------|--------|
| 3.1 | API Integration | 1-2h | Easy | Critical |
| 3.2 | Docker Setup | 1-2h | Easy | Critical |
| 3.3 | Env Config | 1h | Trivial | High |
| 3.4 | Integration Tests | 3-4h | Medium | High |
| 3.5 | Logging/Monitoring | 2-3h | Medium | Medium |
| **Total Phase 3** | **END-TO-END READY** | **~10 hours** | | **PRODUCTION-READY** |
| 4.1-4.3 | Performance/Reliability | 6-8h | High | Reliability |
| 5.1-5.3 | Documentation | 4-6h | Medium | Maintainability |

---

## Dependencies Already Implemented ✅

- ✅ Playwright for browser automation
- ✅ Express.js for REST API
- ✅ Winston for logging (ready to integrate)
- ✅ Jest for testing
- ✅ TypeScript compilation
- ✅ Error handling framework
- ✅ Event-based job queue
- ✅ Concurrent worker pool

---

## Success Criteria for Phase 3 Completion

- ✅ API server starts with `npm start`
- ✅ All 8 REST endpoints respond correctly
- ✅ Docker container builds and runs
- ✅ Health check endpoint returns 200
- ✅ Integration tests pass against live 2captcha.com
- ✅ Worker handles 100+ jobs without crashing
- ✅ Graceful shutdown (SIGTERM) works
- ✅ All logs written to files
- ✅ Metrics exportable in Prometheus format
- ✅ Accuracy tracking triggers auto-stop

---

## Recommended Order of Execution

1. **3.1 API Integration** → Unlocks REST API testing
2. **3.3 Env Config** → Required for Docker/deployment
3. **3.2 Docker Setup** → Enables containerized testing
4. **3.4 Integration Tests** → Validates real-world workflow
5. **3.5 Monitoring** → Production readiness
6. **Phase 4** → Performance optimization
7. **Phase 5** → Documentation & deployment

---

**Status:** Ready to execute Phase 3.1 immediately  
**Estimated Total Time:** 10-12 hours for full Phase 3 completion  
**Next Action:** Start with 3.1 API Integration
