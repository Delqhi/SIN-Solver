/**
 * Unit tests for Consensus Engine
 * Tests all 3 consensus rules and validation
 */

import { ConsensusEngine, SolverResult, validateDecision } from './consensus';
import { createLogger } from 'winston';

// Mock logger for tests
const mockLogger = createLogger({ silent: true });

describe('ConsensusEngine', () => {
  let engine: ConsensusEngine;

  beforeEach(() => {
    engine = new ConsensusEngine(mockLogger);
  });

  describe('RULE 1: Unanimous Consensus (3/3 agree)', () => {
    it('should submit when all 3 agents agree with 95%+ confidence', () => {
      const results: SolverResult[] = [
        {
          agentId: 'agent-A',
          answer: 'CAPTCHA123',
          confidence: 0.98,
          solveTime: 150,
          method: 'yolo',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-B',
          answer: 'CAPTCHA123',
          confidence: 0.97,
          solveTime: 180,
          method: 'ddddocr',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-C',
          answer: 'CAPTCHA123',
          confidence: 0.96,
          solveTime: 200,
          method: 'whisper',
          timestamp: new Date(),
        },
      ];

      const decision = engine.compareAnswers(results);

      expect(decision.action).toBe('SUBMIT');
      expect(decision.reason).toBe('UNANIMOUS');
      expect(decision.answer).toBe('CAPTCHA123');
      expect(decision.confidence).toBe(0.96); // Minimum of 3
      expect(decision.submissionSafety.meetsThreshold).toBe(true);
      expect(decision.submissionSafety.marginAboveThreshold).toBeGreaterThan(0);
    });

    it('should REJECT unanimous decision if ANY agent below 95%', () => {
      const results: SolverResult[] = [
        {
          agentId: 'agent-A',
          answer: 'ABC123',
          confidence: 0.98,
          solveTime: 150,
          method: 'yolo',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-B',
          answer: 'ABC123',
          confidence: 0.94, // BELOW THRESHOLD!
          solveTime: 180,
          method: 'ddddocr',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-C',
          answer: 'ABC123',
          confidence: 0.97,
          solveTime: 200,
          method: 'whisper',
          timestamp: new Date(),
        },
      ];

      const decision = engine.compareAnswers(results);

      expect(decision.action).toBe('CANNOT_SOLVE');
      expect(decision.reason).toBe('NO_CONSENSUS');
      expect(decision.answer).toBeNull();
    });

    it('should REJECT if answers differ despite high confidence', () => {
      const results: SolverResult[] = [
        {
          agentId: 'agent-A',
          answer: 'ANSWER1',
          confidence: 0.99,
          solveTime: 150,
          method: 'yolo',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-B',
          answer: 'ANSWER2', // Different answer!
          confidence: 0.98,
          solveTime: 180,
          method: 'ddddocr',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-C',
          answer: 'ANSWER3', // Different answer!
          confidence: 0.97,
          solveTime: 200,
          method: 'whisper',
          timestamp: new Date(),
        },
      ];

      const decision = engine.compareAnswers(results);

      expect(decision.action).toBe('CANNOT_SOLVE');
      expect(decision.reason).toBe('NO_CONSENSUS');
    });
  });

  describe('RULE 2: Majority Consensus (2/3 agree)', () => {
    it('should submit when A-B agree with 95%+ confidence', () => {
      const results: SolverResult[] = [
        {
          agentId: 'agent-A',
          answer: 'XYZ789',
          confidence: 0.97,
          solveTime: 150,
          method: 'yolo',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-B',
          answer: 'XYZ789',
          confidence: 0.96,
          solveTime: 180,
          method: 'ddddocr',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-C',
          answer: 'WRONG456',
          confidence: 0.85, // Disagrees and lower confidence
          solveTime: 200,
          method: 'whisper',
          timestamp: new Date(),
        },
      ];

      const decision = engine.compareAnswers(results);

      expect(decision.action).toBe('SUBMIT');
      expect(decision.reason).toBe('MAJORITY_AB');
      expect(decision.answer).toBe('XYZ789');
      expect(decision.confidence).toBe(0.96); // Min of A and B
    });

    it('should submit when A-C agree with 95%+ confidence', () => {
      const results: SolverResult[] = [
        {
          agentId: 'agent-A',
          answer: 'CORRECT',
          confidence: 0.98,
          solveTime: 150,
          method: 'yolo',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-B',
          answer: 'WRONG',
          confidence: 0.80,
          solveTime: 180,
          method: 'ddddocr',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-C',
          answer: 'CORRECT',
          confidence: 0.96,
          solveTime: 200,
          method: 'whisper',
          timestamp: new Date(),
        },
      ];

      const decision = engine.compareAnswers(results);

      expect(decision.action).toBe('SUBMIT');
      expect(decision.reason).toBe('MAJORITY_AC');
      expect(decision.answer).toBe('CORRECT');
    });

    it('should submit when B-C agree with 95%+ confidence', () => {
      const results: SolverResult[] = [
        {
          agentId: 'agent-A',
          answer: 'NOPE',
          confidence: 0.70,
          solveTime: 150,
          method: 'yolo',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-B',
          answer: 'YES123',
          confidence: 0.97,
          solveTime: 180,
          method: 'ddddocr',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-C',
          answer: 'YES123',
          confidence: 0.95,
          solveTime: 200,
          method: 'whisper',
          timestamp: new Date(),
        },
      ];

      const decision = engine.compareAnswers(results);

      expect(decision.action).toBe('SUBMIT');
      expect(decision.reason).toBe('MAJORITY_BC');
      expect(decision.answer).toBe('YES123');
    });

    it('should REJECT majority if either agent below 95%', () => {
      const results: SolverResult[] = [
        {
          agentId: 'agent-A',
          answer: 'MATCH',
          confidence: 0.94, // Just below threshold!
          solveTime: 150,
          method: 'yolo',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-B',
          answer: 'MATCH',
          confidence: 0.98,
          solveTime: 180,
          method: 'ddddocr',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-C',
          answer: 'NOPE',
          confidence: 0.80,
          solveTime: 200,
          method: 'whisper',
          timestamp: new Date(),
        },
      ];

      const decision = engine.compareAnswers(results);

      expect(decision.action).toBe('CANNOT_SOLVE');
      expect(decision.reason).toBe('NO_CONSENSUS');
      expect(decision.confidence).toBe(0);
    });
  });

  describe('RULE 3: No Consensus', () => {
    it('should reject when all 3 agents have different answers', () => {
      const results: SolverResult[] = [
        {
          agentId: 'agent-A',
          answer: 'FIRST',
          confidence: 0.99,
          solveTime: 150,
          method: 'yolo',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-B',
          answer: 'SECOND',
          confidence: 0.98,
          solveTime: 180,
          method: 'ddddocr',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-C',
          answer: 'THIRD',
          confidence: 0.97,
          solveTime: 200,
          method: 'whisper',
          timestamp: new Date(),
        },
      ];

      const decision = engine.compareAnswers(results);

      expect(decision.action).toBe('CANNOT_SOLVE');
      expect(decision.reason).toBe('NO_CONSENSUS');
      expect(decision.answer).toBeNull();
      expect(decision.confidence).toBe(0);
    });

    it('should reject when no pair meets 95% threshold', () => {
      const results: SolverResult[] = [
        {
          agentId: 'agent-A',
          answer: 'TRY1',
          confidence: 0.80,
          solveTime: 150,
          method: 'yolo',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-B',
          answer: 'TRY2',
          confidence: 0.75,
          solveTime: 180,
          method: 'ddddocr',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-C',
          answer: 'TRY3',
          confidence: 0.85,
          solveTime: 200,
          method: 'whisper',
          timestamp: new Date(),
        },
      ];

      const decision = engine.compareAnswers(results);

      expect(decision.action).toBe('CANNOT_SOLVE');
      expect(decision.reason).toBe('NO_CONSENSUS');
    });

    it('should include all agent results in no-consensus decision', () => {
      const results: SolverResult[] = [
        {
          agentId: 'agent-A',
          answer: 'A',
          confidence: 0.99,
          solveTime: 150,
          method: 'yolo',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-B',
          answer: 'B',
          confidence: 0.98,
          solveTime: 180,
          method: 'ddddocr',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-C',
          answer: 'C',
          confidence: 0.97,
          solveTime: 200,
          method: 'whisper',
          timestamp: new Date(),
        },
      ];

      const decision = engine.compareAnswers(results);

      expect(decision.agentResults).toHaveLength(3);
      expect(decision.agentResults).toContainEqual(expect.objectContaining({ agentId: 'agent-A' }));
    });
  });

  describe('Validation', () => {
    it('should validate SUBMIT decision correctly', () => {
      const decision = {
        action: 'SUBMIT' as const,
        answer: 'VALID123',
        confidence: 0.96,
        reason: 'UNANIMOUS' as const,
        agentResults: [],
        votingPattern: 'all agree',
        submissionSafety: {
          meetsThreshold: true,
          threshold: 0.95,
          marginAboveThreshold: 1.0,
        },
      };

      const result = validateDecision(decision);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject SUBMIT with null answer', () => {
      const decision = {
        action: 'SUBMIT' as const,
        answer: null,
        confidence: 0.96,
        reason: 'UNANIMOUS' as const,
        agentResults: [],
        votingPattern: 'all agree',
        submissionSafety: {
          meetsThreshold: true,
          threshold: 0.95,
          marginAboveThreshold: 1.0,
        },
      };

      const result = validateDecision(decision);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('SUBMIT action requires a non-null answer');
    });

    it('should reject SUBMIT with confidence below 95%', () => {
      const decision = {
        action: 'SUBMIT' as const,
        answer: 'TEST',
        confidence: 0.94,
        reason: 'UNANIMOUS' as const,
        agentResults: [],
        votingPattern: 'all agree',
        submissionSafety: {
          meetsThreshold: false,
          threshold: 0.95,
          marginAboveThreshold: -1.0,
        },
      };

      const result = validateDecision(decision);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('is below 95% threshold')
        ])
      );
    });

    it('should validate CANNOT_SOLVE decision correctly', () => {
      const decision = {
        action: 'CANNOT_SOLVE' as const,
        answer: null,
        confidence: 0,
        reason: 'NO_CONSENSUS' as const,
        agentResults: [],
        votingPattern: 'disagreement',
        submissionSafety: {
          meetsThreshold: false,
          threshold: 0.95,
          marginAboveThreshold: 0,
        },
      };

      const result = validateDecision(decision);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Statistics & History', () => {
    it('should track decision history', () => {
      const results1: SolverResult[] = [
        {
          agentId: 'agent-A',
          answer: 'TEST1',
          confidence: 0.99,
          solveTime: 150,
          method: 'yolo',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-B',
          answer: 'TEST1',
          confidence: 0.98,
          solveTime: 180,
          method: 'ddddocr',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-C',
          answer: 'TEST1',
          confidence: 0.97,
          solveTime: 200,
          method: 'whisper',
          timestamp: new Date(),
        },
      ];

      const results2: SolverResult[] = [
        {
          agentId: 'agent-A',
          answer: 'X',
          confidence: 0.85,
          solveTime: 150,
          method: 'yolo',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-B',
          answer: 'Y',
          confidence: 0.80,
          solveTime: 180,
          method: 'ddddocr',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-C',
          answer: 'Z',
          confidence: 0.75,
          solveTime: 200,
          method: 'whisper',
          timestamp: new Date(),
        },
      ];

      engine.compareAnswers(results1);
      engine.compareAnswers(results2);

      const history = engine.getHistory();

      expect(history).toHaveLength(2);
      expect(history[0].action).toBe('SUBMIT');
      expect(history[1].action).toBe('CANNOT_SOLVE');
    });

    it('should calculate statistics correctly', () => {
      // Add one successful decision
      const successResults: SolverResult[] = [
        {
          agentId: 'agent-A',
          answer: 'OK',
          confidence: 0.98,
          solveTime: 150,
          method: 'yolo',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-B',
          answer: 'OK',
          confidence: 0.97,
          solveTime: 180,
          method: 'ddddocr',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-C',
          answer: 'OK',
          confidence: 0.96,
          solveTime: 200,
          method: 'whisper',
          timestamp: new Date(),
        },
      ];

      // Add one failed decision
      const failResults: SolverResult[] = [
        {
          agentId: 'agent-A',
          answer: 'NO1',
          confidence: 0.50,
          solveTime: 150,
          method: 'yolo',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-B',
          answer: 'NO2',
          confidence: 0.50,
          solveTime: 180,
          method: 'ddddocr',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-C',
          answer: 'NO3',
          confidence: 0.50,
          solveTime: 200,
          method: 'whisper',
          timestamp: new Date(),
        },
      ];

      engine.compareAnswers(successResults);
      engine.compareAnswers(failResults);

      const stats = engine.getStatistics();

      expect(stats.totalDecisions).toBe(2);
      expect(stats.submitted).toBe(1);
      expect(stats.rejected).toBe(1);
      expect(stats.rejectionRate).toBe(50);
      expect(stats.unanimousRate).toBe(50);
      expect(stats.averageConfidence).toBe(0.96); // Min confidence from successful
    });
  });

  describe('Edge Cases', () => {
    it('should throw error if not exactly 3 results', () => {
      const results: SolverResult[] = [
        {
          agentId: 'agent-A',
          answer: 'TEST',
          confidence: 0.99,
          solveTime: 150,
          method: 'yolo',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-B',
          answer: 'TEST',
          confidence: 0.98,
          solveTime: 180,
          method: 'ddddocr',
          timestamp: new Date(),
        },
      ];

      expect(() => engine.compareAnswers(results as any)).toThrow();
    });

    it('should handle confidence exactly at 95% threshold', () => {
      const results: SolverResult[] = [
        {
          agentId: 'agent-A',
          answer: 'EDGE',
          confidence: 0.95, // Exactly at threshold
          solveTime: 150,
          method: 'yolo',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-B',
          answer: 'EDGE',
          confidence: 0.95, // Exactly at threshold
          solveTime: 180,
          method: 'ddddocr',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-C',
          answer: 'NOPE',
          confidence: 0.50,
          solveTime: 200,
          method: 'whisper',
          timestamp: new Date(),
        },
      ];

      const decision = engine.compareAnswers(results);

      expect(decision.action).toBe('SUBMIT'); // 95% is acceptable
      expect(decision.reason).toBe('MAJORITY_AB');
    });

    it('should clear history correctly', () => {
      const results: SolverResult[] = [
        {
          agentId: 'agent-A',
          answer: 'TEST',
          confidence: 0.99,
          solveTime: 150,
          method: 'yolo',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-B',
          answer: 'TEST',
          confidence: 0.98,
          solveTime: 180,
          method: 'ddddocr',
          timestamp: new Date(),
        },
        {
          agentId: 'agent-C',
          answer: 'TEST',
          confidence: 0.97,
          solveTime: 200,
          method: 'whisper',
          timestamp: new Date(),
        },
      ];

      engine.compareAnswers(results);
      expect(engine.getHistory()).toHaveLength(1);

      engine.clearHistory();
      expect(engine.getHistory()).toHaveLength(0);

      const stats = engine.getStatistics();
      expect(stats.totalDecisions).toBe(0);
    });
  });
});
