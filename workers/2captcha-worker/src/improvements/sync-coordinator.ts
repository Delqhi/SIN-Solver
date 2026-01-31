/**
 * Sync Coordinator
 *
 * Coordinates Key Rotation + IP Rotation + Session Persistence
 * to avoid data loss and ensure atomic, serialized rotations.
 */

import fs from 'fs';
import path from 'path';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { createCategoryLogger, LogCategory } from '../logger';
import type { SessionController } from '../anti-ban/session-controller';

/**
 * Rotation reason types
 */
export type RotationReason = 'scheduled' | 'rate-limit' | 'request-threshold' | 'manual';

/**
 * Rotation trigger context
 */
export interface RotationTriggerContext {
  reason: RotationReason;
  httpStatus?: number;
  errorCode?: string;
  requestsSinceRotation?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Browser session snapshot
 */
export interface BrowserSessionSnapshot {
  sessionId: string;
  capturedAt: number;
  cookies: Record<string, string>;
  localStorage: Record<string, string>;
  metadata?: Record<string, unknown>;
}

/**
 * Key rotation result
 */
export interface KeyRotationResult {
  keyId: string;
  rotatedAt: number;
  reason: RotationReason;
  metadata?: Record<string, unknown>;
}

/**
 * IP rotation result
 */
export interface IPRotationResult {
  ip: string;
  rotatedAt: number;
  cooldownMs?: number;
  reason: RotationReason;
  metadata?: Record<string, unknown>;
}

/**
 * Key pool manager contract
 */
export interface KeyPoolManager {
  rotateKey(
    reason: RotationReason,
    context?: RotationTriggerContext
  ): Promise<KeyRotationResult | void> | KeyRotationResult | void;
  getActiveKeyId?(): Promise<string | null>;
  markRateLimited?(keyId: string, context?: RotationTriggerContext): Promise<void>;
}

/**
 * IP rotation manager contract
 */
export interface IPRotationManager {
  rotateIP(
    reason: RotationReason,
    context?: RotationTriggerContext
  ): Promise<IPRotationResult | { newIP?: string } | void> | IPRotationResult | { newIP?: string } | void;
  getCurrentIP?(): Promise<string | null>;
  isCooldownActive?(): Promise<boolean>;
  waitForCooldown?(): Promise<void>;
}

/**
 * Worker controller contract
 */
export interface WorkerController {
  pause(reason: RotationReason, context?: RotationTriggerContext): Promise<void>;
  resume(reason: RotationReason, context?: RotationTriggerContext): Promise<void>;
  isPaused?(): Promise<boolean> | boolean;
}

/**
 * Browser session adapter contract
 */
export interface BrowserSessionAdapter {
  captureSession(): Promise<BrowserSessionSnapshot>;
  restoreSession(snapshot: BrowserSessionSnapshot): Promise<void>;
  createNewSession?(): Promise<void>;
}

/**
 * Coordinator state
 */
export interface SyncCoordinatorState {
  rotationInProgress: boolean;
  rotationId?: string;
  rotationStartedAt?: number;
  lastRotationAt?: number;
  lastRotationReason?: RotationReason;
  lastKeyRotationAt?: number;
  lastIPRotationAt?: number;
  requestCount: number;
  totalRotations: number;
  lastError?: string;
  lastSessionSnapshot?: BrowserSessionSnapshot;
}

/**
 * Persistent state store contract
 */
export interface SyncCoordinatorStateStore {
  getState(): Promise<SyncCoordinatorState | null>;
  setState(state: SyncCoordinatorState): Promise<void>;
}

/**
 * Session storage contract (Redis-backed by default)
 */
export interface SessionStore {
  saveSession(snapshot: BrowserSessionSnapshot): Promise<void>;
  getSession(sessionId: string): Promise<BrowserSessionSnapshot | null>;
  getLatestSession(): Promise<BrowserSessionSnapshot | null>;
}

/**
 * Redis-backed session store
 */
export class RedisSessionStore implements SessionStore {
  private readonly redis: Redis;
  private readonly keyPrefix: string;
  private readonly latestKey: string;
  private readonly ttlSeconds?: number;

  /**
   * Create Redis session store
   */
  constructor(
    redis: Redis,
    options?: {
      keyPrefix?: string;
      latestKey?: string;
      ttlSeconds?: number;
    }
  ) {
    this.redis = redis;
    this.keyPrefix = options?.keyPrefix ?? 'sync-coordinator:session:';
    this.latestKey = options?.latestKey ?? 'sync-coordinator:session:latest';
    this.ttlSeconds = options?.ttlSeconds;
  }

