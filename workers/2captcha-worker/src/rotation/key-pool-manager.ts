/**
 * KeyPoolManager wrapper for rotation module.
 * Keeps legacy constructor signature available for tests and integrations.
 */

import {
  KeyPoolManager as BaseKeyPoolManager,
  type KeyPoolConfig,
  type KeyMetrics,
  type KeyRotationStrategy,
  type LegacyKeyPoolOptions,
  type LegacyKeyRotationDecision,
} from '../improvements/key-pool-manager';

export class KeyPoolManager extends BaseKeyPoolManager {
  constructor(config: KeyPoolConfig);
  constructor(apiKeys: string[], legacyOptions: LegacyKeyPoolOptions);
  constructor(configOrKeys: KeyPoolConfig | string[], legacyOptions?: LegacyKeyPoolOptions) {
    if (Array.isArray(configOrKeys)) {
      // Legacy mode: apiKeys array
      super(configOrKeys as string[], legacyOptions as LegacyKeyPoolOptions);
      return;
    }
    // New mode: KeyPoolConfig object
    super(configOrKeys as KeyPoolConfig);
  }

  getActiveKey(now?: number): LegacyKeyRotationDecision {
    return super.getActiveKey(now);
  }

  recordSuccess(apiKey: string, now?: number): void {
    super.recordSuccess(apiKey, now);
  }

  recordFailure(apiKey: string, errorCode?: number, now?: number): void {
    super.recordFailure(apiKey, errorCode, now);
  }
}

export type {
  KeyPoolConfig,
  KeyMetrics,
  KeyRotationStrategy,
  LegacyKeyPoolOptions,
  LegacyKeyRotationDecision,
};
