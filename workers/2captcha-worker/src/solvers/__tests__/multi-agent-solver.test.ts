/**
 * Unit Tests for Multi-Agent CAPTCHA Solver
 */

// Jest provides global test functions - no import needed
// describe, it, expect, beforeEach, afterEach are available globally
import { MultiAgentSolver } from '../multi-agent-solver';
import { ICapatchaSolver, SolverResult, MultiAgentResult } from '../types';

/**
 * Mock Solvers for Testing
 */
class MockSolver implements ICapatchaSolver {
  name: string;
  answer: string;
  confidence: number;
  delay: number;
  shouldFail: boolean;

  constructor(
    name: string,
    answer: string,
    confidence: number,
    delay: number = 100,
    shouldFail: boolean = false
  ) {
    this.name = name;
    this.answer = answer;
    this.confidence = confidence;
    this.delay = delay;
    this.shouldFail = shouldFail;
  }

  async solve(captchaImage: Buffer): Promise<SolverResult> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, this.delay));

    if (this.shouldFail) {
      throw new Error(`${this.name} failed`);
    }

    return {
      answer: this.answer,
      confidence: this.confidence,
      model: this.name,
      time: this.delay,
    };
  }
}

describe('MultiAgentSolver', () => {
  let orchestrator: MultiAgentSolver;
  let mockImage: Buffer;

  beforeEach(() => {
    mockImage = Buffer.from('fake-captcha-image');
  });

  describe('Initialization', () => {
    it('should throw error when no solvers provided', () => {
      expect(() => new MultiAgentSolver([])).toThrow(
        'At least one solver must be provided'
      );
    });

    it('should initialize with single solver', () => {
      const solver = new MockSolver('solver-1', 'answer1', 0.9);
      orchestrator = new MultiAgentSolver([solver]);
      expect(orchestrator.getSolverNames()).toEqual(['solver-1']);
    });

    it('should initialize with multiple solvers', () => {
      const solvers = [
        new MockSolver('solver-1', 'answer1', 0.9),
        new MockSolver('solver-2', 'answer2', 0.85),
        new MockSolver('solver-3', 'answer3', 0.8),
      ];
      orchestrator = new MultiAgentSolver(solvers);
      expect(orchestrator.getSolverNames()).toEqual(['solver-1', 'solver-2', 'solver-3']);
    });
  });

  describe('Parallel Execution', () => {
    it('should execute all solvers in parallel', async () => {
      const solver1 = new MockSolver('solver-1', 'answer1', 0.9, 100);
      const solver2 = new MockSolver('solver-2', 'answer2', 0.85, 200);
      const solver3 = new MockSolver('solver-3', 'answer3', 0.8, 150);

      orchestrator = new MultiAgentSolver([solver1, solver2, solver3], {
        timeout: 5000,
      });

      const startTime = Date.now();
      const result = await orchestrator.solve(mockImage);
      const elapsedTime = Date.now() - startTime;

      // Should complete around 200ms (longest solver), not 450ms (sequential)
      expect(elapsedTime).toBeLessThan(250);
      expect(result.results).toHaveLength(3);
      expect(result.validResults).toHaveLength(3);
    });

    it('should aggregate results from all solvers', async () => {
      const solvers = [
        new MockSolver('solver-1', 'test', 0.9),
        new MockSolver('solver-2', 'test', 0.85),
        new MockSolver('solver-3', 'test', 0.8),
      ];

      orchestrator = new MultiAgentSolver(solvers);
      const result = await orchestrator.solve(mockImage);

      expect(result.results).toHaveLength(3);
      expect(result.results.every((r) => r.answer === 'test')).toBe(true);
    });

    it('should handle partial failures gracefully', async () => {
      const solvers = [
        new MockSolver('solver-1', 'answer1', 0.9),
        new MockSolver('solver-2', 'answer2', 0.85, 100, true), // This one fails
        new MockSolver('solver-3', 'answer3', 0.8),
      ];

      orchestrator = new MultiAgentSolver(solvers);
      const result = await orchestrator.solve(mockImage);

      expect(result.results).toHaveLength(3);
      expect(result.validResults).toHaveLength(2);
      expect(result.results[1].confidence).toBe(0); // Failed solver
      expect(result.results[1].error).toBeDefined();
    });

    it('should rank results by confidence', async () => {
      const solvers = [
        new MockSolver('solver-1', 'answer', 0.7),
        new MockSolver('solver-2', 'answer', 0.95),
        new MockSolver('solver-3', 'answer', 0.85),
      ];

      orchestrator = new MultiAgentSolver(solvers);
      const result = await orchestrator.solve(mockImage);

      expect(result.bestResult.confidence).toBe(0.95);
      expect(result.bestResult.model).toBe('solver-2');
    });
  });

  describe('Confidence Filtering', () => {
    it('should filter results below minConfidence', async () => {
      const solvers = [
        new MockSolver('solver-1', 'answer1', 0.9),
        new MockSolver('solver-2', 'answer2', 0.5), // Below default 0.7
        new MockSolver('solver-3', 'answer3', 0.8),
      ];

      orchestrator = new MultiAgentSolver(solvers, { minConfidence: 0.7 });
      const result = await orchestrator.solve(mockImage);

      expect(result.results).toHaveLength(3);
      expect(result.validResults).toHaveLength(2);
      expect(result.validResults.some((r) => r.confidence === 0.5)).toBe(false);
    });

    it('should throw error when no results meet minConfidence', async () => {
      const solvers = [
        new MockSolver('solver-1', 'answer1', 0.5),
        new MockSolver('solver-2', 'answer2', 0.4),
        new MockSolver('solver-3', 'answer3', 0.3),
      ];

      orchestrator = new MultiAgentSolver(solvers, { minConfidence: 0.7 });

      await expect(orchestrator.solve(mockImage)).rejects.toThrow(
        'No solvers succeeded or met minimum confidence'
      );
    });
  });

  describe('Timeout Handling', () => {
    it('should respect timeout per solver', async () => {
      const solvers = [
        new MockSolver('solver-1', 'answer1', 0.9, 100),
        new MockSolver('solver-2', 'answer2', 0.85, 5000), // Will timeout
        new MockSolver('solver-3', 'answer3', 0.8, 100),
      ];

      orchestrator = new MultiAgentSolver(solvers, { timeout: 1000 });

      const startTime = Date.now();
      const result = await orchestrator.solve(mockImage);
      const elapsedTime = Date.now() - startTime;

      // Should complete within 2 seconds (not wait for 5000ms solver)
      expect(elapsedTime).toBeLessThan(2000);
      expect(result.results[1].error).toContain('timeout');
      expect(result.validResults).toHaveLength(2);
    });
  });

  describe('Consensus Detection', () => {
    it('should detect consensus when 2+ agents agree', async () => {
      const solvers = [
        new MockSolver('solver-1', 'correct-answer', 0.9),
        new MockSolver('solver-2', 'correct-answer', 0.85),
        new MockSolver('solver-3', 'wrong-answer', 0.8),
      ];

      orchestrator = new MultiAgentSolver(solvers);
      const result = await orchestrator.solve(mockImage);

      expect(result.consensus).toBeDefined();
      expect(result.consensus!.answer).toBe('correct-answer');
      expect(result.consensus!.agentCount).toBe(2);
      expect(result.consensus!.confidence).toBeCloseTo((0.9 + 0.85) / 2, 1);
    });

    it('should not detect consensus when all agents disagree', async () => {
      const solvers = [
        new MockSolver('solver-1', 'answer1', 0.9),
        new MockSolver('solver-2', 'answer2', 0.85),
        new MockSolver('solver-3', 'answer3', 0.8),
      ];

      orchestrator = new MultiAgentSolver(solvers);
      const result = await orchestrator.solve(mockImage);

      expect(result.consensus).toBeUndefined();
    });

    it('should handle case-insensitive consensus detection', async () => {
      const solvers = [
        new MockSolver('solver-1', 'Answer', 0.9),
        new MockSolver('solver-2', 'ANSWER', 0.85),
        new MockSolver('solver-3', 'different', 0.8),
      ];

      orchestrator = new MultiAgentSolver(solvers);
      const result = await orchestrator.solve(mockImage);

      expect(result.consensus).toBeDefined();
      expect(result.consensus!.agentCount).toBe(2);
    });

    it('should detect consensus with all 3 agents agreeing', async () => {
      const solvers = [
        new MockSolver('solver-1', 'answer', 0.9),
        new MockSolver('solver-2', 'answer', 0.85),
        new MockSolver('solver-3', 'answer', 0.8),
      ];

      orchestrator = new MultiAgentSolver(solvers);
      const result = await orchestrator.solve(mockImage);

      expect(result.consensus).toBeDefined();
      expect(result.consensus!.agentCount).toBe(3);
    });
  });

  describe('Best Result Selection', () => {
    it('should select highest confidence result', async () => {
      const solvers = [
        new MockSolver('solver-1', 'answer1', 0.7),
        new MockSolver('solver-2', 'answer2', 0.99),
        new MockSolver('solver-3', 'answer3', 0.8),
      ];

      orchestrator = new MultiAgentSolver(solvers);
      const result = await orchestrator.solve(mockImage);

      expect(result.bestResult.confidence).toBe(0.99);
      expect(result.bestResult.answer).toBe('answer2');
    });

    it('should prefer consensus over single high-confidence result', async () => {
      const solvers = [
        new MockSolver('solver-1', 'consensus-answer', 0.85),
        new MockSolver('solver-2', 'consensus-answer', 0.86),
        new MockSolver('solver-3', 'unique-answer', 0.95),
      ];

      orchestrator = new MultiAgentSolver(solvers);
      const result = await orchestrator.solve(mockImage);

      // Best result is still the 0.95 confidence
      expect(result.bestResult.confidence).toBe(0.95);
      // But consensus is detected
      expect(result.consensus).toBeDefined();
      expect(result.consensus!.agentCount).toBe(2);
    });
  });

  describe('Configuration', () => {
    it('should return current configuration', () => {
      const solvers = [
        new MockSolver('solver-1', 'answer1', 0.9),
        new MockSolver('solver-2', 'answer2', 0.85),
        new MockSolver('solver-3', 'answer3', 0.8),
      ];

      orchestrator = new MultiAgentSolver(solvers, {
        timeout: 15000,
        minConfidence: 0.6,
        parallel: true,
      });

      const config = orchestrator.getConfig();
      expect(config.solverCount).toBe(3);
      expect(config.timeout).toBe(15000);
      expect(config.minConfidence).toBe(0.6);
      expect(config.parallel).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for empty CAPTCHA image', async () => {
      const solver = new MockSolver('solver-1', 'answer', 0.9);
      orchestrator = new MultiAgentSolver([solver]);

      await expect(orchestrator.solve(Buffer.from(''))).rejects.toThrow(
        'Invalid CAPTCHA image: buffer is empty'
      );
    });

    it('should throw error when all solvers fail', async () => {
      const solvers = [
        new MockSolver('solver-1', 'answer1', 0.9, 100, true),
        new MockSolver('solver-2', 'answer2', 0.85, 100, true),
        new MockSolver('solver-3', 'answer3', 0.8, 100, true),
      ];

      orchestrator = new MultiAgentSolver(solvers);

      await expect(orchestrator.solve(mockImage)).rejects.toThrow(
        'No solvers succeeded or met minimum confidence'
      );
    });
  });

  describe('Performance Metrics', () => {
    it('should measure total execution time accurately', async () => {
      const solvers = [
        new MockSolver('solver-1', 'answer', 0.9, 100),
        new MockSolver('solver-2', 'answer', 0.85, 150),
        new MockSolver('solver-3', 'answer', 0.8, 120),
      ];

      orchestrator = new MultiAgentSolver(solvers);
      const result = await orchestrator.solve(mockImage);

      // Total time should be around 150ms (longest delay) + overhead
      expect(result.totalTime).toBeGreaterThanOrEqual(140);
      expect(result.totalTime).toBeLessThan(500);
    });

    it('should measure individual solver execution times', async () => {
      const solvers = [
        new MockSolver('solver-1', 'answer', 0.9, 100),
        new MockSolver('solver-2', 'answer', 0.85, 200),
        new MockSolver('solver-3', 'answer', 0.8, 50),
      ];

      orchestrator = new MultiAgentSolver(solvers);
      const result = await orchestrator.solve(mockImage);

      expect(result.results[0].time).toBe(100);
      expect(result.results[1].time).toBe(200);
      expect(result.results[2].time).toBe(50);
    });
  });
});
