/**
 * Earnings Optimizer
 * - Adjusts priority based on expected value and success rate
 */

export interface EarningsContext {
  baseReward: number; // per CAPTCHA
  successRate: number; // 0-1
  avgLatencyMs: number;
  queueDepth: number;
}

export interface EarningsDecision {
  priority: number;
  throttleMs: number;
  reason: string;
}

export class EarningsOptimizer {
  evaluate(context: EarningsContext): EarningsDecision {
    const expectedValue = context.baseReward * context.successRate;
    const latencyPenalty = Math.min(0.5, context.avgLatencyMs / 60000);
    const queuePenalty = Math.min(0.3, context.queueDepth / 1000);
    const score = expectedValue * (1 - latencyPenalty - queuePenalty);

    if (score >= context.baseReward * 0.8) {
      return { priority: 10, throttleMs: 0, reason: 'High expected value' };
    }
    if (score >= context.baseReward * 0.5) {
      return { priority: 30, throttleMs: 250, reason: 'Moderate expected value' };
    }

    return { priority: 60, throttleMs: 1000, reason: 'Low expected value' };
  }
}

export default EarningsOptimizer;
