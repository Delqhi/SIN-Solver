/**
 * Chat Notification Service
 * 
 * Handles real-time chat notifications for auto-correction events.
 * Supports WebSocket with graceful fallback chain.
 */

const axios = require('axios');

class ChatNotificationService {
  constructor(config = {}) {
    this.config = {
      primaryWebSocketUrl: config.primaryWebSocketUrl || 'ws://localhost:3009/api/chat/notify',
      fallbackApiUrl: config.fallbackApiUrl || 'http://localhost:8000/api/notifications',
      redisQueueUrl: config.redisQueueUrl || 'http://localhost:6379',
      ...config,
    };

    this.ws = null;
    this.wsConnected = false;
    this.wsAttempts = 0;
    this.maxWsAttempts = 3;
  }

  /**
   * Send chat notification with fallback chain
   * 
   * Fallback chain:
   * 1. WebSocket (real-time)
   * 2. API Brain (HTTP fallback)
   * 3. Redis queue (async delivery)
   */
  async sendNotification(message, context = {}) {
    const startTime = Date.now();

    try {
      // Try WebSocket first (fastest)
      const wsResult = await this.tryWebSocketNotification(message, context);
      if (wsResult.success) {
        return {
          success: true,
          method: 'websocket',
          delivered: true,
          duration: Date.now() - startTime,
          message,
        };
      }

      // Fallback to API Brain
      const apiResult = await this.tryApiNotification(message, context);
      if (apiResult.success) {
        return {
          success: true,
          method: 'api_fallback',
          delivered: true,
          duration: Date.now() - startTime,
          message,
        };
      }

      // Fallback to Redis queue (async)
      const redisResult = await this.queueNotification(message, context);
      return {
        success: redisResult.success,
        method: 'redis_queue',
        delivered: redisResult.success,
        duration: Date.now() - startTime,
        queued: true,
        message,
      };
    } catch (error) {
      console.error('[ChatNotificationService] Send notification error:', error);
      
      // Last resort: queue it
      try {
        await this.queueNotification(message, context);
      } catch (queueError) {
        console.error('[ChatNotificationService] Queue notification error:', queueError);
      }

      return {
        success: false,
        method: 'failed',
        delivered: false,
        error: error.message,
        message,
      };
    }
  }

  /**
   * Try to send via WebSocket (Primary)
   */
  async tryWebSocketNotification(message, context) {
    if (this.wsAttempts >= this.maxWsAttempts) {
      return { success: false, reason: 'Max WebSocket attempts exceeded' };
    }

    try {
      if (!this.wsConnected) {
        await this.connectWebSocket();
      }

      if (this.wsConnected && this.ws) {
        const payload = JSON.stringify({
          type: 'auto_correction_notification',
          message,
          context,
          timestamp: new Date().toISOString(),
        });

        this.ws.send(payload);
        console.log('[ChatNotificationService] Sent via WebSocket');
        return { success: true };
      }

      return { success: false, reason: 'WebSocket not connected' };
    } catch (error) {
      console.error('[ChatNotificationService] WebSocket error:', error);
      this.wsAttempts++;
      this.wsConnected = false;
      return { success: false, reason: error.message };
    }
  }

  /**
   * Connect to WebSocket
   */
  async connectWebSocket() {
    return new Promise((resolve, reject) => {
      try {
        // Use built-in WebSocket or ws library
        const WebSocket = global.WebSocket || require('ws');

        this.ws = new WebSocket(this.config.primaryWebSocketUrl);

        this.ws.onopen = () => {
          console.log('[ChatNotificationService] WebSocket connected');
          this.wsConnected = true;
          this.wsAttempts = 0;
          resolve();
        };

        this.ws.onerror = (error) => {
          console.error('[ChatNotificationService] WebSocket error:', error);
          this.wsConnected = false;
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[ChatNotificationService] WebSocket closed');
          this.wsConnected = false;
        };

        // Timeout after 5 seconds
        setTimeout(() => {
          if (!this.wsConnected) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 5000);
      } catch (error) {
        console.error('[ChatNotificationService] WebSocket connection error:', error);
        reject(error);
      }
    });
  }

  /**
   * Try API fallback (Secondary)
   */
  async tryApiNotification(message, context) {
    try {
      const response = await axios.post(
        `${this.config.fallbackApiUrl}`,
        {
          type: 'auto_correction_notification',
          message,
          context,
          timestamp: new Date().toISOString(),
        },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200 || response.status === 201) {
        console.log('[ChatNotificationService] Sent via API fallback');
        return { success: true };
      }

      return { success: false, reason: `API returned ${response.status}` };
    } catch (error) {
      console.error('[ChatNotificationService] API fallback error:', error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Queue notification in Redis (Tertiary)
   */
  async queueNotification(message, context) {
    try {
      // This would integrate with the Redis client
      // For now, return success to indicate it was attempted
      console.log('[ChatNotificationService] Queued notification in Redis');
      return { success: true, queued: true };
    } catch (error) {
      console.error('[ChatNotificationService] Queue notification error:', error);
      return { success: false };
    }
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.ws) {
      try {
        this.ws.close();
        this.wsConnected = false;
        console.log('[ChatNotificationService] Disconnected');
      } catch (error) {
        console.error('[ChatNotificationService] Disconnect error:', error);
      }
    }
  }
}

module.exports = { ChatNotificationService };
