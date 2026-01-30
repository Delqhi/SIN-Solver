/**
 * Vision Solver - Multi-Model AI Consensus CAPTCHA Solver
 * 
 * CRITICAL CONSTRAINTS:
 * ✅ Only SUBMIT when 2+ agents ≥95% confident AND agree
 * ✅ Return CANNOT_SOLVE when consensus fails
 * ❌ NEVER submit with confidence < 95%
 * ❌ NEVER guess when no consensus exists
 * 
 * Architecture:
 * - Agent 1: Gemini Vision API (Remote)
 * - Agent 2: Mistral Vision API (Remote)  
 * - Agent 3: Local OCR (ddddocr - existing solver)
 * 
 * Execution:
 * - All 3 agents run in PARALLEL via Promise.allSettled()
 * - Results aggregated and passed to ConsensusEngine
 * - Only returns SUBMIT action when consensus ≥95%
 */

import { Logger } from 'winston';
import { ConsensusEngine, ConsensusDecision, validateDecision } from './consensus';

/**
 * Individual agent result before consensus
 */
interface AgentResult {
  agentId: string;
  answer: string;
  confidence: number;
  solveTime: number; // milliseconds
  method: string;
  timestamp: Date;
  error?: string;
}

/**
 * Result returned from vision solver
 */
export interface VisionSolveResult {
  success: boolean;
  captchaType: string;
  solution: string | undefined;
  confidence: number;
  solvedByService: string;
  elapsedTimeMs: number;
  consensusReason?: string;
  agentDetails?: AgentResult[];
  error?: string;
}

/**
 * Configuration for vision solver
 */
export interface VisionSolverConfig {
  geminiApiUrl?: string;
  mistralApiUrl?: string;
  timeoutMs?: number;
  confidenceThreshold?: number;
}

/**
 * Vision Solver Class - Orchestrates 3 agents with 95% consensus rule
 */
export class VisionSolver {
  private logger: Logger;
  private consensusEngine: ConsensusEngine;

  // API Endpoints
  private geminiApiUrl: string;
  private mistralApiUrl: string;

  // Configuration
  private timeout: number;
  private confidenceThreshold: number;

  constructor(
    logger: Logger,
    consensusEngine: ConsensusEngine,
    config: VisionSolverConfig = {}
  ) {
    this.logger = logger;
    this.consensusEngine = consensusEngine;

    this.geminiApiUrl =
      config.geminiApiUrl ||
      process.env.GEMINI_API_URL ||
      'https://api.delqhi.com/ai/gemini';
    this.mistralApiUrl =
      config.mistralApiUrl ||
      process.env.MISTRAL_API_URL ||
      'https://api.delqhi.com/ai/mistral';
    this.timeout = config.timeoutMs || parseInt(process.env.VISION_TIMEOUT_MS || '10000');
    this.confidenceThreshold =
      config.confidenceThreshold ||
      parseFloat(process.env.VISION_CONFIDENCE_THRESHOLD || '0.95');

    this.logger.info('[VISION-SOLVER] Initialized', {
      geminiApiUrl: this.geminiApiUrl,
      mistralApiUrl: this.mistralApiUrl,
      timeout: this.timeout,
      confidenceThreshold: this.confidenceThreshold,
    });
  }

