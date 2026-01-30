/**
 * Circuit Breaker
 * - Protects against repeated failures
 * - Supports half-open recovery
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  cooldownMs: number;
  successThreshold: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureAt = 0;

  constructor(private readonly options: CircuitBreakerOptions) {}

  async execute<T>(task: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureAt < this.options.cooldownMs) {
        throw new Error('Circuit breaker open');
      }
      this.state = 'half-open';
      this.successes = 0;
    }

    try {
      const result = await task();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  private recordSuccess(): void {
    if (this.state === 'half-open') {
      this.successes += 1;
      if (this.successes >= this.options.successThreshold) {
        this.state = 'closed';
        this.failures = 0;
      }
      return;
    }
    this.failures = 0;
  }

  private recordFailure(): void {
    this.failures += 1;
    this.lastFailureAt = Date.now();
    if (this.failures >= this.options.failureThreshold) {
      this.state = 'open';
    }
  }
}

export default CircuitBreaker;
