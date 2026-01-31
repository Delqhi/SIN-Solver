# Browserless Best Practices in SIN-Solver

## Table of Contents

1. [Introduction to Browserless in SIN-Solver](#1-introduction-to-browserless-in-sin-solver)
2. [Connection Management (CDP, WebSockets)](#2-connection-management-cdp-websockets)
3. [Resource Optimization (Memory, CPU, Timeouts)](#3-resource-optimization-memory-cpu-timeouts)
4. [Concurrency and Parallelism](#4-concurrency-and-parallelism)
5. [Session Persistence and State Management](#5-session-persistence-and-state-management)
6. [Error Handling and Auto-Healing](#6-error-handling-and-auto-healing)
7. [Security Best Practices (Secrets, Sandboxing)](#7-security-best-practices-secrets-sandboxing)
8. [Monitoring and Metrics](#8-monitoring-and-metrics)
9. [Cost Management and Budgeting](#9-cost-management-and-budgeting)
10. [Troubleshooting Common Issues](#10-troubleshooting-common-issues)

---

## 1. Introduction to Browserless in SIN-Solver

### 1.1 What is Browserless?

Browserless is a powerful, scalable, and production-ready browser automation platform that provides remote browser instances via Chrome DevTools Protocol (CDP) and WebSocket connections. In the SIN-Solver ecosystem, Browserless serves as the foundational infrastructure for executing complex web automation tasks, including CAPTCHA solving, web scraping, form automation, and browser-based testing.

Unlike running browsers locally, Browserless offers:
- **Scalability**: Spin up hundreds of browser instances on demand
- **Resource Efficiency**: Shared infrastructure reduces per-task overhead
- **Reliability**: Managed browser lifecycle with automatic recovery
- **Security**: Isolated execution environments and sandboxing
- **Monitoring**: Built-in metrics, logging, and debugging capabilities

### 1.2 Browserless Architecture in SIN-Solver

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SIN-Solver Architecture                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    2Captcha Worker Container                         │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │ Task Queue   │  │ Solver Engine│  │ Result Store │              │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────────────┘              │   │
│  │         │                 │                                        │   │
│  │         └─────────────────┘                                        │   │
│  │                   │                                                │   │
│  │                   │ Browserless Client SDK                         │   │
│  │                   ▼                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                     │                                        │
│                                     │ WebSocket / CDP                        │
│                                     ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Browserless Infrastructure                        │   │
│  │                                                                      │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │ Browser 1    │  │ Browser 2    │  │ Browser N    │              │   │
│  │  │ (Chrome)     │  │ (Chrome)     │  │ (Chrome)     │              │   │
│  │  │              │  │              │  │              │              │   │
│  │  │ • CDP Port   │  │ • CDP Port   │  │ • CDP Port   │              │   │
│  │  │ • WS Endpoint│  │ • WS Endpoint│  │ • WS Endpoint│              │   │
│  │  │ • Sandbox    │  │ • Sandbox    │  │ • Sandbox    │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │                    Load Balancer                             │   │   │
│  │  │         (Distributes connections across browsers)            │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Key Benefits for CAPTCHA Solving

Browserless is particularly valuable for CAPTCHA solving workflows:

1. **JavaScript Execution**: Many modern CAPTCHAs (reCAPTCHA v3, hCaptcha) require full JavaScript execution environments
2. **Cookie Management**: Persistent sessions across multiple CAPTCHA challenges
3. **Stealth Capabilities**: Advanced fingerprint randomization to avoid detection
4. **Screenshot Support**: Visual debugging and OCR preprocessing
5. **Network Interception**: Monitor and modify requests/responses

### 1.4 When to Use Browserless vs. Direct HTTP

| Scenario | Recommended Approach | Rationale |
|----------|---------------------|-----------|
| Simple image CAPTCHA | Direct HTTP API | Lower latency, no browser overhead |
| reCAPTCHA v2 checkbox | Browserless | Requires JavaScript execution |
| reCAPTCHA v3 invisible | Browserless | Complex JavaScript challenge |
| hCaptcha | Browserless | Heavy JavaScript dependency |
| Audio CAPTCHA | Browserless | Media playback required |
| Geetest/FunCaptcha | Browserless | Canvas manipulation needed |

---

## 2. Connection Management (CDP, WebSockets)

### 2.1 Understanding CDP (Chrome DevTools Protocol)

The Chrome DevTools Protocol (CDP) is the primary interface for communicating with Chrome/Chromium browsers. Browserless exposes CDP endpoints that allow programmatic control over browser instances.

#### Key CDP Domains for CAPTCHA Solving

- **Runtime**: Execute JavaScript, evaluate expressions
- **DOM**: Inspect and manipulate page structure
- **Network**: Intercept and modify network requests
- **Page**: Navigation, screenshots, PDF generation
- **Input**: Simulate mouse and keyboard events
- **Target**: Manage browser tabs and contexts

### 2.2 Connection Patterns

#### Pattern 1: Single-Use Connection (Fire-and-Forget)

Best for simple, one-off tasks where session persistence is not required.

```typescript
import puppeteer from 'puppeteer-core';

async function solveSimpleCaptcha(captchaUrl: string): Promise<string> {
  const browser = await puppeteer.connect({
    browserWSEndpoint: 'ws://browserless:3000',
    defaultViewport: { width: 1920, height: 1080 }
  });

  try {
    const page = await browser.newPage();
    await page.goto(captchaUrl, { waitUntil: 'networkidle2' });
    
    // Solve CAPTCHA logic here
    const solution = await extractAndSolveCaptcha(page);
    
    return solution;
  } finally {
    // Always disconnect to free resources
    await browser.disconnect();
  }
}
```

#### Pattern 2: Connection Pooling (Recommended for High Throughput)

Maintain a pool of pre-warmed browser connections for rapid task execution.

```typescript
import puppeteer from 'puppeteer-core';
import { EventEmitter } from 'events';

interface PooledBrowser {
  id: string;
  browser: puppeteer.Browser;
  lastUsed: Date;
  taskCount: number;
  isHealthy: boolean;
}

class BrowserPool extends EventEmitter {
  private pool: PooledBrowser[] = [];
  private maxSize: number;
  private maxTasksPerBrowser: number;
  private wsEndpoint: string;

  constructor(options: {
    maxSize?: number;
    maxTasksPerBrowser?: number;
    wsEndpoint: string;
  }) {
    super();
    this.maxSize = options.maxSize || 10;
    this.maxTasksPerBrowser = options.maxTasksPerBrowser || 50;
    this.wsEndpoint = options.wsEndpoint;
  }

  async initialize(): Promise<void> {
    for (let i = 0; i < this.maxSize; i++) {
      await this.createBrowser();
    }
    this.emit('ready');
  }

  private async createBrowser(): Promise<PooledBrowser> {
    const browser = await puppeteer.connect({
      browserWSEndpoint: this.wsEndpoint,
      defaultViewport: { width: 1920, height: 1080 }
    });

    const pooledBrowser: PooledBrowser = {
      id: `browser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      browser,
      lastUsed: new Date(),
      taskCount: 0,
      isHealthy: true
    };

    // Monitor browser health
    browser.on('disconnected', () => {
      pooledBrowser.isHealthy = false;
      this.emit('browserDisconnected', pooledBrowser.id);
    });

    this.pool.push(pooledBrowser);
    return pooledBrowser;
  }

  async acquire(): Promise<puppeteer.Browser> {
    // Find healthy browser with lowest task count
    const available = this.pool
      .filter(b => b.isHealthy && b.taskCount < this.maxTasksPerBrowser)
      .sort((a, b) => a.taskCount - b.taskCount)[0];

    if (available) {
      available.taskCount++;
      available.lastUsed = new Date();
      return available.browser;
    }

    // If pool exhausted, create temporary browser
    const tempBrowser = await this.createBrowser();
    tempBrowser.taskCount++;
    return tempBrowser.browser;
  }

  async release(browser: puppeteer.Browser): Promise<void> {
    const pooled = this.pool.find(b => b.browser === browser);
    if (pooled) {
      pooled.taskCount = Math.max(0, pooled.taskCount - 1);
      
      // Recycle browser if it has exceeded task limit
      if (pooled.taskCount >= this.maxTasksPerBrowser) {
        await this.recycleBrowser(pooled);
      }
    }
  }

  private async recycleBrowser(pooled: PooledBrowser): Promise<void> {
    pooled.isHealthy = false;
    try {
      await pooled.browser.close();
    } catch (e) {
      // Browser may already be disconnected
    }
    
    // Remove from pool and create replacement
    this.pool = this.pool.filter(b => b.id !== pooled.id);
    await this.createBrowser();
  }

  async shutdown(): Promise<void> {
    await Promise.all(
      this.pool.map(async (b) => {
        try {
          await b.browser.close();
        } catch (e) {
          // Ignore errors during shutdown
        }
      })
    );
    this.pool = [];
  }
}

// Usage
const pool = new BrowserPool({
  wsEndpoint: 'ws://browserless:3000',
  maxSize: 10,
  maxTasksPerBrowser: 50
});

await pool.initialize();

const browser = await pool.acquire();
try {
  const page = await browser.newPage();
  // ... solve CAPTCHA ...
} finally {
  await pool.release(browser);
}
```

#### Pattern 3: Session-Aware Connections

Maintain persistent sessions across multiple CAPTCHA challenges for the same user.

```typescript
import puppeteer from 'puppeteer-core';

interface SessionConfig {
  sessionId: string;
  proxy?: string;
  userAgent?: string;
  cookies?: puppeteer.Protocol.Network.Cookie[];
}

class SessionManager {
  private sessions = new Map<string, puppeteer.Browser>();
  private wsEndpoint: string;

  constructor(wsEndpoint: string) {
    this.wsEndpoint = wsEndpoint;
  }

  async getOrCreateSession(config: SessionConfig): Promise<puppeteer.Browser> {
    let browser = this.sessions.get(config.sessionId);
    
    if (!browser || !browser.isConnected()) {
      // Create new browser with session context
      browser = await puppeteer.connect({
        browserWSEndpoint: this.wsEndpoint,
        defaultViewport: { width: 1920, height: 1080 }
      });

      // Configure proxy if specified
      if (config.proxy) {
        const [host, port] = config.proxy.split(':');
        // Proxy configuration via CDP
      }

      // Restore cookies
      if (config.cookies && config.cookies.length > 0) {
        const context = browser.defaultBrowserContext();
        // Note: Cookie restoration requires a page context
      }

      this.sessions.set(config.sessionId, browser);

      // Monitor session health
      browser.on('disconnected', () => {
        this.sessions.delete(config.sessionId);
      });
    }

    return browser;
  }

  async closeSession(sessionId: string): Promise<void> {
    const browser = this.sessions.get(sessionId);
    if (browser) {
      await browser.close();
      this.sessions.delete(sessionId);
    }
  }

  async getSessionCookies(sessionId: string): Promise<puppeteer.Protocol.Network.Cookie[]> {
    const browser = this.sessions.get(sessionId);
    if (!browser) return [];

    const pages = await browser.pages();
    if (pages.length === 0) return [];

    const client = await pages[0].target().createCDPSession();
    const { cookies } = await client.send('Network.getAllCookies');
    return cookies;
  }
}
```

### 2.3 WebSocket Best Practices

#### Connection Lifecycle Management

```typescript
import WebSocket from 'ws';

class BrowserlessConnection {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(private endpoint: string) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.endpoint);

      this.ws.on('open', () => {
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        resolve();
      });

      this.ws.on('error', (error) => {
        reject(error);
      });

      this.ws.on('close', () => {
        this.stopHeartbeat();
        this.attemptReconnect();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });
    });
  }

  private startHeartbeat(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (e) {
        // Reconnection failed, will try again
      }
    }, delay);
  }

  private handleMessage(data: WebSocket.Data): void {
    // Process CDP messages
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

#### Handling Connection Errors

```typescript
async function withConnectionRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, retryDelay = 1000, onRetry } = options;
  
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (error instanceof Error) {
        if (error.message.includes('INVALID_ARGUMENT')) {
          throw error; // Client error, don't retry
        }
      }
      
      if (attempt < maxRetries) {
        onRetry?.(attempt, lastError);
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }
  
  throw lastError!;
}

// Usage
const result = await withConnectionRetry(
  async () => {
    const browser = await puppeteer.connect({ browserWSEndpoint });
    // ... perform operation ...
    return result;
  },
  {
    maxRetries: 3,
    retryDelay: 1000,
    onRetry: (attempt, error) => {
      console.warn(`Connection attempt ${attempt} failed: ${error.message}`);
    }
  }
);
```

---

## 3. Resource Optimization (Memory, CPU, Timeouts)

### 3.1 Memory Management

Browser instances can consume significant memory. Proper management is critical for maintaining system stability.

#### Memory Usage Patterns

| Browser State | Approximate Memory | Notes |
|--------------|-------------------|-------|
| Idle (no pages) | 50-100 MB | Base Chromium overhead |
| Single page loaded | 150-300 MB | Depends on page complexity |
| Heavy JavaScript app | 300-800 MB | SPAs, complex animations |
| Multiple tabs | 200-500 MB per tab | Cumulative |
| With DevTools | +50-100 MB | Additional overhead |

#### Memory Optimization Strategies

```typescript
import puppeteer from 'puppeteer-core';

interface ResourceOptions {
  maxMemoryMB?: number;
  maxCPUPercent?: number;
  pageTimeout?: number;
}

class ResourceOptimizedBrowser {
  private browser: puppeteer.Browser | null = null;
  private memoryCheckInterval: NodeJS.Timeout | null = null;
  private options: Required<ResourceOptions>;

  constructor(options: ResourceOptions = {}) {
    this.options = {
      maxMemoryMB: options.maxMemoryMB || 512,
      maxCPUPercent: options.maxCPUPercent || 80,
      pageTimeout: options.pageTimeout || 30000
    };
  }

  async connect(wsEndpoint: string): Promise<void> {
    this.browser = await puppeteer.connect({
      browserWSEndpoint: wsEndpoint,
      defaultViewport: { width: 1280, height: 720 } // Smaller viewport = less memory
    });

    // Start memory monitoring
    this.startMemoryMonitoring();
  }

  private startMemoryMonitoring(): void {
    this.memoryCheckInterval = setInterval(async () => {
      if (!this.browser) return;

      try {
        const metrics = await this.getMemoryMetrics();
        
        if (metrics.usedJSHeapSize > this.options.maxMemoryMB * 1024 * 1024) {
          console.warn(`High memory usage detected: ${metrics.usedJSHeapSize / 1024 / 1024}MB`);
          await this.cleanupMemory();
        }
      } catch (e) {
        // Browser may have disconnected
      }
    }, 10000); // Check every 10 seconds
  }

  private async getMemoryMetrics(): Promise<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
  }> {
    if (!this.browser) throw new Error('Browser not connected');

    const pages = await this.browser.pages();
    if (pages.length === 0) return { usedJSHeapSize: 0, totalJSHeapSize: 0 };

    // Get metrics from the first page
    const metrics = await pages[0].evaluate(() => {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory?.usedJSHeapSize || 0,
        totalJSHeapSize: memory?.totalJSHeapSize || 0
      };
    });

    return metrics;
  }

  private async cleanupMemory(): Promise<void> {
    if (!this.browser) return;

    const pages = await this.browser.pages();
    
    // Close unnecessary pages
    for (let i = 1; i < pages.length; i++) {
      await pages[i].close();
    }

    // Trigger garbage collection if available
    const mainPage = pages[0];
    await mainPage.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });
  }

  async newPage(): Promise<puppeteer.Page> {
    if (!this.browser) throw new Error('Browser not connected');

    const page = await this.browser.newPage();

    // Set resource limits
    await page.setDefaultNavigationTimeout(this.options.pageTimeout);
    await page.setDefaultTimeout(this.options.pageTimeout);

    // Disable unnecessary features
    await page.setJavaScriptEnabled(true);
    
    // Block resource-heavy content when not needed
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      // Block images, fonts, stylesheets for text-only CAPTCHAs
      if (['image', 'font', 'stylesheet'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    return page;
  }

  async disconnect(): Promise<void> {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }

    if (this.browser) {
      await this.browser.disconnect();
      this.browser = null;
    }
  }
}
```

#### Page-Level Memory Optimization

```typescript
async function optimizePageForLowMemory(page: puppeteer.Page): Promise<void> {
  // Disable CSS animations and transitions
  await page.evaluateOnNewDocument(() => {
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        transition-duration: 0s !important;
      }
    `;
    document.head.appendChild(style);
  });

  // Block unnecessary resources
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    const resourceType = req.resourceType();
    
    // Block common tracking and analytics
    if (url.includes('google-analytics') ||
        url.includes('googletagmanager') ||
        url.includes('facebook.com/tr') ||
        url.includes('doubleclick')) {
      req.abort();
      return;
    }

    // Block media for text-only operations
    if (['media', 'websocket', 'manifest'].includes(resourceType)) {
      req.abort();
      return;
    }

    req.continue();
  });

  // Clear console logs to free memory
  page.on('console', () => {});
  page.on('pageerror', () => {});
}
```

### 3.2 CPU Optimization

#### Throttling and Rate Limiting

```typescript
async function throttleCPU(page: puppeteer.Page, factor: number): Promise<void> {
  const client = await page.target().createCDPSession();
  
  // Enable CPU throttling
  await client.send('Emulation.setCPUThrottlingRate', {
    rate: factor // 1 = no throttling, 2 = 2x slowdown, etc.
  });
}