  /**
   * Persist session snapshot
   */
  async saveSession(snapshot: BrowserSessionSnapshot): Promise<void> {
    await this.ensureConnected();
    const payload = JSON.stringify(snapshot);
    const key = `${this.keyPrefix}${snapshot.sessionId}`;
    if (this.ttlSeconds) {
      await this.redis.set(key, payload, 'EX', this.ttlSeconds);
      await this.redis.set(this.latestKey, payload, 'EX', this.ttlSeconds);
      return;
    }
    await this.redis.set(key, payload);
    await this.redis.set(this.latestKey, payload);
  }

  /**
   * Retrieve session snapshot by id
   */
  async getSession(sessionId: string): Promise<BrowserSessionSnapshot | null> {
    await this.ensureConnected();
    const payload = await this.redis.get(`${this.keyPrefix}${sessionId}`);
    return payload ? (JSON.parse(payload) as BrowserSessionSnapshot) : null;
  }

  /**
   * Retrieve the latest session snapshot
   */
  async getLatestSession(): Promise<BrowserSessionSnapshot | null> {
    await this.ensureConnected();
    const payload = await this.redis.get(this.latestKey);
    return payload ? (JSON.parse(payload) as BrowserSessionSnapshot) : null;
  }

  private async ensureConnected(): Promise<void> {
    if (this.redis.status === 'ready') {
      return;
    }
    if (this.redis.status === 'end') {
      throw new Error('Redis connection closed for session store');
    }
    await this.redis.connect();
  }
}

/**
 * File-based state store (default)
 */
export class FileStateStore implements SyncCoordinatorStateStore {
  private readonly filePath: string;

  /**
   * Create a file state store
   */
  constructor(filePath: string) {
    this.filePath = filePath;
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Get state from disk
   */
  async getState(): Promise<SyncCoordinatorState | null> {
    if (!fs.existsSync(this.filePath)) {
      return null;
    }
    const data = await fs.promises.readFile(this.filePath, 'utf-8');
    return JSON.parse(data) as SyncCoordinatorState;
  }

  /**
   * Atomically persist state to disk
   */
  async setState(state: SyncCoordinatorState): Promise<void> {
    const tempPath = `${this.filePath}.tmp`;
    const payload = JSON.stringify(state, null, 2);
    await fs.promises.writeFile(tempPath, payload, 'utf-8');
    await fs.promises.rename(tempPath, this.filePath);
  }
}

/**
 * Sync coordinator configuration
 */
export interface SyncCoordinatorConfig {
  rotationIntervalMinMs: number;
  rotationIntervalMaxMs: number;
  requestThreshold: number;
  rotationCooldownMs: number;
  sessionRestoreTimeoutMs: number;
  rotationLockTimeoutMs: number;
  stateStorePath: string;
  redisUrl?: string;
  sessionStoreKeyPrefix?: string;
  sessionStoreTtlSeconds?: number;
}

/**
 * Rotation execution result
 */
export interface RotationOutcome {
  status: 'completed' | 'skipped' | 'failed';
  rotationId: string;
  reason: RotationReason;
  startedAt: number;
  completedAt?: number;
  keyRotation?: KeyRotationResult;
  ipRotation?: IPRotationResult;
  sessionSnapshot?: BrowserSessionSnapshot;
  error?: string;
  skippedReason?: string;
}

/**
 * Sync Coordinator
 */
export class SyncCoordinator {
  private readonly config: SyncCoordinatorConfig;
  private readonly stateStore: SyncCoordinatorStateStore;
  private readonly keyPoolManager: KeyPoolManager;
  private readonly ipRotationManager: IPRotationManager;
  private readonly workerController: WorkerController;
  private readonly browserSessionAdapter: BrowserSessionAdapter;
  private readonly sessionController?: SessionController;
  private readonly logger = createCategoryLogger(LogCategory.ANTI_BAN);
  private readonly sessionStore: SessionStore | null;
  private readonly redisClient?: Redis;
  private rotationPromise: Promise<RotationOutcome> | null = null;
  private scheduleTimer: NodeJS.Timeout | null = null;

