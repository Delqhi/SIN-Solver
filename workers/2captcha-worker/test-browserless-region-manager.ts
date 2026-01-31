import { 
  BrowserlessRegionManager, 
  Region, 
  RegionLatency, 
  RegionManagerOptions 
} from './src/browserless-region-manager';

class TestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => Promise<void>) {
    this.tests.push({ name, fn });
  }

  async run(): Promise<void> {
    console.log('🧪 Browserless Region Manager Tests\n');
    console.log('=' .repeat(60));

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        this.passed++;
        console.log(`✅ ${name}`);
      } catch (error) {
        this.failed++;
        console.log(`❌ ${name}`);
        console.log(`   Error: ${(error as Error).message}`);
      }
    }

    console.log('=' .repeat(60));
    console.log(`\n📊 Results: ${this.passed}/${this.tests.length} passed`);
    
    process.exit(this.failed > 0 ? 1 : 0);
  }
}

const runner = new TestRunner();

// ============================================================================
// Constructor & Initialization Tests
// ============================================================================

runner.test('Should initialize with empty regions array', async () => {
  const manager = new BrowserlessRegionManager();
  
  const regions = manager.getAllRegions();
  
  if (regions.length !== 0) {
    throw new Error(`Expected 0 regions, got ${regions.length}`);
  }
});

runner.test('Should initialize with provided regions', async () => {
  const regions: Region[] = [
    { id: 'us-east', name: 'US East', endpoint: 'ws://localhost:50072' },
    { id: 'eu-west', name: 'EU West', endpoint: 'ws://localhost:50073' },
  ];
  
  const manager = new BrowserlessRegionManager(regions);
  
  const allRegions = manager.getAllRegions();
  
  if (allRegions.length !== 2) {
    throw new Error(`Expected 2 regions, got ${allRegions.length}`);
  }
  
  const usEast = allRegions.find(r => r.id === 'us-east');
  const euWest = allRegions.find(r => r.id === 'eu-west');
  
  if (!usEast) {
    throw new Error('US East region not found');
  }
  
  if (!euWest) {
    throw new Error('EU West region not found');
  }
});

runner.test('Should accept custom options', async () => {
  const options: RegionManagerOptions = {
    healthCheckTimeout: 10000,
    maxConsecutiveFailures: 5,
    updateIntervalMs: 60000,
    useWebSocket: false,
  };
  
  const manager = new BrowserlessRegionManager([], options);
  
  // Manager should be created without error
  // Options are internal, so we verify by checking the manager exists
  if (!manager) {
    throw new Error('Manager should be created');
  }
});

// ============================================================================
// Region Management Tests
// ============================================================================

runner.test('Should add a region', async () => {
  const manager = new BrowserlessRegionManager();
  
  const region: Region = { id: 'test-region', name: 'Test Region', endpoint: 'ws://localhost:9999' };
  manager.addRegion(region);
  
  const allRegions = manager.getAllRegions();
  
  if (allRegions.length !== 1) {
    throw new Error(`Expected 1 region, got ${allRegions.length}`);
  }
  
  if (allRegions[0].id !== 'test-region') {
    throw new Error(`Expected region id 'test-region', got '${allRegions[0].id}'`);
  }
});

runner.test('Should not add duplicate region', async () => {
  const manager = new BrowserlessRegionManager();
  
  const region: Region = { id: 'test-region', name: 'Test Region', endpoint: 'ws://localhost:9999' };
  manager.addRegion(region);
  manager.addRegion(region); // Add again - should be ignored
  
  const allRegions = manager.getAllRegions();
  
  if (allRegions.length !== 1) {
    throw new Error(`Expected 1 region (duplicate ignored), got ${allRegions.length}`);
  }
});

