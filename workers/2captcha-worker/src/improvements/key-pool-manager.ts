/**
 * Key Pool Manager
 * - Manages multiple API keys for Groq with Mistral fallback
 * - Tracks per-key request metrics
 * - Rotates keys on rate limits
 * - Performs per-key health checks
 */
// NOTE: legacy API compatibility appended for rotation-system tests.

import RetryManager, { RetryOptions } from './retry-manager';
import { createCategoryLogger, LogCategory } from '../logger';

export type KeyRotationStrategy = 'round-robin' | 'least-used' | 'random' | 'lowest-error-rate';

export interface KeyMetrics {
  keyId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitCount: number;
  consecutiveErrors: number;
  lastUsedAt?: string;
  lastErrorAt?: string;
  lastErrorMessage?: string;
  rateLimitedUntil?: string;
  lastHealthCheckAt?: string;
  healthy: boolean;
}

export interface KeyPoolConfig {
  provider: 'groq' | 'mistral' | string;
  keys: string[];
  fallbackKey?: string;
  rotationStrategy?: KeyRotationStrategy;
  rateLimitCooldownMs?: number;
  maxRequestsPerKey?: number;
  maxConsecutiveErrors?: number;
  retryOnRateLimit?: RetryOptions;
  healthCheck?: (key: string) => Promise<boolean>;
}

interface KeyEntry {
  keyId: string;
  value: string;
  metrics: KeyMetrics;
}

class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export type LegacyRotationReason = 'available' | 'limit' | 'error' | 'fallback';

export interface LegacyKeyRotationDecision {
  provider: string;
  apiKey: string | null;
  reason: LegacyRotationReason;
}

export interface LegacyKeyPoolOptions {
  maxRequestsPerKey: number;
  cooldownMs: number;
  primaryProvider: string;
  fallbackProvider: string;
}

export class KeyPoolManager {
  private readonly provider: string;
  private readonly entries: KeyEntry[];
  private readonly fallbackKey?: string;
  private readonly rotationStrategy: KeyRotationStrategy;
  private readonly rateLimitCooldownMs: number;
  private readonly maxRequestsPerKey?: number;
  private readonly maxConsecutiveErrors: number;
  private readonly retryManager: RetryManager;
  private readonly healthCheck?: (key: string) => Promise<boolean>;
  private currentIndex = 0;
  private readonly logger = createCategoryLogger(LogCategory.SOLVER);

  constructor(config: KeyPoolConfig);
  constructor(apiKeys: string[], legacyOptions: LegacyKeyPoolOptions);
  constructor(configOrKeys: KeyPoolConfig | string[], legacyOptions?: LegacyKeyPoolOptions) {
    const config = Array.isArray(configOrKeys)
      ? {
          provider: legacyOptions?.primaryProvider ?? 'groq',
          keys: configOrKeys,
          fallbackKey: legacyOptions?.fallbackProvider,
          rotationStrategy: 'round-robin' as const,
          maxRequestsPerKey: legacyOptions?.maxRequestsPerKey,
          rateLimitCooldownMs: legacyOptions?.cooldownMs,
        }
      : configOrKeys;

    if (!config.keys.length) {
      throw new Error('KeyPoolManager requires at least one API key');
    }

    this.provider = config.provider;
    this.fallbackKey = config.fallbackKey;
    this.rotationStrategy = config.rotationStrategy ?? 'round-robin';
    this.rateLimitCooldownMs = config.rateLimitCooldownMs ?? 60_000;
    this.maxRequestsPerKey = config.maxRequestsPerKey;
    this.maxConsecutiveErrors = config.maxConsecutiveErrors ?? 3;
    this.entries = config.keys.map((key, index) => this.createEntry(key, index));
    this.healthCheck = config.healthCheck;

    const retryOptions: RetryOptions = config.retryOnRateLimit ?? {
      maxAttempts: 3,
      baseDelayMs: 1_000,
      maxDelayMs: 10_000,
      jitter: 0.2,
      shouldRetry: (error) => error.name === 'RateLimitError',
      onRetry: (error, attempt, delayMs) => {
        this.logger.warn('Rate limit retry scheduled', {
          provider: this.provider,
          attempt,
          delayMs,
          error: error.message,
        });
      },
    };

    this.retryManager = new RetryManager(retryOptions);
  }