  /**
   * Create a sync coordinator
   */
  constructor(
    config: Partial<SyncCoordinatorConfig>,
    deps: {
      keyPoolManager: KeyPoolManager;
      ipRotationManager: IPRotationManager;
      workerController: WorkerController;
      browserSessionAdapter: BrowserSessionAdapter;
      sessionController?: SessionController;
      stateStore?: SyncCoordinatorStateStore;
      sessionStore?: SessionStore;
    }
  ) {
    this.config = {
      rotationIntervalMinMs: config.rotationIntervalMinMs ?? 5 * 60 * 1000,
      rotationIntervalMaxMs: config.rotationIntervalMaxMs ?? 10 * 60 * 1000,
      requestThreshold: config.requestThreshold ?? 1000,
      rotationCooldownMs: config.rotationCooldownMs ?? 60 * 1000,
      sessionRestoreTimeoutMs: config.sessionRestoreTimeoutMs ?? 30 * 1000,
      rotationLockTimeoutMs: config.rotationLockTimeoutMs ?? 5 * 60 * 1000,
      stateStorePath: config.stateStorePath ?? './data/sync-coordinator-state.json',
      redisUrl: config.redisUrl ?? process.env.REDIS_URL ?? 'redis://localhost:6379/0',
      sessionStoreKeyPrefix: config.sessionStoreKeyPrefix,
      sessionStoreTtlSeconds: config.sessionStoreTtlSeconds,
    };

    this.keyPoolManager = deps.keyPoolManager;
    this.ipRotationManager = deps.ipRotationManager;
    this.workerController = deps.workerController;
    this.browserSessionAdapter = deps.browserSessionAdapter;
    this.sessionController = deps.sessionController;
    this.stateStore = deps.stateStore ?? new FileStateStore(this.config.stateStorePath);
    const providedSessionStore = (deps as { sessionStore?: SessionStore }).sessionStore;
    if (providedSessionStore) {
      this.sessionStore = providedSessionStore;
    } else if (this.config.redisUrl) {
      this.redisClient = new Redis(this.config.redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      });
      this.sessionStore = new RedisSessionStore(this.redisClient, {
        keyPrefix: this.config.sessionStoreKeyPrefix,
        ttlSeconds: this.config.sessionStoreTtlSeconds,
      });
    } else {
      this.sessionStore = null;
    }
  }

  /**
   * Pause worker operations
   */
  async pauseWorker(reason: RotationReason, context?: RotationTriggerContext): Promise<void> {
    this.logger.info('Pausing worker for rotation', {
      reason,
      context,
    });
    await this.workerController.pause(reason, context);
  }

  /**
   * Resume worker operations
   */
  async resumeWorker(reason: RotationReason, context?: RotationTriggerContext): Promise<void> {
    this.logger.info('Resuming worker after rotation', {
      reason,
      context,
    });
    await this.workerController.resume(reason, context);
  }

  /**
   * Capture and persist browser session
   */
  async saveSession(context?: RotationTriggerContext): Promise<BrowserSessionSnapshot> {
    const snapshot = await this.browserSessionAdapter.captureSession();
    const normalized = this.normalizeSnapshot(snapshot);

    if (this.sessionStore) {
      await this.sessionStore.saveSession(normalized);
    } else {
      this.logger.warn('Session store unavailable - snapshot only persisted in state');
    }

    await this.stateStore.setState({
      ...(await this.getOrCreateState()),
      lastSessionSnapshot: normalized,
    });

    this.logger.info('Session snapshot saved', {
      sessionId: normalized.sessionId,
      reason: context?.reason,
    });

    return normalized;
  }

  /**
   * Restore browser session (Redis-backed with timeout)
   */
  async restoreSession(snapshot?: BrowserSessionSnapshot): Promise<void> {
    const candidate = snapshot ?? (await this.getLatestSnapshot());
    if (!candidate) {
      this.logger.warn('No session snapshot available to restore');
      return;
    }

    await this.withTimeout(
      this.browserSessionAdapter.restoreSession(candidate),
      this.config.sessionRestoreTimeoutMs,
      'Session restore'
    );

    this.logger.info('Session snapshot restored', {
      sessionId: candidate.sessionId,
    });
  }

  /**
   * Coordinate a full rotation lifecycle
   */
  async coordinateRotation(context: RotationTriggerContext): Promise<RotationOutcome> {
    if (this.rotationPromise) {
      this.logger.warn('Rotation already in progress - skipping', {
        reason: context.reason,
      });
      return {
        status: 'skipped',
        rotationId: 'rotation-in-progress',
        reason: context.reason,
        startedAt: Date.now(),
        skippedReason: 'rotation-in-progress',
      };
    }

    this.rotationPromise = this.executeRotation(context).finally(() => {
      this.rotationPromise = null;
    });

    return this.rotationPromise;
  }

