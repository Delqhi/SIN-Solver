import { EventEmitter } from 'events';

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type NotificationChannel = 'console' | 'webhook' | 'email';

export interface AlertConfig {
  channels: NotificationChannel[];
  webhookUrl?: string;
  emailRecipients?: string[];
  cooldownMs?: number;
  maxHistory?: number;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  condition: (metrics: Metrics) => boolean;
  severity: AlertSeverity;
  enabled: boolean;
  cooldownMs?: number;
  maxOccurrences?: number;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  message: string;
  severity: AlertSeverity;
  timestamp: number;
  acknowledged: boolean;
  metrics?: Metrics;
  channelResults?: Record<NotificationChannel, boolean>;
}

export interface Metrics {
  connectionCount?: number;
  activeConnections?: number;
  errorRate?: number;
  avgResponseTime?: number;
  failedRequests?: number;
  totalRequests?: number;
  queuedRequests?: number;
  memoryUsage?: number;
  cpuUsage?: number;
  endpointHealth?: Record<string, boolean>;
  [key: string]: unknown;
}

export interface AlertSystemOptions {
  defaultCooldownMs?: number;
  maxHistory?: number;
  deduplicationWindowMs?: number;
}

export class BrowserlessAlertSystem extends EventEmitter {
  private config: AlertConfig;
  private rules: Map<string, AlertRule> = new Map();
  private alertHistory: Alert[] = [];
  private lastAlertTime: Map<string, number> = new Map();
  private alertCount: Map<string, number> = new Map();
  private options: Required<AlertSystemOptions>;

  /**
   * Creates a new BrowserlessAlertSystem instance
   * @param config - Configuration for alert channels and behavior
   * @param options - Optional system-wide settings
   */
  constructor(config: AlertConfig, options: AlertSystemOptions = {}) {
    super();
    
    this.config = {
      cooldownMs: 300000, // 5 minutes default
      maxHistory: 1000,
      ...config,
    };

    this.options = {
      defaultCooldownMs: 300000,
      maxHistory: 1000,
      deduplicationWindowMs: 60000,
      ...options,
    };
  }

  /**
   * Adds a new alert rule
   * @param rule - The alert rule to add
   */
  addRule(rule: AlertRule): void {
    if (this.rules.has(rule.id)) {
      console.warn(`Rule ${rule.id} already exists, updating...`);
    }

    this.rules.set(rule.id, rule);
    this.emit('ruleAdded', rule);
  }

