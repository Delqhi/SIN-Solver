const Redis = require('ioredis');
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined
});

class SurveyEventSubscriber {
  constructor(config = {}) {
    this.redisUrl = config.redisUrl || process.env.REDIS_URL || 'redis://zimmer-archiv-redis:6379';
    this.messengerFactory = config.messengerFactory || null;
    
    this.subscriber = null;
    this.connected = false;
    this.channels = [
      'survey.completed',
      'survey.failed', 
      'survey.started',
      'survey.captcha_solved',
      'earnings.daily',
      'earnings.payout',
      'worker.status',
      'worker.error',
      'system.alert'
    ];
    
    this.eventHandlers = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 500;
  }
  
  setMessengerFactory(factory) {
    this.messengerFactory = factory;
  }
  
  async initialize() {
    try {
      this.subscriber = new Redis(this.redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true
      });
      
      await this.subscriber.connect();
      
      this.subscriber.on('error', (error) => {
        logger.error({ error: error.message }, 'Redis subscriber error');
      });
      
      this.subscriber.on('connect', () => {
        this.connected = true;
        logger.info('Redis subscriber connected');
      });
      
      this.subscriber.on('close', () => {
        this.connected = false;
        logger.warn('Redis subscriber disconnected');
      });
      
      await this.subscriber.subscribe(...this.channels);
      
      this.subscriber.on('message', async (channel, message) => {
        await this.handleEvent(channel, message);
      });
      
      logger.info({ channels: this.channels }, 'Survey event subscriber initialized');
    } catch (error) {
      logger.error({ error: error.message }, 'Failed to initialize Redis subscriber');
      throw error;
    }
  }
  
  async handleEvent(channel, rawMessage) {
    try {
      const event = JSON.parse(rawMessage);
      const timestamp = new Date().toISOString();
      
      this.recordEvent({ channel, event, timestamp });
      
      logger.info({ channel, event }, 'Received event');
      
      const customHandler = this.eventHandlers.get(channel);
      if (customHandler) {
        await customHandler(event);
        return;
      }
      
      await this.processEvent(channel, event);
    } catch (error) {
      logger.error({ channel, error: error.message }, 'Failed to handle event');
    }
  }
  
  async processEvent(channel, event) {
    if (!this.messengerFactory) {
      logger.warn('MessengerFactory not set, cannot broadcast events');
      return;
    }
    
    let message = '';
    let type = 'info';
    
    switch (channel) {
      case 'survey.completed':
        message = `📊 Survey abgeschlossen!\n\n` +
          `Platform: ${event.platform || 'Unknown'}\n` +
          `Dauer: ${event.duration || 'N/A'}s\n` +
          `Verdienst: $${(event.earnings || 0).toFixed(2)}`;
        type = 'success';
        break;
        
      case 'survey.failed':
        message = `❌ Survey fehlgeschlagen\n\n` +
          `Platform: ${event.platform || 'Unknown'}\n` +
          `Grund: ${event.reason || 'Unbekannt'}`;
        type = 'error';
        break;
        
      case 'survey.started':
        message = `▶️ Survey gestartet\n\n` +
          `Platform: ${event.platform || 'Unknown'}\n` +
          `Typ: ${event.type || 'Standard'}`;
        type = 'info';
        break;
        
      case 'survey.captcha_solved':
        message = `🔐 Captcha gelöst!\n\n` +
          `Typ: ${event.captchaType || 'Unknown'}\n` +
          `Dauer: ${event.solveTime || 'N/A'}ms`;
        type = 'captcha';
        break;
        
      case 'earnings.daily':
        message = `💰 Tagesverdienst\n\n` +
          `Heute: $${(event.today || 0).toFixed(2)}\n` +
          `Diese Woche: $${(event.week || 0).toFixed(2)}\n` +
          `Gesamt: $${(event.total || 0).toFixed(2)}`;
        type = 'earnings';
        break;
        
      case 'earnings.payout':
        message = `🎉 Auszahlung!\n\n` +
          `Betrag: $${(event.amount || 0).toFixed(2)}\n` +
          `Platform: ${event.platform || 'Unknown'}\n` +
          `Methode: ${event.method || 'N/A'}`;
        type = 'success';
        break;
        
      case 'worker.status':
        message = `👷 Worker Status\n\n` +
          `Worker: ${event.workerId || 'Unknown'}\n` +
          `Status: ${event.status || 'N/A'}\n` +
          `Aktive Surveys: ${event.activeSurveys || 0}`;
        type = 'info';
        break;
        
      case 'worker.error':
        message = `🚨 Worker Fehler!\n\n` +
          `Worker: ${event.workerId || 'Unknown'}\n` +
          `Fehler: ${event.error || 'Unbekannt'}`;
        type = 'error';
        break;
        
      case 'system.alert':
        message = `🚨 SYSTEM ALERT\n\n${event.message || 'Unbekannter Alert'}`;
        type = 'alert';
        break;
        
      default:
        message = `📬 Event: ${channel}\n\n${JSON.stringify(event, null, 2)}`;
        type = 'info';
    }
    
    await this.messengerFactory.broadcast(message, type);
  }
  
  registerHandler(channel, handler) {
    this.eventHandlers.set(channel, handler);
    logger.info({ channel }, 'Custom event handler registered');
  }
  
  unregisterHandler(channel) {
    this.eventHandlers.delete(channel);
  }
  
  recordEvent(record) {
    this.eventHistory.push(record);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }
  
  getEventHistory(limit = 50, channel = null) {
    let events = this.eventHistory;
    if (channel) {
      events = events.filter(e => e.channel === channel);
    }
    return events.slice(-limit).reverse();
  }
  
  getStatus() {
    return {
      connected: this.connected,
      channels: this.channels,
      eventCount: this.eventHistory.length,
      customHandlers: Array.from(this.eventHandlers.keys())
    };
  }
  
  async shutdown() {
    if (this.subscriber) {
      await this.subscriber.unsubscribe();
      await this.subscriber.quit();
      this.subscriber = null;
    }
    this.connected = false;
    logger.info('Survey event subscriber shut down');
  }
}

async function publishEvent(channel, event) {
  const redisUrl = process.env.REDIS_URL || 'redis://zimmer-archiv-redis:6379';
  const publisher = new Redis(redisUrl);
  
  try {
    await publisher.publish(channel, JSON.stringify(event));
    logger.debug({ channel, event }, 'Event published');
  } finally {
    await publisher.quit();
  }
}

module.exports = {
  SurveyEventSubscriber,
  publishEvent
};
