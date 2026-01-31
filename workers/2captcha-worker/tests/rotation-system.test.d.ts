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
declare module '../src/rotation/key-pool-manager' {
    interface KeyPoolManager {
        getActiveKey(now?: number): {
            provider: string;
            apiKey: string | null;
            reason: string;
        };
        recordSuccess(apiKey: string, now?: number): void;
        recordFailure(apiKey: string, errorCode?: number, now?: number): void;
    }
    interface KeyPoolManagerConstructor {
        new (keys: string[], options: Record<string, unknown>): KeyPoolManager;
    }
    const KeyPoolManager: KeyPoolManagerConstructor;
    export { KeyPoolManager };
}
export {};
//# sourceMappingURL=rotation-system.test.d.ts.map
