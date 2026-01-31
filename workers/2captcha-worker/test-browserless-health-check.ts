import { BrowserlessHealthCheck, HealthResult, HealthReport } from './src/browserless-health-check';

class TestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => Promise<void>) {
    this.tests.push({ name, fn });
  }

  async run(): Promise<void> {
    console.log('🧪 Browserless Health Check Tests\n');
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

runner.test('Should initialize with correct URLs', async () => {
  const cdpUrl = 'http://localhost:50072';
  const debuggerUrl = 'http://localhost:50070';
  
  const healthCheck = new BrowserlessHealthCheck(cdpUrl, debuggerUrl, 5000, 50);
  
  const report = await healthCheck.getHealthReport();
  
  if (!report) {
    throw new Error('Health report should be generated');
  }
  
  if (report.checks.length !== 3) {
    throw new Error(`Expected 3 checks, got ${report.checks.length}`);
  }
  
  const cdpCheck = report.checks.find(c => c.endpoint === cdpUrl);
  const debuggerCheck = report.checks.find(c => c.endpoint === debuggerUrl);
  
  if (!cdpCheck) {
    throw new Error('CDP check should exist');
  }
  
  if (!debuggerCheck) {
    throw new Error('Debugger check should exist');
  }
});

runner.test('Should check CDP endpoint', async () => {
  const healthCheck = new BrowserlessHealthCheck(
    'http://localhost:50072',
    'http://localhost:50070',
    2000
  );
  
  const result = await healthCheck.checkCDP();
  
  if (!result) {
    throw new Error('CDP check should return a result');
  }
  
  if (!result.endpoint) {
    throw new Error('CDP check should have an endpoint');
  }
  
  if (typeof result.responseTime !== 'number') {
    throw new Error('CDP check should have response time');
  }
  
  if (!['healthy', 'unhealthy'].includes(result.status)) {
    throw new Error('CDP check should have valid status');
  }
});

runner.test('Should check Debugger UI endpoint', async () => {
  const healthCheck = new BrowserlessHealthCheck(
    'http://localhost:50072',
    'http://localhost:50070',
    2000
  );
  
  const result = await healthCheck.checkDebugger();
  
  if (!result) {
    throw new Error('Debugger check should return a result');
  }
  
  if (!result.endpoint) {
    throw new Error('Debugger check should have an endpoint');
  }
  
  if (typeof result.responseTime !== 'number') {
    throw new Error('Debugger check should have response time');
  }
  
  if (!['healthy', 'unhealthy'].includes(result.status)) {
    throw new Error('Debugger check should have valid status');
  }
});

runner.test('Should generate health report', async () => {
  const healthCheck = new BrowserlessHealthCheck(
    'http://localhost:50072',
    'http://localhost:50070',
    2000
  );
  
  const report = await healthCheck.getHealthReport();
  
  if (!report) {
    throw new Error('Health report should be generated');
  }
  
  if (!['healthy', 'degraded', 'unhealthy'].includes(report.overall)) {
    throw new Error('Report should have valid overall status');
  }
  
  if (!Array.isArray(report.checks)) {
    throw new Error('Report should have checks array');
  }
  
  if (typeof report.timestamp !== 'number') {
    throw new Error('Report should have timestamp');
  }
  
  if (typeof report.uptime !== 'number') {
    throw new Error('Report should have uptime');
  }
  
  if (report.checks.length !== 3) {
    throw new Error('Report should have 3 checks');
  }
});

runner.test('Should determine overall health status', async () => {
  const healthCheck = new BrowserlessHealthCheck(
    'http://localhost:50072',
    'http://localhost:50070',
    2000
  );
  
  await healthCheck.getHealthReport();
  
  const isHealthy = healthCheck.isHealthy();
  
  if (typeof isHealthy !== 'boolean') {
    throw new Error('isHealthy should return a boolean');
  }
  
  const latestReport = healthCheck.getLatestReport();
  
  if (!latestReport) {
    throw new Error('Should have a latest report');
  }
  
  if (isHealthy && latestReport.overall !== 'healthy') {
    throw new Error('isHealthy should match report overall status');
  }
  
  if (!isHealthy && latestReport.overall === 'healthy') {
    throw new Error('isHealthy should match report overall status');
  }
});

runner.run();
