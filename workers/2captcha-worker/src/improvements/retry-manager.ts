/**
 * Retry Manager
 * - Exponential backoff with jitter
 * - Error classification
 */

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: number; // 0-1
  shouldRetry?: (error: Error, attempt: number) => boolean;
  onRetry?: (error: Error, attempt: number, delayMs: number) => void;
}

export class RetryManager {
  private readonly options: RetryOptions;

  constructor(options: RetryOptions) {
    this.options = options;
  }

  async execute<T>(task: () => Promise<T>): Promise<T> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < this.options.maxAttempts) {
      try {
        return await task();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt += 1;
        const shouldRetry = this.options.shouldRetry
          ? this.options.shouldRetry(lastError, attempt)
          : true;
        if (!shouldRetry || attempt >= this.options.maxAttempts) {
          break;
        }

        const delayMs = this.getBackoffDelay(attempt);
        if (this.options.onRetry) {
          this.options.onRetry(lastError, attempt, delayMs);
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw lastError ?? new Error('RetryManager failed with unknown error');
  }

  private getBackoffDelay(attempt: number): number {
    const baseDelay = this.options.baseDelayMs * Math.pow(2, attempt - 1);
    const jitter = baseDelay * this.options.jitter * Math.random();
    return Math.min(baseDelay + jitter, this.options.maxDelayMs);
  }
}

export default RetryManager;
