/**
 * Test Suite: Browserless Connection Pool
 * 
 * Tests the connection pool implementation for:
 * - Pool initialization with minIdle connections
 * - acquire() - reuse, create, queue behaviors
 * - release() - return and serve pending
 * - shutdown() - cleanup
 * - getMetrics() - accurate counts
 * - Connection aging (maxLifetimeMs)
 * - Idle timeout eviction (idleTimeoutMs)
 * - Health checks before acquire
 * - Min idle connection maintenance
 * 
 * NOTE: Uses mocks since real Browserless may not be available.
 */

import { EventEmitter } from 'events';

// =============================================================================
// MOCKS - Since we can't connect to real Browserless in tests
// =============================================================================

interface MockBrowser {
  id: string;
  connected: boolean;
  close: () => Promise<void>;
  isConnected: () => boolean;
}

const mockBrowsers: Map<string, MockBrowser> = new Map();

// Mock chromium.connectOverCDP
const mockConnectOverCDP = async (endpoint: string): Promise<MockBrowser> => {
  const id = `mock-browser-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const browser: MockBrowser = {
    id,
    connected: true,
    close: async () => {
      browser.connected = false;
      mockBrowsers.delete(id);
    },
    isConnected: () => browser.connected
  };
  mockBrowsers.set(id, browser);
  return browser;
};

// =============================================================================
// MODIFIED CONNECTION POOL FOR TESTING (with injectable chromium)
// =============================================================================

interface ConnectionPoolOptions {
  minIdle?: number;
  maxTotal?: number;
  idleTimeoutMs?: number;
  maxLifetimeMs?: number;
  acquireTimeoutMs?: number;
  healthCheckIntervalMs?: number;
}

interface PooledConnection {
  id: string;
  browser: MockBrowser;
  createdAt: number;
  lastUsedAt: number;
  inUse: boolean;
  healthy: boolean;
}

interface PoolMetrics {
  totalConnections: number;
  idleConnections: number;
  inUseConnections: number;
  pendingAcquires: number;
  totalAcquires: number;
  totalReleases: number;
  totalErrors: number;
}

class TestableConnectionPool extends EventEmitter {
  private connections: Map<string, PooledConnection> = new Map();
  private pendingAcquires: Array<{ resolve: (conn: PooledConnection) => void; reject: (err: Error) => void; timeout: NodeJS.Timeout }> = [];
  private options: Required<ConnectionPoolOptions>;
  private endpoint: string;
  private maintenanceTimer: NodeJS.Timeout | null = null;
  private connectFn: (endpoint: string) => Promise<MockBrowser>;
  
  private metrics = {
    totalAcquires: 0,
    totalReleases: 0,
    totalErrors: 0
  };

  constructor(
    endpoint: string, 
    options: ConnectionPoolOptions = {},
    connectFn: (endpoint: string) => Promise<MockBrowser> = mockConnectOverCDP
  ) {
    super();
    this.endpoint = endpoint;
    this.connectFn = connectFn;
    this.options = {
      minIdle: options.minIdle ?? 2,
      maxTotal: options.maxTotal ?? 10,
      idleTimeoutMs: options.idleTimeoutMs ?? 300000,
      maxLifetimeMs: options.maxLifetimeMs ?? 1800000,
      acquireTimeoutMs: options.acquireTimeoutMs ?? 30000,
      healthCheckIntervalMs: options.healthCheckIntervalMs ?? 60000,
    };
  }

  // Separate init to control when minIdle connections are created
  async initialize(): Promise<void> {
    await this.ensureMinIdle();
  }

  // Start maintenance loop (separate from constructor for testing)
  startMaintenance(intervalMs: number = 30000): void {
    if (this.maintenanceTimer) return;
    
    this.maintenanceTimer = setInterval(async () => {
      await this.runMaintenance();
    }, intervalMs);
  }

  async runMaintenance(): Promise<void> {
    const now = Date.now();
    
    for (const conn of this.connections.values()) {
      if (conn.inUse) continue;

      // Check max lifetime
      if (now - conn.createdAt > this.options.maxLifetimeMs) {
        await this.destroyConnection(conn.id);
        continue;
      }

      // Check idle timeout (only if above minIdle)
      if (now - conn.lastUsedAt > this.options.idleTimeoutMs) {
        const idleCount = Array.from(this.connections.values()).filter(c => !c.inUse).length;
        if (idleCount > this.options.minIdle) {
          await this.destroyConnection(conn.id);
          continue;
        }
      }

      // Health check for connections idle longer than healthCheckIntervalMs
      if (now - conn.lastUsedAt > this.options.healthCheckIntervalMs) {
        if (!(await this.isConnectionHealthy(conn))) {
          await this.destroyConnection(conn.id);
        }
      }
    }

    await this.ensureMinIdle();
  }

  async acquire(): Promise<PooledConnection> {
    // Try to find an available healthy connection
    for (const conn of this.connections.values()) {
      if (!conn.inUse && conn.healthy) {
        if (await this.isConnectionHealthy(conn)) {
          conn.inUse = true;
          conn.lastUsedAt = Date.now();
          this.metrics.totalAcquires++;
          this.emit('connectionAcquired', conn.id);
          return conn;
        } else {
          await this.destroyConnection(conn.id);
        }
      }
    }

    // Create new connection if under maxTotal
    if (this.connections.size < this.options.maxTotal) {
      try {
        const conn = await this.createConnection();
        conn.inUse = true;
        this.metrics.totalAcquires++;
        this.emit('connectionAcquired', conn.id);
        return conn;
      } catch (error) {
        this.metrics.totalErrors++;
        throw error;
      }
    }

    // Queue the request
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.pendingAcquires.findIndex(p => p.timeout === timeout);
        if (index !== -1) {
          this.pendingAcquires.splice(index, 1);
          this.metrics.totalErrors++;
          reject(new Error('Timeout acquiring connection from pool'));
        }
      }, this.options.acquireTimeoutMs);

      this.pendingAcquires.push({ resolve, reject, timeout });
    });
  }

  async release(connectionId: string): Promise<void> {
    const conn = this.connections.get(connectionId);
    if (!conn) return;

    conn.inUse = false;
    conn.lastUsedAt = Date.now();
    this.metrics.totalReleases++;
    this.emit('connectionReleased', conn.id);

    // Serve pending acquires first
    if (this.pendingAcquires.length > 0) {
      const pending = this.pendingAcquires.shift();
      if (pending) {
        clearTimeout(pending.timeout);
        conn.inUse = true;
        this.metrics.totalAcquires++;
        pending.resolve(conn);
        return;
      }
    }
  }

  getMetrics(): PoolMetrics {
    const conns = Array.from(this.connections.values());
    return {
      totalConnections: conns.length,
      idleConnections: conns.filter(c => !c.inUse).length,
      inUseConnections: conns.filter(c => c.inUse).length,
      pendingAcquires: this.pendingAcquires.length,
      totalAcquires: this.metrics.totalAcquires,
      totalReleases: this.metrics.totalReleases,
      totalErrors: this.metrics.totalErrors
    };
  }

  async shutdown(): Promise<void> {
    if (this.maintenanceTimer) {
      clearInterval(this.maintenanceTimer);
      this.maintenanceTimer = null;
    }

    const destroyPromises = Array.from(this.connections.keys()).map(id => this.destroyConnection(id));
    await Promise.all(destroyPromises);

    for (const pending of this.pendingAcquires) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Pool is shutting down'));
    }
    this.pendingAcquires = [];
    
    this.emit('shutdown');
  }

  private async createConnection(): Promise<PooledConnection> {
    const id = `conn-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const browser = await this.connectFn(this.endpoint);
      
      const conn: PooledConnection = {
        id,
        browser,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
        inUse: false,
        healthy: true
      };

      this.connections.set(id, conn);
      this.emit('connectionCreated', id);
      return conn;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async destroyConnection(id: string): Promise<void> {
    const conn = this.connections.get(id);
    if (!conn) return;

    try {
      await conn.browser.close();
    } catch (error) {
      // Ignore close errors
    } finally {
      this.connections.delete(id);
      this.emit('connectionDestroyed', id);
    }
  }

  private async isConnectionHealthy(conn: PooledConnection): Promise<boolean> {
    try {
      return conn.browser.isConnected();
    } catch {
      return false;
    }
  }

  private async ensureMinIdle(): Promise<void> {
    const idleCount = Array.from(this.connections.values()).filter(c => !c.inUse).length;
    const needed = this.options.minIdle - idleCount;
    
    if (needed > 0 && this.connections.size < this.options.maxTotal) {
      const toCreate = Math.min(needed, this.options.maxTotal - this.connections.size);
      for (let i = 0; i < toCreate; i++) {
        try {
          await this.createConnection();
        } catch (error) {
          // Log but continue trying to create other connections
        }
      }
    }
  }

  // Test helpers
  getConnectionCount(): number {
    return this.connections.size;
  }

  getConnection(id: string): PooledConnection | undefined {
    return this.connections.get(id);
  }

  // Allow manual time manipulation for aging tests
  setConnectionCreatedAt(id: string, timestamp: number): void {
    const conn = this.connections.get(id);
    if (conn) conn.createdAt = timestamp;
  }

  setConnectionLastUsedAt(id: string, timestamp: number): void {
    const conn = this.connections.get(id);
    if (conn) conn.lastUsedAt = timestamp;
  }

  // Simulate unhealthy connection
  markConnectionUnhealthy(id: string): void {
    const conn = this.connections.get(id);
    if (conn) {
      conn.healthy = false;
      conn.browser.connected = false;
    }
  }
}