  /**
   * Record a request and trigger rotation if threshold is reached
   */
  async recordRequest(): Promise<RotationOutcome | null> {
    const state = await this.getOrCreateState();
    const updated = {
      ...state,
      requestCount: state.requestCount + 1,
    };
    await this.stateStore.setState(updated);

    if (updated.requestCount >= this.config.requestThreshold) {
      return this.coordinateRotation({
        reason: 'request-threshold',
        requestsSinceRotation: updated.requestCount,
      });
    }

    return null;
  }

  /**
   * Trigger rotation for rate-limit errors (HTTP 429)
   */
  async handleRateLimit(errorCode?: string): Promise<RotationOutcome> {
    return this.coordinateRotation({
      reason: 'rate-limit',
      httpStatus: 429,
      errorCode,
    });
  }

  /**
   * Start scheduled rotation loop (5-10 minutes by default)
   */
  startScheduledRotation(): void {
    if (this.scheduleTimer) {
      return;
    }

    const scheduleNext = () => {
      const interval = this.getRandomInterval();
      this.scheduleTimer = setTimeout(async () => {
        await this.coordinateRotation({ reason: 'scheduled' });
        scheduleNext();
      }, interval);
    };

    scheduleNext();
    this.logger.info('Scheduled rotation started', {
      minIntervalMs: this.config.rotationIntervalMinMs,
      maxIntervalMs: this.config.rotationIntervalMaxMs,
    });
  }

  /**
   * Stop scheduled rotation loop
   */
  stopScheduledRotation(): void {
    if (this.scheduleTimer) {
      clearTimeout(this.scheduleTimer);
      this.scheduleTimer = null;
      this.logger.info('Scheduled rotation stopped');
    }
  }