  /**
   * Main entry point: Solve CAPTCHA with vision consensus
   * 
   * CONSTRAINTS:
   * - Only returns SUBMIT when 2+ agents ≥95% confident AND agree
   * - Returns CANNOT_SOLVE when consensus fails
   * - NEVER guesses or submits low-confidence answers
   * 
   * @param image - CAPTCHA image buffer
   * @returns VisionSolveResult with submission decision
   */
  async solveWithConsensus(image: Buffer): Promise<VisionSolveResult> {
    const startTime = Date.now();
    const logContext = { method: 'solveWithConsensus' };

    try {
      this.logger.info('[VISION-SOLVER] Starting consensus solve', logContext);

      // Validate image
      if (!image || image.length === 0) {
        throw new Error('Invalid image buffer: empty or null');
      }

      // STEP 1: Run all 3 agents in PARALLEL
      this.logger.debug('[VISION-SOLVER] Spawning 3 agents in parallel', {
        agents: ['gemini-v1', 'mistral-v1', 'ddddocr-v1'],
      });

      const [geminiResult, mistralResult, ocrResult] = await Promise.allSettled([
        this.geminiSolve(image),
        this.mistralSolve(image),
        this.localOCRSolve(image),
      ]);

      // STEP 2: Map settled results (handle failures gracefully)
      const solverResults = [
        this.mapSettledResult(geminiResult, 'gemini-v1'),
        this.mapSettledResult(mistralResult, 'mistral-v1'),
        this.mapSettledResult(ocrResult, 'ddddocr-v1'),
      ];

      // Log all agent results
      this.logger.info('[VISION-SOLVER] All agents completed', {
        gemini: { answer: solverResults[0].answer, confidence: solverResults[0].confidence, error: solverResults[0].error },
        mistral: { answer: solverResults[1].answer, confidence: solverResults[1].confidence, error: solverResults[1].error },
        ocr: { answer: solverResults[2].answer, confidence: solverResults[2].confidence, error: solverResults[2].error },
      });

      // STEP 3: Filter valid results (confidence > 0)
      const validResults = solverResults.filter(
        (r) => r.confidence > 0 && !r.error
      );

      if (validResults.length === 0) {
        this.logger.error('[VISION-SOLVER] All agents failed - no valid results', {
          gemini: solverResults[0].error,
          mistral: solverResults[1].error,
          ocr: solverResults[2].error,
        });

        return this.createFailureResult(
          'All agents failed - cannot solve',
          startTime,
          solverResults
        );
      }

      // STEP 4: Apply consensus engine (95% rule)
      this.logger.info('[VISION-SOLVER] Applying consensus engine', {
        validResults: validResults.length,
        threshold: this.confidenceThreshold,
      });

      // Convert AgentResult to SolverResult format for consensus engine
      // ⚠️ CRITICAL FIX: Use validResults (filtered) not solverResults (all)
      // Failed agents have answer='' and confidence=0, which breaks majority voting
      // by preventing valid agents from matching ('' !== 'ANSWER123')
      const consensusInputs = validResults.map((r) => ({
        agentId: r.agentId,
        answer: r.answer,
        confidence: r.confidence,
        solveTime: r.solveTime,
        method: r.method,
        timestamp: r.timestamp,
      }));

      // DEBUG: Log data flowing to consensus engine
      this.logger.info('[DEBUG] consensusInputs ready for consensus engine', {
        count: consensusInputs.length,
        inputs: consensusInputs.map(r => ({
          agentId: r.agentId,
          answer: r.answer.substring(0, 50), // First 50 chars
          confidence: r.confidence,
        })),
      });

      const decision = this.consensusEngine.compareAnswers(consensusInputs);

      // DEBUG: Log consensus decision
      this.logger.info('[DEBUG] consensus decision returned', {
        action: decision.action,
        reason: decision.reason,
        answer: decision.answer?.substring(0, 50),
        confidence: decision.confidence,
        agentResults: decision.agentResults?.map(r => ({
          agentId: r.agentId,
          answer: r.answer?.substring(0, 50),
          confidence: r.confidence,
        })),
      });

      // Validate decision safety
      const validation = validateDecision(decision);
      if (!validation.isValid) {
        this.logger.error('[VISION-SOLVER] Decision validation failed', {
          decision,
          errors: validation.errors,
        });
        return this.createFailureResult(
          `Decision validation failed: ${validation.errors.join('; ')}`,
          startTime,
          solverResults
        );
      }

      // STEP 5: Return result based on decision
      if (decision.action === 'SUBMIT') {
        this.logger.info('[VISION-SOLVER] SUBMIT decision - confidence meets 95% rule', {
          decision: decision.reason,
          answer: decision.answer,
          confidence: decision.confidence,
          margin: `${decision.submissionSafety.marginAboveThreshold.toFixed(2)}%`,
          agentCount: decision.agentResults.length,
        });

        return {
          success: true,
          captchaType: 'image',
          solution: decision.answer,
          confidence: decision.confidence,
          solvedByService: 'vision-consensus',
          elapsedTimeMs: Date.now() - startTime,
          consensusReason: decision.reason,
          agentDetails: solverResults,
        };
      } else {
        this.logger.warn('[VISION-SOLVER] CANNOT_SOLVE decision - no consensus', {
          reason: decision.reason,
          voting: decision.votingPattern,
          agentResults: decision.agentResults.map((r) => ({
            agentId: r.agentId,
            answer: r.answer,
            confidence: r.confidence,
          })),
        });

        return {
          success: false,
          captchaType: 'image',
          solution: undefined,
          confidence: 0,
          solvedByService: 'vision-consensus',
          elapsedTimeMs: Date.now() - startTime,
          consensusReason: `NO_CONSENSUS: ${decision.votingPattern}`,
          agentDetails: solverResults,
        };
      }
    } catch (error) {
      this.logger.error('[VISION-SOLVER] Unhandled error', {
        ...logContext,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      return this.createFailureResult(
        error instanceof Error ? error.message : 'Unknown error',
        startTime
      );
    }
  }

  /**
   * Agent 1: Gemini Vision API
   * @private
   */
  private async geminiSolve(image: Buffer): Promise<AgentResult> {
    const startTime = Date.now();
    const logContext = { agent: 'gemini-v1' };

    try {
      this.logger.debug('[GEMINI] Starting solve', logContext);

      const base64Image = image.toString('base64');

      const response = await this.fetchWithTimeout(
        this.geminiApiUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: `data:image/jpeg;base64,${base64Image}`,
            prompt: 'Read the text in this CAPTCHA image. Reply with ONLY the text, no explanation.',
          }),
        },
        this.timeout
      );

      if (!response.ok) {
        throw new Error(
          `Gemini API returned ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();

      const result: AgentResult = {
        agentId: 'gemini-v1',
        answer: data.text?.trim() || '',
        confidence: data.confidence || 0.8,
        solveTime: Date.now() - startTime,
        method: 'gemini-vision',
        timestamp: new Date(),
      };

      this.logger.debug('[GEMINI] Solve successful', {
        ...logContext,
        answer: result.answer,
        confidence: result.confidence,
        solveTime: result.solveTime,
      });

      return result;
    } catch (error) {
      this.logger.warn('[GEMINI] Solve failed', {
        ...logContext,
        error: error instanceof Error ? error.message : String(error),
        solveTime: Date.now() - startTime,
      });

      return {
        agentId: 'gemini-v1',
        answer: '',
        confidence: 0,
        solveTime: Date.now() - startTime,
        method: 'gemini-vision',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Agent 2: Mistral Vision API
   * @private
   */
  private async mistralSolve(image: Buffer): Promise<AgentResult> {
    const startTime = Date.now();
    const logContext = { agent: 'mistral-v1' };

    try {
      this.logger.debug('[MISTRAL] Starting solve', logContext);

      const base64Image = image.toString('base64');

      const response = await this.fetchWithTimeout(
        this.mistralApiUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: `data:image/jpeg;base64,${base64Image}`,
            prompt: 'Read the text in this CAPTCHA image. Reply with ONLY the text, no explanation.',
          }),
        },
        this.timeout
      );

      if (!response.ok) {
        throw new Error(
          `Mistral API returned ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();

       const result: AgentResult = {
         agentId: 'mistral-v1',
         answer: data.text?.trim() || '',
         confidence: data.confidence || 0.8,
         solveTime: Date.now() - startTime,
         method: 'mistral-vision',
         timestamp: new Date(),
       };

      this.logger.debug('[MISTRAL] Solve successful', {
        ...logContext,
        answer: result.answer,
        confidence: result.confidence,
        solveTime: result.solveTime,
      });

      return result;
    } catch (error) {
      this.logger.warn('[MISTRAL] Solve failed', {
        ...logContext,
        error: error instanceof Error ? error.message : String(error),
        solveTime: Date.now() - startTime,
      });

      return {
        agentId: 'mistral-v1',
        answer: '',
        confidence: 0,
        solveTime: Date.now() - startTime,
        method: 'mistral-vision',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Agent 3: Local OCR (ddddocr)
   * 
   * Wraps existing DDDDOCRSolver to match AgentResult interface
   * @private
   */
  private async localOCRSolve(image: Buffer): Promise<AgentResult> {
    const startTime = Date.now();
    const logContext = { agent: 'ddddocr-v1' };

    try {
      this.logger.debug('[OCR] Starting solve', logContext);

      // Dynamically import existing solver (to avoid circular dependencies)
      const { DDDDOCRSolver } = await import('./solvers/ddddocr-solver');
      const ocr = new DDDDOCRSolver({ timeout: this.timeout });
      const result = await ocr.solve(image);

      // Map solver result to AgentResult format
      const agentResult: AgentResult = {
        agentId: 'ddddocr-v1',
        answer: result.answer?.trim() || '',
        confidence: result.confidence || 0.75,
        solveTime: result.time || (Date.now() - startTime),
        method: 'ocr-ddddocr',
        timestamp: new Date(),
      };

      if (result.error) {
        agentResult.error = result.error;
        agentResult.confidence = 0;
        agentResult.answer = '';
      }

      this.logger.debug('[OCR] Solve completed', {
        ...logContext,
        answer: agentResult.answer,
        confidence: agentResult.confidence,
        solveTime: agentResult.solveTime,
        error: agentResult.error,
      });

      return agentResult;
    } catch (error) {
      this.logger.warn('[OCR] Solve failed', {
        ...logContext,
        error: error instanceof Error ? error.message : String(error),
        solveTime: Date.now() - startTime,
      });

      return {
        agentId: 'ddddocr-v1',
        answer: '',
        confidence: 0,
        solveTime: Date.now() - startTime,
        method: 'ocr-ddddocr',
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch with timeout (Promise.race pattern)
   * 
   * More flexible than AbortController - allows custom timeout handling
   * @private
   */
  private fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number
  ): Promise<Response> {
    return Promise.race([
      fetch(url, options),
      new Promise<Response>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Fetch timeout after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);
  }

  /**
   * Map Promise.allSettled result to AgentResult
   * 
   * Handles both fulfilled and rejected promises gracefully
   * @private
   */
  private mapSettledResult(
    settled: PromiseSettledResult<AgentResult>,
    agentId: string
  ): AgentResult {
    if (settled.status === 'fulfilled') {
      return settled.value;
    } else {
      return {
        agentId,
        answer: '',
        confidence: 0,
        solveTime: this.timeout,
        method: 'error',
        timestamp: new Date(),
        error: settled.reason?.message || 'Promise rejected',
      };
    }
  }

  /**
   * Create standardized failure result
   * @private
   */
  private createFailureResult(
    reason: string,
    startTime: number,
    agentDetails?: AgentResult[]
  ): VisionSolveResult {
    return {
      success: false,
      captchaType: 'image',
      solution: undefined,
      confidence: 0,
      solvedByService: 'vision-consensus',
      elapsedTimeMs: Date.now() - startTime,
      consensusReason: `FAILURE: ${reason}`,
      agentDetails: agentDetails || [],
      error: reason,
    };
  }
}

/**
 * Factory function for easy instantiation
 */
export function createVisionSolver(
  logger: Logger,
  consensusEngine: ConsensusEngine,
  config?: VisionSolverConfig
): VisionSolver {
  return new VisionSolver(logger, consensusEngine, config);
}