// Usage: Throttle to 50% CPU for background tasks
await throttleCPU(page, 2);
```

#### Task Prioritization

```typescript
interface PrioritizedTask {
  id: string;
  priority: 'high' | 'medium' | 'low';
  operation: () => Promise<any>;
  estimatedDuration: number;
}

class TaskScheduler {
  private queue: PrioritizedTask[] = [];
  private running = false;
  private concurrentLimit: number;

  constructor(concurrentLimit = 3) {
    this.concurrentLimit = concurrentLimit;
  }

  addTask(task: PrioritizedTask): void {
    this.queue.push(task);
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    if (!this.running) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.running = true;

    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.concurrentLimit);
      
      await Promise.all(
        batch.map(async (task) => {
          const startTime = Date.now();
          try {
            await task.operation();
          } catch (e) {
            console.error(`Task ${task.id} failed:`, e);
          }
          const duration = Date.now() - startTime;
          console.log(`Task ${task.id} completed in ${duration}ms`);
        })
      );
    }

    this.running = false;
  }
}
```

### 3.3 Timeout Strategies

#### Comprehensive Timeout Management

```typescript
interface TimeoutConfig {
  navigationTimeout?: number;
  waitForSelectorTimeout?: number;
  operationTimeout?: number;
  globalTimeout?: number;
}

