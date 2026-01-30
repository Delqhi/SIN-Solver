/**
 * 🤖 AUTO-SOLVER - UNIFIED CAPTCHA AUTOMATION WORKFLOW
 * ====================================================
 * 
 * Orchestrates the complete CAPTCHA solving pipeline:
 * 1. Detect CAPTCHA on page (TwoCaptchaDetector)
 * 2. Solve CAPTCHA image (MultiAgentSolver)
 * 3. Submit answer to page (CaptchaSubmitter)
 * 
 * Features:
 * - Full error handling with graceful degradation
 * - Human-like timing and behavior
 * - Comprehensive logging for debugging
 * - Statistics aggregation
 * - Timeout management per-stage and overall
 */

import { Page } from 'playwright';
import { TwoCaptchaDetector, CaptchaDetectionResult, CaptchaType } from './detector';
import { MultiAgentSolver, MultiAgentResult, createDefaultMultiAgentSolver } from './solvers';
import { CaptchaSubmitter } from './submitter';

/**
 * Result from end-to-end CAPTCHA solving
 */
export interface AutoSolveResult {
  success: boolean;
  captchaDetected: boolean;
  captchaType?: CaptchaType;
  answer?: string;
  confidence?: number;
  submissionSuccess?: boolean;
  
  // Timing info
  detectionTimeMs: number;
  solvingTimeMs: number;
  submissionTimeMs: number;
  totalTimeMs: number;
  
  // Error tracking
  errors: string[];
  
  // Statistics
  detectionAttempts: number;
  stageName: 'detection' | 'solving' | 'submission' | 'completed';
  stageError?: string;
  
  // Metadata
  timestamp: string;
  sessionId: string;
}

/**
 * Configuration for AutoSolver behavior
 */
export interface AutoSolverConfig {
  // Stage timeouts
  detectionTimeoutMs?: number;        // How long to wait for CAPTCHA (default: 120s)
  solverTimeoutMs?: number;           // How long to wait for solver (default: 30s)
  submissionTimeoutMs?: number;       // How long to wait for submit (default: 30s)
  
  // Solver options
  minSolverConfidence?: number;       // Min confidence to accept answer (default: 0.7)
  useSolverParallel?: boolean;        // Use parallel solver agents (default: true)
  
  // Logging
  verbose?: boolean;                  // Enable verbose logging (default: false)
  logDir?: string;                    // Directory for logs (default: './logs')
  
  // Screenshots
  enableScreenshots?: boolean;        // Save screenshots (default: true)
  screenshotDir?: string;             // Screenshot directory (default: './screenshots')
  
  // Behavior
  enableCannotSolve?: boolean;        // Allow "Cannot Solve" clicks (default: true)
  cannotSolveChance?: number;         // Probability 0-1 to click "Cannot Solve" (default: 0)
}

/**
 * Main AutoSolver class - orchestrates full CAPTCHA solving workflow
 */
export class AutoSolver {
  private page: Page;
  private detector: TwoCaptchaDetector;
  private solver: MultiAgentSolver;
  private submitter: CaptchaSubmitter;
  private config: Required<AutoSolverConfig>;
  private sessionId: string;
  private logger: (msg: string) => void;
  
  constructor(
    page: Page,
    solver?: MultiAgentSolver,
    config?: AutoSolverConfig
  ) {
    this.page = page;
    this.sessionId = `session-${Date.now()}`;
    
    // Set defaults for config
    this.config = {
      detectionTimeoutMs: config?.detectionTimeoutMs ?? 120000,
      solverTimeoutMs: config?.solverTimeoutMs ?? 30000,
      submissionTimeoutMs: config?.submissionTimeoutMs ?? 30000,
      minSolverConfidence: config?.minSolverConfidence ?? 0.7,
      useSolverParallel: config?.useSolverParallel ?? true,
      verbose: config?.verbose ?? false,
      logDir: config?.logDir ?? './logs',
      enableScreenshots: config?.enableScreenshots ?? true,
      screenshotDir: config?.screenshotDir ?? './screenshots',
      enableCannotSolve: config?.enableCannotSolve ?? true,
      cannotSolveChance: config?.cannotSolveChance ?? 0,
    };
    
    // Logger function
    this.logger = (msg: string) => {
      if (this.config.verbose) {
        console.log(`[AutoSolver ${this.sessionId}] ${msg}`);
      }
    };
    
    // Initialize components
    this.detector = new TwoCaptchaDetector(page, this.config.detectionTimeoutMs);
    this.solver = solver ?? createDefaultMultiAgentSolver({
      timeout: this.config.solverTimeoutMs,
      minConfidence: this.config.minSolverConfidence,
      parallel: this.config.useSolverParallel,
    });
    this.submitter = new CaptchaSubmitter(page, this.alertSystem, {
      screenshotDir: this.config.screenshotDir,
      timeout: this.config.submissionTimeoutMs,
    });
  }
  
