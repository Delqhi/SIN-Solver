# AGENT-SOLVER INTEGRATION GUIDE v1.0

**Last Updated:** 2026-01-30  
**Version:** 1.0  
**Status:** Production Ready  
**Build:** BUILD-3 Multi-Agent CAPTCHA Solver

---

## 📋 TABLE OF CONTENTS

1. [Quick Integration](#quick-integration)
2. [REST API Endpoint](#rest-api-endpoint)
3. [Express.js Integration](#expressjs-integration)
4. [Error Handling](#error-handling)
5. [Response Formats](#response-formats)
6. [Request Validation](#request-validation)
7. [Advanced Integration](#advanced-integration)
8. [Testing Integration](#testing-integration)

---

## 🚀 QUICK INTEGRATION

### 60-Second Integration

```typescript
// 1. Import solver
import { createDefaultMultiAgentSolver } from './solvers';

// 2. Create instance (reuse across requests)
const solver = await createDefaultMultiAgentSolver();

// 3. Solve captcha
const result = await solver.solve(captchaImageBuffer);

// 4. Use result
if (result.bestResult.confidence >= 0.75) {
  console.log(`Answer: ${result.bestResult.answer}`);
} else {
  console.log('Not confident enough');
}
```

---

## 🔌 REST API ENDPOINT

### Endpoint Specification

```
POST /api/solve-captcha
Content-Type: multipart/form-data

Parameters:
  - image (required): CAPTCHA image file (JPEG, PNG)
  - format (optional): response format (standard|detailed|consensus)
  - minConfidence (optional): confidence threshold (0.0-1.0, default: 0.7)
  - timeout (optional): request timeout in ms (default: 30000)

Response: 200 OK
{
  "success": true,
  "data": {
    "answer": "detected-text",
    "confidence": 0.95,
    "model": "gpt-4-vision-preview",
    "consensus": null,
    "totalTime": 1234,
    "format": "standard"
  }
}
```

---

## 🛠️ EXPRESS.JS INTEGRATION

### Basic Setup

```typescript
import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { createDefaultMultiAgentSolver } from './solvers';

const app = express();
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WebP supported'));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// Initialize solver once (reuse)
let solver: any = null;

app.use(async (req: Request, res: Response, next: NextFunction) => {
  if (!solver) {
    try {
      solver = await createDefaultMultiAgentSolver({
        timeout: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000'),
        minConfidence: 0.7
      });
    } catch (err) {
      return res.status(500).json({ error: 'Solver initialization failed' });
    }
  }
  next();
});

// Main endpoint
app.post('/api/solve-captcha', upload.single('image'), async (req: Request, res: Response) => {
  try {
    // Validate request
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const imageBuffer = req.file.buffer;
    const minConfidence = parseFloat(req.query.minConfidence as string) || 0.7;
    const format = (req.query.format as string) || 'standard';

    // Solve CAPTCHA
    const result = await solver.solve(imageBuffer);

    // Filter by confidence
    const validResult = result.bestResult.confidence >= minConfidence
      ? result
      : null;

    // Format response
    const response = formatResponse(result, format, validResult);

    return res.json({
      success: !!validResult,
      data: response
    });

  } catch (error) {
    console.error('Solver error:', error);
    return res.status(500).json({
      error: 'CAPTCHA solving failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

---

### Complete Express App with Error Handling

```typescript
import express from 'express';
import multer from 'multer';
import { createDefaultMultiAgentSolver } from './solvers';
import winston from 'winston';

// ============================================
// LOGGER SETUP
// ============================================
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'captcha-solver.log' })
  ]
});

// ============================================
// INITIALIZATION
// ============================================
const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('Unsupported image format'));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

let solver: any = null;
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

// ============================================
// INITIALIZATION MIDDLEWARE
// ============================================
const initializeSolver = async () => {
  if (solver) return;
  
  if (isInitializing) {
    await initializationPromise;
    return;
  }
  
  isInitializing = true;
  initializationPromise = (async () => {
    try {
      solver = await createDefaultMultiAgentSolver({
        timeout: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000'),
        minConfidence: 0.7,
        logging: { enabled: true, level: 'info' }
      });
      logger.info('Solver initialized successfully');
    } catch (err) {
      logger.error('Solver initialization failed:', err);
      throw err;
    }
  })();
  
  await initializationPromise;
};

app.use(async (req, res, next) => {
  try {
    await initializeSolver();
    next();
  } catch (err) {
    logger.error('Initialization error:', err);
    res.status(503).json({ error: 'Service unavailable - solver not initialized' });
  }
});

// ============================================
// MAIN ENDPOINT
// ============================================
app.post('/api/solve-captcha', upload.single('image'), async (req, res) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // Validation
    if (!req.file) {
      logger.warn(`[${requestId}] No image provided`);
      return res.status(400).json({ error: 'No image provided' });
    }

    const imageBuffer = req.file.buffer;
    const minConfidence = parseFloat(req.query.minConfidence as string) || 0.7;
    const format = (req.query.format as string) || 'standard';

    logger.info(`[${requestId}] Starting CAPTCHA solving`, {
      imageSize: imageBuffer.length,
      minConfidence,
      format
    });

    // Solve
    const startTime = Date.now();
    const result = await solver.solve(imageBuffer);
    const solveTime = Date.now() - startTime;

    // Check confidence
    const isValid = result.bestResult.confidence >= minConfidence;

    logger.info(`[${requestId}] CAPTCHA solved`, {
      answer: result.bestResult.answer,
      confidence: result.bestResult.confidence,
      valid: isValid,
      solveTime,
      consensus: result.consensus ? 'yes' : 'no'
    });

    // Format response
    const response = formatResponse(result, format, isValid);

    return res.json({
      success: isValid,
      requestId,
      solveTime,
      data: response
    });

  } catch (error) {
    logger.error(`[${requestId}] Solver error:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = errorMessage.includes('timeout') ? 408 : 500;
    
    return res.status(statusCode).json({
      success: false,
      requestId,
      error: errorMessage
    });
  }
});

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================
app.get('/api/health', async (req, res) => {
  try {
    await initializeSolver();
    return res.json({
      status: 'healthy',
      solverReady: !!solver,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(503).json({
      status: 'unhealthy',
      error: 'Solver not available'
    });
  }
});

// ============================================
// INFO ENDPOINT
// ============================================
app.get('/api/solver-info', async (req, res) => {
  try {
    await initializeSolver();
    const config = solver.getConfig();
    const names = solver.getSolverNames();
    
    return res.json({
      solvers: names,
      config: config,
      endpoints: {
        solve: '/api/solve-captcha',
        health: '/api/health',
        info: '/api/solver-info'
      }
    });
  } catch (err) {
    return res.status(503).json({ error: 'Solver not available' });
  }
});

// ============================================
// ERROR HANDLER
// ============================================
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: 'Upload error',
      message: err.message
    });
  }
  
  if (err.message === 'Unsupported image format') {
    return res.status(400).json({
      error: 'Unsupported image format',
      supported: ['JPEG', 'PNG', 'WebP']
    });
  }
  
  return res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`CAPTCHA Solver API listening on port ${PORT}`);
});
```

---

## 📊 ERROR HANDLING

### Standard Error Responses

```typescript
// 400 Bad Request - Invalid input
{
  "success": false,
  "error": "No image provided"
}

// 408 Request Timeout - Solver timeout
{
  "success": false,
  "error": "CAPTCHA solving timeout (30s exceeded)"
}

// 413 Payload Too Large - File too big
{
  "success": false,
  "error": "Image exceeds 5MB limit"
}

// 422 Unprocessable Entity - Low confidence
{
  "success": false,
  "error": "Confidence too low (0.45 < 0.70)",
  "data": {
    "answer": "detected",
    "confidence": 0.45,
    "suggestion": "Increase minConfidence or retry"
  }
}

// 500 Internal Server Error
{
  "success": false,
  "error": "API key invalid",
  "requestId": "1234567890-abc123"
}

// 503 Service Unavailable
{
  "success": false,
  "error": "Solver not initialized"
}
```

---

### Error Handling Patterns

**Pattern 1: Retry with Backoff**
```typescript
async function solveWithRetry(
  imageBuffer: Buffer,
  maxRetries = 3,
  initialDelay = 1000
): Promise<any> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/solve-captcha', {
        method: 'POST',
        body: imageBuffer,
        headers: { 'Content-Type': 'application/octet-stream' }
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      // Retry on 503 or 408
      if (![503, 408].includes(response.status)) {
        throw new Error(await response.text());
      }
      
      lastError = new Error(`HTTP ${response.status}`);
      
    } catch (err) {
      lastError = err;
    }
    
    if (attempt < maxRetries) {
      const delay = initialDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
```

**Pattern 2: Fallback Solver**
```typescript
async function solveWithFallback(imageBuffer: Buffer) {
  // Try main solver
  try {
    const response = await fetch('/api/solve-captcha?minConfidence=0.8', {
      method: 'POST',
      body: imageBuffer
    });
    
    if (response.ok) {
      const result = await response.json();
      if (result.success) return result.data.answer;
    }
  } catch (err) {
    console.log('Main solver failed:', err);
  }
  
  // Fallback: Try with lower confidence
  const response = await fetch('/api/solve-captcha?minConfidence=0.6', {
    method: 'POST',
    body: imageBuffer
  });
  
  const result = await response.json();
  if (result.success) {
    console.log('Fallback solver succeeded with confidence:', result.data.confidence);
    return result.data.answer;
  }
  
  throw new Error('All solvers failed');
}
```

---

## 📋 RESPONSE FORMATS

### Standard Format (Default)

```json
{
  "success": true,
  "requestId": "1704067200000-abc123",
  "solveTime": 1234,
  "data": {
    "answer": "detected-text",
    "confidence": 0.95,
    "model": "gpt-4-vision-preview",
    "consensus": null,
    "totalTime": 1234,
    "format": "standard"
  }
}
```

### Detailed Format (?format=detailed)

```json
{
  "success": true,
  "requestId": "...",
  "solveTime": 1234,
  "data": {
    "answer": "detected-text",
    "confidence": 0.95,
    "model": "gpt-4-vision-preview",
    "consensus": null,
    "totalTime": 1234,
    "format": "detailed",
    "allResults": [
      {
        "agent": "gpt-4-vision-preview",
        "answer": "detected-text",
        "confidence": 0.95,
        "time": 1234
      },
      {
        "agent": "skyvern-vision-ai",
        "answer": "detected-text",
        "confidence": 0.85,
        "time": 2500
      },
      {
        "agent": "ddddocr-ocr",
        "answer": "detected-text",
        "confidence": 0.80,
        "time": 500
      }
    ],
    "metadata": {
      "parallelExecution": true,
      "totalAgents": 3,
      "validResults": 3
    }
  }
}
```

### Consensus Format (?format=consensus)

```json
{
  "success": true,
  "requestId": "...",
  "solveTime": 1234,
  "data": {
    "consensus": {
      "answer": "detected-text",
      "agentCount": 3,
      "confidence": 0.867,
      "agents": ["gpt-4-vision-preview", "skyvern-vision-ai", "ddddocr-ocr"]
    },
    "consensusReached": true,
    "consensusStrength": "strong",
    "format": "consensus",
    "totalTime": 2500,
    "allResults": [
      {
        "agent": "gpt-4-vision-preview",
        "answer": "detected-text",
        "confidence": 0.95
      },
      {
        "agent": "skyvern-vision-ai",
        "answer": "detected-text",
        "confidence": 0.85
      },
      {
        "agent": "ddddocr-ocr",
        "answer": "detected-text",
        "confidence": 0.80
      }
    ]
  }
}
```

---

## ✅ REQUEST VALIDATION

### Request Schema

```typescript
interface SolveCaptchaRequest {
  image: File;              // Required: CAPTCHA image
  minConfidence?: number;   // Optional: 0.0-1.0 (default: 0.7)
  format?: 'standard' | 'detailed' | 'consensus';  // Optional
  timeout?: number;         // Optional: ms (default: 30000)
  returnAllResults?: boolean; // Optional: include all agent results
}
```

### Validation Implementation

```typescript
function validateRequest(req: express.Request): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // File validation
  if (!req.file) {
    errors.push('Image file required');
  } else {
    if (req.file.size > 5 * 1024 * 1024) {
      errors.push('Image exceeds 5MB limit');
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(req.file.mimetype)) {
      errors.push('Unsupported format. Supported: JPEG, PNG, WebP');
    }
  }

  // Confidence validation
  if (req.query.minConfidence) {
    const conf = parseFloat(req.query.minConfidence as string);
    if (isNaN(conf) || conf < 0 || conf > 1) {
      errors.push('minConfidence must be between 0.0 and 1.0');
    }
  }

  // Format validation
  if (req.query.format) {
    const validFormats = ['standard', 'detailed', 'consensus'];
    if (!validFormats.includes(req.query.format as string)) {
      errors.push(`Format must be one of: ${validFormats.join(', ')}`);
    }
  }

  // Timeout validation
  if (req.query.timeout) {
    const timeout = parseInt(req.query.timeout as string);
    if (isNaN(timeout) || timeout < 1000 || timeout > 300000) {
      errors.push('timeout must be between 1000ms and 300000ms');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## 🔧 ADVANCED INTEGRATION

### Integration with Message Queue (Bull/RabbitMQ)

```typescript
import Bull from 'bull';
import { createDefaultMultiAgentSolver } from './solvers';

// Create queue
const solveCaptchaQueue = new Bull('solve-captcha', {
  redis: { host: 'localhost', port: 6379 }
});

// Initialize solver
const solver = await createDefaultMultiAgentSolver();

// Process queue
solveCaptchaQueue.process(async (job) => {
  const { imageBase64, minConfidence } = job.data;
  
  // Update progress
  job.progress(10);
  
  // Solve
  const imageBuffer = Buffer.from(imageBase64, 'base64');
  const result = await solver.solve(imageBuffer);
  
  job.progress(90);
  
  // Return result
  return {
    answer: result.bestResult.answer,
    confidence: result.bestResult.confidence,
    valid: result.bestResult.confidence >= (minConfidence || 0.7)
  };
});

// Queue completed handler
solveCaptchaQueue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed:`, result);
});

// Add job to queue
const job = await solveCaptchaQueue.add({
  imageBase64: imageBuffer.toString('base64'),
  minConfidence: 0.8
});
```

---

### Integration with WebSocket (Real-time Updates)

```typescript
import { Server } from 'socket.io';
import http from 'http';
import express from 'express';
import { createDefaultMultiAgentSolver } from './solvers';

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer);

const solver = await createDefaultMultiAgentSolver();

io.on('connection', (socket) => {
  socket.on('solve-captcha', async (data, callback) => {
    try {
      const imageBuffer = Buffer.from(data.imageBase64, 'base64');
      
      socket.emit('progress', { stage: 'starting', percent: 0 });
      
      // Solve (with progress updates)
      const result = await solver.solve(imageBuffer);
      
      socket.emit('progress', { stage: 'completed', percent: 100 });
      
      callback({
        success: true,
        answer: result.bestResult.answer,
        confidence: result.bestResult.confidence
      });
      
    } catch (error) {
      callback({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
});

httpServer.listen(3000);
```

---

### Integration with GraphQL

```typescript
import { ApolloServer, gql } from 'apollo-server-express';
import { createDefaultMultiAgentSolver } from './solvers';

const typeDefs = gql`
  type SolverResult {
    success: Boolean!
    answer: String!
    confidence: Float!
    model: String!
  }

  type Query {
    solveCaptcha(imageUrl: String!, minConfidence: Float): SolverResult!
  }
`;

const solver = await createDefaultMultiAgentSolver();

const resolvers = {
  Query: {
    solveCaptcha: async (parent, args) => {
      try {
        // Fetch image from URL
        const response = await fetch(args.imageUrl);
        const imageBuffer = await response.buffer();
        
        const result = await solver.solve(imageBuffer);
        
        const isValid = result.bestResult.confidence >= (args.minConfidence || 0.7);
        
        return {
          success: isValid,
          answer: result.bestResult.answer,
          confidence: result.bestResult.confidence,
          model: result.bestResult.model
        };
      } catch (err) {
        throw new Error(`Solving failed: ${err}`);
      }
    }
  }
};

const server = new ApolloServer({ typeDefs, resolvers });
```

---

## 🧪 TESTING INTEGRATION

### Integration Tests

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import axios from 'axios';
import fs from 'fs';

const API_URL = 'http://localhost:3000/api';

describe('Agent Solver API', () => {
  let captchaImage: Buffer;

  beforeAll(() => {
    // Load test image
    captchaImage = fs.readFileSync('./test-captcha.png');
  });

  it('should solve captcha with standard format', async () => {
    const formData = new FormData();
    formData.append('image', new Blob([captchaImage]), 'test.png');

    const response = await axios.post(
      `${API_URL}/solve-captcha?format=standard`,
      formData
    );

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.answer).toBeDefined();
    expect(response.data.data.confidence).toBeGreaterThan(0);
    expect(response.data.data.confidence).toBeLessThanOrEqual(1);
  });

  it('should return detailed results with detailed format', async () => {
    const formData = new FormData();
    formData.append('image', new Blob([captchaImage]), 'test.png');

    const response = await axios.post(
      `${API_URL}/solve-captcha?format=detailed`,
      formData
    );

    expect(response.data.data.allResults).toBeDefined();
    expect(response.data.data.allResults.length).toBeGreaterThan(0);
    expect(response.data.data.allResults[0].agent).toBeDefined();
  });

  it('should return consensus when multiple agents agree', async () => {
    const formData = new FormData();
    formData.append('image', new Blob([captchaImage]), 'test.png');

    const response = await axios.post(
      `${API_URL}/solve-captcha?format=consensus`,
      formData
    );

    if (response.data.success && response.data.data.consensusReached) {
      expect(response.data.data.consensus.agentCount).toBeGreaterThanOrEqual(2);
    }
  });

  it('should reject low-confidence results', async () => {
    const formData = new FormData();
    formData.append('image', new Blob([captchaImage]), 'test.png');

    const response = await axios.post(
      `${API_URL}/solve-captcha?minConfidence=0.99`,
      formData,
      { validateStatus: () => true }
    );

    // Either rejected or low confidence
    if (response.status === 200) {
      expect(response.data.success).toBe(false);
    }
  });

  it('should timeout requests exceeding deadline', async () => {
    const formData = new FormData();
    formData.append('image', new Blob([captchaImage]), 'test.png');

    try {
      await axios.post(
        `${API_URL}/solve-captcha?timeout=100`,
        formData,
        { timeout: 200 }
      );
    } catch (err: any) {
      expect(err.response?.status).toBe(408);
    }
  });

  it('should return health status', async () => {
    const response = await axios.get(`${API_URL}/health`);

    expect(response.data.status).toBe('healthy');
    expect(response.data.solverReady).toBe(true);
  });

  it('should return solver info', async () => {
    const response = await axios.get(`${API_URL}/solver-info`);

    expect(response.data.solvers).toBeDefined();
    expect(response.data.solvers.length).toBeGreaterThan(0);
    expect(response.data.config).toBeDefined();
  });
});
```

---

### cURL Testing Examples

```bash
# Solve captcha with image
curl -F "image=@test-captcha.png" \
  http://localhost:3000/api/solve-captcha

# Solve with custom confidence threshold
curl -F "image=@test-captcha.png" \
  "http://localhost:3000/api/solve-captcha?minConfidence=0.8"

# Get detailed results
curl -F "image=@test-captcha.png" \
  "http://localhost:3000/api/solve-captcha?format=detailed"

# Get consensus results
curl -F "image=@test-captcha.png" \
  "http://localhost:3000/api/solve-captcha?format=consensus"

# Check health
curl http://localhost:3000/api/health

# Get solver info
curl http://localhost:3000/api/solver-info
```

---

## 🎯 QUICK REFERENCE

### Environment Setup
```bash
VISION_PROVIDER=openai
VISION_API_KEY=sk-...
SKYVERN_API_URL=http://localhost:8030
SKYVERN_API_KEY=...
DDDDOCR_PYTHON_PATH=python3
```

### Start Server
```bash
npm install
npm run build
npm start
```

### Test Endpoint
```bash
curl -F "image=@captcha.png" http://localhost:3000/api/solve-captcha
```

### Response Fields
- `success` - Whether result is valid
- `answer` - Detected CAPTCHA text
- `confidence` - 0.0-1.0 confidence score
- `model` - Which solver provided the answer
- `consensus` - Result if multiple agents agree

---

**END OF AGENT-SOLVER-INTEGRATION.md v1.0**
