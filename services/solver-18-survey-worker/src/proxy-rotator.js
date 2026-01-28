const Redis = require('redis');
const axios = require('axios');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

class ProxyRotator {
  constructor() {
    this.redis = null;
    this.proxies = new Map();
    this.platformProxies = new Map();
    this.failCounts = new Map();
    this.cooldowns = new Map();
  }

  async init() {
    this.redis = Redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    await this.redis.connect();
    await this.loadProxiesFromRedis();
    logger.info('🌐 Proxy Rotator initialized');
  }

  async loadProxiesFromRedis() {
    try {
      const data = await this.redis.get('survey:proxies');
      if (data) {
        const proxies = JSON.parse(data);
        for (const proxy of proxies) {
          this.proxies.set(proxy.id, proxy);
        }
        logger.info(`🌐 Loaded ${this.proxies.size} proxies from Redis`);
      }
    } catch (error) {
      logger.warn(`⚠️ Could not load proxies: ${error.message}`);
    }
  }

  async addProxy(proxyConfig) {
    const proxy = {
      id: `proxy-${Date.now()}`,
      url: proxyConfig.url,
      type: proxyConfig.type || 'http',
      country: proxyConfig.country || 'unknown',
      provider: proxyConfig.provider || 'manual',
      username: proxyConfig.username,
      password: proxyConfig.password,
      addedAt: new Date().toISOString(),
      healthy: true,
      lastCheck: null,
      failCount: 0
    };

    if (proxy.username && proxy.password) {
      const [protocol, rest] = proxy.url.split('://');
      proxy.url = `${protocol}://${proxy.username}:${proxy.password}@${rest}`;
    }

    this.proxies.set(proxy.id, proxy);
    await this.saveProxiesToRedis();

    logger.info(`🌐 Added proxy: ${proxy.id} (${proxy.country})`);
    return { success: true, proxy: { ...proxy, password: '***' } };
  }

  async saveProxiesToRedis() {
    if (!this.redis) return;
    
    const proxies = Array.from(this.proxies.values()).map(p => ({
      ...p,
      password: p.password ? '***' : undefined
    }));
    
    await this.redis.set('survey:proxies', JSON.stringify(proxies));
  }

  async getProxyForPlatform(platformId) {
    const existingProxyId = this.platformProxies.get(platformId);
    if (existingProxyId) {
      const proxy = this.proxies.get(existingProxyId);
      if (proxy && proxy.healthy && !this.isInCooldown(existingProxyId)) {
        return proxy;
      }
    }

    const availableProxies = Array.from(this.proxies.values())
      .filter(p => p.healthy && !this.isInCooldown(p.id))
      .filter(p => !Array.from(this.platformProxies.values()).includes(p.id));

    if (availableProxies.length === 0) {
      logger.warn(`⚠️ No available proxies for ${platformId}, using direct connection`);
      return null;
    }

    const proxy = availableProxies[Math.floor(Math.random() * availableProxies.length)];
    this.platformProxies.set(platformId, proxy.id);
    
    logger.info(`🌐 Assigned proxy ${proxy.id} to ${platformId}`);
    return proxy;
  }

  async rotateProxy(platformId) {
    const currentProxyId = this.platformProxies.get(platformId);
    if (currentProxyId) {
      this.markProxyFailed(currentProxyId);
      this.platformProxies.delete(platformId);
    }

    return this.getProxyForPlatform(platformId);
  }

  markProxyFailed(proxyId) {
    const proxy = this.proxies.get(proxyId);
    if (!proxy) return;

    proxy.failCount = (proxy.failCount || 0) + 1;
    
    if (proxy.failCount >= 3) {
      proxy.healthy = false;
      this.cooldowns.set(proxyId, Date.now() + 3600000);
      logger.warn(`🚫 Proxy ${proxyId} marked unhealthy after ${proxy.failCount} failures`);
    } else {
      this.cooldowns.set(proxyId, Date.now() + 300000);
      logger.info(`⏳ Proxy ${proxyId} in cooldown (fail ${proxy.failCount}/3)`);
    }
  }

  isInCooldown(proxyId) {
    const cooldownUntil = this.cooldowns.get(proxyId);
    if (!cooldownUntil) return false;
    
    if (Date.now() > cooldownUntil) {
      this.cooldowns.delete(proxyId);
      return false;
    }
    return true;
  }

  async checkProxyHealth(proxy) {
    try {
      const response = await axios.get('https://httpbin.org/ip', {
        proxy: {
          host: new URL(proxy.url).hostname,
          port: parseInt(new URL(proxy.url).port),
          auth: proxy.username ? {
            username: proxy.username,
            password: proxy.password
          } : undefined
        },
        timeout: 10000
      });
      
      proxy.healthy = true;
      proxy.lastCheck = new Date().toISOString();
      proxy.externalIp = response.data.origin;
      return true;

    } catch (error) {
      proxy.healthy = false;
      proxy.lastCheck = new Date().toISOString();
      proxy.lastError = error.message;
      return false;
    }
  }

  async getProxyStatus() {
    const status = [];
    
    for (const [id, proxy] of this.proxies) {
      const assignedTo = Array.from(this.platformProxies.entries())
        .find(([_, pId]) => pId === id)?.[0];
      
      status.push({
        id,
        url: proxy.url.replace(/:[^:@]+@/, ':***@'),
        country: proxy.country,
        healthy: proxy.healthy,
        failCount: proxy.failCount,
        inCooldown: this.isInCooldown(id),
        assignedTo,
        lastCheck: proxy.lastCheck
      });
    }

    return {
      total: this.proxies.size,
      healthy: status.filter(p => p.healthy).length,
      inUse: this.platformProxies.size,
      proxies: status
    };
  }

  async healthCheckAll() {
    logger.info('🏥 Running health check on all proxies...');
    
    for (const [id, proxy] of this.proxies) {
      await this.checkProxyHealth(proxy);
    }

    await this.saveProxiesToRedis();
    
    const healthy = Array.from(this.proxies.values()).filter(p => p.healthy).length;
    logger.info(`🏥 Health check complete: ${healthy}/${this.proxies.size} healthy`);
  }
}

module.exports = { ProxyRotator };
