import { SuccessRateDashboard } from './src/success-rate-dashboard';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DIR = './test-dashboard-data';

class TestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> }> = [];
  private passed = 0;
  private failed = 0;
  private errors: Array<{ test: string; error: Error }> = [];

  test(name: string, fn: () => Promise<void>) {
    this.tests.push({ name, fn });
  }

  async run(): Promise<void> {
    console.log('🧪 Starting Success Rate Dashboard Tests\n');
    console.log('=' .repeat(60));

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        this.passed++;
        console.log(`✅ ${name}`);
      } catch (error) {
        this.failed++;
        this.errors.push({ test: name, error: error as Error });
        console.log(`❌ ${name}`);
        console.log(`   Error: ${(error as Error).message}`);
      }
    }

    console.log('=' .repeat(60));
    console.log(`\n📊 Test Results:`);
    console.log(`   Passed: ${this.passed}`);
    console.log(`   Failed: ${this.failed}`);
    console.log(`   Total:  ${this.tests.length}`);
    console.log(`   Success Rate: ${((this.passed / this.tests.length) * 100).toFixed(1)}%`);

    if (this.errors.length > 0) {
      console.log(`\n❌ Failed Tests Details:`);
      this.errors.forEach(({ test, error }) => {
        console.log(`\n   ${test}:`);
        console.log(`   ${error.message}`);
      });
    }

    this.cleanup();
    process.exit(this.failed > 0 ? 1 : 0);
  }

  private cleanup(): void {
    try {
      if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true });
      }
    } catch (error) {
      console.warn(`⚠️  Cleanup warning: ${(error as Error).message}`);
    }
  }
}

const runner = new TestRunner();

runner.test('Dashboard should initialize with correct configuration', async () => {
  const dashboard = new SuccessRateDashboard(TEST_DIR, 1000);
  
  if (!fs.existsSync(TEST_DIR)) {
    throw new Error('Dashboard directory was not created');
  }
});

runner.test('Dashboard should record solve attempts correctly', async () => {
  const dashboard = new SuccessRateDashboard(TEST_DIR, 1000);
  
  dashboard.recordAttempt({
    captchaType: 'text',
    success: true,
    durationMs: 2500,
    provider: 'mistral',
    url: 'http://test.com'
  });
  
  dashboard.recordAttempt({
    captchaType: 'image-grid',
    success: false,
    durationMs: 5000,
    provider: 'groq',
    error: 'Low confidence',
    url: 'http://test.com'
  });
  
  const stats = dashboard.getStats();
  
  if (stats.totalAttempts !== 2) {
    throw new Error(`Expected 2 attempts, got ${stats.totalAttempts}`);
  }
  
  if (stats.successfulSolves !== 1) {
    throw new Error(`Expected 1 successful solve, got ${stats.successfulSolves}`);
  }
  
  if (stats.failedSolves !== 1) {
    throw new Error(`Expected 1 failed solve, got ${stats.failedSolves}`);
  }
});

runner.test('Dashboard should calculate success rate correctly', async () => {
  const dashboard = new SuccessRateDashboard(TEST_DIR, 1000);
  
  dashboard.recordAttempt({ captchaType: 'text', success: true, durationMs: 2000, provider: 'mistral', url: 'http://test.com' });
  dashboard.recordAttempt({ captchaType: 'text', success: true, durationMs: 2000, provider: 'mistral', url: 'http://test.com' });
  dashboard.recordAttempt({ captchaType: 'text', success: false, durationMs: 3000, provider: 'groq', url: 'http://test.com' });
  
  const stats = dashboard.getStats();
  const expectedRate = (2 / 3) * 100;
  
  if (Math.abs(stats.successRate - expectedRate) > 0.01) {
    throw new Error(`Expected success rate ${expectedRate}%, got ${stats.successRate}%`);
  }
});

