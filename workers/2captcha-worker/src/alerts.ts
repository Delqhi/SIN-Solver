/**
 * @file alerts.ts - Alert System for 2Captcha Worker
 * @description
 * Sends critical event notifications via Telegram and optionally Slack.
 * Prevents spam with rate limiting and deduplication.
 * Supports priority-based alerts (info, warning, critical).
 */

import { EventEmitter } from 'events';
import type { WorkerStats } from './types';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type AlertPriority = 'info' | 'warning' | 'critical';

export interface AlertConfig {
  /** Telegram bot token (from @BotFather) */
  telegramBotToken?: string;
  /** Telegram chat ID for alerts */
  telegramChatId?: string;
  /** Slack webhook URL */
  slackWebhookUrl?: string;
  /** Rate limit: minimum seconds between same alert type */
  rateLimitSeconds?: number;
  /** Enable Telegram alerts */
  enableTelegram?: boolean;
  /** Enable Slack alerts */
  enableSlack?: boolean;
  /** Enable console logging */
  enableConsole?: boolean;
  /** Alert threshold: accuracy % below which warning is triggered */
  accuracyWarningThreshold?: number;
  /** Emergency stop threshold: accuracy % below which worker stops */
  emergencyStopThreshold?: number;
}

export interface AlertMessage {
  priority: AlertPriority;
  type: string;
  message: string;
  timestamp: Date;
  data?: Record<string, any>;
}

// ============================================================================
// EMOJI MAP
// ============================================================================

const EMOJI_MAP: Record<AlertPriority, string> = {
  info: '📊',
  warning: '⚠️',
  critical: '🚨'
};

// ============================================================================
// ALERT SYSTEM CLASS
// ============================================================================

export class AlertSystemEventBus extends EventEmitter {
  private botToken: string;
  private chatId: string;
  private slackWebhookUrl?: string;
  private enableTelegram: boolean;
  private enableSlack: boolean;
  private enableConsole: boolean;
  private rateLimitSeconds: number;
  private accuracyWarningThreshold: number;
  private emergencyStopThreshold: number;

  /** Track last alert time per alert type for rate limiting */
  private lastAlertTime: Map<string, number> = new Map();
  /** Track sent alerts to deduplicate */
  private sentAlerts: Set<string> = new Set();

  constructor(config: AlertConfig = {}) {
    super();

    this.botToken = config.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '';
    this.chatId = config.telegramChatId || process.env.TELEGRAM_CHAT_ID || '';
    this.slackWebhookUrl = config.slackWebhookUrl || process.env.SLACK_WEBHOOK_URL;

    this.enableTelegram = config.enableTelegram !== false && !!this.botToken && !!this.chatId;
    this.enableSlack = config.enableSlack !== false && !!this.slackWebhookUrl;
    this.enableConsole = config.enableConsole !== false;

    this.rateLimitSeconds = config.rateLimitSeconds || 300; // 5 minutes default
    this.accuracyWarningThreshold = config.accuracyWarningThreshold || 95;
    this.emergencyStopThreshold = config.emergencyStopThreshold || 80;

    if (!this.enableTelegram && !this.enableSlack && this.enableConsole) {
      console.warn('[AlertSystem] No alert providers configured. Using console logging only.');
    }
  }

  // ========================================================================
  // MAIN ALERT SENDING
  // ========================================================================

  /**
   * Send alert via all enabled channels
   */
  async sendAlert(
    message: string,
    priority: AlertPriority = 'info',
    type: string = 'generic'
  ): Promise<void> {
    const alert: AlertMessage = {
      priority,
      type,
      message,
      timestamp: new Date()
    };

    // Check rate limiting
    if (!this.shouldSendAlert(type, priority)) {
      return;
    }

    // Log to console
    if (this.enableConsole) {
      this.logToConsole(alert);
    }

    // Send to Telegram
    if (this.enableTelegram) {
      await this.sendTelegram(message, priority).catch(err => {
        console.error('[AlertSystem] Telegram send failed:', err.message);
      });
    }

    // Send to Slack
    if (this.enableSlack) {
      await this.sendSlack(message, priority, type).catch(err => {
        console.error('[AlertSystem] Slack send failed:', err.message);
      });
    }

    // Record sent alert
    this.lastAlertTime.set(type, Date.now());
    this.sentAlerts.add(`${type}-${Date.now()}`);

    // Emit event
    this.emit('alert', alert);
  }

  // ========================================================================
  // TELEGRAM IMPLEMENTATION
  // ========================================================================

