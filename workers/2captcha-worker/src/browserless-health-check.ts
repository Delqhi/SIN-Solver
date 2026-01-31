import http from 'http';
import WebSocket from 'ws';

export interface HealthResult {
  status: 'healthy' | 'unhealthy';
  responseTime: number;
  error?: string;
  endpoint: string;
}

export interface HealthReport {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthResult[];
  timestamp: number;
  uptime: number;
  lastCheck: number;
}

export interface BrowserlessHealthCheckOptions {
  cdpUrl: string;
  debuggerUrl: string;
  timeout: number;
  maxHistorySize: number;
}

export class BrowserlessHealthCheck {
  private cdpUrl: string;
  private debuggerUrl: string;
  private timeout: number;
  private maxHistorySize: number;
  private healthHistory: HealthReport[] = [];
  private lastCheckTime = 0;
  private startTime: number;

  /**
   * Creates a new BrowserlessHealthCheck instance
   * @param cdpUrl - URL of the CDP endpoint (e.g., 'http://localhost:50072')
   * @param debuggerUrl - URL of the Debugger UI (e.g., 'http://localhost:50070')
   * @param timeout - Request timeout in milliseconds (default: 5000)
   * @param maxHistorySize - Maximum number of health reports to keep (default: 100)
   */
  constructor(
    cdpUrl: string,
    debuggerUrl: string,
    timeout: number = 5000,
    maxHistorySize: number = 100
  ) {
    this.cdpUrl = cdpUrl;
    this.debuggerUrl = debuggerUrl;
    this.timeout = timeout;
    this.maxHistorySize = maxHistorySize;
    this.startTime = Date.now();
  }

  /**
   * Checks the CDP endpoint availability
   * @returns Promise resolving to health check result
   */
  async checkCDP(): Promise<HealthResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeHTTPRequest(this.cdpUrl);
      const responseTime = Date.now() - startTime;
      
      return {
        status: response.statusCode === 200 ? 'healthy' : 'unhealthy',
        responseTime,
        endpoint: this.cdpUrl,
        error: response.statusCode !== 200 ? `HTTP ${response.statusCode}` : undefined,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        endpoint: this.cdpUrl,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Checks the Debugger UI availability
   * @returns Promise resolving to health check result
   */
  async checkDebugger(): Promise<HealthResult> {
    const startTime = Date.now();
    
    try {
      const response = await this.makeHTTPRequest(this.debuggerUrl);
      const responseTime = Date.now() - startTime;
      
      return {
        status: response.statusCode === 200 ? 'healthy' : 'unhealthy',
        responseTime,
        endpoint: this.debuggerUrl,
        error: response.statusCode !== 200 ? `HTTP ${response.statusCode}` : undefined,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        endpoint: this.debuggerUrl,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Tests WebSocket connectivity to the CDP endpoint
   * @returns Promise resolving to health check result
   */
  async checkWebSocket(): Promise<HealthResult> {
    const startTime = Date.now();
    const wsUrl = this.cdpUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({
          status: 'unhealthy',
          responseTime: this.timeout,
          endpoint: wsUrl,
          error: 'WebSocket connection timeout',
        });
      }, this.timeout);

      try {
        const ws = new WebSocket(wsUrl);
        
        ws.on('open', () => {
          clearTimeout(timeoutId);
          ws.close();
          resolve({
            status: 'healthy',
            responseTime: Date.now() - startTime,
            endpoint: wsUrl,
          });
        });
        
        ws.on('error', (error) => {
          clearTimeout(timeoutId);
          resolve({
            status: 'unhealthy',
            responseTime: Date.now() - startTime,
            endpoint: wsUrl,
            error: error.message,
          });
        });
      } catch (error) {
        clearTimeout(timeoutId);
        resolve({
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          endpoint: wsUrl,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  /**
   * Runs all health checks and returns a comprehensive report
   * @returns Promise resolving to health report
   */
  async getHealthReport(): Promise<HealthReport> {
    const [cdpResult, debuggerResult, wsResult] = await Promise.all([
      this.checkCDP(),
      this.checkDebugger(),
      this.checkWebSocket(),
    ]);

    const checks = [cdpResult, debuggerResult, wsResult];
    const healthyCount = checks.filter(c => c.status === 'healthy').length;
    
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === checks.length) {
      overall = 'healthy';
    } else if (healthyCount >= 1) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }

    const report: HealthReport = {
      overall,
      checks,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      lastCheck: this.lastCheckTime,
    };

    this.addToHistory(report);
    this.lastCheckTime = Date.now();

    return report;
  }

  /**
   * Returns the overall health status
   * @returns True if all checks are healthy, false otherwise
   */
  isHealthy(): boolean {
    const latestReport = this.getLatestReport();
    if (!latestReport) {
      return false;
    }
    return latestReport.overall === 'healthy';
  }

  /**
   * Gets the latest health report from history
   * @returns The most recent health report or undefined
   */
  getLatestReport(): HealthReport | undefined {
    return this.healthHistory[this.healthHistory.length - 1];
  }

  /**
   * Gets the full health check history
   * @returns Array of health reports
   */
  getHistory(): HealthReport[] {
    return [...this.healthHistory];
  }

  /**
   * Clears the health check history
   */
  clearHistory(): void {
    this.healthHistory = [];
  }

  /**
   * Gets the average response time across all endpoints
   * @returns Average response time in milliseconds
   */
  getAverageResponseTime(): number {
    const latestReport = this.getLatestReport();
    if (!latestReport || latestReport.checks.length === 0) {
      return 0;
    }
    
    const total = latestReport.checks.reduce((sum, check) => sum + check.responseTime, 0);
    return Math.round(total / latestReport.checks.length);
  }

  /**
   * Waits for the service to become healthy
   * @param maxWaitTime - Maximum time to wait in milliseconds
   * @param checkInterval - Interval between checks in milliseconds
   * @returns Promise resolving to true if healthy, false if timeout
   */
  async waitForHealthy(
    maxWaitTime: number = 60000,
    checkInterval: number = 5000
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const report = await this.getHealthReport();
      
      if (report.overall === 'healthy') {
        return true;
      }
      
      await this.delay(checkInterval);
    }
    
    return false;
  }

  private makeHTTPRequest(url: string): Promise<{ statusCode: number }> {
    return new Promise((resolve, reject) => {
      const req = http.get(url, { timeout: this.timeout }, (res) => {
        resolve({ statusCode: res.statusCode || 0 });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }

  private addToHistory(report: HealthReport): void {
    this.healthHistory.push(report);
    
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory.shift();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default BrowserlessHealthCheck;
