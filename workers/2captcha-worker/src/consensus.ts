/**
 * Consensus Engine for 2Captcha Worker
 * 
 * Implements 95% Rule: Only submits answers when meeting confidence threshold
 * - Unanimous: All 3 agents agree (all >= 95%)
 * - Majority: 2 of 3 agents agree (both >= 95%)
 * - No Consensus: Different answers or confidence too low -> CANNOT_SOLVE
 */

import { Logger } from 'winston';

/**
 * Solver result from a single agent
 */
export interface SolverResult {
  agentId: string;
  answer: string;
  confidence: number;
  solveTime: number; // milliseconds
  method: string; // e.g., "ddddocr", "yolo", "whisper"
  timestamp: Date;
}

/**
 * Consensus decision after comparing multiple results
 */
export interface ConsensusDecision {
  action: 'SUBMIT' | 'CANNOT_SOLVE';
  answer: string | null;
  confidence: number; // Minimum of matching agents' confidences
  reason: 'UNANIMOUS' | 'MAJORITY_AB' | 'MAJORITY_AC' | 'MAJORITY_BC' | 'NO_CONSENSUS';
  agentResults: SolverResult[];
  votingPattern: string; // Human-readable voting pattern
  submissionSafety: {
    meetsThreshold: boolean;
    threshold: number;
    marginAboveThreshold: number; // How many percentage points above threshold
  };
}

/**
 * Consensus Engine for CAPTCHA solving
 */
