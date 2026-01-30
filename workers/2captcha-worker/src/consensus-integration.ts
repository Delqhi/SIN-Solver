/**
 * INTEGRATION GUIDE: Consensus Engine for 2Captcha Worker
 * 
 * This file demonstrates how to integrate the Consensus Engine
 * into the actual solver workflow
 */

import { ConsensusEngine, SolverResult, validateDecision } from './consensus';
import { Logger } from 'winston';

/**
 * Example: Full CAPTCHA solving workflow with consensus
 */
export async function solveWithConsensus(
  captchaImageOrAudio: Buffer | string,
  captchaType: 'text' | 'slider' | 'click' | 'audio',
  logger: Logger
): Promise<{
  success: boolean;
  answer: string | null;
  confidence: number;
  reason: string;
}> {
  const consensusEngine = new ConsensusEngine(logger);

  logger.info('[WORKFLOW] Starting consensus-based CAPTCHA solving', {
    captchaType,
    timestamp: new Date().toISOString(),
  });

  // STEP 1: Run 3 parallel solvers
  const solverPromises = [
    runOCRSolver(captchaImageOrAudio, logger),        // Agent A: OCR
    runVisionSolver(captchaImageOrAudio, logger),     // Agent B: YOLO Vision
    runAudioSolver(captchaImageOrAudio, logger),      // Agent C: Whisper Audio (if applicable)
  ];

  let solverResults: SolverResult[];
  try {
    solverResults = await Promise.all(solverPromises);
    logger.info('[WORKFLOW] All 3 solvers completed', {
      results: solverResults.map((r) => ({
        agent: r.agentId,
        answer: r.answer,
        confidence: r.confidence,
        time: r.solveTime,
      })),
    });
  } catch (error) {
    logger.error('[WORKFLOW] Solver error', { error });
    return {
      success: false,
      answer: null,
      confidence: 0,
      reason: 'SOLVER_ERROR',
    };
  }

  // STEP 2: Run consensus
  const decision = consensusEngine.compareAnswers(solverResults);

  // STEP 3: Validate decision
  const validation = validateDecision(decision);
  if (!validation.isValid) {
    logger.error('[WORKFLOW] Invalid consensus decision', {
      errors: validation.errors,
    });
    return {
      success: false,
      answer: null,
      confidence: 0,
      reason: 'INVALID_DECISION',
    };
  }

  // STEP 4: Return result
  const result = {
    success: decision.action === 'SUBMIT',
    answer: decision.answer,
    confidence: decision.confidence,
    reason: decision.reason,
  };

  logger.info('[WORKFLOW] Consensus complete', {
    action: decision.action,
    reason: decision.reason,
    answer: decision.answer,
    confidence: decision.confidence.toFixed(3),
    votingPattern: decision.votingPattern,
  });

  return result;
}

/**
 * AGENT A: OCR Solver (ddddocr)
 * Fast, lightweight OCR for text CAPTCHAs
 */
async function runOCRSolver(
  imageBuffer: Buffer | string,
  logger: Logger
): Promise<SolverResult> {
  const startTime = Date.now();

  try {
    // This would integrate with actual ddddocr implementation
    const answer = 'MOCK_OCR_ANSWER'; // Replace with real OCR
    const confidence = 0.97; // Calculate real confidence

    const solveTime = Date.now() - startTime;

    logger.debug('[OCR_SOLVER] Solution found', {
      answer,
      confidence,
      time: solveTime,
    });

    return {
      agentId: 'agent-ocr-ddddocr',
      answer,
      confidence,
      solveTime,
      method: 'ddddocr',
      timestamp: new Date(),
    };
  } catch (error) {
    logger.warn('[OCR_SOLVER] Failed', { error });
    return {
      agentId: 'agent-ocr-ddddocr',
      answer: 'FAILED',
      confidence: 0,
      solveTime: Date.now() - startTime,
      method: 'ddddocr',
      timestamp: new Date(),
    };
  }
}

/**
 * AGENT B: Vision Solver (YOLO)
 * Deep learning vision model for complex CAPTCHAs
 */
async function runVisionSolver(
  imageBuffer: Buffer | string,
  logger: Logger
): Promise<SolverResult> {
  const startTime = Date.now();

  try {
    // This would integrate with actual YOLO implementation
    const answer = 'MOCK_VISION_ANSWER'; // Replace with real YOLO
    const confidence = 0.96; // Calculate real confidence

    const solveTime = Date.now() - startTime;

    logger.debug('[VISION_SOLVER] Solution found', {
      answer,
      confidence,
      time: solveTime,
    });

    return {
      agentId: 'agent-vision-yolo',
      answer,
      confidence,
      solveTime,
      method: 'yolo',
      timestamp: new Date(),
    };
  } catch (error) {
    logger.warn('[VISION_SOLVER] Failed', { error });
    return {
      agentId: 'agent-vision-yolo',
      answer: 'FAILED',
      confidence: 0,
      solveTime: Date.now() - startTime,
      method: 'yolo',
      timestamp: new Date(),
    };
  }
}

