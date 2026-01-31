/**
 * Auto-Healing CDP Connection Manager for Browserless
 * Implements retry logic, health checks, and automatic recovery
 */

import WebSocket from 'ws';
import fetch from 'node-fetch';
import { EventEmitter } from 'events';

interface CDPConnectionConfig {
  httpUrl: string;
  token: string;
  maxRetries?: number;
  retryDelay?: number;
  healthCheckInterval?: number;
  connectionTimeout?: number;
}

interface CDPConnectionState {
  isConnected: boolean;
  isHealthy: boolean;
  lastActivity: number;
  retryCount: number;
  targetId: string | null;
  sessionId: string | null;
}

export class AutoHealingCDPManager extends EventEmitter {
  private config: Required<CDPConnectionConfig>;
  private state: CDPConnectionState;
  private browserWs: WebSocket | null = null;
  private targetWs: WebSocket | null = null;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private messageQueue: Array<{ id: number; method: string; params?: any }> = [];
  private messageId = 0;

  constructor(config: CDPConnectionConfig) {
    super();
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      healthCheckInterval: 30000,
      connectionTimeout: 15000,
      ...config
    };
    this.state = {
      isConnected: false,
      isHealthy: false,
      lastActivity: Date.now(),
      retryCount: 0,
      targetId: null,
      sessionId: null
    };
  }

  /**
   * Initialize connection with auto-healing
   */
  async connect(): Promise<boolean> {
    try {
      this.emit('connecting');
      console.log('🔌 [AutoHealingCDP] Initializing connection...');

      const success = await this.establishConnection();
      
      if (success) {
        this.state.isConnected = true;
        this.state.isHealthy = true;
        this.state.retryCount = 0;
        this.startHealthChecks();
        this.emit('connected');
        console.log('✅ [AutoHealingCDP] Connection established');
        return true;
      }
    } catch (error) {
      console.error('❌ [AutoHealingCDP] Connection failed:', error);
      this.emit('error', error);
    }

    // Attempt retry if configured
    if (this.state.retryCount < this.config.maxRetries) {
      return this.retryConnection();
    }

    return false;
  }

  /**
   * Establish two-level WebSocket connection
   */
  private async establishConnection(): Promise<boolean> {
    // Step 1: Verify HTTP endpoint
    const versionRes = await fetch(
      `${this.config.httpUrl}/json/version?token=${this.config.token}`
    );
    
    if (!versionRes.ok) {
      throw new Error(`HTTP endpoint not available: ${versionRes.status}`);
    }

    const version = await versionRes.json() as any;
    console.log(`✅ [AutoHealingCDP] Browser: ${version.Browser}`);

    // Step 2: Connect to browser WebSocket
    const browserWsUrl = version.webSocketDebuggerUrl
      .replace('0.0.0.0:3000', '127.0.0.1:50072')
      + `?token=${this.config.token}`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Browser connection timeout'));
      }, this.config.connectionTimeout);

      this.browserWs = new WebSocket(browserWsUrl);

      this.browserWs.on('open', () => {
        clearTimeout(timeout);
        console.log('✅ [AutoHealingCDP] Browser WebSocket connected');
        
        // Create target
        this.browserWs!.send(JSON.stringify({
          id: 1,
          method: 'Target.createTarget',
          params: { url: 'about:blank' }
        }));
      });

      this.browserWs.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        
        if (msg.id === 1 && msg.result?.targetId) {
          this.state.targetId = msg.result.targetId;
          console.log(`✅ [AutoHealingCDP] Target created: ${this.state.targetId}`);
          
          // Connect to target WebSocket
          this.connectToTarget(this.state.targetId)
            .then(() => resolve(true))
            .catch(reject);
        }
      });

      this.browserWs.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      this.browserWs.on('close', () => {
        this.handleDisconnect();
      });
    });
  }

  /**
   * Connect to target-level WebSocket
   */
  private async connectToTarget(targetId: string): Promise<void> {
    const targetWsUrl = `${this.config.httpUrl.replace('http', 'ws')}/devtools/page/${targetId}?token=${this.config.token}`;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Target connection timeout'));
      }, this.config.connectionTimeout);

      this.targetWs = new WebSocket(targetWsUrl);

      this.targetWs.on('open', () => {
        clearTimeout(timeout);
        console.log('✅ [AutoHealingCDP] Target WebSocket connected');
        
        // Enable CDP domains
        this.targetWs!.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        this.targetWs!.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
        this.targetWs!.send(JSON.stringify({ id: 3, method: 'DOM.enable' }));
        
        this.state.lastActivity = Date.now();
        resolve();
      });

      this.targetWs.on('message', (data) => {
        this.state.lastActivity = Date.now();
        this.emit('message', JSON.parse(data.toString()));
      });

      this.targetWs.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      this.targetWs.on('close', () => {
        this.handleDisconnect();
      });
    });
  }

  /**
   * Retry connection with exponential backoff
   */
  private async retryConnection(): Promise<boolean> {
    this.state.retryCount++;
    const delay = this.config.retryDelay * Math.pow(2, this.state.retryCount - 1);
    
    console.log(`🔄 [AutoHealingCDP] Retrying connection (${this.state.retryCount}/${this.config.maxRetries}) in ${delay}ms...`);
    this.emit('retrying', { attempt: this.state.retryCount, delay });

    return new Promise((resolve) => {
      this.reconnectTimer = setTimeout(async () => {
        try {
          await this.disconnect();
          const success = await this.connect();
          resolve(success);
        } catch (error) {
          console.error('❌ [AutoHealingCDP] Retry failed:', error);
          resolve(false);
        }
      }, delay);
    });
  }

  /**
   * Handle unexpected disconnect
   */
  private handleDisconnect(): void {
    if (!this.state.isConnected) return;

    console.log('⚠️ [AutoHealingCDP] Connection lost');
    this.state.isConnected = false;
    this.state.isHealthy = false;
    this.emit('disconnected');

    // Attempt auto-healing
    if (this.state.retryCount < this.config.maxRetries) {
      this.retryConnection();
    } else {
      console.error('❌ [AutoHealingCDP] Max retries exceeded');
      this.emit('failed');
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      const isHealthy = await this.performHealthCheck();
      
      if (!isHealthy && this.state.isHealthy) {
        console.log('⚠️ [AutoHealingCDP] Health check failed');
        this.state.isHealthy = false;
        this.emit('unhealthy');
        
        // Trigger healing
        this.handleDisconnect();
      } else if (isHealthy && !this.state.isHealthy) {
        console.log('✅ [AutoHealingCDP] Health check passed');
        this.state.isHealthy = true;
        this.emit('healthy');
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<boolean> {
    if (!this.targetWs || this.targetWs.readyState !== WebSocket.OPEN) {
      return false;
    }

    // Check if connection is stale (no activity for 60 seconds)
    const staleThreshold = 60000;
    if (Date.now() - this.state.lastActivity > staleThreshold) {
      console.log('⚠️ [AutoHealingCDP] Connection appears stale');
      return false;
    }

    return true;
  }

  /**
   * Send CDP command with auto-retry
   */
  async sendCommand(method: string, params?: any): Promise<any> {
    if (!this.state.isConnected || !this.targetWs) {
      throw new Error('Not connected');
    }

    const id = ++this.messageId;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Command timeout: ${method}`));
      }, 10000);

      const handler = (data: any) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === id) {
          clearTimeout(timeout);
          this.targetWs!.off('message', handler);
          
          if (msg.error) {
            reject(new Error(msg.error.message));
          } else {
            resolve(msg.result);
          }
        }
      };

      this.targetWs!.on('message', handler);
      this.targetWs!.send(JSON.stringify({ id, method, params }));
    });
  }

  /**
   * Navigate to URL with healing
   */
  async navigate(url: string): Promise<void> {
    try {
      await this.sendCommand('Page.navigate', { url });
      
      // Wait for load event
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Navigation timeout'));
        }, 30000);

        const handler = (data: any) => {
          const msg = JSON.parse(data.toString());
          if (msg.method === 'Page.loadEventFired') {
            clearTimeout(timeout);
            this.targetWs!.off('message', handler);
            resolve(true);
          }
        };

        this.targetWs!.on('message', handler);
      });
    } catch (error) {
      console.error('❌ [AutoHealingCDP] Navigation failed:', error);
      
      // Try to heal
      if (this.state.retryCount < this.config.maxRetries) {
        console.log('🔄 [AutoHealingCDP] Attempting to heal...');
        await this.retryConnection();
        // Retry navigation
        return this.navigate(url);
      }
      
      throw error;
    }
  }

  /**
   * Get connection state
   */
  getState(): CDPConnectionState {
    return { ...this.state };
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect(): Promise<void> {
    console.log('🔌 [AutoHealingCDP] Disconnecting...');

    // Stop timers
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Close WebSockets
    if (this.targetWs) {
      this.targetWs.close();
      this.targetWs = null;
    }

    if (this.browserWs) {
      this.browserWs.close();
      this.browserWs = null;
    }

    this.state.isConnected = false;
    this.state.isHealthy = false;
    this.state.targetId = null;
    this.state.sessionId = null;

    this.emit('disconnected');
    console.log('✅ [AutoHealingCDP] Disconnected');
  }
}

export default AutoHealingCDPManager;
