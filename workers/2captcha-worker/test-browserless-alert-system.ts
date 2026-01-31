import { BrowserlessAlertSystem, AlertRule, Metrics, AlertSeverity } from './src/browserless-alert-system';

class TestRunner {
  private tests: Array<{ name: string; fn: () => Promise<void> }> = [];
  private passed = 0;
  private failed = 0;

  test(name: string, fn: () => Promise<void>) {
    this.tests.push({ name, fn });
  }

  async run(): Promise<void> {
    console.log('🧪 Browserless Alert System Tests\n');
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
  const alertSystem = new BrowserlessAlertSystem(
    {
      channels: ['console'],
      cooldownMs: 5000,
      maxHistory: 100,
    },
    {
      defaultCooldownMs: 30000,
      maxHistory: 100,
    }
  );

  const rules = alertSystem.getRules();
  if (rules.length !== 0) {
    throw new Error('Should start with 0 rules');
  }

  const history = alertSystem.getAlertHistory();
  if (history.length !== 0) {
    throw new Error('Should start with empty history');
  }

  const stats = alertSystem.getStatistics();
  if (stats.total !== 0) {
    throw new Error('Should start with 0 alerts');
  }

  alertSystem.stop();
});

runner.test('Should add and remove alert rules', async () => {
  const alertSystem = new BrowserlessAlertSystem({ channels: ['console'] });

  const rule: AlertRule = {
    id: 'test-rule-1',
    name: 'Test Rule',
    description: 'Test description',
    condition: (metrics: Metrics) => (metrics.errorRate || 0) > 0.5,
    severity: 'warning' as AlertSeverity,
    enabled: true,
  };

  alertSystem.addRule(rule);

  let rules = alertSystem.getRules();
  if (rules.length !== 1) {
    throw new Error(`Expected 1 rule, got ${rules.length}`);
  }

  if (rules[0].id !== 'test-rule-1') {
    throw new Error('Rule ID should match');
  }

  alertSystem.removeRule('test-rule-1');

  rules = alertSystem.getRules();
  if (rules.length !== 0) {
    throw new Error(`Expected 0 rules after removal, got ${rules.length}`);
  }

  alertSystem.stop();
});

runner.test('Should trigger alert when condition met', async () => {
  const alertSystem = new BrowserlessAlertSystem({ channels: ['console'] });
  let alertTriggered = false;

  alertSystem.on('alertSent', () => {
    alertTriggered = true;
  });

  const rule: AlertRule = {
    id: 'high-error-rate',
    name: 'High Error Rate',
    condition: (metrics: Metrics) => (metrics.errorRate || 0) > 0.5,
    severity: 'critical' as AlertSeverity,
    enabled: true,
    cooldownMs: 0,
  };

  alertSystem.addRule(rule);

  const metrics: Metrics = { errorRate: 0.8 };
  alertSystem.checkMetrics(metrics);

  await new Promise(resolve => setTimeout(resolve, 100));

  if (!alertTriggered) {
    throw new Error('Alert should have been triggered');
  }

  const history = alertSystem.getAlertHistory();
  if (history.length !== 1) {
    throw new Error(`Expected 1 alert in history, got ${history.length}`);
  }

  if (history[0].severity !== 'critical') {
    throw new Error('Alert severity should be critical');
  }

  alertSystem.stop();
});

runner.test('Should respect cooldown period', async () => {
  const alertSystem = new BrowserlessAlertSystem({ channels: ['console'] });
  let alertCount: number = 0;

  alertSystem.on('alertSent', () => {
    alertCount++;
  });

  const rule: AlertRule = {
    id: 'cooldown-test',
    name: 'Cooldown Test',
    condition: (metrics: Metrics) => true,
    severity: 'info' as AlertSeverity,
    enabled: true,
    cooldownMs: 500,
  };

  alertSystem.addRule(rule);

  alertSystem.checkMetrics({});
  alertSystem.checkMetrics({});
  alertSystem.checkMetrics({});

  await new Promise(resolve => setTimeout(resolve, 100));

  if (alertCount !== 1) {
    throw new Error(`Expected 1 alert (due to cooldown), got ${alertCount}`);
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  alertSystem.checkMetrics({});

  await new Promise(resolve => setTimeout(resolve, 100));

  if ((alertCount as number) !== 2) {
    throw new Error(`Expected 2 alerts after cooldown, got ${alertCount}`);
  }

  alertSystem.stop();
});

runner.test('Should track alert history', async () => {
  const alertSystem = new BrowserlessAlertSystem({ channels: ['console'] });

  const rule1: AlertRule = {
    id: 'rule-1',
    name: 'Rule 1',
    condition: () => true,
    severity: 'info' as AlertSeverity,
    enabled: true,
    cooldownMs: 0,
  };

  const rule2: AlertRule = {
    id: 'rule-2',
    name: 'Rule 2',
    condition: () => true,
    severity: 'warning' as AlertSeverity,
    enabled: true,
    cooldownMs: 0,
  };

  alertSystem.addRule(rule1);
  alertSystem.addRule(rule2);

  alertSystem.checkMetrics({});

  await new Promise(resolve => setTimeout(resolve, 100));

  const history = alertSystem.getAlertHistory();
  if (history.length !== 2) {
    throw new Error(`Expected 2 alerts in history, got ${history.length}`);
  }

  const infoAlerts = alertSystem.getAlertsBySeverity('info' as AlertSeverity);
  if (infoAlerts.length !== 1) {
    throw new Error(`Expected 1 info alert, got ${infoAlerts.length}`);
  }

  const warningAlerts = alertSystem.getAlertsBySeverity('warning' as AlertSeverity);
  if (warningAlerts.length !== 1) {
    throw new Error(`Expected 1 warning alert, got ${warningAlerts.length}`);
  }

  const stats = alertSystem.getStatistics();
  if (stats.total !== 2) {
    throw new Error(`Expected total 2 alerts in stats, got ${stats.total}`);
  }

  if (stats.bySeverity.info !== 1) {
    throw new Error(`Expected 1 info alert in stats, got ${stats.bySeverity.info}`);
  }

  if (stats.bySeverity.warning !== 1) {
    throw new Error(`Expected 1 warning alert in stats, got ${stats.bySeverity.warning}`);
  }

  alertSystem.stop();
});

runner.test('Should clear alert history', async () => {
  const alertSystem = new BrowserlessAlertSystem({ channels: ['console'] });

  const rule: AlertRule = {
    id: 'clear-test',
    name: 'Clear Test',
    condition: () => true,
    severity: 'info' as AlertSeverity,
    enabled: true,
    cooldownMs: 0,
  };

  alertSystem.addRule(rule);
  alertSystem.checkMetrics({});

  await new Promise(resolve => setTimeout(resolve, 100));

  let history = alertSystem.getAlertHistory();
  if (history.length !== 1) {
    throw new Error(`Expected 1 alert before clear, got ${history.length}`);
  }

  alertSystem.clearHistory();

  history = alertSystem.getAlertHistory();
  if (history.length !== 0) {
    throw new Error(`Expected 0 alerts after clear, got ${history.length}`);
  }

  const stats = alertSystem.getStatistics();
  if (stats.total !== 0) {
    throw new Error(`Expected 0 total in stats after clear, got ${stats.total}`);
  }

  alertSystem.stop();
});

runner.run();