runner.test('Should remove a region', async () => {
  const manager = new BrowserlessRegionManager([
    { id: 'region-1', name: 'Region 1', endpoint: 'ws://localhost:9998' },
    { id: 'region-2', name: 'Region 2', endpoint: 'ws://localhost:9999' },
  ]);
  
  manager.removeRegion('region-1');
  
  const allRegions = manager.getAllRegions();
  
  if (allRegions.length !== 1) {
    throw new Error(`Expected 1 region after removal, got ${allRegions.length}`);
  }
  
  if (allRegions[0].id !== 'region-2') {
    throw new Error(`Expected remaining region to be 'region-2', got '${allRegions[0].id}'`);
  }
});

runner.test('Should handle removing non-existent region gracefully', async () => {
  const manager = new BrowserlessRegionManager();
  
  // Should not throw
  manager.removeRegion('non-existent');
  
  const allRegions = manager.getAllRegions();
  
  if (allRegions.length !== 0) {
    throw new Error('Regions should still be empty');
  }
});

runner.test('Should get region by ID', async () => {
  const manager = new BrowserlessRegionManager([
    { id: 'my-region', name: 'My Region', endpoint: 'ws://localhost:8888' },
  ]);
  
  const region = manager.getRegion('my-region');
  
  if (!region) {
    throw new Error('Region should be found');
  }
  
  if (region.id !== 'my-region') {
    throw new Error(`Expected id 'my-region', got '${region.id}'`);
  }
  
  if (region.name !== 'My Region') {
    throw new Error(`Expected name 'My Region', got '${region.name}'`);
  }
  
  if (region.endpoint !== 'ws://localhost:8888') {
    throw new Error(`Expected endpoint 'ws://localhost:8888', got '${region.endpoint}'`);
  }
});

runner.test('Should return undefined for non-existent region', async () => {
  const manager = new BrowserlessRegionManager();
  
  const region = manager.getRegion('does-not-exist');
  
  if (region !== undefined) {
    throw new Error('Should return undefined for non-existent region');
  }
});

// ============================================================================
// Latency Measurement Tests
// ============================================================================

runner.test('Should fail latency measurement for non-existent region', async () => {
  const manager = new BrowserlessRegionManager();
  
  let errorThrown = false;
  try {
    await manager.measureLatency('non-existent');
  } catch (error) {
    errorThrown = true;
    if (!(error instanceof Error) || !error.message.includes('not found')) {
      throw new Error('Expected "not found" error message');
    }
  }
  
  if (!errorThrown) {
    throw new Error('Should throw error for non-existent region');
  }
});

runner.test('Should handle latency measurement failure gracefully', async () => {
  const manager = new BrowserlessRegionManager([
    { id: 'bad-region', name: 'Bad Region', endpoint: 'ws://invalid-host-that-does-not-exist:9999' },
  ], { healthCheckTimeout: 1000 });
  
  let errorThrown = false;
  try {
    await manager.measureLatency('bad-region');
  } catch (error) {
    errorThrown = true;
  }
  
  if (!errorThrown) {
    throw new Error('Should throw error for unreachable endpoint');
  }
  
  // Region status should reflect the failure
  const status = manager.getRegionStatus();
  
  if (status.length !== 1) {
    throw new Error('Should have one region in status');
  }
  
  if (status[0].consecutiveFailures !== 1) {
    throw new Error(`Expected 1 consecutive failure, got ${status[0].consecutiveFailures}`);
  }
});

runner.test('Should mark region unhealthy after max consecutive failures', async () => {
  const manager = new BrowserlessRegionManager([
    { id: 'unstable-region', name: 'Unstable Region', endpoint: 'ws://invalid-host:9999' },
  ], { healthCheckTimeout: 500, maxConsecutiveFailures: 2 });
  
  // Trigger failures
  for (let i = 0; i < 3; i++) {
    try {
      await manager.measureLatency('unstable-region');
    } catch {
      // Expected to fail
    }
  }
  
  const status = manager.getRegionStatus();
  const regionStatus = status.find(s => s.regionId === 'unstable-region');
  
  if (!regionStatus) {
    throw new Error('Region status not found');
  }
  
  if (regionStatus.healthy !== false) {
    throw new Error('Region should be marked unhealthy after max failures');
  }
  
  if (regionStatus.consecutiveFailures < 2) {
    throw new Error(`Expected at least 2 consecutive failures, got ${regionStatus.consecutiveFailures}`);
  }
});