runner.test('Dashboard should calculate average duration correctly', async () => {
  const dashboard = new SuccessRateDashboard(TEST_DIR, 1000);
  
  dashboard.recordAttempt({ captchaType: 'text', success: true, durationMs: 2000, provider: 'mistral', url: 'http://test.com' });
  dashboard.recordAttempt({ captchaType: 'text', success: true, durationMs: 3000, provider: 'mistral', url: 'http://test.com' });
  dashboard.recordAttempt({ captchaType: 'text', success: true, durationMs: 2500, provider: 'mistral', url: 'http://test.com' });
  
  const stats = dashboard.getStats();
  const expectedAvg = (2000 + 3000 + 2500) / 3;
  
  if (Math.abs(stats.averageDuration - expectedAvg) > 1) {
    throw new Error(`Expected average duration ${expectedAvg}ms, got ${stats.averageDuration}ms`);
  }
});

runner.test('Dashboard should track provider statistics correctly', async () => {
  const dashboard = new SuccessRateDashboard(TEST_DIR, 1000);
  
  dashboard.recordAttempt({ captchaType: 'text', success: true, durationMs: 2000, provider: 'mistral', url: 'http://test.com' });
  dashboard.recordAttempt({ captchaType: 'text', success: true, durationMs: 2000, provider: 'mistral', url: 'http://test.com' });
  dashboard.recordAttempt({ captchaType: 'text', success: false, durationMs: 3000, provider: 'groq', url: 'http://test.com' });
  
  const stats = dashboard.getStats();
  
  if (!stats.byProvider.has('mistral')) {
    throw new Error('Mistral provider stats not found');
  }
  
  const mistralStats = stats.byProvider.get('mistral');
  if (mistralStats!.attempts !== 2) {
    throw new Error(`Expected 2 Mistral attempts, got ${mistralStats!.attempts}`);
  }
  
  if (!stats.byProvider.has('groq')) {
    throw new Error('Groq provider stats not found');
  }
});

runner.test('Dashboard should track CAPTCHA type statistics correctly', async () => {
  const dashboard = new SuccessRateDashboard(TEST_DIR, 1000);
  
  dashboard.recordAttempt({ captchaType: 'text', success: true, durationMs: 2000, provider: 'mistral', url: 'http://test.com' });
  dashboard.recordAttempt({ captchaType: 'text', success: true, durationMs: 2000, provider: 'mistral', url: 'http://test.com' });
  dashboard.recordAttempt({ captchaType: 'slider', success: true, durationMs: 3000, provider: 'mistral', url: 'http://test.com' });
  
  const stats = dashboard.getStats();
  
  if (!stats.byType.has('text')) {
    throw new Error('Text CAPTCHA stats not found');
  }
  
  const textStats = stats.byType.get('text');
  if (textStats!.attempts !== 2) {
    throw new Error(`Expected 2 text attempts, got ${textStats!.attempts}`);
  }
  
  if (!stats.byType.has('slider')) {
    throw new Error('Slider CAPTCHA stats not found');
  }
});

runner.test('Dashboard should generate HTML dashboard file', async () => {
  const dashboard = new SuccessRateDashboard(TEST_DIR, 1000);
  
  dashboard.recordAttempt({ captchaType: 'text', success: true, durationMs: 2000, provider: 'mistral', url: 'http://test.com' });
  
  const htmlPath = dashboard.generateHTMLDashboard();
  
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`HTML dashboard file not created at ${htmlPath}`);
  }
  
  const content = fs.readFileSync(htmlPath, 'utf-8');
  
  if (!content.includes('<html')) {
    throw new Error('HTML content not found in dashboard file');
  }
  
  if (!content.includes('CAPTCHA Success Rate Dashboard')) {
    throw new Error('Dashboard title not found in HTML');
  }
});

runner.test('Dashboard should generate JSON report file', async () => {
  const dashboard = new SuccessRateDashboard(TEST_DIR, 1000);
  
  dashboard.recordAttempt({ captchaType: 'text', success: true, durationMs: 2000, provider: 'mistral', url: 'http://test.com' });
  
  const jsonPath = dashboard.generateJSONReport();
  
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`JSON report file not created at ${jsonPath}`);
  }
  
  const content = fs.readFileSync(jsonPath, 'utf-8');
  const report = JSON.parse(content);
  
  if (!report.stats) {
    throw new Error('Statistics not found in JSON report');
  }
  
  if (!report.recentAttempts) {
    throw new Error('Recent attempts not found in JSON report');
  }
});

