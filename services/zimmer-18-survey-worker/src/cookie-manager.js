const Redis = require('redis');
const crypto = require('crypto');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '1frXeoQLGTF-kekVRBE1C0TEJ_alPXK-ozVkXYue5vI=';

class CookieManager {
  constructor() {
    this.redis = null;
    this.encryptionKey = Buffer.from(ENCRYPTION_KEY, 'base64');
  }

  async init() {
    this.redis = Redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    await this.redis.connect();
    logger.info('🍪 Cookie Manager initialized');
  }

  encrypt(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey.slice(0, 32), iv);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedData) {
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey.slice(0, 32), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  }

  async getCookies(platformId) {
    try {
      if (!this.redis) await this.init();
      
      const key = `survey:cookies:${platformId}`;
      const encrypted = await this.redis.get(key);
      
      if (!encrypted) {
        logger.info(`🍪 No cookies found for ${platformId}`);
        return [];
      }

      const cookies = this.decrypt(encrypted);
      
      const validCookies = cookies.filter(cookie => {
        if (cookie.expires && cookie.expires < Date.now() / 1000) {
          return false;
        }
        return true;
      });

      logger.info(`🍪 Loaded ${validCookies.length} valid cookies for ${platformId}`);
      return validCookies;

    } catch (error) {
      logger.error(`❌ Error loading cookies for ${platformId}: ${error.message}`);
      return [];
    }
  }

  async saveCookies(platformId, cookies) {
    try {
      if (!this.redis) await this.init();

      const key = `survey:cookies:${platformId}`;
      const encrypted = this.encrypt(cookies);
      
      await this.redis.set(key, encrypted);
      await this.redis.set(`${key}:updated`, new Date().toISOString());
      
      logger.info(`🍪 Saved ${cookies.length} cookies for ${platformId}`);
      return { success: true, count: cookies.length };

    } catch (error) {
      logger.error(`❌ Error saving cookies for ${platformId}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async importCookies(platformId, cookiesInput) {
    try {
      let cookies;
      
      if (typeof cookiesInput === 'string') {
        cookies = JSON.parse(cookiesInput);
      } else if (Array.isArray(cookiesInput)) {
        cookies = cookiesInput;
      } else {
        throw new Error('Invalid cookie format');
      }

      const normalized = cookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path || '/',
        expires: cookie.expires || cookie.expirationDate,
        httpOnly: cookie.httpOnly || false,
        secure: cookie.secure || false,
        sameSite: cookie.sameSite || 'Lax'
      }));

      await this.saveCookies(platformId, normalized);
      
      logger.info(`🍪 Imported ${normalized.length} cookies for ${platformId}`);
      return { success: true, count: normalized.length };

    } catch (error) {
      logger.error(`❌ Error importing cookies: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async deleteCookies(platformId) {
    try {
      if (!this.redis) await this.init();
      
      const key = `survey:cookies:${platformId}`;
      await this.redis.del(key);
      await this.redis.del(`${key}:updated`);
      
      logger.info(`🗑️ Deleted cookies for ${platformId}`);
      return { success: true };

    } catch (error) {
      logger.error(`❌ Error deleting cookies: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async getCookieStatus(platformId) {
    try {
      if (!this.redis) await this.init();
      
      const key = `survey:cookies:${platformId}`;
      const encrypted = await this.redis.get(key);
      const updated = await this.redis.get(`${key}:updated`);
      
      if (!encrypted) {
        return { hasCookies: false };
      }

      const cookies = this.decrypt(encrypted);
      const sessionCookies = cookies.filter(c => c.name.toLowerCase().includes('session') || c.name.toLowerCase().includes('auth'));

      return {
        hasCookies: true,
        count: cookies.length,
        sessionCookies: sessionCookies.length,
        lastUpdated: updated,
        likelyLoggedIn: sessionCookies.length > 0
      };

    } catch (error) {
      return { hasCookies: false, error: error.message };
    }
  }
}

module.exports = { CookieManager };
