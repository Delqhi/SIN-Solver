/**
 * SIN-Solver Clawdbot - Twitter/X Social Platform
 * Uses Playwright/Stagehand for browser automation (FREE)
 * 
 * @version 1.0.0
 * @author SIN-Solver Empire
 */

const { BaseSocialPlatform } = require('./manager');
const axios = require('axios');
const fs = require('fs').promises;

/**
 * TwitterPlatform - Browser-based Twitter/X posting
 * Uses Steel Browser or local Playwright for automation
 */
class TwitterPlatform extends BaseSocialPlatform {
  constructor(config = {}) {
    super('twitter', config);
    this.steelUrl = config.steelUrl || process.env.STEEL_BROWSER_URL || 'http://zimmer-05-steel-stealth:3000';
    this.maxTextLength = 280;
    this.credentials = {
      username: config.username || process.env.TWITTER_USERNAME,
      password: config.password || process.env.TWITTER_PASSWORD
    };
  }

  async initialize() {
    try {
      // Check Steel Browser availability
      const response = await axios.get(`${this.steelUrl}/health`, { timeout: 5000 });
      this.connected = response.status === 200;
      
      // Check if we have credentials
      this.authenticated = !!(this.credentials.username && this.credentials.password);
      
      this.logger.info({
        connected: this.connected,
        authenticated: this.authenticated
      }, 'Twitter platform initialized');
    } catch (error) {
      this.connected = false;
      this.logger.warn({ error: error.message }, 'Steel Browser not available');
    }
  }

  async post(content) {
    if (!this.connected) {
      throw new Error('Steel Browser not connected');
    }

    if (!this.authenticated) {
      throw new Error('Twitter credentials not configured');
    }

    const { text, mediaPath, type } = content;
    
    // Truncate text if needed
    const tweetText = text.slice(0, this.maxTextLength);

    try {
      // Use Steel Browser to post
      const response = await axios.post(`${this.steelUrl}/api/twitter/post`, {
        text: tweetText,
        mediaPath: mediaPath,
        mediaType: type === 'video' ? 'video' : type === 'image' ? 'image' : null,
        credentials: this.credentials
      }, { timeout: 120000 });

      return {
        success: true,
        postId: response.data.postId,
        url: response.data.url
      };
    } catch (error) {
      this.logger.error({ error: error.message }, 'Twitter post failed');
      throw error;
    }
  }

  async postVideo(videoPath, options = {}) {
    const { title, description, hashtags } = options;
    
    // Build tweet text
    let text = title || '';
    if (hashtags && hashtags.length > 0) {
      text += '\n' + hashtags.slice(0, 3).map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
    }

    return this.post({
      type: 'video',
      text,
      mediaPath: videoPath
    });
  }
}

/**
 * InstagramPlatform - Browser-based Instagram posting
 * Uses Playwright/Stagehand for automation
 */
class InstagramPlatform extends BaseSocialPlatform {
  constructor(config = {}) {
    super('instagram', config);
    this.steelUrl = config.steelUrl || process.env.STEEL_BROWSER_URL || 'http://zimmer-05-steel-stealth:3000';
    this.maxCaptionLength = 2200;
    this.credentials = {
      username: config.username || process.env.INSTAGRAM_USERNAME,
      password: config.password || process.env.INSTAGRAM_PASSWORD
    };
  }

  async initialize() {
    try {
      const response = await axios.get(`${this.steelUrl}/health`, { timeout: 5000 });
      this.connected = response.status === 200;
      this.authenticated = !!(this.credentials.username && this.credentials.password);
      
      this.logger.info({
        connected: this.connected,
        authenticated: this.authenticated
      }, 'Instagram platform initialized');
    } catch (error) {
      this.connected = false;
      this.logger.warn({ error: error.message }, 'Steel Browser not available');
    }
  }

  async post(content) {
    if (!this.connected) {
      throw new Error('Steel Browser not connected');
    }

    if (!this.authenticated) {
      throw new Error('Instagram credentials not configured');
    }

    const { caption, mediaPath, type } = content;
    
    if (!mediaPath) {
      throw new Error('Instagram requires media (image or video)');
    }

    const captionText = (caption || '').slice(0, this.maxCaptionLength);

    try {
      const response = await axios.post(`${this.steelUrl}/api/instagram/post`, {
        caption: captionText,
        mediaPath,
        mediaType: type === 'video' ? 'reel' : 'post',
        credentials: this.credentials
      }, { timeout: 180000 });

      return {
        success: true,
        postId: response.data.postId,
        url: response.data.url
      };
    } catch (error) {
      this.logger.error({ error: error.message }, 'Instagram post failed');
      throw error;
    }
  }

  async postVideo(videoPath, options = {}) {
    const { title, description, hashtags } = options;
    
    let caption = title || '';
    if (description) {
      caption += '\n\n' + description;
    }
    if (hashtags && hashtags.length > 0) {
      caption += '\n\n' + hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
    }

    return this.post({
      type: 'video',
      caption,
      mediaPath: videoPath
    });
  }
}

/**
 * TikTokPlatform - Browser-based TikTok posting
 */