runner.test('Dashboard should generate console dashboard output', async () => {
  const dashboard = new SuccessRateDashboard(TEST_DIR, 1000);
  
  dashboard.recordAttempt({ captchaType: 'text', success: true, durationMs: 2000, provider: 'mistral', url: 'http://test.com' });
  
  try {
    dashboard.printConsoleDashboard();
  } catch (error) {
    throw new Error(`Console dashboard generation failed: ${(error as Error).message}`);
  }
});

runner.test('Dashboard should persist data between sessions', async () => {
  const testDir = './test-dashboard-persist';
  const dashboard1 = new SuccessRateDashboard(testDir, 1000);
  
  // Record 10 attempts to trigger auto-save
  for (let i = 0; i < 10; i++) {
    dashboard1.recordAttempt({ captchaType: 'text', success: true, durationMs: 2000, provider: 'mistral', url: 'http://test.com' });
  }
  
  const stats1 = dashboard1.getStats();
  
  // Small delay to ensure file write completes
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const dashboard2 = new SuccessRateDashboard(testDir, 1000);
  const stats2 = dashboard2.getStats();
  
  // Cleanup
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
  
  if (stats2.totalAttempts !== stats1.totalAttempts) {
    throw new Error(`Data not persisted: expected ${stats1.totalAttempts} attempts, got ${stats2.totalAttempts}`);
  }
});

runner.test('Dashboard should respect max history limit', async () => {
  const dashboard = new SuccessRateDashboard(TEST_DIR, 5);
  
  for (let i = 0; i < 10; i++) {
    dashboard.recordAttempt({ captchaType: 'text', success: true, durationMs: 2000, provider: 'mistral', url: 'http://test.com' });
  }
  
  const stats = dashboard.getStats();
  
  if (stats.totalAttempts !== 5) {
    throw new Error(`Expected 5 attempts (max history), got ${stats.totalAttempts}`);
  }
});

runner.test('Dashboard should filter by time window', async () => {
  const dashboard = new SuccessRateDashboard(TEST_DIR, 1000);
  
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  const twoHoursAgo = now - (2 * 60 * 60 * 1000);
  
  dashboard.recordAttempt({ captchaType: 'text', success: true, durationMs: 2000, provider: 'mistral', url: 'http://test.com' });
  
  const recentStats = dashboard.getStats({ start: oneHourAgo, end: now });
  const oldStats = dashboard.getStats({ start: twoHoursAgo, end: oneHourAgo });
  
  if (recentStats.totalAttempts !== 1) {
    throw new Error(`Expected 1 recent attempt, got ${recentStats.totalAttempts}`);
  }
  
  if (oldStats.totalAttempts !== 0) {
    throw new Error(`Expected 0 old attempts, got ${oldStats.totalAttempts}`);
  }
});

runner.test('Dashboard should track fastest and slowest solves', async () => {
  const dashboard = new SuccessRateDashboard(TEST_DIR, 1000);
  
  dashboard.recordAttempt({ captchaType: 'text', success: true, durationMs: 5000, provider: 'mistral', url: 'http://test.com' });
  dashboard.recordAttempt({ captchaType: 'text', success: true, durationMs: 2000, provider: 'mistral', url: 'http://test.com' });
  dashboard.recordAttempt({ captchaType: 'text', success: true, durationMs: 8000, provider: 'mistral', url: 'http://test.com' });
  
  const stats = dashboard.getStats();
  
  if (stats.fastestSolve !== 2000) {
    throw new Error(`Expected fastest solve 2000ms, got ${stats.fastestSolve}ms`);
  }
  
  if (stats.slowestSolve !== 8000) {
    throw new Error(`Expected slowest solve 8000ms, got ${stats.slowestSolve}ms`);
  }
});

runner.test('Dashboard should handle empty history gracefully', async () => {
  const dashboard = new SuccessRateDashboard(TEST_DIR, 1000);
  
  const stats = dashboard.getStats();
  
  if (stats.totalAttempts !== 0) {
    throw new Error(`Expected 0 attempts for empty history, got ${stats.totalAttempts}`);
  }
  
  if (stats.successRate !== 0) {
    throw new Error(`Expected 0% success rate for empty history, got ${stats.successRate}%`);
  }
  
  if (stats.averageDuration !== 0) {
    throw new Error(`Expected 0ms average duration for empty history, got ${stats.averageDuration}ms`);
  }
});

runner.run();
