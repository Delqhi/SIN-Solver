/**
 * Proxy Rotation System for Browserless
 * Manages proxy pool with health checks and rotation strategies
 */

interface ProxyConfig {
  host: string;
  port: number;
  type: 'socks5' | 'http';
  weight?: number;
}

interface ProxyStats {
  usageCount: number;
  lastUsed: number;
  failures: number;
  lastFailure: number;
  averageResponseTime: number;
  isHealthy: boolean;
}

type RotationStrategy = 'round-robin' | 'random' | 'least-used' | 'weighted';

export class ProxyRotator {
  private proxies: Map<string, ProxyConfig> = new Map();
  private stats: Map<string, ProxyStats> = new Map();
  private currentIndex = 0;
  private strategy: RotationStrategy;

  constructor(
    proxyConfigs: ProxyConfig[],
    strategy: RotationStrategy = 'round-robin'
  ) {
    this.strategy = strategy;
    
    for (const config of proxyConfigs) {
      const key = this.getProxyKey(config);
      this.proxies.set(key, config);
      this.stats.set(key, {
        usageCount: 0,
        lastUsed: 0,
        failures: 0,
        lastFailure: 0,
        averageResponseTime: 0,
        isHealthy: true
      });
    }
  }

  private getProxyKey(config: ProxyConfig): string {
    return `${config.type}://${config.host}:${config.port}`;
  }

  /**
   * Get next proxy based on rotation strategy
   */
  getNextProxy(): ProxyConfig | null {
    const healthyProxies = this.getHealthyProxies();
    
    if (healthyProxies.length === 0) {
      console.warn('⚠️ [ProxyRotator] No healthy proxies available');
      return null;
    }

    let selected: ProxyConfig;

    switch (this.strategy) {
      case 'round-robin':
        selected = this.roundRobin(healthyProxies);
        break;
      case 'random':
        selected = this.random(healthyProxies);
        break;
      case 'least-used':
        selected = this.leastUsed(healthyProxies);
        break;
      case 'weighted':
        selected = this.weighted(healthyProxies);
        break;
      default:
        selected = this.roundRobin(healthyProxies);
    }

    this.recordUsage(selected);
    return selected;
  }

  private getHealthyProxies(): ProxyConfig[] {
    const healthy: ProxyConfig[] = [];
    for (const [key, config] of this.proxies) {
      const stats = this.stats.get(key);
      if (stats && stats.isHealthy) {
        healthy.push(config);
      }
    }
    return healthy;
  }

  private roundRobin(proxies: ProxyConfig[]): ProxyConfig {
    const proxy = proxies[this.currentIndex % proxies.length];
    this.currentIndex++;
    return proxy;
  }

  private random(proxies: ProxyConfig[]): ProxyConfig {
    const index = Math.floor(Math.random() * proxies.length);
    return proxies[index];
  }

  private leastUsed(proxies: ProxyConfig[]): ProxyConfig {
    return proxies.reduce((least, current) => {
      const leastKey = this.getProxyKey(least);
      const currentKey = this.getProxyKey(current);
      const leastStats = this.stats.get(leastKey)!;
      const currentStats = this.stats.get(currentKey)!;
      
      return currentStats.usageCount < leastStats.usageCount ? current : least;
    });
  }

  private weighted(proxies: ProxyConfig[]): ProxyConfig {
    const totalWeight = proxies.reduce((sum, p) => sum + (p.weight || 1), 0);
    let random = Math.random() * totalWeight;
    
    for (const proxy of proxies) {
      random -= (proxy.weight || 1);
      if (random <= 0) {
        return proxy;
      }
    }
    
    return proxies[proxies.length - 1];
  }

  /**
   * Record proxy usage
   */
  private recordUsage(proxy: ProxyConfig): void {
    const key = this.getProxyKey(proxy);
    const stats = this.stats.get(key);
    
    if (stats) {
      stats.usageCount++;
      stats.lastUsed = Date.now();
    }
  }