class TikTokPlatform extends BaseSocialPlatform {
  constructor(config = {}) {
    super('tiktok', config);
    this.steelUrl = config.steelUrl || process.env.STEEL_BROWSER_URL || 'http://zimmer-05-steel-stealth:3000';
    this.maxCaptionLength = 150;
    this.credentials = {
      username: config.username || process.env.TIKTOK_USERNAME,
      password: config.password || process.env.TIKTOK_PASSWORD
    };
  }

  async initialize() {
    try {
      const response = await axios.get(`${this.steelUrl}/health`, { timeout: 5000 });
      this.connected = response.status === 200;
      this.authenticated = !!(this.credentials.username && this.credentials.password);
      
      this.logger.info({
        connected: this.connected,
        authenticated: this.authenticated
      }, 'TikTok platform initialized');
    } catch (error) {
      this.connected = false;
      this.logger.warn({ error: error.message }, 'Steel Browser not available');
    }
  }

  async post(content) {
    if (!this.connected) {
      throw new Error('Steel Browser not connected');
    }

    if (!this.authenticated) {
      throw new Error('TikTok credentials not configured');
    }

    const { caption, mediaPath, type } = content;
    
    if (type !== 'video' || !mediaPath) {
      throw new Error('TikTok only supports video posts');
    }

    const captionText = (caption || '').slice(0, this.maxCaptionLength);

    try {
      const response = await axios.post(`${this.steelUrl}/api/tiktok/post`, {
        caption: captionText,
        videoPath: mediaPath,
        credentials: this.credentials
      }, { timeout: 300000 }); // 5 min timeout for video upload

      return {
        success: true,
        postId: response.data.postId,
        url: response.data.url
      };
    } catch (error) {
      this.logger.error({ error: error.message }, 'TikTok post failed');
      throw error;
    }
  }

  async postVideo(videoPath, options = {}) {
    const { title, hashtags } = options;
    
    let caption = title || '';
    if (hashtags && hashtags.length > 0) {
      caption += ' ' + hashtags.slice(0, 5).map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
    }

    return this.post({
      type: 'video',
      caption,
      mediaPath: videoPath
    });
  }
}

/**
 * YouTubePlatform - YouTube Shorts posting via API
 * Requires OAuth2 authentication
 */
class YouTubePlatform extends BaseSocialPlatform {
  constructor(config = {}) {
    super('youtube', config);
    this.apiUrl = 'https://www.googleapis.com/upload/youtube/v3/videos';
    this.credentials = {
      clientId: config.clientId || process.env.YOUTUBE_CLIENT_ID,
      clientSecret: config.clientSecret || process.env.YOUTUBE_CLIENT_SECRET,
      refreshToken: config.refreshToken || process.env.YOUTUBE_REFRESH_TOKEN
    };
    this.accessToken = null;
    this.maxTitleLength = 100;
    this.maxDescriptionLength = 5000;
  }

  async initialize() {
    try {
      if (this.credentials.clientId && this.credentials.clientSecret && this.credentials.refreshToken) {
        await this.refreshAccessToken();
        this.authenticated = !!this.accessToken;
      }
      this.connected = true;
      
      this.logger.info({
        connected: this.connected,
        authenticated: this.authenticated
      }, 'YouTube platform initialized');
    } catch (error) {
      this.connected = false;
      this.logger.warn({ error: error.message }, 'YouTube authentication failed');
    }
  }

  async refreshAccessToken() {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        refresh_token: this.credentials.refreshToken,
        grant_type: 'refresh_token'
      });

      this.accessToken = response.data.access_token;
      this.authenticated = true;
    } catch (error) {
      this.logger.error({ error: error.message }, 'Token refresh failed');
      throw error;
    }
  }

  async post(content) {
    if (!this.authenticated) {
      throw new Error('YouTube not authenticated');
    }

    const { title, description, mediaPath, hashtags } = content;
    
    if (!mediaPath) {
      throw new Error('YouTube requires video');
    }

    // Build description with hashtags
    let fullDescription = description || '';
    if (hashtags && hashtags.length > 0) {
      fullDescription += '\n\n' + hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
    }

    try {
      // Read video file
      const videoBuffer = await fs.readFile(mediaPath);

      // Upload video
      const response = await axios.post(
        `${this.apiUrl}?uploadType=multipart&part=snippet,status`,
        {
          snippet: {
            title: (title || 'Untitled').slice(0, this.maxTitleLength),
            description: fullDescription.slice(0, this.maxDescriptionLength),
            tags: hashtags?.map(h => h.replace('#', '')) || [],
            categoryId: '22' // People & Blogs
          },
          status: {
            privacyStatus: 'public',
            selfDeclaredMadeForKids: false
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 600000 // 10 min timeout
        }
      );

      return {
        success: true,
        postId: response.data.id,
        url: `https://youtube.com/shorts/${response.data.id}`
      };
    } catch (error) {
      this.logger.error({ error: error.message }, 'YouTube upload failed');
      throw error;
    }
  }

  async postVideo(videoPath, options = {}) {
    return this.post({
      type: 'video',
      mediaPath: videoPath,
      ...options
    });
  }
}

module.exports = {
  TwitterPlatform,
  InstagramPlatform,
  TikTokPlatform,
  YouTubePlatform
};
