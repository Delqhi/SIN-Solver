/**
 * 2Captcha Answer Submission & Cannot-Solve Automation
 * 
 * Implements:
 * - Auto-submit solved CAPTCHA answers
 * - Click "Cannot Solve" button when needed
 * - Human-like delays and behavior
 * - Error handling & retries
 */

import { Page, Locator } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuration for submission behavior
 */
interface SubmitterConfig {
  minTypingDelay: number;  // Minimum ms between keystrokes
  maxTypingDelay: number;  // Maximum ms between keystrokes
  minSubmitDelay: number;  // Min delay before clicking submit
  maxSubmitDelay: number;  // Max delay before clicking submit
  screenshotDir: string;   // Directory for submission screenshots
  timeout: number;         // Default timeout for wait operations
}

/**
 * Result from submission attempt
 */
interface SubmissionResult {
  success: boolean;
  action: 'submitted' | 'cannot_solve' | 'error';
  answer?: string;
  timestamp: string;
  screenshot?: string;
  error?: string;
}

/**
 * Main Submitter class for 2Captcha answer handling
 */
export class CaptchaSubmitter {
  private page: Page;
  private config: SubmitterConfig;
  private submissionCount: number = 0;

  constructor(page: Page, config?: Partial<SubmitterConfig>) {
    this.page = page;
    this.config = {
      minTypingDelay: 50,
      maxTypingDelay: 300,
      minSubmitDelay: 500,
      maxSubmitDelay: 2000,
      screenshotDir: path.join(process.cwd(), 'submission-logs'),
      timeout: 15000,
      ...config,
    };

    // Ensure screenshot directory exists
    fs.mkdirSync(this.config.screenshotDir, { recursive: true });
  }

  /**
   * Generate random delay in milliseconds
   */
  private randomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Wait for specified milliseconds
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Simulate human-like typing with variable delays
   */
  private async typeHuman(input: Locator, text: string): Promise<void> {
    for (const char of text) {
      await input.type(char, {
        delay: this.randomDelay(
          this.config.minTypingDelay,
          this.config.maxTypingDelay
        ),
      });
    }
  }

  /**
   * Take screenshot for audit trail
   */
  private async screenshot(label: string): Promise<string> {
    const filename = `submission-${this.submissionCount}-${label}-${Date.now()}.png`;
    const filepath = path.join(this.config.screenshotDir, filename);
    
    try {
      await this.page.screenshot({ path: filepath, fullPage: true });
      return filepath;
    } catch (error) {
      console.warn(`Failed to save screenshot: ${error}`);
      return '';
    }
  }

  /**
   * Detect input field for CAPTCHA answer
   * Tries multiple selector strategies
   */
  private async findInputField(): Promise<Locator | null> {
    const selectors = [
      'input[name="answer"]',
      'input[id="answer"]',
      'input[type="text"][data-captcha]',
      'input[placeholder*="answer"]',
      'input[placeholder*="captcha"]',
      '.captcha-input input',
      '#captcha-input',
      'input[data-testid="captcha-answer"]',
    ];

    for (const selector of selectors) {
      try {
        const element = this.page.locator(selector);
        const count = await element.count();
        if (count > 0) {
          console.log(`✅ Found input field with selector: ${selector}`);
          return element.first();
        }
      } catch (error) {
        // Selector failed, try next
        continue;
      }
    }

    return null;
  }

  /**
   * Detect submit button for CAPTCHA answer
   * Tries multiple selector strategies
   */
  private async findSubmitButton(): Promise<Locator | null> {
    const selectors = [
      'button[type="submit"]',
      'button:has-text("Submit")',
      'button:has-text("Check Answer")',
      'button:has-text("Verify")',
      'button[id="submit"]',
      '.captcha-submit button',
      'input[type="submit"]',
      'a[data-action="submit"]',
    ];

    for (const selector of selectors) {
      try {
        const element = this.page.locator(selector);
        const count = await element.count();
        if (count > 0) {
          console.log(`✅ Found submit button with selector: ${selector}`);
          return element.first();
        }
      } catch (error) {
        // Selector failed, try next
        continue;
      }
    }

    return null;
  }

  /**
   * Detect "Cannot Solve" button
   * Tries multiple selector strategies
   */
  private async findCannotSolveButton(): Promise<Locator | null> {
    const selectors = [
      'button:has-text("Cannot Solve")',
      'button:has-text("Cannot solve")',
      'button:has-text("Skip")',
      'button[data-action="cannot-solve"]',
      'button[id="cannot-solve"]',
      '.cannot-solve-btn',
      'button[aria-label*="Cannot"]',
      'a:has-text("Cannot Solve")',
    ];

    for (const selector of selectors) {
      try {
        const element = this.page.locator(selector);
        const count = await element.count();
        if (count > 0) {
          console.log(`✅ Found Cannot Solve button with selector: ${selector}`);
          return element.first();
        }
      } catch (error) {
        // Selector failed, try next
        continue;
      }
    }

    return null;
  }

