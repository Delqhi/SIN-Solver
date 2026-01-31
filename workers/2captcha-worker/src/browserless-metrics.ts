import * as fs from 'fs';
import * as path from 'path';

export interface MetricsOptions {
  persistToDisk?: boolean;
  persistIntervalMs?: number;
  dataDir?: string;
  maxHistorySize?: number;
}

export interface ConnectionMetrics {
  total: number;
  successful: number;
  failed: number;
  active: number;
  lastConnectionTime?: number;
}

export interface RequestMetrics {
  count: number;
  durations: number[];
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  byCommand: Record<string, { count: number; avgDuration: number }>;
}

export interface ErrorMetrics {
  total: number;
  byType: Record<string, number>;
  byContext: Record<string, number>;
  recent: Array<{ timestamp: number; message: string; context: string }>;
}

export interface PerformanceMetrics {
  pageLoads: {
    count: number;
    durations: number[];
    avg: number;
    min: number;
    max: number;
  };
  screenshots: {
    count: number;
    durations: number[];
    avg: number;
    min: number;
    max: number;
  };
  memoryUsage?: {
    used: number;
    total: number;
    timestamp: number;
  };
}

export interface WebSocketMetrics {
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
  reconnections: number;
}

export interface MetricsReport {
  timestamp: number;
  uptime: number;
  connections: ConnectionMetrics;
  requests: RequestMetrics;
  errors: ErrorMetrics;
  performance: PerformanceMetrics;
  websocket: WebSocketMetrics;
}

export class BrowserlessMetrics {
  private options: Required<MetricsOptions>;
  private startTime: number;
  private persistTimer: NodeJS.Timeout | null = null;
  private lock = false;

  private connections: ConnectionMetrics = {
    total: 0,
    successful: 0,
    failed: 0,
    active: 0,
  };

  private requests: RequestMetrics = {
    count: 0,
    durations: [],
    min: 0,
    max: 0,
    avg: 0,
    p50: 0,
    p95: 0,
    p99: 0,
    byCommand: {},
  };

  private errors: ErrorMetrics = {
    total: 0,
    byType: {},
    byContext: {},
    recent: [],
  };

  private performance: PerformanceMetrics = {
    pageLoads: {
      count: 0,
      durations: [],
      avg: 0,
      min: 0,
      max: 0,
    },
    screenshots: {
      count: 0,
      durations: [],
      avg: 0,
      min: 0,
      max: 0,
    },
  };

  private websocket: WebSocketMetrics = {
    messagesSent: 0,
    messagesReceived: 0,
    bytesSent: 0,
    bytesReceived: 0,
    reconnections: 0,
  };

  /**
   * Creates a new BrowserlessMetrics instance
   * @param options - Configuration options for metrics collection
   */
  constructor(options: MetricsOptions = {}) {
    this.options = {
      persistToDisk: options.persistToDisk ?? false,
      persistIntervalMs: options.persistIntervalMs ?? 60000,
      dataDir: options.dataDir ?? './metrics-data',
      maxHistorySize: options.maxHistorySize ?? 1000,
    };

    this.startTime = Date.now();

    if (this.options.persistToDisk) {
      this.initializePersistence();
    }
  }

  /**
   * Records a connection attempt
   * @param success - Whether the connection was successful
   */
  async recordConnection(success: boolean): Promise<void> {
    await this.withLock(async () => {
      this.connections.total++;
      this.connections.lastConnectionTime = Date.now();

      if (success) {
        this.connections.successful++;
        this.connections.active++;
      } else {
        this.connections.failed++;
      }
    });
  }

  /**
   * Records a disconnection
   */
  async recordDisconnection(): Promise<void> {
    await this.withLock(async () => {
      this.connections.active = Math.max(0, this.connections.active - 1);
    });
  }

