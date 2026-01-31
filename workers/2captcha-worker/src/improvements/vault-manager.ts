/**
 * Vault Manager
 * - Loads API keys from HashiCorp Vault with short-lived caching
 * - Persists rotation state and key metrics in Vault
 * - Supports automatic key reload (cache refresh)
 * - Falls back to environment variables when Vault is unavailable
 *
 * Security notes:
 * - No secrets are logged
 * - Secrets are only kept in memory briefly (short TTL cache)
 */

export type VaultKvVersion = 1 | 2;

export type VaultKeyId = 'groq-account-1' | 'groq-account-2' | 'mistral-fallback' | string;

export interface GroqAccountKey {
  apiKey: string;
  email?: string;
  tier?: string;
  dailyLimit?: number;
}

export interface MistralFallbackKey {
  apiKey: string;
  model?: string;
}

export interface VaultKeyBundle {
  groqAccount1?: GroqAccountKey;
  groqAccount2?: GroqAccountKey;
  mistralFallback?: MistralFallbackKey;
}

export interface VaultRotationState {
  activeKey?: VaultKeyId;
  activeIp?: string;
  rotationCount?: number;
  lastUpdatedAt?: string;
}

export interface VaultKeyStats {
  requestsToday?: number;
  lastUsed?: string;
  status?: string;
}

export interface VaultStateRecord {
  current_state?: VaultRotationState;
  key_stats?: VaultKeyStats;
}

export interface VaultManagerOptions {
  vaultAddress?: string;
  vaultToken?: string;
  vaultNamespace?: string;
  kvVersion?: VaultKvVersion;
  cacheTtlMs?: number;
  keyCacheTtlMs?: number;
  maxRetries?: number;
  retryBaseMs?: number;
  requestTimeoutMs?: number;
  enableAutoReload?: boolean;
  autoReloadIntervalMs?: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const VAULT_PATHS = {
  keys: 'secret/groq-rotation/keys',
  state: 'secret/groq-rotation/state',
};

const DEFAULTS = {
  cacheTtlMs: 30_000,
  keyCacheTtlMs: 5_000,
  maxRetries: 2,
  retryBaseMs: 200,
  requestTimeoutMs: 5_000,
  autoReloadIntervalMs: 60_000,
} as const;

/**
 * VaultManager provides access to Vault-stored keys and rotation metadata.
 */
export class VaultManager {
  private readonly vaultAddress: string;
  private readonly vaultToken?: string;
  private readonly vaultNamespace?: string;
  private readonly kvVersion: VaultKvVersion;
  private readonly cacheTtlMs: number;
  private readonly keyCacheTtlMs: number;
  private readonly maxRetries: number;
  private readonly retryBaseMs: number;
  private readonly requestTimeoutMs: number;
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private reloadInterval?: NodeJS.Timeout;

  /**
   * Create a new VaultManager.
   */
  constructor(options: VaultManagerOptions = {}) {
    this.vaultAddress = options.vaultAddress || process.env.VAULT_ADDR || 'http://localhost:8200';
    this.vaultToken = options.vaultToken || process.env.VAULT_TOKEN;
    this.vaultNamespace = options.vaultNamespace || process.env.VAULT_NAMESPACE;
    this.kvVersion = options.kvVersion || this.parseKvVersion(process.env.VAULT_KV_VERSION) || 2;
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULTS.cacheTtlMs;
    this.keyCacheTtlMs = options.keyCacheTtlMs ?? DEFAULTS.keyCacheTtlMs;
    this.maxRetries = options.maxRetries ?? DEFAULTS.maxRetries;
    this.retryBaseMs = options.retryBaseMs ?? DEFAULTS.retryBaseMs;
    this.requestTimeoutMs = options.requestTimeoutMs ?? DEFAULTS.requestTimeoutMs;

    if (options.enableAutoReload) {
      this.startAutoReload(options.autoReloadIntervalMs ?? DEFAULTS.autoReloadIntervalMs);
    }
  }

