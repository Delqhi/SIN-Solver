/**
 * Notification Handler - ClawdBot Integration
 * 
 * Sends notifications to Zimmer-09 ClawdBot for:
 * - Task completion alerts
 * - Error notifications
 * - Survey availability alerts
 * - System status updates
 * 
 * Supports multiple channels:
 * - Discord (primary)
 * - Telegram
 * - Email (optional)
 */

class NotificationHandler {
  constructor(logger) {
    this.logger = logger || console;
    this.clawdbotUrl = process.env.CLAWDBOT_URL || 'http://zimmer-09-clawdbot:8080';
    this.enabled = process.env.NOTIFICATIONS_ENABLED !== 'false';
    this.defaultChannel = process.env.NOTIFICATION_CHANNEL || 'discord';
  }

  async init() {
    if (!this.enabled) {
      this.logger.info('📢 Notifications disabled');
      return;
    }

    try {
      const response = await fetch(`${this.clawdbotUrl}/health`);
      if (response.ok) {
        this.logger.info('📢 NotificationHandler connected to ClawdBot');
      } else {
        this.logger.warn('⚠️ ClawdBot not responding, notifications may fail');
      }
    } catch (error) {
      this.logger.warn({ error: error.message }, '⚠️ ClawdBot connection failed');
    }
  }

  async notifySuccess(task) {
    if (!this.enabled) return;

    const message = this.formatSuccessMessage(task);
    await this.send({
      type: 'success',
      title: `✅ Task Completed: ${task.platform}`,
      message,
      data: {
        taskId: task.id,
        platform: task.platform,
        action: task.action,
        result: this.summarizeResult(task.result)
      }
    });
  }

  async notifyFailure(task) {
    if (!this.enabled) return;

    const message = this.formatFailureMessage(task);
    await this.send({
      type: 'error',
      title: `❌ Task Failed: ${task.platform}`,
      message,
      severity: 'warning',
      data: {
        taskId: task.id,
        platform: task.platform,
        action: task.action,
        error: task.error
      }
    });
  }

  async notifySurveyAvailable(platform, surveyCount) {
    if (!this.enabled) return;

    await this.send({
      type: 'info',
      title: `📋 Surveys Available: ${platform}`,
      message: `Found ${surveyCount} new surveys on ${platform}`,
      data: {
        platform,
        surveyCount,
        timestamp: new Date().toISOString()
      }
    });
  }

  async notifyCaptchaSolved(captchaType, platform) {
    if (!this.enabled) return;

    await this.send({
      type: 'info',
      title: `🔓 Captcha Solved`,
      message: `Successfully solved ${captchaType} captcha on ${platform}`,
      data: {
        captchaType,
        platform,
        timestamp: new Date().toISOString()
      }
    });
  }

  async notifyBanRisk(platform, reason) {
    if (!this.enabled) return;

    await this.send({
      type: 'warning',
      title: `⚠️ Ban Risk Detected: ${platform}`,
      message: `Potential ban risk on ${platform}: ${reason}`,
      severity: 'high',
      data: {
        platform,
        reason,
        timestamp: new Date().toISOString()
      }
    });
  }

  async notifyEarnings(platform, amount, currency = 'EUR') {
    if (!this.enabled) return;

    await this.send({
      type: 'success',
      title: `💰 Earnings: ${platform}`,
      message: `Earned ${amount} ${currency} on ${platform}`,
      data: {
        platform,
        amount,
        currency,
        timestamp: new Date().toISOString()
      }
    });
  }

  async sendCustom(title, message, type = 'info', data = {}) {
    if (!this.enabled) return;

    await this.send({
      type,
      title,
      message,
      data
    });
  }

  async send(notification) {
    try {
      const endpoint = this.getEndpoint(notification.type);
      
      const response = await fetch(`${this.clawdbotUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: this.defaultChannel,
          ...notification
        }),
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`ClawdBot returned ${response.status}`);
      }

      this.logger.debug({ title: notification.title }, '📢 Notification sent');

    } catch (error) {
      this.logger.warn({ error: error.message, title: notification.title }, '⚠️ Failed to send notification');
    }
  }

  getEndpoint(type) {
    switch (type) {
      case 'success':
        return '/api/notify';
      case 'error':
      case 'warning':
        return '/api/alert';
      case 'info':
      default:
        return '/api/message';
    }
  }

  formatSuccessMessage(task) {
    const parts = [
      `Platform: ${task.platform}`,
      `Action: ${task.action}`,
      `Duration: ${this.calculateDuration(task)}`,
    ];

    if (task.result?.surveyCount !== undefined) {
      parts.push(`Surveys Found: ${task.result.surveyCount}`);
    }

    if (task.result?.earnings !== undefined) {
      parts.push(`Earnings: ${task.result.earnings}`);
    }

    return parts.join('\n');
  }

  formatFailureMessage(task) {
    return [
      `Platform: ${task.platform}`,
      `Action: ${task.action}`,
      `Error: ${task.error}`,
      `Duration: ${this.calculateDuration(task)}`
    ].join('\n');
  }

  calculateDuration(task) {
    if (!task.startedAt || !task.completedAt) {
      return 'N/A';
    }

    const start = new Date(task.startedAt);
    const end = new Date(task.completedAt);
    const durationMs = end - start;

    if (durationMs < 1000) {
      return `${durationMs}ms`;
    } else if (durationMs < 60000) {
      return `${(durationMs / 1000).toFixed(1)}s`;
    } else {
      return `${(durationMs / 60000).toFixed(1)}m`;
    }
  }

  summarizeResult(result) {
    if (!result) return null;

    // Return only key metrics, not full data
    const summary = {};
    
    if (result.surveyCount !== undefined) summary.surveyCount = result.surveyCount;
    if (result.earnings !== undefined) summary.earnings = result.earnings;
    if (result.cookieCount !== undefined) summary.cookieCount = result.cookieCount;
    if (result.success !== undefined) summary.success = result.success;
    
    return Object.keys(summary).length > 0 ? summary : null;
  }
}

module.exports = { NotificationHandler };