  /**
   * Records request metrics
   * @param duration - Request duration in milliseconds
   * @param command - The CDP command that was executed
   */
  async recordRequest(duration: number, command: string): Promise<void> {
    await this.withLock(async () => {
      this.requests.count++;
      this.requests.durations.push(duration);

      if (this.requests.durations.length > this.options.maxHistorySize) {
        this.requests.durations.shift();
      }

      this.updateRequestStats();

      if (!this.requests.byCommand[command]) {
        this.requests.byCommand[command] = { count: 0, avgDuration: 0 };
      }

      const cmd = this.requests.byCommand[command];
      cmd.avgDuration = (cmd.avgDuration * cmd.count + duration) / (cmd.count + 1);
      cmd.count++;
    });
  }

  /**
   * Records an error
   * @param error - The error that occurred
   * @param context - The context in which the error occurred
   */
  async recordError(error: Error, context: string): Promise<void> {
    await this.withLock(async () => {
      this.errors.total++;

      const errorType = error.name || 'UnknownError';
      this.errors.byType[errorType] = (this.errors.byType[errorType] || 0) + 1;
      this.errors.byContext[context] = (this.errors.byContext[context] || 0) + 1;

      this.errors.recent.push({
        timestamp: Date.now(),
        message: error.message,
        context,
      });

      if (this.errors.recent.length > 100) {
        this.errors.recent.shift();
      }
    });
  }

  /**
   * Records page load time
   * @param duration - Page load duration in milliseconds
   */
  async recordPageLoad(duration: number): Promise<void> {
    await this.withLock(async () => {
      const pl = this.performance.pageLoads;
      pl.count++;
      pl.durations.push(duration);

      if (pl.durations.length > this.options.maxHistorySize) {
        pl.durations.shift();
      }

      pl.min = pl.durations.length > 0 ? Math.min(...pl.durations) : 0;
      pl.max = pl.durations.length > 0 ? Math.max(...pl.durations) : 0;
      pl.avg = pl.durations.length > 0
        ? pl.durations.reduce((a, b) => a + b, 0) / pl.durations.length
        : 0;
    });
  }

  /**
   * Records screenshot capture time
   * @param duration - Screenshot capture duration in milliseconds
   */
  async recordScreenshot(duration: number): Promise<void> {
    await this.withLock(async () => {
      const ss = this.performance.screenshots;
      ss.count++;
      ss.durations.push(duration);

      if (ss.durations.length > this.options.maxHistorySize) {
        ss.durations.shift();
      }

      ss.min = ss.durations.length > 0 ? Math.min(...ss.durations) : 0;
      ss.max = ss.durations.length > 0 ? Math.max(...ss.durations) : 0;
      ss.avg = ss.durations.length > 0
        ? ss.durations.reduce((a, b) => a + b, 0) / ss.durations.length
        : 0;
    });
  }

  /**
   * Records memory usage
   * @param used - Used memory in bytes
   * @param total - Total memory in bytes
   */
  async recordMemoryUsage(used: number, total: number): Promise<void> {
    await this.withLock(async () => {
      this.performance.memoryUsage = {
        used,
        total,
        timestamp: Date.now(),
      };
    });
  }

  /**
   * Records WebSocket message metrics
   * @param sent - Whether the message was sent (true) or received (false)
   * @param bytes - Size of the message in bytes
   */
  async recordWebSocketMessage(sent: boolean, bytes: number): Promise<void> {
    await this.withLock(async () => {
      if (sent) {
        this.websocket.messagesSent++;
        this.websocket.bytesSent += bytes;
      } else {
        this.websocket.messagesReceived++;
        this.websocket.bytesReceived += bytes;
      }
    });
  }

  /**
   * Records a WebSocket reconnection
   */
  async recordReconnection(): Promise<void> {
    await this.withLock(async () => {
      this.websocket.reconnections++;
    });
  }

