import { BrowserlessMetrics, MetricsReport } from './src/browserless-metrics';

class TestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => Promise<void>) {
    this.tests.push({ name, fn });
  }

  async run(): Promise<void> {
    console.log('🧪 Browserless Metrics Tests\n');
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

runner.test('Should initialize with correct configuration', async () => {
  const metrics = new BrowserlessMetrics({
    persistToDisk: false,
    maxHistorySize: 100,
  });

  const report = await metrics.getMetrics();

  if (!report) {
    throw new Error('Metrics report should be generated');
  }

  if (typeof report.timestamp !== 'number') {
    throw new Error('Report should have timestamp');
  }

  if (typeof report.uptime !== 'number') {
    throw new Error('Report should have uptime');
  }

  metrics.stop();
});

runner.test('Should record connection metrics', async () => {
  const metrics = new BrowserlessMetrics();

  await metrics.recordConnection(true);
  await metrics.recordConnection(true);
  await metrics.recordConnection(false);

  const report = await metrics.getMetrics();

  if (report.connections.total !== 3) {
    throw new Error(`Expected 3 total connections, got ${report.connections.total}`);
  }

  if (report.connections.successful !== 2) {
    throw new Error(`Expected 2 successful connections, got ${report.connections.successful}`);
  }

  if (report.connections.failed !== 1) {
    throw new Error(`Expected 1 failed connection, got ${report.connections.failed}`);
  }

  if (report.connections.active !== 2) {
    throw new Error(`Expected 2 active connections, got ${report.connections.active}`);
  }

  await metrics.recordDisconnection();

  const updatedReport = await metrics.getMetrics();
  if (updatedReport.connections.active !== 1) {
    throw new Error(`Expected 1 active connection after disconnect, got ${updatedReport.connections.active}`);
  }

  metrics.stop();
});

runner.test('Should record request duration metrics', async () => {
  const metrics = new BrowserlessMetrics();

  await metrics.recordRequest(100, 'Page.navigate');
  await metrics.recordRequest(200, 'Page.navigate');
  await metrics.recordRequest(300, 'Runtime.evaluate');
  await metrics.recordRequest(400, 'Page.captureScreenshot');

  const report = await metrics.getMetrics();

  if (report.requests.count !== 4) {
    throw new Error(`Expected 4 requests, got ${report.requests.count}`);
  }

  if (report.requests.min !== 100) {
    throw new Error(`Expected min 100ms, got ${report.requests.min}`);
  }

  if (report.requests.max !== 400) {
    throw new Error(`Expected max 400ms, got ${report.requests.max}`);
  }

  if (report.requests.avg !== 250) {
    throw new Error(`Expected avg 250ms, got ${report.requests.avg}`);
  }

  if (!report.requests.byCommand['Page.navigate']) {
    throw new Error('Page.navigate command stats should exist');
  }

  if (report.requests.byCommand['Page.navigate'].count !== 2) {
    throw new Error(`Expected 2 Page.navigate calls, got ${report.requests.byCommand['Page.navigate'].count}`);
  }

  metrics.stop();
});

runner.test('Should record errors', async () => {
  const metrics = new BrowserlessMetrics();

  const error1 = new Error('Connection failed');
  const error2 = new TypeError('Invalid parameter');
  const error3 = new Error('Timeout');

  await metrics.recordError(error1, 'connection');
  await metrics.recordError(error2, 'validation');
  await metrics.recordError(error3, 'connection');

  const report = await metrics.getMetrics();

  if (report.errors.total !== 3) {
    throw new Error(`Expected 3 errors, got ${report.errors.total}`);
  }

  if (report.errors.byType['Error'] !== 2) {
    throw new Error(`Expected 2 Error types, got ${report.errors.byType['Error']}`);
  }

  if (report.errors.byType['TypeError'] !== 1) {
    throw new Error(`Expected 1 TypeError, got ${report.errors.byType['TypeError']}`);
  }

  if (report.errors.byContext['connection'] !== 2) {
    throw new Error(`Expected 2 connection errors, got ${report.errors.byContext['connection']}`);
  }

  if (report.errors.byContext['validation'] !== 1) {
    throw new Error(`Expected 1 validation error, got ${report.errors.byContext['validation']}`);
  }

  if (report.errors.recent.length !== 3) {
    throw new Error(`Expected 3 recent errors, got ${report.errors.recent.length}`);
  }

  metrics.stop();
});

runner.test('Should calculate percentiles correctly', async () => {
  const metrics = new BrowserlessMetrics();

  const durations = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  
  for (const duration of durations) {
    await metrics.recordRequest(duration, 'Test.command');
  }

  const report = await metrics.getMetrics();

  if (report.requests.p50 !== 50) {
    throw new Error(`Expected p50 to be 50, got ${report.requests.p50}`);
  }

  if (report.requests.p95 !== 100) {
    throw new Error(`Expected p95 to be 100, got ${report.requests.p95}`);
  }

  if (report.requests.p99 !== 100) {
    throw new Error(`Expected p99 to be 100, got ${report.requests.p99}`);
  }

  metrics.stop();
});

runner.test('Should export metrics to JSON', async () => {
  const metrics = new BrowserlessMetrics();

  await metrics.recordConnection(true);
  await metrics.recordRequest(150, 'Page.navigate');
  await metrics.recordPageLoad(1000);
  await metrics.recordScreenshot(500);

  const json = await metrics.exportToJSON();

  if (typeof json !== 'string') {
    throw new Error('Export should return a string');
  }

  let parsed: MetricsReport;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Exported JSON should be valid');
  }

  if (parsed.connections.total !== 1) {
    throw new Error('Parsed metrics should have 1 connection');
  }

  if (parsed.requests.count !== 1) {
    throw new Error('Parsed metrics should have 1 request');
  }

  if (parsed.performance.pageLoads.count !== 1) {
    throw new Error('Parsed metrics should have 1 page load');
  }

  if (parsed.performance.screenshots.count !== 1) {
    throw new Error('Parsed metrics should have 1 screenshot');
  }

  metrics.stop();
});

runner.run();