class TimeoutManager {
  private config: Required<TimeoutConfig>;

  constructor(config: TimeoutConfig = {}) {
    this.config = {
      navigationTimeout: config.navigationTimeout || 30000,
      waitForSelectorTimeout: config.waitForSelectorTimeout || 10000,
      operationTimeout: config.operationTimeout || 60000,
      globalTimeout: config.globalTimeout || 120000
    };
  }

  async withTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName: string
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Timeout: ${operationName} exceeded ${timeoutMs}ms`));
        }, timeoutMs);
      })
    ]);
  }

  async navigateWithTimeout(
    page: puppeteer.Page,
    url: string,
    options?: puppeteer.WaitForOptions
  ): Promise<puppeteer.HTTPResponse | null> {
    return this.withTimeout(
      () => page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.config.navigationTimeout,
        ...options
      }),
      this.config.navigationTimeout,
      `Navigation to ${url}`
    );
  }

  async waitForSelectorWithTimeout(
    page: puppeteer.Page,
    selector: string,
    options?: puppeteer.WaitForSelectorOptions
  ): Promise<puppeteer.ElementHandle<Element> | null> {
    return this.withTimeout(
      () => page.waitForSelector(selector, {
        timeout: this.config.waitForSelectorTimeout,
        ...options
      }),
      this.config.waitForSelectorTimeout,
      `Wait for selector: ${selector}`
    );
  }
}
```

#### Graceful Degradation on Timeout

```typescript
async function solveCaptchaWithGracefulTimeout(
  page: puppeteer.Page,
  maxAttempts = 3
): Promise<{ success: boolean; solution?: string; error?: string }> {
  const timeoutManager = new TimeoutManager({
    operationTimeout: 30000,
    globalTimeout: 90000
  });

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const solution = await timeoutManager.withTimeout(
        async () => {
          // Attempt to solve CAPTCHA
          return await attemptCaptchaSolve(page);
        },
        30000,
        `CAPTCHA solve attempt ${attempt}`
      );

      return { success: true, solution };
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error);
      
      if (attempt < maxAttempts) {
        // Wait before retry with exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, 1000 * Math.pow(2, attempt - 1))
        );
      }
    }
  }

  return { 
    success: false, 
    error: `Failed to solve CAPTCHA after ${maxAttempts} attempts` 
  };
}
```

---

## 4. Concurrency and Parallelism

### 4.1 Understanding Concurrency Limits

Browserless instances have finite resources. Understanding and respecting limits is crucial for stable operation.

#### Concurrency Factors

| Factor | Typical Limit | Impact |
|--------|--------------|--------|
| Concurrent browsers | 10-100 | Depends on RAM/CPU |
| Pages per browser | 10-20 | Memory overhead |
| WebSocket connections | 1000+ | Network limits |
| CDP sessions | 100+ | Per browser |

### 4.2 Controlled Concurrency Implementation

```typescript
import puppeteer from 'puppeteer-core';
import { Semaphore } from 'async-mutex';

class ConcurrentBrowserManager {
  private semaphore: Semaphore;
  private wsEndpoint: string;
  private activeBrowsers = new Map<string, puppeteer.Browser>();

  constructor(wsEndpoint: string, maxConcurrency: number) {
    this.wsEndpoint = wsEndpoint;
    this.semaphore = new Semaphore(maxConcurrency);
  }

  async execute<T>(
    taskId: string,
    operation: (browser: puppeteer.Browser) => Promise<T>
  ): Promise<T> {
    const [value, release] = await this.semaphore.acquire();
    
    let browser: puppeteer.Browser | null = null;
    
    try {
      browser = await puppeteer.connect({
        browserWSEndpoint: this.wsEndpoint
      });
      
      this.activeBrowsers.set(taskId, browser);
      
      const result = await operation(browser);
      
      return result;
    } finally {
      if (browser) {
        await browser.disconnect();
        this.activeBrowsers.delete(taskId);
      }
      release();
    }
  }

  getActiveCount(): number {
    return this.activeBrowsers.size;
  }
}

// Usage
const manager = new ConcurrentBrowserManager('ws://browserless:3000', 10);

const results = await Promise.all(
  tasks.map(task => 
    manager.execute(task.id, async (browser) => {
      const page = await browser.newPage();
      // ... solve CAPTCHA ...
      return result;
    })
  )
);
```

### 4.3 Worker Pool Pattern

```typescript
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import puppeteer from 'puppeteer-core';

interface WorkerTask {
  id: string;
  captchaUrl: string;
  type: string;
}

interface WorkerResult {
  taskId: string;
  success: boolean;
  solution?: string;
  error?: string;
  duration: number;
}

if (!isMainThread) {
  // Worker thread code
  const { wsEndpoint } = workerData;

  parentPort?.on('message', async (task: WorkerTask) => {
    const startTime = Date.now();
    
    try {
      const browser = await puppeteer.connect({
        browserWSEndpoint: wsEndpoint
      });

      try {
        const page = await browser.newPage();
        await page.goto(task.captchaUrl);
        
        // Solve CAPTCHA
        const solution = await solveCaptcha(page, task.type);
        
        const result: WorkerResult = {
          taskId: task.id,
          success: true,
          solution,
          duration: Date.now() - startTime
        };
        
        parentPort?.postMessage(result);
      } finally {
        await browser.disconnect();
      }
    } catch (error) {
      const result: WorkerResult = {
        taskId: task.id,
        success: false,
        error: (error as Error).message,
        duration: Date.now() - startTime
      };
      
      parentPort?.postMessage(result);
    }
  });
}

// Main thread
class WorkerPool {
  private workers: Worker[] = [];
  private queue: WorkerTask[] = [];
  private results = new Map<string, WorkerResult>();
  private wsEndpoint: string;

  constructor(wsEndpoint: string, poolSize = 4) {
    this.wsEndpoint = wsEndpoint;
    
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(__filename, {
        workerData: { wsEndpoint }
      });
      
      worker.on('message', (result: WorkerResult) => {
        this.results.set(result.taskId, result);
      });
      
      this.workers.push(worker);
    }
  }

  async executeBatch(tasks: WorkerTask[]): Promise<Map<string, WorkerResult>> {
    this.results.clear();
    
    // Distribute tasks among workers
    tasks.forEach((task, index) => {
      const worker = this.workers[index % this.workers.length];
      worker.postMessage(task);
    });

    // Wait for all results
    await new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.results.size === tasks.length) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });

    return this.results;
  }

  terminate(): Promise<number[]> {
    return Promise.all(this.workers.map(w => w.terminate()));
  }
}
```

### 4.4 Rate Limiting and Backpressure

```typescript
import { RateLimiter } from 'limiter';

class RateLimitedBrowserManager {
  private limiter: RateLimiter;
  private queue: Array<{
    operation: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];

  constructor(tokensPerInterval: number, interval: number) {
    this.limiter = new RateLimiter({
      tokensPerInterval,
      interval
    });
  }

  async schedule<T>(operation: () => Promise<T>): Promise<T> {
    await this.limiter.removeTokens(1);
    return operation();
  }

  // Adaptive rate limiting based on success/failure
  private successCount = 0;
  private failureCount = 0;

  recordResult(success: boolean): void {
    if (success) {
      this.successCount++;
      // Gradually increase rate on success
      if (this.successCount > 10) {
        this.limiter.tokensPerInterval = Math.min(
          this.limiter.tokensPerInterval + 1,
          100 // Max rate
        );
        this.successCount = 0;
      }
    } else {
      this.failureCount++;
      // Decrease rate on failure
      if (this.failureCount > 3) {
        this.limiter.tokensPerInterval = Math.max(
          this.limiter.tokensPerInterval - 5,
          1 // Min rate
        );
        this.failureCount = 0;
      }
    }
  }
}
```

---

## 5. Session Persistence and State Management

### 5.1 Cookie and LocalStorage Management

```typescript
import puppeteer from 'puppeteer-core';

interface SessionState {
  cookies: puppeteer.Protocol.Network.Cookie[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  timestamp: number;
}

class SessionPersistenceManager {
  private redis: any; // Redis client
  private sessionTTL: number;

  constructor(redisClient: any, sessionTTLSeconds = 3600) {
    this.redis = redisClient;
    this.sessionTTL = sessionTTLSeconds;
  }

  async saveSession(
    sessionId: string,
    page: puppeteer.Page
  ): Promise<void> {
    const client = await page.target().createCDPSession();

    // Get cookies
    const { cookies } = await client.send('Network.getAllCookies');

    // Get storage
    const localStorage = await page.evaluate(() => {
      const data: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          data[key] = localStorage.getItem(key) || '';
        }
      }
      return data;
    });

    const sessionStorage = await page.evaluate(() => {
      const data: Record<string, string> = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          data[key] = sessionStorage.getItem(key) || '';
        }
      }
      return data;
    });

    const state: SessionState = {
      cookies,
      localStorage,
      sessionStorage,
      timestamp: Date.now()
    };

    // Save to Redis
    await this.redis.setex(
      `browser_session:${sessionId}`,
      this.sessionTTL,
      JSON.stringify(state)
    );
  }

  async restoreSession(
    sessionId: string,
    page: puppeteer.Page
  ): Promise<boolean> {
    const data = await this.redis.get(`browser_session:${sessionId}`);
    
    if (!data) {
      return false;
    }

    const state: SessionState = JSON.parse(data);
    const client = await page.target().createCDPSession();

    // Restore cookies
    for (const cookie of state.cookies) {
      try {
        await client.send('Network.setCookie', cookie);
      } catch (e) {
        // Some cookies may fail to set (e.g., expired)
      }
    }

    // Restore localStorage
    await page.evaluate((data) => {
      for (const [key, value] of Object.entries(data)) {
        localStorage.setItem(key, value);
      }
    }, state.localStorage);

    // Restore sessionStorage
    await page.evaluate((data) => {
      for (const [key, value] of Object.entries(data)) {
        sessionStorage.setItem(key, value);
      }
    }, state.sessionStorage);

    return true;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.redis.del(`browser_session:${sessionId}`);
  }
}
```

### 5.2 Browser Context Isolation

```typescript
import puppeteer from 'puppeteer-core';

class IsolatedContextManager {
  private browser: puppeteer.Browser;

  constructor(browser: puppeteer.Browser) {
    this.browser = browser;
  }

  async createIsolatedContext(options: {
    proxy?: string;
    userAgent?: string;
    viewport?: { width: number; height: number };
    timezone?: string;
    locale?: string;
  }): Promise<puppeteer.BrowserContext> {
    const context = await this.browser.createIncognitoBrowserContext();

    // Set proxy if provided
    if (options.proxy) {
      // Proxy configuration would go here
      // Note: Requires additional setup with Browserless
    }

    return context;
  }

  async createPageWithProfile(
    context: puppeteer.BrowserContext,
    profile: {
      userAgent: string;
      viewport: { width: number; height: number };
      timezone: string;
      locale: string;
      geolocation?: { latitude: number; longitude: number };
    }
  ): Promise<puppeteer.Page> {
    const page = await context.newPage();

    // Set viewport
    await page.setViewport(profile.viewport);

    // Set user agent
    await page.setUserAgent(profile.userAgent);

    // Override navigator properties
    await page.evaluateOnNewDocument((timezone, locale) => {
      // Override timezone
      const originalDateTimeFormat = Intl.DateTimeFormat;
      (Intl as any).DateTimeFormat = function(...args: any[]) {
        if (args.length === 1) {
          args.push({ timeZone: timezone });
        }
        return new (originalDateTimeFormat as any)(...args);
      };

      // Override locale
      Object.defineProperty(navigator, 'language', {
        get: () => locale
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => [locale, 'en-US', 'en']
      });
    }, profile.timezone, profile.locale);

    // Set geolocation if provided
    if (profile.geolocation) {
      const context = page.browserContext();
      await context.overridePermissions(page.url(), ['geolocation']);
      await page.setGeolocation(profile.geolocation);
    }

    return page;
  }
}
```

### 5.3 Persistent Login Sessions

```typescript
interface LoginCredentials {
  username: string;
  password: string;
  totpSecret?: string;
}

class PersistentLoginManager {
  private sessionManager: SessionPersistenceManager;

  constructor(sessionManager: SessionPersistenceManager) {
    this.sessionManager = sessionManager;
  }

  async loginWithPersistence(
    page: puppeteer.Page,
    loginUrl: string,
    credentials: LoginCredentials,
    selectors: {
      username: string;
      password: string;
      submit: string;
      totp?: string;
    }
  ): Promise<boolean> {
    await page.goto(loginUrl);

    // Fill credentials
    await page.type(selectors.username, credentials.username);
    await page.type(selectors.password, credentials.password);
    await page.click(selectors.submit);

    // Handle 2FA if required
    if (selectors.totp && credentials.totpSecret) {
      const totpCode = this.generateTOTP(credentials.totpSecret);
      await page.waitForSelector(selectors.totp);
      await page.type(selectors.totp, totpCode);
      await page.keyboard.press('Enter');
    }

    // Wait for login completion
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2' });
      return true;
    } catch (e) {
      return false;
    }
  }

  private generateTOTP(secret: string): string {
    // TOTP generation logic
    // Use a library like 'speakeasy' or 'otpauth'
    return '';
  }

  async saveLoginSession(
    sessionId: string,
    page: puppeteer.Page
  ): Promise<void> {
    await this.sessionManager.saveSession(sessionId, page);
  }

  async restoreLoginSession(
    sessionId: string,
    page: puppeteer.Page
  ): Promise<boolean> {
    return await this.sessionManager.restoreSession(sessionId, page);
  }
}
```

---

## 6. Error Handling and Auto-Healing

### 6.1 Comprehensive Error Classification

```typescript
enum BrowserErrorType {
  // Connection errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  CONNECTION_CLOSED = 'CONNECTION_CLOSED',
  
  // Navigation errors
  NAVIGATION_TIMEOUT = 'NAVIGATION_TIMEOUT',
  NAVIGATION_FAILED = 'NAVIGATION_FAILED',
  PAGE_CRASH = 'PAGE_CRASH',
  
  // Selector errors
  ELEMENT_NOT_FOUND = 'ELEMENT_NOT_FOUND',
  ELEMENT_NOT_VISIBLE = 'ELEMENT_NOT_VISIBLE',
  ELEMENT_NOT_INTERACTABLE = 'ELEMENT_NOT_INTERACTABLE',
  
  // JavaScript errors
  JS_EXCEPTION = 'JS_EXCEPTION',
  EVALUATION_TIMEOUT = 'EVALUATION_TIMEOUT',
  
  // Resource errors
  RESOURCE_FAILED = 'RESOURCE_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // Unknown
  UNKNOWN = 'UNKNOWN'
}

interface BrowserError {
  type: BrowserErrorType;
  message: string;
  originalError: Error;
  recoverable: boolean;
  retryable: boolean;
}

function classifyError(error: Error): BrowserError {
  const message = error.message.toLowerCase();

  // Connection errors
  if (message.includes('websocket') || message.includes('connect')) {
    return {
      type: BrowserErrorType.CONNECTION_FAILED,
      message: error.message,
      originalError: error,
      recoverable: true,
      retryable: true
    };
  }

  if (message.includes('navigation') && message.includes('timeout')) {
    return {
      type: BrowserErrorType.NAVIGATION_TIMEOUT,
      message: error.message,
      originalError: error,
      recoverable: true,
      retryable: true
    };
  }

  if (message.includes('element') && message.includes('not found')) {
    return {
      type: BrowserErrorType.ELEMENT_NOT_FOUND,
      message: error.message,
      originalError: error,
      recoverable: false,
      retryable: false
    };
  }

  if (message.includes('page crashed')) {
    return {
      type: BrowserErrorType.PAGE_CRASH,
      message: error.message,
      originalError: error,
      recoverable: true,
      retryable: true
    };
  }

  // Default
  return {
    type: BrowserErrorType.UNKNOWN,
    message: error.message,
    originalError: error,
    recoverable: false,
    retryable: false
  };
}
```

### 6.2 Auto-Healing Strategies

```typescript
class AutoHealingBrowserManager {
  private wsEndpoint: string;
  private maxRetries = 3;

  constructor(wsEndpoint: string) {
    this.wsEndpoint = wsEndpoint;
  }

  async executeWithHealing<T>(
    operation: (browser: puppeteer.Browser) => Promise<T>,
    options: {
      maxRetries?: number;
      onError?: (error: BrowserError, attempt: number) => void;
    } = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries || this.maxRetries;
    let lastError: BrowserError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let browser: puppeteer.Browser | null = null;

      try {
        browser = await this.connectWithRetry();
        const result = await operation(browser);
        return result;
      } catch (error) {
        lastError = classifyError(error as Error);
        options.onError?.(lastError, attempt);

        if (!lastError.retryable || attempt === maxRetries) {
          throw lastError.originalError;
        }

        // Apply healing strategy
        await this.applyHealingStrategy(lastError, attempt);
      } finally {
        if (browser) {
          await browser.disconnect().catch(() => {});
        }
      }
    }

    throw lastError!.originalError;
  }

  private async connectWithRetry(): Promise<puppeteer.Browser> {
    return withConnectionRetry(
      () => puppeteer.connect({ browserWSEndpoint: this.wsEndpoint }),
      { maxRetries: 3, retryDelay: 1000 }
    );
  }

  private async applyHealingStrategy(
    error: BrowserError,
    attempt: number
  ): Promise<void> {
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);

    switch (error.type) {
      case BrowserErrorType.CONNECTION_FAILED:
      case BrowserErrorType.CONNECTION_CLOSED:
        // Wait longer for connection issues
        await new Promise(resolve => setTimeout(resolve, delay * 2));
        break;

      case BrowserErrorType.PAGE_CRASH:
        // Shorter delay for page crashes
        await new Promise(resolve => setTimeout(resolve, delay));
        break;

      case BrowserErrorType.NAVIGATION_TIMEOUT:
        // Progressive backoff for navigation
        await new Promise(resolve => setTimeout(resolve, delay));
        break;

      default:
        await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### 6.3 Circuit Breaker Pattern

```typescript
enum CircuitState {
  CLOSED = 'CLOSED',      // Normal operation
  OPEN = 'OPEN',          // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN' // Testing if recovered
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;

