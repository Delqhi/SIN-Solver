import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';
import { WorkerConfig, Task, TaskResult, WebSocketMessage } from './types';

/**
 * 🛡️ PROXY MANAGER - Ban-Hammer Protection 2026
 * Each worker instance gets a dedicated proxy from the pool
 * to prevent IP-based rate limiting and bans.
 */
class ProxyManager {
  private proxies: string[];
  private currentIndex: number;
  private workerId: string;
  private proxyStats: Map<string, { success: number; fail: number; lastUsed: number }>;
  private logger: pino.Logger;

  constructor(workerId: string, logger: pino.Logger) {
    this.workerId = workerId;
    this.logger = logger;
    this.proxyStats = new Map();
    
    // Parse comma-separated proxy list from environment
    const proxyEnv = process.env.RESIDENTIAL_PROXIES || '';
    this.proxies = proxyEnv.split(',').map(p => p.trim()).filter(p => p.length > 0);
    
    // Each worker gets a deterministic starting index based on worker ID
    // This ensures workers don't all start with the same proxy
    this.currentIndex = this.hashWorkerId(workerId) % Math.max(1, this.proxies.length);
    
    if (this.proxies.length === 0) {
      this.logger.warn('⚠️ NO RESIDENTIAL_PROXIES configured! All requests use local IP - BAN RISK!');
    } else {
      this.logger.info({ 
        totalProxies: this.proxies.length, 
        startingIndex: this.currentIndex,
        workerId 
      }, '🛡️ Proxy pool initialized for worker');
    }
  }

  private hashWorkerId(id: string): number {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  getProxy(): string | null {
    if (this.proxies.length === 0) return null;
    return this.proxies[this.currentIndex];
  }

  rotate(): string | null {
    if (this.proxies.length === 0) return null;
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
    const newProxy = this.proxies[this.currentIndex];
    this.logger.info({ newProxyIndex: this.currentIndex }, '🔄 Rotated to next proxy');
    return newProxy;
  }

  recordResult(proxy: string, success: boolean): void {
    const stats = this.proxyStats.get(proxy) || { success: 0, fail: 0, lastUsed: 0 };
    if (success) {
      stats.success++;
    } else {
      stats.fail++;
      // Auto-rotate on consecutive failures
      if (stats.fail >= 3) {
        this.logger.warn({ proxy, fails: stats.fail }, '🔥 Proxy burned (3+ fails), rotating...');
        this.rotate();
        stats.fail = 0;
      }
    }
    stats.lastUsed = Date.now();
    this.proxyStats.set(proxy, stats);
  }

  createHttpAgent(): HttpProxyAgent<string> | null {
    const proxy = this.getProxy();
    if (!proxy) return null;
    return new HttpProxyAgent(proxy);
  }

  createHttpsAgent(): HttpsProxyAgent<string> | null {
    const proxy = this.getProxy();
    if (!proxy) return null;
    return new HttpsProxyAgent(proxy);
  }

  getProxyMetadata(): { proxy: string | null; index: number; total: number } {
    return {
      proxy: this.getProxy(),
      index: this.currentIndex,
      total: this.proxies.length
    };
  }
}

export class WorkerRuntime {
  private config: WorkerConfig;
  private workerId: string | null = null;
  private ws: WebSocket | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private pollTimer: NodeJS.Timeout | null = null;
  private api: AxiosInstance;
  private logger: pino.Logger;
  private isRunning = false;
  private currentTask: Task | null = null;
  private proxyManager: ProxyManager | null = null;

  constructor(config: WorkerConfig) {
    this.config = config;
    this.logger = pino({ level: process.env.LOG_LEVEL || 'info' });
    this.api = axios.create({
      baseURL: config.apiBrainUrl,
      timeout: 30000,
    });
  }

  async start(): Promise<void> {
    this.logger.info({ name: this.config.name, type: this.config.type }, 'Starting worker');
    
    await this.register();
    this.connectWebSocket();
    this.startHeartbeat();
    this.startPolling();
    this.isRunning = true;
    
    this.logger.info({ workerId: this.workerId }, 'Worker started successfully');
  }

  private async register(): Promise<void> {
    try {
      const response = await this.api.post('/api/workers', {
        name: this.config.name,
        type: this.config.type,
        capabilities: this.config.capabilities,
        metadata: { startedAt: new Date().toISOString() },
      });
      this.workerId = response.data.id;
      this.logger.info({ workerId: this.workerId }, 'Worker registered');
    } catch (err) {
      this.logger.error({ err }, 'Failed to register worker');
      throw err;
    }
  }

  private connectWebSocket(): void {
    const wsUrl = this.config.apiBrainUrl.replace('http', 'ws') + '/ws';
    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      this.logger.info('WebSocket connected');
    });

