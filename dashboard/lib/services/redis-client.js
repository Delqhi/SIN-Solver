/**
 * Redis Client Service
 * 
 * Handles queue management, retry logic, and caching for the auto-correction system.
 * Connects to: room-04-redis-cache:6379
 */

const redis = require('redis');

class RedisClient {
  constructor(config = {}) {
    this.config = {
      host: config.host || 'localhost',
      port: config.port || 6379,
      db: config.db || 0,
      ...config,
    };
    
    this.client = null;
    this.connected = false;
  }

  /**
   * Connect to Redis
   */
  async connect() {
    if (this.connected) return;

    try {
      this.client = redis.createClient({
        host: this.config.host,
        port: this.config.port,
        db: this.config.db,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 500),
        },
      });

      this.client.on('error', (err) => {
        console.error('[RedisClient] Error:', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        console.log('[RedisClient] Connected to Redis');
        this.connected = true;
      });

      await this.client.connect();
      this.connected = true;
    } catch (error) {
      console.error('[RedisClient] Connection failed:', error);
      throw error;
    }
  }

  /**
   * Queue job for retry with exponential backoff
   */
  async queueForRetry(jobId, data, delayMs = 5000) {
    if (!this.connected) await this.connect();

    const retryKey = `retry_queue:${jobId}`;
    const timestamp = Date.now() + delayMs;

    try {
      // Store retry data with TTL
      await this.client.hSet(retryKey, {
        jobId,
        data: JSON.stringify(data),
        scheduledAt: timestamp.toString(),
        createdAt: Date.now().toString(),
        retryCount: (await this.getRetryCount(jobId)) + 1,
      });

      // Set TTL (expire after 24 hours)
      await this.client.expire(retryKey, 86400);

      // Add to sorted set for scheduled execution
      await this.client.zAdd('retry_queue', { score: timestamp, member: jobId });

      console.log(`[RedisClient] Job ${jobId} queued for retry in ${delayMs}ms`);
      return true;
    } catch (error) {
      console.error('[RedisClient] Queue retry failed:', error);
      return false;
    }
  }

  /**
   * Get retry count for a job
   */
  async getRetryCount(jobId) {
    if (!this.connected) await this.connect();

    try {
      const retryKey = `retry_queue:${jobId}`;
      const data = await this.client.hGetAll(retryKey);
      return parseInt(data.retryCount || '0', 10);
    } catch (error) {
      console.error('[RedisClient] Get retry count failed:', error);
      return 0;
    }
  }

  /**
   * Get all jobs scheduled for retry
   */
  async getScheduledRetries() {
    if (!this.connected) await this.connect();

    try {
      const now = Date.now();
      const jobs = await this.client.zRangeByScore('retry_queue', 0, now);
      return jobs || [];
    } catch (error) {
      console.error('[RedisClient] Get scheduled retries failed:', error);
      return [];
    }
  }

  /**
   * Remove job from retry queue
   */
  async removeFromRetryQueue(jobId) {
    if (!this.connected) await this.connect();

    try {
      const retryKey = `retry_queue:${jobId}`;
      await this.client.del(retryKey);
      await this.client.zRem('retry_queue', jobId);
      return true;
    } catch (error) {
      console.error('[RedisClient] Remove from retry queue failed:', error);
      return false;
    }
  }

  /**
   * Store timeout override for a job
   */
  async setTimeoutOverride(jobId, newTimeoutMs) {
    if (!this.connected) await this.connect();

    try {
      const key = `timeout_override:${jobId}`;
      await this.client.set(key, newTimeoutMs.toString());
      await this.client.expire(key, 3600); // 1 hour TTL
      return true;
    } catch (error) {
      console.error('[RedisClient] Set timeout override failed:', error);
      return false;
    }
  }

  /**
   * Get timeout override for a job
   */
  async getTimeoutOverride(jobId) {
    if (!this.connected) await this.connect();

    try {
      const key = `timeout_override:${jobId}`;
      const value = await this.client.get(key);
      return value ? parseInt(value, 10) : null;
    } catch (error) {
      console.error('[RedisClient] Get timeout override failed:', error);
      return null;
    }
  }

  /**
   * Cache successful fix strategy result
   */
  async cacheFixResult(jobId, strategy, result) {
    if (!this.connected) await this.connect();

    try {
      const key = `fix_result:${jobId}:${strategy}`;
      await this.client.set(key, JSON.stringify(result));
      await this.client.expire(key, 604800); // 7 days TTL
      return true;
    } catch (error) {
      console.error('[RedisClient] Cache fix result failed:', error);
      return false;
    }
  }

  /**
   * Get cached fix result
   */
  async getCacheFixResult(jobId, strategy) {
    if (!this.connected) await this.connect();

    try {
      const key = `fix_result:${jobId}:${strategy}`;
      const cached = await this.client.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('[RedisClient] Get cached fix result failed:', error);
      return null;
    }
  }

  /**
   * Increment strategy success counter
   */
  async incrementStrategySuccessCount(strategy) {
    if (!this.connected) await this.connect();

    try {
      const key = `strategy_success:${strategy}`;
      await this.client.incr(key);
      return true;
    } catch (error) {
      console.error('[RedisClient] Increment strategy counter failed:', error);
      return false;
    }
  }

  /**
   * Get strategy statistics
   */
  async getStrategyStats(strategy) {
    if (!this.connected) await this.connect();

    try {
      const successKey = `strategy_success:${strategy}`;
      const failureKey = `strategy_failure:${strategy}`;
      
      const success = await this.client.get(successKey);
      const failure = await this.client.get(failureKey);

      return {
        successes: parseInt(success || '0', 10),
        failures: parseInt(failure || '0', 10),
      };
    } catch (error) {
      console.error('[RedisClient] Get strategy stats failed:', error);
      return { successes: 0, failures: 0 };
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.connected) await this.connect();
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch (error) {
      console.error('[RedisClient] Health check failed:', error);
      return false;
    }
  }

  /**
   * Disconnect from Redis
   */
  async disconnect() {
    if (this.client && this.connected) {
      try {
        await this.client.quit();
        this.connected = false;
        console.log('[RedisClient] Disconnected');
      } catch (error) {
        console.error('[RedisClient] Disconnect error:', error);
      }
    }
  }
}

module.exports = { RedisClient };
