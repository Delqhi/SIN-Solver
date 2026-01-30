/**
 * 🧪 AUTO-SOLVER INTEGRATION TESTS
 * ================================
 * 
 * End-to-end integration tests for AutoSolver orchestration pipeline.
 * Tests the full workflow: Detect → Solve → Submit
 * 
 * Test Coverage:
 * - Happy path (full success)
 * - Detection failures with graceful degradation
 * - Solver failures with "Cannot Solve" fallback
 * - Timing accuracy & tracking
 * - Error handling & statistics
 * - Configuration & customization
 * - Session management
 */

import { test, expect, Page } from '@playwright/test';
import { AutoSolver, AutoSolveResult, AutoSolverConfig, createAutoSolver, createAutoSolverWithSolver } from '../../src/auto-solver';
import { TwoCaptchaDetector, CaptchaType } from '../../src/detector';
import { CaptchaSubmitter } from '../../src/submitter';
import { MultiAgentSolver, createDefaultMultiAgentSolver } from '../../src/solvers';

// ============================================================================
// MOCK FACTORIES - Create mock components for testing
// ============================================================================

/**
 * Mock detector that simulates successful CAPTCHA detection
 */
class MockDetectorSuccess extends TwoCaptchaDetector {
  async detect() {
    return {
      detected: true,
      type: CaptchaType.ImageCaptcha,
      screenshot: Buffer.from('mock-image-data'),
      timeoutMs: 5000,
    };
  }
}

/**
 * Mock detector that simulates no CAPTCHA found
 */
class MockDetectorNoCapcha extends TwoCaptchaDetector {
  async detect() {
    return {
      detected: false,
      type: undefined,
      screenshot: Buffer.from('empty-page'),
      timeoutMs: 5000,
    };
  }
}

/**
 * Mock detector with timeout
 */
class MockDetectorTimeout extends TwoCaptchaDetector {
  async detect() {
    throw new Error('Detection timeout - CAPTCHA not found within 120s');
  }
}

/**
 * Mock solver that returns successful solution
 */
class MockSolverSuccess extends MultiAgentSolver {
  async solve() {
    return {
      bestResult: {
        answer: 'MOCK123456',
        confidence: 0.95,
        model: 'mock-vision-model',
      },
      results: [
        { answer: 'MOCK123456', confidence: 0.95, model: 'mock-vision-model' },
        { answer: 'MOCK123457', confidence: 0.85, model: 'mock-ocr-model' },
        { answer: 'INCORRECT', confidence: 0.50, model: 'mock-skyvern-model' },
      ],
    };
  }
}

/**
 * Mock solver that fails
 */
class MockSolverFail extends MultiAgentSolver {
  async solve() {
    throw new Error('All solvers failed - no viable solution');
  }
}

/**
 * Mock solver with low confidence
 */
class MockSolverLowConfidence extends MultiAgentSolver {
  async solve() {
    return {
      bestResult: {
        answer: 'UNCERTAIN123',
        confidence: 0.45,
        model: 'mock-uncertain-model',
      },
      results: [
        { answer: 'UNCERTAIN123', confidence: 0.45, model: 'mock-uncertain-model' },
      ],
    };
  }
}

/**
 * Mock submitter that always succeeds
 */
