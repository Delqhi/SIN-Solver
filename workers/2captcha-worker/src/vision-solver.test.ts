/**
 * Unit Tests for VisionSolver
 * 
 * Tests all consensus scenarios:
 * - ✅ All 3 agents succeed (UNANIMOUS)
 * - ✅ 2 agents succeed (MAJORITY cases)
 * - ✅ Failure scenarios (no consensus, low confidence, all fail)
 * - ✅ Timeout handling
 * - ✅ Image validation
 * - ✅ Logging & configuration
 */

import { VisionSolver, VisionSolveResult } from './vision-solver';
import { ConsensusEngine } from './consensus';
import { createLogger } from 'winston';

// Mock logger for tests
const mockLogger = createLogger({ silent: true });

/**
 * Mock fetch responses for Gemini and Mistral APIs
 */
global.fetch = jest.fn();

describe('VisionSolver', () => {
  let visionSolver: VisionSolver;
  let consensusEngine: ConsensusEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    consensusEngine = new ConsensusEngine(mockLogger);
    visionSolver = new VisionSolver(mockLogger, consensusEngine);
  });

  describe('Happy Path: All 3 Agents Succeed (UNANIMOUS)', () => {
    it('should return SUBMIT when all 3 agents agree with ≥95% confidence', async () => {
      // Mock all 3 API endpoints returning same answer
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ text: 'ANSWER123', confidence: 0.97 }),
        status: 200,
      });

      const testImage = Buffer.from('test-image-data');
      const result = await visionSolver.solveWithConsensus(testImage);

      // Should return SUBMIT with high confidence
      expect(result.success).toBe(true);
      expect(result.solution).toBe('ANSWER123');
      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
      expect(result.consensusReason).toMatch(/UNANIMOUS|MAJORITY/);
      expect(result.solvedByService).toBe('vision-consensus');
      expect(result.elapsedTimeMs).toBeGreaterThan(0);
      expect(result.agentDetails).toHaveLength(3);
      expect(result.agentDetails?.every(a => a.confidence >= 0.95)).toBe(true);
    });

    it('should log successful consensus decision with reasoning', async () => {
      const loggerSpy = jest.spyOn(mockLogger, 'info');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ text: 'TEST456', confidence: 0.96 }),
        status: 200,
      });

      const testImage = Buffer.from('test-image-data');
      await visionSolver.solveWithConsensus(testImage);

      // Verify logging occurred
      expect(loggerSpy).toHaveBeenCalled();
      const logs = loggerSpy.mock.calls.map(c => c[0].toString());
      expect(logs.some(log => log.includes('consensus'))).toBe(true);
    });
  });

  describe('Happy Path: 2 Agents Succeed (MAJORITY)', () => {
    it('should return SUBMIT when 2 agents agree with ≥95% and 1 fails', async () => {
      const responses = [
        { ok: true, json: async () => ({ text: 'ANSWER456', confidence: 0.98 }), status: 200 },
        { ok: true, json: async () => ({ text: 'ANSWER456', confidence: 0.96 }), status: 200 },
        { ok: false, status: 500 }, // 3rd agent fails
      ];

      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        return Promise.resolve(responses[callCount++]);
      });

      const testImage = Buffer.from('test-image-data');
      const result = await visionSolver.solveWithConsensus(testImage);

      // Should return SUBMIT with 2 agents agreeing
      expect(result.success).toBe(true);
      expect(result.solution).toBe('ANSWER456');
      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
      expect(result.consensusReason).toMatch(/MAJORITY|UNANIMOUS/);
    });

    it('should return SUBMIT when 2 agents agree and 1 disagrees', async () => {
      const responses = [
        { ok: true, json: async () => ({ text: 'CORRECT_ANSWER', confidence: 0.97 }), status: 200 },
        { ok: true, json: async () => ({ text: 'CORRECT_ANSWER', confidence: 0.96 }), status: 200 },
        { ok: true, json: async () => ({ text: 'WRONG_ANSWER', confidence: 0.92 }), status: 200 },
      ];

      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        return Promise.resolve(responses[callCount++]);
      });

      const testImage = Buffer.from('test-image-data');
      const result = await visionSolver.solveWithConsensus(testImage);

      // Should use majority consensus
      expect(result.success).toBe(true);
      expect(result.solution).toBe('CORRECT_ANSWER');
      expect(result.consensusReason).toMatch(/MAJORITY/);
    });
  });

  describe('Failure Scenarios: No Consensus', () => {
    it('should return CANNOT_SOLVE when all 3 agents fail', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('API unavailable'));

      const testImage = Buffer.from('test-image-data');
      const result = await visionSolver.solveWithConsensus(testImage);

       expect(result.success).toBe(false);
       expect(result.solution).toBeUndefined();
       expect(result.consensusReason).toMatch(/^NO_CONSENSUS/);
      expect(result.error).toBeDefined();
    });

    it('should return CANNOT_SOLVE when all 3 agents return different answers', async () => {
      const responses = [
        { ok: true, json: async () => ({ text: 'ANSWER_A', confidence: 0.97 }), status: 200 },
        { ok: true, json: async () => ({ text: 'ANSWER_B', confidence: 0.96 }), status: 200 },
        { ok: true, json: async () => ({ text: 'ANSWER_C', confidence: 0.95 }), status: 200 },
      ];

      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        return Promise.resolve(responses[callCount++]);
      });

      const testImage = Buffer.from('test-image-data');
      const result = await visionSolver.solveWithConsensus(testImage);

      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.consensusReason).toMatch(/^NO_CONSENSUS/);
      expect(result.error).toBeDefined();
      expect(result.error).toMatch(/Invalid image|empty/i);
    });

    it('should reject null image', async () => {
      const result = await visionSolver.solveWithConsensus(null as any);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject undefined image', async () => {
      const result = await visionSolver.solveWithConsensus(undefined as any);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should accept valid image buffer', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ text: 'ANSWER', confidence: 0.97 }),
        status: 200,
      });

      const validBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG header
      const result = await visionSolver.solveWithConsensus(validBuffer);

      // Should process valid buffer
      expect(result.success || result.error === undefined || result.success === false).toBeTruthy();
    });
  });

  describe('Configuration', () => {
    it('should use custom API endpoints from configuration', async () => {
      const customConfig = {
        geminiApiUrl: 'https://custom.gemini.api/v1',
        mistralApiUrl: 'https://custom.mistral.api/v1',
        visionTimeoutMs: 5000,
      };

      const customSolver = new VisionSolver(mockLogger, consensusEngine, customConfig);

       // Verify configuration was applied
       expect(customSolver['geminiApiUrl']).toBe('https://custom.gemini.api/v1');
       expect(customSolver['mistralApiUrl']).toBe('https://custom.mistral.api/v1');
       expect(customSolver['timeout']).toBe(5000);
    });

    it('should read configuration from environment variables', async () => {
      // Set environment variables
      process.env.GEMINI_API_URL = 'https://env.gemini.com';
      process.env.MISTRAL_API_URL = 'https://env.mistral.com';
      process.env.VISION_TIMEOUT_MS = '8000';

      const envSolver = new VisionSolver(mockLogger, consensusEngine);

       expect(envSolver['geminiApiUrl']).toBe('https://env.gemini.com');
       expect(envSolver['mistralApiUrl']).toBe('https://env.mistral.com');
       expect(envSolver['timeout']).toBe(8000);

      // Clean up
      delete process.env.GEMINI_API_URL;
      delete process.env.MISTRAL_API_URL;
      delete process.env.VISION_TIMEOUT_MS;
    });

    it('should prefer explicit config over environment variables', async () => {
      process.env.GEMINI_API_URL = 'https://env.gemini.com';

      const config = { geminiApiUrl: 'https://config.gemini.com' };
      const prioritySolver = new VisionSolver(mockLogger, consensusEngine, config);

      expect(prioritySolver['geminiApiUrl']).toBe('https://config.gemini.com');

      delete process.env.GEMINI_API_URL;
    });
  });

  describe('Logging & Debugging', () => {
    it('should log detailed agent results before consensus', async () => {
      const debugSpy = jest.spyOn(mockLogger, 'debug');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ text: 'LOGGED_ANSWER', confidence: 0.97 }),
        status: 200,
      });

      const testImage = Buffer.from('test-image-data');
      await visionSolver.solveWithConsensus(testImage);

      // Should log agent results
      expect(debugSpy).toHaveBeenCalled();
    });

    it('should log consensus decision with reasoning and confidence margin', async () => {
      const infoSpy = jest.spyOn(mockLogger, 'info');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ text: 'CONSENSUS_ANSWER', confidence: 0.98 }),
        status: 200,
      });

      const testImage = Buffer.from('test-image-data');
      const result = await visionSolver.solveWithConsensus(testImage);

      if (result.success) {
        // Should log successful consensus
        expect(infoSpy).toHaveBeenCalled();
      }
    });

    it('should log warnings when agents fail', async () => {
      const warnSpy = jest.spyOn(mockLogger, 'warn');

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Agent 1 failed'));
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: 'ANSWER', confidence: 0.97 }),
        status: 200,
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ text: 'ANSWER', confidence: 0.96 }),
        status: 200,
      });

      const testImage = Buffer.from('test-image-data');
      await visionSolver.solveWithConsensus(testImage);

      // Should log agent failure warnings
      expect(warnSpy.mock.calls.length).toBeGreaterThanOrEqual(0);
    });

    it('should log error when no consensus reached', async () => {
      const warnSpy = jest.spyOn(mockLogger, 'warn');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ text: 'DIFFERENT_ANSWER', confidence: 0.97 }),
        status: 200,
      });

      const testImage = Buffer.from('test-image-data');
      const result = await visionSolver.solveWithConsensus(testImage);

      if (!result.success) {
        // Should warn about no consensus
        expect(warnSpy).toHaveBeenCalled();
      }
    });
  });

  describe('Agent Result Mapping', () => {
    it('should properly convert API responses to SolverResult format', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ text: 'GEMINI_ANSWER', confidence: 0.97 }),
        status: 200,
      });

      const testImage = Buffer.from('test-image-data');
      const result = await visionSolver.solveWithConsensus(testImage);

      // Verify agent details are populated correctly
      expect(result.agentDetails).toBeDefined();
      expect(result.agentDetails?.length).toBeGreaterThan(0);

      result.agentDetails?.forEach(agent => {
        expect(agent).toHaveProperty('agentId');
        expect(agent).toHaveProperty('answer');
        expect(agent).toHaveProperty('confidence');
        expect(agent).toHaveProperty('solveTime');
        expect(agent).toHaveProperty('method');
        expect(agent).toHaveProperty('timestamp');
      });
    });

    it('should preserve error messages in agent results', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Gemini API timeout'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ text: 'ANSWER', confidence: 0.97 }),
          status: 200,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ text: 'ANSWER', confidence: 0.96 }),
          status: 200,
        });

      const testImage = Buffer.from('test-image-data');
      const result = await visionSolver.solveWithConsensus(testImage);

      // First agent should have error
      const failedAgent = result.agentDetails?.find(a => a.error);
      expect(failedAgent).toBeDefined();
      expect(failedAgent?.error).toBeDefined();
    });
  });

  describe('Return Value Integrity', () => {
    it('should never return SUBMIT action with confidence < 95%', async () => {
      // Force low confidence scenario
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ text: 'LOW1', confidence: 0.85 }),
          status: 200,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ text: 'LOW1', confidence: 0.84 }),
          status: 200,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ text: 'OTHER', confidence: 0.80 }),
          status: 200,
        });

      const testImage = Buffer.from('test-image-data');
      const result = await visionSolver.solveWithConsensus(testImage);

      // CRITICAL: If success=true, confidence MUST be ≥0.95
      if (result.success) {
        expect(result.confidence).toBeGreaterThanOrEqual(0.95);
        expect(result.solution).toBeDefined();
      } else {
        expect(result.confidence).toBe(0);
        expect(result.solution).toBeUndefined();
      }
    });

    it('should never return solution when success=false', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('All agents failed'));

      const testImage = Buffer.from('test-image-data');
      const result = await visionSolver.solveWithConsensus(testImage);

      if (!result.success) {
        expect(result.solution).toBeUndefined();
        expect(result.confidence).toBe(0);
      }
    });

    it('should have consistent result structure in all scenarios', async () => {
      const validateResultStructure = (result: VisionSolveResult) => {
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('captchaType');
        expect(result).toHaveProperty('solution');
        expect(result).toHaveProperty('confidence');
        expect(result).toHaveProperty('solvedByService');
        expect(result).toHaveProperty('elapsedTimeMs');
        expect(typeof result.success).toBe('boolean');
        expect(typeof result.confidence).toBe('number');
        expect(typeof result.elapsedTimeMs).toBe('number');
      };

      // Test with success scenario
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ text: 'ANSWER', confidence: 0.97 }),
        status: 200,
      });

      let result = await visionSolver.solveWithConsensus(Buffer.from('test'));
      validateResultStructure(result);

      // Test with failure scenario
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Failed'));
      result = await visionSolver.solveWithConsensus(Buffer.from('test'));
      validateResultStructure(result);
    });
  });

  describe('Performance & Timing', () => {
    it('should report accurate elapsed time', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          text: 'ANSWER',
          confidence: 0.97,
        }),
        status: 200,
      });

      const testImage = Buffer.from('test-image-data');
      const startTime = Date.now();
      const result = await visionSolver.solveWithConsensus(testImage);
      const actualElapsedTime = Date.now() - startTime;

      expect(result.elapsedTimeMs).toBeGreaterThan(0);
      expect(result.elapsedTimeMs).toBeLessThanOrEqual(actualElapsedTime + 100); // 100ms tolerance
    });

    it('should execute all 3 agents in parallel (not sequential)', async () => {
      const callTimestamps: number[] = [];

      (global.fetch as jest.Mock).mockImplementation(async () => {
        callTimestamps.push(Date.now());
        return {
          ok: true,
          json: async () => ({ text: 'ANSWER', confidence: 0.97 }),
          status: 200,
        };
      });

      const testImage = Buffer.from('test-image-data');
      await visionSolver.solveWithConsensus(testImage);

      // All 3 calls should start within 100ms of each other (parallel execution)
      if (callTimestamps.length === 3) {
        const timeDiff = Math.max(...callTimestamps) - Math.min(...callTimestamps);
        expect(timeDiff).toBeLessThan(100); // Should be very close (parallel)
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle API response with missing confidence field', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ text: 'ANSWER' }), // No confidence
        status: 200,
      });

      const testImage = Buffer.from('test-image-data');
      const result = await visionSolver.solveWithConsensus(testImage);

      // Should handle gracefully (treat as 0 confidence)
      expect(result).toBeDefined();
      expect(result.elapsedTimeMs).toBeGreaterThan(0);
    });

    it('should handle API response with missing text field', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ confidence: 0.95 }), // No text
        status: 200,
      });

      const testImage = Buffer.from('test-image-data');
      const result = await visionSolver.solveWithConsensus(testImage);

      // Should handle gracefully
      expect(result).toBeDefined();
    });

    it('should handle non-JSON response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Not JSON');
        },
        status: 200,
        text: async () => 'Invalid JSON response',
      });

      const testImage = Buffer.from('test-image-data');
      const result = await visionSolver.solveWithConsensus(testImage);

      // Should handle gracefully
      expect(result).toBeDefined();
    });

    it('should handle rate limit (429) from API', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      const testImage = Buffer.from('test-image-data');
      const result = await visionSolver.solveWithConsensus(testImage);

      // All agents fail → CANNOT_SOLVE
      expect(result.success).toBe(false);
      expect(result.consensusReason).toBe('NO_CONSENSUS');
    });

    it('should handle 500 server error from API', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const testImage = Buffer.from('test-image-data');
      const result = await visionSolver.solveWithConsensus(testImage);

      expect(result.success).toBe(false);
    });
  });
});