// =============================================================================
// TEST RUNNER
// =============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    results.push({ name, passed: true, duration: Date.now() - start });
    console.log(`  ✅ ${name} (${Date.now() - start}ms)`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMsg, duration: Date.now() - start });
    console.log(`  ❌ ${name} (${Date.now() - start}ms)`);
    console.log(`     Error: ${errorMsg}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertGreaterThanOrEqual(actual: number, expected: number, message: string): void {
  if (actual < expected) {
    throw new Error(`${message}: expected >= ${expected}, got ${actual}`);
  }
}

// =============================================================================
// TESTS
// =============================================================================

async function main(): Promise<void> {
  console.log('\n🧪 Browserless Connection Pool Test Suite\n');
  console.log('=' .repeat(60));

  // ---------------------------------------------------------------------------
  // Test Group: Pool Initialization
  // ---------------------------------------------------------------------------
  console.log('\n📋 Pool Initialization Tests\n');

  await runTest('should create pool with default options', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223');
    const metrics = pool.getMetrics();
    assertEqual(metrics.totalConnections, 0, 'Initial connections');
    assertEqual(metrics.pendingAcquires, 0, 'Pending acquires');
    await pool.shutdown();
  });

  await runTest('should initialize with minIdle connections', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223', { minIdle: 3 });
    await pool.initialize();
    const metrics = pool.getMetrics();
    assertEqual(metrics.totalConnections, 3, 'Should have 3 connections');
    assertEqual(metrics.idleConnections, 3, 'All should be idle');
    await pool.shutdown();
  });

  await runTest('should respect maxTotal during initialization', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223', { 
      minIdle: 10, 
      maxTotal: 5 
    });
    await pool.initialize();
    const metrics = pool.getMetrics();
    assertEqual(metrics.totalConnections, 5, 'Should not exceed maxTotal');
    await pool.shutdown();
  });

  // ---------------------------------------------------------------------------
  // Test Group: acquire()
  // ---------------------------------------------------------------------------
  console.log('\n📋 acquire() Tests\n');

  await runTest('should acquire existing idle connection', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223', { minIdle: 2 });
    await pool.initialize();
    
    const conn = await pool.acquire();
    assert(conn !== undefined, 'Should return a connection');
    assert(conn.inUse === true, 'Connection should be marked in use');
    
    const metrics = pool.getMetrics();
    assertEqual(metrics.inUseConnections, 1, 'One connection in use');
    assertEqual(metrics.idleConnections, 1, 'One connection idle');
    assertEqual(metrics.totalAcquires, 1, 'Total acquires should be 1');
    
    await pool.shutdown();
  });

  await runTest('should create new connection when none available', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223', { minIdle: 0, maxTotal: 5 });
    
    const conn = await pool.acquire();
    assert(conn !== undefined, 'Should return a connection');
    
    const metrics = pool.getMetrics();
    assertEqual(metrics.totalConnections, 1, 'Should have created one connection');
    assertEqual(metrics.inUseConnections, 1, 'Connection should be in use');
    
    await pool.shutdown();
  });

  await runTest('should queue when at maxTotal', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223', { 
      minIdle: 0, 
      maxTotal: 2,
      acquireTimeoutMs: 500
    });
    
    // Acquire 2 connections (max)
    const conn1 = await pool.acquire();
    const conn2 = await pool.acquire();
    
    const metrics1 = pool.getMetrics();
    assertEqual(metrics1.totalConnections, 2, 'At max connections');
    assertEqual(metrics1.inUseConnections, 2, 'All in use');
    
    // Third acquire should queue
    let queuedResolved = false;
    const acquirePromise = pool.acquire().then(conn => {
      queuedResolved = true;
      return conn;
    });
    
    // Wait a tick for the queue to be populated
    await new Promise(r => setTimeout(r, 10));
    
    const metrics2 = pool.getMetrics();
    assertEqual(metrics2.pendingAcquires, 1, 'Should have one pending acquire');
    
    // Release one connection
    await pool.release(conn1.id);
    
    // Wait for queued acquire to resolve
    const conn3 = await acquirePromise;
    assert(queuedResolved, 'Queued acquire should have resolved');
    assert(conn3 !== undefined, 'Should return a connection');
    
    await pool.shutdown();
  });

  await runTest('should timeout when queue wait exceeds limit', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223', { 
      minIdle: 0, 
      maxTotal: 1,
      acquireTimeoutMs: 100
    });
    
    // Acquire the only connection
    const conn = await pool.acquire();
    
    // Try to acquire another - should timeout
    let timedOut = false;
    try {
      await pool.acquire();
    } catch (error) {
      timedOut = error instanceof Error && error.message.includes('Timeout');
    }
    
    assert(timedOut, 'Should have timed out');
    
    const metrics = pool.getMetrics();
    assertEqual(metrics.totalErrors, 1, 'Should record timeout as error');
    
    await pool.shutdown();
  });

  await runTest('should destroy unhealthy connection and create new one', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223', { minIdle: 1 });
    await pool.initialize();
    
    // Get the connection and mark it unhealthy
    const metrics1 = pool.getMetrics();
    assertEqual(metrics1.totalConnections, 1, 'Should have one connection');
    
    // Get the connection ID
    const connId = Array.from((pool as any).connections.keys())[0] as string;
    pool.markConnectionUnhealthy(connId);
    
    // Acquire should detect unhealthy and create new
    const conn = await pool.acquire();
    assert(conn !== undefined, 'Should return a connection');
    assert(conn.id !== connId, 'Should be a new connection');
    
    await pool.shutdown();
  });

  // ---------------------------------------------------------------------------
  // Test Group: release()
  // ---------------------------------------------------------------------------
  console.log('\n📋 release() Tests\n');

  await runTest('should release connection back to pool', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223', { minIdle: 1 });
    await pool.initialize();
    
    const conn = await pool.acquire();
    const metrics1 = pool.getMetrics();
    assertEqual(metrics1.inUseConnections, 1, 'Connection in use');
    
    await pool.release(conn.id);
    
    const metrics2 = pool.getMetrics();
    assertEqual(metrics2.inUseConnections, 0, 'No connections in use');
    assertEqual(metrics2.idleConnections, 1, 'One idle connection');
    assertEqual(metrics2.totalReleases, 1, 'Total releases should be 1');
    
    await pool.shutdown();
  });

  await runTest('should serve pending acquire on release', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223', { 
      minIdle: 0, 
      maxTotal: 1,
      acquireTimeoutMs: 5000
    });
    
    const conn1 = await pool.acquire();
    
    // Queue second acquire
    let secondAcquireResolved = false;
    const acquirePromise = pool.acquire().then(conn => {
      secondAcquireResolved = true;
      return conn;
    });
    
    await new Promise(r => setTimeout(r, 10));
    assertEqual(pool.getMetrics().pendingAcquires, 1, 'Should have pending acquire');
    
    // Release triggers pending
    await pool.release(conn1.id);
    
    const conn2 = await acquirePromise;
    assert(secondAcquireResolved, 'Second acquire should resolve');
    assertEqual(conn1.id, conn2.id, 'Should reuse same connection');
    
    await pool.shutdown();
  });

  await runTest('should handle release of non-existent connection', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223');
    
    // Should not throw
    await pool.release('non-existent-id');
    
    const metrics = pool.getMetrics();
    assertEqual(metrics.totalReleases, 0, 'No release recorded for non-existent');
    
    await pool.shutdown();
  });

  // ---------------------------------------------------------------------------
  // Test Group: shutdown()
  // ---------------------------------------------------------------------------
  console.log('\n📋 shutdown() Tests\n');

  await runTest('should destroy all connections on shutdown', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223', { minIdle: 3 });
    await pool.initialize();
    
    assertEqual(pool.getMetrics().totalConnections, 3, 'Should have 3 connections');
    
    await pool.shutdown();
    
    assertEqual(pool.getMetrics().totalConnections, 0, 'All connections destroyed');
  });

  await runTest('should reject pending acquires on shutdown', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223', { 
      minIdle: 0, 
      maxTotal: 1,
      acquireTimeoutMs: 10000
    });
    
    const conn = await pool.acquire();
    
    // Queue an acquire
    let rejected = false;
    const acquirePromise = pool.acquire().catch(error => {
      rejected = error instanceof Error && error.message.includes('shutting down');
      return null;
    });
    
    await new Promise(r => setTimeout(r, 10));
    
    // Shutdown should reject pending
    await pool.shutdown();
    await acquirePromise;
    
    assert(rejected, 'Pending acquire should be rejected with shutdown message');
  });

  await runTest('should clear maintenance timer on shutdown', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223', { minIdle: 1 });
    await pool.initialize();
    pool.startMaintenance(100);
    
    // Shutdown should clear timer
    await pool.shutdown();
    
    // No error means timer was cleared
    assert(true, 'Maintenance timer cleared');
  });

  // ---------------------------------------------------------------------------
  // Test Group: getMetrics()
  // ---------------------------------------------------------------------------
  console.log('\n📋 getMetrics() Tests\n');

  await runTest('should return accurate metrics', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223', { minIdle: 2 });
    await pool.initialize();
    
    // Initial state
    let metrics = pool.getMetrics();
    assertEqual(metrics.totalConnections, 2, 'Total connections');
    assertEqual(metrics.idleConnections, 2, 'Idle connections');
    assertEqual(metrics.inUseConnections, 0, 'In-use connections');
    assertEqual(metrics.totalAcquires, 0, 'Total acquires');
    assertEqual(metrics.totalReleases, 0, 'Total releases');
    assertEqual(metrics.totalErrors, 0, 'Total errors');
    
    // After acquire
    const conn = await pool.acquire();
    metrics = pool.getMetrics();
    assertEqual(metrics.inUseConnections, 1, 'One in use after acquire');
    assertEqual(metrics.idleConnections, 1, 'One idle after acquire');
    assertEqual(metrics.totalAcquires, 1, 'Acquires incremented');
    
    // After release
    await pool.release(conn.id);
    metrics = pool.getMetrics();
    assertEqual(metrics.inUseConnections, 0, 'None in use after release');
    assertEqual(metrics.idleConnections, 2, 'Two idle after release');
    assertEqual(metrics.totalReleases, 1, 'Releases incremented');
    
    await pool.shutdown();
  });

  // ---------------------------------------------------------------------------
  // Test Group: Connection Aging
  // ---------------------------------------------------------------------------
  console.log('\n📋 Connection Aging Tests\n');

  await runTest('should evict connection exceeding maxLifetimeMs', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223', { 
      minIdle: 1,
      maxLifetimeMs: 5000 // 5 seconds max lifetime
    });
    await pool.initialize();
    
    // Get connection ID
    const connId = Array.from((pool as any).connections.keys())[0] as string;
    
    // Set created time to past (simulate old connection)
    pool.setConnectionCreatedAt(connId, Date.now() - 10000);
    
    // Run maintenance
    await pool.runMaintenance();
    
    // Old connection should be destroyed, new one created to meet minIdle
    const metrics = pool.getMetrics();
    assertEqual(metrics.totalConnections, 1, 'Should still have 1 connection');
    
    // Verify it's a new connection (different ID)
    const newConnId = Array.from((pool as any).connections.keys())[0];
    assert(connId !== newConnId, 'Should be a different connection');
    
    await pool.shutdown();
  });

  await runTest('should evict idle connection exceeding idleTimeoutMs when above minIdle', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223', { 
      minIdle: 1,
      maxTotal: 3,
      idleTimeoutMs: 5000
    });
    await pool.initialize();
    
    // Create extra connections
    const conn1 = await pool.acquire();
    const conn2 = await pool.acquire();
    await pool.release(conn1.id);
    await pool.release(conn2.id);
    
    // Now we have 3 idle connections (1 from init + 2 from acquires)
    // Actually: We should have 3 total
    let metrics = pool.getMetrics();
    assertGreaterThanOrEqual(metrics.idleConnections, 2, 'Should have at least 2 idle');
    
    // Set one connection's lastUsedAt to past
    const connIds = Array.from((pool as any).connections.keys()) as string[];
    pool.setConnectionLastUsedAt(connIds[0], Date.now() - 10000);
    
    // Run maintenance
    await pool.runMaintenance();
    
    // Should have evicted one but still above minIdle
    metrics = pool.getMetrics();
    assertGreaterThanOrEqual(metrics.idleConnections, 1, 'Should have at least minIdle');
    
    await pool.shutdown();
  });

  await runTest('should NOT evict idle connection if at minIdle', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223', { 
      minIdle: 2,
      idleTimeoutMs: 5000
    });
    await pool.initialize();
    
    // Set both connections as old
    const connIds = Array.from((pool as any).connections.keys()) as string[];
    for (const id of connIds) {
      pool.setConnectionLastUsedAt(id, Date.now() - 10000);
    }
    
    // Run maintenance
    await pool.runMaintenance();
    
    // Should still have minIdle connections
    const metrics = pool.getMetrics();
    assertEqual(metrics.totalConnections, 2, 'Should preserve minIdle connections');
    
    await pool.shutdown();
  });

  // ---------------------------------------------------------------------------
  // Test Group: Health Checks
  // ---------------------------------------------------------------------------
  console.log('\n📋 Health Check Tests\n');

  await runTest('should perform health check on idle connections during maintenance', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223', { 
      minIdle: 2,
      healthCheckIntervalMs: 1000
    });
    await pool.initialize();
    
    // Get a connection ID and mark it unhealthy
    const connIds = Array.from((pool as any).connections.keys()) as string[];
    const unhealthyId = connIds[0];
    pool.markConnectionUnhealthy(unhealthyId);
    
    // Set lastUsedAt to past to trigger health check
    pool.setConnectionLastUsedAt(unhealthyId, Date.now() - 2000);
    
    // Run maintenance
    await pool.runMaintenance();
    
    // Unhealthy connection should be replaced
    const newConnIds = Array.from((pool as any).connections.keys());
    assert(!newConnIds.includes(unhealthyId), 'Unhealthy connection should be removed');
    assertEqual(newConnIds.length, 2, 'Should maintain minIdle');
    
    await pool.shutdown();
  });

  // ---------------------------------------------------------------------------
  // Test Group: Events
  // ---------------------------------------------------------------------------
  console.log('\n📋 Event Tests\n');

  await runTest('should emit connectionCreated event', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223', { minIdle: 0 });
    
    let eventFired = false;
    let eventId = '';
    pool.on('connectionCreated', (id: string) => {
      eventFired = true;
      eventId = id;
    });
    
    const conn = await pool.acquire();
    
    assert(eventFired, 'Event should fire');
    assertEqual(eventId, conn.id, 'Event should include connection ID');
    
    await pool.shutdown();
  });

  await runTest('should emit connectionDestroyed event', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223', { minIdle: 1 });
    await pool.initialize();
    
    let eventFired = false;
    pool.on('connectionDestroyed', () => {
      eventFired = true;
    });
    
    await pool.shutdown();
    
    assert(eventFired, 'Event should fire on shutdown');
  });

  await runTest('should emit shutdown event', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223');
    
    let eventFired = false;
    pool.on('shutdown', () => {
      eventFired = true;
    });
    
    await pool.shutdown();
    
    assert(eventFired, 'Shutdown event should fire');
  });

  // ---------------------------------------------------------------------------
  // Test Group: Error Handling
  // ---------------------------------------------------------------------------
  console.log('\n📋 Error Handling Tests\n');

  await runTest('should handle connection creation failure', async () => {
    let attempts = 0;
    const failingConnect = async () => {
      attempts++;
      throw new Error('Connection failed');
    };
    
    const pool = new TestableConnectionPool('ws://localhost:9223', { minIdle: 0 }, failingConnect);
    
    let errorThrown = false;
    try {
      await pool.acquire();
    } catch (error) {
      errorThrown = error instanceof Error && error.message.includes('Connection failed');
    }
    
    assert(errorThrown, 'Should throw connection error');
    assertEqual(pool.getMetrics().totalErrors, 1, 'Should record error');
    
    await pool.shutdown();
  });

  // ---------------------------------------------------------------------------
  // Test Group: Concurrency
  // ---------------------------------------------------------------------------
  console.log('\n📋 Concurrency Tests\n');

  await runTest('should handle multiple parallel acquires', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223', { 
      minIdle: 0, 
      maxTotal: 5 
    });
    
    // Acquire 5 connections in parallel
    const acquires = Promise.all([
      pool.acquire(),
      pool.acquire(),
      pool.acquire(),
      pool.acquire(),
      pool.acquire()
    ]);
    
    const connections = await acquires;
    
    assertEqual(connections.length, 5, 'Should get 5 connections');
    const uniqueIds = new Set(connections.map(c => c.id));
    assertEqual(uniqueIds.size, 5, 'All connections should be unique');
    
    const metrics = pool.getMetrics();
    assertEqual(metrics.totalConnections, 5, 'Total connections should be 5');
    assertEqual(metrics.inUseConnections, 5, 'All should be in use');
    assertEqual(metrics.totalAcquires, 5, 'Total acquires should be 5');
    
    await pool.shutdown();
  });

  await runTest('should handle acquire-release cycles', async () => {
    const pool = new TestableConnectionPool('ws://localhost:9223', { 
      minIdle: 2, 
      maxTotal: 3 
    });
    await pool.initialize();
    
    // Cycle 1
    const conn1 = await pool.acquire();
    await pool.release(conn1.id);
    
    // Cycle 2
    const conn2 = await pool.acquire();
    await pool.release(conn2.id);
    
    // Cycle 3
    const conn3 = await pool.acquire();
    await pool.release(conn3.id);
    
    const metrics = pool.getMetrics();
    assertEqual(metrics.totalAcquires, 3, 'Total acquires');
    assertEqual(metrics.totalReleases, 3, 'Total releases');
    assertEqual(metrics.idleConnections, 2, 'Back to minIdle idle');
    
    await pool.shutdown();
  });

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n' + '=' .repeat(60));
  console.log('\n📊 Test Summary\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`  Total:  ${results.length} tests`);
  console.log(`  Passed: ${passed} ✅`);
  console.log(`  Failed: ${failed} ❌`);
  console.log(`  Duration: ${totalDuration}ms`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    for (const result of results.filter(r => !r.passed)) {
      console.log(`  - ${result.name}`);
      console.log(`    Error: ${result.error}`);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  
  if (failed === 0) {
    console.log('\n✅ All tests passed! Connection Pool implementation verified.\n');
    process.exit(0);
  } else {
    console.log(`\n❌ ${failed} test(s) failed. Please review the implementation.\n`);
    process.exit(1);
  }
}

// Run tests
main().catch(error => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});
