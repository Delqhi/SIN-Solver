/**
 * @file alerts.ts - Alert System for 2Captcha Worker
 * @description
 * Sends critical event notifications via Telegram and optionally Slack.
 * Prevents spam with rate limiting and deduplication.
 * Supports priority-based alerts (info, warning, critical).
 */

import { EventEmitter } from 'events';
import type { AlertCallbacks, WorkerStats } from './types';

export type AlertPriority = 'info' | 'warning' | 'critical';

export interface AlertConfig {
  telegramBotToken?: string;
  telegramChatId?: string;
  slackWebhookUrl?: string;
  rateLimitSeconds?: number;
  enableTelegram?: boolean;
  enableSlack?: boolean;
  enableConsole?: boolean;
  accuracyWarningThreshold?: number;
  emergencyStopThreshold?: number;
}

export interface AlertMessage {
  priority: AlertPriority;
  type: string;
  message: string;
  timestamp: Date;
  data?: Record<string, any>;
}

const EMOJI_MAP: Record<AlertPriority, string> = {
  info: '📊',
  warning: '⚠️',
  critical: '🚨',
};

export class AlertSystem extends EventEmitter {
  private botToken: string;
  private chatId: string;
  private slackWebhookUrl?: string;
  private enableTelegram: boolean;
  private enableSlack: boolean;
  private enableConsole: boolean;
  private rateLimitSeconds: number;
  private accuracyWarningThreshold: number;
  private emergencyStopThreshold: number;

  private lastAlertTime: Map<string, number> = new Map();
  private sentAlerts: Set<string> = new Set();

  constructor(config: AlertConfig = {}) {
    super();

    this.botToken = config.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN || '';
    this.chatId = config.telegramChatId || process.env.TELEGRAM_CHAT_ID || '';
    this.slackWebhookUrl = config.slackWebhookUrl || process.env.SLACK_WEBHOOK_URL;

    this.enableTelegram = config.enableTelegram !== false && !!this.botToken && !!this.chatId;
    this.enableSlack = config.enableSlack !== false && !!this.slackWebhookUrl;
    this.enableConsole = config.enableConsole !== false;

    this.rateLimitSeconds = config.rateLimitSeconds || 300;
    this.accuracyWarningThreshold = config.accuracyWarningThreshold || 95;
    this.emergencyStopThreshold = config.emergencyStopThreshold || 80;

    if (!this.enableTelegram && !this.enableSlack && this.enableConsole) {
      console.warn('[AlertSystem] No alert providers configured. Using console logging only.');
    }
  }

  async sendAlert(
    priority: AlertPriority,
    type: string,
    message: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    const alert: AlertMessage = {
      priority,
      type,
      message,
      timestamp: new Date(),
      data,
    };

    if (!this.shouldSendAlert(type)) {
      return;
    }

    if (this.enableConsole) {
      this.logToConsole(alert);
    }

    if (this.enableTelegram) {
      await this.sendTelegram(message, priority).catch((err) => {
        console.error('[AlertSystem] Telegram send failed:', err instanceof Error ? err.message : String(err));
      });
    }

    if (this.enableSlack) {
      await this.sendSlack(message, priority, type).catch((err) => {
        console.error('[AlertSystem] Slack send failed:', err instanceof Error ? err.message : String(err));
      });
    }

    this.lastAlertTime.set(type, Date.now());
    this.sentAlerts.add(`${type}-${Date.now()}`);
    this.emit('alert', alert);
  }

