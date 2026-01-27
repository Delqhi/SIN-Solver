const Redis = require('redis');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

const SURVEY_PLATFORMS = {
  'swagbucks': {
    name: 'Swagbucks',
    url: 'https://www.swagbucks.com',
    loginUrl: 'https://www.swagbucks.com/p/login',
    surveysUrl: 'https://www.swagbucks.com/surveys',
    currency: 'SB',
    conversionRate: 0.01,
    riskLevel: 'medium',
    cooldownMinutes: 5
  },
  'prolific': {
    name: 'Prolific',
    url: 'https://www.prolific.co',
    loginUrl: 'https://app.prolific.co/login',
    surveysUrl: 'https://app.prolific.co/studies',
    currency: 'GBP',
    conversionRate: 1.0,
    riskLevel: 'low',
    cooldownMinutes: 2
  },
  'mturk': {
    name: 'Amazon MTurk',
    url: 'https://worker.mturk.com',
    loginUrl: 'https://worker.mturk.com',
    surveysUrl: 'https://worker.mturk.com/?filters%5Bqualified%5D=true',
    currency: 'USD',
    conversionRate: 1.0,
    riskLevel: 'high',
    cooldownMinutes: 10
  },
  'clickworker': {
    name: 'Clickworker',
    url: 'https://www.clickworker.com',
    loginUrl: 'https://workplace.clickworker.com/en/login',
    surveysUrl: 'https://workplace.clickworker.com/en/jobs',
    currency: 'EUR',
    conversionRate: 1.0,
    riskLevel: 'medium',
    cooldownMinutes: 5
  },
  'appen': {
    name: 'Appen',
    url: 'https://connect.appen.com',
    loginUrl: 'https://connect.appen.com/qrp/core/login',
    surveysUrl: 'https://connect.appen.com/qrp/core/vendors/workflows',
    currency: 'USD',
    conversionRate: 1.0,
    riskLevel: 'low',
    cooldownMinutes: 3
  },
  'toluna': {
    name: 'Toluna',
    url: 'https://de.toluna.com',
    loginUrl: 'https://de.toluna.com/login',
    surveysUrl: 'https://de.toluna.com/surveys',
    currency: 'Points',
    conversionRate: 0.001,
    riskLevel: 'medium',
    cooldownMinutes: 5
  },
  'lifepoints': {
    name: 'LifePoints',
    url: 'https://www.lifepointspanel.com',
    loginUrl: 'https://www.lifepointspanel.com/login',
    surveysUrl: 'https://www.lifepointspanel.com/surveys',
    currency: 'LP',
    conversionRate: 0.01,
    riskLevel: 'medium',
    cooldownMinutes: 5
  },
  'yougov': {
    name: 'YouGov',
    url: 'https://yougov.de',
    loginUrl: 'https://yougov.de/login',
    surveysUrl: 'https://yougov.de/surveys',
    currency: 'Points',
    conversionRate: 0.02,
    riskLevel: 'low',
    cooldownMinutes: 3
  }
};

class PlatformManager {
  constructor() {
    this.redis = null;
    this.configs = new Map();
    this.initDefaultConfigs();
  }

  initDefaultConfigs() {
    for (const [id, platform] of Object.entries(SURVEY_PLATFORMS)) {
      this.configs.set(id, {
        ...platform,
        id,
        enabled: false,
        credentials: null,
        maxDailyHours: 8,
        preferredHours: { start: 8, end: 22 },
        autoLogin: true,
        solveCaptchas: true,
        aiAssist: true
      });
    }
  }

  async init() {
    this.redis = Redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    await this.redis.connect();
    await this.loadConfigsFromRedis();
  }

  async loadConfigsFromRedis() {
    try {
      const keys = await this.redis.keys('survey:platform:*');
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const config = JSON.parse(data);
          this.configs.set(config.id, { ...this.configs.get(config.id), ...config });
        }
      }
      logger.info(`📋 Loaded ${keys.length} platform configs from Redis`);
    } catch (error) {
      logger.warn(`⚠️ Could not load configs from Redis: ${error.message}`);
    }
  }

  async getAllPlatforms() {
    const platforms = [];
    for (const [id, config] of this.configs) {
      platforms.push({
        id,
        name: config.name,
        url: config.url,
        currency: config.currency,
        riskLevel: config.riskLevel,
        enabled: config.enabled,
        hasCredentials: !!config.credentials,
        cooldownMinutes: config.cooldownMinutes
      });
    }
    return platforms;
  }

  async getPlatformStatus(platformId) {
    const config = this.configs.get(platformId);
    if (!config) {
      return { error: 'Platform not found' };
    }

    const stats = await this.redis?.get(`survey:stats:${platformId}`);
    
    return {
      ...config,
      credentials: config.credentials ? '***configured***' : null,
      stats: stats ? JSON.parse(stats) : null
    };
  }

  async updateConfig(platformId, updates) {
    const existing = this.configs.get(platformId);
    if (!existing) {
      return { error: 'Platform not found' };
    }

    const newConfig = { ...existing, ...updates, id: platformId };
    this.configs.set(platformId, newConfig);

    if (this.redis) {
      const saveConfig = { ...newConfig };
      if (saveConfig.credentials) {
        saveConfig.credentials = { ...saveConfig.credentials, password: '***' };
      }
      await this.redis.set(`survey:platform:${platformId}`, JSON.stringify(saveConfig));
    }

    logger.info(`✅ Updated config for ${platformId}`);
    return { success: true, config: { ...newConfig, credentials: newConfig.credentials ? '***' : null } };
  }

  getPlatformConfig(platformId) {
    return this.configs.get(platformId);
  }
}

module.exports = { PlatformManager, SURVEY_PLATFORMS };
