/**
 * Multi Provider Fallback
 * - Weighted provider selection
 * - Health checks and fallback order
 */

import RetryManager from './retry-manager';
import CircuitBreaker from './circuit-breaker';

export interface ProviderSolveRequest {
  type: string;
  image?: Buffer;
  prompt?: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderSolveResult {
  solution: string;
  confidence: number;
  provider?: string;
  raw?: unknown;
}

export interface CaptchaProvider {
  name: string;
  costPerSolve: number;
  supportsTypes: string[];
  maxConcurrency?: number;
  solve(request: ProviderSolveRequest): Promise<ProviderSolveResult>;
  healthCheck(): Promise<boolean>;
}

export interface MultiProviderOptions {
  retryManager: RetryManager;
  circuitBreaker?: CircuitBreaker;
  preferredOrder?: string[];
}

export class MultiProvider {
  private readonly providers: CaptchaProvider[];
  private readonly retryManager: RetryManager;
  private readonly circuitBreaker?: CircuitBreaker;
  private readonly preferredOrder?: string[];

  constructor(providers: CaptchaProvider[], options: MultiProviderOptions) {
    this.providers = providers;
    this.retryManager = options.retryManager;
    this.circuitBreaker = options.circuitBreaker;
    this.preferredOrder = options.preferredOrder;
  }

  async solve(request: ProviderSolveRequest): Promise<ProviderSolveResult> {
    const eligible = this.providers
      .filter((provider) => provider.supportsTypes.includes(request.type))
      .sort((a, b) => this.getProviderScore(a) - this.getProviderScore(b));

    let lastError: Error | null = null;

    for (const provider of eligible) {
      try {
        const execute = async () => provider.solve(request);
        const result = this.circuitBreaker
          ? await this.circuitBreaker.execute(execute)
          : await this.retryManager.execute(execute);
        return {
          ...result,
          provider: provider.name,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError ?? new Error('No provider could solve the CAPTCHA');
  }

  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    await Promise.all(
      this.providers.map(async (provider) => {
        try {
          results[provider.name] = await provider.healthCheck();
        } catch {
          results[provider.name] = false;
        }
      })
    );
    return results;
  }

  private getProviderScore(provider: CaptchaProvider): number {
    const preferenceIndex = this.preferredOrder?.indexOf(provider.name) ?? -1;
    const preferenceScore = preferenceIndex >= 0 ? preferenceIndex : this.providers.length;
    return provider.costPerSolve + preferenceScore * 0.01;
  }
}

export default MultiProvider;
