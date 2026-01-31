import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';

interface BenchmarkResult {
  name: string;
  durationMs: number;
  memoryMB: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

interface PerformanceAlert {
  metric: string;
  threshold: number;
  actual: number;
  severity: 'warning' | 'critical';
  timestamp: number;
}

export class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];
  private alerts: PerformanceAlert[] = [];
  private baselineMetrics: Map<string, number> = new Map();

  constructor(
    private config = {
      alertThresholds: {
        solveTimeWarning: 20000,
        solveTimeCritical: 30000,
        memoryWarning: 512,
        memoryCritical: 1024,
        successRateWarning: 70,
        successRateCritical: 50
      },
      baselineFile: './benchmark-baseline.json'
    }
  ) {
    this.loadBaseline();
  }

  private loadBaseline(): void {
    if (fs.existsSync(this.config.baselineFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(this.config.baselineFile, 'utf-8'));
        this.baselineMetrics = new Map(Object.entries(data));
      } catch (error) {
        console.error('Failed to load baseline:', error);
      }
    }
  }

  private saveBaseline(): void {
    const data = Object.fromEntries(this.baselineMetrics);
    fs.writeFileSync(this.config.baselineFile, JSON.stringify(data, null, 2));
  }

  /**
   * Run benchmark test
   */
  async runBenchmark(
    name: string,
    testFn: () => Promise<void>
  ): Promise<BenchmarkResult> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed / 1024 / 1024;

    try {
      await testFn();
      
      const durationMs = performance.now() - startTime;
      const memoryMB = (process.memoryUsage().heapUsed / 1024 / 1024) - startMemory;

      const result: BenchmarkResult = {
        name,
        durationMs,
        memoryMB,
        success: true,
        timestamp: Date.now()
      };

      this.results.push(result);
      this.checkRegression(name, durationMs, memoryMB);
      
      return result;
    } catch (error) {
      const durationMs = performance.now() - startTime;
      const memoryMB = (process.memoryUsage().heapUsed / 1024 / 1024) - startMemory;

      const result: BenchmarkResult = {
        name,
        durationMs,
        memoryMB,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: Date.now()
      };

      this.results.push(result);
      return result;
    }
  }

  private checkRegression(name: string, durationMs: number, memoryMB: number): void {
    const baseline = this.baselineMetrics.get(name);
    
    if (baseline && durationMs > baseline * 1.5) {
      this.alerts.push({
        metric: `${name}-duration`,
        threshold: baseline * 1.5,
        actual: durationMs,
        severity: 'warning',
        timestamp: Date.now()
      });
    }

    if (durationMs > this.config.alertThresholds.solveTimeCritical) {
      this.alerts.push({
        metric: `${name}-duration`,
        threshold: this.config.alertThresholds.solveTimeCritical,
        actual: durationMs,
        severity: 'critical',
        timestamp: Date.now()
      });
    }

    if (memoryMB > this.config.alertThresholds.memoryCritical) {
      this.alerts.push({
        metric: `${name}-memory`,
        threshold: this.config.alertThresholds.memoryCritical,
        actual: memoryMB,
        severity: 'critical',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get benchmark statistics
   */
  getStats(): {
    totalTests: number;
    successRate: number;
    avgDuration: number;
    avgMemory: number;
    alerts: PerformanceAlert[];
  } {
    const successful = this.results.filter(r => r.success);
    const totalDuration = this.results.reduce((sum, r) => sum + r.durationMs, 0);
    const totalMemory = this.results.reduce((sum, r) => sum + r.memoryMB, 0);

    return {
      totalTests: this.results.length,
      successRate: this.results.length > 0 ? (successful.length / this.results.length * 100) : 0,
      avgDuration: this.results.length > 0 ? totalDuration / this.results.length : 0,
      avgMemory: this.results.length > 0 ? totalMemory / this.results.length : 0,
      alerts: this.alerts
    };
  }

  /**
   * Set baseline metrics
   */
  setBaseline(name: string, durationMs: number): void {
    this.baselineMetrics.set(name, durationMs);
    this.saveBaseline();
  }

  /**
   * Generate benchmark report
   */
  generateReport(): string {
    const stats = this.getStats();
    
    return `
# Performance Benchmark Report

Generated: ${new Date().toISOString()}

## Summary
- Total Tests: ${stats.totalTests}
- Success Rate: ${stats.successRate.toFixed(2)}%
- Average Duration: ${stats.avgDuration.toFixed(2)}ms
- Average Memory: ${stats.avgMemory.toFixed(2)}MB

## Results
${this.results.map(r => `
### ${r.name}
- Duration: ${r.durationMs.toFixed(2)}ms
- Memory: ${r.memoryMB.toFixed(2)}MB
- Status: ${r.success ? '✅ PASS' : '❌ FAIL'}
${r.error ? `- Error: ${r.error}` : ''}
`).join('\n')}

## Alerts
${stats.alerts.length > 0 ? stats.alerts.map(a => `
- **${a.severity.toUpperCase()}**: ${a.metric}
  - Threshold: ${a.threshold}
  - Actual: ${a.actual}
  - Time: ${new Date(a.timestamp).toISOString()}
`).join('\n') : 'No alerts'}
`;
  }

  /**
   * Run full benchmark suite
   */
  async runFullSuite(): Promise<void> {
    console.log('🚀 Running Performance Benchmark Suite\n');

    // Test 1: Navigation benchmark
    await this.runBenchmark('navigation', async () => {
      // Simulate navigation
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Test 2: CAPTCHA detection benchmark
    await this.runBenchmark('captcha-detection', async () => {
      // Simulate detection
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    // Test 3: CAPTCHA solving benchmark
    await this.runBenchmark('captcha-solving', async () => {
      // Simulate solving
      await new Promise(resolve => setTimeout(resolve, 500));
    });

    // Test 4: Full workflow benchmark
    await this.runBenchmark('full-workflow', async () => {
      // Simulate full workflow
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    console.log('\n📊 Benchmark Results:');
    console.table(this.results.map(r => ({
      Test: r.name,
      Duration: `${r.durationMs.toFixed(2)}ms`,
      Memory: `${r.memoryMB.toFixed(2)}MB`,
      Status: r.success ? '✅' : '❌'
    })));

    const stats = this.getStats();
    console.log(`\n📈 Summary: ${stats.successRate.toFixed(1)}% success rate, ${stats.avgDuration.toFixed(0)}ms avg`);

    if (stats.alerts.length > 0) {
      console.log('\n⚠️  Performance Alerts:');
      stats.alerts.forEach(a => {
        console.log(`  ${a.severity.toUpperCase()}: ${a.metric} (${a.actual} > ${a.threshold})`);
      });
    }

    // Save report
    const reportPath = `./benchmark-report-${Date.now()}.md`;
    fs.writeFileSync(reportPath, this.generateReport());
    console.log(`\n📝 Report saved: ${reportPath}`);
  }
}

export function createBenchmark(): PerformanceBenchmark {
  return new PerformanceBenchmark();
}