  /**
   * Load API keys from Vault with short-lived cache and .env fallback.
   */
  async loadKeys(): Promise<VaultKeyBundle> {
    const cached = this.getCache<VaultKeyBundle>('keys');
    if (cached) {
      return cached;
    }

    try {
      const data = await this.readVault<VaultKeyBundle>(VAULT_PATHS.keys);
      const normalized = this.normalizeKeys(data);
      this.setCache('keys', normalized, this.keyCacheTtlMs);
      return normalized;
    } catch (error) {
      const fallback = this.loadKeysFromEnv();
      this.setCache('keys', fallback, this.keyCacheTtlMs);
      return fallback;
    }
  }

  /**
   * Persist rotation state to Vault (current_state).
   */
  async saveState(state: VaultRotationState): Promise<void> {
    const existing = await this.loadStateRecord();
    const payload: VaultStateRecord = {
      ...existing,
      current_state: {
        ...existing?.current_state,
        ...state,
        lastUpdatedAt: new Date().toISOString(),
      },
    };

    await this.writeVault(VAULT_PATHS.state, payload);
    this.setCache('state', payload.current_state ?? null);
  }

  /**
   * Load rotation state from Vault (current_state) with caching.
   */
  async loadState(): Promise<VaultRotationState | null> {
    const cached = this.getCache<VaultRotationState>('state');
    if (cached) {
      return cached;
    }

    const record = await this.loadStateRecord();
    const state = record?.current_state ?? null;
    if (state) {
      this.setCache('state', state);
    }
    return state;
  }

  /**
   * Update key usage stats inside the Vault state record.
   */
  async updateKeyStats(stats: VaultKeyStats): Promise<void> {
    const existing = await this.loadStateRecord();
    const merged = this.mergeKeyStats(existing?.key_stats, stats);
    const payload: VaultStateRecord = {
      ...existing,
      key_stats: merged,
    };

    await this.writeVault(VAULT_PATHS.state, payload);
    this.setCache('key_stats', merged);
  }

  /**
   * Stop automatic key reloads.
   */
  stopAutoReload(): void {
    if (this.reloadInterval) {
      clearInterval(this.reloadInterval);
      this.reloadInterval = undefined;
    }
  }

  /**
   * Refresh the key cache (used by auto reload).
   */
  async refreshKeysCache(): Promise<void> {
    const data = await this.readVault<VaultKeyBundle>(VAULT_PATHS.keys);
    const normalized = this.normalizeKeys(data);
    this.setCache('keys', normalized, this.keyCacheTtlMs);
  }

  private startAutoReload(intervalMs: number): void {
    if (this.reloadInterval) {
      clearInterval(this.reloadInterval);
    }
    this.reloadInterval = setInterval(() => {
      void this.refreshKeysCache();
    }, intervalMs);
  }

  private async loadStateRecord(): Promise<VaultStateRecord | null> {
    try {
      const data = await this.readVault<VaultStateRecord>(VAULT_PATHS.state);
      return data || null;
    } catch (error) {
      return null;
    }
  }

  private normalizeKeys(raw?: VaultKeyBundle | null): VaultKeyBundle {
    if (!raw) {
      return this.loadKeysFromEnv();
    }

    return {
      groqAccount1: raw.groqAccount1 ? { ...raw.groqAccount1 } : undefined,
      groqAccount2: raw.groqAccount2 ? { ...raw.groqAccount2 } : undefined,
      mistralFallback: raw.mistralFallback ? { ...raw.mistralFallback } : undefined,
    };
  }

