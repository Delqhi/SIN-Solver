/**
 * Anti-Ban Integration Module
 * 
 * Integrates anti-ban protection into the 2captcha worker workflow
 * Ensures all CAPTCHA solving follows human-like patterns
 */

import { Page } from 'puppeteer';
import {
  AntiBanProtection,
  BehaviorPatternManager,
  DEFAULT_ANTI_BAN_CONFIG,
} from './anti-ban';

/**
 * Integration configuration
 */
export interface IntegrationConfig {
  // Which behavior pattern to use
  pattern: 'normal' | 'aggressive' | 'cautious' | 'night-owl';
  
  // Enable detailed logging
  verbose: boolean;
  
  // Alert on suspicious activity
  alertOnLimits: boolean;
  
  // Slack webhook for notifications (optional)
  slackWebhook?: string;
}

/**
 * Anti-Ban Worker Integration
 * Manages anti-ban behavior throughout worker lifecycle
 */
export class AntiBanWorkerIntegration {
  private protection: AntiBanProtection;
  private patternManager: BehaviorPatternManager;
  private config: IntegrationConfig;
  private isRunning: boolean = false;

  constructor(config: Partial<IntegrationConfig> = {}) {
    this.config = {
      pattern: 'normal',
      verbose: false,
      alertOnLimits: true,
      ...config,
    };

    this.patternManager = new BehaviorPatternManager();
    const patternConfig = this.patternManager.getPattern(this.config.pattern);
    
    if (!patternConfig) {
      throw new Error(`Unknown behavior pattern: ${this.config.pattern}`);
    }

    this.protection = new AntiBanProtection(patternConfig);
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for logging and alerting
   */
  private setupEventListeners(): void {
    if (this.config.verbose) {
      this.protection.on('delay-start', (data) => {
        console.log(`⏱️  Delaying ${data.delay}ms before next CAPTCHA`);
      });

      this.protection.on('delay-end', (data) => {
        console.log(`✅ Delay complete`);
      });

      this.protection.on('break-start', (data) => {
        console.log(
          `🛑 BREAK #${data.breakNumber} for ${data.duration / 60000} minutes`
        );
      });

      this.protection.on('break-end', (data) => {
        console.log(`🚀 Break #${data.breakNumber} complete, resuming work`);
      });

      this.protection.on('captcha-solved', (data) => {
        console.log(`✔️  CAPTCHA solved (Total: ${data.totalSolved})`);
      });
    }

    // Alert on limits
    if (this.config.alertOnLimits) {
      this.protection.on('max-work-time-exceeded', (data) => {
        const message =
          `⚠️  MAX WORK TIME EXCEEDED: ${data.elapsedTime}ms >= ${data.maxTime}ms`;
        console.warn(message);
        this.notify(message, 'warning');
      });

      this.protection.on('max-captchas-exceeded', (data) => {
        const message =
          `⚠️  MAX CAPTCHAS EXCEEDED: ${data.solved} >= ${data.max}`;
        console.warn(message);
        this.notify(message, 'warning');
      });

      this.protection.on('outside-work-hours-detected', () => {
        const message = '⚠️  Outside work hours - consider pausing';
        console.warn(message);
        this.notify(message, 'info');
      });
    }
  }

  /**
   * Send notification to Slack (if configured)
   */
  private async notify(
    message: string,
    level: 'info' | 'warning' | 'error'
  ): Promise<void> {
    if (!this.config.slackWebhook) return;

    const colors: Record<string, string> = {
      info: '#36a64f',
      warning: '#ff9900',
      error: '#ff0000',
    };

    try {
      await fetch(this.config.slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attachments: [
            {
              color: colors[level],
              title: 'Anti-Ban Protection Alert',
              text: message,
              ts: Math.floor(Date.now() / 1000),
            },
          ],
        }),
      });
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
    }
  }

  /**
   * Start worker session
   */
  start(): void {
    this.isRunning = true;
    console.log(
      `🚀 Starting worker with ${this.config.pattern} behavior pattern`
    );
    console.log(`   Max work time: 8 hours`);
    console.log(`   Max CAPTCHAs: 480`);
  }

  /**
   * Stop worker session and get summary
   */
  stop(): {
    summary: ReturnType<AntiBanProtection['getSessionSummary']>;
    status: string;
  } {
    this.isRunning = false;
    const summary = this.protection.getSessionSummary();
    
    const duration = (summary.sessionDuration / 60000).toFixed(1);
    const status =
      `Session complete: ${summary.captchasSolved} CAPTCHAs in ${duration} minutes ` +
      `(${summary.averagePerHour}/hour, ${summary.breaksCount} breaks)`;
    
    console.log(`🏁 ${status}`);

    return { summary, status };
  }

  /**
   * Pre-CAPTCHA routine
   * Call before attempting to solve a CAPTCHA
   */
  async beforeCaptcha(page?: Page): Promise<void> {
    // Check work hours
    if (!this.protection.isWithinWorkHours()) {
      throw new Error('Outside work hours');
    }

    // Check session limits
    if (
      this.protection.hasExceededMaxWorkTime() ||
      this.protection.hasExceededMaxCaptchas()
    ) {
      throw new Error('Session limits exceeded');
    }

    // Wait for delay
    await this.protection.delayBetweenCaptchas();

    // Check if should skip
    if (this.protection.shouldSkipCaptcha()) {
      throw new Error('CAPTCHA marked as unsolvable');
    }

    // Random interactions (if page provided)
    if (page && Math.random() < 0.2) {
      try {
        await this.protection.randomMouseMove(page);
      } catch {
        // Ignore errors
      }
    }

    // Check break needed
    if (this.protection.shouldTakeBreak()) {
      await this.protection.takeBreak();
    }
  }

  /**
   * Post-CAPTCHA routine
   * Call after successfully solving a CAPTCHA
   */
  async afterCaptcha(): Promise<void> {
    await this.protection.postCaptchaRoutine();
  }

  /**
   * Type text in human-like manner
   */
  async typeHumanLike(
    page: Page,
    selector: string,
    text: string
  ): Promise<void> {
    await this.protection.typeHumanLike(page, selector, text);
  }

  /**
   * Get current statistics
   */
  getStats(): {
    pattern: string;
    isRunning: boolean;
    summary: ReturnType<AntiBanProtection['getSessionSummary']>;
    timeUntilBreak: number;
    sessionState: ReturnType<AntiBanProtection['getSessionState']>;
  } {
    return {
      pattern: this.config.pattern,
      isRunning: this.isRunning,
      summary: this.protection.getSessionSummary(),
      timeUntilBreak: this.protection.getTimeUntilBreak(),
      sessionState: this.protection.getSessionState(),
    };
  }

  /**
   * Reset session
   */
  resetSession(): void {
    this.protection.resetSession();
    console.log('📊 Session reset');
  }

  /**
   * Switch behavior pattern
   */
  switchPattern(pattern: 'normal' | 'aggressive' | 'cautious' | 'night-owl'): boolean {
    const success = this.patternManager.switchPattern(pattern);
    if (success) {
      const newConfig = this.patternManager.getPattern(pattern)!;
      this.protection = new AntiBanProtection(newConfig);
      this.setupEventListeners();
      this.config.pattern = pattern;
      console.log(`🔄 Switched to ${pattern} pattern`);
    }
    return success;
  }

  /**
   * Get formatted session report
   */
  getReport(): string {
    const summary = this.protection.getSessionSummary();
    const duration = (summary.sessionDuration / 1000 / 60).toFixed(1);
    const state = this.protection.getSessionState();

    return `
╔════════════════════════════════════════╗
║    Anti-Ban Protection Report           ║
╠════════════════════════════════════════╣
║ Pattern:         ${this.config.pattern.padEnd(24)}║
║ Status:          ${(this.isRunning ? 'RUNNING' : 'STOPPED').padEnd(24)}║
║                                        ║
║ CAPTCHAs Solved: ${summary.captchasSolved.toString().padEnd(24)}║
║ Duration:        ${duration} minutes${' '.repeat(24 - duration.length - 9)}║
║ Breaks Taken:    ${summary.breaksCount.toString().padEnd(24)}║
║ Avg Rate:        ${summary.averagePerHour}/hour${' '.repeat(24 - summary.averagePerHour.toString().length - 7)}║
║                                        ║
║ Work Time Left:  ${(8 * 60 - parseInt(duration)).toString()} minutes${' '.repeat(24 - (8 * 60 - parseInt(duration)).toString().length - 9)}║
║ CAPTCHAs Left:   ${(480 - summary.captchasSolved).toString()}${' '.repeat(24 - (480 - summary.captchasSolved).toString().length)}║
║                                        ║
║ Within Limits:   ${(summary.isWithinLimits ? '✅ YES' : '❌ NO').padEnd(24)}║
╚════════════════════════════════════════╝
    `.trim();
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.protection.dispose();
  }
}

/**
 * Quick start anti-ban protection
 */
export function createAntiBanWorker(
  pattern: 'normal' | 'aggressive' | 'cautious' | 'night-owl' = 'normal'
): AntiBanWorkerIntegration {
  return new AntiBanWorkerIntegration({
    pattern,
    verbose: process.env.VERBOSE_ANTI_BAN === 'true',
    alertOnLimits: true,
  });
}

/**
 * Example usage
 */
export async function exampleUsage(): Promise<void> {
  const worker = createAntiBanWorker('normal');
  
  try {
    worker.start();

    // Simulate CAPTCHA solving
    for (let i = 0; i < 10; i++) {
      try {
        // Before CAPTCHA
        await worker.beforeCaptcha();

        // Solve CAPTCHA (simulated)
        console.log(`Solving CAPTCHA #${i + 1}...`);
        // await solveCaptcha();

        // After CAPTCHA
        await worker.afterCaptcha();
      } catch (error) {
        console.error(`Error on CAPTCHA #${i + 1}:`, error);
        // Decide whether to retry or skip
      }
    }

    const { summary, status } = worker.stop();
    console.log('\n' + worker.getReport());
  } finally {
    worker.dispose();
  }
}

export default AntiBanWorkerIntegration;