export class ConsensusEngine {
  private logger: Logger;
  private readonly CONFIDENCE_THRESHOLD = 0.95; // 95% minimum
  private decisionHistory: ConsensusDecision[] = [];

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Compare 3 agent results and reach consensus
   * 
   * RULE 1: Unanimous (3/3 agree)
   * All 3 agents have same answer AND all >= 95% confidence
   * Result: SUBMIT with minimum confidence
   * 
   * RULE 2: Majority (2/3 agree)
   * Any 2 agents have same answer AND both >= 95% confidence
   * Result: SUBMIT with minimum confidence of the 2
   * 
   * RULE 3: No Consensus
   * - All 3 have different answers, OR
   * - Any matching pair has < 95% confidence, OR
   * - Only 1 agent is confident
   * Result: CANNOT_SOLVE (refuse to guess)
   */
  public compareAnswers(results: SolverResult[]): ConsensusDecision {
    if (results.length !== 3) {
      throw new Error(`Expected 3 solver results, got ${results.length}`);
    }

    // Deep copy and sort by agent ID for consistent ordering
    const [A, B, C] = results.sort((a, b) => a.agentId.localeCompare(b.agentId));

    this.logger.info('[CONSENSUS] Starting consensus comparison', {
      agentA: { id: A.agentId, answer: A.answer, confidence: A.confidence },
      agentB: { id: B.agentId, answer: B.answer, confidence: B.confidence },
      agentC: { id: C.agentId, answer: C.answer, confidence: C.confidence },
    });

    // CHECK 1: UNANIMOUS - All 3 agents agree
    if (
      A.answer === B.answer &&
      B.answer === C.answer &&
      A.confidence >= this.CONFIDENCE_THRESHOLD &&
      B.confidence >= this.CONFIDENCE_THRESHOLD &&
      C.confidence >= this.CONFIDENCE_THRESHOLD
    ) {
      const minConfidence = Math.min(A.confidence, B.confidence, C.confidence);
      const decision: ConsensusDecision = {
        action: 'SUBMIT',
        answer: A.answer,
        confidence: minConfidence,
        reason: 'UNANIMOUS',
        agentResults: [A, B, C],
        votingPattern: `${A.answer} (A=${A.confidence.toFixed(3)}) | ${B.answer} (B=${B.confidence.toFixed(3)}) | ${C.answer} (C=${C.confidence.toFixed(3)})`,
        submissionSafety: {
          meetsThreshold: true,
          threshold: this.CONFIDENCE_THRESHOLD,
          marginAboveThreshold: (minConfidence - this.CONFIDENCE_THRESHOLD) * 100,
        },
      };

      this.logger.info('[CONSENSUS] UNANIMOUS decision reached', {
        answer: decision.answer,
        confidence: decision.confidence,
        margin: `${decision.submissionSafety.marginAboveThreshold.toFixed(2)}%`,
      });

      this.decisionHistory.push(decision);
      return decision;
    }

    // CHECK 2: MAJORITY - 2 of 3 agents agree (and both confident)
    // Try A-B
    if (
      A.answer === B.answer &&
      A.confidence >= this.CONFIDENCE_THRESHOLD &&
      B.confidence >= this.CONFIDENCE_THRESHOLD
    ) {
      const minConfidence = Math.min(A.confidence, B.confidence);
      const decision: ConsensusDecision = {
        action: 'SUBMIT',
        answer: A.answer,
        confidence: minConfidence,
        reason: 'MAJORITY_AB',
        agentResults: [A, B, C],
        votingPattern: `${A.answer} (A=${A.confidence.toFixed(3)}) | ${B.answer} (B=${B.confidence.toFixed(3)}) vs ${C.answer} (C=${C.confidence.toFixed(3)})`,
        submissionSafety: {
          meetsThreshold: true,
          threshold: this.CONFIDENCE_THRESHOLD,
          marginAboveThreshold: (minConfidence - this.CONFIDENCE_THRESHOLD) * 100,
        },
      };

      this.logger.info('[CONSENSUS] MAJORITY decision reached (A-B)', {
        answer: decision.answer,
        confidence: decision.confidence,
        agreeingAgents: [A.agentId, B.agentId],
        dissenter: C.agentId,
        margin: `${decision.submissionSafety.marginAboveThreshold.toFixed(2)}%`,
      });

      this.decisionHistory.push(decision);
      return decision;
    }

    // Try A-C
    if (
      A.answer === C.answer &&
      A.confidence >= this.CONFIDENCE_THRESHOLD &&
      C.confidence >= this.CONFIDENCE_THRESHOLD
    ) {
      const minConfidence = Math.min(A.confidence, C.confidence);
      const decision: ConsensusDecision = {
        action: 'SUBMIT',
        answer: A.answer,
        confidence: minConfidence,
        reason: 'MAJORITY_AC',
        agentResults: [A, B, C],
        votingPattern: `${A.answer} (A=${A.confidence.toFixed(3)}) vs ${B.answer} (B=${B.confidence.toFixed(3)}) | ${C.answer} (C=${C.confidence.toFixed(3)})`,
        submissionSafety: {
          meetsThreshold: true,
          threshold: this.CONFIDENCE_THRESHOLD,
          marginAboveThreshold: (minConfidence - this.CONFIDENCE_THRESHOLD) * 100,
        },
      };

      this.logger.info('[CONSENSUS] MAJORITY decision reached (A-C)', {
        answer: decision.answer,
        confidence: decision.confidence,
        agreeingAgents: [A.agentId, C.agentId],
        dissenter: B.agentId,
        margin: `${decision.submissionSafety.marginAboveThreshold.toFixed(2)}%`,
      });

      this.decisionHistory.push(decision);
      return decision;
    }

    // Try B-C
    if (
      B.answer === C.answer &&
      B.confidence >= this.CONFIDENCE_THRESHOLD &&
      C.confidence >= this.CONFIDENCE_THRESHOLD
    ) {
      const minConfidence = Math.min(B.confidence, C.confidence);
      const decision: ConsensusDecision = {
        action: 'SUBMIT',
        answer: B.answer,
        confidence: minConfidence,
        reason: 'MAJORITY_BC',
        agentResults: [A, B, C],
        votingPattern: `${A.answer} (A=${A.confidence.toFixed(3)}) vs ${B.answer} (B=${B.confidence.toFixed(3)}) | ${C.answer} (C=${C.confidence.toFixed(3)})`,
        submissionSafety: {
          meetsThreshold: true,
          threshold: this.CONFIDENCE_THRESHOLD,
          marginAboveThreshold: (minConfidence - this.CONFIDENCE_THRESHOLD) * 100,
        },
      };

      this.logger.info('[CONSENSUS] MAJORITY decision reached (B-C)', {
        answer: decision.answer,
        confidence: decision.confidence,
        agreeingAgents: [B.agentId, C.agentId],
        dissenter: A.agentId,
        margin: `${decision.submissionSafety.marginAboveThreshold.toFixed(2)}%`,
      });

      this.decisionHistory.push(decision);
      return decision;
    }

    // CHECK 3: NO CONSENSUS
    // Reasons:
    // - All 3 have different answers
    // - Matching pair has confidence < 95%
    // - No pair meets confidence threshold
    const decision: ConsensusDecision = {
      action: 'CANNOT_SOLVE',
      answer: null,
      confidence: 0,
      reason: 'NO_CONSENSUS',
      agentResults: [A, B, C],
      votingPattern: `${A.answer} (A=${A.confidence.toFixed(3)}) | ${B.answer} (B=${B.confidence.toFixed(3)}) | ${C.answer} (C=${C.confidence.toFixed(3)})`,
      submissionSafety: {
        meetsThreshold: false,
        threshold: this.CONFIDENCE_THRESHOLD,
        marginAboveThreshold: 0,
      },
    };

    // Detailed logging of why no consensus
    this.logger.warn('[CONSENSUS] NO_CONSENSUS - refusing to guess', {
      votingPattern: decision.votingPattern,
      analysisA_vs_B: {
        match: A.answer === B.answer,
        bothConfident: A.confidence >= this.CONFIDENCE_THRESHOLD && B.confidence >= this.CONFIDENCE_THRESHOLD,
        minConfidence: Math.min(A.confidence, B.confidence),
      },
      analysisA_vs_C: {
        match: A.answer === C.answer,
        bothConfident: A.confidence >= this.CONFIDENCE_THRESHOLD && C.confidence >= this.CONFIDENCE_THRESHOLD,
        minConfidence: Math.min(A.confidence, C.confidence),
      },
      analysisB_vs_C: {
        match: B.answer === C.answer,
        bothConfident: B.confidence >= this.CONFIDENCE_THRESHOLD && C.confidence >= this.CONFIDENCE_THRESHOLD,
        minConfidence: Math.min(B.confidence, C.confidence),
      },
    });

    this.decisionHistory.push(decision);
    return decision;
  }

