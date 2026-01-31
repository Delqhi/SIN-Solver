/**
 * Advanced IP Rotation Manager
 *
 * Handles router reconnects, IP checks, and session persistence recovery.
 * 
 * 🎯 SMART ROTATION STRATEGY (Anti-Ban):
 * - Rotate after 4.000-6.000 requests (randomized)
 * - 5-10 minute pause after each rotation (randomized)
 * - Immediate rotation on 429/ban + pause
 * - Synchronized IP + Key rotation
 */

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import type { BrowserSessionSnapshot } from './sync-coordinator';

export interface IPRotationManagerConfig {
  stateFilePath: string;
  bindingsFilePath: string;
  sessionFilePath: string;
  sessionRestoreHandler: (snapshot: BrowserSessionSnapshot) => Promise<void>;
  sessionSnapshotProvider: () => Promise<BrowserSessionSnapshot>;
  // 🆕 Smart rotation settings
  minRequestsBeforeRotation?: number;  // Default: 4000
  maxRequestsBeforeRotation?: number;  // Default: 6000
  minPauseMinutes?: number;            // Default: 5
  maxPauseMinutes?: number;            // Default: 10
  onRotationComplete?: (result: IPRotationResult) => Promise<void>;
}

export interface IPRotationResult {
  oldIP: string | null;
  newIP: string;
  rotatedAt: number;
  reason: string;
  requestCount: number;
  pauseDurationMs: number;
}

export interface RotationState {
  currentIP: string | null;
  requestCount: number;
  rotationThreshold: number;
  lastRotationAt: number;
  totalRotations: number;
}

export class IPRotationManager {
  private readonly config: Required<IPRotationManagerConfig>;
  private currentIP: string | null = null;
  private rotationState: RotationState;

  constructor(config: IPRotationManagerConfig) {
    this.config = {
      minRequestsBeforeRotation: 4000,
      maxRequestsBeforeRotation: 6000,
      minPauseMinutes: 5,
      maxPauseMinutes: 10,
      onRotationComplete: async () => {},
      ...config,
    };
    this.rotationState = this.loadRotationState();
  }

  /**
   * Resolve current public IP using a simple external endpoint.
   */
  async getCurrentIP(): Promise<string> {
    if (this.currentIP) {
      return this.currentIP;
    }

    const ip = await this.fetchPublicIP();
    this.currentIP = ip;
    this.persistState();
    return ip;
  }

  /**
   * Rotate IP and restore the latest session snapshot.
   */
  async rotateIP(reason: string = 'manual'): Promise<IPRotationResult> {
    const oldIP = this.currentIP ?? (await this.fetchPublicIP());
    const snapshot = await this.config.sessionSnapshotProvider();

    await this.reconnectRouter();

    const newIP = await this.fetchPublicIP();
    this.currentIP = newIP;

    const restored = this.loadSessionSnapshot(newIP) ?? snapshot;
    await this.config.sessionRestoreHandler(restored);

    const pauseDurationMs = this.randomPauseDurationMs();
    const requestCount = this.rotationState.requestCount;
    this.rotationState = {
      currentIP: newIP,
      requestCount: 0,
      rotationThreshold: this.randomRotationThreshold(),
      lastRotationAt: Date.now(),
      totalRotations: this.rotationState.totalRotations + 1,
    };
    this.persistState();
    this.persistBindings(oldIP, newIP);

    return {
      oldIP,
      newIP,
      rotatedAt: Date.now(),
      reason,
      requestCount,
      pauseDurationMs,
    };
  }

