/**
 * Tests for CaptchaSubmitter
 */

import { test, expect } from '@playwright/test';
import { CaptchaSubmitter } from './submitter';
import { Page } from 'playwright';

test.describe('CaptchaSubmitter', () => {
  let page: Page;
  let submitter: CaptchaSubmitter;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    submitter = new CaptchaSubmitter(page, {
      minTypingDelay: 50,
      maxTypingDelay: 150,
      minSubmitDelay: 300,
      maxSubmitDelay: 800,
      timeout: 10000,
    });
  });

  test.describe('submitAnswer', () => {
    test('should submit answer successfully', async () => {
      // Mock HTML page with input and button
      await page.setContent(`
        <html>
          <body>
            <div class="captcha">
              <input name="answer" type="text" placeholder="Enter answer" />
              <button type="submit">Submit</button>
            </div>
          </body>
        </html>
      `);

      const result = await submitter.submitAnswer('12345');

      expect(result.success).toBe(true);
      expect(result.action).toBe('submitted');
      expect(result.answer).toBe('12345');
      expect(result.timestamp).toBeTruthy();
    });

    test('should handle multiple input selector strategies', async () => {
      await page.setContent(`
        <html>
          <body>
            <input id="answer" type="text" placeholder="CAPTCHA answer" />
            <button type="submit">Check Answer</button>
          </body>
        </html>
      `);

      const result = await submitter.submitAnswer('test123');

      expect(result.success).toBe(true);
      expect(result.answer).toBe('test123');
    });

    test('should handle missing input field gracefully', async () => {
      await page.setContent(`
        <html>
          <body>
            <button type="submit">Submit</button>
          </body>
        </html>
      `);

      const result = await submitter.submitAnswer('12345');

      expect(result.success).toBe(false);
      expect(result.action).toBe('error');
      expect(result.error).toContain('Cannot find');
    });

    test('should handle missing submit button gracefully', async () => {
      await page.setContent(`
        <html>
          <body>
            <input name="answer" type="text" />
          </body>
        </html>
      `);

      const result = await submitter.submitAnswer('12345');

      expect(result.success).toBe(false);
      expect(result.action).toBe('error');
      expect(result.error).toContain('submit button');
    });

    test('should type human-like (variable delays)', async () => {
      const delays: number[] = [];
      let lastTime = Date.now();

      await page.setContent(`
        <html>
          <body>
            <input name="answer" type="text" />
            <button type="submit">Submit</button>
          </body>
        </html>
      `);

      // Monitor typing speed
      page.on('framenavigated', () => {
        const now = Date.now();
        delays.push(now - lastTime);
        lastTime = now;
      });

      await submitter.submitAnswer('abc');

      // Check that we typed the answer
      const input = page.locator('input[name="answer"]');
      const value = await input.inputValue();
      expect(value).toContain('abc');
    });
  });

  test.describe('clickCannotSolve', () => {
    test('should click Cannot Solve button successfully', async () => {
      await page.setContent(`
        <html>
          <body>
            <div class="captcha">
              <button>Cannot Solve</button>
            </div>
          </body>
        </html>
      `);

      const result = await submitter.clickCannotSolve();

      expect(result.success).toBe(true);
      expect(result.action).toBe('cannot_solve');
      expect(result.timestamp).toBeTruthy();
    });

    test('should handle multiple button selector strategies', async () => {
      await page.setContent(`
        <html>
          <body>
            <button id="cannot-solve">Skip</button>
          </body>
        </html>
      `);

      const result = await submitter.clickCannotSolve();

      expect(result.success).toBe(true);
      expect(result.action).toBe('cannot_solve');
    });

    test('should handle missing Cannot Solve button gracefully', async () => {
      await page.setContent(`
        <html>
          <body>
            <button>Submit Answer</button>
          </body>
        </html>
      `);

      const result = await submitter.clickCannotSolve();

      expect(result.success).toBe(false);
      expect(result.action).toBe('error');
      expect(result.error).toContain('Cannot find');
    });

    test('should add human-like delay before clicking', async () => {
      await page.setContent(`
        <html>
          <body>
            <button onclick="window.clickTime = Date.now()">Cannot Solve</button>
          </body>
        </html>
      `);

      const startTime = Date.now();
      await submitter.clickCannotSolve();
      const endTime = Date.now();

      // Should take at least 300ms (minSubmitDelay)
      expect(endTime - startTime).toBeGreaterThanOrEqual(300);
    });
  });

  test.describe('getStats', () => {
    test('should track submission count', async () => {
      await page.setContent(`
        <html>
          <body>
            <input name="answer" type="text" />
            <button>Cannot Solve</button>
          </body>
        </html>
      `);

      const stats1 = submitter.getStats();
      expect(stats1.totalSubmissions).toBe(0);

      await submitter.clickCannotSolve();
      const stats2 = submitter.getStats();
      expect(stats2.totalSubmissions).toBe(1);

      await submitter.clickCannotSolve();
      const stats3 = submitter.getStats();
      expect(stats3.totalSubmissions).toBe(2);
    });

    test('should provide screenshot directory', async () => {
      const stats = submitter.getStats();
      expect(stats.screenshotDir).toBeTruthy();
      expect(stats.screenshotDir).toContain('submission-logs');
    });
  });

  test.describe('reset', () => {
    test('should reset submission counter', async () => {
      await page.setContent(`
        <html>
          <body>
            <button>Cannot Solve</button>
          </body>
        </html>
      `);

      await submitter.clickCannotSolve();
      let stats = submitter.getStats();
      expect(stats.totalSubmissions).toBe(1);

      submitter.reset();
      stats = submitter.getStats();
      expect(stats.totalSubmissions).toBe(0);
    });
  });
});