  async sendTelegram(message: string, priority: AlertPriority = 'info'): Promise<void> {
    if (!this.enableTelegram) return;

    if (!this.botToken || !this.chatId) {
      throw new Error('Telegram credentials not configured');
    }

    const emoji = EMOJI_MAP[priority];
    const formattedMessage = `${emoji} *2Captcha Worker Alert* [${priority.toUpperCase()}]\n\n${message}`;

    const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.chatId,
        text: formattedMessage,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Telegram API error: ${error.description}`);
    }
  }

  async sendSlack(
    message: string,
    priority: AlertPriority = 'info',
    type: string = 'generic'
  ): Promise<void> {
    if (!this.enableSlack || !this.slackWebhookUrl) return;

    const colorMap: Record<AlertPriority, string> = {
      info: '#36a64f',
      warning: '#ff9900',
      critical: '#ff0000',
    };

    const response = await fetch(this.slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [
          {
            color: colorMap[priority],
            title: `2Captcha Worker Alert - ${type}`,
            text: message,
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }
  }

  async accuracyWarning(
    currentAccuracy: number,
    threshold: number = this.accuracyWarningThreshold
  ): Promise<void> {
    const message = `⚠️ *Accuracy Warning*\n\nCurrent accuracy: *${currentAccuracy.toFixed(1)}%*\nThreshold: *${threshold}%*\n\nLast 10 submissions below 95% success rate.`;

    await this.sendAlert('warning', 'accuracy-warning', message, { currentAccuracy, threshold });
  }

  async timeoutWarning(
    source: string,
    remainingMs: number,
    context?: Record<string, unknown>
  ): Promise<void> {
    const remainingSeconds = Math.ceil(remainingMs / 1000);
    const contextStr = context ? `\n\nContext: ${JSON.stringify(context, null, 2)}` : '';
    const message = `⏰ *Timeout Warning*\n\nSource: *${source}*\nTime Remaining: *${remainingSeconds}s* (${remainingMs}ms)${contextStr}\n\nTimestamp: ${new Date().toISOString()}`;

    await this.sendAlert('warning', 'timeout-warning', message, { source, remainingMs, ...context });
  }

  async emergencyStop(accuracy: number, reason: string = 'Accuracy too low'): Promise<void> {
    const message = `🚨 *EMERGENCY STOP*\n\nReason: ${reason}\nAccuracy: *${accuracy.toFixed(1)}%*\nThreshold: *${this.emergencyStopThreshold}%*\n\nWorker stopped automatically for safety.`;

    await this.sendAlert('critical', 'emergency-stop', message, { accuracy, reason });
  }

  async workerStarted(config?: Record<string, unknown>): Promise<void> {
    const configStr = config ? `\n\nConfiguration:\n${JSON.stringify(config, null, 2)}` : '';
    const message = `✅ *Worker Started*\n\nStatus: Running\nTimestamp: ${new Date().toISOString()}${configStr}`;

    await this.sendAlert('info', 'worker-started', message, config);
  }

  async workerStopped(reason: string = 'Manual stop'): Promise<void> {
    const message = `⏹️ *Worker Stopped*\n\nReason: ${reason}\nTimestamp: ${new Date().toISOString()}`;
    await this.sendAlert('info', 'worker-stopped', message, { reason });
  }

  async dailyReport(stats: WorkerStats): Promise<void> {
    const successRate = stats.total > 0 ? ((stats.successful / stats.total) * 100).toFixed(1) : '0.0';
    const message = `📊 *Daily Report*\n\n*Performance Metrics:*\nCAPTCHA Solved: *${stats.successful}/${stats.total}*\nSuccess Rate: *${successRate}%*\nAccuracy: *${stats.accuracy.toFixed(1)}%*\n\n*Financial:*\nEarnings: *$${stats.earnings.toFixed(2)}*\nAverage per CAPTCHA: *$${stats.averageEarnings.toFixed(4)}*\n\n*Session Time:*\nDuration: *${Math.floor(stats.totalTime / 60)} minutes*\nAverage per CAPTCHA: *${(stats.averageTime / 1000).toFixed(2)}s*\n\n*Timestamp:* ${new Date().toISOString()}`;

    await this.sendAlert('info', 'daily-report', message, stats as unknown as Record<string, unknown>);
  }

  async hourlyStatus(stats: WorkerStats): Promise<void> {
    const successRate = stats.total > 0 ? ((stats.successful / stats.total) * 100).toFixed(1) : '0.0';
    const message = `📈 *Hourly Status*\n\nSolved: *${stats.successful}/${stats.total}*\nSuccess Rate: *${successRate}%*\nEarnings: *$${stats.earnings.toFixed(2)}*\nAccuracy: *${stats.accuracy.toFixed(1)}%*`;

    await this.sendAlert('info', 'hourly-status', message, stats as unknown as Record<string, unknown>);
  }

  async errorAlert(error: Error | string, context?: Record<string, unknown>): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const contextStr = context ? `\n\nContext: ${JSON.stringify(context, null, 2)}` : '';
    const message = `*Error Occurred*\n\nMessage: \`${errorMessage}\`${contextStr}\n\nTimestamp: ${new Date().toISOString()}`;

    await this.sendAlert('warning', 'error', message, { error: errorMessage, ...context });
  }

