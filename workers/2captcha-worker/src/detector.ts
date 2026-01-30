/**
 * 🚀 2CAPTCHA DETECTOR - WORKER MODE
 * =======================================
 * Detects & captures CAPTCHA challenges from 2captcha.com worker platform
 * 
 * Features:
 * - Automatic CAPTCHA type detection
 * - Screenshot capture from CAPTCHA area
 * - Timeout tracking (60-120s per CAPTCHA)
 * - Element interaction detection
 * - Error resilience & auto-retry
 * - Alert system integration (errors, timeouts, failures)
 */

import { Page, ElementHandle, Locator } from 'playwright';
import { AlertSystem } from './alerts';

export interface CaptchaDetectionResult {
  detected: boolean;
  type: CaptchaType;
  elements: CaptchaElements;
  screenshot?: Buffer;
  screenshotBase64?: string;
  timeoutMs: number;
  startTime: number;
  metadata: Record<string, any>;
}

export interface CaptchaElements {
  imageElement?: ElementHandle<HTMLImageElement | HTMLCanvasElement>;
  imageLocator?: Locator;
  inputElement?: ElementHandle<HTMLInputElement>;
  inputLocator?: Locator;
  submitButton?: ElementHandle<HTMLButtonElement>;
  submitButtonLocator?: Locator;
  cannotSolveButton?: ElementHandle<HTMLButtonElement>;
  refreshButton?: ElementHandle<HTMLButtonElement>;
  container?: ElementHandle<HTMLDivElement>;
  containerLocator?: Locator;
}

export enum CaptchaType {
  ImageCaptcha = 'image_captcha',
  TextCaptcha = 'text_captcha',
  RecaptchaV2 = 'recaptcha_v2',
  RecaptchaV3 = 'recaptcha_v3',
  HCaptcha = 'hcaptcha',
  SliderCaptcha = 'slider_captcha',
  ClickCaptcha = 'click_captcha',
  RotateCaptcha = 'rotate_captcha',
  Unknown = 'unknown',
}

/**
 * 2Captcha Detector - Main Detection Engine
 */
export class TwoCaptchaDetector {
  private page: Page;
  private alertSystem: AlertSystem;
  private timeoutMs: number = 120000; // Default 120s
  private detectionAttempts: number = 0;
  private maxAttempts: number = 10;
  private waitBetweenAttemptsMs: number = 500;
  private startTime: number = 0;
  private timeoutAlertSent: boolean = false; // Track if timeout alert already sent

  constructor(page: Page, alertSystem: AlertSystem, timeoutMs?: number) {
    this.page = page;
    this.alertSystem = alertSystem;
    this.startTime = Date.now();
    if (timeoutMs) {
      this.timeoutMs = timeoutMs;
    }
  }

