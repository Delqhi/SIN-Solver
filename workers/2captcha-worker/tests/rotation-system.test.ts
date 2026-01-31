// @ts-nocheck
/**
 * Rotation System Test Suite
 *
 * Coverage:
 * - KeyPoolManager (unit): request-threshold rotation, 429 fallback
 * - IPRotationManager (unit): router reconnect mocked, session persistence restore
 * - SyncCoordinator (integration): rotation orchestration, session storage, rate-limit
 * - End-to-end rotation: 10,000 request performance scenario (timed)
 *
 * Notes:
 * - No real API keys used
 * - No real router reconnects executed (child_process mocked)
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */

jest.mock('child_process', () => ({
  execFile: jest.fn((_: string, __: string[], callback: (err: Error | null, stdout?: string, stderr?: string) => void) =>
    callback(null, '', '')
  ),
}));

import fs from 'fs';
import os from 'os';
import path from 'path';
import { KeyPoolManager } from '../src/improvements/key-pool-manager';
import { IPRotationManager as AdvancedIPRotationManager } from '../src/improvements/ip-rotation-manager';
import {
  SyncCoordinator,
  type BrowserSessionSnapshot,
  type IPRotationResult,
  type KeyRotationResult,
  type RotationOutcome,
  type RotationTriggerContext,
  type SyncCoordinatorState,
  type SyncCoordinatorStateStore,
  type SessionStore,
} from '../src/improvements/sync-coordinator';

const createTempDir = (): string => fs.mkdtempSync(path.join(os.tmpdir(), 'rotation-system-'));

const createFetchResponse = (body: string, contentType: string = 'application/json') => {
  return Promise.resolve({
    ok: true,
    status: 200,
    headers: {
      get: (key: string) => (key.toLowerCase() === 'content-type' ? contentType : null),
    },
    json: async () => JSON.parse(body) as unknown,
    text: async () => body,
  });
};

const mockFetchSequence = (responses: string[]): void => {
  const fetchMock = jest.fn();
  responses.forEach((body) => {
    fetchMock.mockImplementationOnce(() => createFetchResponse(body));
  });
  (global as any).fetch = fetchMock;
};

class MemoryStateStore implements SyncCoordinatorStateStore {
  private state: SyncCoordinatorState | null = null;

  async getState(): Promise<SyncCoordinatorState | null> {
    return this.state ? { ...this.state } : null;
  }

  async setState(state: SyncCoordinatorState): Promise<void> {
    this.state = { ...state };
  }
}

class MemorySessionStore implements SessionStore {
  private sessions = new Map<string, BrowserSessionSnapshot>();
  private latest: BrowserSessionSnapshot | null = null;

  async saveSession(snapshot: BrowserSessionSnapshot): Promise<void> {
    this.sessions.set(snapshot.sessionId, snapshot);
    this.latest = snapshot;
  }

  async getSession(sessionId: string): Promise<BrowserSessionSnapshot | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async getLatestSession(): Promise<BrowserSessionSnapshot | null> {
    return this.latest;
  }
}

describe('Rotation System - KeyPoolManager (unit)', () => {
  const config = {
    provider: 'groq',
    keys: ['groq-key-1', 'groq-key-2'],
    fallbackKey: 'mistral-key-1',
    rotationStrategy: 'round-robin' as const,
    maxRequestsPerKey: 3,
    rateLimitCooldownMs: 60_000,
    maxConsecutiveErrors: 3,
  };

  it('rotates keys after maxRequestsPerKey is reached', async () => {
    const manager = new KeyPoolManager(config);
    const firstKey = await manager.getNextKey();

    for (let i = 1; i < (config.maxRequestsPerKey ?? 0); i += 1) {
      const key = await manager.getNextKey();
      expect(key).toBe(firstKey);
    }

    const rotatedKey = await manager.getNextKey();
    expect(rotatedKey).toBe('groq-key-2');
    expect(rotatedKey).not.toBe(firstKey);
  });

  it('exposes fallback key when all Groq keys are rate-limited', async () => {
    const manager = new KeyPoolManager(config);

    manager.markKeyExhausted('groq-key-1', '429 rate limit', 60_000);
    manager.markKeyExhausted('groq-key-2', '429 rate limit', 60_000);

    await expect(manager.getNextKey()).rejects.toThrow(/rate limited/i);
    expect(manager.getFallbackKey()).toBe('mistral-key-1');
  });
});

describe('Rotation System - IPRotationManager (unit)', () => {
  afterEach(() => {
    delete (global as any).fetch;
  });

  it('rotates IP with mocked router reconnect and restores session snapshot', async () => {
    const tempDir = createTempDir();
    const stateFilePath = path.join(tempDir, 'state.json');
    const bindingsFilePath = path.join(tempDir, 'bindings.json');
    const sessionFilePath = path.join(tempDir, 'sessions.json');

    const newIp = '203.0.113.20';
    const sessionSnapshot: BrowserSessionSnapshot = {
      sessionId: 'session-restore',
      capturedAt: Date.now(),
      cookies: { session: 'abc' },
      localStorage: { token: 'def' },
    };

    fs.writeFileSync(
      sessionFilePath,
      JSON.stringify({ [newIp]: sessionSnapshot }, null, 2),
      'utf-8'
    );

    mockFetchSequence([
      JSON.stringify({ ip: '203.0.113.10' }),
      JSON.stringify({ ip: newIp }),
    ]);

    const sessionRestoreHandler = jest.fn().mockResolvedValue(undefined);
    const sessionSnapshotProvider = jest.fn().mockResolvedValue({
      sessionId: 'session-current',
      cookies: { session: 'xyz' },
      localStorage: { token: 'uvw' },
    });

    const manager = new AdvancedIPRotationManager({
      stateFilePath,
      bindingsFilePath,
      sessionFilePath,
      sessionRestoreHandler,
      sessionSnapshotProvider,
    });

    await manager.getCurrentIP();
    const reconnectSpy = jest
      .spyOn(manager, 'reconnectRouter')
      .mockResolvedValue(undefined);

    const result = await manager.rotateIP();

    expect(reconnectSpy).toHaveBeenCalledTimes(1);
    expect(result.newIP).toBe(newIp);
    expect(sessionSnapshotProvider).toHaveBeenCalledTimes(1);
    expect(sessionRestoreHandler).toHaveBeenCalledWith(sessionSnapshot);
  });
});