  /**
   * Router reconnect hook (overridable in tests).
   */
  async reconnectRouter(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      execFile('echo', ['reconnect'], (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  private async fetchPublicIP(): Promise<string> {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = (await response.json()) as { ip?: string };
    if (!data.ip) {
      throw new Error('Failed to resolve current IP');
    }
    return data.ip;
  }

  private persistState(): void {
    const state: RotationState & { updatedAt: number } = {
      currentIP: this.currentIP,
      requestCount: this.rotationState.requestCount,
      rotationThreshold: this.rotationState.rotationThreshold,
      lastRotationAt: this.rotationState.lastRotationAt,
      totalRotations: this.rotationState.totalRotations,
      updatedAt: Date.now(),
    };
    this.ensureDirectory(this.config.stateFilePath);
    fs.writeFileSync(this.config.stateFilePath, JSON.stringify(state, null, 2));
  }

  private persistBindings(oldIP: string | null, newIP: string): void {
    this.ensureDirectory(this.config.bindingsFilePath);
    const bindings = {
      oldIP,
      newIP,
      rotatedAt: Date.now(),
    };
    fs.writeFileSync(this.config.bindingsFilePath, JSON.stringify(bindings, null, 2));
  }

  private loadSessionSnapshot(ip: string): BrowserSessionSnapshot | null {
    if (!fs.existsSync(this.config.sessionFilePath)) {
      return null;
    }

    const raw = fs.readFileSync(this.config.sessionFilePath, 'utf-8');
    const data = JSON.parse(raw) as Record<string, BrowserSessionSnapshot>;
    return data[ip] ?? null;
  }

  private ensureDirectory(filePath: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadRotationState(): RotationState {
    if (!fs.existsSync(this.config.stateFilePath)) {
      return {
        currentIP: null,
        requestCount: 0,
        rotationThreshold: this.randomRotationThreshold(),
        lastRotationAt: 0,
        totalRotations: 0,
      };
    }

    try {
      const raw = fs.readFileSync(this.config.stateFilePath, 'utf-8');
      const data = JSON.parse(raw) as RotationState;
      return {
        currentIP: data.currentIP ?? null,
        requestCount: data.requestCount ?? 0,
        rotationThreshold: data.rotationThreshold ?? this.randomRotationThreshold(),
        lastRotationAt: data.lastRotationAt ?? 0,
        totalRotations: data.totalRotations ?? 0,
      };
    } catch (error) {
      return {
        currentIP: null,
        requestCount: 0,
        rotationThreshold: this.randomRotationThreshold(),
        lastRotationAt: 0,
        totalRotations: 0,
      };
    }
  }

  private randomRotationThreshold(): number {
    const min = this.config.minRequestsBeforeRotation;
    const max = this.config.maxRequestsBeforeRotation;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomPauseDurationMs(): number {
    const min = this.config.minPauseMinutes;
    const max = this.config.maxPauseMinutes;
    const minutes = Math.floor(Math.random() * (max - min + 1)) + min;
    return minutes * 60 * 1000;
  }

  /**
   * 🆕 Expose randomized pause duration for external coordinators.
   * Keeps rotation timing consistent with internal rules.
   */
  getRandomPauseDurationMs(): number {
    return this.randomPauseDurationMs();
  }

  /**
   * 🆕 Track a request and check if rotation is needed
   * Returns true if rotation should be triggered
   */
  trackRequest(): { shouldRotate: boolean; reason?: string } {
    this.rotationState.requestCount++;
    this.persistState();

    // Check if we've reached the threshold
    if (this.rotationState.requestCount >= this.rotationState.rotationThreshold) {
      return {
        shouldRotate: true,
        reason: `Request threshold reached: ${this.rotationState.requestCount}/${this.rotationState.rotationThreshold}`,
      };
    }

    return { shouldRotate: false };
  }

  /**
   * 🆕 Check if rotation is needed (without incrementing counter)
   */
  checkRotationNeeded(): { needed: boolean; reason?: string; requestCount: number; threshold: number } {
    return {
      needed: this.rotationState.requestCount >= this.rotationState.rotationThreshold,
      reason: this.rotationState.requestCount >= this.rotationState.rotationThreshold
        ? `Request threshold reached: ${this.rotationState.requestCount}/${this.rotationState.rotationThreshold}`
        : undefined,
      requestCount: this.rotationState.requestCount,
      threshold: this.rotationState.rotationThreshold,
    };
  }

  /**
   * 🆕 Emergency rotation on 429 or ban
   * Immediately rotates IP and pauses
   */
  async emergencyRotation(reason: 'rate-limit' | 'ip-ban' | 'error'): Promise<IPRotationResult> {
    console.log(`🚨 Emergency rotation triggered: ${reason}`);
    
    // Perform rotation
    const result = await this.rotateIP(`emergency-${reason}`);
    
    // Always pause after emergency rotation (5-10 minutes)
    const pauseMs = this.randomPauseDurationMs();
    console.log(`⏸️  Emergency pause: ${Math.round(pauseMs / 1000 / 60)} minutes`);
    await this.sleep(pauseMs);
    
    return result;
  }

  /**
   * 🆕 Perform standard rotation with pause
   * Used when request threshold is reached
   */
  async performRotationWithPause(): Promise<IPRotationResult> {
    const result = await this.rotateIP('request-threshold');
    
    // Pause after rotation (5-10 minutes)
    const pauseMs = result.pauseDurationMs;
    console.log(`⏸️  Post-rotation pause: ${Math.round(pauseMs / 1000 / 60)} minutes`);
    await this.sleep(pauseMs);
    
    return result;
  }

  /**
   * 🆕 Get current rotation statistics
   */
  getStats(): {
    requestCount: number;
    rotationThreshold: number;
    requestsUntilRotation: number;
    totalRotations: number;
    lastRotationAt: number;
    currentIP: string | null;
  } {
    return {
      requestCount: this.rotationState.requestCount,
      rotationThreshold: this.rotationState.rotationThreshold,
      requestsUntilRotation: Math.max(0, this.rotationState.rotationThreshold - this.rotationState.requestCount),
      totalRotations: this.rotationState.totalRotations,
      lastRotationAt: this.rotationState.lastRotationAt,
      currentIP: this.rotationState.currentIP,
    };
  }

  /**
   * Sleep helper for pauses
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default IPRotationManager;