   /**
    * Main detection method - returns complete CAPTCHA info
    * Sends alerts on detection failures, timeouts, and screenshot issues
    */
   async detect(): Promise<CaptchaDetectionResult> {
     const startTime = Date.now();
     const result: CaptchaDetectionResult = {
       detected: false,
       type: CaptchaType.Unknown,
       elements: {},
       timeoutMs: this.timeoutMs,
       startTime,
       metadata: {},
     };

     try {
       // Check if timeout is approaching BEFORE attempting detection
       if (this.isTimeoutApproaching(30000)) {
         if (!this.timeoutAlertSent) {
           this.alertSystem.timeoutWarning(
             'DETECTOR',
             this.getRemainingTime(),
             { maxTimeout: this.timeoutMs, detectionPhase: 'start' }
           );
           this.timeoutAlertSent = true;
         }
       }

       // Step 1: Wait for CAPTCHA to appear (with retries)
       try {
         await this.waitForCaptchaPresence();
       } catch (waitError) {
         this.alertSystem.errorAlert(
           waitError instanceof Error ? waitError : new Error(String(waitError)),
           {
             jobId: 'detector-job',
             jobType: 'detect',
             phase: 'waitForCaptchaPresence',
             attempts: this.detectionAttempts,
             timeElapsed: Date.now() - startTime,
           }
         );
         throw waitError;
       }

       // Step 2: Detect CAPTCHA type
       result.type = await this.detectCaptchaType();
       result.detected = result.type !== CaptchaType.Unknown;

       if (!result.detected) {
         // Send alert for detection failure
         this.alertSystem.errorAlert(
           new Error(`Failed to detect CAPTCHA type after ${this.detectionAttempts} attempts`),
           {
             jobId: 'detector-job',
             jobType: 'detect',
             phase: 'detectCaptchaType',
             attempts: this.detectionAttempts,
             detectedType: result.type,
             timeElapsed: Date.now() - startTime,
           }
         );
         return result;
       }

       // Check timeout again before element location
       if (this.isTimeoutApproaching(20000)) {
         if (!this.timeoutAlertSent) {
           this.alertSystem.timeoutWarning(
             'DETECTOR',
             this.getRemainingTime(),
             { maxTimeout: this.timeoutMs, detectionPhase: 'afterTypeDetection' }
           );
           this.timeoutAlertSent = true;
         }
       }

       // Step 3: Locate all interactive elements
       try {
         result.elements = await this.locateElements(result.type);
       } catch (elementError) {
         this.alertSystem.errorAlert(
           elementError instanceof Error ? elementError : new Error(String(elementError)),
           {
             jobId: 'detector-job',
             jobType: 'detect',
             phase: 'locateElements',
             captchaType: result.type,
             timeElapsed: Date.now() - startTime,
           }
         );
         throw elementError;
       }

       // Step 4: Take screenshot of CAPTCHA area
       const screenshotBuffer = await this.captureScreenshot(
         result.elements.containerLocator || result.elements.imageLocator
       );
       if (screenshotBuffer) {
         result.screenshot = screenshotBuffer;
         result.screenshotBase64 = screenshotBuffer.toString('base64');
       } else {
         // Send alert for screenshot failure
         this.alertSystem.errorAlert(
           new Error('Failed to capture screenshot of CAPTCHA area'),
           {
             jobId: 'detector-job',
             jobType: 'detect',
             phase: 'captureScreenshot',
             captchaType: result.type,
             elementCount: Object.keys(result.elements).length,
             timeElapsed: Date.now() - startTime,
           }
         );
       }

       // Step 5: Gather metadata
       result.metadata = await this.gatherMetadata(result.type, result.elements);

       console.log(`[CAPTCHA DETECTED] Type: ${result.type}, Elements: ${Object.keys(result.elements).length}`);
       return result;
     } catch (error) {
       console.error(`[CAPTCHA DETECTION ERROR] ${error instanceof Error ? error.message : String(error)}`);
       
       // Send alert for detection error
       this.alertSystem.errorAlert(
         error instanceof Error ? error : new Error(String(error)),
         {
           jobId: 'detector-job',
           jobType: 'detect',
           phase: 'detect',
           timeElapsed: Date.now() - startTime,
           attempts: this.detectionAttempts,
         }
       );
       
       result.detected = false;
       return result;
     }
   }

