import { BrowserlessCostMonitor, CostReport, Resources } from './src/browserless-cost-monitor';

class TestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => Promise<void>) {
    this.tests.push({ name, fn });
  }

  async run(): Promise<void> {
    console.log('🧪 Browserless Cost Monitor Tests\n');
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

runner.test('Should initialize with configuration', async () => {
  const monitor = new BrowserlessCostMonitor({
    budget: 500,
    alertThreshold: 0.75,
    currency: 'USD',
    rates: {
      connectionPerMinute: 0.002,
      screenshotPerCapture: 0.01,
    },
  });

  const rates = monitor.getRates();
  if (rates.connectionPerMinute !== 0.002) {
    throw new Error('Custom connection rate should be set');
  }

  if (rates.screenshotPerCapture !== 0.01) {
    throw new Error('Custom screenshot rate should be set');
  }

  const utilization = monitor.getBudgetUtilization();
  if (utilization !== 0) {
    throw new Error('Initial utilization should be 0');
  }
});

runner.test('Should record operations and calculate costs', async () => {
  const monitor = new BrowserlessCostMonitor({
    rates: {
      connectionPerMinute: 0.001,
      screenshotPerCapture: 0.005,
      navigationPerPage: 0.002,
    },
  });

  monitor.recordOperation('connection', 120, {});
  monitor.recordOperation('screenshot', 5, {});
  monitor.recordOperation('navigation', 10, {});

  const currentCost = monitor.getCurrentCost();
  if (currentCost <= 0) {
    throw new Error('Current cost should be greater than 0');
  }

  const byType = monitor.getCostByType();
  if (!byType.connection || !byType.screenshot || !byType.navigation) {
    throw new Error('All operation types should be recorded');
  }

  if (byType.connection <= 0) {
    throw new Error('Connection cost should be greater than 0');
  }

  if (byType.screenshot <= 0) {
    throw new Error('Screenshot cost should be greater than 0');
  }

  if (byType.navigation <= 0) {
    throw new Error('Navigation cost should be greater than 0');
  }
});

runner.test('Should aggregate costs by period', async () => {
  const monitor = new BrowserlessCostMonitor();

  monitor.recordOperation('connection', 60, {});
  monitor.recordOperation('screenshot', 3, {});

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const report = monitor.getCostByPeriod(startOfDay, now);

  if (report.total <= 0) {
    throw new Error('Period total should be greater than 0');
  }

  if (report.operationCount !== 2) {
    throw new Error(`Expected 2 operations, got ${report.operationCount}`);
  }

  if (Object.keys(report.byType).length !== 2) {
    throw new Error('Should have costs for 2 operation types');
  }

  if (Object.keys(report.byDay).length < 1) {
    throw new Error('Should have at least 1 day of costs');
  }

  if (report.projected <= 0) {
    throw new Error('Projected cost should be greater than 0');
  }
});

runner.test('Should calculate projected costs', async () => {
  const monitor = new BrowserlessCostMonitor();

  for (let i = 0; i < 7; i++) {
    monitor.recordOperation('connection', 60, {});
    monitor.recordOperation('screenshot', 2, {});
  }

  const projected7Days = monitor.getProjectedCost(7);
  const projected30Days = monitor.getProjectedCost(30);

  if (projected7Days <= 0) {
    throw new Error('7-day projection should be greater than 0');
  }

  if (projected30Days <= 0) {
    throw new Error('30-day projection should be greater than 0');
  }

  if (projected30Days <= projected7Days) {
    throw new Error('30-day projection should be greater than 7-day projection');
  }
});

runner.test('Should detect budget overruns', async () => {
  const monitor = new BrowserlessCostMonitor({
    budget: 0.01,
    alertThreshold: 0.5,
  });

  let alertTriggered = false;
  monitor.on('budgetAlert', () => {
    alertTriggered = true;
  });

  if (monitor.isOverBudget()) {
    throw new Error('Should not be over budget initially');
  }

  monitor.recordOperation('screenshot', 10, {});
  monitor.recordOperation('screenshot', 10, {});
  monitor.recordOperation('screenshot', 10, {});

  if (!monitor.isOverBudget()) {
    throw new Error('Should be over budget after expensive operations');
  }

  const utilization = monitor.getBudgetUtilization();
  if (utilization <= 100) {
    throw new Error('Budget utilization should exceed 100%');
  }
});

runner.test('Should export cost report', async () => {
  const monitor = new BrowserlessCostMonitor({
    budget: 100,
    currency: 'USD',
  });

  monitor.recordOperation('connection', 60, { cpu: 10, memory: 512 });
  monitor.recordOperation('screenshot', 5, {});
  monitor.recordOperation('navigation', 15, {});

  const report = monitor.exportReport();

  if (typeof report !== 'string') {
    throw new Error('Export should return a string');
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(report);
  } catch {
    throw new Error('Exported report should be valid JSON');
  }

  if (!parsed.summary) {
    throw new Error('Report should have summary');
  }

  if (!parsed.rates) {
    throw new Error('Report should have rates');
  }

  if (!parsed.report) {
    throw new Error('Report should have detailed report');
  }

  if (!parsed.dailyCosts) {
    throw new Error('Report should have daily costs');
  }

  const summary = parsed.summary as Record<string, unknown>;
  if (typeof summary.currentCost !== 'number') {
    throw new Error('Summary should have currentCost');
  }

  if (typeof summary.budget !== 'number') {
    throw new Error('Summary should have budget');
  }

  if (typeof summary.utilization !== 'number') {
    throw new Error('Summary should have utilization');
  }
});

runner.run();
