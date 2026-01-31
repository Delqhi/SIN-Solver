import { Page } from 'playwright';
import { AccuracyTracker } from './tracker';
import CaptchaResultChecker from './result-checker';

/**
 * 2Captcha Worker mit Accuracy Tracking
 * Hauptlogik für Captcha-Solving mit Auto-Stop bei schlechter Qualität
 */
export class CaptchaWorker {
  private tracker: AccuracyTracker;
  private resultChecker: CaptchaResultChecker;
  private page: Page;
  private isRunning = false;
  private shouldStop = false;

  constructor(page: Page, trackerPath?: string) {
    this.page = page;
    this.tracker = new AccuracyTracker(trackerPath);
    this.resultChecker = new CaptchaResultChecker(page, this.tracker);

    // Setup event listeners
    this.setupTrackerListeners();
  }

  /**
   * Setup Tracker Event Listeners
   */
  private setupTrackerListeners(): void {
    // Log submissions
    this.tracker.on('SUBMISSION_RECORDED', (data) => {
      console.log(
        `✓ Submission: ${data.accuracy}% (${data.correct}/${data.total})`
      );
    });

    // Warning: Accuracy drop
    this.tracker.on('WARNING_ACCURACY_DROP', (data) => {
      console.warn(
        `⚠️  WARNING: Last 10 accuracy dropped to ${data.last10Accuracy}%`
      );
    });

    // Emergency: Stop
    this.tracker.on('EMERGENCY_STOP', (data) => {
      console.error(`🛑 EMERGENCY STOP: ${data.reason}`);
      console.error(`Stats: ${JSON.stringify(data.stats, null, 2)}`);
      this.shouldStop = true;
    });

    // Warning: Skip rate
    this.tracker.on('WARNING_SKIP_RATE_HIGH', (data) => {
      console.warn(
        `⚠️  WARNING: Skip rate ${data.skippedRate}% is too high`
      );
    });

    // Tracker paused
    this.tracker.on('TRACKER_PAUSED', (data) => {
      console.log(`⏸️  Tracker paused. Current stats: ${JSON.stringify(data.stats)}`);
    });

    // Tracker resumed
    this.tracker.on('TRACKER_RESUMED', (data) => {
      console.log(`▶️  Tracker resumed. Current stats: ${JSON.stringify(data.stats)}`);
    });
  }

  /**
   * Hauptschleife: Löse Captchas
   */
  async solveCaptchas(maxDuration = 60 * 60 * 1000): Promise<void> {
    if (this.isRunning) {
      console.warn('Worker already running');
      return;
    }

    this.isRunning = true;
    this.shouldStop = false;
    const startTime = Date.now();

    console.log('🚀 Starting Captcha Worker...');
    console.log(`⏱️  Max duration: ${maxDuration / 60000} minutes`);

    while (
      this.isRunning &&
      !this.shouldStop &&
      Date.now() - startTime < maxDuration
    ) {
      try {
        // Check if tracker allows continuation
        if (!this.tracker.canContinue()) {
          console.error('Tracker reported stop condition');
          break;
        }

        // Löse ein Captcha
        await this.solveSingleCaptcha();

        // Log status
        const stats = this.tracker.getStats();
        console.log(`Status: ${this.tracker.getStatusString()}`);

        // Kurze Pause zwischen Captchas
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Error in solve loop:', error);
        // Continue trotz Error
      }
    }

    this.isRunning = false;

    // Final report
    await this.printFinalReport();
  }

  /**
   * Löse einzelnes Captcha
   */
  private async solveSingleCaptcha(): Promise<void> {
    try {
      // Step 1: Warte auf Captcha zu erscheinen
      const captchaFound = await this.waitForCaptcha();
      if (!captchaFound) {
        console.log('No captcha found, skipping...');
        this.tracker.recordSkipped();
        return;
      }

      // Step 2: Löse das Captcha (hier würde der eigentliche Solver sein)
      const answer = await this.solveCaptchaLogic();
      if (!answer) {
        console.log('Could not solve captcha, skipping...');
        this.tracker.recordSkipped();
        return;
      }

      // Step 3: Submit die Lösung
      await this.submitAnswer(answer);

      // Step 4: Warte auf Feedback
      const feedback = await this.resultChecker.waitForFeedback(10000);
      console.log(`Feedback: ${feedback.text}`);

      // Step 5: Der Tracker wurde bereits aktualisiert via resultChecker
    } catch (error) {
      console.error('Error solving single captcha:', error);
      this.tracker.recordSkipped();
    }
  }

  /**
   * Warte bis Captcha erscheint
   */
  private async waitForCaptcha(): Promise<boolean> {
    try {
      const captchaSelectors = [
        'iframe[src*="captcha"]',
        '[data-test="captcha"]',
        '.captcha-container',
        '.captcha-frame',
      ];

      for (const selector of captchaSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          return true;
        } catch {
          continue;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Solver-Logik (Placeholder für echte Implementierung)
   */
  private async solveCaptchaLogic(): Promise<string | null> {
    try {
      // Placeholder: würde Vision AI, OCR etc. verwenden
      // Return beispiel answer
      return 'ABCD1234';
    } catch {
      return null;
    }
  }

  /**
   * Submit die Antwort
   */
  private async submitAnswer(answer: string): Promise<void> {
    try {
      // Find und fill input field
      const inputSelectors = [
        'input[type="text"]',
        'input[placeholder*="captcha"]',
        'input[placeholder*="answer"]',
        '[data-test="captcha-input"]',
      ];

      for (const selector of inputSelectors) {
        try {
          const input = await this.page.$(selector);
          if (input) {
            await input.fill(answer);
            break;
          }
        } catch {
          continue;
        }
      }

      // Find und click submit button
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Submit")',
        'button:has-text("Check")',
        '[data-test="submit"]',
      ];

      for (const selector of submitSelectors) {
        try {
          const button = await this.page.$(selector);
          if (button) {
            await button.click();
            break;
          }
        } catch {
          continue;
        }
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
    }
  }

  /**
   * Pause worker
   */
  pause(): void {
    this.isRunning = false;
    this.tracker.pause();
  }

  /**
   * Resume worker
   */
  resume(): void {
    this.isRunning = true;
    this.tracker.resume();
  }

  /**
   * Stop worker gracefully
   */
  stop(): void {
    this.shouldStop = true;
    this.isRunning = false;
  }

  /**
   * Reset für neuen Session
   */
  reset(): void {
    this.tracker.reset();
    this.shouldStop = false;
  }

  /**
   * Get aktuellen Tracker Stats
   */
  getStats() {
    return this.tracker.getStats();
  }

  /**
   * Print final report
   */
  private async printFinalReport(): Promise<void> {
    const stats = this.tracker.getStats();
    const hourly = this.tracker.getHourlyReport();

    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL REPORT');
    console.log('='.repeat(60));
    console.log(`Total Submissions: ${stats.total}`);
    console.log(`Correct: ${stats.correct}`);
    console.log(`Skipped: ${stats.skipped}`);
    console.log(`Overall Accuracy: ${stats.currentAccuracy}%`);
    console.log(`Last 10 Accuracy: ${stats.last10Accuracy}%`);
    console.log(`Session Duration: ${stats.sessionDurationMinutes} minutes`);
    console.log(`Status: ${stats.status}`);
    console.log('='.repeat(60) + '\n');

    if (hourly.lastHourEntries > 0) {
      console.log(`Last Hour - Average Accuracy: ${hourly.averageLastHour}%`);
    }
  }
}

export default CaptchaWorker;