  /**
   * Removes an alert rule by ID
   * @param ruleId - The ID of the rule to remove
   */
  removeRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      console.warn(`Rule ${ruleId} not found`);
      return;
    }

    this.rules.delete(ruleId);
    this.lastAlertTime.delete(ruleId);
    this.alertCount.delete(ruleId);
    this.emit('ruleRemoved', rule);
  }

  /**
   * Checks metrics against all enabled rules and triggers alerts
   * @param metrics - The current metrics to check
   */
  checkMetrics(metrics: Metrics): void {
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      try {
        if (rule.condition(metrics)) {
          void this.triggerAlert(rule, metrics);
        }
      } catch (error) {
        console.error(`Error checking rule ${rule.id}:`, error);
      }
    }
  }

  /**
   * Sends an alert through configured channels
   * @param alert - The alert to send
   */
  async sendAlert(alert: Alert): Promise<void> {
    const channelResults: Record<NotificationChannel, boolean> = {
      console: false,
      webhook: false,
      email: false,
    };

    for (const channel of this.config.channels) {
      try {
        switch (channel) {
          case 'console':
            await this.sendConsoleAlert(alert);
            channelResults.console = true;
            break;
          case 'webhook':
            if (this.config.webhookUrl) {
              await this.sendWebhookAlert(alert);
              channelResults.webhook = true;
            }
            break;
          case 'email':
            if (this.config.emailRecipients && this.config.emailRecipients.length > 0) {
              await this.sendEmailAlert(alert);
              channelResults.email = true;
            }
            break;
        }
      } catch (error) {
        console.error(`Failed to send alert via ${channel}:`, error);
      }
    }

    alert.channelResults = channelResults;
    this.addToHistory(alert);
    this.emit('alertSent', alert);
  }

  /**
   * Gets the alert history
   * @returns Array of alerts, sorted by timestamp (newest first)
   */
  getAlertHistory(): Alert[] {
    return [...this.alertHistory].sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Gets alerts filtered by severity
   * @param severity - The severity level to filter by
   * @returns Array of alerts with the specified severity
   */
  getAlertsBySeverity(severity: AlertSeverity): Alert[] {
    return this.getAlertHistory().filter(alert => alert.severity === severity);
  }

  /**
   * Gets unacknowledged alerts
   * @returns Array of unacknowledged alerts
   */
  getUnacknowledgedAlerts(): Alert[] {
    return this.getAlertHistory().filter(alert => !alert.acknowledged);
  }

  /**
   * Acknowledges an alert by ID
   * @param alertId - The ID of the alert to acknowledge
   * @returns True if acknowledged, false if not found
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alertHistory.find(a => a.id === alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    this.emit('alertAcknowledged', alert);
    return true;
  }

  /**
   * Clears all alert history
   */
  clearHistory(): void {
    this.alertHistory = [];
    this.emit('historyCleared');
  }

  /**
   * Gets all configured rules
   * @returns Array of alert rules
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Enables a rule by ID
   * @param ruleId - The ID of the rule to enable
   */
  enableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      this.emit('ruleEnabled', rule);
    }
  }

  /**
   * Disables a rule by ID
   * @param ruleId - The ID of the rule to disable
   */
  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      this.emit('ruleDisabled', rule);
    }
  }

  /**
   * Gets alert statistics
   * @returns Statistics object with alert counts
   */
  getStatistics(): {
    total: number;
    bySeverity: Record<AlertSeverity, number>;
    byRule: Record<string, number>;
    acknowledged: number;
    unacknowledged: number;
  } {
    const history = this.getAlertHistory();
    
    const bySeverity: Record<AlertSeverity, number> = {
      info: 0,
      warning: 0,
      critical: 0,
    };

    const byRule: Record<string, number> = {};

    let acknowledged = 0;
    let unacknowledged = 0;

    for (const alert of history) {
      bySeverity[alert.severity]++;
      byRule[alert.ruleId] = (byRule[alert.ruleId] || 0) + 1;
      
      if (alert.acknowledged) {
        acknowledged++;
      } else {
        unacknowledged++;
      }
    }

    return {
      total: history.length,
      bySeverity,
      byRule,
      acknowledged,
      unacknowledged,
    };
  }

  /**
   * Stops the alert system
   */
  stop(): void {
    this.removeAllListeners();
  }

  private async triggerAlert(rule: AlertRule, metrics: Metrics): Promise<void> {
    const now = Date.now();
    const lastTime = this.lastAlertTime.get(rule.id) || 0;
    const cooldown = rule.cooldownMs || this.config.cooldownMs || this.options.defaultCooldownMs;

    if (now - lastTime < cooldown) {
      return;
    }

    const count = this.alertCount.get(rule.id) || 0;
    if (rule.maxOccurrences && count >= rule.maxOccurrences) {
      return;
    }

    const alert: Alert = {
      id: this.generateAlertId(),
      ruleId: rule.id,
      ruleName: rule.name,
      message: this.generateAlertMessage(rule, metrics),
      severity: rule.severity,
      timestamp: now,
      acknowledged: false,
      metrics: { ...metrics },
    };

    this.lastAlertTime.set(rule.id, now);
    this.alertCount.set(rule.id, count + 1);

    await this.sendAlert(alert);
  }

  private generateAlertMessage(rule: AlertRule, metrics: Metrics): string {
    let message = `Alert: ${rule.name}`;
    
    if (rule.description) {
      message += ` - ${rule.description}`;
    }

    message += ` | Metrics: ${JSON.stringify(metrics)}`;
    
    return message;
  }

  private async sendConsoleAlert(alert: Alert): Promise<void> {
    const timestamp = new Date(alert.timestamp).toISOString();
    const prefix = `[${timestamp}] [${alert.severity.toUpperCase()}]`;
    
    switch (alert.severity) {
      case 'critical':
        console.error(`${prefix} ${alert.message}`);
        break;
      case 'warning':
        console.warn(`${prefix} ${alert.message}`);
        break;
      case 'info':
        console.info(`${prefix} ${alert.message}`);
        break;
    }
  }

  private async sendWebhookAlert(alert: Alert): Promise<void> {
    if (!this.config.webhookUrl) return;

    const response = await fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(alert),
    });

    if (!response.ok) {
      throw new Error(`Webhook returned ${response.status}`);
    }
  }

  private async sendEmailAlert(alert: Alert): Promise<void> {
    if (!this.config.emailRecipients || this.config.emailRecipients.length === 0) {
      return;
    }

    console.log(`[EMAIL] Would send email to ${this.config.emailRecipients.join(', ')}:`);
    console.log(`Subject: [${alert.severity.toUpperCase()}] Browserless Alert: ${alert.ruleName}`);
    console.log(`Body: ${alert.message}`);
  }

  private addToHistory(alert: Alert): void {
    this.alertHistory.push(alert);

    if (this.alertHistory.length > this.options.maxHistory) {
      this.alertHistory.shift();
    }
  }

  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default BrowserlessAlertSystem;
