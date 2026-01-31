/**
 * IP Manager Module
 * 
 * Manages IP addresses, geo-location checking, and cooldown enforcement
 * to prevent "impossible travel" detection and ban triggers.
 * 
 * Features:
 * - Geo-IP checking before each login
 * - IP change detection with distance calculation
 * - "Impossible Travel" protection (formula: Distance / Speed = Minimum pause)
 * - Hardcoded 15-minute cooldown on every IP change
 * - Router reconnect via HTTP API (FritzBox, etc.)
 * - LTE dongle control via AT commands
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Geo-IP information structure
 */
export interface GeoIPInfo {
  ip: string;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  isp: string;
  org: string;
  asn: string;
  timestamp: number;
}

/**
 * IP change record for history tracking
 */
export interface IPChangeRecord {
  previousIP: string;
  newIP: string;
  previousGeo: GeoIPInfo;
  newGeo: GeoIPInfo;
  distanceKm: number;
  cooldownMs: number;
  timestamp: number;
  reason: 'manual' | 'auto' | 'scheduled' | 'ban-protection';
}

/**
 * Router configuration for IP reset
 */
export interface RouterConfig {
  type: 'fritzbox' | 'generic' | 'lte-dongle';
  host: string;
  port: number;
  username?: string;
  password?: string;
  apiEndpoint?: string;
  atCommandPort?: string; // For LTE dongles (e.g., '/dev/ttyUSB0')
}

/**
 * IP Manager configuration
 */
export interface IPManagerConfig {
  // Cooldown settings
  ipChangeCooldownMs: number; // Default: 15 minutes (900000ms)
  impossibleTravelSpeedKmh: number; // Max plausible travel speed (800 km/h for planes)
  
  // Geo-IP service
  geoIPServiceUrl: string;
  geoIPApiKey?: string;
  
  // Router configuration for IP reset
  router?: RouterConfig;
  
  // Persistence
  stateFilePath: string;
  historyFilePath: string;
  
  // Monitoring
  checkIntervalMs: number; // How often to check current IP
  maxHistoryEntries: number;
}

/**
 * IP Manager state
 */
export interface IPManagerState {
  currentIP: string | null;
  currentGeo: GeoIPInfo | null;
  lastIPChangeTime: number;
  isInCooldown: boolean;
  cooldownEndTime: number | null;
  totalIPChanges: number;
  lastCheckTime: number;
}

/**
 * Default IP Manager configuration
 */
export const DEFAULT_IP_MANAGER_CONFIG: IPManagerConfig = {
  ipChangeCooldownMs: 15 * 60 * 1000, // 15 minutes
  impossibleTravelSpeedKmh: 800, // 800 km/h (airplane speed)
  geoIPServiceUrl: 'https://ipapi.co/json/',
  stateFilePath: './data/ip-manager-state.json',
  historyFilePath: './data/ip-change-history.json',
  checkIntervalMs: 60000, // Check every minute
  maxHistoryEntries: 1000,
};

/**
 * IP Manager class
 * Handles IP tracking, geo-location, and cooldown enforcement
 */
export class IPManager extends EventEmitter {
  private config: IPManagerConfig;
  private state: IPManagerState;
  private checkInterval: NodeJS.Timeout | null = null;
  private history: IPChangeRecord[] = [];

  constructor(config: Partial<IPManagerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_IP_MANAGER_CONFIG, ...config };
    this.state = {
      currentIP: null,
      currentGeo: null,
      lastIPChangeTime: 0,
      isInCooldown: false,
      cooldownEndTime: null,
      totalIPChanges: 0,
      lastCheckTime: 0,
    };
    