// ============================================================================
// Best Region Selection Tests
// ============================================================================

runner.test('Should return null for getBestRegion when no regions', async () => {
  const manager = new BrowserlessRegionManager();
  
  const best = manager.getBestRegion();
  
  if (best !== null) {
    throw new Error('Should return null when no regions exist');
  }
});

runner.test('Should return null for getBestRegion when all regions unhealthy', async () => {
  const manager = new BrowserlessRegionManager([
    { id: 'bad-1', name: 'Bad 1', endpoint: 'ws://invalid:1111' },
    { id: 'bad-2', name: 'Bad 2', endpoint: 'ws://invalid:2222' },
  ], { healthCheckTimeout: 500, maxConsecutiveFailures: 1 });
  
  // Make all regions unhealthy
  for (const regionId of ['bad-1', 'bad-2']) {
    try {
      await manager.measureLatency(regionId);
    } catch {
      // Expected
    }
  }
  
  const best = manager.getBestRegion();
  
  if (best !== null) {
    throw new Error('Should return null when all regions are unhealthy');
  }
});

runner.test('Should return healthy region for getHealthyRegion even without latency measurement', async () => {
  const manager = new BrowserlessRegionManager([
    { id: 'fresh-region', name: 'Fresh Region', endpoint: 'ws://localhost:9999' },
  ]);
  
  // Region is assumed healthy initially (before any measurement)
  const healthy = manager.getHealthyRegion();
  
  if (!healthy) {
    throw new Error('Should return healthy region (assumed healthy before measurement)');
  }
  
  if (healthy.id !== 'fresh-region') {
    throw new Error(`Expected 'fresh-region', got '${healthy.id}'`);
  }
});

runner.test('Should return fallback region when no healthy regions', async () => {
  const manager = new BrowserlessRegionManager([
    { id: 'only-region', name: 'Only Region', endpoint: 'ws://invalid:9999' },
  ], { healthCheckTimeout: 500, maxConsecutiveFailures: 1 });
  
  // Make region unhealthy
  try {
    await manager.measureLatency('only-region');
  } catch {
    // Expected
  }
  
  // getHealthyRegion should still return something as a fallback
  const healthy = manager.getHealthyRegion();
  
  if (!healthy) {
    throw new Error('Should return fallback region even when unhealthy');
  }
  
  if (healthy.id !== 'only-region') {
    throw new Error('Should return the only available region as fallback');
  }
});

// ============================================================================
// Status & Metrics Tests
// ============================================================================

runner.test('Should return correct region status', async () => {
  const manager = new BrowserlessRegionManager([
    { id: 'region-a', name: 'Region A', endpoint: 'ws://localhost:9998' },
    { id: 'region-b', name: 'Region B', endpoint: 'ws://localhost:9999' },
  ]);
  
  const status = manager.getRegionStatus();
  
  if (status.length !== 2) {
    throw new Error(`Expected 2 regions in status, got ${status.length}`);
  }
  
  for (const s of status) {
    if (typeof s.regionId !== 'string') {
      throw new Error('regionId should be a string');
    }
    if (typeof s.latencyMs !== 'number') {
      throw new Error('latencyMs should be a number');
    }
    if (typeof s.healthy !== 'boolean') {
      throw new Error('healthy should be a boolean');
    }
    if (typeof s.lastMeasured !== 'number') {
      throw new Error('lastMeasured should be a number');
    }
    if (typeof s.consecutiveFailures !== 'number') {
      throw new Error('consecutiveFailures should be a number');
    }
  }
});

