import type {
  KeyPoolConfig,
  LegacyKeyPoolOptions,
  LegacyKeyRotationDecision,
} from './key-pool-manager';

declare module './key-pool-manager' {
  class KeyPoolManager {
    constructor(config: KeyPoolConfig);
    constructor(apiKeys: string[], legacyOptions: LegacyKeyPoolOptions);

    getActiveKey(now?: number): LegacyKeyRotationDecision;
    recordSuccess(apiKey: string, now?: number): void;
    recordFailure(apiKey: string, errorCode?: number, now?: number): void;
  }
}

declare module '../improvements/key-pool-manager' {
  class KeyPoolManager {
    constructor(config: KeyPoolConfig);
    constructor(apiKeys: string[], legacyOptions: LegacyKeyPoolOptions);

    getActiveKey(now?: number): LegacyKeyRotationDecision;
    recordSuccess(apiKey: string, now?: number): void;
    recordFailure(apiKey: string, errorCode?: number, now?: number): void;
  }
}