  async authenticationFailure(reason: string): Promise<void> {
    const message = `*Authentication Failed*\n\nReason: ${reason}\n\nPlease check credentials and 2Captcha account status.`;

    await this.sendAlert('critical', 'auth-failure', message, { reason });
  }

  async networkIssue(message: string, retryCount: number = 0): Promise<void> {
    const alertMessage = `*Network Issue Detected*\n\nIssue: ${message}\nRetry Attempts: *${retryCount}*\n\nTimestamp: ${new Date().toISOString()}`;

    await this.sendAlert('warning', 'network-issue', alertMessage, { retryCount, message });
  }

  async captchaDetectionFailed(details: string): Promise<void> {
    const message = `*CAPTCHA Detection Failed*\n\nDetails: ${details}\n\nThis may indicate:\n- Browser anti-detection failed\n- CAPTCHA format changed\n- Network issue`;

    await this.sendAlert('warning', 'detection-failed', message, { details });
  }

  async consecutiveFailures(count: number, threshold: number): Promise<void> {
    const message = `*Consecutive Failures Detected*\n\nFailures: *${count}* (threshold: ${threshold})\n\nThis may indicate:\n- Account limitations\n- IP block\n- Detection bypass failure`;

    await this.sendAlert('critical', 'consecutive-failures', message, { count, threshold });
  }

  private shouldSendAlert(type: string): boolean {
    const now = Date.now();
    const lastTime = this.lastAlertTime.get(type) || 0;
    const minIntervalMs = this.rateLimitSeconds * 1000;

    if (now - lastTime < minIntervalMs) {
      return false;
    }

    this.lastAlertTime.set(type, now);
    return true;
  }

  private logToConsole(alert: AlertMessage): void {
    const emoji = EMOJI_MAP[alert.priority];
    const timestamp = alert.timestamp.toISOString();
    const color =
      alert.priority === 'critical' ? '\x1b[31m' : alert.priority === 'warning' ? '\x1b[33m' : '\x1b[36m';
    const reset = '\x1b[0m';

    console.log(`${color}${emoji} [${alert.priority.toUpperCase()}] ${timestamp}${reset}\n${alert.message}\n`);
  }

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
      emergencyStopThreshold: this.emergencyStopThreshold,
    });
  }

  isTelegramConfigured(): boolean {
    return this.enableTelegram && !!this.botToken && !!this.chatId;
  }

  isSlackConfigured(): boolean {
    return this.enableSlack && !!this.slackWebhookUrl;
  }

  clearRateLimit(type: string): void {
    this.lastAlertTime.delete(type);
  }

  clearAllRateLimits(): void {
    this.lastAlertTime.clear();
  }
}

export class AlertSystemEventBus extends AlertSystem {}

export const alertSystem = new AlertSystem();

export default AlertSystem;

export function createAlertSystemWithCallbacks(
  config: AlertConfig = {},
  callbacks: Partial<AlertCallbacks> = {}
): AlertSystem {
  const system = new AlertSystem(config);

  system.on('alert', async (alert: AlertMessage) => {
    try {
      switch (alert.type) {
        case 'detection-failed':
        case 'consecutive-failures':
          if (callbacks.onCaptchaDetected && alert.data) {
            await callbacks.onCaptchaDetected({
              id: String((alert.data as { id?: string }).id ?? `alert-${alert.type}`),
              ...(alert.data as Record<string, unknown>),
            });
          }
          break;

        case 'error':
        case 'auth-failure':
        case 'network-issue':
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
          if (callbacks.onSuccess) {
            await callbacks.onSuccess({
              message: alert.message,
              type: alert.type,
              data: alert.data,
            });
          }
          break;

        case 'accuracy-warning':
        case 'timeout-warning':
          if (callbacks.onWarning) {
            await callbacks.onWarning(alert.message);
          }
          break;

        case 'emergency-stop':
          if (callbacks.onTimeout) {
            await callbacks.onTimeout(alert.message);
          }
          break;

        default:
          if (alert.priority === 'critical' && callbacks.onError) {
            const error = new Error(`Critical alert: ${alert.message}`);
            await callbacks.onError(error);
          } else if (alert.priority === 'warning' && callbacks.onWarning) {
            await callbacks.onWarning(alert.message);
          }
      }
    } catch (err) {
      console.error('[AlertSystem] Callback error:', err instanceof Error ? err.message : String(err));
    }
  });

  return system;
}
