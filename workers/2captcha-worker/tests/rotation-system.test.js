"use strict";
// @ts-nocheck
/**
 * Rotation System Test Suite
 * Diagnostic sync: updated to use rotation key pool module.
 *
 * Coverage:
 * - KeyPoolManager (unit): request-threshold rotation, 429 fallback
 * - IPRotationManager (unit): router reconnect mocked, session persistence restore
 * - SyncCoordinator (integration): rotation orchestration, session storage, rate-limit
 * - End-to-end rotation: 10,000 request performance scenario (timed)
 * - Note: KeyPoolManager tests aligned to improvements implementation.
 * - Ensure mocks stay hermetic for CI.
 *
 * Notes:
 * - No real API keys used
 * - No real router reconnects executed (child_process mocked)
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck -- jest test mocks + legacy shims
/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks */
const __rotationTestMarker = true;
void __rotationTestMarker;
jest.mock('child_process', () => ({
    execFile: jest.fn((_, __, callback) => callback(null, '', '')),
}));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const key_pool_manager_1 = require("../src/rotation/key-pool-manager");
const LegacyKeyPoolManagerCtor = key_pool_manager_1.KeyPoolManager;
const ip_rotation_manager_1 = require("../src/improvements/ip-rotation-manager");
const sync_coordinator_1 = require("../src/improvements/sync-coordinator");
const createTempDir = () => fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), 'rotation-system-'));
const createFetchResponse = (body, contentType = 'application/json') => {
    return Promise.resolve({
        ok: true,
        status: 200,
        headers: {
            get: (key) => (key.toLowerCase() === 'content-type' ? contentType : null),
        },
        json: async () => JSON.parse(body),
        text: async () => body,
    });
};
const mockFetchSequence = (responses) => {
    const fetchMock = jest.fn();
    responses.forEach((body) => {
        fetchMock.mockImplementationOnce(() => createFetchResponse(body));
    });
    global.fetch = fetchMock;
};
class MemoryStateStore {
    constructor() {
        this.state = null;
    }
    async getState() {
        return this.state ? { ...this.state } : null;
    }
    async setState(state) {
        this.state = { ...state };
    }
}
class MemorySessionStore {
    constructor() {
        this.sessions = new Map();
        this.latest = null;
    }
    async saveSession(snapshot) {
        this.sessions.set(snapshot.sessionId, snapshot);
        this.latest = snapshot;
    }
    async getSession(sessionId) {
        return this.sessions.get(sessionId) ?? null;
    }
    async getLatestSession() {
        return this.latest;
    }
}
describe('Rotation System - KeyPoolManager (unit)', () => {
    const config = {
        provider: 'groq',
        keys: ['groq-key-1', 'groq-key-2'],
        fallbackKey: 'mistral-key-1',
        rotationStrategy: 'round-robin',
        maxRequestsPerKey: 3,
        rateLimitCooldownMs: 60000,
        maxConsecutiveErrors: 3,
    };
    it('rotates keys after maxRequestsPerKey is reached', async () => {
        const manager = new LegacyKeyPoolManagerCtor(config);
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
        const manager = new LegacyKeyPoolManagerCtor(config);
        manager.markKeyExhausted('groq-key-1', '429 rate limit', 60000);
        manager.markKeyExhausted('groq-key-2', '429 rate limit', 60000);
        await expect(manager.getNextKey()).rejects.toThrow(/rate limited/i);
        expect(manager.getFallbackKey()).toBe('mistral-key-1');
    });
});
describe('Rotation System - IPRotationManager (unit)', () => {
    afterEach(() => {
        delete global.fetch;
    });
    it('rotates IP with mocked router reconnect and restores session snapshot', async () => {
        const tempDir = createTempDir();
        const stateFilePath = path_1.default.join(tempDir, 'state.json');
        const bindingsFilePath = path_1.default.join(tempDir, 'bindings.json');
        const sessionFilePath = path_1.default.join(tempDir, 'sessions.json');
        const newIp = '203.0.113.20';
        const sessionSnapshot = {
            sessionId: 'session-restore',
            capturedAt: Date.now(),
            cookies: { session: 'abc' },
            localStorage: { token: 'def' },
        };
        fs_1.default.writeFileSync(sessionFilePath, JSON.stringify({ [newIp]: sessionSnapshot }, null, 2), 'utf-8');
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
        const manager = new ip_rotation_manager_1.IPRotationManager({
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
        const rotationCalls = [];
        const keyPoolManager = {
            rotateKey: jest.fn(async (_reason, _context) => {
                rotationCalls.push('key');
                return {
                    keyId: 'groq-key-2',
                    rotatedAt: Date.now(),
                    reason: 'rate-limit',
                };
            }),
            getActiveKeyId: jest.fn(async () => 'groq-key-2'),
        };
        const ipRotationManager = {
            rotateIP: jest.fn(async (_reason, _context) => {
                rotationCalls.push('ip');
                return {
                    ip: '198.51.100.10',
                    rotatedAt: Date.now(),
                    reason: 'rate-limit',
                };
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
        const coordinator = new sync_coordinator_1.SyncCoordinator({
            requestThreshold: 1000,
            rotationCooldownMs: 0,
            rotationLockTimeoutMs: 0,
        }, {
            keyPoolManager,
            ipRotationManager,
            workerController,
            browserSessionAdapter,
            stateStore,
            sessionStore,
        });
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
                };
            }),
            getActiveKeyId: jest.fn(async () => `groq-key-${rotationCount + 1}`),
        };
        const ipRotationManager = {
            rotateIP: jest.fn(async () => ({
                ip: `192.0.2.${rotationCount + 1}`,
                rotatedAt: Date.now(),
                reason: 'request-threshold',
            })),
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
        const coordinator = new sync_coordinator_1.SyncCoordinator({
            requestThreshold: 1000,
            rotationCooldownMs: 0,
            rotationLockTimeoutMs: 0,
        }, {
            keyPoolManager,
            ipRotationManager,
            workerController,
            browserSessionAdapter,
            stateStore,
            sessionStore,
        });
        const nowBase = 1700000000000;
        let nowTick = 0;
        const nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => nowBase + nowTick * 1000);
        const outcomes = [];
        for (let i = 0; i < 10000; i += 1) {
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
//# sourceMappingURL=rotation-system.test.js.map