  private loadKeysFromEnv(): VaultKeyBundle {
    const groqAccount1ApiKey =
      process.env.GROQ_ACCOUNT_1_API_KEY || process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY;
    const groqAccount2ApiKey = process.env.GROQ_ACCOUNT_2_API_KEY || process.env.GROQ_API_KEY_2;
    const mistralApiKey = process.env.MISTRAL_API_KEY || process.env.MISTRAL_FALLBACK_KEY;

    const bundle: VaultKeyBundle = {};

    if (groqAccount1ApiKey) {
      bundle.groqAccount1 = {
        apiKey: groqAccount1ApiKey,
        email: process.env.GROQ_ACCOUNT_1_EMAIL,
        tier: process.env.GROQ_ACCOUNT_1_TIER,
        dailyLimit: this.parseNumber(process.env.GROQ_ACCOUNT_1_DAILY_LIMIT),
      };
    }

    if (groqAccount2ApiKey) {
      bundle.groqAccount2 = {
        apiKey: groqAccount2ApiKey,
        email: process.env.GROQ_ACCOUNT_2_EMAIL,
        tier: process.env.GROQ_ACCOUNT_2_TIER,
        dailyLimit: this.parseNumber(process.env.GROQ_ACCOUNT_2_DAILY_LIMIT),
      };
    }

    if (mistralApiKey) {
      bundle.mistralFallback = {
        apiKey: mistralApiKey,
        model: process.env.MISTRAL_FALLBACK_MODEL || process.env.MISTRAL_MODEL,
      };
    }

    return bundle;
  }

  private mergeKeyStats(existing: VaultKeyStats | undefined, incoming: VaultKeyStats): VaultKeyStats {
    return {
      requestsToday: (existing?.requestsToday ?? 0) + (incoming.requestsToday ?? 0),
      lastUsed: incoming.lastUsed ?? existing?.lastUsed,
      status: incoming.status ?? existing?.status,
    };
  }

  private getCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  private setCache<T>(key: string, value: T, ttlMs?: number): void {
    const ttl = ttlMs ?? this.cacheTtlMs;
    this.cache.set(key, { value, expiresAt: Date.now() + ttl });
  }

  private async readVault<T>(pathName: string): Promise<T> {
    const response = await this.requestWithRetry('GET', this.buildVaultPath(pathName, 'read'));
    const data = response.data as { data?: T } | T | undefined;

    if (this.kvVersion === 2) {
      if (!data || typeof data !== 'object' || !('data' in data)) {
        return undefined as T;
      }
      return (data as { data: T }).data;
    }

    return data as T;
  }

  private async writeVault<T>(pathName: string, payload: T): Promise<void> {
    const body = this.kvVersion === 2 ? { data: payload } : payload;
    await this.requestWithRetry('POST', this.buildVaultPath(pathName, 'write'), body);
  }

  private buildVaultPath(pathName: string, mode: 'read' | 'write'): string {
    if (this.kvVersion !== 2) {
      return pathName;
    }
    if (pathName.startsWith('secret/data/') || pathName.startsWith('secret/metadata/')) {
      return pathName;
    }
    if (mode === 'read' || mode === 'write') {
      return pathName.replace('secret/', 'secret/data/');
    }
    return pathName;
  }

  private async requestWithRetry(method: string, pathName: string, body?: unknown): Promise<{ data: unknown }> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.maxRetries) {
      try {
        return await this.requestJson(method, pathName, body);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const delay = this.retryBaseMs * Math.pow(2, attempt);
        await this.sleep(delay);
      }
      attempt += 1;
    }

    throw lastError || new Error('Vault request failed');
  }

  private async requestJson(method: string, pathName: string, body?: unknown): Promise<{ data: unknown }> {
    if (!this.vaultToken) {
      throw new Error('Vault token not configured');
    }

    const url = new URL(`/v1/${pathName}`, this.vaultAddress);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Vault-Token': this.vaultToken,
          ...(this.vaultNamespace ? { 'X-Vault-Namespace': this.vaultNamespace } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Vault request failed: ${response.status} ${text}`);
      }

      const payload = (await response.json()) as unknown;
      return { data: payload };
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseNumber(value: string | undefined): number | undefined {
    if (!value) {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private parseKvVersion(value: string | undefined): VaultKvVersion | undefined {
    if (!value) {
      return undefined;
    }
    return value === '1' ? 1 : 2;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default VaultManager;