    this.ensureDataDirectory();
    this.loadState();
    this.loadHistory();
  }

  /**
   * Ensure data directory exists
   */
  private ensureDataDirectory(): void {
    const dir = path.dirname(this.config.stateFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Load state from disk
   */
  private loadState(): void {
    try {
      if (fs.existsSync(this.config.stateFilePath)) {
        const data = fs.readFileSync(this.config.stateFilePath, 'utf-8');
        const loaded = JSON.parse(data) as IPManagerState;
        this.state = { ...this.state, ...loaded };
        
        // Check if we were in cooldown and it has expired
        if (this.state.isInCooldown && this.state.cooldownEndTime) {
          if (Date.now() >= this.state.cooldownEndTime) {
            this.state.isInCooldown = false;
            this.state.cooldownEndTime = null;
            this.emit('cooldown-expired');
          }
        }
      }
    } catch (error) {
      this.emit('error', { type: 'load-state', error });
    }
  }

  /**
   * Save state to disk
   */
  private saveState(): void {
    try {
      fs.writeFileSync(
        this.config.stateFilePath,
        JSON.stringify(this.state, null, 2)
      );
    } catch (error) {
      this.emit('error', { type: 'save-state', error });
    }
  }

  /**
   * Load history from disk
   */
  private loadHistory(): void {
    try {
      if (fs.existsSync(this.config.historyFilePath)) {
        const data = fs.readFileSync(this.config.historyFilePath, 'utf-8');
        this.history = JSON.parse(data) as IPChangeRecord[];
      }
    } catch (error) {
      this.emit('error', { type: 'load-history', error });
    }
  }

  /**
   * Save history to disk
   */
  private saveHistory(): void {
    try {
      // Trim history if too large
      if (this.history.length > this.config.maxHistoryEntries) {
        this.history = this.history.slice(-this.config.maxHistoryEntries);
      }
      fs.writeFileSync(
        this.config.historyFilePath,
        JSON.stringify(this.history, null, 2)
      );
    } catch (error) {
      this.emit('error', { type: 'save-history', error });
    }
  }

  /**
   * Get current public IP and geo information
   */
  async getCurrentIPInfo(): Promise<GeoIPInfo | null> {
    try {
      const response = await fetch(this.config.geoIPServiceUrl, {
        headers: this.config.geoIPApiKey 
          ? { 'Authorization': `Bearer ${this.config.geoIPApiKey}` }
          : {},
      });

      if (!response.ok) {
        throw new Error(`Geo-IP service error: ${response.status}`);
      }

      const data = await response.json();
      
      const geoInfo: GeoIPInfo = {
        ip: data.ip,
        city: data.city || 'Unknown',
        region: data.region || 'Unknown',
        country: data.country_name || 'Unknown',
        countryCode: data.country_code || 'XX',
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        timezone: data.timezone || 'UTC',
        isp: data.org || data.asn || 'Unknown',
        org: data.org || 'Unknown',
        asn: data.asn || 'Unknown',
        timestamp: Date.now(),
      };

      this.state.lastCheckTime = Date.now();
      return geoInfo;
    } catch (error) {
      this.emit('error', { type: 'geo-ip-lookup', error });
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   * @returns Distance in kilometers
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate minimum required pause time based on impossible travel formula
   * Formula: Distance / Speed = Minimum pause time
   * @param distanceKm Distance in kilometers
   * @returns Minimum pause time in milliseconds
   */
  calculateMinimumPause(distanceKm: number): number {
    const speedKmh = this.config.impossibleTravelSpeedKmh;
    const hoursNeeded = distanceKm / speedKmh;
    const millisecondsNeeded = hoursNeeded * 60 * 60 * 1000;
    
    // Add 15-minute buffer
    return Math.max(millisecondsNeeded, this.config.ipChangeCooldownMs);
  }

  /**
   * Check if IP has changed and handle cooldown
   */
  async checkIPChange(): Promise<{
    changed: boolean;
    inCooldown: boolean;
    cooldownRemainingMs: number;
    distanceKm: number | null;
    reason?: string;
  }> {
    const newGeo = await this.getCurrentIPInfo();
    
    if (!newGeo) {
      return {
        changed: false,
        inCooldown: this.state.isInCooldown,
        cooldownRemainingMs: this.getCooldownRemaining(),
        distanceKm: null,
        reason: 'Failed to get current IP info',
      };
    }

    // First time initialization
    if (!this.state.currentIP) {
      this.state.currentIP = newGeo.ip;
      this.state.currentGeo = newGeo;
      this.saveState();
      
      return {
        changed: false,
        inCooldown: false,
        cooldownRemainingMs: 0,
        distanceKm: null,
        reason: 'Initial IP detection',
      };
    }

    // Check if IP changed
    if (this.state.currentIP === newGeo.ip) {
      return {
        changed: false,
        inCooldown: this.state.isInCooldown,
        cooldownRemainingMs: this.getCooldownRemaining(),
        distanceKm: null,
      };
    }

    // IP changed - calculate distance and enforce cooldown
    const distanceKm = this.calculateDistance(
      this.state.currentGeo!.latitude,
      this.state.currentGeo!.longitude,
      newGeo.latitude,
      newGeo.longitude
    );

    const minimumPause = this.calculateMinimumPause(distanceKm);
    const cooldownEndTime = Date.now() + minimumPause;

    // Record the change
    const record: IPChangeRecord = {
      previousIP: this.state.currentIP,
      newIP: newGeo.ip,
      previousGeo: this.state.currentGeo!,
      newGeo: newGeo,
      distanceKm,
      cooldownMs: minimumPause,
      timestamp: Date.now(),
      reason: 'auto',
    };

    this.history.push(record);
    this.saveHistory();

    // Update state
    this.state.currentIP = newGeo.ip;
    this.state.currentGeo = newGeo;
    this.state.lastIPChangeTime = Date.now();
    this.state.isInCooldown = true;
    this.state.cooldownEndTime = cooldownEndTime;
    this.state.totalIPChanges += 1;
    this.saveState();

    this.emit('ip-changed', {
      previousIP: record.previousIP,
      newIP: record.newIP,
      distanceKm,
      cooldownMs: minimumPause,
    });

    return {
      changed: true,
      inCooldown: true,
      cooldownRemainingMs: minimumPause,
      distanceKm,
      reason: `IP changed from ${record.previousIP} to ${record.newIP} (${distanceKm.toFixed(2)} km)`,
    };
  }

  /**
   * Get remaining cooldown time in milliseconds
   */
  getCooldownRemaining(): number {
    if (!this.state.isInCooldown || !this.state.cooldownEndTime) {
      return 0;
    }
    return Math.max(0, this.state.cooldownEndTime - Date.now());
  }

  /**
   * Check if currently in cooldown
   */
  isInCooldown(): boolean {
    if (this.state.isInCooldown && this.state.cooldownEndTime) {
      if (Date.now() >= this.state.cooldownEndTime) {
        this.state.isInCooldown = false;
        this.state.cooldownEndTime = null;
        this.saveState();
        this.emit('cooldown-expired');
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Wait for cooldown to expire
   */
  async waitForCooldown(): Promise<void> {
    while (this.isInCooldown()) {
      const remaining = this.getCooldownRemaining();
      this.emit('cooldown-waiting', { remainingMs: remaining });
      
      // Wait in chunks of 10 seconds
      const waitTime = Math.min(10000, remaining);
      await this.sleep(waitTime);
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Force IP reset via router API
   */
  async forceIPReset(): Promise<boolean> {
    if (!this.config.router) {
      this.emit('error', { type: 'no-router-config', message: 'Router not configured' });
      return false;
    }

    try {
      this.emit('ip-reset-start');
      
      switch (this.config.router.type) {
        case 'fritzbox':
          await this.resetFritzBox();
          break;
        case 'lte-dongle':
          await this.resetLTEDongle();
          break;
        case 'generic':
          await this.resetGenericRouter();
          break;
        default:
          throw new Error(`Unknown router type: ${this.config.router.type}`);
      }

      this.emit('ip-reset-complete');
      
      // Wait a bit for the new IP to propagate
      await this.sleep(30000);
      
      // Check the new IP
      const result = await this.checkIPChange();
      return result.changed;
    } catch (error) {
      this.emit('error', { type: 'ip-reset-failed', error });
      return false;
    }
  }

  /**
   * Reset FritzBox router
   */
  private async resetFritzBox(): Promise<void> {
    const { host, port, username, password } = this.config.router!;
    
    // FritzBox TR-064 API for reconnect
    const url = `http://${host}:${port || 49000}/upnp/control/WANIPConn1`;
    
    const soapBody = `<?xml version="1.0"?>
      <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"
                  s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
        <s:Body>
          <u:ForceTermination xmlns:u="urn:schemas-upnp-org:service:WANIPConnection:1"/>
        </s:Body>
      </s:Envelope>`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'urn:schemas-upnp-org:service:WANIPConnection:1#ForceTermination',
        ...(username && password ? {
          'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
        } : {}),
      },
      body: soapBody,
    });

    if (!response.ok) {
      throw new Error(`FritzBox reset failed: ${response.status}`);
    }
  }

  /**
   * Reset LTE dongle via AT commands
   */
  private async resetLTEDongle(): Promise<void> {
    // This would require a serial port library like 'serialport'
    // For now, emit an event that can be handled by external code
    this.emit('lte-reset-required', {
      port: this.config.router!.atCommandPort,
    });
    
    // Placeholder - actual implementation would use node-serialport
    throw new Error('LTE dongle reset requires serial port library');
  }

  /**
   * Reset generic router
   */
  private async resetGenericRouter(): Promise<void> {
    const { host, port, apiEndpoint, username, password } = this.config.router!;
    
    const url = `http://${host}:${port || 80}${apiEndpoint || '/api/reconnect'}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(username && password ? {
          'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
        } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Generic router reset failed: ${response.status}`);
    }
  }

  /**
   * Start periodic IP checking
   */
  startMonitoring(): void {
    if (this.checkInterval) {
      return;
    }

    this.checkInterval = setInterval(async () => {
      await this.checkIPChange();
    }, this.config.checkIntervalMs);

    this.emit('monitoring-started');
  }

  /**
   * Stop periodic IP checking
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      this.emit('monitoring-stopped');
    }
  }

  /**
   * Get current state
   */
  getState(): IPManagerState {
    return { ...this.state };
  }

  /**
   * Get IP change history
   */
  getHistory(): IPChangeRecord[] {
    return [...this.history];
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalIPChanges: number;
    averageDistanceKm: number;
    totalCooldownTimeMs: number;
    currentCooldownRemainingMs: number;
    isInCooldown: boolean;
  } {
    const totalDistance = this.history.reduce((sum, record) => sum + record.distanceKm, 0);
    const totalCooldown = this.history.reduce((sum, record) => sum + record.cooldownMs, 0);
    
    return {
      totalIPChanges: this.state.totalIPChanges,
      averageDistanceKm: this.history.length > 0 ? totalDistance / this.history.length : 0,
      totalCooldownTimeMs: totalCooldown,
      currentCooldownRemainingMs: this.getCooldownRemaining(),
      isInCooldown: this.isInCooldown(),
    };
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.stopMonitoring();
    this.saveState();
    this.saveHistory();
    this.removeAllListeners();
  }
}

export default IPManager;
