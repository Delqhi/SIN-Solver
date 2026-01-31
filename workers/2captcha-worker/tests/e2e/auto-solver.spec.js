"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const auto_solver_1 = require("../../src/auto-solver");
const detector_1 = require("../../src/detector");
const submitter_1 = require("../../src/submitter");
const solvers_1 = require("../../src/solvers");
// ============================================================================
// MOCK FACTORIES - Create mock components for testing
// ============================================================================
/**
 * Mock detector that simulates successful CAPTCHA detection
 */
class MockDetectorSuccess extends detector_1.TwoCaptchaDetector {
    async detect() {
        return {
            detected: true,
            type: detector_1.CaptchaType.ImageCaptcha,
            screenshot: Buffer.from('mock-image-data'),
            timeoutMs: 5000,
        };
    }
}
/**
 * Mock detector that simulates no CAPTCHA found
 */
class MockDetectorNoCapcha extends detector_1.TwoCaptchaDetector {
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
class MockDetectorTimeout extends detector_1.TwoCaptchaDetector {
    async detect() {
        throw new Error('Detection timeout - CAPTCHA not found within 120s');
    }
}
/**
 * Mock solver that returns successful solution
 */
class MockSolverSuccess extends solvers_1.MultiAgentSolver {
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
class MockSolverFail extends solvers_1.MultiAgentSolver {
    async solve() {
        throw new Error('All solvers failed - no viable solution');
    }
}
/**
 * Mock solver with low confidence
 */
class MockSolverLowConfidence extends solvers_1.MultiAgentSolver {
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
class MockSubmitterSuccess extends submitter_1.CaptchaSubmitter {
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
class MockSubmitterFail extends submitter_1.CaptchaSubmitter {
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
function createMockPage() {
    return {
        goto: async () => { },
        waitForNavigation: async () => { },
        url: () => 'http://localhost:3000',
        title: async () => 'Mock Page',
        screenshot: async () => Buffer.from('screenshot-data'),
    };
}
/**
 * Helper to measure timing accuracy
 */
function calculateTimingAccuracy(expected, actual, toleranceMs = 500) {
    const diff = Math.abs(expected - actual);
    return diff <= toleranceMs ? 100 : Math.max(0, 100 - (diff - toleranceMs) / 10);
}
// ============================================================================
// TEST SUITE
// ============================================================================
test_1.test.describe('AutoSolver', () => {
    let page;
    let autoSolver;
    test_1.test.beforeEach(async ({ browser }) => {
        // Create a fresh page for each test
        const context = await browser.newContext();
        page = await context.newPage();
        // Navigate to local test page
        await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    });
    test_1.test.afterEach(async () => {
        if (autoSolver) {
            // Cleanup
            autoSolver.reset();
        }
    });
    // ==========================================================================
    // SECTION 1: HAPPY PATH TESTS
    // ==========================================================================
    (0, test_1.test)('should solve CAPTCHA end-to-end successfully', async () => {
        // Setup: Create solver with mocks
        const mockSolver = new MockSolverSuccess();
        autoSolver = (0, auto_solver_1.createAutoSolverWithSolver)(page, mockSolver, {
            verbose: true,
            enableScreenshots: true,
        });
        // Execute: Run the full pipeline
        const result = await autoSolver.solveCaptcha();
        // Verify: Check result structure & success
        (0, test_1.expect)(result.success).toBe(true);
        (0, test_1.expect)(result.captchaDetected).toBe(true);
        (0, test_1.expect)(result.answer).toBe('MOCK123456');
        (0, test_1.expect)(result.confidence).toBeGreaterThanOrEqual(0.95);
        (0, test_1.expect)(result.submissionSuccess).toBe(true);
        // Verify: Check timing is populated
        (0, test_1.expect)(result.detectionTimeMs).toBeGreaterThan(0);
        (0, test_1.expect)(result.solvingTimeMs).toBeGreaterThan(0);
        (0, test_1.expect)(result.submissionTimeMs).toBeGreaterThan(0);
        (0, test_1.expect)(result.totalTimeMs).toBeGreaterThan(0);
        // Verify: Check timings add up correctly (with tolerance for overhead)
        const sumMs = result.detectionTimeMs + result.solvingTimeMs + result.submissionTimeMs;
        (0, test_1.expect)(Math.abs(result.totalTimeMs - sumMs)).toBeLessThan(200); // within 200ms tolerance
        // Verify: Check metadata
        (0, test_1.expect)(result.timestamp).toBeTruthy();
        (0, test_1.expect)(result.sessionId).toBeTruthy();
        (0, test_1.expect)(result.stageName).toBe('completed');
        (0, test_1.expect)(result.errors).toHaveLength(0);
    });
    (0, test_1.test)('should track comprehensive timing data', async () => {
        const mockSolver = new MockSolverSuccess();
        autoSolver = (0, auto_solver_1.createAutoSolverWithSolver)(page, mockSolver);
        const startTime = Date.now();
        const result = await autoSolver.solveCaptcha();
        const elapsedTime = Date.now() - startTime;
        // Verify: Total time matches elapsed time (within reasonable tolerance)
        const tolerance = 200; // 200ms tolerance for test overhead
        (0, test_1.expect)(result.totalTimeMs).toBeLessThanOrEqual(elapsedTime + tolerance);
        // Verify: All timing metrics are positive integers
        (0, test_1.expect)(result.detectionTimeMs).toBeGreaterThanOrEqual(0);
        (0, test_1.expect)(result.solvingTimeMs).toBeGreaterThanOrEqual(0);
        (0, test_1.expect)(result.submissionTimeMs).toBeGreaterThanOrEqual(0);
        (0, test_1.expect)(result.totalTimeMs).toBeGreaterThanOrEqual(0);
        // Verify: Timing breakdown adds up
        const calculatedTotal = result.detectionTimeMs + result.solvingTimeMs + result.submissionTimeMs;
        (0, test_1.expect)(Math.abs(result.totalTimeMs - calculatedTotal)).toBeLessThan(100);
    });
    (0, test_1.test)('should respect custom timeout configurations', async () => {
        const customConfig = {
            detectionTimeoutMs: 10000,
            solverTimeoutMs: 5000,
            submissionTimeoutMs: 3000,
            verbose: true,
        };
        const mockSolver = new MockSolverSuccess();
        autoSolver = (0, auto_solver_1.createAutoSolverWithSolver)(page, mockSolver, customConfig);
        const result = await autoSolver.solveCaptcha();
        // Verify: Detection should complete within custom timeout
        (0, test_1.expect)(result.detectionTimeMs).toBeLessThanOrEqual(10000);
        // Verify: Solver should complete within custom timeout
        (0, test_1.expect)(result.solvingTimeMs).toBeLessThanOrEqual(5000);
        // Verify: Submission should complete within custom timeout
        (0, test_1.expect)(result.submissionTimeMs).toBeLessThanOrEqual(3000);
    });
    // ==========================================================================
    // SECTION 2: DETECTION FAILURE TESTS
    // ==========================================================================
    (0, test_1.test)('should handle detection failure gracefully', async () => {
        const mockSolver = new MockSolverSuccess();
        // Create a custom AutoSolver with no-CAPTCHA detector
        const detector = new MockDetectorNoCapcha();
        autoSolver = new auto_solver_1.AutoSolver(page, mockSolver);
        // Manually override detector with mock (simulate no detection)
        autoSolver.detector = detector;
        const result = await autoSolver.solveCaptcha();
        // Verify: Detection failed but result is still valid
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.captchaDetected).toBe(false);
        (0, test_1.expect)(result.answer).toBeUndefined();
        (0, test_1.expect)(result.stageName).toBe('detection');
        (0, test_1.expect)(result.errors.length).toBeGreaterThan(0);
    });
    (0, test_1.test)('should return early when no CAPTCHA found', async () => {
        const mockSolver = new MockSolverSuccess();
        const detector = new MockDetectorNoCapcha();
        autoSolver = new auto_solver_1.AutoSolver(page, mockSolver);
        autoSolver.detector = detector;
        const startTime = Date.now();
        const result = await autoSolver.solveCaptcha();
        const elapsed = Date.now() - startTime;
        // Verify: Should complete quickly when no CAPTCHA found
        (0, test_1.expect)(result.captchaDetected).toBe(false);
        (0, test_1.expect)(elapsed).toBeLessThan(2000); // Should be very fast
    });
    (0, test_1.test)('should handle detection timeout error', async () => {
        const mockSolver = new MockSolverSuccess();
        const detector = new MockDetectorTimeout();
        autoSolver = new auto_solver_1.AutoSolver(page, mockSolver);
        autoSolver.detector = detector;
        const result = await autoSolver.solveCaptcha();
        // Verify: Timeout error should be caught and reported
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.captchaDetected).toBe(false);
        (0, test_1.expect)(result.stageError).toBeTruthy();
        (0, test_1.expect)(result.errors.length).toBeGreaterThan(0);
    });
    // ==========================================================================
    // SECTION 3: SOLVER FAILURE TESTS
    // ==========================================================================
    (0, test_1.test)('should handle solver failure with fallback to Cannot Solve', async () => {
        const mockSolverFail = new MockSolverFail();
        autoSolver = (0, auto_solver_1.createAutoSolverWithSolver)(page, mockSolverFail, {
            enableCannotSolve: true,
            verbose: true,
        });
        const result = await autoSolver.solveCaptcha();
        // Verify: Solver failed but fallback was attempted
        (0, test_1.expect)(result.captchaDetected).toBe(true); // CAPTCHA was detected initially
        (0, test_1.expect)(result.answer).toBeUndefined(); // No valid answer found
        (0, test_1.expect)(result.errors.length).toBeGreaterThan(0);
        // The result depends on submitter mock, but pipeline should handle gracefully
        (0, test_1.expect)(result.stageName).toBeTruthy();
    });
    (0, test_1.test)('should reject low-confidence solver results', async () => {
        const mockSolverLow = new MockSolverLowConfidence();
        const minConfidence = 0.7; // Require 70% confidence
        autoSolver = (0, auto_solver_1.createAutoSolverWithSolver)(page, mockSolverLow, {
            minSolverConfidence: minConfidence,
            enableCannotSolve: true,
            verbose: true,
        });
        const result = await autoSolver.solveCaptcha();
        // Verify: Low confidence result was rejected (< 0.7)
        (0, test_1.expect)(result.confidence).toBeLessThan(minConfidence);
        (0, test_1.expect)(result.answer).toBeUndefined(); // Should not accept low confidence
    });
    (0, test_1.test)('should track multiple solver failures in error array', async () => {
        const mockSolverFail = new MockSolverFail();
        autoSolver = (0, auto_solver_1.createAutoSolverWithSolver)(page, mockSolverFail, {
            enableCannotSolve: false, // Don't fall back
            verbose: true,
        });
        const result = await autoSolver.solveCaptcha();
        // Verify: All errors are captured
        (0, test_1.expect)(result.errors.length).toBeGreaterThan(0);
        (0, test_1.expect)(result.success).toBe(false);
    });
    // ==========================================================================
    // SECTION 4: CONFIGURATION TESTS
    // ==========================================================================
    (0, test_1.test)('should create solver with default factory function', async () => {
        autoSolver = (0, auto_solver_1.createAutoSolver)(page);
        (0, test_1.expect)(autoSolver).toBeTruthy();
        (0, test_1.expect)(autoSolver.getStatistics).toBeTruthy();
        (0, test_1.expect)(autoSolver.solveCaptcha).toBeTruthy();
        (0, test_1.expect)(autoSolver.reset).toBeTruthy();
    });
    (0, test_1.test)('should create solver with custom factory and config', async () => {
        const customSolver = (0, solvers_1.createDefaultMultiAgentSolver)({
            timeout: 60000,
            minConfidence: 0.85,
            parallel: true,
        });
        const customConfig = {
            minSolverConfidence: 0.85,
            verbose: true,
            enableCannotSolve: false,
        };
        autoSolver = (0, auto_solver_1.createAutoSolverWithSolver)(page, customSolver, customConfig);
        (0, test_1.expect)(autoSolver).toBeTruthy();
    });
    (0, test_1.test)('should enable and disable verbose logging', async () => {
        const mockSolver = new MockSolverSuccess();
        autoSolver = (0, auto_solver_1.createAutoSolverWithSolver)(page, mockSolver, { verbose: false });
        // Initially verbose is false
        await autoSolver.solveCaptcha();
        // Enable verbose
        autoSolver.setVerbose(true);
        // Should not throw error
        (0, test_1.expect)(() => autoSolver.setVerbose(false)).not.toThrow();
    });
    (0, test_1.test)('should allow Cannot Solve configuration', async () => {
        const mockSolver = new MockSolverSuccess();
        const configWithCannotSolve = {
            enableCannotSolve: true,
            cannotSolveChance: 0.5,
        };
        autoSolver = (0, auto_solver_1.createAutoSolverWithSolver)(page, mockSolver, configWithCannotSolve);
        const result = await autoSolver.solveCaptcha();
        // Should complete without error
        (0, test_1.expect)(result).toBeTruthy();
        (0, test_1.expect)(result.timestamp).toBeTruthy();
    });
    // ==========================================================================
    // SECTION 5: RESULT STRUCTURE TESTS
    // ==========================================================================
    (0, test_1.test)('should return properly structured AutoSolveResult', async () => {
        const mockSolver = new MockSolverSuccess();
        autoSolver = (0, auto_solver_1.createAutoSolverWithSolver)(page, mockSolver);
        const result = await autoSolver.solveCaptcha();
        // Verify: All required fields are present
        (0, test_1.expect)(result).toHaveProperty('success');
        (0, test_1.expect)(result).toHaveProperty('captchaDetected');
        (0, test_1.expect)(result).toHaveProperty('detectionTimeMs');
        (0, test_1.expect)(result).toHaveProperty('solvingTimeMs');
        (0, test_1.expect)(result).toHaveProperty('submissionTimeMs');
        (0, test_1.expect)(result).toHaveProperty('totalTimeMs');
        (0, test_1.expect)(result).toHaveProperty('errors');
        (0, test_1.expect)(result).toHaveProperty('stageName');
        (0, test_1.expect)(result).toHaveProperty('timestamp');
        (0, test_1.expect)(result).toHaveProperty('sessionId');
        // Verify: Field types
        (0, test_1.expect)(typeof result.success).toBe('boolean');
        (0, test_1.expect)(typeof result.captchaDetected).toBe('boolean');
        (0, test_1.expect)(typeof result.detectionTimeMs).toBe('number');
        (0, test_1.expect)(typeof result.solvingTimeMs).toBe('number');
        (0, test_1.expect)(typeof result.submissionTimeMs).toBe('number');
        (0, test_1.expect)(typeof result.totalTimeMs).toBe('number');
        (0, test_1.expect)(Array.isArray(result.errors)).toBe(true);
        (0, test_1.expect)(['detection', 'solving', 'submission', 'completed']).toContain(result.stageName);
        (0, test_1.expect)(typeof result.timestamp).toBe('string');
        (0, test_1.expect)(typeof result.sessionId).toBe('string');
    });
    (0, test_1.test)('should populate optional fields on success', async () => {
        const mockSolver = new MockSolverSuccess();
        autoSolver = (0, auto_solver_1.createAutoSolverWithSolver)(page, mockSolver);
        const result = await autoSolver.solveCaptcha();
        // Verify: Optional fields are populated on success
        (0, test_1.expect)(result.captchaType).toBe(detector_1.CaptchaType.ImageCaptcha);
        (0, test_1.expect)(result.answer).toBe('MOCK123456');
        (0, test_1.expect)(result.confidence).toBe(0.95);
        (0, test_1.expect)(result.submissionSuccess).toBe(true);
    });
    (0, test_1.test)('should handle errors array correctly', async () => {
        const mockSolver = new MockSolverFail();
        autoSolver = (0, auto_solver_1.createAutoSolverWithSolver)(page, mockSolver, {
            enableCannotSolve: false,
        });
        const result = await autoSolver.solveCaptcha();
        // Verify: Errors are captured
        (0, test_1.expect)(Array.isArray(result.errors)).toBe(true);
        (0, test_1.expect)(result.errors.length).toBeGreaterThan(0);
        (0, test_1.expect)(result.errors[0]).toBeTruthy();
        (0, test_1.expect)(typeof result.errors[0]).toBe('string');
    });
    // ==========================================================================
    // SECTION 6: SESSION & STATE MANAGEMENT TESTS
    // ==========================================================================
    (0, test_1.test)('should generate unique session IDs', async () => {
        const mockSolver = new MockSolverSuccess();
        autoSolver = (0, auto_solver_1.createAutoSolverWithSolver)(page, mockSolver);
        const result1 = await autoSolver.solveCaptcha();
        autoSolver.reset();
        const result2 = await autoSolver.solveCaptcha();
        // Verify: Session IDs should be different after reset
        (0, test_1.expect)(result1.sessionId).not.toBe(result2.sessionId);
    });
    (0, test_1.test)('should reset internal state correctly', async () => {
        const mockSolver = new MockSolverSuccess();
        autoSolver = (0, auto_solver_1.createAutoSolverWithSolver)(page, mockSolver);
        await autoSolver.solveCaptcha();
        // Reset should not throw
        (0, test_1.expect)(() => autoSolver.reset()).not.toThrow();
        // After reset, new attempt should work
        const result = await autoSolver.solveCaptcha();
        (0, test_1.expect)(result).toBeTruthy();
    });
    (0, test_1.test)('should maintain consistent metadata', async () => {
        const mockSolver = new MockSolverSuccess();
        autoSolver = (0, auto_solver_1.createAutoSolverWithSolver)(page, mockSolver);
        const result = await autoSolver.solveCaptcha();
        // Verify: Timestamp is valid ISO format
        (0, test_1.expect)(() => new Date(result.timestamp)).not.toThrow();
        // Verify: Timestamp is recent (within last minute)
        const resultDate = new Date(result.timestamp).getTime();
        const now = Date.now();
        const diffMs = now - resultDate;
        (0, test_1.expect)(diffMs).toBeGreaterThan(0);
        (0, test_1.expect)(diffMs).toBeLessThan(60000);
    });
    // ==========================================================================
    // SECTION 7: STATISTICS TESTS
    // ==========================================================================
    (0, test_1.test)('should provide statistics aggregation', async () => {
        const mockSolver = new MockSolverSuccess();
        autoSolver = (0, auto_solver_1.createAutoSolverWithSolver)(page, mockSolver);
        await autoSolver.solveCaptcha();
        const stats = autoSolver.getStatistics();
        // Verify: Statistics object has expected structure
        (0, test_1.expect)(stats).toBeTruthy();
        (0, test_1.expect)(typeof stats).toBe('object');
    });
    (0, test_1.test)('should track detection attempts', async () => {
        const mockSolver = new MockSolverSuccess();
        autoSolver = (0, auto_solver_1.createAutoSolverWithSolver)(page, mockSolver);
        const result = await autoSolver.solveCaptcha();
        // Verify: Detection attempts counter is present
        (0, test_1.expect)(result.detectionAttempts).toBeGreaterThanOrEqual(1);
    });
    // ==========================================================================
    // SECTION 8: EDGE CASE TESTS
    // ==========================================================================
    (0, test_1.test)('should handle concurrent solve attempts sequentially', async () => {
        const mockSolver = new MockSolverSuccess();
        autoSolver = (0, auto_solver_1.createAutoSolverWithSolver)(page, mockSolver);
        // Sequential calls should work fine
        const result1 = await autoSolver.solveCaptcha();
        const result2 = await autoSolver.solveCaptcha();
        (0, test_1.expect)(result1.success).toBe(true);
        (0, test_1.expect)(result2.success).toBe(true);
    });
    (0, test_1.test)('should handle empty page gracefully', async () => {
        const mockSolver = new MockSolverSuccess();
        const detector = new MockDetectorNoCapcha();
        autoSolver = new auto_solver_1.AutoSolver(page, mockSolver);
        autoSolver.detector = detector;
        // Should not throw
        const result = await autoSolver.solveCaptcha();
        (0, test_1.expect)(result.success).toBe(false);
        (0, test_1.expect)(result.captchaDetected).toBe(false);
    });
    (0, test_1.test)('should handle rapid reset calls', async () => {
        const mockSolver = new MockSolverSuccess();
        autoSolver = (0, auto_solver_1.createAutoSolverWithSolver)(page, mockSolver);
        // Rapid resets should not cause errors
        autoSolver.reset();
        autoSolver.reset();
        autoSolver.reset();
        const result = await autoSolver.solveCaptcha();
        (0, test_1.expect)(result).toBeTruthy();
    });
    // ==========================================================================
    // SECTION 9: PERFORMANCE TESTS
    // ==========================================================================
    (0, test_1.test)('should complete full pipeline in reasonable time', async () => {
        const mockSolver = new MockSolverSuccess();
        autoSolver = (0, auto_solver_1.createAutoSolverWithSolver)(page, mockSolver);
        const startTime = Date.now();
        await autoSolver.solveCaptcha();
        const elapsedMs = Date.now() - startTime;
        // Full pipeline should complete in under 5 seconds for mocked components
        (0, test_1.expect)(elapsedMs).toBeLessThan(5000);
    });
    (0, test_1.test)('should maintain low overhead in timing calculations', async () => {
        const mockSolver = new MockSolverSuccess();
        autoSolver = (0, auto_solver_1.createAutoSolverWithSolver)(page, mockSolver);
        const result = await autoSolver.solveCaptcha();
        // Sum of stages should be very close to total (< 200ms overhead)
        const sumMs = result.detectionTimeMs + result.solvingTimeMs + result.submissionTimeMs;
        const overhead = Math.abs(result.totalTimeMs - sumMs);
        (0, test_1.expect)(overhead).toBeLessThan(200);
    });
    // ==========================================================================
    // SECTION 10: ERROR MESSAGE TESTS
    // ==========================================================================
    (0, test_1.test)('should provide descriptive error messages', async () => {
        const mockSolver = new MockSolverFail();
        autoSolver = (0, auto_solver_1.createAutoSolverWithSolver)(page, mockSolver, {
            enableCannotSolve: false,
        });
        const result = await autoSolver.solveCaptcha();
        // Verify: Error messages are present and meaningful
        (0, test_1.expect)(result.errors.length).toBeGreaterThan(0);
        result.errors.forEach(error => {
            (0, test_1.expect)(error.length).toBeGreaterThan(0);
            (0, test_1.expect)(typeof error).toBe('string');
        });
    });
    (0, test_1.test)('should include stage name in error context', async () => {
        const mockSolver = new MockSolverFail();
        autoSolver = (0, auto_solver_1.createAutoSolverWithSolver)(page, mockSolver, {
            enableCannotSolve: false,
        });
        const result = await autoSolver.solveCaptcha();
        // Verify: Stage name identifies where error occurred
        (0, test_1.expect)(['detection', 'solving', 'submission', 'completed']).toContain(result.stageName);
        // On solver failure, should be in 'solving' stage
        if (!result.success && !result.captchaDetected === false) {
            (0, test_1.expect)(result.stageName).toBe('solving');
        }
    });
});
//# sourceMappingURL=auto-solver.spec.js.map