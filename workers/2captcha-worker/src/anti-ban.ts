/**
 * Anti-Ban Protection Module
 * 
 * Implements human-like behavior patterns to avoid detection and bans:
 * - Random delays between actions
 * - Human-like typing speed
 * - Occasional "Cannot Solve" failures
 * - Work hours simulation
 * - Scheduled breaks
 * - Session management with max continuous work time
 */

import { Page } from 'puppeteer';
import { EventEmitter } from 'events';

/**
 * Generates random number between min and max (inclusive)
 */
export function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Session tracking for work/break cycles
 */
interface SessionState {
  startTime: number;
  captchasSolved: number;
  totalWorkTime: number;
  breakCount: number;
  lastBreakTime: number;
  isOnBreak: boolean;
}

/**
 * Anti-Ban Protection Configuration
 */
export interface AntiBanConfig {
  // Delays in milliseconds
  minDelayBetweenCaptchas: number;
  maxDelayBetweenCaptchas: number;
  minTypingDelay: number;
  maxTypingDelay: number;
  
  // Behavior simulation
  skipRate: number; // 0-1, percentage of CAPTCHAs to skip
  workHoursStart: number; // 0-23
  workHoursEnd: number; // 0-23
  
  // Break scheduling
  minWorkBeforeBreak: number; // milliseconds
  maxWorkBeforeBreak: number;
  minBreakDuration: number;
  maxBreakDuration: number;
  
  // Session limits
  maxContinuousWorkTime: number; // 8 hours
  maxCaptchasPerSession: number;
}

/**
 * Default configuration for realistic human behavior
 */
export const DEFAULT_ANTI_BAN_CONFIG: AntiBanConfig = {
  // 5-30 seconds between CAPTCHAs
  minDelayBetweenCaptchas: 5000,
  maxDelayBetweenCaptchas: 30000,
  
  // Human typing: 50-200ms per character
  minTypingDelay: 50,
  maxTypingDelay: 200,
  
  // 5-10% of CAPTCHAs marked as unsolvable
  skipRate: 0.07,
  
  // Work hours: 8 AM to 10 PM
  workHoursStart: 8,
  workHoursEnd: 22,
  
  // Take breaks: every 1-2 hours of work
  minWorkBeforeBreak: 60 * 60 * 1000, // 1 hour
  maxWorkBeforeBreak: 120 * 60 * 1000, // 2 hours
  
  // Break duration: 5-15 minutes
  minBreakDuration: 5 * 60 * 1000,
  maxBreakDuration: 15 * 60 * 1000,
  
  // Max 8 hours continuous work
  maxContinuousWorkTime: 8 * 60 * 60 * 1000,
  
  // Max ~480 CAPTCHAs per 8-hour session
  maxCaptchasPerSession: 480,
};

/**
 * Main Anti-Ban Protection Class
 */
export class AntiBanProtection extends EventEmitter {
  private config: AntiBanConfig;
  private session: SessionState;
  private breakScheduled: boolean = false;

  constructor(config: Partial<AntiBanConfig> = {}) {
    super();
    this.config = { ...DEFAULT_ANTI_BAN_CONFIG, ...config };
    
    this.session = {
      startTime: Date.now(),
      captchasSolved: 0,
      totalWorkTime: 0,
      breakCount: 0,
      lastBreakTime: Date.now(),
      isOnBreak: false,
    };
  }

  /**
   * Get current session state
   */
  getSessionState(): SessionState {
    return { ...this.session };
  }

  /**
   * Reset session (start new session)
   */
  resetSession(): void {
    this.session = {
      startTime: Date.now(),
      captchasSolved: 0,
      totalWorkTime: 0,
      breakCount: 0,
      lastBreakTime: Date.now(),
      isOnBreak: false,
    };
    this.breakScheduled = false;
    this.emit('session-reset');
  }

  /**
   * Random delay between CAPTCHAs (5-30 seconds)
   * Simulates human deliberation time
   */
  async delayBetweenCaptchas(): Promise<number> {
    const delay = random(
      this.config.minDelayBetweenCaptchas,
      this.config.maxDelayBetweenCaptchas
    );
    
    this.emit('delay-start', { delay });
    await sleep(delay);
    this.emit('delay-end', { delay });
    
    return delay;
  }

  /**
   * Human-like typing with random delays between characters
   * Prevents detection by bot behavior
   */
  async typeHumanLike(
    page: Page,
    selector: string,
    text: string
  ): Promise<void> {
    const element = await page.$(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    // Focus on element with random delay
    await sleep(random(100, 500));
    
    // Type each character with human-like delays
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const delay = random(
        this.config.minTypingDelay,
        this.config.maxTypingDelay
      );
      
      await page.type(selector, char, { delay });
      
      // Occasional pause (thinking)
      if (Math.random() < 0.1) { // 10% chance
        await sleep(random(200, 500));
      }
    }

    this.emit('text-typed', { selector, textLength: text.length });
  }