   /**
    * Wait for CAPTCHA to appear on page with dynamic waits
    * Sends timeout warnings if approaching deadline
    */
   private async waitForCaptchaPresence(maxWaitMs: number = 30000): Promise<void> {
     const startTime = Date.now();
     this.detectionAttempts = 0;

     while (Date.now() - startTime < maxWaitMs) {
       this.detectionAttempts++;

       // Check timeout approaching during wait loop
       if (this.isTimeoutApproaching(10000) && !this.timeoutAlertSent) {
         this.alertSystem.timeoutWarning(
           'DETECTOR_WAIT',
           this.getRemainingTime(),
           { 
             maxWaitMs, 
             elapsedWaitMs: Date.now() - startTime,
             detectionAttempts: this.detectionAttempts 
           }
         );
         this.timeoutAlertSent = true;
       }

       // Check for common CAPTCHA selectors
       const captchaFound = await Promise.race([
         this.checkImageCaptcha(),
         this.checkRecaptchaV2(),
         this.checkHCaptcha(),
         this.checkSliderCaptcha(),
         this.checkClickCaptcha(),
       ]).catch(() => false);

       if (captchaFound) {
         console.log(`[CAPTCHA PRESENCE] Found after ${this.detectionAttempts} attempts`);
         return;
       }

       // Adaptive wait - reduce delay on each iteration
       const delay = Math.max(100, this.waitBetweenAttemptsMs - (this.detectionAttempts * 10));
       await this.page.waitForTimeout(delay);
     }

     throw new Error(`CAPTCHA not detected within ${maxWaitMs}ms`);
   }

  /**
   * Detect CAPTCHA type by checking various selectors
   */
  private async detectCaptchaType(): Promise<CaptchaType> {
    const checks = [
      { type: CaptchaType.ImageCaptcha, check: () => this.checkImageCaptcha() },
      { type: CaptchaType.RecaptchaV2, check: () => this.checkRecaptchaV2() },
      { type: CaptchaType.HCaptcha, check: () => this.checkHCaptcha() },
      { type: CaptchaType.SliderCaptcha, check: () => this.checkSliderCaptcha() },
      { type: CaptchaType.ClickCaptcha, check: () => this.checkClickCaptcha() },
      { type: CaptchaType.RotateCaptcha, check: () => this.checkRotateCaptcha() },
      { type: CaptchaType.TextCaptcha, check: () => this.checkTextCaptcha() },
    ];

    for (const { type, check } of checks) {
      try {
        const found = await check();
        if (found) return type;
      } catch {
        // Continue to next check
      }
    }

    return CaptchaType.Unknown;
  }

