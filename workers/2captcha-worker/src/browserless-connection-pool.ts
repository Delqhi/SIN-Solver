import { chromium, Browser } from 'playwright';
import { EventEmitter } from 'events';
import { BrowserlessRegionManager, Region, RegionManagerOptions } from './browserless-region-manager';

export interface ConnectionPoolOptions {
  minIdle?: number;
  maxTotal?: number;
  idleTimeoutMs?: number;
  maxLifetimeMs?: number;
  acquireTimeoutMs?: number;
  healthCheckIntervalMs?: number;
  /** Enable multi-region support with automatic failover */
  enableRegionManager?: boolean;
  /** Initial regions for region manager */
  regions?: Region[];
  /** Region manager configuration */
  regionManagerOptions?: RegionManagerOptions;
}

export interface PooledConnection {
  id: string;
  browser: Browser;
  createdAt: number;
  lastUsedAt: number;
  inUse: boolean;
  healthy: boolean;
}

export interface PoolMetrics {
  totalConnections: number;
  idleConnections: number;
  inUseConnections: number;
  pendingAcquires: number;
  totalAcquires: number;
  totalReleases: number;
  totalErrors: number;
}

export class BrowserlessConnectionPool extends EventEmitter {
  private connections: Map<string, PooledConnection> = new Map();
  private pendingAcquires: Array<{ resolve: (conn: PooledConnection) => void; reject: (err: Error) => void; timeout: NodeJS.Timeout }> = [];
  private options: Required<ConnectionPoolOptions> & { enableRegionManager?: boolean; regions?: Region[]; regionManagerOptions?: RegionManagerOptions };
  private endpoint: string;
  private maintenanceTimer: NodeJS.Timeout | null = null;
  private regionManager: BrowserlessRegionManager | null = null;
  
  private metrics = {
    totalAcquires: 0,
    totalReleases: 0,
    totalErrors: 0
  };

  constructor(endpoint: string, options: ConnectionPoolOptions = {}) {
    super();
    this.endpoint = endpoint;
    this.options = {
      minIdle: options.minIdle ?? 2,
      maxTotal: options.maxTotal ?? 10,
      idleTimeoutMs: options.idleTimeoutMs ?? 300000,
      maxLifetimeMs: options.maxLifetimeMs ?? 1800000,
      acquireTimeoutMs: options.acquireTimeoutMs ?? 30000,
      healthCheckIntervalMs: options.healthCheckIntervalMs ?? 60000,
      enableRegionManager: options.enableRegionManager,
      regions: options.regions,
      regionManagerOptions: options.regionManagerOptions,
    };

    if (options.enableRegionManager && options.regions && options.regions.length > 0) {
      this.regionManager = new BrowserlessRegionManager(options.regions, options.regionManagerOptions);
      this.regionManager.startPeriodicUpdates();
      this.setupRegionEventHandlers();
    }

    this.startMaintenance();
    this.ensureMinIdle();
  }

  private setupRegionEventHandlers(): void {
    if (!this.regionManager) return;

    this.regionManager.on('regionDown', (data: { regionId: string }) => {
      this.emit('regionDown', data);
      this.destroyConnectionsToRegion(data.regionId);
    });

    this.regionManager.on('regionUp', (data: { regionId: string }) => {
      this.emit('regionUp', data);
    });

    this.regionManager.on('regionChanged', (data: { oldRegion: string | null; newRegion: string }) => {
      this.emit('regionChanged', data);
    });

    this.regionManager.on('allRegionsDown', () => {
      this.emit('allRegionsDown');
    });
  }

  private async destroyConnectionsToRegion(regionId: string): Promise<void> {
    const region = this.options.regions?.find(r => r.id === regionId);
    if (!region) return;

    for (const [id, conn] of this.connections.entries()) {
      if (!conn.inUse && !(await this.isConnectionHealthy(conn))) {
        await this.destroyConnection(id);
      }
    }
  }

  private getBestEndpoint(): string {
    if (this.regionManager) {
      const bestRegion = this.regionManager.getBestRegion();
      if (bestRegion) {
        return bestRegion.endpoint;
      }
      const healthyRegion = this.regionManager.getHealthyRegion();
      if (healthyRegion) {
        return healthyRegion.endpoint;
      }
    }
    return this.endpoint;
  }

  /**
   * Get status of all regions (if RegionManager is enabled)
   */
  getRegionStatus(): Array<{ regionId: string; latencyMs: number; healthy: boolean; consecutiveFailures: number }> {
    if (!this.regionManager) {
      return [];
    }
    return this.regionManager.getRegionStatus();
  }

  /**
   * Check if RegionManager is enabled
   */
  isRegionManagerEnabled(): boolean {
    return this.regionManager !== null;
  }

  /**
   * Get the current best region info (if RegionManager is enabled)
   */
  getCurrentRegion(): Region | null {
    if (!this.regionManager) return null;
    return this.regionManager.getBestRegion();
  }