  /**
   * Send message via Telegram Bot API
   */
  async sendTelegram(message: string, priority: AlertPriority = 'info'): Promise<void> {
    if (!this.enableTelegram) return;

    if (!this.botToken || !this.chatId) {
      throw new Error('Telegram credentials not configured');
    }

    const emoji = EMOJI_MAP[priority];
    const formattedMessage = `${emoji} *2Captcha Worker Alert* [${priority.toUpperCase()}]\n\n${message}`;

    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: formattedMessage,
          parse_mode: 'Markdown'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Telegram API error: ${error.description}`);
      }
    } catch (error) {
      throw new Error(`Failed to send Telegram alert: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ========================================================================
  // SLACK IMPLEMENTATION
  // ========================================================================

  /**
   * Send message via Slack Webhook
   */
  async sendSlack(
    message: string,
    priority: AlertPriority = 'info',
    type: string = 'generic'
  ): Promise<void> {
    if (!this.enableSlack || !this.slackWebhookUrl) return;

    const colorMap: Record<AlertPriority, string> = {
      info: '#36a64f',
      warning: '#ff9900',
      critical: '#ff0000'
    };

    try {
      const response = await fetch(this.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attachments: [
            {
              color: colorMap[priority],
              title: `2Captcha Worker Alert - ${type}`,
              text: message,
              ts: Math.floor(Date.now() / 1000)
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.statusText}`);
      }
    } catch (error) {
      throw new Error(`Failed to send Slack alert: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // ========================================================================
  // ALERT TYPES - ACCURACY & PERFORMANCE
  // ========================================================================

  /**
   * Send accuracy warning when accuracy drops below threshold
   */
  async accuracyWarning(
    currentAccuracy: number,
    threshold: number = this.accuracyWarningThreshold
  ): Promise<void> {
    const message = `⚠️ *Accuracy Warning*\n\nCurrent accuracy: *${currentAccuracy.toFixed(1)}%*\nThreshold: *${threshold}%*\n\nLast 10 submissions below 95% success rate.`;

    await this.sendAlert(message, 'warning', 'accuracy-warning');
  }

  /**
   * Send timeout warning alert
   */
  async timeoutWarning(
    source: string,
    remainingMs: number,
    context?: Record<string, any>
  ): Promise<void> {
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    const contextStr = context ? `\n\nContext: ${JSON.stringify(context, null, 2)}` : '';
    
    const message = `⏰ *Timeout Warning*

Source: *${source}*
Time Remaining: *${remainingSeconds}s* (${remainingMs}ms)${contextStr}

Timestamp: ${new Date().toISOString()}`;

    await this.sendAlert(message, 'warning', 'timeout-warning');
  }

  /**
   * Send emergency stop notification
   */
  async emergencyStop(accuracy: number, reason: string = 'Accuracy too low'): Promise<void> {
    const message = `🚨 *EMERGENCY STOP*\n\nReason: ${reason}\nAccuracy: *${accuracy.toFixed(1)}%*\nThreshold: *${this.emergencyStopThreshold}%*\n\nWorker stopped automatically for safety.`;

    await this.sendAlert(message, 'critical', 'emergency-stop');
  }

  /**
   * Send daily performance report
   */
  async dailyReport(stats: WorkerStats): Promise<void> {
    const successRate = stats.total > 0 ? ((stats.successful / stats.total) * 100).toFixed(1) : '0.0';
    const message = `📊 *Daily Report*

*Performance Metrics:*
CAPTCHA Solved: *${stats.successful}/${stats.total}*
Success Rate: *${successRate}%*
Accuracy: *${stats.accuracy.toFixed(1)}%*

*Financial:*
Earnings: *$${stats.earnings.toFixed(2)}*
Average per CAPTCHA: *$${stats.averageEarnings.toFixed(4)}*

*Session Time:*
Duration: *${Math.floor(stats.totalTime / 60)} minutes*
Average per CAPTCHA: *${(stats.averageTime / 1000).toFixed(2)}s*

*Timestamp:* ${new Date().toISOString()}`;

    await this.sendAlert(message, 'info', 'daily-report');
  }

  /**
   * Send hourly status update
   */
  async hourlyStatus(stats: WorkerStats): Promise<void> {
    const successRate = stats.total > 0 ? ((stats.successful / stats.total) * 100).toFixed(1) : '0.0';
    const message = `📈 *Hourly Status*

Solved: *${stats.successful}/${stats.total}*
Success Rate: *${successRate}%*
Earnings: *$${stats.earnings.toFixed(2)}*
Accuracy: *${stats.accuracy.toFixed(1)}%*`;

    await this.sendAlert(message, 'info', 'hourly-status');
  }

  // ========================================================================
  // ALERT TYPES - ERRORS & ISSUES
  // ========================================================================

  /**
   * Send error alert
   */
  async errorAlert(error: Error | string, context?: Record<string, any>): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const contextStr = context ? `\n\nContext: ${JSON.stringify(context, null, 2)}` : '';

    const message = `*Error Occurred*

Message: \`${errorMessage}\`${contextStr}

Timestamp: ${new Date().toISOString()}`;

    await this.sendAlert(message, 'warning', 'error');
  }

  /**
   * Send authentication failure alert
   */
  async authenticationFailure(reason: string): Promise<void> {
    const message = `*Authentication Failed*

Reason: ${reason}

Please check credentials and 2Captcha account status.`;

    await this.sendAlert(message, 'critical', 'auth-failure');
  }

  /**
   * Send network connectivity issue alert
   */
  async networkIssue(message: string, retryCount: number = 0): Promise<void> {
    const alertMessage = `*Network Issue Detected*

Issue: ${message}
Retry Attempts: *${retryCount}*

Timestamp: ${new Date().toISOString()}`;

    await this.sendAlert(alertMessage, 'warning', 'network-issue');
  }

  /**
   * Send worker startup notification
   */
  async workerStarted(config?: Record<string, any>): Promise<void> {
    const configStr = config ? `\n\nConfiguration:\n${JSON.stringify(config, null, 2)}` : '';
    const message = `✅ *Worker Started*

Status: Running
Timestamp: ${new Date().toISOString()}${configStr}`;

    await this.sendAlert(message, 'info', 'worker-started');
  }

  /**
   * Send worker shutdown notification
   */
  async workerStopped(reason: string = 'Manual stop'): Promise<void> {
    const message = `⏹️ *Worker Stopped*

Reason: ${reason}
Timestamp: ${new Date().toISOString()}`;

    await this.sendAlert(message, 'info', 'worker-stopped');
  }

  // ========================================================================
  // ALERT TYPES - CAPTCHA SPECIFIC
  // ========================================================================

  /**
   * Send captcha detection issue alert
   */
  async captchaDetectionFailed(details: string): Promise<void> {
    const message = `*CAPTCHA Detection Failed*

Details: ${details}

This may indicate:
- Browser anti-detection failed
- CAPTCHA format changed
- Network issue`;

    await this.sendAlert(message, 'warning', 'detection-failed');
  }

  /**
   * Send consecutive failures alert
   */
  async consecutiveFailures(count: number, threshold: number): Promise<void> {
    const message = `*Consecutive Failures Detected*

Failures: *${count}* (threshold: ${threshold})

This may indicate:
- Account limitations
- IP block
- Detection bypass failure`;

    await this.sendAlert(message, 'critical', 'consecutive-failures');
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  /**
   * Check if alert should be sent (rate limiting + deduplication)
   */
  private shouldSendAlert(type: string, priority: AlertPriority): boolean {
    const lastTime = this.lastAlertTime.get(type) || 0;
    const now = Date.now();
    const minIntervalMs = this.rateLimitSeconds * 1000;

    // Always send critical alerts regardless of rate limit
    if (priority === 'critical') {
      return true;
    }

    // Check rate limiting
    if (now - lastTime < minIntervalMs) {
      return false;
    }

    return true;
  }

  /**
   * Log alert to console
   */
  private logToConsole(alert: AlertMessage): void {
    const emoji = EMOJI_MAP[alert.priority];
    const timestamp = alert.timestamp.toISOString();
    const color = alert.priority === 'critical' ? '\x1b[31m' : alert.priority === 'warning' ? '\x1b[33m' : '\x1b[36m';
    const reset = '\x1b[0m';

    console.log(
      `${color}${emoji} [${alert.priority.toUpperCase()}] ${timestamp}${reset}\n${alert.message}\n`
    );
  }

  /**
   * Get current alert configuration
   */
  getConfig(): Readonly<AlertConfig> {
    return Object.freeze({
      telegramBotToken: this.botToken ? '***' : undefined,
      telegramChatId: this.chatId ? '***' : undefined,
      slackWebhookUrl: this.slackWebhookUrl ? '***' : undefined,
      enableTelegram: this.enableTelegram,
      enableSlack: this.enableSlack,
      enableConsole: this.enableConsole,
      rateLimitSeconds: this.rateLimitSeconds,
      accuracyWarningThreshold: this.accuracyWarningThreshold,
      emergencyStopThreshold: this.emergencyStopThreshold
    });
  }

  /**
   * Check if Telegram is configured
   */
  isTelegramConfigured(): boolean {
    return this.enableTelegram && !!this.botToken && !!this.chatId;
  }

  /**
   * Check if Slack is configured
   */
  isSlackConfigured(): boolean {
    return this.enableSlack && !!this.slackWebhookUrl;
  }

  /**
   * Clear rate limit for specific alert type (for testing/manual reset)
   */
  clearRateLimit(type: string): void {
    this.lastAlertTime.delete(type);
  }

  /**
   * Clear all rate limits
   */
  clearAllRateLimits(): void {
    this.lastAlertTime.clear();
  }
}

// ============================================================================
// EXPORT DEFAULT INSTANCE
// ============================================================================

export const alertSystem = new AlertSystem();

export default AlertSystem;

// ============================================================================
// FACTORY FUNCTION: CREATE ALERTSYSTEM WITH CALLBACKS
// ============================================================================

import type { AlertCallbacks } from './types';

/**
 * Create AlertSystem with callback handlers
 * Bridges callback-based API to EventEmitter pattern
 * 
 * AlertSystem emits 'alert' events with AlertMessage payload.
 * This factory subscribes to those events and routes them to
 * appropriate callbacks based on alert type.
 * 
 * @param config - Alert system configuration (Telegram, Slack, etc.)
 * @param callbacks - Optional callback handlers for alert events
 * @returns Configured AlertSystem instance with event listeners attached
 * 
 * @example
 * ```typescript
 * const alertSystem = createAlertSystemWithCallbacks(
 *   { enableConsole: true },
 *   {
 *     onCaptchaDetected: async (info) => console.log('CAPTCHA:', info),
 *     onError: async (error) => console.error('Error:', error),
 *     onSuccess: async (result) => console.log('Success:', result),
 *     onWarning: async (message) => console.warn('Warning:', message),
 *     onTimeout: async (message) => console.warn('Timeout:', message),
 *   }
 * );
 * ```
 */
export function createAlertSystemWithCallbacks(
  config: AlertConfig = {},
  callbacks: Partial<AlertCallbacks> = {}
): AlertSystem {
  const system = new AlertSystem(config);

  // Subscribe to 'alert' event and route to appropriate callback
  system.on('alert', async (alert: AlertMessage) => {
    try {
      // Route based on alert type
      switch (alert.type) {
        case 'detection-failed':
        case 'consecutive-failures':
          // Route detection-related alerts to onCaptchaDetected
          if (callbacks.onCaptchaDetected && alert.data) {
            await callbacks.onCaptchaDetected({
              id: alert.data.id || `alert-${alert.type}`,
              ...alert.data
            });
          }
          break;

        case 'error':
        case 'auth-failure':
        case 'network-issue':
          // Route error-related alerts to onError
          if (callbacks.onError) {
            const error = new Error(alert.message);
            Object.assign(error, { type: alert.type, data: alert.data });
            await callbacks.onError(error);
          }
          break;

        case 'daily-report':
        case 'hourly-status':
        case 'worker-started':
        case 'worker-stopped':
          // Route success/completion alerts to onSuccess
          if (callbacks.onSuccess) {
            await callbacks.onSuccess({
              message: alert.message,
              type: alert.type,
              data: alert.data
            });
          }
          break;

        case 'accuracy-warning':
        case 'timeout-warning':
          // Route warning alerts to onWarning
          if (callbacks.onWarning) {
            await callbacks.onWarning(alert.message);
          }
          break;

        case 'emergency-stop':
          // Emergency stop is both warning and timeout
          if (callbacks.onTimeout) {
            await callbacks.onTimeout(alert.message);
          }
          break;

        default:
          // Generic handling for unknown alert types
          if (alert.priority === 'critical' && callbacks.onError) {
            const error = new Error(`Critical alert: ${alert.message}`);
            await callbacks.onError(error);
          } else if (alert.priority === 'warning' && callbacks.onWarning) {
            await callbacks.onWarning(alert.message);
          }
      }
    } catch (err) {
      // Prevent callback errors from crashing the system
      console.error('[AlertSystem] Callback error:', err instanceof Error ? err.message : String(err));
    }
  });

  return system;
}