class MockSubmitterSuccess extends CaptchaSubmitter {
  async submitAnswer() {
    return {
      success: true,
      action: 'submitted',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Mock submitter that fails
 */
class MockSubmitterFail extends CaptchaSubmitter {
  async submitAnswer() {
    return {
      success: false,
      action: 'submission_failed',
      timestamp: new Date().toISOString(),
      error: 'Input field not found',
    };
  }
}

/**
 * Helper to create a mock Page (minimal mock)
 */
function createMockPage(): any {
  return {
    goto: async () => {},
    waitForNavigation: async () => {},
    url: () => 'http://localhost:3000',
    title: async () => 'Mock Page',
    screenshot: async () => Buffer.from('screenshot-data'),
  };
}

/**
 * Helper to measure timing accuracy
 */
function calculateTimingAccuracy(
  expected: number,
  actual: number,
  toleranceMs: number = 500
): number {
  const diff = Math.abs(expected - actual);
  return diff <= toleranceMs ? 100 : Math.max(0, 100 - (diff - toleranceMs) / 10);
}

// ============================================================================
// TEST SUITE
// ============================================================================

test.describe('AutoSolver', () => {
  let page: Page;
  let autoSolver: AutoSolver;

  test.beforeEach(async ({ browser }) => {
    // Create a fresh page for each test
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Navigate to local test page
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  });

  test.afterEach(async () => {
    if (autoSolver) {
      // Cleanup
      autoSolver.reset();
    }
  });

  // ==========================================================================
  // SECTION 1: HAPPY PATH TESTS
  // ==========================================================================

   test('should solve CAPTCHA end-to-end successfully', async () => {
     // Setup: Create solver with mocks
     const mockSolver = new MockSolverSuccess();
     autoSolver = createAutoSolverWithSolver(page, mockSolver, {
       verbose: true,
       enableScreenshots: true,
     });

     // Execute: Run the full pipeline
     const result = await autoSolver.solveCaptcha();

     // Verify: Check result structure & success
     expect(result.success).toBe(true);
     expect(result.captchaDetected).toBe(true);
     expect(result.answer).toBe('MOCK123456');
     expect(result.confidence).toBeGreaterThanOrEqual(0.95);
     expect(result.submissionSuccess).toBe(true);
     
     // Verify: Check timing is populated
     expect(result.detectionTimeMs).toBeGreaterThan(0);
     expect(result.solvingTimeMs).toBeGreaterThan(0);
     expect(result.submissionTimeMs).toBeGreaterThan(0);
     expect(result.totalTimeMs).toBeGreaterThan(0);
     
     // Verify: Check timings add up correctly (with tolerance for overhead)
     const sumMs = result.detectionTimeMs + result.solvingTimeMs + result.submissionTimeMs;
     expect(Math.abs(result.totalTimeMs - sumMs)).toBeLessThan(200); // within 200ms tolerance
     
     // Verify: Check metadata
     expect(result.timestamp).toBeTruthy();
     expect(result.sessionId).toBeTruthy();
     expect(result.stageName).toBe('completed');
     expect(result.errors).toHaveLength(0);
   });

  test('should track comprehensive timing data', async () => {
    const mockSolver = new MockSolverSuccess();
    autoSolver = createAutoSolverWithSolver(page, mockSolver);

    const startTime = Date.now();
    const result = await autoSolver.solveCaptcha();
    const elapsedTime = Date.now() - startTime;

    // Verify: Total time matches elapsed time (within reasonable tolerance)
    const tolerance = 200; // 200ms tolerance for test overhead
    expect(result.totalTimeMs).toBeLessThanOrEqual(elapsedTime + tolerance);
    
    // Verify: All timing metrics are positive integers
    expect(result.detectionTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.solvingTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.submissionTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.totalTimeMs).toBeGreaterThanOrEqual(0);
    
    // Verify: Timing breakdown adds up
    const calculatedTotal = result.detectionTimeMs + result.solvingTimeMs + result.submissionTimeMs;
    expect(Math.abs(result.totalTimeMs - calculatedTotal)).toBeLessThan(100);
  });

  test('should respect custom timeout configurations', async () => {
    const customConfig: AutoSolverConfig = {
      detectionTimeoutMs: 10000,
      solverTimeoutMs: 5000,
      submissionTimeoutMs: 3000,
      verbose: true,
    };

    const mockSolver = new MockSolverSuccess();
    autoSolver = createAutoSolverWithSolver(page, mockSolver, customConfig);

    const result = await autoSolver.solveCaptcha();

    // Verify: Detection should complete within custom timeout
    expect(result.detectionTimeMs).toBeLessThanOrEqual(10000);
    
    // Verify: Solver should complete within custom timeout
    expect(result.solvingTimeMs).toBeLessThanOrEqual(5000);
    
    // Verify: Submission should complete within custom timeout
    expect(result.submissionTimeMs).toBeLessThanOrEqual(3000);
  });

  // ==========================================================================
  // SECTION 2: DETECTION FAILURE TESTS
  // ==========================================================================

  test('should handle detection failure gracefully', async () => {
    const mockSolver = new MockSolverSuccess();
    
    // Create a custom AutoSolver with no-CAPTCHA detector
    const detector = new MockDetectorNoCapcha();
    autoSolver = new AutoSolver(page, mockSolver);
    
    // Manually override detector with mock (simulate no detection)
    (autoSolver as any).detector = detector;

    const result = await autoSolver.solveCaptcha();

    // Verify: Detection failed but result is still valid
    expect(result.success).toBe(false);
    expect(result.captchaDetected).toBe(false);
    expect(result.answer).toBeUndefined();
    expect(result.stageName).toBe('detection');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should return early when no CAPTCHA found', async () => {
    const mockSolver = new MockSolverSuccess();
    const detector = new MockDetectorNoCapcha();
    
    autoSolver = new AutoSolver(page, mockSolver);
    (autoSolver as any).detector = detector;

    const startTime = Date.now();
    const result = await autoSolver.solveCaptcha();
    const elapsed = Date.now() - startTime;

    // Verify: Should complete quickly when no CAPTCHA found
    expect(result.captchaDetected).toBe(false);
    expect(elapsed).toBeLessThan(2000); // Should be very fast
  });

  test('should handle detection timeout error', async () => {
    const mockSolver = new MockSolverSuccess(page);
    const detector = new MockDetectorTimeout(page);
    
    autoSolver = new AutoSolver(page, mockSolver);
    (autoSolver as any).detector = detector;

    const result = await autoSolver.solveCaptcha();

    // Verify: Timeout error should be caught and reported
    expect(result.success).toBe(false);
    expect(result.captchaDetected).toBe(false);
    expect(result.stageError).toBeTruthy();
    expect(result.errors.length).toBeGreaterThan(0);
  });

  // ==========================================================================
  // SECTION 3: SOLVER FAILURE TESTS
  // ==========================================================================

  test('should handle solver failure with fallback to Cannot Solve', async () => {
    const mockSolverFail = new MockSolverFail(page);
    autoSolver = createAutoSolverWithSolver(page, mockSolverFail, {
      enableCannotSolve: true,
      verbose: true,
    });

    const result = await autoSolver.solveCaptcha();

    // Verify: Solver failed but fallback was attempted
    expect(result.captchaDetected).toBe(true); // CAPTCHA was detected initially
    expect(result.answer).toBeUndefined(); // No valid answer found
    expect(result.errors.length).toBeGreaterThan(0);
    
    // The result depends on submitter mock, but pipeline should handle gracefully
    expect(result.stageName).toBeTruthy();
  });

  test('should reject low-confidence solver results', async () => {
    const mockSolverLow = new MockSolverLowConfidence(page);
    const minConfidence = 0.7; // Require 70% confidence

    autoSolver = createAutoSolverWithSolver(page, mockSolverLow, {
      minSolverConfidence: minConfidence,
      enableCannotSolve: true,
      verbose: true,
    });

    const result = await autoSolver.solveCaptcha();

    // Verify: Low confidence result was rejected (< 0.7)
    expect(result.confidence).toBeLessThan(minConfidence);
    expect(result.answer).toBeUndefined(); // Should not accept low confidence
  });

  test('should track multiple solver failures in error array', async () => {
    const mockSolverFail = new MockSolverFail(page);
    autoSolver = createAutoSolverWithSolver(page, mockSolverFail, {
      enableCannotSolve: false, // Don't fall back
      verbose: true,
    });

    const result = await autoSolver.solveCaptcha();

    // Verify: All errors are captured
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.success).toBe(false);
  });

  // ==========================================================================
  // SECTION 4: CONFIGURATION TESTS
  // ==========================================================================

  test('should create solver with default factory function', async () => {
    autoSolver = createAutoSolver(page);

    expect(autoSolver).toBeTruthy();
    expect(autoSolver.getStatistics).toBeTruthy();
    expect(autoSolver.solveCaptcha).toBeTruthy();
    expect(autoSolver.reset).toBeTruthy();
  });

  test('should create solver with custom factory and config', async () => {
    const customSolver = createDefaultMultiAgentSolver({
      timeout: 60000,
      minConfidence: 0.85,
      parallel: true,
    });

    const customConfig: AutoSolverConfig = {
      minSolverConfidence: 0.85,
      verbose: true,
      enableCannotSolve: false,
    };

    autoSolver = createAutoSolverWithSolver(page, customSolver, customConfig);

    expect(autoSolver).toBeTruthy();
  });

  test('should enable and disable verbose logging', async () => {
    const mockSolver = new MockSolverSuccess(page);
    autoSolver = createAutoSolverWithSolver(page, mockSolver, { verbose: false });

    // Initially verbose is false
    await autoSolver.solveCaptcha();

    // Enable verbose
    autoSolver.setVerbose(true);
    
    // Should not throw error
    expect(() => autoSolver.setVerbose(false)).not.toThrow();
  });

  test('should allow Cannot Solve configuration', async () => {
    const mockSolver = new MockSolverSuccess(page);
    
    const configWithCannotSolve: AutoSolverConfig = {
      enableCannotSolve: true,
      cannotSolveChance: 0.5,
    };

    autoSolver = createAutoSolverWithSolver(page, mockSolver, configWithCannotSolve);
    const result = await autoSolver.solveCaptcha();

    // Should complete without error
    expect(result).toBeTruthy();
    expect(result.timestamp).toBeTruthy();
  });

  // ==========================================================================
  // SECTION 5: RESULT STRUCTURE TESTS
  // ==========================================================================

  test('should return properly structured AutoSolveResult', async () => {
    const mockSolver = new MockSolverSuccess(page);
    autoSolver = createAutoSolverWithSolver(page, mockSolver);

    const result = await autoSolver.solveCaptcha();

    // Verify: All required fields are present
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('captchaDetected');
    expect(result).toHaveProperty('detectionTimeMs');
    expect(result).toHaveProperty('solvingTimeMs');
    expect(result).toHaveProperty('submissionTimeMs');
    expect(result).toHaveProperty('totalTimeMs');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('stageName');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('sessionId');

    // Verify: Field types
    expect(typeof result.success).toBe('boolean');
    expect(typeof result.captchaDetected).toBe('boolean');
    expect(typeof result.detectionTimeMs).toBe('number');
    expect(typeof result.solvingTimeMs).toBe('number');
    expect(typeof result.submissionTimeMs).toBe('number');
    expect(typeof result.totalTimeMs).toBe('number');
    expect(Array.isArray(result.errors)).toBe(true);
    expect(['detection', 'solving', 'submission', 'completed']).toContain(result.stageName);
    expect(typeof result.timestamp).toBe('string');
    expect(typeof result.sessionId).toBe('string');
  });

  test('should populate optional fields on success', async () => {
    const mockSolver = new MockSolverSuccess(page);
    autoSolver = createAutoSolverWithSolver(page, mockSolver);

    const result = await autoSolver.solveCaptcha();

    // Verify: Optional fields are populated on success
    expect(result.captchaType).toBe(CaptchaType.ImageCaptcha);
    expect(result.answer).toBe('MOCK123456');
    expect(result.confidence).toBe(0.95);
    expect(result.submissionSuccess).toBe(true);
  });

  test('should handle errors array correctly', async () => {
    const mockSolver = new MockSolverFail(page);
    autoSolver = createAutoSolverWithSolver(page, mockSolver, {
      enableCannotSolve: false,
    });

    const result = await autoSolver.solveCaptcha();

    // Verify: Errors are captured
    expect(Array.isArray(result.errors)).toBe(true);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toBeTruthy();
    expect(typeof result.errors[0]).toBe('string');
  });

  // ==========================================================================
  // SECTION 6: SESSION & STATE MANAGEMENT TESTS
  // ==========================================================================

  test('should generate unique session IDs', async () => {
    const mockSolver = new MockSolverSuccess(page);
    autoSolver = createAutoSolverWithSolver(page, mockSolver);

    const result1 = await autoSolver.solveCaptcha();
    
    autoSolver.reset();
    const result2 = await autoSolver.solveCaptcha();

    // Verify: Session IDs should be different after reset
    expect(result1.sessionId).not.toBe(result2.sessionId);
  });

  test('should reset internal state correctly', async () => {
    const mockSolver = new MockSolverSuccess(page);
    autoSolver = createAutoSolverWithSolver(page, mockSolver);

    await autoSolver.solveCaptcha();
    
    // Reset should not throw
    expect(() => autoSolver.reset()).not.toThrow();
    
    // After reset, new attempt should work
    const result = await autoSolver.solveCaptcha();
    expect(result).toBeTruthy();
  });

  test('should maintain consistent metadata', async () => {
    const mockSolver = new MockSolverSuccess(page);
    autoSolver = createAutoSolverWithSolver(page, mockSolver);

    const result = await autoSolver.solveCaptcha();

    // Verify: Timestamp is valid ISO format
    expect(() => new Date(result.timestamp)).not.toThrow();
    
    // Verify: Timestamp is recent (within last minute)
    const resultDate = new Date(result.timestamp).getTime();
    const now = Date.now();
    const diffMs = now - resultDate;
    expect(diffMs).toBeGreaterThan(0);
    expect(diffMs).toBeLessThan(60000);
  });

  // ==========================================================================
  // SECTION 7: STATISTICS TESTS
  // ==========================================================================

  test('should provide statistics aggregation', async () => {
    const mockSolver = new MockSolverSuccess(page);
    autoSolver = createAutoSolverWithSolver(page, mockSolver);

    await autoSolver.solveCaptcha();
    
    const stats = autoSolver.getStatistics();

    // Verify: Statistics object has expected structure
    expect(stats).toBeTruthy();
    expect(typeof stats).toBe('object');
  });

  test('should track detection attempts', async () => {
    const mockSolver = new MockSolverSuccess(page);
    autoSolver = createAutoSolverWithSolver(page, mockSolver);

    const result = await autoSolver.solveCaptcha();

    // Verify: Detection attempts counter is present
    expect(result.detectionAttempts).toBeGreaterThanOrEqual(1);
  });

  // ==========================================================================
  // SECTION 8: EDGE CASE TESTS
  // ==========================================================================

  test('should handle concurrent solve attempts sequentially', async () => {
    const mockSolver = new MockSolverSuccess(page);
    autoSolver = createAutoSolverWithSolver(page, mockSolver);

    // Sequential calls should work fine
    const result1 = await autoSolver.solveCaptcha();
    const result2 = await autoSolver.solveCaptcha();

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });

  test('should handle empty page gracefully', async () => {
    const mockSolver = new MockSolverSuccess(page);
    const detector = new MockDetectorNoCapcha(page);

    autoSolver = new AutoSolver(page, mockSolver);
    (autoSolver as any).detector = detector;

    // Should not throw
    const result = await autoSolver.solveCaptcha();
    expect(result.success).toBe(false);
    expect(result.captchaDetected).toBe(false);
  });

  test('should handle rapid reset calls', async () => {
    const mockSolver = new MockSolverSuccess(page);
    autoSolver = createAutoSolverWithSolver(page, mockSolver);

    // Rapid resets should not cause errors
    autoSolver.reset();
    autoSolver.reset();
    autoSolver.reset();

    const result = await autoSolver.solveCaptcha();
    expect(result).toBeTruthy();
  });

  // ==========================================================================
  // SECTION 9: PERFORMANCE TESTS
  // ==========================================================================

  test('should complete full pipeline in reasonable time', async () => {
    const mockSolver = new MockSolverSuccess(page);
    autoSolver = createAutoSolverWithSolver(page, mockSolver);

    const startTime = Date.now();
    await autoSolver.solveCaptcha();
    const elapsedMs = Date.now() - startTime;

    // Full pipeline should complete in under 5 seconds for mocked components
    expect(elapsedMs).toBeLessThan(5000);
  });

  test('should maintain low overhead in timing calculations', async () => {
    const mockSolver = new MockSolverSuccess(page);
    autoSolver = createAutoSolverWithSolver(page, mockSolver);

    const result = await autoSolver.solveCaptcha();

    // Sum of stages should be very close to total (< 200ms overhead)
    const sumMs = result.detectionTimeMs + result.solvingTimeMs + result.submissionTimeMs;
    const overhead = Math.abs(result.totalTimeMs - sumMs);
    expect(overhead).toBeLessThan(200);
  });

  // ==========================================================================
  // SECTION 10: ERROR MESSAGE TESTS
  // ==========================================================================

  test('should provide descriptive error messages', async () => {
    const mockSolver = new MockSolverFail(page);
    autoSolver = createAutoSolverWithSolver(page, mockSolver, {
      enableCannotSolve: false,
    });

    const result = await autoSolver.solveCaptcha();

    // Verify: Error messages are present and meaningful
    expect(result.errors.length).toBeGreaterThan(0);
    result.errors.forEach(error => {
      expect(error.length).toBeGreaterThan(0);
      expect(typeof error).toBe('string');
    });
  });

  test('should include stage name in error context', async () => {
    const mockSolver = new MockSolverFail(page);
    autoSolver = createAutoSolverWithSolver(page, mockSolver, {
      enableCannotSolve: false,
    });

    const result = await autoSolver.solveCaptcha();

    // Verify: Stage name identifies where error occurred
    expect(['detection', 'solving', 'submission', 'completed']).toContain(result.stageName);
    
    // On solver failure, should be in 'solving' stage
    if (!result.success && !result.captchaDetected === false) {
      expect(result.stageName).toBe('solving');
    }
  });
});