  constructor(
    failureThreshold = 5,
    resetTimeoutMs = 30000
  ) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeoutMs;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    return Date.now() - this.lastFailureTime >= this.resetTimeout;
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Usage
const breaker = new CircuitBreaker(5, 30000);

const result = await breaker.execute(async () => {
  return await solveCaptcha(browser, task);
});
```

---

## 7. Security Best Practices (Secrets, Sandboxing)

### 7.1 Secret Management

```typescript
import { VaultClient } from 'hashi-vault-js';

class SecureCredentialManager {
  private vault: VaultClient;
  private cache = new Map<string, { value: string; expiry: number }>();
  private cacheTTL = 300000; // 5 minutes

  constructor(vaultConfig: {
    endpoint: string;
    token: string;
  }) {
    this.vault = new VaultClient({
      endpoint: vaultConfig.endpoint,
      token: vaultConfig.token
    });
  }

  async getCredential(path: string): Promise<string> {
    // Check cache
    const cached = this.cache.get(path);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }

    // Fetch from Vault
    const secret = await this.vault.read({ path });
    const value = secret.data.data.value;

    // Cache with TTL
    this.cache.set(path, {
      value,
      expiry: Date.now() + this.cacheTTL
    });

    return value;
  }

  async getProxyCredentials(proxyId: string): Promise<{
    host: string;
    port: number;
    username: string;
    password: string;
  }> {
    const secret = await this.vault.read({
      path: `proxies/${proxyId}`
    });

    return {
      host: secret.data.data.host,
      port: parseInt(secret.data.data.port),
      username: secret.data.data.username,
      password: secret.data.data.password
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// Usage - Never hardcode credentials
const credentialManager = new SecureCredentialManager({
  endpoint: 'http://vault:8200',
  token: process.env.VAULT_TOKEN!
});

const apiKey = await credentialManager.getCredential('captcha-services/2captcha');
```

### 7.2 Sandboxing and Isolation

```typescript
interface SandboxConfig {
  disableJavaScript?: boolean;
  disableImages?: boolean;
  allowedOrigins?: string[];
  blockedOrigins?: string[];
  maxPageLoadTime?: number;
}

class SandboxedBrowser {
  private browser: puppeteer.Browser;
  private config: SandboxConfig;

  constructor(browser: puppeteer.Browser, config: SandboxConfig = {}) {
    this.browser = browser;
    this.config = {
      maxPageLoadTime: 30000,
      ...config
    };
  }

  async createSandboxedPage(): Promise<puppeteer.Page> {
    const page = await this.browser.newPage();

    // Set strict CSP
    await page.setExtraHTTPHeaders({
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline';"
    });

    // Intercept and block unwanted requests
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      const url = request.url();
      const resourceType = request.resourceType();

      // Block by resource type
      if (this.config.disableImages && resourceType === 'image') {
        request.abort();
        return;
      }

      // Block by origin
      if (this.config.blockedOrigins) {
        const isBlocked = this.config.blockedOrigins.some(origin => 
          url.includes(origin)
        );
        if (isBlocked) {
          request.abort();
          return;
        }
      }

      // Allow only specific origins
      if (this.config.allowedOrigins) {
        const isAllowed = this.config.allowedOrigins.some(origin =>
          url.includes(origin)
        );
        if (!isAllowed) {
          request.abort();
          return;
        }
      }

      request.continue();
    });

    // Disable JavaScript if configured
    if (this.config.disableJavaScript) {
      await page.setJavaScriptEnabled(false);
    }

    // Override dangerous APIs
    await page.evaluateOnNewDocument(() => {
      // Disable alerts/confirms/prompts
      window.alert = () => {};
      window.confirm = () => true;
      window.prompt = () => null;

      // Disable notifications
      if ('Notification' in window) {
        Object.defineProperty(window, 'Notification', {
          value: class FakeNotification {
            static permission = 'denied';
            static requestPermission = () => Promise.resolve('denied');
          }
        });
      }

      // Disable geolocation
      if ('geolocation' in navigator) {
        Object.defineProperty(navigator, 'geolocation', {
          value: {
            getCurrentPosition: () => {},
            watchPosition: () => 0,
            clearWatch: () => {}
          }
        });
      }
    });

    // Set page timeout
    page.setDefaultNavigationTimeout(this.config.maxPageLoadTime!);
    page.setDefaultTimeout(this.config.maxPageLoadTime!);

    return page;
  }
}
```

### 7.3 Input Validation and Sanitization

```typescript
import { z } from 'zod';

// Define schemas for all inputs
const CaptchaTaskSchema = z.object({
  url: z.string().url(),
  type: z.enum(['recaptcha', 'hcaptcha', 'image', 'audio']),
  siteKey: z.string().optional(),
  action: z.string().optional(),
  timeout: z.number().min(1000).max(120000).default(30000),
  proxy: z.string().regex(/^\d+\.\d+\.\d+\.\d+:\d+$/).optional()
});

type CaptchaTask = z.infer<typeof CaptchaTaskSchema>;

class ValidatedTaskProcessor {
  async processTask(rawTask: unknown): Promise<string> {
    // Validate input
    const task = CaptchaTaskSchema.parse(rawTask);

    // Additional sanitization
    const sanitizedUrl = this.sanitizeUrl(task.url);
    const sanitizedProxy = task.proxy ? this.sanitizeProxy(task.proxy) : undefined;

    // Process validated task
    return await this.solveCaptcha({
      ...task,
      url: sanitizedUrl,
      proxy: sanitizedProxy
    });
  }

