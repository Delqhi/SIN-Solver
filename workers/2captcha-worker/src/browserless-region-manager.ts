/**
 * Browserless Region Manager
 * 
 * Manages multiple Browserless regions with latency-based routing.
 * Measures latency using WebSocket handshake timing and provides
 * intelligent region selection based on health and performance.
 * 
 * Part of Task 156 - Multi-region Browserless support
 */

import { EventEmitter } from 'events';
import WebSocket from 'ws';
import http from 'http';
import https from 'https';
import { createCategoryLogger, LogCategory } from './logger';

const logger = createCategoryLogger(LogCategory.BROWSER);

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Represents a Browserless region endpoint
 */
export interface Region {
  /** Unique identifier for the region */
  id: string;
  /** Human-readable name (e.g., "US East", "EU West") */
  name: string;
  /** WebSocket URL for the region (e.g., ws://region-us.browserless.io) */
  endpoint: string;
}

/**
 * Latency and health information for a region
 */
export interface RegionLatency {
  /** Region identifier */
  regionId: string;
  /** Measured latency in milliseconds */
  latencyMs: number;
  /** Whether the region is currently healthy */
  healthy: boolean;
  /** Timestamp of last measurement */
  lastMeasured: number;
  /** Count of consecutive failures */
  consecutiveFailures: number;
  /** Last error message if unhealthy */
  lastError?: string;
}

/**
 * Configuration options for the RegionManager
 */
export interface RegionManagerOptions {
  /** Timeout for health checks in milliseconds (default: 5000) */
  healthCheckTimeout?: number;
  /** Max consecutive failures before marking unhealthy (default: 3) */
  maxConsecutiveFailures?: number;
  /** Interval for periodic latency updates in milliseconds (default: 30000) */
  updateIntervalMs?: number;
  /** Whether to use WebSocket for latency measurement (default: true) */
  useWebSocket?: boolean;
}

/**
 * Internal region state combining Region and RegionLatency
 */
interface RegionState extends Region, RegionLatency {}

// ============================================================================
// Event Types
// ============================================================================

export interface RegionManagerEvents {
  'regionAdded': (region: Region) => void;
  'regionRemoved': (regionId: string) => void;
  'latencyUpdated': (regionId: string, latencyMs: number) => void;
  'regionHealthy': (regionId: string) => void;
  'regionUnhealthy': (regionId: string, error: string) => void;
  'bestRegionChanged': (newBestRegion: Region | null, previousBest: Region | null) => void;
  'allRegionsUnhealthy': () => void;
}

// ============================================================================
// BrowserlessRegionManager Class
// ============================================================================

/**
 * Manages multiple Browserless regions with latency-based routing.
 * 
 * Features:
 * - WebSocket-based latency measurement
 * - Periodic health checks
 * - Automatic failover to best available region
 * - Event-driven state change notifications
 * 
 * @example
 * ```typescript
 * const manager = new BrowserlessRegionManager([
 *   { id: 'us-east', name: 'US East', endpoint: 'ws://us-east.browserless.io' },
 *   { id: 'eu-west', name: 'EU West', endpoint: 'ws://eu-west.browserless.io' },
 * ]);
 * 
 * manager.on('bestRegionChanged', (newBest) => {
 *   console.log(`Best region is now: ${newBest?.name}`);
 * });
 * 
 * await manager.measureAllLatencies();
 * const best = manager.getBestRegion();
 * ```
 */
export class BrowserlessRegionManager extends EventEmitter {
  private regions: Map<string, RegionState> = new Map();
  private healthCheckTimeout: number;
  private maxConsecutiveFailures: number;
  private updateIntervalMs: number;
  private useWebSocket: boolean;
  private updateTimer: NodeJS.Timeout | null = null;
  private currentBestRegionId: string | null = null;
  private isRunning: boolean = false;