  /**
   * Submit a CAPTCHA answer with human-like behavior
   * 
   * @param answer - The CAPTCHA answer to submit
   * @returns SubmissionResult with success status
   */
  async submitAnswer(answer: string): Promise<SubmissionResult> {
    this.submissionCount++;
    const startTime = new Date().toISOString();
    
    try {
      console.log(`\n🔄 Submission #${this.submissionCount}: "${answer}"`);

      // Take screenshot before submission
      const beforeScreenshot = await this.screenshot('before-submit');

      // Find input field
      const input = await this.findInputField();
      if (!input) {
        throw new Error('Cannot find CAPTCHA answer input field');
      }

      // Wait for input to be visible and enabled
      await input.waitFor({ state: 'visible', timeout: this.config.timeout });
      
      // Clear any existing text using keyboard shortcuts (Ctrl+A then Delete)
      await input.click();
      await this.page.keyboard.press('Control+A');
      await this.page.keyboard.press('Delete');

      // Random delay before typing (human-like)
      await this.delay(this.randomDelay(200, 500));

      // Type answer with human-like delays
      console.log(`⌨️  Typing answer...`);
      await this.typeHuman(input, answer);

      // Random delay before submit (human-like)
      const submitDelay = this.randomDelay(
        this.config.minSubmitDelay,
        this.config.maxSubmitDelay
      );
      console.log(`⏳ Waiting ${submitDelay}ms before submit...`);
      await this.delay(submitDelay);

      // Take screenshot after typing, before submit
      const typedScreenshot = await this.screenshot('after-typing');

      // Find and click submit button
      const submitBtn = await this.findSubmitButton();
      if (!submitBtn) {
        throw new Error('Cannot find submit button');
      }

      // Move mouse to button location (human-like)
      const box = await submitBtn.boundingBox();
      if (box) {
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        await this.page.mouse.move(centerX, centerY);
        await this.delay(this.randomDelay(100, 300));
      }

      // Click submit
      console.log(`✅ Clicking submit button...`);
      await submitBtn.click();

      // Wait for result (next CAPTCHA or confirmation)
      console.log(`⏳ Waiting for response...`);
      try {
        // Wait for either next CAPTCHA or success message
        await Promise.race([
          this.page.waitForSelector('.captcha-image, [data-captcha], input[name="answer"]', {
            timeout: this.config.timeout,
          }),
          this.page.waitForNavigation({ timeout: this.config.timeout })
            .catch(() => null), // Navigation might not occur
        ]);
      } catch (error) {
        console.warn('⚠️  Timeout waiting for response, but submission likely succeeded');
      }

      // Take screenshot after submission
      const afterScreenshot = await this.screenshot('after-submit');

      const result: SubmissionResult = {
        success: true,
        action: 'submitted',
        answer,
        timestamp: startTime,
        screenshot: afterScreenshot,
      };

      console.log(`✅ Answer submitted successfully!`);
      return result;

    } catch (error) {
      console.error(`❌ Submission failed: ${error}`);

      // Take screenshot on error
      const errorScreenshot = await this.screenshot('error');

      const result: SubmissionResult = {
        success: false,
        action: 'error',
        timestamp: startTime,
        screenshot: errorScreenshot,
        error: error instanceof Error ? error.message : String(error),
      };

      return result;
    }
  }

  /**
   * Click "Cannot Solve" button when CAPTCHA cannot be solved
   * 
   * @returns SubmissionResult with action taken
   */
  async clickCannotSolve(): Promise<SubmissionResult> {
    this.submissionCount++;
    const startTime = new Date().toISOString();
    
    try {
      console.log(`\n🚫 Cannot Solve #${this.submissionCount}`);

      // Take screenshot before action
      const beforeScreenshot = await this.screenshot('before-cannot-solve');

      // Find "Cannot Solve" button
      const cannotSolveBtn = await this.findCannotSolveButton();
      if (!cannotSolveBtn) {
        throw new Error('Cannot find "Cannot Solve" button');
      }

      // Wait for button to be visible and enabled
      await cannotSolveBtn.waitFor({ state: 'visible', timeout: this.config.timeout });

      // Random delay before clicking (human-like)
      await this.delay(this.randomDelay(300, 800));

      // Move mouse to button location (human-like)
      const box = await cannotSolveBtn.boundingBox();
      if (box) {
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        await this.page.mouse.move(centerX, centerY);
        await this.delay(this.randomDelay(100, 300));
      }

      // Click button
      console.log(`🖱️  Clicking "Cannot Solve" button...`);
      await cannotSolveBtn.click();

      // Wait for next CAPTCHA or confirmation
      console.log(`⏳ Waiting for next assignment...`);
      try {
        await Promise.race([
          this.page.waitForSelector('.captcha-image, [data-captcha], input[name="answer"]', {
            timeout: this.config.timeout,
          }),
          this.page.waitForNavigation({ timeout: this.config.timeout })
            .catch(() => null),
        ]);
      } catch (error) {
        console.warn('⚠️  Timeout waiting for next CAPTCHA');
      }

      // Take screenshot after action
      const afterScreenshot = await this.screenshot('after-cannot-solve');

      const result: SubmissionResult = {
        success: true,
        action: 'cannot_solve',
        timestamp: startTime,
        screenshot: afterScreenshot,
      };

      console.log(`✅ Cannot Solve action completed!`);
      return result;

    } catch (error) {
      console.error(`❌ Cannot Solve action failed: ${error}`);

      // Take screenshot on error
      const errorScreenshot = await this.screenshot('error');

      const result: SubmissionResult = {
        success: false,
        action: 'error',
        timestamp: startTime,
        screenshot: errorScreenshot,
        error: error instanceof Error ? error.message : String(error),
      };

      return result;
    }
  }

  /**
   * Get submission statistics
   */
  getStats(): {
    totalSubmissions: number;
    screenshotDir: string;
  } {
    return {
      totalSubmissions: this.submissionCount,
      screenshotDir: this.config.screenshotDir,
    };
  }

  /**
   * Reset submission counter
   */
  reset(): void {
    this.submissionCount = 0;
    console.log('🔄 Submission counter reset');
  }
}

/**
 * Export for module usage
 */
export default CaptchaSubmitter;
