import { Page } from 'playwright';
import { AccuracyTracker } from './tracker';

/**
 * 2Captcha Result Checker
 * Prüft das Feedback nach Submission
 */
export class CaptchaResultChecker {
  private tracker: AccuracyTracker;
  private page: Page;

  constructor(page: Page, tracker: AccuracyTracker) {
    this.page = page;
    this.tracker = tracker;
  }

  /**
   * Warte auf Feedback und prüfe ob Lösung korrekt war
   * @returns true wenn korrekt, false wenn falsch
   */
  async checkResult(): Promise<boolean> {
    try {
      // Warte auf eines der möglichen Feedback-Elemente
      const feedbackSelectors = [
        '.feedback',
        '.result',
        '[data-test="feedback"]',
        '.success-message',
        '.error-message',
        '.status-message',
      ];

      let feedbackElement = null;

      for (const selector of feedbackSelectors) {
        try {
          feedbackElement = await this.page.waitForSelector(selector, {
            timeout: 5000,
          });
          if (feedbackElement) break;
        } catch {
          continue;
        }
      }

      if (!feedbackElement) {
        this.tracker.recordSubmission('unknown', false);
        return false;
      }

      // Get feedback text
      const feedbackText = await feedbackElement.textContent();
      if (!feedbackText) {
        this.tracker.recordSubmission('unknown', false);
        return false;
      }

      // Prüfe auf Success-Indikatoren
      const isCorrect =
        feedbackText.includes('Correct') ||
        feedbackText.includes('OK') ||
        feedbackText.includes('Success') ||
        feedbackText.includes('Accepted') ||
        feedbackText.toLowerCase().includes('correct') ||
        feedbackText.toLowerCase().includes('accepted');

      // Prüfe auch CSS-Klasse
      const elementClass = await feedbackElement.getAttribute('class');
      if (elementClass) {
        if (
          elementClass.includes('success') ||
          elementClass.includes('correct')
        ) {
          this.tracker.recordSubmission(feedbackText, true);
          return true;
        }
        if (
          elementClass.includes('error') ||
          elementClass.includes('wrong')
        ) {
          this.tracker.recordSubmission(feedbackText, false);
          return false;
        }
      }

      // Record das Ergebnis
      this.tracker.recordSubmission(feedbackText, isCorrect);
      return isCorrect;
    } catch (error) {
      console.error('Error checking result:', error);
      this.tracker.recordSkipped();
      return false;
    }
  }

  /**
   * Wait for feedback with timeout and return result
   */
  async waitForFeedback(timeoutMs = 10000): Promise<{
    success: boolean;
    text: string;
  }> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const isCorrect = await this.checkResult();

        // Get feedback text for logging
        const feedbackSelectors = [
          '.feedback',
          '.result',
          '[data-test="feedback"]',
          '.success-message',
          '.error-message',
          '.status-message',
        ];

        let feedbackText = '';
        for (const selector of feedbackSelectors) {
          try {
            const element = await this.page.$(selector);
            if (element) {
              feedbackText = await element.textContent() || '';
              break;
            }
          } catch {
            continue;
          }
        }

        return {
          success: isCorrect,
          text: feedbackText,
        };
      } catch {
        // Retry
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    this.tracker.recordSkipped();
    return {
      success: false,
      text: 'Timeout waiting for feedback',
    };
  }
}

export default CaptchaResultChecker;