  /**
   * Gets a comprehensive metrics report
   * @returns Complete metrics report
   */
  async getMetrics(): Promise<MetricsReport> {
    return this.withLock(async () => {
      return {
        timestamp: Date.now(),
        uptime: Date.now() - this.startTime,
        connections: { ...this.connections },
        requests: { ...this.requests, durations: [...this.requests.durations] },
        errors: {
          ...this.errors,
          byType: { ...this.errors.byType },
          byContext: { ...this.errors.byContext },
          recent: [...this.errors.recent],
        },
        performance: {
          pageLoads: {
            ...this.performance.pageLoads,
            durations: [...this.performance.pageLoads.durations],
          },
          screenshots: {
            ...this.performance.screenshots,
            durations: [...this.performance.screenshots.durations],
          },
          memoryUsage: this.performance.memoryUsage
            ? { ...this.performance.memoryUsage }
            : undefined,
        },
        websocket: { ...this.websocket },
      };
    });
  }

  /**
   * Resets all metrics to initial state
   */
  async reset(): Promise<void> {
    await this.withLock(async () => {
      this.connections = {
        total: 0,
        successful: 0,
        failed: 0,
        active: 0,
      };

      this.requests = {
        count: 0,
        durations: [],
        min: 0,
        max: 0,
        avg: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        byCommand: {},
      };

      this.errors = {
        total: 0,
        byType: {},
        byContext: {},
        recent: [],
      };

      this.performance = {
        pageLoads: {
          count: 0,
          durations: [],
          avg: 0,
          min: 0,
          max: 0,
        },
        screenshots: {
          count: 0,
          durations: [],
          avg: 0,
          min: 0,
          max: 0,
        },
      };

      this.websocket = {
        messagesSent: 0,
        messagesReceived: 0,
        bytesSent: 0,
        bytesReceived: 0,
        reconnections: 0,
      };

      this.startTime = Date.now();
    });
  }

  /**
   * Exports metrics as JSON string
   * @returns JSON string representation of metrics
   */
  async exportToJSON(): Promise<string> {
    const metrics = await this.getMetrics();
    return JSON.stringify(metrics, null, 2);
  }

  /**
   * Stops the metrics collector and persistence
   */
  stop(): void {
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
      this.persistTimer = null;
    }
  }

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    while (this.lock) {
      await this.delay(1);
    }

    this.lock = true;
    try {
      return await fn();
    } finally {
      this.lock = false;
    }
  }

  private updateRequestStats(): void {
    const durations = this.requests.durations;
    const sorted = [...durations].sort((a, b) => a - b);

    this.requests.min = sorted.length > 0 ? sorted[0] : 0;
    this.requests.max = sorted.length > 0 ? sorted[sorted.length - 1] : 0;
    this.requests.avg = sorted.length > 0
      ? sorted.reduce((a, b) => a + b, 0) / sorted.length
      : 0;

    this.requests.p50 = this.calculatePercentile(sorted, 50);
    this.requests.p95 = this.calculatePercentile(sorted, 95);
    this.requests.p99 = this.calculatePercentile(sorted, 99);
  }

  private calculatePercentile(sorted: number[], percentile: number): number {
    if (sorted.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private initializePersistence(): void {
    if (!fs.existsSync(this.options.dataDir)) {
      fs.mkdirSync(this.options.dataDir, { recursive: true });
    }

    this.persistTimer = setInterval(async () => {
      try {
        const metrics = await this.getMetrics();
        const filePath = path.join(
          this.options.dataDir,
          `metrics-${Date.now()}.json`
        );
        fs.writeFileSync(filePath, JSON.stringify(metrics, null, 2));

        this.cleanupOldMetrics();
      } catch (error) {
        console.error('Failed to persist metrics:', error);
      }
    }, this.options.persistIntervalMs);
  }

  private cleanupOldMetrics(): void {
    const files = fs
      .readdirSync(this.options.dataDir)
      .filter((f) => f.startsWith('metrics-') && f.endsWith('.json'))
      .map((f) => ({
        name: f,
        path: path.join(this.options.dataDir, f),
        stats: fs.statSync(path.join(this.options.dataDir, f)),
      }))
      .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

    const maxFiles = 24; // Keep last 24 hours of metrics
    if (files.length > maxFiles) {
      files.slice(maxFiles).forEach((file) => {
        try {
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error(`Failed to delete old metrics file ${file.name}:`, error);
        }
      });
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default BrowserlessMetrics;