  private sanitizeUrl(url: string): string {
    const parsed = new URL(url);
    
    // Remove dangerous protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }

    // Remove credentials from URL
    parsed.username = '';
    parsed.password = '';

    return parsed.toString();
  }

  private sanitizeProxy(proxy: string): string {
    // Validate proxy format
    const [host, port] = proxy.split(':');
    
    if (!host || !port) {
      throw new Error('Invalid proxy format');
    }

    // Validate IP format
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipPattern.test(host)) {
      throw new Error('Invalid proxy IP');
    }

    // Validate port
    const portNum = parseInt(port);
    if (portNum < 1 || portNum > 65535) {
      throw new Error('Invalid proxy port');
    }

    return proxy;
  }

  private async solveCaptcha(task: CaptchaTask): Promise<string> {
    // Implementation
    return '';
  }
}
```

---

## 8. Monitoring and Metrics

### 8.1 Comprehensive Metrics Collection

```typescript
import { Counter, Histogram, Gauge, register } from 'prom-client';

class BrowserlessMetrics {
  // Task metrics
  private tasksTotal: Counter;
  private tasksDuration: Histogram;
  private tasksErrors: Counter;

  // Resource metrics
  private activeBrowsers: Gauge;
  private memoryUsage: Gauge;

  // Performance metrics
  private navigationDuration: Histogram;
  private pageLoadDuration: Histogram;