  /**
   * Creates a new BrowserlessRegionManager instance
   * 
   * @param regions - Initial array of regions to manage
   * @param options - Configuration options
   */
  constructor(regions: Region[] = [], options: RegionManagerOptions = {}) {
    super();

    this.healthCheckTimeout = options.healthCheckTimeout ?? 5000;
    this.maxConsecutiveFailures = options.maxConsecutiveFailures ?? 3;
    this.updateIntervalMs = options.updateIntervalMs ?? 30000;
    this.useWebSocket = options.useWebSocket ?? true;

    // Initialize regions
    regions.forEach(region => this.addRegion(region));

    logger.info(`BrowserlessRegionManager initialized with ${regions.length} regions`, {
      healthCheckTimeout: this.healthCheckTimeout,
      maxConsecutiveFailures: this.maxConsecutiveFailures,
      updateIntervalMs: this.updateIntervalMs,
      useWebSocket: this.useWebSocket,
    });
  }

  // ==========================================================================
  // Region Management
  // ==========================================================================

  /**
   * Adds a new region to the manager
   * 
   * @param region - Region to add
   */
  addRegion(region: Region): void {
    if (this.regions.has(region.id)) {
      logger.warn(`Region ${region.id} already exists, skipping add`);
      return;
    }

    const regionState: RegionState = {
      ...region,
      regionId: region.id,
      latencyMs: Infinity,
      healthy: true, // Assume healthy until proven otherwise
      lastMeasured: 0,
      consecutiveFailures: 0,
    };

    this.regions.set(region.id, regionState);
    logger.info(`Added region: ${region.name} (${region.id})`, { endpoint: region.endpoint });
    this.emit('regionAdded', region);
  }

  /**
   * Removes a region from the manager
   * 
   * @param regionId - ID of the region to remove
   */
  removeRegion(regionId: string): void {
    const region = this.regions.get(regionId);
    if (!region) {
      logger.warn(`Region ${regionId} not found, cannot remove`);
      return;
    }

    this.regions.delete(regionId);
    logger.info(`Removed region: ${region.name} (${regionId})`);
    this.emit('regionRemoved', regionId);

    // If we removed the best region, find a new one
    if (this.currentBestRegionId === regionId) {
      this.updateBestRegion();
    }
  }

  /**
   * Gets a region by ID
   * 
   * @param regionId - Region ID to look up
   * @returns The region or undefined if not found
   */
  getRegion(regionId: string): Region | undefined {
    const state = this.regions.get(regionId);
    if (!state) return undefined;
    return { id: state.id, name: state.name, endpoint: state.endpoint };
  }

  /**
   * Gets all registered regions
   * 
   * @returns Array of all regions
   */
  getAllRegions(): Region[] {
    return Array.from(this.regions.values()).map(state => ({
      id: state.id,
      name: state.name,
      endpoint: state.endpoint,
    }));
  }

  // ==========================================================================
  // Latency Measurement
  // ==========================================================================

  /**
   * Measures latency to a specific region using WebSocket handshake
   * 
   * @param regionId - Region ID to measure
   * @returns Measured latency in milliseconds
   * @throws Error if region not found or measurement fails
   */
  async measureLatency(regionId: string): Promise<number> {
    const region = this.regions.get(regionId);
    if (!region) {
      throw new Error(`Region ${regionId} not found`);
    }

    const startTime = Date.now();

    try {
      if (this.useWebSocket) {
        await this.measureWebSocketLatency(region.endpoint);
      } else {
        await this.measureHttpLatency(region.endpoint);
      }

      const latencyMs = Date.now() - startTime;
      this.updateRegionLatency(regionId, latencyMs, true);
      return latencyMs;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.updateRegionLatency(regionId, Infinity, false, errorMsg);
      throw error;
    }
  }

