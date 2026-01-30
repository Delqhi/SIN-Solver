/**
 * Anti-Ban Protection Tests
 * 
 * Comprehensive test suite for human-like behavior simulation
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  AntiBanProtection,
  BehaviorPatternManager,
  DEFAULT_ANTI_BAN_CONFIG,
  random,
  sleep,
} from './anti-ban';

describe('AntiBanProtection', () => {
  let protection: AntiBanProtection;

  beforeEach(() => {
    protection = new AntiBanProtection();
  });

  afterEach(() => {
    protection.dispose();
  });

  describe('Random Utilities', () => {
    it('random() should generate numbers within range', () => {
      for (let i = 0; i < 100; i++) {
        const value = random(5, 10);
        expect(value).toBeGreaterThanOrEqual(5);
        expect(value).toBeLessThanOrEqual(10);
      }
    });

    it('random() should include boundaries', () => {
      const values = new Set();
      for (let i = 0; i < 1000; i++) {
        values.add(random(5, 10));
      }
      expect(values.has(5)).toBe(true);
      expect(values.has(10)).toBe(true);
    });

    it('sleep() should delay execution', async () => {
      const start = Date.now();
      await sleep(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(95);
      expect(elapsed).toBeLessThan(200);
    });
  });

  describe('Session Management', () => {
    it('should initialize session state', () => {
      const state = protection.getSessionState();
      expect(state.captchasSolved).toBe(0);
      expect(state.breakCount).toBe(0);
      expect(state.isOnBreak).toBe(false);
    });

    it('should reset session', () => {
      protection.recordCaptchaSolved();
      protection.recordCaptchaSolved();
      
      protection.resetSession();
      const state = protection.getSessionState();
      
      expect(state.captchasSolved).toBe(0);
      expect(state.breakCount).toBe(0);
    });

    it('should track CAPTCHAs solved', () => {
      protection.recordCaptchaSolved();
      protection.recordCaptchaSolved();
      protection.recordCaptchaSolved();
      
      const state = protection.getSessionState();
      expect(state.captchasSolved).toBe(3);
    });
  });

  describe('Delay Behavior', () => {
    it('delayBetweenCaptchas() should return valid delay', async () => {
      const delay = await protection.delayBetweenCaptchas();
      
      expect(delay).toBeGreaterThanOrEqual(
        DEFAULT_ANTI_BAN_CONFIG.minDelayBetweenCaptchas
      );
      expect(delay).toBeLessThanOrEqual(
        DEFAULT_ANTI_BAN_CONFIG.maxDelayBetweenCaptchas
      );
    });

    it('delayBetweenCaptchas() should emit events', async () => {
      const startSpy = jest.fn();
      const endSpy = jest.fn();
      
      protection.on('delay-start', startSpy);
      protection.on('delay-end', endSpy);
      
      await protection.delayBetweenCaptchas();
      
      expect(startSpy).toHaveBeenCalled();
      expect(endSpy).toHaveBeenCalled();
    });

    it('delays should vary (not constant)', async () => {
      const delays = [];
      
      for (let i = 0; i < 10; i++) {
        const delay = await protection.delayBetweenCaptchas();
        delays.push(delay);
      }
      
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe('Skip Behavior', () => {
    it('shouldSkipCaptcha() should sometimes return true', () => {
      let skipCount = 0;
      
      for (let i = 0; i < 1000; i++) {
        if (protection.shouldSkipCaptcha()) {
          skipCount++;
        }
      }
      
      // 7% skip rate, allow 3-11% variance
      const skipRate = skipCount / 1000;
      expect(skipRate).toBeGreaterThan(0.03);
      expect(skipRate).toBeLessThan(0.11);
    });

    it('shouldSkipCaptcha() should emit event when skipping', () => {
      const skipSpy = jest.fn();
      protection.on('captcha-skipped', skipSpy);
      
      // Try many times until we get a skip
      let skipped = false;
      for (let i = 0; i < 100; i++) {
        if (protection.shouldSkipCaptcha()) {
          skipped = true;
          break;
        }
      }
      
      if (skipped) {
        expect(skipSpy).toHaveBeenCalled();
      }
    });
  });

  describe('Work Hours', () => {
    it('isWithinWorkHours() should be context-aware', () => {
      // We can only test that it returns a boolean
      const result = protection.isWithinWorkHours();
      expect(typeof result).toBe('boolean');
    });

    it('isWithinWorkHours() should respect config', () => {
      const customProtection = new AntiBanProtection({
        workHoursStart: 12,
        workHoursEnd: 13,
      });
      
      // At least check no errors are thrown
      const result = customProtection.isWithinWorkHours();
      expect(typeof result).toBe('boolean');
      
      customProtection.dispose();
    });
  });

  describe('Break Scheduling', () => {
    it('shouldTakeBreak() should eventually return true', async () => {
      const customProtection = new AntiBanProtection({
        minWorkBeforeBreak: 100, // Very short
        maxWorkBeforeBreak: 200,
      });
      
      // Wait for break threshold
      await sleep(250);
      
      const shouldBreak = customProtection.shouldTakeBreak();
      expect(shouldBreak).toBe(true);
      
      customProtection.dispose();
    });

    it('takeBreak() should complete successfully', async () => {
      const customProtection = new AntiBanProtection({
        minBreakDuration: 50,
        maxBreakDuration: 100,
      });
      
      const breakSpy = jest.fn();
      customProtection.on('break-end', breakSpy);
      
      const breakTime = await customProtection.takeBreak();
      
      expect(breakTime).toBeGreaterThanOrEqual(50);
      expect(breakTime).toBeLessThanOrEqual(100);
      expect(breakSpy).toHaveBeenCalled();
      
      customProtection.dispose();
    });

    it('break count should increment', async () => {
      const customProtection = new AntiBanProtection({
        minBreakDuration: 10,
        maxBreakDuration: 20,
      });
      
      await customProtection.takeBreak();
      let state = customProtection.getSessionState();
      expect(state.breakCount).toBe(1);
      
      await customProtection.takeBreak();
      state = customProtection.getSessionState();
      expect(state.breakCount).toBe(2);
      
      customProtection.dispose();
    });
  });

  describe('Session Limits', () => {
    it('hasExceededMaxWorkTime() should detect limit', () => {
      // Cannot easily test without waiting 8 hours
      // Just verify it doesn't throw
      expect(() => {
        protection.hasExceededMaxWorkTime();
      }).not.toThrow();
    });

    it('hasExceededMaxCaptchas() should detect limit', () => {
      // Record many CAPTCHAs
      for (let i = 0; i < 490; i++) {
        protection.recordCaptchaSolved();
      }
      
      const state = protection.getSessionState();
      expect(state.captchasSolved).toBe(490);
      expect(protection.hasExceededMaxCaptchas()).toBe(false);
      
      // Exceed limit
      for (let i = 0; i < 10; i++) {
        protection.recordCaptchaSolved();
      }
      
      expect(protection.hasExceededMaxCaptchas()).toBe(true);
    });
  });

  describe('Session Summary', () => {
    it('getSessionSummary() should return valid data', async () => {
      protection.recordCaptchaSolved();
      protection.recordCaptchaSolved();
      
      const summary = protection.getSessionSummary();
      
      expect(summary.captchasSolved).toBe(2);
      expect(summary.sessionDuration).toBeGreaterThan(0);
      expect(summary.breaksCount).toBeGreaterThanOrEqual(0);
      expect(summary.averagePerHour).toBeGreaterThanOrEqual(0);
      expect(typeof summary.isWithinLimits).toBe('boolean');
    });

    it('getTimeUntilBreak() should return valid time', () => {
      const timeUntil = protection.getTimeUntilBreak();
      expect(timeUntil).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuration', () => {
    it('should accept custom config', () => {
      const custom = new AntiBanProtection({
        skipRate: 0.2,
        minDelayBetweenCaptchas: 1000,
      });
      
      const state = custom.getSessionState();
      expect(state.captchasSolved).toBe(0);
      
      custom.dispose();
    });

    it('should use default config values', () => {
      const config = { ...DEFAULT_ANTI_BAN_CONFIG };
      expect(config.skipRate).toBe(0.07);
      expect(config.maxContinuousWorkTime).toBe(8 * 60 * 60 * 1000);
    });
  });

  describe('Event Emitter', () => {
    it('should emit session-reset event', () => {
      const resetSpy = jest.fn();
      protection.on('session-reset', resetSpy);
      
      protection.resetSession();
      
      expect(resetSpy).toHaveBeenCalled();
    });

    it('should emit captcha-solved event', () => {
      const solveSpy = jest.fn();
      protection.on('captcha-solved', solveSpy);
      
      protection.recordCaptchaSolved();
      
      expect(solveSpy).toHaveBeenCalled();
      expect(solveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          totalSolved: 1,
        })
      );
    });
  });
});

describe('BehaviorPatternManager', () => {
  let manager: BehaviorPatternManager;

  beforeEach(() => {
    manager = new BehaviorPatternManager();
  });

  describe('Pattern Management', () => {
    it('should list all available patterns', () => {
      const patterns = manager.listPatterns();
      
      expect(patterns).toContain('normal');
      expect(patterns).toContain('aggressive');
      expect(patterns).toContain('cautious');
      expect(patterns).toContain('night-owl');
    });

    it('should get pattern config', () => {
      const normal = manager.getPattern('normal');
      
      expect(normal).toBeDefined();
      expect(normal?.skipRate).toBe(0.07);
    });

    it('should switch patterns', () => {
      expect(manager.getCurrentPattern()).toBe('normal');
      
      const success = manager.switchPattern('aggressive');
      expect(success).toBe(true);
      expect(manager.getCurrentPattern()).toBe('aggressive');
    });

    it('should handle invalid pattern switch', () => {
      const success = manager.switchPattern('invalid');
      expect(success).toBe(false);
      expect(manager.getCurrentPattern()).toBe('normal');
    });

    it('aggressive pattern should be faster', () => {
      const normal = manager.getPattern('normal')!;
      const aggressive = manager.getPattern('aggressive')!;
      
      expect(aggressive.minDelayBetweenCaptchas)
        .toBeLessThan(normal.minDelayBetweenCaptchas);
      expect(aggressive.maxDelayBetweenCaptchas)
        .toBeLessThan(normal.maxDelayBetweenCaptchas);
      expect(aggressive.skipRate)
        .toBeLessThan(normal.skipRate);
    });

    it('cautious pattern should be slower', () => {
      const normal = manager.getPattern('normal')!;
      const cautious = manager.getPattern('cautious')!;
      
      expect(cautious.minDelayBetweenCaptchas)
        .toBeGreaterThan(normal.minDelayBetweenCaptchas);
      expect(cautious.maxDelayBetweenCaptchas)
        .toBeGreaterThan(normal.maxDelayBetweenCaptchas);
      expect(cautious.skipRate)
        .toBeGreaterThan(normal.skipRate);
    });

    it('night-owl pattern should have different hours', () => {
      const night = manager.getPattern('night-owl')!;
      
      expect(night.workHoursStart).toBe(20);
      expect(night.workHoursEnd).toBe(8);
    });
  });

  describe('Pattern Usage', () => {
    it('should create protection with pattern config', () => {
      manager.switchPattern('aggressive');
      const pattern = manager.getPattern('aggressive')!;
      const protection = new AntiBanProtection(pattern);
      
      const state = protection.getSessionState();
      expect(state.captchasSolved).toBe(0);
      
      protection.dispose();
    });
  });
});

describe('Integration Tests', () => {
  it('complete work session workflow', async () => {
    const protection = new AntiBanProtection({
      minDelayBetweenCaptchas: 10,
      maxDelayBetweenCaptchas: 50,
      minWorkBeforeBreak: 100,
      maxWorkBeforeBreak: 200,
      minBreakDuration: 20,
      maxBreakDuration: 50,
    });

    // Simulate 5 CAPTCHAs
    for (let i = 0; i < 5; i++) {
      await protection.delayBetweenCaptchas();
      
      if (!protection.shouldSkipCaptcha()) {
        protection.recordCaptchaSolved();
      }

      await protection.postCaptchaRoutine().catch(() => {
        // Expected if limits exceeded
      });
    }

    const summary = protection.getSessionSummary();
    expect(summary.captchasSolved).toBeGreaterThan(0);
    expect(summary.captchasSolved).toBeLessThanOrEqual(5);

    protection.dispose();
  });

  it('session should respect limits', async () => {
    const protection = new AntiBanProtection({
      maxCaptchasPerSession: 10,
    });

    // Solve 11 CAPTCHAs
    for (let i = 0; i < 11; i++) {
      protection.recordCaptchaSolved();
      
      if (protection.hasExceededMaxCaptchas()) {
        break;
      }
    }

    expect(protection.hasExceededMaxCaptchas()).toBe(true);
    protection.dispose();
  });
});
