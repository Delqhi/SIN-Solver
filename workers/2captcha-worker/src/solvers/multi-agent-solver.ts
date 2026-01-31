/**
 * Multi-Agent CAPTCHA Solver Orchestrator
 * Coordinates 3 independent solvers in parallel for robust CAPTCHA resolution
 * 
 * Architecture:
 * - Agent 1: Skyvern Vision (Browser + Vision AI)
 * - Agent 2: GPT-4V / Claude Vision (API-based multimodal)
 * - Agent 3: ddddocr (Offline OCR)
 * 
 * Execution Model:
 * - ALL agents run in PARALLEL using Promise.allSettled()
 * - Results aggregated regardless of individual failures
 * - Confidence-based ranking & consensus detection
 * - Graceful degradation (1-2 agent failures don't crash system)
 */

import {
  ICapatchaSolver,
  SolverResult,
  MultiAgentSolverOptions,
  MultiAgentResult,
} from './types';

/**
 * Multi-Agent CAPTCHA Solver
 * Orchestrates 3 independent solvers and aggregates results
 */
export class MultiAgentSolver {
  private solvers: ICapatchaSolver[] = [];
  private timeout: number;
  private minConfidence: number;
  private parallel: boolean;

  constructor(solvers: ICapatchaSolver[], options: MultiAgentSolverOptions = {}) {
    if (!solvers || solvers.length === 0) {
      throw new Error('At least one solver must be provided');
    }
    this.solvers = solvers;
    this.timeout = options.timeout ?? 30000;
    this.minConfidence = options.minConfidence ?? 0.7;
    this.parallel = options.parallel ?? true;
  }

  /**
   * Solve CAPTCHA using all agents in parallel
   * Returns aggregated results with best solution and consensus info
   */
  async solve(captchaImage: Buffer): Promise<MultiAgentResult> {
    const startTime = Date.now();

    if (!captchaImage || captchaImage.length === 0) {
      throw new Error('Invalid CAPTCHA image: buffer is empty');
    }

    // Execute all solvers in parallel with timeout
    const results = await this.executeParallel(captchaImage);

    // Filter valid results (confidence >= minConfidence)
    const validResults = results.filter((r) => r.confidence >= this.minConfidence);

    if (validResults.length === 0) {
      throw new Error(
        `No solvers succeeded or met minimum confidence (${this.minConfidence}). ` +
        `Raw results: ${JSON.stringify(results)}`
      );
    }

    // Sort by confidence (descending)
    const sortedResults = [...validResults].sort((a, b) => b.confidence - a.confidence);
    const bestResult = sortedResults[0];

    // Detect consensus (2+ agents with same answer)
    const consensus = this.detectConsensus(sortedResults);

    const totalTime = Date.now() - startTime;

    return {
      results,
      bestResult,
      validResults,
      consensus,
      totalTime,
    };
  }

  /**
   * Execute all solvers in parallel with timeout handling
   */
  private async executeParallel(captchaImage: Buffer): Promise<SolverResult[]> {
    // Create promise array with timeout wrappers
    const solverPromises = this.solvers.map((solver) =>
      this.executeWithTimeout(solver, captchaImage)
    );

    // Use Promise.allSettled to get all results (even failed ones)
    const settled = await Promise.allSettled(solverPromises);

    // Convert PromiseSettledResult to SolverResult
    return settled.map((settlement, index) => {
      if (settlement.status === 'fulfilled') {
        return settlement.value;
      } else {
        // Return error result for failed solver
        return {
          answer: '',
          confidence: 0,
          model: this.solvers[index].name,
          time: this.timeout,
          error: settlement.reason?.message || 'Unknown error',
        };
      }
    });
  }

  /**
   * Execute single solver with timeout
   */
  private executeWithTimeout(
    solver: ICapatchaSolver,
    captchaImage: Buffer
  ): Promise<SolverResult> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | null = null;
      let completed = false;

      // Set timeout
      timeoutId = setTimeout(() => {
        completed = true;
        reject(
          new Error(
            `Solver "${solver.name}" exceeded timeout of ${this.timeout}ms`
          )
        );
      }, this.timeout);

      // Execute solver
      solver
        .solve(captchaImage)
        .then((result) => {
          if (!completed) {
            completed = true;
            if (timeoutId) clearTimeout(timeoutId);
            resolve(result);
          }
        })
        .catch((error) => {
          if (!completed) {
            completed = true;
            if (timeoutId) clearTimeout(timeoutId);
            reject(error);
          }
        });
    });
  }

  /**
   * Detect consensus when 2+ agents return same answer
   */
  private detectConsensus(
    results: SolverResult[]
  ): MultiAgentResult['consensus'] | undefined {
    if (results.length < 2) {
      return undefined;
    }

    // Group by answer
    const answerGroups = new Map<string, SolverResult[]>();
    for (const result of results) {
      const answer = result.answer.toLowerCase().trim();
      if (!answerGroups.has(answer)) {
        answerGroups.set(answer, []);
      }
      answerGroups.get(answer)!.push(result);
    }

    // Find answer with 2+ agents
    for (const [answer, agentResults] of answerGroups.entries()) {
      if (agentResults.length >= 2) {
        // Calculate average confidence
        const avgConfidence =
          agentResults.reduce((sum, r) => sum + r.confidence, 0) /
          agentResults.length;

        return {
          answer: agentResults[0].answer, // Use original case from first agent
          agentCount: agentResults.length,
          confidence: avgConfidence,
        };
      }
    }

    return undefined;
  }

  /**
   * Get solver names for debugging
   */
  getSolverNames(): string[] {
    return this.solvers.map((s) => s.name);
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return {
      solverCount: this.solvers.length,
      solverNames: this.getSolverNames(),
      timeout: this.timeout,
      minConfidence: this.minConfidence,
      parallel: this.parallel,
    };
  }
}

/**
 * Factory function to create a pre-configured MultiAgentSolver
 * with all 3 default agents
 */
export async function createDefaultMultiAgentSolver(
  options: MultiAgentSolverOptions = {}
): Promise<MultiAgentSolver> {
  const { createSkyvernSolver } = await import('./skyvern-solver');
  const { createVisionModelSolver } = await import('./vision-model-solver');
  const { createDDDDOCRSolver } = await import('./ddddocr-solver');

  const solvers = [
    createSkyvernSolver(),
    createVisionModelSolver(),
    createDDDDOCRSolver(),
  ];

  return new MultiAgentSolver(solvers, options);
}
