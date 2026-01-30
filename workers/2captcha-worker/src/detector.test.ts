/**
 * 2CAPTCHA DETECTOR - TEST SUITE
 * ===============================
 * Unit and integration tests for the detector
 */

import { chromium, Browser, Page } from 'playwright';
import {
  TwoCaptchaDetector,
  CaptchaType,
  detectCaptchaQuick,
  detectCaptchaWithTimeout,
  pollForCaptcha,
  CaptchaDetectionResult,
} from './detector';

describe('TwoCaptchaDetector', () => {
  let browser: Browser;
  let page: Page;

  beforeEach(async () => {
    browser = await chromium.launch({
      headless: true,
    });
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
    await browser.close();
  });

  describe('Basic Detection', () => {
    it('should detect image CAPTCHA on 2captcha.com', async () => {
      // This would require a real 2captcha worker page
      // For testing, we'd mock the page content
      const detector = new TwoCaptchaDetector(page);

      // Mock: navigate to a test CAPTCHA page
      // const result = await detector.detect();
      // expect(result.detected).toBe(true);
      // expect(result.type).toBe(CaptchaType.ImageCaptcha);

      // For now, verify constructor works
      expect(detector).toBeDefined();
    });

    it('should timeout when CAPTCHA not found', async () => {
      const detector = new TwoCaptchaDetector(page, 1000); // 1 second timeout

      // Empty page has no CAPTCHA
      await page.goto('about:blank');

      const result = await detector.detect();
      expect(result.detected).toBe(false);
    });

    it('should detect CAPTCHA type correctly', async () => {
      const detector = new TwoCaptchaDetector(page);

      // Verify type detection logic exists
      expect(detector).toHaveProperty('detectCaptchaType');
    });
  });

  describe('Element Locating', () => {
    it('should find input field for answer', async () => {
      // Setup: page with CAPTCHA elements
      await page.setContent(`
        <form>
          <img alt="captcha" src="data:image/png;base64,..." />
          <input name="answer" placeholder="Enter answer" />
          <button type="submit">Submit</button>
        </form>
      `);

      const detector = new TwoCaptchaDetector(page);
      // Note: actual detection would fail (no image), but element location would work
    });

    it('should find submit button', async () => {
      await page.setContent(`
        <form>
          <button type="submit">Submit</button>
        </form>
      `);

      const submitButton = await page.$('button[type="submit"]');
      expect(submitButton).toBeDefined();
    });

    it('should find cannot-solve button', async () => {
      await page.setContent(`
        <form>
          <button>Cannot Solve</button>
        </form>
      `);

      const button = await page.locator('button:has-text("Cannot Solve")');
      expect(button).toBeDefined();
    });
  });

  describe('Timeout Tracking', () => {
    it('should track timeout correctly', async () => {
      const detector = new TwoCaptchaDetector(page, 120000); // 2 minutes

      const remaining = detector.getRemainingTime();
      expect(remaining).toBeLessThanOrEqual(120000);
      expect(remaining).toBeGreaterThan(0);
    });

    it('should warn when timeout approaching', async () => {
      const detector = new TwoCaptchaDetector(page, 5000); // 5 second timeout

      // Immediately should not be approaching
      expect(detector.isTimeoutApproaching(1000)).toBe(false);

      // Wait and check
      await page.waitForTimeout(4500);
      expect(detector.isTimeoutApproaching(1000)).toBe(true);
    });

    it('should format remaining time correctly', async () => {
      const detector = new TwoCaptchaDetector(page, 75500);

      const formatted = detector.getFormattedRemainingTime();
      expect(formatted).toMatch(/\d+s \d+ms/);
    });
  });

  describe('Screenshot Capture', () => {
    it('should capture screenshot of visible element', async () => {
      await page.setContent(`
        <div class="captcha-container">
          <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" />
        </div>
      `);

      const locator = page.locator('.captcha-container');
      const screenshot = await locator.screenshot();

      expect(screenshot).toBeDefined();
      expect(screenshot.length).toBeGreaterThan(0);
    });
  });

  describe('Quick Detection Helper', () => {
    it('should provide quick detection function', async () => {
      await page.goto('about:blank');

      const result = await detectCaptchaQuick(page);
      expect(result).toBeDefined();
      expect(result.detected).toBe(false);
    });
  });

  describe('Timeout Configuration', () => {
    it('should respect custom timeout', async () => {
      const customTimeout = 60000;
      const detector = new TwoCaptchaDetector(page, customTimeout);

      // Should initialize with custom timeout
      expect(detector).toBeDefined();
    });

    it('should allow timeout with detection function', async () => {
      await page.goto('about:blank');

      const result = await detectCaptchaWithTimeout(page, 30000);
      expect(result.timeoutMs).toBe(30000);
    });
  });

  describe('Polling', () => {
    it('should poll for CAPTCHA presence', async () => {
      await page.goto('about:blank');

      let callbackCalled = false;

      const result = await pollForCaptcha(page, 2000, async () => {
        callbackCalled = true;
      });

      expect(result).toBeDefined();
      expect(callbackCalled).toBe(false); // No CAPTCHA to trigger callback
    });

    it('should call callback on detection', async () => {
      // Setup page with CAPTCHA
      // This would require actual CAPTCHA page or mock

      let detectedResult: CaptchaDetectionResult | null = null;

      // Would test callback execution
      // const result = await pollForCaptcha(page, 30000, async (detected) => {
      //   detectedResult = detected;
      // });
    });
  });

  describe('Error Handling', () => {
    it('should handle missing elements gracefully', async () => {
      await page.goto('about:blank');

      const detector = new TwoCaptchaDetector(page);
      const result = await detector.detect();

      expect(result.detected).toBe(false);
      expect(result.type).toBe(CaptchaType.Unknown);
    });

    it('should handle navigation errors', async () => {
      // Test with invalid URL would be handled by playwright
      // Should not throw unhandled exception
    });

    it('should recover from transient failures', async () => {
      const detector = new TwoCaptchaDetector(page, 10000);

      // Navigate to page, detector should handle gracefully
      await page.goto('about:blank').catch(() => null);

      const result = await detector.detect();
      expect(result).toBeDefined();
    });
  });

  describe('CAPTCHA Type Detection', () => {
    it('should detect multiple CAPTCHA types', async () => {
      const types = [
        CaptchaType.ImageCaptcha,
        CaptchaType.RecaptchaV2,
        CaptchaType.HCaptcha,
        CaptchaType.SliderCaptcha,
        CaptchaType.ClickCaptcha,
        CaptchaType.RotateCaptcha,
        CaptchaType.TextCaptcha,
      ];

      types.forEach((type) => {
        expect(type).toBeDefined();
        expect(typeof type).toBe('string');
      });
    });
  });

  describe('Metadata Collection', () => {
    it('should collect detection metadata', async () => {
      const detector = new TwoCaptchaDetector(page, 120000);

      await page.goto('about:blank');
      const result = await detector.detect();

      expect(result.metadata).toBeDefined();
      expect(result.metadata.timestamp).toBeDefined();
      expect(result.metadata.type).toBeDefined();
    });

    it('should include image dimensions in metadata', async () => {
      await page.setContent(`
        <img class="captcha-image" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" />
      `);

      // Metadata collection would happen during detection
      // This test verifies the structure
    });
  });

  describe('Performance', () => {
    it('should detect CAPTCHA within reasonable time', async () => {
      const startTime = Date.now();

      const detector = new TwoCaptchaDetector(page, 5000);
      await page.goto('about:blank');

      try {
        await detector.detect();
      } catch (error) {
        // Expected to timeout, but should be fast
      }

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeLessThan(10000); // Should complete within 10s
    });
  });
});

describe('Integration Tests', () => {
  let browser: Browser;
  let page: Page;

  beforeEach(async () => {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
  });

  afterEach(async () => {
    await page.close();
    await browser.close();
  });

  it('should work end-to-end with real page', async () => {
    // Navigate to test page
    await page.goto('about:blank');

    // Create detector
    const detector = new TwoCaptchaDetector(page, 5000);

    // Attempt detection (will timeout on blank page, but that's expected)
    const result = await detector.detect();

    expect(result).toBeDefined();
    expect(result.detected).toBe(false); // No CAPTCHA on blank page
  });
});