  /**
   * Measures latency using WebSocket handshake
   */
  private measureWebSocketLatency(endpoint: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`WebSocket connection timeout after ${this.healthCheckTimeout}ms`));
      }, this.healthCheckTimeout);

      // Convert HTTP URL to WebSocket URL if needed
      let wsUrl = endpoint;
      if (wsUrl.startsWith('http://')) {
        wsUrl = wsUrl.replace('http://', 'ws://');
      } else if (wsUrl.startsWith('https://')) {
        wsUrl = wsUrl.replace('https://', 'wss://');
      }

      const ws = new WebSocket(wsUrl);

      ws.on('open', () => {
        clearTimeout(timeoutId);
        ws.close();
        resolve();
      });

      ws.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });

      ws.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }

  /**
   * Measures latency using HTTP HEAD request (fallback)
   */
  private measureHttpLatency(endpoint: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`HTTP connection timeout after ${this.healthCheckTimeout}ms`));
      }, this.healthCheckTimeout);

      // Convert WebSocket URL to HTTP URL if needed
      let httpUrl = endpoint;
      if (httpUrl.startsWith('ws://')) {
        httpUrl = httpUrl.replace('ws://', 'http://');
      } else if (httpUrl.startsWith('wss://')) {
        httpUrl = httpUrl.replace('wss://', 'https://');
      }

      const url = new URL(httpUrl);
      const client = url.protocol === 'https:' ? https : http;

      const req = client.request({
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname || '/',
        method: 'HEAD',
        timeout: this.healthCheckTimeout,
      }, () => {
        clearTimeout(timeoutId);
        // Any response (even 4xx) means the server is reachable
        resolve();
      });

      req.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });

      req.on('timeout', () => {
        clearTimeout(timeoutId);
        req.destroy();
        reject(new Error('HTTP request timeout'));
      });

      req.end();
    });
  }

  /**
   * Updates region latency state and emits appropriate events
   */
  private updateRegionLatency(
    regionId: string,
    latencyMs: number,
    success: boolean,
    errorMsg?: string
  ): void {
    const region = this.regions.get(regionId);
    if (!region) return;

    const wasHealthy = region.healthy;
    region.latencyMs = latencyMs;
    region.lastMeasured = Date.now();

    if (success) {
      region.consecutiveFailures = 0;
      region.healthy = true;
      region.lastError = undefined;

      logger.debug(`Region ${regionId} latency: ${latencyMs}ms`);
      this.emit('latencyUpdated', regionId, latencyMs);

      if (!wasHealthy) {
        logger.info(`Region ${regionId} is now healthy`);
        this.emit('regionHealthy', regionId);
      }
    } else {
      region.consecutiveFailures++;
      region.lastError = errorMsg;

      logger.warn(`Region ${regionId} measurement failed (${region.consecutiveFailures}/${this.maxConsecutiveFailures})`, {
        error: errorMsg,
      });

      if (region.consecutiveFailures >= this.maxConsecutiveFailures) {
        region.healthy = false;
        if (wasHealthy) {
          logger.error(`Region ${regionId} marked unhealthy after ${region.consecutiveFailures} failures`);
          this.emit('regionUnhealthy', regionId, errorMsg || 'Unknown error');
        }
      }
    }

    // Check if best region needs updating
    this.updateBestRegion();
  }

  /**
   * Measures latency to all registered regions
   * 
   * @returns Promise that resolves when all measurements complete
   */
  async measureAllLatencies(): Promise<void> {
    const regionIds = Array.from(this.regions.keys());
    
    logger.info(`Measuring latency for ${regionIds.length} regions`);

    const measurements = regionIds.map(async (regionId) => {
      try {
        await this.measureLatency(regionId);
      } catch (error) {
        // Error already handled in measureLatency
        logger.debug(`Failed to measure ${regionId}`, { error });
      }
    });

    await Promise.all(measurements);

    // Check if all regions are unhealthy
    const healthyRegions = Array.from(this.regions.values()).filter(r => r.healthy);
    if (healthyRegions.length === 0 && this.regions.size > 0) {
      logger.error('All regions are unhealthy!');
      this.emit('allRegionsUnhealthy');
    }
  }

  // ==========================================================================
  // Best Region Selection
  // ==========================================================================

  /**
   * Gets the best available region based on latency and health
   * 
   * @returns The best region or null if no healthy regions available
   */
  getBestRegion(): Region | null {
    const healthyRegions = Array.from(this.regions.values())
      .filter(r => r.healthy && r.latencyMs < Infinity)
      .sort((a, b) => a.latencyMs - b.latencyMs);

    if (healthyRegions.length === 0) {
      return null;
    }

    const best = healthyRegions[0];
    return { id: best.id, name: best.name, endpoint: best.endpoint };
  }

  /**
   * Gets a healthy region, preferring the best but falling back to any healthy
   * 
   * @returns A healthy region or null if none available
   */
  getHealthyRegion(): Region | null {
    // First try to get the best region
    const best = this.getBestRegion();
    if (best) return best;

    // Fall back to any healthy region (even if latency not yet measured)
    const anyHealthy = Array.from(this.regions.values()).find(r => r.healthy);
    if (anyHealthy) {
      return { id: anyHealthy.id, name: anyHealthy.name, endpoint: anyHealthy.endpoint };
    }

    // Last resort: return any region regardless of health
    const anyRegion = Array.from(this.regions.values())[0];
    if (anyRegion) {
      logger.warn('No healthy regions, returning first region as fallback');
      return { id: anyRegion.id, name: anyRegion.name, endpoint: anyRegion.endpoint };
    }

    return null;
  }

  /**
   * Updates the current best region and emits event if changed
   */
  private updateBestRegion(): void {
    const best = this.getBestRegion();
    const newBestId = best?.id ?? null;

    if (newBestId !== this.currentBestRegionId) {
      const previousBest = this.currentBestRegionId 
        ? this.getRegion(this.currentBestRegionId) ?? null
        : null;
      
      this.currentBestRegionId = newBestId;

      logger.info(`Best region changed: ${previousBest?.name ?? 'none'} → ${best?.name ?? 'none'}`, {
        previousLatency: previousBest ? this.regions.get(previousBest.id)?.latencyMs : null,
        newLatency: best ? this.regions.get(best.id)?.latencyMs : null,
      });

      this.emit('bestRegionChanged', best, previousBest);
    }
  }

  // ==========================================================================
  // Status & Metrics
  // ==========================================================================

  /**
   * Gets the latency status for all regions
   * 
   * @returns Array of region latency information
   */
  getRegionStatus(): RegionLatency[] {
    return Array.from(this.regions.values()).map(state => ({
      regionId: state.regionId,
      latencyMs: state.latencyMs,
      healthy: state.healthy,
      lastMeasured: state.lastMeasured,
      consecutiveFailures: state.consecutiveFailures,
      lastError: state.lastError,
    }));
  }

  /**
   * Gets a summary of region health
   * 
   * @returns Summary object with health statistics
   */
  getHealthSummary(): {
    total: number;
    healthy: number;
    unhealthy: number;
    bestRegion: Region | null;
    bestLatency: number | null;
  } {
    const regions = Array.from(this.regions.values());
    const healthy = regions.filter(r => r.healthy);
    const best = this.getBestRegion();

    return {
      total: regions.length,
      healthy: healthy.length,
      unhealthy: regions.length - healthy.length,
      bestRegion: best,
      bestLatency: best ? this.regions.get(best.id)?.latencyMs ?? null : null,
    };
  }

  // ==========================================================================
  // Periodic Updates
  // ==========================================================================

  /**
   * Starts periodic latency updates
   * 
   * @param intervalMs - Update interval (uses default if not specified)
   */
  startPeriodicUpdates(intervalMs?: number): void {
    if (this.isRunning) {
      logger.warn('Periodic updates already running');
      return;
    }

    const interval = intervalMs ?? this.updateIntervalMs;
    this.isRunning = true;

    logger.info(`Starting periodic latency updates every ${interval}ms`);

    // Run initial measurement
    this.measureAllLatencies().catch(err => {
      logger.error('Initial latency measurement failed', { error: err });
    });

    // Set up periodic updates
    this.updateTimer = setInterval(() => {
      this.measureAllLatencies().catch(err => {
        logger.error('Periodic latency measurement failed', { error: err });
      });
    }, interval);
  }

  /**
   * Stops periodic updates and cleans up resources
   */
  stop(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    this.isRunning = false;
    logger.info('BrowserlessRegionManager stopped');
  }

  /**
   * Checks if periodic updates are running
   */
  isPeriodicUpdatesRunning(): boolean {
    return this.isRunning;
  }
}

// ============================================================================
// Default Export
// ============================================================================

export default BrowserlessRegionManager;
