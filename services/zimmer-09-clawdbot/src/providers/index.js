/**
 * SIN-Solver Clawdbot - MessengerFactory
 * Unified interface for all messaging providers (Telegram, WhatsApp, Discord)
 * 
 * @version 2.0.0
 * @author SIN-Solver Empire
 */

const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined
});

/**
 * MessengerFactory - Singleton factory for messenger providers
 * Provides unified broadcast, status check, and provider management
 */
class MessengerFactory {
  static instance = null;
  
  constructor() {
    if (MessengerFactory.instance) {
      return MessengerFactory.instance;
    }
    
    this.providers = new Map();
    this.initialized = false;
    this.broadcastQueue = [];
    this.messageHistory = [];
    this.maxHistorySize = 1000;
    
    MessengerFactory.instance = this;
  }
  
  /**
   * Get singleton instance
   */
  static getInstance() {
    if (!MessengerFactory.instance) {
      MessengerFactory.instance = new MessengerFactory();
    }
    return MessengerFactory.instance;
  }
  
  /**
   * Register a messenger provider
   * @param {string} name - Provider name (telegram, whatsapp, discord)
   * @param {BaseMessenger} provider - Provider instance
   */
  register(name, provider) {
    if (this.providers.has(name)) {
      logger.warn({ provider: name }, 'Provider already registered, replacing');
    }
    this.providers.set(name, provider);
    logger.info({ provider: name }, 'Messenger provider registered');
  }
  
  /**
   * Unregister a provider
   * @param {string} name - Provider name
   */
  unregister(name) {
    if (this.providers.has(name)) {
      const provider = this.providers.get(name);
      if (provider.shutdown) {
        provider.shutdown();
      }
      this.providers.delete(name);
      logger.info({ provider: name }, 'Provider unregistered');
    }
  }
  
  /**
   * Get a specific provider
   * @param {string} name - Provider name
   * @returns {BaseMessenger|null}
   */
  get(name) {
    return this.providers.get(name) || null;
  }
  
  /**
   * Get all registered providers
   * @returns {Map}
   */
  getAll() {
    return this.providers;
  }
  
  /**
   * Get list of active provider names
   * @returns {string[]}
   */
  getActiveProviders() {
    const active = [];
    for (const [name, provider] of this.providers) {
      if (provider.isConnected && provider.isConnected()) {
        active.push(name);
      }
    }
    return active;
  }
  
  /**
   * Initialize all providers
   */
  async initializeAll() {
    const results = {};
    
    for (const [name, provider] of this.providers) {
      try {
        await provider.initialize();
        results[name] = { success: true };
        logger.info({ provider: name }, 'Provider initialized');
      } catch (error) {
        results[name] = { success: false, error: error.message };
        logger.error({ provider: name, error: error.message }, 'Provider initialization failed');
      }
    }
    
    this.initialized = true;
    
    // Process queued broadcasts
    await this.processQueue();
    
    return results;
  }
  
  /**
   * Broadcast message to specified providers or all
   * @param {string} message - Message to broadcast
   * @param {string} type - Message type (info, success, warning, error, alert)
   * @param {string[]} providerNames - Array of provider names, or ['all'] for all
   * @param {Object} options - Additional options per provider
   */
  async broadcast(message, type = 'info', providerNames = ['all'], options = {}) {
    // Queue if not initialized
    if (!this.initialized) {
      this.broadcastQueue.push({ message, type, providerNames, options, timestamp: Date.now() });
      logger.debug('Broadcast queued (providers not initialized)');
      return { queued: true };
    }
    
    const results = {};
    const targets = providerNames.includes('all') 
      ? Array.from(this.providers.keys())
      : providerNames;
    
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      alert: '🚨',
      survey: '📊',
      earnings: '💰',
      captcha: '🔐'
    };
    
    const formattedMessage = `${icons[type] || 'ℹ️'} *${type.toUpperCase()}*\n\n${message}`;
    
    // Record in history
    this.recordMessage({
      message,
      type,
      targets,
      timestamp: new Date().toISOString()
    });
    
    // Send to all targets in parallel
    const promises = targets.map(async (name) => {
      const provider = this.providers.get(name);
      if (!provider) {
        results[name] = { success: false, error: 'Provider not found' };
        return;
      }
      
      try {
        await provider.broadcast(formattedMessage, type, options[name] || {});
        results[name] = { success: true };
      } catch (error) {
        results[name] = { success: false, error: error.message };
        logger.error({ provider: name, error: error.message }, 'Broadcast failed');
      }
    });
    