  /**
   * Record proxy failure
   */
  recordFailure(proxy: ProxyConfig, error?: Error): void {
    const key = this.getProxyKey(proxy);
    const stats = this.stats.get(key);
    
    if (stats) {
      stats.failures++;
      stats.lastFailure = Date.now();
      
      // Mark as unhealthy if too many failures
      if (stats.failures >= 3) {
        stats.isHealthy = false;
        console.warn(`⚠️ [ProxyRotator] Proxy ${key} marked as unhealthy (${stats.failures} failures)`);
      }
    }
  }

  /**
   * Record successful response time
   */
  recordSuccess(proxy: ProxyConfig, responseTimeMs: number): void {
    const key = this.getProxyKey(proxy);
    const stats = this.stats.get(key);
    
    if (stats) {
      // Update average response time
      stats.averageResponseTime = 
        (stats.averageResponseTime * (stats.usageCount - 1) + responseTimeMs) / stats.usageCount;
      
      // Reset failures on success
      if (stats.failures > 0) {
        stats.failures = 0;
        stats.isHealthy = true;
      }
    }
  }

  /**
   * Health check all proxies
   */
  async healthCheck(): Promise<void> {
    console.log('🔍 [ProxyRotator] Running health checks...');
    
    for (const [key, config] of this.proxies) {
      const isHealthy = await this.checkProxyHealth(config);
      const stats = this.stats.get(key);
      
      if (stats) {
        const wasHealthy = stats.isHealthy;
        stats.isHealthy = isHealthy;
        
        if (wasHealthy && !isHealthy) {
          console.warn(`⚠️ [ProxyRotator] Proxy ${key} is now unhealthy`);
        } else if (!wasHealthy && isHealthy) {
          console.log(`✅ [ProxyRotator] Proxy ${key} is now healthy`);
        }
      }
    }
  }

  private async checkProxyHealth(config: ProxyConfig): Promise<boolean> {
    // Simple health check - try to connect through proxy
    // In production, this would make an actual request
    return new Promise((resolve) => {
      // Simulate health check
      setTimeout(() => {
        const stats = this.stats.get(this.getProxyKey(config));
        
        // If proxy has recent failures, consider it unhealthy
        if (stats && stats.failures >= 3) {
          resolve(false);
        } else {
          resolve(true);
        }
      }, 100);
    });
  }

  /**
   * Get proxy statistics
   */
  getStats(): Map<string, ProxyStats> {
    return new Map(this.stats);
  }

  /**
   * Get all proxies
   */
  getAllProxies(): ProxyConfig[] {
    return Array.from(this.proxies.values());
  }

  /**
   * Get healthy proxy count
   */
  getHealthyCount(): number {
    return this.getHealthyProxies().length;
  }

  /**
   * Change rotation strategy
   */
  setStrategy(strategy: RotationStrategy): void {
    this.strategy = strategy;
    console.log(`⚙️ [ProxyRotator] Strategy changed to: ${strategy}`);
  }

  /**
   * Add new proxy to pool
   */
  addProxy(config: ProxyConfig): void {
    const key = this.getProxyKey(config);
    
    if (this.proxies.has(key)) {
      console.warn(`⚠️ [ProxyRotator] Proxy ${key} already exists`);
      return;
    }
    
    this.proxies.set(key, config);
    this.stats.set(key, {
      usageCount: 0,
      lastUsed: 0,
      failures: 0,
      lastFailure: 0,
      averageResponseTime: 0,
      isHealthy: true
    });
    
    console.log(`✅ [ProxyRotator] Added proxy: ${key}`);
  }

  /**
   * Remove proxy from pool
   */
  removeProxy(config: ProxyConfig): void {
    const key = this.getProxyKey(config);
    
    if (this.proxies.delete(key)) {
      this.stats.delete(key);
      console.log(`🗑️ [ProxyRotator] Removed proxy: ${key}`);
    }
  }

  /**
   * Reset all stats
   */
  resetStats(): void {
    for (const [key, stats] of this.stats) {
      stats.usageCount = 0;
      stats.lastUsed = 0;
      stats.failures = 0;
      stats.lastFailure = 0;
      stats.averageResponseTime = 0;
      stats.isHealthy = true;
    }
    
    console.log('🔄 [ProxyRotator] Stats reset');
  }
}

export default ProxyRotator;