  /**
   * Decide whether to skip this CAPTCHA
   * Real workers occasionally can't solve CAPTCHAs
   * Skipping rate: 5-10%
   */
  shouldSkipCaptcha(): boolean {
    const skip = Math.random() < this.config.skipRate;
    if (skip) {
      this.emit('captcha-skipped', { reason: 'unsolvable' });
    }
    return skip;
  }

  /**
   * Check if current time is within work hours
   * Work hours: 8 AM to 10 PM (realistic human schedule)
   */
  isWithinWorkHours(): boolean {
    const hour = new Date().getHours();
    const inHours = hour >= this.config.workHoursStart &&
                    hour < this.config.workHoursEnd;
    
    if (!inHours) {
      this.emit('outside-work-hours', { hour });
    }
    
    return inHours;
  }

  /**
   * Check if a break should be taken
   * Based on time since last break and work accumulated
   */
  shouldTakeBreak(): boolean {
    const timeSinceLastBreak = Date.now() - this.session.lastBreakTime;
    const totalWorkTimeNeeded = random(
      this.config.minWorkBeforeBreak,
      this.config.maxWorkBeforeBreak
    );

    const shouldBreak = timeSinceLastBreak >= totalWorkTimeNeeded;
    
    if (shouldBreak && !this.breakScheduled) {
      this.breakScheduled = true;
      this.emit('break-needed', {
        timeSinceLastBreak,
        captchasSolvedSinceBreak: this.session.captchasSolved - 
          Math.floor(this.session.totalWorkTime / totalWorkTimeNeeded) * 50,
      });
    }

    return shouldBreak;
  }

  /**
   * Take a scheduled break (5-15 minutes)
   * Simulates human worker taking a break
   */
  async takeBreak(): Promise<number> {
    const breakDuration = random(
      this.config.minBreakDuration,
      this.config.maxBreakDuration
    );

    this.session.isOnBreak = true;
    this.session.breakCount += 1;
    
    const breakMinutes = Math.round(breakDuration / 60000);
    this.emit('break-start', {
      duration: breakDuration,
      breakNumber: this.session.breakCount,
    });

    console.log(`🛑 Taking break #${this.session.breakCount} for ${breakMinutes} minutes`);
    await sleep(breakDuration);

    this.session.lastBreakTime = Date.now();
    this.session.isOnBreak = false;
    this.breakScheduled = false;
    
    this.emit('break-end', { breakNumber: this.session.breakCount });

    return breakDuration;
  }

  /**
   * Check if session time limit exceeded
   * Max 8 hours continuous work
   */
  hasExceededMaxWorkTime(): boolean {
    const elapsedTime = Date.now() - this.session.startTime;
    const exceeded = elapsedTime >= this.config.maxContinuousWorkTime;
    
    if (exceeded) {
      this.emit('max-work-time-exceeded', {
        elapsedTime,
        maxTime: this.config.maxContinuousWorkTime,
      });
    }

    return exceeded;
  }

  /**
   * Check if CAPTCHA limit reached for session
   */
  hasExceededMaxCaptchas(): boolean {
    const exceeded = this.session.captchasSolved >= 
                    this.config.maxCaptchasPerSession;
    
    if (exceeded) {
      this.emit('max-captchas-exceeded', {
        solved: this.session.captchasSolved,
        max: this.config.maxCaptchasPerSession,
      });
    }

    return exceeded;
  }

  /**
   * Record successful CAPTCHA solve
   */
  recordCaptchaSolved(): void {
    this.session.captchasSolved += 1;
    this.emit('captcha-solved', {
      totalSolved: this.session.captchasSolved,
      sessionDuration: Date.now() - this.session.startTime,
    });
  }

  /**
   * Get session summary statistics
   */
  getSessionSummary(): {
    captchasSolved: number;
    sessionDuration: number;
    breaksCount: number;
    averagePerHour: number;
    isWithinLimits: boolean;
  } {
    const sessionDuration = Date.now() - this.session.startTime;
    const hours = sessionDuration / (60 * 60 * 1000);
    const averagePerHour = Math.round(this.session.captchasSolved / hours);

    return {
      captchasSolved: this.session.captchasSolved,
      sessionDuration,
      breaksCount: this.session.breakCount,
      averagePerHour,
      isWithinLimits: !this.hasExceededMaxWorkTime() &&
                      !this.hasExceededMaxCaptchas(),
    };
  }

  /**
   * Get time until next break is recommended
   */
  getTimeUntilBreak(): number {
    const timeSinceLastBreak = Date.now() - this.session.lastBreakTime;
    const nextBreakTime = random(
      this.config.minWorkBeforeBreak,
      this.config.maxWorkBeforeBreak
    );

    return Math.max(0, nextBreakTime - timeSinceLastBreak);
  }