  constructor() {
    this.tasksTotal = new Counter({
      name: 'browserless_tasks_total',
      help: 'Total number of tasks executed',
      labelNames: ['type', 'status']
    });

    this.tasksDuration = new Histogram({
      name: 'browserless_task_duration_seconds',
      help: 'Task execution duration',
      labelNames: ['type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    });

    this.tasksErrors = new Counter({
      name: 'browserless_task_errors_total',
      help: 'Total number of task errors',
      labelNames: ['type', 'error']
    });

    this.activeBrowsers = new Gauge({
      name: 'browserless_active_browsers',
      help: 'Number of active browser connections'
    });

    this.memoryUsage = new Gauge({
      name: 'browserless_memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type']
    });

    this.navigationDuration = new Histogram({
      name: 'browserless_navigation_duration_seconds',
      help: 'Page navigation duration',
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    });

    this.pageLoadDuration = new Histogram({
      name: 'browserless_page_load_duration_seconds',
      help: 'Page load duration',
      buckets: [0.5, 1, 2, 5, 10, 30]
    });
  }

  recordTaskStart(type: string): void {
    this.tasksTotal.inc({ type, status: 'started' });
  }

  recordTaskComplete(type: string, durationSeconds: number): void {
    this.tasksTotal.inc({ type, status: 'completed' });
    this.tasksDuration.observe({ type }, durationSeconds);
  }

  recordTaskError(type: string, error: string): void {
    this.tasksErrors.inc({ type, error });
  }

  setActiveBrowsers(count: number): void {
    this.activeBrowsers.set(count);
  }

  setMemoryUsage(type: string, bytes: number): void {
    this.memoryUsage.set({ type }, bytes);
  }

  recordNavigation(durationSeconds: number): void {
    this.navigationDuration.observe(durationSeconds);
  }

  recordPageLoad(durationSeconds: number): void {
    this.pageLoadDuration.observe(durationSeconds);
  }

  async getMetrics(): Promise<string> {
    return register.metrics();
  }
}

// Usage
const metrics = new BrowserlessMetrics();

async function monitoredSolveCaptcha(
  browser: puppeteer.Browser,
  task: CaptchaTask
): Promise<string> {
  const startTime = Date.now();
  metrics.recordTaskStart(task.type);

  try {
    const result = await solveCaptcha(browser, task);
    
    metrics.recordTaskComplete(
      task.type,
      (Date.now() - startTime) / 1000
    );
    
    return result;
  } catch (error) {
    metrics.recordTaskError(
      task.type,
      (error as Error).message
    );
    throw error;
  }
}
```

### 8.2 Health Checks and Probes

```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    latency?: number;
  }[];
  timestamp: number;
}

class HealthChecker {
  private wsEndpoint: string;
  private checks: Array<{
    name: string;
    check: () => Promise<{ status: 'pass' | 'fail' | 'warn'; message?: string }>;
  }> = [];