    this.ws.on('message', (data) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (err) {
        this.logger.error({ err }, 'Failed to parse WebSocket message');
      }
    });

    this.ws.on('close', () => {
      this.logger.warn('WebSocket disconnected, reconnecting...');
      setTimeout(() => this.connectWebSocket(), 5000);
    });

    this.ws.on('error', (err) => {
      this.logger.error({ err }, 'WebSocket error');
    });
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'task:created':
        this.logger.debug({ task: message.data }, 'New task available');
        break;
      case 'worker:ping':
        this.sendHeartbeat();
        break;
      default:
        this.logger.debug({ type: message.type }, 'Unknown message type');
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }

  private sendHeartbeat(): void {
    if (this.ws?.readyState === WebSocket.OPEN && this.workerId) {
      this.ws.send(JSON.stringify({ type: 'heartbeat', workerId: this.workerId }));
    }
    
    if (this.workerId) {
      this.api.post(`/api/workers/${this.workerId}/heartbeat`).catch((err) => {
        this.logger.error({ err }, 'Heartbeat failed');
      });
    }
  }

  private startPolling(): void {
    this.pollTimer = setInterval(async () => {
      if (!this.currentTask) {
        await this.pollForTasks();
      }
    }, 5000);
  }

  private async pollForTasks(): Promise<void> {
    try {
      const response = await this.api.get('/api/tasks', {
        params: { status: 'pending', limit: 1 },
      });

      const tasks = response.data as Task[];
      if (tasks.length > 0) {
        const task = tasks[0];
        if (this.canHandle(task)) {
          await this.claimAndExecute(task);
        }
      }
    } catch (err) {
      this.logger.error({ err }, 'Failed to poll for tasks');
    }
  }

  private canHandle(task: Task): boolean {
    const typeCapabilities: Record<string, string[]> = {
      'captcha': ['captcha-solve', 'image-captcha', 'recaptcha', 'hcaptcha'],
      'scraper': ['web-scrape', 'data-extract', 'screenshot'],
      'form-filler': ['form-fill', 'form-submit'],
      'ai-sales': ['lead-gen', 'website-gen', 'email-outreach'],
      'general': ['*'],
    };

    const capabilities = typeCapabilities[this.config.type] || [];
    return capabilities.includes('*') || capabilities.includes(task.type);
  }

  private async claimAndExecute(task: Task): Promise<void> {
    try {
      const claimResponse = await this.api.post(`/api/tasks/${task.id}/claim`, {
        worker_id: this.workerId,
      });

      if (claimResponse.status === 200) {
        this.currentTask = claimResponse.data;
        this.logger.info({ taskId: task.id, type: task.type }, 'Task claimed');

        await this.api.put(`/api/workers/${this.workerId}`, { status: 'busy' });

        const result = await this.executeTask(this.currentTask!);

        if (result.success) {
          await this.api.post(`/api/tasks/${task.id}/complete`, { result: result.data });
          this.logger.info({ taskId: task.id, duration: result.duration }, 'Task completed');
        } else {
          await this.api.post(`/api/tasks/${task.id}/fail`, { error: result.error });
          this.logger.error({ taskId: task.id, error: result.error }, 'Task failed');
        }

        await this.api.put(`/api/workers/${this.workerId}`, { status: 'online' });
        this.currentTask = null;
      }
    } catch (err) {
      this.logger.error({ err, taskId: task.id }, 'Failed to claim/execute task');
      this.currentTask = null;
    }
  }

  private async executeTask(task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    
    try {
      let data: Record<string, unknown>;

      switch (task.type) {
        case 'captcha-solve':
          data = await this.executeCaptcha(task.payload);
          break;
        case 'web-scrape':
          data = await this.executeScrape(task.payload);
          break;
        case 'form-fill':
          data = await this.executeFormFill(task.payload);
          break;
        default:
          data = await this.executeGeneric(task.payload);
      }

      return { success: true, data, duration: Date.now() - startTime };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error, duration: Date.now() - startTime };
    }
  }

  private async executeCaptcha(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.logger.info({ payload }, 'Executing CAPTCHA task');
    await this.delay(2000);
    return { solution: 'simulated-captcha-solution', confidence: 0.95 };
  }

  private async executeScrape(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { url, selector } = payload as { url: string; selector?: string };
    this.logger.info({ url, selector }, 'Executing scrape task');
    
    const response = await axios.get(url as string, { timeout: 30000 });
    return { 
      status: response.status,
      contentLength: response.data.length,
      scraped: true 
    };
  }

  private async executeFormFill(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.logger.info({ payload }, 'Executing form fill task');
    await this.delay(1500);
    return { filled: true, fields: Object.keys(payload).length };
  }

  private async executeGeneric(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.logger.info({ payload }, 'Executing generic task');
    await this.delay(1000);
    return { processed: true, payload };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping worker');
    this.isRunning = false;

    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.ws) this.ws.close();

    if (this.workerId) {
      try {
        await this.api.put(`/api/workers/${this.workerId}`, { status: 'offline' });
      } catch (err) {
        this.logger.error({ err }, 'Failed to update worker status');
      }
    }

    this.logger.info('Worker stopped');
  }
}