describe('Rotation System - SyncCoordinator (integration)', () => {
  it('coordinates key + IP rotation with session persistence on rate-limit', async () => {
    const stateStore = new MemoryStateStore();
    const sessionStore = new MemorySessionStore();

    const rotationCalls: string[] = [];
    const keyPoolManager = {
      rotateKey: jest.fn(async (_reason: string, _context?: RotationTriggerContext) => {
        rotationCalls.push('key');
        return {
          keyId: 'groq-key-2',
          rotatedAt: Date.now(),
          reason: 'rate-limit',
        } satisfies KeyRotationResult;
      }),
      getActiveKeyId: jest.fn(async () => 'groq-key-2'),
    };

    const ipRotationManager = {
      rotateIP: jest.fn(async (_reason: string, _context?: RotationTriggerContext) => {
        rotationCalls.push('ip');
        return {
          ip: '198.51.100.10',
          rotatedAt: Date.now(),
          reason: 'rate-limit',
        } satisfies IPRotationResult;
      }),
      getCurrentIP: jest.fn(async () => '198.51.100.10'),
    };

    const workerController = {
      pause: jest.fn(async () => undefined),
      resume: jest.fn(async () => undefined),
    };

    const browserSessionAdapter = {
      captureSession: jest.fn(async () => ({
        sessionId: 'session-1',
        capturedAt: Date.now(),
        cookies: { session: 'abc' },
        localStorage: { token: 'def' },
      })),
      restoreSession: jest.fn(async () => undefined),
      createNewSession: jest.fn(async () => undefined),
    };

    const coordinator = new SyncCoordinator(
      {
        requestThreshold: 1000,
        rotationLockTimeoutMs: 0,
      },
      {
        keyPoolManager,
        ipRotationManager,
        workerController,
        browserSessionAdapter,
        stateStore,
        sessionStore,
      }
    );

    const outcome = await coordinator.handleRateLimit('GROQ_429');

    expect(outcome.status).toBe('completed');
    expect(rotationCalls).toContain('key');
    expect(rotationCalls).toContain('ip');
    expect(workerController.pause).toHaveBeenCalledTimes(1);
    expect(workerController.resume).toHaveBeenCalledTimes(1);

    const latestSession = await sessionStore.getLatestSession();
    expect(latestSession?.sessionId).toBe('session-1');
  });
});

describe('Rotation System - End-to-End (10,000 requests)', () => {
  it('processes 10,000 requests with scheduled rotations', async () => {
    const stateStore = new MemoryStateStore();
    const sessionStore = new MemorySessionStore();
    let rotationCount = 0;

    const keyPoolManager = {
      rotateKey: jest.fn(async () => {
        rotationCount += 1;
        return {
          keyId: `groq-key-${rotationCount + 1}`,
          rotatedAt: Date.now(),
          reason: 'request-threshold',
        } satisfies KeyRotationResult;
      }),
      getActiveKeyId: jest.fn(async () => `groq-key-${rotationCount + 1}`),
    };

    const ipRotationManager = {
      rotateIP: jest.fn(async () => ({
        ip: `192.0.2.${rotationCount + 1}`,
        rotatedAt: Date.now(),
        reason: 'request-threshold',
      } satisfies IPRotationResult)),
      getCurrentIP: jest.fn(async () => `192.0.2.${rotationCount + 1}`),
    };

    const workerController = {
      pause: jest.fn(async () => undefined),
      resume: jest.fn(async () => undefined),
    };

    const browserSessionAdapter = {
      captureSession: jest.fn(async () => ({
        sessionId: `session-${rotationCount + 1}`,
        capturedAt: Date.now(),
        cookies: { session: `cookie-${rotationCount + 1}` },
        localStorage: { token: `token-${rotationCount + 1}` },
      })),
      restoreSession: jest.fn(async () => undefined),
    };

    const coordinator = new SyncCoordinator(
      {
        requestThreshold: 1000,
        rotationLockTimeoutMs: 0,
      },
      {
        keyPoolManager,
        ipRotationManager,
        workerController,
        browserSessionAdapter,
        stateStore,
        sessionStore,
      }
    );

    const nowBase = 1_700_000_000_000;
    let nowTick = 0;
    const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => nowBase + nowTick * 1000);

    const outcomes: RotationOutcome[] = [];
    for (let i = 0; i < 10_000; i += 1) {
      nowTick += 1;
      const outcome = await coordinator.recordRequest();
      if (outcome) {
        outcomes.push(outcome);
      }
    }

    nowSpy.mockRestore();

    expect(outcomes.length).toBe(10);
    expect(rotationCount).toBe(10);

    const finalState = await stateStore.getState();
    expect(finalState?.totalRotations).toBe(10);
  });
});
