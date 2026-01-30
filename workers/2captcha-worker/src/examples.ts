/**
 * 2CAPTCHA DETECTOR - INTEGRATION EXAMPLE & USAGE
 * ================================================
 * Shows how to use the detector in real workflows
 */

import { Browser, Page } from 'playwright';
import { TwoCaptchaDetector, CaptchaType, detectCaptchaQuick, pollForCaptcha } from './detector';

/**
 * Example 1: Simple CAPTCHA detection
 */
export async function example1_SimplDetection(page: Page) {
  console.log('🔍 Example 1: Simple CAPTCHA Detection');

  const detector = new TwoCaptchaDetector(page);
  const result = await detector.detect();

  console.log(`✓ Detected: ${result.detected}`);
  console.log(`✓ Type: ${result.type}`);
  console.log(`✓ Elements found: ${Object.keys(result.elements).length}`);

  if (result.screenshotBase64) {
    console.log(`✓ Screenshot captured: ${result.screenshotBase64.substring(0, 50)}...`);
  }

  if (result.metadata.imageDimensions) {
    const dims = result.metadata.imageDimensions;
    console.log(`✓ Image dimensions: ${dims.width}x${dims.height}`);
  }

  return result;
}

/**
 * Example 2: Detection with timeout tracking
 */
export async function example2_TimeoutTracking(page: Page) {
  console.log('⏱️ Example 2: Timeout Tracking');

  const detector = new TwoCaptchaDetector(page, 120000); // 120 seconds
  const result = await detector.detect();

  console.log(`✓ Timeout: ${result.timeoutMs}ms (2 minutes)`);
  console.log(`✓ Remaining: ${detector.getFormattedRemainingTime()}`);
  console.log(`✓ Detection took: ${result.metadata.elapsedMs}ms`);

  // Check if timeout approaching
  const isApproaching = detector.isTimeoutApproaching(10000); // 10s warning
  if (isApproaching) {
    console.warn('⚠️ Timeout approaching! Less than 10 seconds remaining');
  }

  return result;
}

/**
 * Example 3: Polling until CAPTCHA appears
 */
export async function example3_PollingCaptcha(page: Page) {
  console.log('🔄 Example 3: Polling for CAPTCHA');

  const result = await pollForCaptcha(page, 30000, async (detected) => {
    console.log(`✓ CAPTCHA detected! Type: ${detected.type}`);

    // Auto-save screenshot
    if (detected.screenshot) {
      const fs = require('fs');
      const filename = `/tmp/captcha_${Date.now()}.png`;
      fs.writeFileSync(filename, detected.screenshot);
      console.log(`✓ Screenshot saved: ${filename}`);
    }
  });

  if (!result) {
    console.log('✗ No CAPTCHA detected after 30 seconds');
  }

  return result;
}

/**
 * Example 4: Full workflow - detect, solve, submit
 */
export async function example4_FullWorkflow(page: Page, solverFunction: (img: string) => Promise<string>) {
  console.log('🚀 Example 4: Full CAPTCHA Workflow');

  // Step 1: Detect CAPTCHA
  const detector = new TwoCaptchaDetector(page, 120000);
  const detection = await detector.detect();

  if (!detection.detected) {
    console.log('✗ No CAPTCHA detected');
    return false;
  }

  console.log(`✓ CAPTCHA detected: ${detection.type}`);

  // Step 2: Get image base64
  const imageBase64 = detection.screenshotBase64;
  if (!imageBase64) {
    console.log('✗ Failed to capture screenshot');
    return false;
  }

  console.log(`✓ Screenshot captured (${imageBase64.length} bytes)`);

  // Step 3: Solve CAPTCHA
  console.log('🧠 Solving CAPTCHA...');
  const answer = await solverFunction(imageBase64);
  console.log(`✓ Solution: ${answer}`);

  // Step 4: Fill in answer
  if (detection.elements.inputLocator) {
    await detection.elements.inputLocator.fill(answer);
    console.log(`✓ Answer filled`);
  }

  // Step 5: Check remaining time before submitting
  const remaining = detector.getRemainingTime();
  if (remaining < 5000) {
    console.warn(`⚠️ Less than 5 seconds remaining!`);
  }

  // Step 6: Submit
  if (detection.elements.submitButtonLocator) {
    await detection.elements.submitButtonLocator.click();
    console.log(`✓ Submitted`);
    return true;
  }

  console.log('✗ No submit button found');
  return false;
}