  /**
   * Main CAPTCHA solving orchestration
   * Handles detect → solve → submit workflow
   */
  async solveCaptcha(): Promise<AutoSolveResult> {
    const overallStartTime = Date.now();
    const result: AutoSolveResult = {
      success: false,
      captchaDetected: false,
      errors: [],
      detectionTimeMs: 0,
      solvingTimeMs: 0,
      submissionTimeMs: 0,
      totalTimeMs: 0,
      detectionAttempts: 0,
      stageName: 'detection',
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
    };
    
    try {
      // ========================================
      // STAGE 1: DETECT CAPTCHA
      // ========================================
      result.stageName = 'detection';
      this.logger('🔍 Stage 1: Starting CAPTCHA detection...');
      const detectionStart = Date.now();
      
      let detection: CaptchaDetectionResult;
      try {
        detection = await this.detector.detect();
        result.detectionTimeMs = Date.now() - detectionStart;
        result.captchaDetected = detection.detected;
        result.captchaType = detection.type;
        result.detectionAttempts = 1; // Track this from detector if available
        
        this.logger(
          `✅ Detection completed in ${result.detectionTimeMs}ms. ` +
          `Detected: ${detection.detected}, Type: ${detection.type}`
        );
      } catch (error) {
        result.detectionTimeMs = Date.now() - detectionStart;
        const errorMsg = `Detection failed: ${error instanceof Error ? error.message : String(error)}`;
        result.errors.push(errorMsg);
        result.stageError = errorMsg;
        this.logger(`❌ ${errorMsg}`);
        return result; // Return early if detection fails
      }
      
      // If no CAPTCHA detected, check if user wants to try "Cannot Solve"
      if (!detection.detected) {
        this.logger('⚠️  No CAPTCHA detected on page');
        
        // Check if we should click "Cannot Solve" as fallback
        if (
          this.config.enableCannotSolve &&
          Math.random() < this.config.cannotSolveChance
        ) {
          this.logger('🤔 Attempting "Cannot Solve" as fallback...');
          try {
            await this.submitter.clickCannotSolve();
            result.success = true;
            result.stageName = 'completed';
            this.logger('✅ "Cannot Solve" clicked successfully');
          } catch (error) {
            result.errors.push(`Cannot Solve failed: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
        
        result.totalTimeMs = Date.now() - overallStartTime;
        return result;
      }
      
      // ========================================
      // STAGE 2: SOLVE CAPTCHA
      // ========================================
      result.stageName = 'solving';
      this.logger('🧠 Stage 2: Starting CAPTCHA solving...');
      
      if (!detection.screenshot && !detection.screenshotBase64) {
        const errorMsg = 'No screenshot available for solving';
        result.errors.push(errorMsg);
        result.stageError = errorMsg;
        this.logger(`❌ ${errorMsg}`);
        result.totalTimeMs = Date.now() - overallStartTime;
        return result;
      }
      
      const solveStart = Date.now();
      let solveResult: MultiAgentResult;
      
      try {
        // Convert screenshot to Buffer if needed
        const captchaImage = detection.screenshot ||
          (detection.screenshotBase64 ? Buffer.from(detection.screenshotBase64, 'base64') : undefined);
        
        if (!captchaImage) {
          throw new Error('Unable to get CAPTCHA image for solving');
        }
        
        solveResult = await this.solver.solve(captchaImage);
        result.solvingTimeMs = Date.now() - solveStart;
        
        // Use best result
        if (solveResult.bestResult) {
          result.answer = solveResult.bestResult.answer;
          result.confidence = solveResult.bestResult.confidence;
          
          this.logger(
            `✅ Solving completed in ${result.solvingTimeMs}ms. ` +
            `Answer: "${result.answer}", Confidence: ${(result.confidence * 100).toFixed(1)}%`
          );
        } else {
          throw new Error('No valid solution from any agent');
        }
      } catch (error) {
        result.solvingTimeMs = Date.now() - solveStart;
        const errorMsg = `Solving failed: ${error instanceof Error ? error.message : String(error)}`;
        result.errors.push(errorMsg);
        result.stageError = errorMsg;
        this.logger(`❌ ${errorMsg}`);
        
        // If solving fails, try "Cannot Solve" if enabled
        if (this.config.enableCannotSolve) {
          this.logger('🔄 Attempting "Cannot Solve" due to solve failure...');
          try {
            await this.submitter.clickCannotSolve();
            result.success = true;
            result.stageName = 'completed';
            this.logger('✅ "Cannot Solve" clicked as fallback');
          } catch (cannotSolveError) {
            result.errors.push(
              `Cannot Solve fallback failed: ${cannotSolveError instanceof Error ? cannotSolveError.message : String(cannotSolveError)}`
            );
          }
        }
        
        result.totalTimeMs = Date.now() - overallStartTime;
        return result;
      }
      
      // ========================================
      // STAGE 3: SUBMIT ANSWER
      // ========================================
      result.stageName = 'submission';
      this.logger('📤 Stage 3: Submitting answer...');
      
      const submitStart = Date.now();
      try {
        const submitResult = await this.submitter.submitAnswer(result.answer!);
        result.submissionTimeMs = Date.now() - submitStart;
        result.submissionSuccess = submitResult.success;
        
        if (submitResult.success) {
          result.success = true;
          result.stageName = 'completed';
          this.logger(
            `✅ Submission completed successfully in ${result.submissionTimeMs}ms`
          );
        } else {
          const errorMsg = `Submission failed: ${submitResult.error || 'Unknown error'}`;
          result.errors.push(errorMsg);
          result.stageError = errorMsg;
          this.logger(`❌ ${errorMsg}`);
        }
      } catch (error) {
        result.submissionTimeMs = Date.now() - submitStart;
        const errorMsg = `Submission error: ${error instanceof Error ? error.message : String(error)}`;
        result.errors.push(errorMsg);
        result.stageError = errorMsg;
        this.logger(`❌ ${errorMsg}`);
      }
      
      // ========================================
      // FINALIZE RESULT
      // ========================================
      result.totalTimeMs = Date.now() - overallStartTime;
      
      if (result.success) {
        this.logger(
          `🎉 CAPTCHA solved successfully in ${result.totalTimeMs}ms! ` +
          `(Detection: ${result.detectionTimeMs}ms, Solving: ${result.solvingTimeMs}ms, Submit: ${result.submissionTimeMs}ms)`
        );
      } else {
        this.logger(
          `❌ CAPTCHA solving failed after ${result.totalTimeMs}ms. ` +
          `Errors: ${result.errors.join(' | ')}`
        );
      }
      
      return result;
      
    } catch (error) {
      // Catch any unexpected errors
      const errorMsg = `Unexpected error in AutoSolver: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      result.stageError = errorMsg;
      result.totalTimeMs = Date.now() - overallStartTime;
      this.logger(`💥 ${errorMsg}`);
      return result;
    }
  }
  
  /**
   * Get statistics from all components
   */
  getStatistics(): {
    detectionStats: any;
    submitterStats: any;
    solverStats: any;
  } {
    return {
      detectionStats: {
        sessionId: this.sessionId,
        config: {
          detectionTimeoutMs: this.config.detectionTimeoutMs,
          solverTimeoutMs: this.config.solverTimeoutMs,
          submissionTimeoutMs: this.config.submissionTimeoutMs,
        },
      },
      submitterStats: this.submitter.getStats(),
      solverStats: {
        minConfidence: this.config.minSolverConfidence,
        useParallel: this.config.useSolverParallel,
      },
    };
  }
  
  /**
   * Reset all internal state
   */
  reset(): void {
    this.logger('🔄 Resetting AutoSolver state...');
    this.submitter.reset();
    this.sessionId = `session-${Date.now()}`;
    this.logger('✅ AutoSolver reset complete');
  }
  
  /**
   * Enable verbose logging
   */
  setVerbose(verbose: boolean): void {
    const oldLogger = this.logger;
    if (verbose) {
      this.logger = (msg: string) => console.log(`[AutoSolver ${this.sessionId}] ${msg}`);
    } else {
      this.logger = () => {}; // No-op logger
    }
  }
}

/**
 * Factory function to create AutoSolver with default configuration
 */
export function createAutoSolver(
  page: Page,
  config?: AutoSolverConfig
): AutoSolver {
  return new AutoSolver(page, undefined, config);
}

/**
 * Factory function to create AutoSolver with custom solver
 */
export function createAutoSolverWithSolver(
  page: Page,
  solver: MultiAgentSolver,
  config?: AutoSolverConfig
): AutoSolver {
  return new AutoSolver(page, solver, config);
}