  /**
   * Legacy API: Select the active key synchronously.
   */
  getActiveKey(now: number = Date.now()): LegacyKeyRotationDecision {
    // Legacy path retained for existing callers/tests.
    const available = this.getAvailableEntriesAt(now);
    if (!available.length) {
      return { provider: this.fallbackKey ? 'mistral' : this.provider, apiKey: null, reason: 'fallback' };
    }

    const selected = this.selectEntry(available);
    this.markRequest(selected);
    return {
      provider: this.provider,
      apiKey: selected.value,
      reason: 'available',
    };
  }

  /**
   * Legacy API: Record a successful request.
   */
  recordSuccess(apiKey: string, now: number = Date.now()): void {
    const entry = this.findEntry(apiKey);
    if (!entry) {
      return;
    }

    entry.metrics.totalRequests += 1;
    entry.metrics.successfulRequests += 1;
    entry.metrics.lastUsedAt = new Date(now).toISOString();

    if (this.maxRequestsPerKey !== undefined && entry.metrics.totalRequests >= this.maxRequestsPerKey) {
      entry.metrics.totalRequests = 0;
      this.rotateKey('limit');
    }
  }

  /**
   * Legacy API: Record a failed request with cooldown.
   */
  recordFailure(apiKey: string, errorCode?: number, now: number = Date.now()): void {
    const entry = this.findEntry(apiKey);
    if (!entry) {
      return;
    }

    const cooldownMs = errorCode === 429 ? this.rateLimitCooldownMs : this.rateLimitCooldownMs / 2;
    entry.metrics.failedRequests += 1;
    entry.metrics.consecutiveErrors += 1;
    entry.metrics.lastErrorAt = new Date(now).toISOString();
    entry.metrics.lastErrorMessage = errorCode ? `HTTP ${errorCode}` : 'error';
    entry.metrics.rateLimitedUntil = new Date(now + cooldownMs).toISOString();

    this.rotateKey('error');
  }

  /**
   * Select the next available key based on rotation strategy.
   */
  async getNextKey(): Promise<string> {
    return this.retryManager.execute(async () => {
      const available = this.getAvailableEntries();
      if (!available.length) {
        const nextWindowMs = this.getNextAvailabilityWindowMs();
        throw new RateLimitError(
          `All ${this.provider} keys are rate limited. Next window in ${nextWindowMs}ms.`
        );
      }

      const selected = this.selectEntry(available);
      this.markRequest(selected);
      return selected.value;
    });
  }

  /**
   * Mark a key as exhausted due to rate limiting or quota exhaustion.
   */
  markKeyExhausted(key: string, reason: string, retryAfterMs?: number): void {
    const entry = this.findEntry(key);
    if (!entry) {
      return;
    }

    const cooldownMs = retryAfterMs ?? this.rateLimitCooldownMs;
    entry.metrics.rateLimitCount += 1;
    entry.metrics.consecutiveErrors += 1;
    entry.metrics.lastErrorAt = new Date().toISOString();
    entry.metrics.lastErrorMessage = reason;
    entry.metrics.rateLimitedUntil = new Date(Date.now() + cooldownMs).toISOString();

    this.logger.warn('API key rate limited - rotating', {
      provider: this.provider,
      keyId: entry.keyId,
      reason,
      cooldownMs,
    });

    this.rotateKey('rate-limit');
  }

