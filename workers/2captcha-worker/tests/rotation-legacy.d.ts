// Legacy KeyPoolManager typings for test compatibility.

declare module '../src/improvements/key-pool-manager' {
  export class KeyPoolManager {
    constructor(keys: string[], options: Record<string, unknown>);
    constructor(config: Record<string, unknown>);
    getActiveKey(now?: number): { provider: string; apiKey: string | null; reason: string };
    recordSuccess(apiKey: string, now?: number): void;
    recordFailure(apiKey: string, errorCode?: number, now?: number): void;
  }
}

declare module '../src/rotation/key-pool-manager' {
  export class KeyPoolManager {
    constructor(keys: string[], options: Record<string, unknown>);
    constructor(config: Record<string, unknown>);
    getActiveKey(now?: number): { provider: string; apiKey: string | null; reason: string };
    recordSuccess(apiKey: string, now?: number): void;
    recordFailure(apiKey: string, errorCode?: number, now?: number): void;
  }
}

export {};
