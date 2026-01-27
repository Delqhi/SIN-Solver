const Redis = require('ioredis');
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined
});

const CHANNELS = {
  TASK_CREATED: 'sin:task:created',
  TASK_COMPLETED: 'sin:task:completed',
  TASK_FAILED: 'sin:task:failed',
  SURVEY_FOUND: 'sin:survey:found',
  CAPTCHA_NEEDED: 'sin:captcha:needed',
  CAPTCHA_SOLVED: 'sin:captcha:solved',
  HEALTH_UPDATE: 'sin:health:update',
  ALERT: 'sin:alert',
  NOTIFICATION: 'sin:notification'
};

function createEventBus(redisUrl) {
  const publisher = new Redis(redisUrl || process.env.REDIS_URL || 'redis://zimmer-speicher-redis:6379');
  const subscriber = new Redis(redisUrl || process.env.REDIS_URL || 'redis://zimmer-speicher-redis:6379');
  
  const handlers = new Map();
  
  subscriber.on('message', (channel, message) => {
    const channelHandlers = handlers.get(channel) || [];
    try {
      const data = JSON.parse(message);
      channelHandlers.forEach(handler => {
        try {
          handler(data, channel);
        } catch (error) {
          logger.error({ error: error.message, channel }, 'Handler error');
        }
      });
    } catch (error) {
      logger.error({ error: error.message, channel }, 'Failed to parse message');
    }
  });
  
  return {
    CHANNELS,
    
    async publish(channel, data) {
      const payload = JSON.stringify({
        ...data,
        _timestamp: new Date().toISOString(),
        _source: process.env.SERVICE_NAME || 'unknown'
      });
      await publisher.publish(channel, payload);
      logger.debug({ channel, data }, 'Event published');
    },
    
    subscribe(channel, handler) {
      if (!handlers.has(channel)) {
        handlers.set(channel, []);
        subscriber.subscribe(channel);
      }
      handlers.get(channel).push(handler);
      logger.info({ channel }, 'Subscribed to channel');
    },
    
    unsubscribe(channel) {
      handlers.delete(channel);
      subscriber.unsubscribe(channel);
    },
    
    async publishTask(taskId, status, data = {}) {
      const channel = status === 'completed' ? CHANNELS.TASK_COMPLETED :
                      status === 'failed' ? CHANNELS.TASK_FAILED : CHANNELS.TASK_CREATED;
      await this.publish(channel, { taskId, status, ...data });
    },
    
    async publishAlert(message, severity = 'warning', metadata = {}) {
      await this.publish(CHANNELS.ALERT, { message, severity, ...metadata });
    },
    
    async publishNotification(message, type = 'info', targets = ['telegram']) {
      await this.publish(CHANNELS.NOTIFICATION, { message, type, targets });
    },
    
    async close() {
      await publisher.quit();
      await subscriber.quit();
    }
  };
}

module.exports = { createEventBus, CHANNELS };