  /**
   * Rotate to the next key (round-robin) and log the rotation event.
   */
  rotateKey(reason: string): void {
    const previous = this.entries[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.entries.length;
    const next = this.entries[this.currentIndex];

    this.logger.info('Key rotation executed', {
      provider: this.provider,
      reason,
      fromKeyId: previous?.keyId,
      toKeyId: next?.keyId,
    });
  }

  /**
   * Return the configured fallback key (e.g., Mistral) if present.
   */
  getFallbackKey(): string | null {
    return this.fallbackKey ?? null;
  }

  /**
   * Run health checks for each key using the provided healthCheck callback.
   */
  async runHealthChecks(): Promise<KeyMetrics[]> {
    if (!this.entries.length) {
      return [];
    }

    const runCheck = this.healthCheck ?? (async () => true);

    await Promise.all(
      this.entries.map(async (entry) => {
        const start = Date.now();
        try {
          const healthy = await runCheck(entry.value);
          entry.metrics.healthy = healthy;
          entry.metrics.lastHealthCheckAt = new Date().toISOString();
          this.logger.info('Key health check result', {
            provider: this.provider,
            keyId: entry.keyId,
            healthy,
            durationMs: Date.now() - start,
          });
        } catch (error) {
          entry.metrics.healthy = false;
          entry.metrics.lastHealthCheckAt = new Date().toISOString();
          entry.metrics.lastErrorAt = new Date().toISOString();
          entry.metrics.lastErrorMessage = error instanceof Error ? error.message : String(error);
          this.logger.warn('Key health check failed', {
            provider: this.provider,
            keyId: entry.keyId,
            durationMs: Date.now() - start,
            error: entry.metrics.lastErrorMessage,
          });
        }
      })
    );

    return this.entries.map((entry) => ({ ...entry.metrics }));
  }

  /**
   * Get current metrics snapshot for all keys.
   */
  getMetrics(): KeyMetrics[] {
    return this.entries.map((entry) => ({ ...entry.metrics }));
  }

  private createEntry(key: string, index: number): KeyEntry {
    const keyId = `key-${index + 1}`;
    return {
      keyId,
      value: key,
      metrics: {
        keyId,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        rateLimitCount: 0,
        consecutiveErrors: 0,
        healthy: true,
      },
    };
  }

  private findEntry(key: string): KeyEntry | undefined {
    return this.entries.find((entry) => entry.value === key);
  }

  private getAvailableEntries(): KeyEntry[] {
    return this.getAvailableEntriesAt(Date.now());
  }

  private getAvailableEntriesAt(now: number): KeyEntry[] {
    return this.entries.filter((entry) => {
      const rateLimitedUntil = entry.metrics.rateLimitedUntil
        ? new Date(entry.metrics.rateLimitedUntil).getTime()
        : 0;
      const withinRateLimit = rateLimitedUntil > now;
      const exceededRequestCap =
        this.maxRequestsPerKey !== undefined && entry.metrics.totalRequests >= this.maxRequestsPerKey;
      const exceededErrors = entry.metrics.consecutiveErrors >= this.maxConsecutiveErrors;

      return !withinRateLimit && !exceededRequestCap && !exceededErrors && entry.metrics.healthy;
    });
  }

  private selectEntry(entries: KeyEntry[]): KeyEntry {
    switch (this.rotationStrategy) {
      case 'least-used':
        return entries.reduce((best, entry) =>
          entry.metrics.totalRequests < best.metrics.totalRequests ? entry : best
        );
      case 'random':
        return entries[Math.floor(Math.random() * entries.length)];
      case 'lowest-error-rate':
        return entries.reduce((best, entry) =>
          this.getErrorRate(entry) < this.getErrorRate(best) ? entry : best
        );
      case 'round-robin':
      default:
        return this.selectRoundRobin(entries);
    }
  }

  private selectRoundRobin(entries: KeyEntry[]): KeyEntry {
    const startIndex = this.currentIndex;
    for (let offset = 0; offset < this.entries.length; offset += 1) {
      const index = (startIndex + offset) % this.entries.length;
      const candidate = this.entries[index];
      if (entries.includes(candidate)) {
        this.currentIndex = index;
        return candidate;
      }
    }
    return entries[0];
  }

  private markRequest(entry: KeyEntry): void {
    entry.metrics.totalRequests += 1;
    entry.metrics.lastUsedAt = new Date().toISOString();
    if (entry.metrics.consecutiveErrors >= this.maxConsecutiveErrors) {
      this.logger.warn('Key exceeded consecutive error threshold', {
        provider: this.provider,
        keyId: entry.keyId,
        consecutiveErrors: entry.metrics.consecutiveErrors,
      });
    }
  }

  private getErrorRate(entry: KeyEntry): number {
    if (entry.metrics.totalRequests === 0) {
      return 0;
    }
    return entry.metrics.failedRequests / entry.metrics.totalRequests;
  }

  private getNextAvailabilityWindowMs(): number {
    const now = Date.now();
    const rateLimitTimes = this.entries
      .map((entry) => (entry.metrics.rateLimitedUntil ? new Date(entry.metrics.rateLimitedUntil).getTime() : now))
      .filter((time) => time > now);

    if (!rateLimitTimes.length) {
      return this.rateLimitCooldownMs;
    }

    return Math.max(0, Math.min(...rateLimitTimes) - now);
  }
}

export default KeyPoolManager;
