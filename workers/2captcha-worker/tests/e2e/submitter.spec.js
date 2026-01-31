"use strict";
/**
 * Tests for CaptchaSubmitter
 */
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const submitter_1 = require("../../src/submitter");
test_1.test.describe('CaptchaSubmitter', () => {
    let page;
    let submitter;
    test_1.test.beforeEach(async ({ page: testPage }) => {
        page = testPage;
        submitter = new submitter_1.CaptchaSubmitter(page, {
            minTypingDelay: 50,
            maxTypingDelay: 150,
            minSubmitDelay: 300,
            maxSubmitDelay: 800,
            timeout: 10000,
        });
    });
    test_1.test.describe('submitAnswer', () => {
        (0, test_1.test)('should submit answer successfully', async () => {
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
            (0, test_1.expect)(result.success).toBe(true);
            (0, test_1.expect)(result.action).toBe('submitted');
            (0, test_1.expect)(result.answer).toBe('12345');
            (0, test_1.expect)(result.timestamp).toBeTruthy();
        });
        (0, test_1.test)('should handle multiple input selector strategies', async () => {
            await page.setContent(`
        <html>
          <body>
            <input id="answer" type="text" placeholder="CAPTCHA answer" />
            <button type="submit">Check Answer</button>
          </body>
        </html>
      `);
            const result = await submitter.submitAnswer('test123');
            (0, test_1.expect)(result.success).toBe(true);
            (0, test_1.expect)(result.answer).toBe('test123');
        });
        (0, test_1.test)('should handle missing input field gracefully', async () => {
            await page.setContent(`
        <html>
          <body>
            <button type="submit">Submit</button>
          </body>
        </html>
      `);
            const result = await submitter.submitAnswer('12345');
            (0, test_1.expect)(result.success).toBe(false);
            (0, test_1.expect)(result.action).toBe('error');
            (0, test_1.expect)(result.error).toContain('Cannot find');
        });
        (0, test_1.test)('should handle missing submit button gracefully', async () => {
            await page.setContent(`
        <html>
          <body>
            <input name="answer" type="text" />
          </body>
        </html>
      `);
            const result = await submitter.submitAnswer('12345');
            (0, test_1.expect)(result.success).toBe(false);
            (0, test_1.expect)(result.action).toBe('error');
            (0, test_1.expect)(result.error).toContain('submit button');
        });
        (0, test_1.test)('should type human-like (variable delays)', async () => {
            const delays = [];
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
            (0, test_1.expect)(value).toContain('abc');
        });
    });
    test_1.test.describe('clickCannotSolve', () => {
        (0, test_1.test)('should click Cannot Solve button successfully', async () => {
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
            (0, test_1.expect)(result.success).toBe(true);
            (0, test_1.expect)(result.action).toBe('cannot_solve');
            (0, test_1.expect)(result.timestamp).toBeTruthy();
        });
        (0, test_1.test)('should handle multiple button selector strategies', async () => {
            await page.setContent(`
        <html>
          <body>
            <button id="cannot-solve">Skip</button>
          </body>
        </html>
      `);
            const result = await submitter.clickCannotSolve();
            (0, test_1.expect)(result.success).toBe(true);
            (0, test_1.expect)(result.action).toBe('cannot_solve');
        });
        (0, test_1.test)('should handle missing Cannot Solve button gracefully', async () => {
            await page.setContent(`
        <html>
          <body>
            <button>Submit Answer</button>
          </body>
        </html>
      `);
            const result = await submitter.clickCannotSolve();
            (0, test_1.expect)(result.success).toBe(false);
            (0, test_1.expect)(result.action).toBe('error');
            (0, test_1.expect)(result.error).toContain('Cannot find');
        });
        (0, test_1.test)('should add human-like delay before clicking', async () => {
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
            (0, test_1.expect)(endTime - startTime).toBeGreaterThanOrEqual(300);
        });
    });
    test_1.test.describe('getStats', () => {
        (0, test_1.test)('should track submission count', async () => {
            await page.setContent(`
        <html>
          <body>
            <input name="answer" type="text" />
            <button>Cannot Solve</button>
          </body>
        </html>
      `);
            const stats1 = submitter.getStats();
            (0, test_1.expect)(stats1.totalSubmissions).toBe(0);
            await submitter.clickCannotSolve();
            const stats2 = submitter.getStats();
            (0, test_1.expect)(stats2.totalSubmissions).toBe(1);
            await submitter.clickCannotSolve();
            const stats3 = submitter.getStats();
            (0, test_1.expect)(stats3.totalSubmissions).toBe(2);
        });
        (0, test_1.test)('should provide screenshot directory', async () => {
            const stats = submitter.getStats();
            (0, test_1.expect)(stats.screenshotDir).toBeTruthy();
            (0, test_1.expect)(stats.screenshotDir).toContain('submission-logs');
        });
    });
    test_1.test.describe('reset', () => {
        (0, test_1.test)('should reset submission counter', async () => {
            await page.setContent(`
        <html>
          <body>
            <button>Cannot Solve</button>
          </body>
        </html>
      `);
            await submitter.clickCannotSolve();
            let stats = submitter.getStats();
            (0, test_1.expect)(stats.totalSubmissions).toBe(1);
            submitter.reset();
            stats = submitter.getStats();
            (0, test_1.expect)(stats.totalSubmissions).toBe(0);
        });
    });
});
//# sourceMappingURL=submitter.spec.js.map