  /**
   * Get consensus statistics
   */
  public getStatistics(): {
    totalDecisions: number;
    submitted: number;
    rejected: number;
    unanimousRate: number;
    majorityRate: number;
    rejectionRate: number;
    averageConfidence: number;
  } {
    const submitted = this.decisionHistory.filter((d) => d.action === 'SUBMIT');
    const unanimous = this.decisionHistory.filter((d) => d.reason === 'UNANIMOUS');
    const majority = this.decisionHistory.filter((d) => d.reason !== 'UNANIMOUS' && d.action === 'SUBMIT');

    const totalSubmitted = submitted.length;
    const total = this.decisionHistory.length;
    const totalConfidence = submitted.reduce((sum, d) => sum + d.confidence, 0);

    return {
      totalDecisions: total,
      submitted: totalSubmitted,
      rejected: total - totalSubmitted,
      unanimousRate: total > 0 ? (unanimous.length / total) * 100 : 0,
      majorityRate: total > 0 ? (majority.length / total) * 100 : 0,
      rejectionRate: total > 0 ? ((total - totalSubmitted) / total) * 100 : 0,
      averageConfidence: totalSubmitted > 0 ? totalConfidence / totalSubmitted : 0,
    };
  }

  /**
   * Get decision history (last N decisions)
   */
  public getHistory(limit: number = 50): ConsensusDecision[] {
    return this.decisionHistory.slice(-limit);
  }

  /**
   * Clear history
   */
  public clearHistory(): void {
    this.logger.info('[CONSENSUS] Clearing decision history', {
      previousCount: this.decisionHistory.length,
    });
    this.decisionHistory = [];
  }
}

/**
 * Validation helper - ensures a decision is safe to submit
 */
export function validateDecision(decision: ConsensusDecision): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (decision.action === 'SUBMIT' && decision.answer === null) {
    errors.push('SUBMIT action requires a non-null answer');
  }

  if (decision.action === 'SUBMIT' && decision.confidence < 0.95) {
    errors.push(`Confidence ${decision.confidence.toFixed(3)} is below 95% threshold`);
  }

  if (decision.action === 'CANNOT_SOLVE' && decision.answer !== null) {
    errors.push('CANNOT_SOLVE action must have null answer');
  }

  if (decision.confidence < 0 || decision.confidence > 1) {
    errors.push(`Confidence ${decision.confidence} must be between 0 and 1`);
  }

  if (decision.action === 'SUBMIT' && !decision.submissionSafety.meetsThreshold) {
    errors.push('SUBMIT action marked as not meeting threshold');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