  /**
   * Execute the rotation steps atomically
   */
  private async executeRotation(context: RotationTriggerContext): Promise<RotationOutcome> {
    const rotationId = uuidv4();
    const startedAt = Date.now();

    const state = await this.getOrCreateState();
    if (state.lastRotationAt && startedAt - state.lastRotationAt < this.config.rotationCooldownMs) {
      const remainingMs = this.config.rotationCooldownMs - (startedAt - state.lastRotationAt);
      this.logger.warn('Rotation skipped due to cooldown', {
        rotationId,
        reason: context.reason,
        remainingMs,
      });
      return {
        status: 'skipped',
        rotationId,
        reason: context.reason,
        startedAt,
        skippedReason: 'cooldown-active',
      };
    }
    if (state.rotationInProgress) {
      const elapsed = state.rotationStartedAt ? Date.now() - state.rotationStartedAt : 0;
      if (elapsed < this.config.rotationLockTimeoutMs) {
        this.logger.warn('Rotation blocked by persisted lock', {
          rotationId: state.rotationId,
          elapsedMs: elapsed,
        });
        return {
          status: 'skipped',
          rotationId: state.rotationId || 'locked',
          reason: context.reason,
          startedAt,
          skippedReason: 'state-lock-active',
        };
      }
    }

    const inProgressState: SyncCoordinatorState = {
      ...state,
      rotationInProgress: true,
      rotationId,
      rotationStartedAt: startedAt,
      lastRotationReason: context.reason,
    };
    await this.stateStore.setState(inProgressState);

    let sessionSnapshot: BrowserSessionSnapshot | undefined;
    let keyRotation: KeyRotationResult | undefined;
    let ipRotation: IPRotationResult | undefined;

    try {
      await this.runPhase('pause-worker', () => this.pauseWorker(context.reason, context), {
        rotationId,
      });

      sessionSnapshot = await this.runPhase(
        'save-session',
        () => this.saveSession(context),
        { rotationId }
      );
      if (this.sessionController) {
        this.sessionController.saveSessionData(
          sessionSnapshot.cookies,
          sessionSnapshot.localStorage
        );
      }

      ipRotation = await this.runPhase(
        'rotate-ip',
        () => this.rotateIPWithFallback(context),
        { rotationId }
      );
      keyRotation = await this.runPhase(
        'rotate-key',
        () => this.rotateKeyWithFallback(context),
        { rotationId }
      );

      if (this.browserSessionAdapter.createNewSession) {
        await this.runPhase(
          'new-browser-session',
          () => this.browserSessionAdapter.createNewSession!(),
          { rotationId }
        );
      }

      const fallbackSnapshot = sessionSnapshot || this.loadSessionSnapshotFromState(state);
      if (fallbackSnapshot) {
        await this.runPhase('restore-session', () => this.restoreSession(fallbackSnapshot), {
          rotationId,
        });
      }

      await this.runPhase('resume-worker', () => this.resumeWorker(context.reason, context), {
        rotationId,
      });

      const completedAt = Date.now();
      await this.stateStore.setState({
        rotationInProgress: false,
        rotationId,
        rotationStartedAt: startedAt,
        lastRotationAt: completedAt,
        lastRotationReason: context.reason,
        lastKeyRotationAt: keyRotation?.rotatedAt,
        lastIPRotationAt: ipRotation?.rotatedAt,
        requestCount: 0,
        totalRotations: state.totalRotations + 1,
        lastSessionSnapshot: sessionSnapshot,
      });

      this.logger.info('Rotation completed', {
        rotationId,
        reason: context.reason,
      });

      return {
        status: 'completed',
        rotationId,
        reason: context.reason,
        startedAt,
        completedAt,
        keyRotation,
        ipRotation,
        sessionSnapshot,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.stateStore.setState({
        rotationInProgress: false,
        rotationId,
        rotationStartedAt: startedAt,
        lastRotationReason: context.reason,
        requestCount: state.requestCount,
        totalRotations: state.totalRotations,
        lastError: errorMessage,
        lastSessionSnapshot: sessionSnapshot,
      });

      this.logger.error('Rotation failed', {
        rotationId,
        reason: context.reason,
        error: errorMessage,
      });

      return {
        status: 'failed',
        rotationId,
        reason: context.reason,
        startedAt,
        error: errorMessage,
      };
    }
  }

  /**
   * Ensure initial state
   */
  private async getOrCreateState(): Promise<SyncCoordinatorState> {
    const existing = await this.stateStore.getState();
    if (existing) {
      return existing;
    }

    const initial: SyncCoordinatorState = {
      rotationInProgress: false,
      requestCount: 0,
      totalRotations: 0,
    };
    await this.stateStore.setState(initial);
    return initial;
  }

  /**
   * Load snapshot from persisted state when available
   */
  private loadSessionSnapshotFromState(
    state: SyncCoordinatorState
  ): BrowserSessionSnapshot | undefined {
    return state.lastSessionSnapshot;
  }

  private normalizeSnapshot(snapshot: BrowserSessionSnapshot): BrowserSessionSnapshot {
    return {
      ...snapshot,
      sessionId: snapshot.sessionId || uuidv4(),
      capturedAt: snapshot.capturedAt || Date.now(),
    };
  }

  private async getLatestSnapshot(): Promise<BrowserSessionSnapshot | null> {
    if (this.sessionStore) {
      try {
        const latest = await this.sessionStore.getLatestSession();
        if (latest) {
          return latest;
        }
      } catch (error) {
        this.logger.warn('Failed to load latest session from Redis', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const state = await this.stateStore.getState();
    return state?.lastSessionSnapshot ?? null;
  }

  private async runPhase<T>(
    phase: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    this.logger.info(`Rotation phase started: ${phase}`, metadata);
    try {
      const result = await fn();
      this.logger.info(`Rotation phase completed: ${phase}`, metadata);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Rotation phase failed: ${phase}`, {
        ...metadata,
        error: message,
      });
      throw error instanceof Error ? error : new Error(message);
    }
  }

  private async rotateKeyWithFallback(
    context: RotationTriggerContext
  ): Promise<KeyRotationResult | undefined> {
    const result = await Promise.resolve(this.keyPoolManager.rotateKey(context.reason, context));
    if (result && typeof result === 'object' && 'keyId' in result) {
      return result as KeyRotationResult;
    }

    const keyId = await this.keyPoolManager.getActiveKeyId?.();
    if (!keyId) {
      return undefined;
    }

    return {
      keyId,
      rotatedAt: Date.now(),
      reason: context.reason,
    };
  }

  private async rotateIPWithFallback(
    context: RotationTriggerContext
  ): Promise<IPRotationResult | undefined> {
    const result = await Promise.resolve(this.ipRotationManager.rotateIP(context.reason, context));
    if (result && typeof result === 'object' && 'ip' in result) {
      return result as IPRotationResult;
    }

    if (result && typeof result === 'object' && 'newIP' in result) {
      const ip = (result as { newIP?: string }).newIP;
      if (ip) {
        return {
          ip,
          rotatedAt: Date.now(),
          reason: context.reason,
        };
      }
    }

    const currentIP = await this.ipRotationManager.getCurrentIP?.();
    if (!currentIP) {
      return undefined;
    }

    return {
      ip: currentIP,
      rotatedAt: Date.now(),
      reason: context.reason,
    };
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    label: string
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${label} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Randomized interval within configured range
   */
  private getRandomInterval(): number {
    const min = this.config.rotationIntervalMinMs;
    const max = this.config.rotationIntervalMaxMs;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

export default SyncCoordinator;