  constructor(wsEndpoint: string) {
    this.wsEndpoint = wsEndpoint;
    this.registerDefaultChecks();
  }

  private registerDefaultChecks(): void {
    // Browserless connectivity check
    this.checks.push({
      name: 'browserless_connectivity',
      check: async () => {
        const startTime = Date.now();
        try {
          const browser = await puppeteer.connect({
            browserWSEndpoint: this.wsEndpoint
          });
          await browser.disconnect();
          return {
            status: 'pass',
            message: `Connected in ${Date.now() - startTime}ms`
          };
        } catch (e) {
          return {
            status: 'fail',
            message: (e as Error).message
          };
        }
      }
    });

    // Page creation check
    this.checks.push({
      name: 'page_creation',
      check: async () => {
        try {
          const browser = await puppeteer.connect({
            browserWSEndpoint: this.wsEndpoint
          });
          const page = await browser.newPage();
          await page.close();
          await browser.disconnect();
          return { status: 'pass' };
        } catch (e) {
          return {
            status: 'fail',
            message: (e as Error).message
          };
        }
      }
    });

    // Navigation check
    this.checks.push({
      name: 'navigation',
      check: async () => {
        try {
          const browser = await puppeteer.connect({
            browserWSEndpoint: this.wsEndpoint
          });
          const page = await browser.newPage();
          await page.goto('about:blank');
          await browser.disconnect();
          return { status: 'pass' };
        } catch (e) {
          return {
            status: 'fail',
            message: (e as Error).message
          };
        }
      }
    });
  }

  async check(): Promise<HealthStatus> {
    const checks = await Promise.all(
      this.checks.map(async ({ name, check }) => {
        const startTime = Date.now();
        try {
          const result = await check();
          return {
            name,
            status: result.status,
            message: result.message,
            latency: Date.now() - startTime
          };
        } catch (e) {
          return {
            name,
            status: 'fail' as const,
            message: (e as Error).message,
            latency: Date.now() - startTime
          };
        }
      })
    );

    const failedChecks = checks.filter(c => c.status === 'fail');
    const warnChecks = checks.filter(c => c.status === 'warn');

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (failedChecks.length > 0) {
      status = 'unhealthy';
    } else if (warnChecks.length > 0) {
      status = 'degraded';
    }

    return {
      status,
      checks,
      timestamp: Date.now()
    };
  }
}
```

### 8.3 Logging and Tracing

```typescript
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

interface LogContext {
  taskId: string;
  sessionId?: string;
  browserId?: string;
  operation: string;
}

class StructuredLogger {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'browserless.log' })
      ]
    });
  }

  createContext(operation: string): LogContext {
    return {
      taskId: uuidv4(),
      operation
    };
  }

  log(level: string, message: string, context: LogContext, meta?: any): void {
    this.logger.log(level, message, {
      ...context,
      ...meta,
      service: '2captcha-worker',
      component: 'browserless'
    });
  }

  async withTracing<T>(
    context: LogContext,
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    this.log('info', `Starting: ${operation}`, context);

    try {
      const result = await fn();
      this.log('info', `Completed: ${operation}`, context, {
        duration: Date.now() - startTime,
        status: 'success'
      });
      return result;
    } catch (error) {
      this.log('error', `Failed: ${operation}`, context, {
        duration: Date.now() - startTime,
        status: 'error',
        error: (error as Error).message,
        stack: (error as Error).stack
      });
      throw error;
    }
  }
}

// Usage
const logger = new StructuredLogger();

async function solveCaptchaWithTracing(
  browser: puppeteer.Browser,
  task: CaptchaTask
): Promise<string> {
  const context = logger.createContext('solve_captcha');
  
  return logger.withTracing(context, 'captcha_solving', async () => {
    const page = await browser.newPage();
    // ... solve CAPTCHA ...
    return 'solution';
  });
}
```

---

## 9. Cost Management and Budgeting

### 9.1 Resource Cost Tracking

```typescript
interface CostBreakdown {
  browserHours: number;
  requests: number;
  bandwidthMB: number;
  computeUnits: number;
  estimatedCost: number;
}

class CostTracker {
  private usage = {
    browserHours: 0,
    requests: 0,
    bandwidthMB: 0,
    computeUnits: 0
  };

  private rates = {
    perBrowserHour: 0.10,
    perRequest: 0.001,
    perGB: 0.05,
    perComputeUnit: 0.01
  };

  private budget: number;
  private alerts: Array<{ threshold: number; triggered: boolean }> = [];

  constructor(budget: number) {
    this.budget = budget;
  }

  recordBrowserUsage(hours: number): void {
    this.usage.browserHours += hours;
    this.checkBudget();
  }

  recordRequest(): void {
    this.usage.requests++;
  }

  recordBandwidth(mb: number): void {
    this.usage.bandwidthMB += mb;
  }

  recordComputeUnits(units: number): void {
    this.usage.computeUnits += units;
  }

  getCurrentCost(): number {
    return (
      this.usage.browserHours * this.rates.perBrowserHour +
      this.usage.requests * this.rates.perRequest +
      (this.usage.bandwidthMB / 1024) * this.rates.perGB +
      this.usage.computeUnits * this.rates.perComputeUnit
    );
  }

  getBreakdown(): CostBreakdown {
    return {
      ...this.usage,
      estimatedCost: this.getCurrentCost()
    };
  }

  private checkBudget(): void {
    const currentCost = this.getCurrentCost();
    const percentage = (currentCost / this.budget) * 100;

    for (const alert of this.alerts) {
      if (percentage >= alert.threshold && !alert.triggered) {
        alert.triggered = true;
        this.triggerAlert(alert.threshold, currentCost);
      }
    }
  }

  private triggerAlert(threshold: number, currentCost: number): void {
    console.warn(
      `BUDGET ALERT: ${threshold}% of budget consumed ($${currentCost.toFixed(2)} / $${this.budget})`
    );
    // Send notification to monitoring system
  }

  setAlert(threshold: number): void {
    this.alerts.push({ threshold, triggered: false });
  }
}
```

### 9.2 Optimization Strategies

```typescript
class CostOptimizer {
  private costTracker: CostTracker;

  constructor(costTracker: CostTracker) {
    this.costTracker = costTracker;
  }