  /**
   * Random mouse movement (simulates human interaction)
   * Useful for behavioral analysis evasion
   */
  async randomMouseMove(page: Page): Promise<void> {
    try {
      const viewport = page.viewport();
      if (!viewport) return;

      const x = random(0, viewport.width);
      const y = random(0, viewport.height);

      await page.mouse.move(x, y);
      this.emit('mouse-moved', { x, y });
    } catch (error) {
      // Silently ignore mouse movement errors
    }
  }

  /**
   * Random scroll action (simulates reading)
   */
  async randomScroll(page: Page): Promise<void> {
    try {
      const scrollAmount = random(100, 500);
      await page.evaluate((amount) => {
        window.scrollBy(0, amount);
      }, scrollAmount);
      
      this.emit('scrolled', { amount: scrollAmount });
    } catch (error) {
      // Silently ignore scroll errors
    }
  }

  /**
   * Complete pre-CAPTCHA routine
   * Combines multiple human-like behaviors
   */
  async preCapthchaRoutine(): Promise<void> {
    // Random mouse movement
    if (Math.random() < 0.3) { // 30% chance
      // Mouse movement would require page instance
    }

    // Random scroll
    if (Math.random() < 0.2) { // 20% chance
      // Scroll would require page instance
    }

    // Delay before CAPTCHA
    await this.delayBetweenCaptchas();
  }

  /**
   * Complete post-CAPTCHA routine
   * Includes break check and session limits
   */
  async postCaptchaRoutine(): Promise<void> {
    this.recordCaptchaSolved();

    // Check if break needed
    if (this.shouldTakeBreak()) {
      await this.takeBreak();
    }

    // Check session limits
    if (this.hasExceededMaxWorkTime() || this.hasExceededMaxCaptchas()) {
      this.emit('session-limits-reached');
      throw new Error('Session time or CAPTCHA limit exceeded');
    }

    // Check work hours
    if (!this.isWithinWorkHours()) {
      this.emit('outside-work-hours-detected');
      // Could throw or pause here
    }
  }

  /**
   * Dispose and cleanup
   */
  dispose(): void {
    this.removeAllListeners();
  }
}

/**
 * Anti-Ban Strategy Manager
 * Handles switching between different behavior patterns
 */
export class BehaviorPatternManager {
  private patterns: Map<string, AntiBanConfig>;
  private currentPattern: string;

  constructor() {
    this.patterns = new Map();
    this.setupDefaultPatterns();
    this.currentPattern = 'normal';
  }

  /**
   * Setup different behavior patterns
   */
  private setupDefaultPatterns(): void {
    // Normal work pattern
    this.patterns.set('normal', DEFAULT_ANTI_BAN_CONFIG);

    // Aggressive pattern (faster, fewer breaks)
    this.patterns.set('aggressive', {
      ...DEFAULT_ANTI_BAN_CONFIG,
      minDelayBetweenCaptchas: 2000,
      maxDelayBetweenCaptchas: 10000,
      skipRate: 0.03,
      minWorkBeforeBreak: 45 * 60 * 1000,
      maxWorkBeforeBreak: 90 * 60 * 1000,
      minBreakDuration: 3 * 60 * 1000,
      maxBreakDuration: 8 * 60 * 1000,
    });

    // Cautious pattern (slower, more breaks)
    this.patterns.set('cautious', {
      ...DEFAULT_ANTI_BAN_CONFIG,
      minDelayBetweenCaptchas: 15000,
      maxDelayBetweenCaptchas: 60000,
      skipRate: 0.15,
      minWorkBeforeBreak: 30 * 60 * 1000,
      maxWorkBeforeBreak: 60 * 60 * 1000,
      minBreakDuration: 10 * 60 * 1000,
      maxBreakDuration: 20 * 60 * 1000,
    });

    // Night owl pattern (reversed hours)
    this.patterns.set('night-owl', {
      ...DEFAULT_ANTI_BAN_CONFIG,
      workHoursStart: 20, // 8 PM
      workHoursEnd: 8, // 8 AM
    });
  }

  /**
   * Get pattern config
   */
  getPattern(name: string): AntiBanConfig | undefined {
    return this.patterns.get(name);
  }

  /**
   * Switch to different pattern
   */
  switchPattern(name: string): boolean {
    if (!this.patterns.has(name)) {
      return false;
    }
    this.currentPattern = name;
    return true;
  }

  /**
   * Get current pattern name
   */
  getCurrentPattern(): string {
    return this.currentPattern;
  }

  /**
   * List all available patterns
   */
  listPatterns(): string[] {
    return Array.from(this.patterns.keys());
  }
}

export default AntiBanProtection;
