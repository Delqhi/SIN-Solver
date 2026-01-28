/**
 * SIN-Solver Clawdbot - Social Media Manager
 * Unified interface for social media posting (Twitter/X, Instagram, TikTok, YouTube)
 * 
 * @version 1.0.0
 * @author SIN-Solver Empire
 */

const pino = require('pino');
const fs = require('fs').promises;
const path = require('path');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined
}).child({ module: 'social-manager' });

/**
 * SocialMediaManager - Central manager for all social media operations
 */
class SocialMediaManager {
  static instance = null;

  constructor() {
    if (SocialMediaManager.instance) {
      return SocialMediaManager.instance;
    }

    this.platforms = new Map();
    this.postHistory = [];
    this.maxHistorySize = 500;
    this.scheduledPosts = [];

    SocialMediaManager.instance = this;
  }

  static getInstance() {
    if (!SocialMediaManager.instance) {
      SocialMediaManager.instance = new SocialMediaManager();
    }
    return SocialMediaManager.instance;
  }

  /**
   * Register a social media platform
   * @param {string} name - Platform name
   * @param {BaseSocialPlatform} platform - Platform instance
   */
  register(name, platform) {
    this.platforms.set(name, platform);
    logger.info({ platform: name }, 'Social platform registered');
  }

  /**
   * Get a platform by name
   * @param {string} name - Platform name
   * @returns {BaseSocialPlatform|null}
   */
  get(name) {
    return this.platforms.get(name) || null;
  }

  /**
   * Initialize all platforms
   */
  async initializeAll() {
    const results = {};

    for (const [name, platform] of this.platforms) {
      try {
        await platform.initialize();
        results[name] = { success: true };
        logger.info({ platform: name }, 'Platform initialized');
      } catch (error) {
        results[name] = { success: false, error: error.message };
        logger.error({ platform: name, error: error.message }, 'Platform initialization failed');
      }
    }

    return results;
  }