    await Promise.allSettled(promises);
    
    return results;
  }
  
  /**
   * Send notification to specific user across providers
   * @param {string} userId - User ID (format: provider:id)
   * @param {string} message - Message content
   * @param {Object} options - Send options
   */
  async sendToUser(userId, message, options = {}) {
    const [providerName, id] = userId.split(':');
    const provider = this.providers.get(providerName);
    
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }
    
    return provider.sendMessage(id, message, options);
  }
  
  /**
   * Process queued broadcasts
   */
  async processQueue() {
    while (this.broadcastQueue.length > 0) {
      const item = this.broadcastQueue.shift();
      // Skip old messages (> 5 minutes)
      if (Date.now() - item.timestamp > 5 * 60 * 1000) {
        logger.debug('Skipping stale queued broadcast');
        continue;
      }
      await this.broadcast(item.message, item.type, item.providerNames, item.options);
    }
  }
  
  /**
   * Record message in history
   * @param {Object} record
   */
  recordMessage(record) {
    this.messageHistory.push(record);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }
  }
  
  /**
   * Get message history
   * @param {number} limit
   */
  getHistory(limit = 50) {
    return this.messageHistory.slice(-limit).reverse();
  }
  
  /**
   * Get status of all providers
   */
  getStatus() {
    const status = {};
    
    for (const [name, provider] of this.providers) {
      status[name] = {
        connected: provider.isConnected ? provider.isConnected() : false,
        users: provider.getAuthorizedUsers ? provider.getAuthorizedUsers().length : 0,
        type: provider.constructor.name
      };
    }
    
    return {
      initialized: this.initialized,
      providers: status,
      queueSize: this.broadcastQueue.length,
      historySize: this.messageHistory.length
    };
  }
  
  /**
   * Shutdown all providers
   */
  async shutdown() {
    logger.info('Shutting down all messenger providers...');
    
    for (const [name, provider] of this.providers) {
      try {
        if (provider.shutdown) {
          await provider.shutdown();
        }
        logger.info({ provider: name }, 'Provider shutdown complete');
      } catch (error) {
        logger.error({ provider: name, error: error.message }, 'Provider shutdown error');
      }
    }
    
    this.providers.clear();
    this.initialized = false;
  }
}

/**
 * BaseMessenger - Abstract base class for messenger providers
 * All providers must extend this class
 */
class BaseMessenger {
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
    this.connected = false;
    this.authorizedUsers = new Set();
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined
    }).child({ provider: name });
  }
  
  /**
   * Initialize the provider
   * Must be implemented by subclasses
   */
  async initialize() {
    throw new Error('initialize() must be implemented');
  }
  
  /**
   * Send message to specific recipient
   * Must be implemented by subclasses
   * @param {string} recipient - Recipient ID
   * @param {string} message - Message content
   * @param {Object} options - Send options
   */
  async sendMessage(recipient, message, options = {}) {
    throw new Error('sendMessage() must be implemented');
  }
  
  /**
   * Broadcast message to all authorized users
   * Must be implemented by subclasses
   * @param {string} message - Message content
   * @param {string} type - Message type
   * @param {Object} options - Broadcast options
   */
  async broadcast(message, type = 'info', options = {}) {
    throw new Error('broadcast() must be implemented');
  }
  
  /**
   * Check if provider is connected
   */
  isConnected() {
    return this.connected;
  }
  
  /**
   * Get list of authorized user IDs
   */
  getAuthorizedUsers() {
    return Array.from(this.authorizedUsers);
  }
  
  /**
   * Authorize a user
   * @param {string} userId
   */
  authorizeUser(userId) {
    this.authorizedUsers.add(userId);
    this.logger.info({ userId }, 'User authorized');
  }
  
  /**
   * Check if user is authorized
   * @param {string} userId
   */
  isAuthorized(userId) {
    return this.authorizedUsers.has(userId);
  }
  
  /**
   * Shutdown the provider
   */
  async shutdown() {
    this.connected = false;
  }
}

module.exports = {
  MessengerFactory,
  BaseMessenger
};
