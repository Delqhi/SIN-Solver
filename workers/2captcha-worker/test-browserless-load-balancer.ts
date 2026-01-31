import { BrowserlessLoadBalancer, EndpointStatus, LoadBalancerMetrics } from './src/browserless-load-balancer';

class TestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => Promise<void>) {
    this.tests.push({ name, fn });
  }

  async run(): Promise<void> {
    console.log('🧪 Browserless Load Balancer Tests\n');
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

runner.test('Should initialize with endpoints and strategy', async () => {
  const endpoints = [
    'ws://localhost:50072',
    'ws://localhost:50073',
    'ws://localhost:50074',
  ];

  const lb = new BrowserlessLoadBalancer(endpoints, {
    strategy: 'round-robin',
    maxConnectionsPerEndpoint: 50,
  });

  const status = lb.getEndpointStatus();

  if (status.length !== 3) {
    throw new Error(`Expected 3 endpoints, got ${status.length}`);
  }

  const metrics = lb.getMetrics();

  if (metrics.totalEndpoints !== 3) {
    throw new Error(`Expected 3 total endpoints, got ${metrics.totalEndpoints}`);
  }

  lb.stop();
});

runner.test('Should distribute load with round-robin strategy', async () => {
  const endpoints = [
    'ws://localhost:50072',
    'ws://localhost:50073',
  ];

  const lb = new BrowserlessLoadBalancer(endpoints, {
    strategy: 'round-robin',
  });

  const results: string[] = [];

  for (let i = 0; i < 4; i++) {
    const endpoint = await lb.getNextEndpoint();
    results.push(endpoint);
    lb.releaseEndpoint(endpoint, true, 100);
  }

  if (results[0] !== 'ws://localhost:50072') {
    throw new Error(`Expected first endpoint to be ws://localhost:50072, got ${results[0]}`);
  }

  if (results[1] !== 'ws://localhost:50073') {
    throw new Error(`Expected second endpoint to be ws://localhost:50073, got ${results[1]}`);
  }

  if (results[2] !== 'ws://localhost:50072') {
    throw new Error(`Expected third endpoint to be ws://localhost:50072, got ${results[2]}`);
  }

  lb.stop();
});

runner.test('Should mark endpoints healthy/unhealthy', async () => {
  const endpoints = ['ws://localhost:50072'];

  const lb = new BrowserlessLoadBalancer(endpoints, {
    strategy: 'round-robin',
  });

  let status = lb.getEndpointStatus();
  if (!status[0].healthy) {
    throw new Error('Endpoint should start as healthy');
  }

  lb.markEndpointUnhealthy('ws://localhost:50072', 'Test failure');

  status = lb.getEndpointStatus();
  if (status[0].healthy) {
    throw new Error('Endpoint should be marked unhealthy');
  }

  lb.markEndpointHealthy('ws://localhost:50072');

  status = lb.getEndpointStatus();
  if (!status[0].healthy) {
    throw new Error('Endpoint should be marked healthy again');
  }

  lb.stop();
});

runner.test('Should add and remove endpoints', async () => {
  const lb = new BrowserlessLoadBalancer([], {
    strategy: 'round-robin',
  });

  let status = lb.getEndpointStatus();
  if (status.length !== 0) {
    throw new Error('Should start with 0 endpoints');
  }

  lb.addEndpoint('ws://localhost:50072');
  lb.addEndpoint('ws://localhost:50073', 2);

  status = lb.getEndpointStatus();
  if (status.length !== 2) {
    throw new Error(`Expected 2 endpoints, got ${status.length}`);
  }

  lb.removeEndpoint('ws://localhost:50072');

  status = lb.getEndpointStatus();
  if (status.length !== 1) {
    throw new Error(`Expected 1 endpoint after removal, got ${status.length}`);
  }

  if (status[0].url !== 'ws://localhost:50073') {
    throw new Error('Remaining endpoint should be ws://localhost:50073');
  }

  lb.stop();
});

runner.test('Should get endpoint status', async () => {
  const endpoints = [
    'ws://localhost:50072',
    'ws://localhost:50073',
  ];

  const lb = new BrowserlessLoadBalancer(endpoints, {
    strategy: 'round-robin',
  });

  const endpoint = await lb.getNextEndpoint();
  lb.releaseEndpoint(endpoint, true, 150);

  const status = lb.getEndpointStatus();

  if (!Array.isArray(status)) {
    throw new Error('Status should be an array');
  }

  for (const ep of status) {
    if (!ep.url) {
      throw new Error('Endpoint should have URL');
    }

    if (typeof ep.healthy !== 'boolean') {
      throw new Error('Endpoint should have healthy boolean');
    }

    if (typeof ep.activeConnections !== 'number') {
      throw new Error('Endpoint should have activeConnections number');
    }

    if (typeof ep.totalRequests !== 'number') {
      throw new Error('Endpoint should have totalRequests number');
    }

    if (typeof ep.lastChecked !== 'number') {
      throw new Error('Endpoint should have lastChecked timestamp');
    }
  }

  lb.stop();
});

runner.test('Should get load balancer metrics', async () => {
  const endpoints = [
    'ws://localhost:50072',
    'ws://localhost:50073',
  ];

  const lb = new BrowserlessLoadBalancer(endpoints, {
    strategy: 'round-robin',
  });

  for (let i = 0; i < 5; i++) {
    const endpoint = await lb.getNextEndpoint();
    lb.releaseEndpoint(endpoint, i < 4, 100 + i * 10);
  }

  const metrics = lb.getMetrics();

  if (typeof metrics.totalRequests !== 'number') {
    throw new Error('Metrics should have totalRequests');
  }

  if (metrics.totalRequests !== 5) {
    throw new Error(`Expected 5 total requests, got ${metrics.totalRequests}`);
  }

  if (typeof metrics.successfulRequests !== 'number') {
    throw new Error('Metrics should have successfulRequests');
  }

  if (metrics.successfulRequests !== 4) {
    throw new Error(`Expected 4 successful requests, got ${metrics.successfulRequests}`);
  }

  if (typeof metrics.failedRequests !== 'number') {
    throw new Error('Metrics should have failedRequests');
  }

  if (metrics.failedRequests !== 1) {
    throw new Error(`Expected 1 failed request, got ${metrics.failedRequests}`);
  }

  if (typeof metrics.averageResponseTime !== 'number') {
    throw new Error('Metrics should have averageResponseTime');
  }

  if (typeof metrics.queuedRequests !== 'number') {
    throw new Error('Metrics should have queuedRequests');
  }

  if (typeof metrics.activeEndpoints !== 'number') {
    throw new Error('Metrics should have activeEndpoints');
  }

  if (typeof metrics.totalEndpoints !== 'number') {
    throw new Error('Metrics should have totalEndpoints');
  }

  if (metrics.totalEndpoints !== 2) {
    throw new Error(`Expected 2 total endpoints, got ${metrics.totalEndpoints}`);
  }

  lb.stop();
});

runner.run();