/**
 * Example 5: Error handling with auto-retry
 */
export async function example5_RobustDetection(page: Page) {
  console.log('🛡️ Example 5: Robust Detection with Retry');

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries}`);

      const detector = new TwoCaptchaDetector(page, 30000);
      const result = await detector.detect();

      if (result.detected) {
        console.log(`✓ CAPTCHA detected on attempt ${attempt}`);
        return result;
      }

      console.log(`⚠️ No CAPTCHA detected on attempt ${attempt}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`✗ Error on attempt ${attempt}: ${lastError.message}`);

      // Wait before retry
      if (attempt < maxRetries) {
        await page.waitForTimeout(1000);
      }
    }
  }

  throw new Error(`Failed to detect CAPTCHA after ${maxRetries} attempts: ${lastError?.message}`);
}

/**
 * Example 6: Type-specific handling
 */
export async function example6_TypeSpecificHandling(page: Page) {
  console.log('🎯 Example 6: Type-Specific Handling');

  const result = await detectCaptchaQuick(page);

  if (!result.detected) {
    console.log('No CAPTCHA detected');
    return;
  }

  // Handle based on type
  switch (result.type) {
    case CaptchaType.ImageCaptcha:
      console.log('📷 Image CAPTCHA - Using OCR/Vision AI');
      break;

    case CaptchaType.RecaptchaV2:
      console.log('🔐 Google reCAPTCHA v2 - Using token bypass');
      break;

    case CaptchaType.HCaptcha:
      console.log('🎪 hCaptcha - Using specialized solver');
      break;

    case CaptchaType.SliderCaptcha:
      console.log('🎚️ Slider CAPTCHA - Using drag simulation');
      break;

    case CaptchaType.ClickCaptcha:
      console.log('👆 Click CAPTCHA - Using image detection');
      break;

    default:
      console.log(`❓ Unknown CAPTCHA type: ${result.type}`);
  }

  return result;
}

/**
 * Example 7: Metadata extraction
 */
export async function example7_MetadataExtraction(page: Page) {
  console.log('📊 Example 7: Metadata Extraction');

  const result = await detectCaptchaQuick(page);

  if (!result.detected) {
    console.log('No CAPTCHA to analyze');
    return;
  }

  console.log('=== CAPTCHA Metadata ===');
  console.log(`Type: ${result.metadata.type}`);
  console.log(`Elements: ${result.metadata.elementCount}`);
  console.log(`Detected at: ${result.metadata.timestamp}`);
  console.log(`Detection attempts: ${result.metadata.detectionAttempts}`);
  console.log(`Time elapsed: ${result.metadata.elapsedMs}ms`);
  console.log(`Time remaining: ${result.metadata.remainingMs}ms`);

  if (result.metadata.imageDimensions) {
    const dims = result.metadata.imageDimensions;
    console.log(`Image bounds: ${dims.x}, ${dims.y} (${dims.width}x${dims.height})`);
  }

  return result.metadata;
}

/**
 * Integration with a hypothetical solver service
 */
export interface SolverService {
  solveCaptcha(base64Image: string, type: CaptchaType): Promise<string>;
}

export async function solveViaService(
  page: Page,
  solverService: SolverService
): Promise<boolean> {
  // Detect
  const detection = await detectCaptchaQuick(page);
  if (!detection.detected) return false;

  // Solve
  const answer = await solverService.solveCaptcha(
    detection.screenshotBase64 || '',
    detection.type
  );

  // Fill & Submit
  if (detection.elements.inputLocator) {
    await detection.elements.inputLocator.fill(answer);
  }

  if (detection.elements.submitButtonLocator) {
    await detection.elements.submitButtonLocator.click();
    return true;
  }

  return false;
}