  /**
   * Post content to multiple platforms
   * @param {Object} content - Post content
   * @param {string[]} platformNames - Target platforms
   * @returns {Promise<Object>} Results per platform
   */
  async post(content, platformNames = ['all']) {
    const results = {};
    const targets = platformNames.includes('all')
      ? Array.from(this.platforms.keys())
      : platformNames;

    for (const name of targets) {
      const platform = this.platforms.get(name);
      if (!platform) {
        results[name] = { success: false, error: 'Platform not found' };
        continue;
      }

      try {
        const result = await platform.post(content);
        results[name] = { success: true, ...result };

        this.recordPost({
          platform: name,
          content: content.text || content.caption,
          mediaType: content.mediaPath ? 'video' : 'text',
          postId: result.postId,
          url: result.url,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        results[name] = { success: false, error: error.message };
        logger.error({ platform: name, error: error.message }, 'Post failed');
      }
    }

    return results;
  }

  /**
   * Post video to platforms
   * @param {Object} options - Video options
   * @returns {Promise<Object>} Results per platform
   */
  async postVideo(options) {
    const { videoPath, platforms, title, description, hashtags, scheduledTime } = options;

    // Verify video exists
    try {
      await fs.access(videoPath);
    } catch {
      return {
        success: false,
        error: 'Video file not found',
        platforms: {}
      };
    }

    const content = {
      type: 'video',
      mediaPath: videoPath,
      title,
      caption: `${title}\n\n${description || ''}\n\n${(hashtags || []).map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}`,
      description,
      hashtags: hashtags || [],
      scheduledTime
    };

    // If scheduled, add to queue
    if (scheduledTime && new Date(scheduledTime) > new Date()) {
      const scheduledPost = {
        id: Date.now().toString(36),
        content,
        platforms,
        scheduledTime: new Date(scheduledTime).toISOString(),
        status: 'scheduled'
      };
      this.scheduledPosts.push(scheduledPost);
      return {
        success: true,
        scheduled: true,
        postId: scheduledPost.id,
        scheduledTime: scheduledPost.scheduledTime
      };
    }

    return this.post(content, platforms);
  }

  /**
   * Post text/image to platforms
   * @param {Object} options - Post options
   * @returns {Promise<Object>} Results
   */
  async postText(options) {
    const { text, imagePath, platforms, hashtags } = options;

    const content = {
      type: imagePath ? 'image' : 'text',
      text: `${text}\n\n${(hashtags || []).map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}`,
      mediaPath: imagePath
    };

    return this.post(content, platforms);
  }

  /**
   * Record post in history
   * @param {Object} record
   */
  recordPost(record) {
    this.postHistory.push(record);
    if (this.postHistory.length > this.maxHistorySize) {
      this.postHistory.shift();
    }
  }

  /**
   * Get post history
   * @param {number} limit
   * @param {string} platform - Filter by platform
   */
  getHistory(limit = 50, platform = null) {
    let history = this.postHistory;
    if (platform) {
      history = history.filter(p => p.platform === platform);
    }
    return history.slice(-limit).reverse();
  }

  /**
   * Get scheduled posts
   */
  getScheduledPosts() {
    return this.scheduledPosts.filter(p => p.status === 'scheduled');
  }

  /**
   * Cancel scheduled post
   * @param {string} postId
   */
  cancelScheduledPost(postId) {
    const post = this.scheduledPosts.find(p => p.id === postId);
    if (post) {
      post.status = 'cancelled';
      return true;
    }
    return false;
  }

  /**
   * Get status of all platforms
   */
  getStatus() {
    const status = {};

    for (const [name, platform] of this.platforms) {
      status[name] = {
        connected: platform.isConnected(),
        authenticated: platform.isAuthenticated(),
        type: platform.constructor.name
      };
    }

    return {
      platforms: status,
      historySize: this.postHistory.length,
      scheduledCount: this.scheduledPosts.filter(p => p.status === 'scheduled').length
    };
  }

  /**
   * Process scheduled posts (call this periodically)
   */
  async processScheduledPosts() {
    const now = new Date();
    const duePost = this.scheduledPosts.filter(
      p => p.status === 'scheduled' && new Date(p.scheduledTime) <= now
    );

    for (const post of duePost) {
      try {
        post.status = 'posting';
        const results = await this.post(post.content, post.platforms);
        post.status = 'posted';
        post.results = results;
        logger.info({ postId: post.id }, 'Scheduled post published');
      } catch (error) {
        post.status = 'failed';
        post.error = error.message;
        logger.error({ postId: post.id, error: error.message }, 'Scheduled post failed');
      }
    }

    return duePost.length;
  }

  /**
   * Shutdown all platforms
   */
  async shutdown() {
    for (const [name, platform] of this.platforms) {
      try {
        await platform.shutdown();
        logger.info({ platform: name }, 'Platform shutdown complete');
      } catch (error) {
        logger.error({ platform: name, error: error.message }, 'Platform shutdown error');
      }
    }
    this.platforms.clear();
  }
}

/**
 * BaseSocialPlatform - Abstract base class for social platforms
 */
class BaseSocialPlatform {
  constructor(name, config = {}) {
    this.name = name;
    this.config = config;
    this.connected = false;
    this.authenticated = false;
    this.logger = logger.child({ platform: name });
  }

  async initialize() {
    throw new Error('initialize() must be implemented');
  }

  async post(content) {
    throw new Error('post() must be implemented');
  }

  async postVideo(videoPath, options) {
    throw new Error('postVideo() must be implemented');
  }

  isConnected() {
    return this.connected;
  }

  isAuthenticated() {
    return this.authenticated;
  }

  async shutdown() {
    this.connected = false;
    this.authenticated = false;
  }
}

module.exports = {
  SocialMediaManager,
  BaseSocialPlatform
};