  async acquire(): Promise<PooledConnection> {
    for (const conn of this.connections.values()) {
      if (!conn.inUse && conn.healthy) {
        if (await this.isConnectionHealthy(conn)) {
          conn.inUse = true;
          conn.lastUsedAt = Date.now();
          this.metrics.totalAcquires++;
          return conn;
        } else {
          await this.destroyConnection(conn.id);
        }
      }
    }

    if (this.connections.size < this.options.maxTotal) {
      try {
        const conn = await this.createConnection();
        conn.inUse = true;
        this.metrics.totalAcquires++;
        return conn;
      } catch (error) {
        this.metrics.totalErrors++;
        throw error;
      }
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.pendingAcquires.findIndex(p => p.timeout === timeout);
        if (index !== -1) {
          this.pendingAcquires.splice(index, 1);
          this.metrics.totalErrors++;
          reject(new Error('Timeout acquiring connection from pool'));
        }
      }, this.options.acquireTimeoutMs);

      this.pendingAcquires.push({ resolve, reject, timeout });
    });
  }

  async release(connectionId: string): Promise<void> {
    const conn = this.connections.get(connectionId);
    if (!conn) return;

    conn.inUse = false;
    conn.lastUsedAt = Date.now();
    this.metrics.totalReleases++;

    if (this.pendingAcquires.length > 0) {
      const pending = this.pendingAcquires.shift();
      if (pending) {
        clearTimeout(pending.timeout);
        conn.inUse = true;
        pending.resolve(conn);
        return;
      }
    }

    const idleCount = Array.from(this.connections.values()).filter(c => !c.inUse).length;
    if (idleCount > this.options.minIdle) {
    }
  }

  getMetrics(): PoolMetrics {
    const conns = Array.from(this.connections.values());
    return {
      totalConnections: conns.length,
      idleConnections: conns.filter(c => !c.inUse).length,
      inUseConnections: conns.filter(c => c.inUse).length,
      pendingAcquires: this.pendingAcquires.length,
      totalAcquires: this.metrics.totalAcquires,
      totalReleases: this.metrics.totalReleases,
      totalErrors: this.metrics.totalErrors
    };
  }

  async shutdown(): Promise<void> {
    if (this.maintenanceTimer) {
      clearInterval(this.maintenanceTimer);
      this.maintenanceTimer = null;
    }

    if (this.regionManager) {
      this.regionManager.stop();
    }

    const destroyPromises = Array.from(this.connections.keys()).map(id => this.destroyConnection(id));
    await Promise.all(destroyPromises);

    for (const pending of this.pendingAcquires) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Pool is shutting down'));
    }
    this.pendingAcquires = [];
  }

  private async createConnection(): Promise<PooledConnection> {
    const id = `conn-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const browser = await chromium.connectOverCDP(this.getBestEndpoint());
      
      const conn: PooledConnection = {
        id,
        browser,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        inUse: false,
        healthy: true
      };

      this.connections.set(id, conn);
      this.emit('connectionCreated', id);
      return conn;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async destroyConnection(id: string): Promise<void> {
    const conn = this.connections.get(id);
    if (!conn) return;

    try {
      await conn.browser.close();
    } catch (error) {
    } finally {
      this.connections.delete(id);
      this.emit('connectionDestroyed', id);
    }
  }

  private async isConnectionHealthy(conn: PooledConnection): Promise<boolean> {
    try {
      return conn.browser.isConnected();
    } catch {
      return false;
    }
  }

  private async ensureMinIdle(): Promise<void> {
    const idleCount = Array.from(this.connections.values()).filter(c => !c.inUse).length;
    const needed = this.options.minIdle - idleCount;
    
    if (needed > 0 && this.connections.size < this.options.maxTotal) {
      const toCreate = Math.min(needed, this.options.maxTotal - this.connections.size);
      for (let i = 0; i < toCreate; i++) {
        try {
          await this.createConnection();
        } catch (error) {
        }
      }
    }
  }

  private startMaintenance(): void {
    this.maintenanceTimer = setInterval(async () => {
      const now = Date.now();
      
      for (const conn of this.connections.values()) {
        if (conn.inUse) continue;

        if (now - conn.createdAt > this.options.maxLifetimeMs) {
          await this.destroyConnection(conn.id);
          continue;
        }

        if (now - conn.lastUsedAt > this.options.idleTimeoutMs) {
          const idleCount = Array.from(this.connections.values()).filter(c => !c.inUse).length;
          if (idleCount > this.options.minIdle) {
            await this.destroyConnection(conn.id);
            continue;
          }
        }

        if (now - conn.lastUsedAt > this.options.healthCheckIntervalMs) {
          if (!(await this.isConnectionHealthy(conn))) {
            await this.destroyConnection(conn.id);
          }
        }
      }

      await this.ensureMinIdle();
    }, 30000);
  }
}

export default BrowserlessConnectionPool;