/**
 * AGENT C: Audio Solver (Whisper)
 * Speech-to-text for audio CAPTCHAs
 */
async function runAudioSolver(
  audioBuffer: Buffer | string,
  logger: Logger
): Promise<SolverResult> {
  const startTime = Date.now();

  try {
    // This would integrate with actual Whisper implementation
    const answer = 'MOCK_AUDIO_ANSWER'; // Replace with real Whisper
    const confidence = 0.98; // Calculate real confidence

    const solveTime = Date.now() - startTime;

    logger.debug('[AUDIO_SOLVER] Solution found', {
      answer,
      confidence,
      time: solveTime,
    });

    return {
      agentId: 'agent-audio-whisper',
      answer,
      confidence,
      solveTime,
      method: 'whisper',
      timestamp: new Date(),
    };
  } catch (error) {
    logger.warn('[AUDIO_SOLVER] Failed', { error });
    return {
      agentId: 'agent-audio-whisper',
      answer: 'FAILED',
      confidence: 0,
      solveTime: Date.now() - startTime,
      method: 'whisper',
      timestamp: new Date(),
    };
  }
}

/**
 * USAGE IN EXPRESS ROUTE
 */
export function createConsensusRoute(logger: Logger) {
  return async (req: any, res: any) => {
    const { captchaImage, captchaType } = req.body;

    try {
      const result = await solveWithConsensus(
        captchaImage,
        captchaType,
        logger
      );

      if (result.success) {
        logger.info('[API] CAPTCHA solved successfully', {
          answer: result.answer,
          confidence: result.confidence,
        });

        res.json({
          success: true,
          answer: result.answer,
          confidence: result.confidence,
          reason: result.reason,
        });
      } else {
        logger.warn('[API] CAPTCHA could not be solved', {
          reason: result.reason,
        });

        res.status(400).json({
          success: false,
          error: 'Could not reach consensus on CAPTCHA solution',
          reason: result.reason,
        });
      }
    } catch (error) {
      logger.error('[API] Error processing CAPTCHA', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * MONITORING & METRICS
 */
export function createMetricsEndpoint(
  consensusEngine: ConsensusEngine,
  logger: Logger
) {
  return (req: any, res: any) => {
    const stats = consensusEngine.getStatistics();
    const history = consensusEngine.getHistory(10);

    const metrics = {
      timestamp: new Date().toISOString(),
      statistics: {
        totalDecisions: stats.totalDecisions,
        successful: stats.submitted,
        rejected: stats.rejected,
        unanimousRate: `${stats.unanimousRate.toFixed(2)}%`,
        majorityRate: `${stats.majorityRate.toFixed(2)}%`,
        rejectionRate: `${stats.rejectionRate.toFixed(2)}%`,
        averageConfidence: stats.averageConfidence.toFixed(3),
      },
      recentDecisions: history.map((d) => ({
        action: d.action,
        reason: d.reason,
        answer: d.answer,
        confidence: d.confidence.toFixed(3),
        timestamp: d.agentResults[0].timestamp,
      })),
    };

    res.json(metrics);
  };
}

/**
 * SAFETY PRACTICES (MUST FOLLOW)
 * 
 * 1. NEVER submit below 95% confidence threshold
 *    - The 95% rule is non-negotiable
 *    - False submissions hurt reputation
 * 
 * 2. ALWAYS log all decisions
 *    - Logging enables debugging and monitoring
 *    - Audit trail is essential
 * 
 * 3. PREFER rejection over guessing
 *    - It's better to say "I don't know" than to guess
 *    - Wrong answers compound errors
 * 
 * 4. VALIDATE all decisions
 *    - Use validateDecision() before acting
 *    - Catches logical errors
 * 
 * 5. TRACK metrics
 *    - Monitor consensus rate and accuracy
 *    - Alert on unusual patterns
 */

/**
 * MONITORING ALERTS
 */
export function checkConsensusHealth(
  consensusEngine: ConsensusEngine,
  logger: Logger
): {
  healthy: boolean;
  warnings: string[];
} {
  const stats = consensusEngine.getStatistics();
  const warnings: string[] = [];

  // WARNING: Very low submission rate might indicate too strict
  if (stats.rejectionRate > 80 && stats.totalDecisions > 100) {
    warnings.push('Rejection rate > 80% - may be too strict');
  }

  // WARNING: High submission rate might indicate too loose
  if (stats.rejectionRate < 5 && stats.totalDecisions > 100) {
    warnings.push('Rejection rate < 5% - may be too loose');
  }

  // WARNING: Low unanimous rate suggests disagreement
  if (stats.unanimousRate < 30 && stats.totalDecisions > 100) {
    warnings.push('Unanimous rate < 30% - agents disagreeing frequently');
  }

  // WARNING: Low confidence
  if (stats.averageConfidence < 0.96 && stats.submitted > 0) {
    warnings.push('Average confidence < 96% - borderline submissions');
  }

  if (warnings.length > 0) {
    logger.warn('[HEALTH_CHECK] Consensus engine warnings', { warnings });
  }

  return {
    healthy: warnings.length === 0,
    warnings,
  };
}