  async optimizeTaskExecution<T>(
    tasks: Array<() => Promise<T>>,
    options: {
      batchSize?: number;
      reuseBrowser?: boolean;
    } = {}
  ): Promise<T[]> {
    const results: T[] = [];
    const batchSize = options.batchSize || 5;

    if (options.reuseBrowser) {
      // Reuse single browser for multiple tasks
      const browser = await this.connectBrowser();
      try {
        for (let i = 0; i < tasks.length; i += batchSize) {
          const batch = tasks.slice(i, i + batchSize);
          const batchResults = await Promise.all(
            batch.map(task => task())
          );
          results.push(...batchResults);
        }
      } finally {
        await browser.disconnect();
      }
    } else {
      // Use separate browsers but limit concurrency
      for (let i = 0; i < tasks.length; i += batchSize) {
        const batch = tasks.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (task) => {
            const browser = await this.connectBrowser();
            try {
              return await task();
            } finally {
              await browser.disconnect();
            }
          })
        );
        results.push(...batchResults);
      }
    }

    return results;
  }

  private async connectBrowser(): Promise<puppeteer.Browser> {
    return puppeteer.connect({
      browserWSEndpoint: 'ws://browserless:3000'
    });
  }

  // Cache frequently accessed pages
  private pageCache = new Map<string, { page: puppeteer.Page; timestamp: number }>();
  private cacheTTL = 300000; // 5 minutes

  async getCachedPage(url: string): Promise<puppeteer.Page> {
    const cached = this.pageCache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.page;
    }

    // Create new page
    const browser = await this.connectBrowser();
    const page = await browser.newPage();
    await page.goto(url);

    this.pageCache.set(url, { page, timestamp: Date.now() });
    return page;
  }
}
```

---

## 10. Troubleshooting Common Issues

### 10.1 Connection Issues

#### Problem: WebSocket Connection Refused

**Symptoms:**
```
Error: connect ECONNREFUSED 127.0.0.1:3000
Error: WebSocket was closed before the connection was established
```

**Solutions:**

1. **Verify Browserless is running:**
```bash
docker ps | grep browserless
curl http://localhost:3000/json/version
```

2. **Check network connectivity:**
```typescript
// Test connection with timeout
async function testConnection(wsEndpoint: string): Promise<boolean> {
  return new Promise((resolve) => {
    const ws = new WebSocket(wsEndpoint);
    const timeout = setTimeout(() => {
      ws.close();
      resolve(false);
    }, 5000);

    ws.on('open', () => {
      clearTimeout(timeout);
      ws.close();
      resolve(true);
    });

    ws.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}
```

3. **Verify correct endpoint format:**
```typescript
// Correct
const wsEndpoint = 'ws://browserless:3000';

// Incorrect - missing protocol
const wsEndpoint = 'browserless:3000';

// Incorrect - using http instead of ws
const wsEndpoint = 'http://browserless:3000';
```

#### Problem: Connection Timeout

**Symptoms:**
```
Error: Navigation timeout of 30000 ms exceeded
Error: Waiting for selector timeout
```

**Solutions:**

1. **Increase timeout for slow pages:**
```typescript
await page.goto(url, {
  timeout: 60000, // Increase from default 30s
  waitUntil: 'networkidle2'
});
```

2. **Use wait conditions instead of fixed timeouts:**
```typescript
// Instead of
await page.waitForTimeout(5000);

// Use
await page.waitForSelector('.captcha-loaded', { timeout: 30000 });
await page.waitForFunction(() => {
  return document.querySelector('.captcha-container')?.textContent !== 'Loading...';
});
```

### 10.2 Memory Issues

#### Problem: High Memory Usage / OOM

**Symptoms:**
```
Error: Page crashed!
Error: Protocol error (Runtime.callFunctionOn): Target closed.
Container killed due to memory limit
```

**Solutions:**

1. **Implement page pooling:**
```typescript
class PagePool {
  private pages: puppeteer.Page[] = [];
  private maxPages = 5;

  async acquire(): Promise<puppeteer.Page> {
    if (this.pages.length > 0) {
      return this.pages.pop()!;
    }
    return await this.browser.newPage();
  }

  async release(page: puppeteer.Page): Promise<void> {
    if (this.pages.length < this.maxPages) {
      // Clear page state
      await page.goto('about:blank');
      this.pages.push(page);
    } else {
      await page.close();
    }
  }
}
```

2. **Regular cleanup:**
```typescript
async function cleanupPage(page: puppeteer.Page): Promise<void> {
  // Clear cookies
  const client = await page.target().createCDPSession();
  await client.send('Network.clearBrowserCookies');
  
  // Clear storage
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // Clear cache
  await client.send('Network.clearBrowserCache');
}
```

### 10.3 CAPTCHA-Specific Issues

#### Problem: CAPTCHA Not Loading

**Symptoms:**
- Page loads but CAPTCHA widget is blank
- "ERROR for site owner: Invalid site key"
- CAPTCHA iframe not found

**Solutions:**

1. **Wait for CAPTCHA to initialize:**
```typescript
async function waitForRecaptcha(page: puppeteer.Page): Promise<void> {
  await page.waitForFunction(() => {
    return typeof (window as any).grecaptcha !== 'undefined';
  }, { timeout: 10000 });

  await page.waitForFunction(() => {
    return (window as any).grecaptcha?.render !== undefined;
  }, { timeout: 10000 });
}
```

2. **Check for site key validity:**
```typescript
const siteKey = await page.evaluate(() => {
  const element = document.querySelector('.g-recaptcha');
  return element?.getAttribute('data-sitekey');
});

if (!siteKey) {
  throw new Error('CAPTCHA site key not found');
}
```

#### Problem: Detection / Blocking

**Symptoms:**
- "Please try again" messages
- CAPTCHA difficulty increases
- IP bans

**Solutions:**

1. **Use stealth plugins:**
```typescript
import puppeteer from 'puppeteer-core';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());
```

2. **Rotate user agents and fingerprints:**
```typescript
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36...',
  // ... more user agents
];

const randomUA = userAgents[Math.floor(Math.random() * userAgents.length)];
await page.setUserAgent(randomUA);
```

3. **Add delays between actions:**
```typescript
async function humanLikeDelay(min = 100, max = 500): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(resolve => setTimeout(resolve, delay));
}

await humanLikeDelay();
await page.click('#submit');
```

### 10.4 Debugging Techniques

#### Enable Verbose Logging

```typescript
const browser = await puppeteer.connect({
  browserWSEndpoint: 'ws://browserless:3000',
  slowMo: 250 // Slow down operations for debugging
});

const page = await browser.newPage();

// Log all console messages
page.on('console', msg => {
  console.log('PAGE LOG:', msg.type(), msg.text());
});

// Log all errors
page.on('pageerror', error => {
  console.error('PAGE ERROR:', error.message);
});

// Log all requests
page.on('request', request => {
  console.log('REQUEST:', request.method(), request.url());
});

// Log all responses
page.on('response', response => {
  console.log('RESPONSE:', response.status(), response.url());
});
```

#### Screenshot Debugging

```typescript
async function debugScreenshot(
  page: puppeteer.Page,
  name: string
): Promise<void> {
  await page.screenshot({
    path: `debug/${name}-${Date.now()}.png`,
    fullPage: true
  });
}

// Usage at key points
try {
  await page.goto(url);
  await debugScreenshot(page, 'after-navigation');
  
  await page.click('#captcha-checkbox');
  await debugScreenshot(page, 'after-click');
} catch (e) {
  await debugScreenshot(page, 'error-state');
  throw e;
}
```

#### CDP Session Debugging

```typescript
const client = await page.target().createCDPSession();

// Enable network debugging
await client.send('Network.enable');

client.on('Network.requestWillBeSent', (params) => {
  console.log('Network Request:', params.request.url);
});

client.on('Network.responseReceived', (params) => {
  console.log('Network Response:', params.response.url, params.response.status);
});
```

---

## Conclusion

This document provides comprehensive best practices for working with Browserless in the SIN-Solver 2Captcha Worker. Following these guidelines will ensure:

- **Reliability**: Robust error handling and auto-healing
- **Efficiency**: Optimal resource usage and cost management
- **Security**: Proper secret management and sandboxing
- **Scalability**: Effective concurrency and connection pooling
- **Observability**: Comprehensive monitoring and debugging

For additional support, refer to:
- [Browserless Documentation](https://docs.browserless.io/)
- [Puppeteer API Reference](https://pptr.dev/api/puppeteer.page)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)

---

## Document Information

- **Version**: 1.0
- **Last Updated**: 2026-01-31
- **Author**: SIN-Solver Team
- **Reviewers**: Architecture Team
- **Status**: Active

---

*End of Document*