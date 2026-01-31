/**
 * Vault Client - Secrets Management for Groq Rotation
 *
 * Responsibilities:
 * - Read/write keys, state, and metrics from Vault
 * - Encrypted local fallback storage (AES-256-GCM)
 * - Caching and retry logic for Vault availability
 * - Automatic key reload cache refresh
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { promises as fs } from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';

export type VaultKeyId = 'GROQ_API_KEY_1' | 'GROQ_API_KEY_2' | 'MISTRAL_API_KEY';

export interface VaultKeys {
  groqApiKey1?: string;
  groqApiKey2?: string;
  mistralApiKey?: string;
}

export interface GroqAccountSecret {
  id: string;
  key: string;
  daily_limit?: number;
}

export interface VaultSecretsPayload {
  groq?: {
    accounts?: GroqAccountSecret[];
  };
  mistral?: {
    fallback?: {
      key?: string;
    };
  };
}

export interface VaultRotationState {
  activeKey?: VaultKeyId;
  lastRotatedAt?: string;
  lastLoadedAt?: string;
  failureCount?: number;
  rotationIndex?: number;
  healthStatus?: {
    status?: 'healthy' | 'degraded' | 'unhealthy';
    lastCheckedAt?: string;
    lastErrorAt?: string;
    errorCount?: number;
  };
  keyHealth?: Partial<
    Record<
      VaultKeyId,
      {
        status?: 'healthy' | 'degraded' | 'unhealthy';
        lastErrorAt?: string;
        lastSuccessAt?: string;
        errorCount?: number;
        requestCount?: number;
      }
    >
  >;
}

export interface VaultMetrics {
  lastUsedAt?: string;
  totalRequests?: number;
  errorCount?: number;
  usageByKey?: Partial<Record<VaultKeyId, number>>;
}

export interface VaultClientOptions {
  vaultAddress?: string;
  vaultToken?: string;
  vaultNamespace?: string;
  kvVersion?: 1 | 2;
  cacheTtlMs?: number;
  maxRetries?: number;
  retryBaseMs?: number;
  fallbackFilePath?: string;
  fallbackKey?: string;
  enableAutoReload?: boolean;
  autoReloadIntervalMs?: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface EncryptedRecord {
  iv: string;
  tag: string;
  data: string;
}

interface FallbackStorage {
  version: number;
  updatedAt: string;
  salt: string;
  records: {
    keys?: EncryptedRecord;
    state?: EncryptedRecord;
    metrics?: EncryptedRecord;
  };
}

const DEFAULT_PATHS = {
  keys: 'secret/groq-rotation/keys',
  state: 'secret/groq-rotation/state',
  metrics: 'secret/groq-rotation/metrics',
};

export class VaultClient {
  private readonly vaultAddress: string;
  private readonly vaultToken?: string;
  private readonly vaultNamespace?: string;
  private readonly kvVersion: 1 | 2;
  private readonly cacheTtlMs: number;
  private readonly maxRetries: number;
  private readonly retryBaseMs: number;
  private readonly fallbackFilePath: string;
  private readonly fallbackKey?: string;
  private readonly cache = new Map<string, CacheEntry<unknown>>();
  private reloadInterval?: NodeJS.Timeout;

  constructor(options: VaultClientOptions = {}) {
    this.vaultAddress = options.vaultAddress || process.env.VAULT_ADDR || 'http://localhost:8200';
    this.vaultToken = options.vaultToken || process.env.VAULT_TOKEN;
    this.vaultNamespace = options.vaultNamespace || process.env.VAULT_NAMESPACE;
    this.kvVersion = options.kvVersion || this.parseKvVersion(process.env.VAULT_KV_VERSION) || 2;
    this.cacheTtlMs = options.cacheTtlMs || this.parseNumber(process.env.VAULT_CACHE_TTL_MS, 30000);
    this.maxRetries = options.maxRetries || this.parseNumber(process.env.VAULT_RETRY_MAX, 3);
    this.retryBaseMs = options.retryBaseMs || this.parseNumber(process.env.VAULT_RETRY_BASE_MS, 200);
    this.fallbackFilePath = options.fallbackFilePath ||
      process.env.VAULT_FALLBACK_PATH ||
      path.resolve(process.cwd(), 'vault-secrets.json');
    this.fallbackKey = options.fallbackKey || process.env.VAULT_FALLBACK_KEY || this.vaultToken;

    if (options.enableAutoReload) {
      this.startAutoReload(options.autoReloadIntervalMs || this.parseNumber(process.env.VAULT_AUTO_RELOAD_MS, 60000));
    }
  }

  /**
   * Fetch API keys from Vault (cached with TTL).
   */
  async getKeys(): Promise<VaultKeys> {
    const cached = this.getCache<VaultKeys>('keys');
    if (cached) {
      return cached;
    }

    try {
      const payload = await this.loadSecretsPayload();
      const keys = this.flattenSecrets(payload);
      this.setCache('keys', keys);
      return keys;
    } catch (error) {
      const fallback = this.readEnvKeys();
      this.setCache('keys', fallback);
      return fallback;
    }
  }

  /**
   * Fetch a single API key for the given provider (Vault-first, env fallback).
   */
  async getKey(provider: 'groq' | 'mistral', id?: string): Promise<string | null> {
    const payload = await this.loadSecretsPayload().catch(() => this.readEnvSecrets());
    if (provider === 'mistral') {
      return payload.mistral?.fallback?.key || this.readEnvKeys().mistralApiKey || null;
    }

    const accounts = payload.groq?.accounts || [];
    const match = id ? accounts.find((account) => account.id === id) : accounts[0];
    if (match?.key) {
      return match.key;
    }

    const envKeys = this.readEnvKeys();
    return envKeys.groqApiKey1 || envKeys.groqApiKey2 || null;
  }

  /**
   * Persist a single API key into Vault (writes to keys path).
   */
  async saveKey(provider: 'groq' | 'mistral', key: string, id?: string, dailyLimit?: number): Promise<void> {
    const payload = await this.loadSecretsPayload().catch(() => this.readEnvSecrets());

    if (provider === 'mistral') {
      const updated: VaultSecretsPayload = {
        ...payload,
        mistral: {
          ...payload.mistral,
          fallback: {
            key,
          },
        },
      };
      await this.persistSecretsPayload(updated);
      return;
    }

    const accounts = [...(payload.groq?.accounts || [])];
    const accountId = id || `groq-${accounts.length + 1}`;
    const existingIndex = accounts.findIndex((account) => account.id === accountId);
    const nextAccount: GroqAccountSecret = {
      id: accountId,
      key,
      daily_limit: dailyLimit,
    };
    if (existingIndex >= 0) {
      accounts[existingIndex] = { ...accounts[existingIndex], ...nextAccount };
    } else {
      accounts.push(nextAccount);
    }

    const updated: VaultSecretsPayload = {
      ...payload,
      groq: {
        ...payload.groq,
        accounts,
      },
    };

    await this.persistSecretsPayload(updated);
  }

  /**
   * Persist rotation state to Vault or encrypted fallback storage.
   */
  async saveState(state: VaultRotationState): Promise<void> {
    const payload: VaultRotationState = {
      ...state,
      lastLoadedAt: new Date().toISOString(),
    };

    try {
      await this.writeVault(DEFAULT_PATHS.state, payload);
      this.setCache('state', payload);
    } catch (error) {
      await this.writeFallback('state', payload);
      this.setCache('state', payload);
    }
  }

  /**
   * Load rotation state from Vault with env fallback.
   */
  async getRotationState(): Promise<VaultRotationState | null> {
    return this.loadState();
  }

  /**
   * Update rotation state in Vault by merging with current state.
   */
  async updateRotationState(update: Partial<VaultRotationState>): Promise<VaultRotationState | null> {
    const existing = (await this.loadState()) || {};
    const merged: VaultRotationState = {
      ...existing,
      ...update,
      lastLoadedAt: new Date().toISOString(),
    };
    await this.saveState(merged);
    return merged;
  }

  /**
   * Load rotation state from Vault or encrypted fallback storage.
   */
  async loadState(): Promise<VaultRotationState | null> {
    const cached = this.getCache<VaultRotationState>('state');
    if (cached) {
      return cached;
    }

    try {
      const data = await this.readVault<VaultRotationState>(DEFAULT_PATHS.state);
      const state = data || null;
      if (state) {
        this.setCache('state', state);
      }
      return state;
    } catch (error) {
      const fallback = await this.readFallback<VaultRotationState>('state');
      if (fallback) {
        this.setCache('state', fallback);
        return fallback;
      }
      return null;
    }
  }

  /**
   * Update usage metrics for keys in Vault or encrypted fallback storage.
   */
  async updateMetrics(metrics: VaultMetrics): Promise<void> {
    const existing = (await this.loadMetrics()) || {};
    const merged = this.mergeMetrics(existing, metrics);

    try {
      await this.writeVault(DEFAULT_PATHS.metrics, merged);
      this.setCache('metrics', merged);
    } catch (error) {
      await this.writeFallback('metrics', merged);
      this.setCache('metrics', merged);
    }
  }

  /**
   * Stop auto reload interval if running.
   */
  stopAutoReload(): void {
    if (this.reloadInterval) {
      clearInterval(this.reloadInterval);
      this.reloadInterval = undefined;
    }
  }

  private startAutoReload(intervalMs: number): void {
    if (this.reloadInterval) {
      clearInterval(this.reloadInterval);
    }
    this.reloadInterval = setInterval(() => {
      void this.refreshKeysCache();
    }, intervalMs);
  }

  private async refreshKeysCache(): Promise<void> {
    try {
      const data = await this.readVault<VaultKeys>(DEFAULT_PATHS.keys);
      const keys = this.normalizeKeys(data);
      this.setCache('keys', keys);
    } catch (error) {
      // Ignore background refresh failures
    }
  }

  private async loadMetrics(): Promise<VaultMetrics | null> {
    const cached = this.getCache<VaultMetrics>('metrics');
    if (cached) {
      return cached;
    }

    try {
      const data = await this.readVault<VaultMetrics>(DEFAULT_PATHS.metrics);
      const metrics = data || null;
      if (metrics) {
        this.setCache('metrics', metrics);
      }
      return metrics;
    } catch (error) {
      const fallback = await this.readFallback<VaultMetrics>('metrics');
      if (fallback) {
        this.setCache('metrics', fallback);
        return fallback;
      }
      return null;
    }
  }

  private normalizeSecrets(raw?: VaultSecretsPayload | VaultKeys | null): VaultSecretsPayload {
    if (!raw) {
      return {};
    }

    const payload = raw as VaultSecretsPayload;
    if (payload.groq || payload.mistral) {
      return {
        groq: payload.groq,
        mistral: payload.mistral,
      };
    }

    const legacy = raw as VaultKeys;
    const accounts: GroqAccountSecret[] = [];
    if (legacy.groqApiKey1) {
      accounts.push({ id: 'groq-1', key: legacy.groqApiKey1, daily_limit: 14400 });
    }
    if (legacy.groqApiKey2) {
      accounts.push({ id: 'groq-2', key: legacy.groqApiKey2, daily_limit: 14400 });
    }

    return {
      groq: accounts.length ? { accounts } : undefined,
      mistral: legacy.mistralApiKey
        ? {
            fallback: {
              key: legacy.mistralApiKey,
            },
          }
        : undefined,
    };
  }

  private normalizeKeys(raw?: VaultSecretsPayload | VaultKeys | null): VaultKeys {
    const payload = this.normalizeSecrets(raw);
    return this.flattenSecrets(payload);
  }

  private flattenSecrets(payload: VaultSecretsPayload): VaultKeys {
    const accounts = payload.groq?.accounts || [];
    return {
      groqApiKey1: accounts[0]?.key,
      groqApiKey2: accounts[1]?.key,
      mistralApiKey: payload.mistral?.fallback?.key,
    };
  }

  private readEnvKeys(): VaultKeys {
    return {
      groqApiKey1: process.env.GROQ_API_KEY_1,
      groqApiKey2: process.env.GROQ_API_KEY_2,
      mistralApiKey: process.env.MISTRAL_API_KEY,
    };
  }

  private readEnvSecrets(): VaultSecretsPayload {
    const envKeys = this.readEnvKeys();
    return this.normalizeSecrets(envKeys);
  }

  private async loadSecretsPayload(): Promise<VaultSecretsPayload> {
    const cached = this.getCache<VaultSecretsPayload>('secrets-payload');
    if (cached) {
      return cached;
    }

    try {
      const raw = await this.readVault<VaultSecretsPayload | VaultKeys>(DEFAULT_PATHS.keys);
      const payload = this.normalizeSecrets(raw);
      this.setCache('secrets-payload', payload);
      return payload;
    } catch (error) {
      const fallback = await this.readFallback<VaultSecretsPayload | VaultKeys>('keys');
      if (fallback) {
        const payload = this.normalizeSecrets(fallback);
        this.setCache('secrets-payload', payload);
        return payload;
      }
      const envPayload = this.readEnvSecrets();
      this.setCache('secrets-payload', envPayload);
      return envPayload;
    }
  }

  private async persistSecretsPayload(payload: VaultSecretsPayload): Promise<void> {
    try {
      await this.writeVault(DEFAULT_PATHS.keys, payload);
      this.setCache('secrets-payload', payload);
      this.setCache('keys', this.flattenSecrets(payload));
    } catch (error) {
      await this.writeFallback('keys', payload);
      this.setCache('secrets-payload', payload);
      this.setCache('keys', this.flattenSecrets(payload));
    }
  }

  private mergeMetrics(existing: VaultMetrics, incoming: VaultMetrics): VaultMetrics {
    const usageByKey: Partial<Record<VaultKeyId, number>> = {
      ...existing.usageByKey,
      ...incoming.usageByKey,
    };

    if (existing.usageByKey || incoming.usageByKey) {
      for (const key of Object.keys(incoming.usageByKey || {}) as VaultKeyId[]) {
        const prev = existing.usageByKey?.[key] || 0;
        const next = incoming.usageByKey?.[key] || 0;
        usageByKey[key] = prev + next;
      }
    }

    return {
      lastUsedAt: incoming.lastUsedAt || existing.lastUsedAt,
      totalRequests: (existing.totalRequests || 0) + (incoming.totalRequests || 0),
      errorCount: (existing.errorCount || 0) + (incoming.errorCount || 0),
      usageByKey,
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

  private setCache<T>(key: string, value: T): void {
    this.cache.set(key, { value, expiresAt: Date.now() + this.cacheTtlMs });
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
    const payload = body ? JSON.stringify(body) : undefined;
    const isHttps = url.protocol === 'https:';

    const options: http.RequestOptions = {
      method,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'X-Vault-Token': this.vaultToken,
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(this.vaultNamespace ? { 'X-Vault-Namespace': this.vaultNamespace } : {}),
      },
    };

    const transport = isHttps ? https : http;

    return new Promise((resolve, reject) => {
      const request = transport.request(options, (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ data: data ? JSON.parse(data) : {} });
            return;
          }
          reject(new Error(`Vault request failed: ${res.statusCode} ${data}`));
        });
      });

      request.on('error', (error) => reject(error));

      if (payload) {
        request.write(payload);
      }
      request.end();
    });
  }

  private async readFallback<T>(record: 'keys' | 'state' | 'metrics'): Promise<T | null> {
    try {
      const storage = await this.readFallbackStorage();
      const recordData = storage.records[record];
      if (!recordData) {
        return null;
      }
      return this.decryptPayload<T>(recordData, storage.salt);
    } catch (error) {
      return null;
    }
  }

  private async writeFallback<T>(record: 'keys' | 'state' | 'metrics', payload: T): Promise<void> {
    if (!this.fallbackKey) {
      throw new Error('Fallback encryption key not configured');
    }

    const storage = await this.readFallbackStorage();
    const encrypted = this.encryptPayload(payload, storage.salt);

    const updated: FallbackStorage = {
      ...storage,
      updatedAt: new Date().toISOString(),
      records: {
        ...storage.records,
        [record]: encrypted,
      },
    };

    await fs.writeFile(this.fallbackFilePath, JSON.stringify(updated, null, 2));
  }

  private async readFallbackStorage(): Promise<FallbackStorage> {
    try {
      const raw = await fs.readFile(this.fallbackFilePath, 'utf8');
      const parsed = JSON.parse(raw) as FallbackStorage;
      return {
        version: parsed.version || 1,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
        salt: parsed.salt || randomBytes(16).toString('hex'),
        records: parsed.records || {},
      };
    } catch (error) {
      return {
        version: 1,
        updatedAt: new Date().toISOString(),
        salt: randomBytes(16).toString('hex'),
        records: {},
      };
    }
  }

  private encryptPayload<T>(payload: T, salt: string): EncryptedRecord {
    const key = this.deriveKey(salt);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const data = Buffer.concat([
      cipher.update(JSON.stringify(payload), 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      data: data.toString('base64'),
    };
  }

  private decryptPayload<T>(record: EncryptedRecord, salt: string): T {
    const key = this.deriveKey(salt);
    const iv = Buffer.from(record.iv, 'hex');
    const tag = Buffer.from(record.tag, 'hex');
    const data = Buffer.from(record.data, 'base64');

    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    const payload = Buffer.concat([
      decipher.update(data),
      decipher.final(),
    ]);

    return JSON.parse(payload.toString('utf8')) as T;
  }

  private deriveKey(salt: string): Buffer {
    if (!this.fallbackKey) {
      throw new Error('Fallback encryption key not configured');
    }
    return scryptSync(this.fallbackKey, salt, 32);
  }

  private parseNumber(value: string | undefined, fallback: number): number {
    if (!value) {
      return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private parseKvVersion(value: string | undefined): 1 | 2 | undefined {
    if (!value) {
      return undefined;
    }
    return value === '1' ? 1 : 2;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default VaultClient;