runner.test('Should return correct health summary', async () => {
  const manager = new BrowserlessRegionManager([
    { id: 'healthy-region', name: 'Healthy Region', endpoint: 'ws://localhost:9998' },
  ]);
  
  const summary = manager.getHealthSummary();
  
  if (summary.total !== 1) {
    throw new Error(`Expected total 1, got ${summary.total}`);
  }
  
  // Initially assumed healthy
  if (summary.healthy !== 1) {
    throw new Error(`Expected 1 healthy, got ${summary.healthy}`);
  }
  
  if (summary.unhealthy !== 0) {
    throw new Error(`Expected 0 unhealthy, got ${summary.unhealthy}`);
  }
  
  // bestRegion can be null if no latency measured (latencyMs = Infinity)
  // That's expected behavior
  if (summary.bestRegion !== null && summary.bestRegion.id !== 'healthy-region') {
    throw new Error('bestRegion should be the healthy region or null');
  }
});

// ============================================================================
// Periodic Updates Tests
// ============================================================================

runner.test('Should start and stop periodic updates', async () => {
  const manager = new BrowserlessRegionManager([
    { id: 'periodic-region', name: 'Periodic Region', endpoint: 'ws://localhost:9999' },
  ], { updateIntervalMs: 100000 }); // Long interval to avoid actual updates during test
  
  if (manager.isPeriodicUpdatesRunning()) {
    throw new Error('Updates should not be running initially');
  }
  
  manager.startPeriodicUpdates();
  
  if (!manager.isPeriodicUpdatesRunning()) {
    throw new Error('Updates should be running after start');
  }
  
  // Starting again should not cause issues
  manager.startPeriodicUpdates();
  
  manager.stop();
  
  if (manager.isPeriodicUpdatesRunning()) {
    throw new Error('Updates should not be running after stop');
  }
});

runner.test('Should allow custom interval for periodic updates', async () => {
  const manager = new BrowserlessRegionManager();
  
  // Should not throw when starting with custom interval
  manager.startPeriodicUpdates(50000);
  
  if (!manager.isPeriodicUpdatesRunning()) {
    throw new Error('Updates should be running');
  }
  
  manager.stop();
});

// ============================================================================
// Event Emission Tests
// ============================================================================

runner.test('Should emit regionAdded event', async () => {
  const manager = new BrowserlessRegionManager();
  
  let eventFired = false;
  let eventRegion: Region | null = null;
  
  manager.on('regionAdded', (region: Region) => {
    eventFired = true;
    eventRegion = region;
  });
  
  manager.addRegion({ id: 'new-region', name: 'New Region', endpoint: 'ws://localhost:9999' });
  
  if (!eventFired) {
    throw new Error('regionAdded event should be fired');
  }
  
  if (eventRegion?.id !== 'new-region') {
    throw new Error('Event should contain the added region');
  }
});

runner.test('Should emit regionRemoved event', async () => {
  const manager = new BrowserlessRegionManager([
    { id: 'to-remove', name: 'To Remove', endpoint: 'ws://localhost:9999' },
  ]);
  
  let eventFired = false;
  let removedId: string | null = null;
  
  manager.on('regionRemoved', (regionId: string) => {
    eventFired = true;
    removedId = regionId;
  });
  
  manager.removeRegion('to-remove');
  
  if (!eventFired) {
    throw new Error('regionRemoved event should be fired');
  }
  
  if (removedId !== 'to-remove') {
    throw new Error('Event should contain the removed region ID');
  }
});

runner.test('Should emit regionUnhealthy event after consecutive failures', async () => {
  const manager = new BrowserlessRegionManager([
    { id: 'failing-region', name: 'Failing Region', endpoint: 'ws://invalid:9999' },
  ], { healthCheckTimeout: 500, maxConsecutiveFailures: 2 });
  
  let unhealthyEventFired = false;
  let unhealthyRegionId: string | null = null;
  
  manager.on('regionUnhealthy', (regionId: string) => {
    unhealthyEventFired = true;
    unhealthyRegionId = regionId;
  });
  
  // Trigger enough failures to mark unhealthy
  for (let i = 0; i < 3; i++) {
    try {
      await manager.measureLatency('failing-region');
    } catch {
      // Expected
    }
  }
  
  if (!unhealthyEventFired) {
    throw new Error('regionUnhealthy event should be fired after max failures');
  }
  
  if (unhealthyRegionId !== 'failing-region') {
    throw new Error('Event should contain the correct region ID');
  }
});

// Run all tests
runner.run();