  /**
   * Check for generic image CAPTCHA (2captcha format)
   * 
   * BEST PRACTICES 2026:
   * - Don't match on filename alone (avoids logo false positives)
   * - Check image dimensions (CAPTCHAs are typically 200-400px)
   * - Verify element is in form context
   * - Check for associated input field
   */
  private async checkImageCaptcha(): Promise<boolean> {
    // Smart selectors that avoid logo false positives
    const selectors = [
      // Class-based (more reliable than src)
      '.captcha__image',
      'img.captcha-image',
      '[class*="captcha-challenge"] img',
      '[class*="captcha-wrapper"] img',
      
      // Form context selectors
      'form img[src*="captcha"]',
      '.captcha-container img',
      '.captcha-box img',
      
      // Alt text (logos usually don't have challenge alt text)
      'img[alt="CAPTCHA" i]',
      'img[alt="Security code" i]',
      'img[alt="Verification code" i]',
    ];

    for (const selector of selectors) {
      const element = await this.page.$(selector);
      if (element && await this.validateCaptchaImage(element)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Validate that an image is actually a CAPTCHA (not a logo)
   * 
   * Checks:
   * 1. Image dimensions (CAPTCHAs are typically 150-500px)
   * 2. Not a logo (position, surrounding context)
   * 3. Has associated input field nearby
   */
  private async validateCaptchaImage(element: ElementHandle): Promise<boolean> {
    try {
      // Check 1: Image dimensions
      const box = await element.boundingBox();
      if (!box) return false;
      
      // CAPTCHAs are typically 150-500px wide and 50-200px tall
      // Logos are often smaller or much larger
      const isValidSize = box.width >= 150 && box.width <= 500 && 
                          box.height >= 50 && box.height <= 200;
      
      if (!isValidSize) {
        console.log(`[CAPTCHA VALIDATION] Rejected: Invalid size ${box.width}x${box.height}`);
        return false;
      }

      // Check 2: Look for associated input field
      // Real CAPTCHAs always have an input field nearby
      const hasInput = await this.hasNearbyInput(element);
      if (!hasInput) {
        console.log('[CAPTCHA VALIDATION] Rejected: No input field nearby');
        return false;
      }

      // Check 3: Not in header/footer (where logos usually are)
      const isInContent = await this.isInContentArea(element);
      if (!isInContent) {
        console.log('[CAPTCHA VALIDATION] Rejected: Not in content area');
        return false;
      }

      console.log(`[CAPTCHA VALIDATION] Accepted: ${box.width}x${box.height}`);
      return true;

    } catch (error) {
      console.error('[CAPTCHA VALIDATION ERROR]', error);
      return false;
    }
  }

  /**
   * Check if element has an input field nearby (within 200px)
   */
  private async hasNearbyInput(captchaElement: ElementHandle): Promise<boolean> {
    try {
      // Look for input fields near the CAPTCHA
      const inputSelectors = [
        'input[type="text"]',
        'input[name*="captcha" i]',
        'input[placeholder*="captcha" i]',
        'input[placeholder*="code" i]',
        '.captcha-input',
      ];

      for (const selector of inputSelectors) {
        const input = await this.page.$(selector);
        if (input) {
          // Check if they're close to each other
          const captchaBox = await captchaElement.boundingBox();
          const inputBox = await input.boundingBox();
          
          if (captchaBox && inputBox) {
            const distance = Math.abs(captchaBox.y - inputBox.y);
            if (distance < 200) { // Within 200px vertically
              return true;
            }
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Check if element is in main content area (not header/footer)
   */
  private async isInContentArea(element: ElementHandle): Promise<boolean> {
    try {
      const box = await element.boundingBox();
      if (!box) return false;

      // Get viewport size
      const viewport = await this.page.viewportSize();
      if (!viewport) return true; // Can't determine, assume valid

      // Check if element is in middle 80% of page (not header/footer)
      const headerThreshold = viewport.height * 0.15; // Top 15%
      const footerThreshold = viewport.height * 0.85; // Bottom 15%

      const isInContent = box.y > headerThreshold && box.y < footerThreshold;
      return isInContent;
    } catch {
      return true; // Can't determine, assume valid
    }
  }

  /**
   * Check for Google reCAPTCHA v2
   */
  private async checkRecaptchaV2(): Promise<boolean> {
    const selectors = [
      'iframe[src*="recaptcha"][src*="api2"]',
      'div.g-recaptcha',
      'div[data-sitekey]',
      'iframe[title*="reCAPTCHA"]',
    ];

    for (const selector of selectors) {
      const exists = await this.page.$(selector);
      if (exists) return true;
    }
    return false;
  }

  /**
   * Check for hCaptcha
   */
  private async checkHCaptcha(): Promise<boolean> {
    const selectors = [
      'iframe[src*="hcaptcha"]',
      'div.h-captcha',
      'div[data-sitekey*="h_"]',
    ];

    for (const selector of selectors) {
      const exists = await this.page.$(selector);
      if (exists) return true;
    }
    return false;
  }

  /**
   * Check for slider CAPTCHA
   */
  private async checkSliderCaptcha(): Promise<boolean> {
    const selectors = [
      '.slider-captcha',
      '[class*="slider"][class*="captcha"]',
      '.puzzle-captcha',
      'input[type="range"]',
    ];

    for (const selector of selectors) {
      const exists = await this.page.$(selector);
      if (exists) return true;
    }
    return false;
  }

  /**
   * Check for click-based CAPTCHA
   */
  private async checkClickCaptcha(): Promise<boolean> {
    const selectors = [
      '.click-captcha',
      '[class*="click"][class*="captcha"]',
      '.image-select-captcha',
      '.click-to-verify',
    ];

    for (const selector of selectors) {
      const exists = await this.page.$(selector);
      if (exists) return true;
    }
    return false;
  }

  /**
   * Check for rotate CAPTCHA
   */
  private async checkRotateCaptcha(): Promise<boolean> {
    const selectors = [
      '.rotate-captcha',
      '[class*="rotate"][class*="captcha"]',
      '.image-rotate-captcha',
    ];

    for (const selector of selectors) {
      const exists = await this.page.$(selector);
      if (exists) return true;
    }
    return false;
  }

  /**
   * Check for text-based CAPTCHA
   */
  private async checkTextCaptcha(): Promise<boolean> {
    const selectors = [
      'img[alt*="code" i]',
      '[class*="text"][class*="captcha"]',
      '.text-captcha',
    ];

    for (const selector of selectors) {
      const exists = await this.page.$(selector);
      if (exists) return true;
    }
    return false;
  }

  /**
   * Locate all interactive elements for the CAPTCHA
   */
  private async locateElements(type: CaptchaType): Promise<CaptchaElements> {
    const elements: CaptchaElements = {};

    // Image/canvas element
    const imageSelectorMap: Record<CaptchaType, string[]> = {
      [CaptchaType.ImageCaptcha]: ['img[src*="captcha"]', '.captcha__image', 'img.captcha-image'],
      [CaptchaType.TextCaptcha]: ['img[alt*="code" i]', '.text-captcha img'],
      [CaptchaType.RecaptchaV2]: ['iframe[src*="recaptcha"]', 'div.g-recaptcha'],
      [CaptchaType.RecaptchaV3]: ['div[data-sitekey]'],
      [CaptchaType.HCaptcha]: ['iframe[src*="hcaptcha"]', 'div.h-captcha'],
      [CaptchaType.SliderCaptcha]: ['.slider-captcha', 'input[type="range"]'],
      [CaptchaType.ClickCaptcha]: ['.click-captcha', '.image-select-captcha'],
      [CaptchaType.RotateCaptcha]: ['.rotate-captcha', '.image-rotate-captcha'],
      [CaptchaType.Unknown]: [],
    };

    const imageSelectors = imageSelectorMap[type] || [];
    for (const selector of imageSelectors) {
      const locator = this.page.locator(selector).first();
      if (await locator.isVisible().catch(() => false)) {
        elements.imageLocator = locator;
        elements.imageElement = await locator.elementHandle().catch(() => undefined);
        break;
      }
    }

    // Answer input field
    const inputSelectors = [
      'input[name="answer"]',
      'input[name="captcha"]',
      'input[placeholder*="answer" i]',
      'input[placeholder*="code" i]',
      'input[type="text"][class*="captcha"]',
    ];

    for (const selector of inputSelectors) {
      const locator = this.page.locator(selector).first();
      if (await locator.isVisible().catch(() => false)) {
        elements.inputLocator = locator;
        elements.inputElement = await locator.elementHandle().catch(() => undefined);
        break;
      }
    }

    // Submit button
    const submitSelectors = [
      'button[type="submit"]',
      '.submit-button',
      'button:has-text("Submit")',
      'button:has-text("Verify")',
      'button[class*="submit"]',
    ];

    for (const selector of submitSelectors) {
      const locator = this.page.locator(selector).first();
      if (await locator.isVisible().catch(() => false)) {
        elements.submitButtonLocator = locator;
        elements.submitButton = await locator.elementHandle().catch(() => undefined);
        break;
      }
    }

    // Cannot Solve button
    const cannotSolveLocator = this.page.locator('button:has-text("Cannot Solve")').first();
    if (await cannotSolveLocator.isVisible().catch(() => false)) {
      elements.cannotSolveButton = await cannotSolveLocator.elementHandle().catch(() => undefined);
    }

    // Container for screenshot
    const containerSelectors = [
      '.captcha-container',
      '[class*="captcha"][class*="box"]',
      'form[class*="captcha"]',
    ];

    for (const selector of containerSelectors) {
      const locator = this.page.locator(selector).first();
      if (await locator.isVisible().catch(() => false)) {
        elements.containerLocator = locator;
        elements.container = await locator.elementHandle().catch(() => undefined);
        break;
      }
    }

    return elements;
  }

  /**
   * Capture screenshot of CAPTCHA area
   */
  private async captureScreenshot(locator?: Locator): Promise<Buffer | undefined> {
    try {
      if (locator && (await locator.isVisible().catch(() => false))) {
        return await locator.screenshot({
          type: 'png',
          mask: [this.page.locator('iframe')], // Hide iframes if present
        });
      }
      return undefined;
    } catch (error) {
      console.warn(`[SCREENSHOT FAILED] ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
  }

  /**
   * Gather metadata about CAPTCHA
   */
  private async gatherMetadata(
    type: CaptchaType,
    elements: CaptchaElements
  ): Promise<Record<string, any>> {
    const metadata: Record<string, any> = {
      type,
      elementCount: Object.values(elements).filter((el) => el !== undefined).length,
      timestamp: new Date().toISOString(),
    };

    // Get image dimensions if available
    if (elements.imageElement) {
      try {
        const boundingBox = await elements.imageElement.boundingBox();
        if (boundingBox) {
          metadata.imageDimensions = {
            width: boundingBox.width,
            height: boundingBox.height,
            x: boundingBox.x,
            y: boundingBox.y,
          };
        }
      } catch {
        // Continue without dimensions
      }
    }

    // Get remaining timeout
    const elapsed = Date.now() - this.startTime;
    metadata.elapsedMs = elapsed;
    metadata.remainingMs = Math.max(0, this.timeoutMs - elapsed);
    metadata.detectionAttempts = this.detectionAttempts;

    return metadata;
  }

  /**
   * Check if timeout is approaching
   */
  isTimeoutApproaching(warningThresholdMs: number = 10000): boolean {
    const elapsed = Date.now() - this.startTime;
    const remaining = this.timeoutMs - elapsed;
    return remaining <= warningThresholdMs;
  }

  /**
   * Get remaining time in milliseconds
   */
  getRemainingTime(): number {
    const elapsed = Date.now() - this.startTime;
    return Math.max(0, this.timeoutMs - elapsed);
  }

  /**
   * Get formatted remaining time
   */
  getFormattedRemainingTime(): string {
    const remaining = this.getRemainingTime();
    const seconds = Math.floor(remaining / 1000);
    const milliseconds = remaining % 1000;
    return `${seconds}s ${milliseconds}ms`;
  }
}

/**
 * Quick detection helper - NOW WITH ALERT SYSTEM
 */
export async function detectCaptchaQuick(
  page: Page,
  alertSystem: AlertSystem
): Promise<CaptchaDetectionResult> {
  const detector = new TwoCaptchaDetector(page, alertSystem);
  return detector.detect();
}

/**
 * Detection with custom timeout - NOW WITH ALERT SYSTEM
 */
export async function detectCaptchaWithTimeout(
  page: Page,
  alertSystem: AlertSystem,
  timeoutMs: number
): Promise<CaptchaDetectionResult> {
  const detector = new TwoCaptchaDetector(page, alertSystem, timeoutMs);
  return detector.detect();
}

/**
 * Poll for CAPTCHA presence with callback - NOW WITH ALERT SYSTEM
 */
export async function pollForCaptcha(
  page: Page,
  alertSystem: AlertSystem,
  maxWaitMs: number = 60000,
  onDetected?: (result: CaptchaDetectionResult) => Promise<void>
): Promise<CaptchaDetectionResult | null> {
  const startTime = Date.now();
  let lastResult: CaptchaDetectionResult | null = null;

  while (Date.now() - startTime < maxWaitMs) {
    const result = await detectCaptchaQuick(page, alertSystem);

    if (result.detected) {
      if (onDetected) {
        await onDetected(result);
      }
      return result;
    }

    lastResult = result;
    await page.waitForTimeout(500);
  }

  return lastResult;
}
