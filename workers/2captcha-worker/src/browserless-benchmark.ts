/**
 * Performance Benchmark for Browserless
 * Measures connection time, navigation speed, screenshot performance
 */

import { AutoHealingCDPManager } from './auto-healing-cdp';

interface BenchmarkResult {
  testName: string;
  durationMs: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

interface BenchmarkSuite {
  name: string;
  results: BenchmarkResult[];
  totalDuration: number;
  passed: number;
  failed: number;
}

export class BrowserlessBenchmark {
  private config = {
    httpUrl: 'http://localhost:50072',
    token: 'delqhi-admin',
    iterations: 5,
    warmupRuns: 1
  };

  private results: BenchmarkSuite[] = [];

  /**
   * Run complete benchmark suite
   */
  async runBenchmarks(): Promise<void> {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  TASK 118: Browserless Performance Benchmark              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Warmup
    console.log('🔥 Warming up...');
    await this.warmup();
    console.log('✅ Warmup complete\n');

    // Run benchmarks
    await this.benchmarkConnection();
    await this.benchmarkNavigation();
    await this.benchmarkScreenshot();
    await this.benchmarkCDPCommands();
    await this.benchmarkConcurrentSessions();

    // Generate report
    this.generateReport();
  }

  /**
   * Warmup run to stabilize results
   */
  private async warmup(): Promise<void> {
    const manager = new AutoHealingCDPManager({
      httpUrl: this.config.httpUrl,
      token: this.config.token
    });

    await manager.connect();
    await manager.navigate('https://example.com');
    await manager.disconnect();
  }

  /**
   * Benchmark connection establishment
   */
  private async benchmarkConnection(): Promise<void> {
    console.log('📊 Benchmarking Connection...');
    const suite: BenchmarkSuite = {
      name: 'Connection Establishment',
      results: [],
      totalDuration: 0,
      passed: 0,
      failed: 0
    };

    for (let i = 0; i < this.config.iterations; i++) {
      const start = Date.now();
      const manager = new AutoHealingCDPManager({
        httpUrl: this.config.httpUrl,
        token: this.config.token
      });

      try {
        await manager.connect();
        const duration = Date.now() - start;
        
        suite.results.push({
          testName: `Connection #${i + 1}`,
          durationMs: duration,
          success: true
        });
        suite.passed++;
        
        await manager.disconnect();
      } catch (error) {
        suite.results.push({
          testName: `Connection #${i + 1}`,
          durationMs: Date.now() - start,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        suite.failed++;
      }
    }

    suite.totalDuration = suite.results.reduce((sum, r) => sum + r.durationMs, 0);
    this.results.push(suite);
    this.printSuiteResults(suite);
  }

  /**
   * Benchmark navigation speed
   */
  private async benchmarkNavigation(): Promise<void> {
    console.log('\n📊 Benchmarking Navigation...');
    const suite: BenchmarkSuite = {
      name: 'Page Navigation',
      results: [],
      totalDuration: 0,
      passed: 0,
      failed: 0
    };

    const manager = new AutoHealingCDPManager({
      httpUrl: this.config.httpUrl,
      token: this.config.token
    });

    await manager.connect();

    const urls = [
      'https://example.com',
      'https://httpbin.org/html',
      'https://www.wikipedia.org'
    ];

    for (const url of urls) {
      for (let i = 0; i < this.config.iterations; i++) {
        const start = Date.now();
        
        try {
          await manager.navigate(url);
          const duration = Date.now() - start;
          
          suite.results.push({
            testName: `${url} - Run #${i + 1}`,
            durationMs: duration,
            success: true,
            metadata: { url }
          });
          suite.passed++;
        } catch (error) {
          suite.results.push({
            testName: `${url} - Run #${i + 1}`,
            durationMs: Date.now() - start,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            metadata: { url }
          });
          suite.failed++;
        }
      }
    }

    await manager.disconnect();

    suite.totalDuration = suite.results.reduce((sum, r) => sum + r.durationMs, 0);
    this.results.push(suite);
    this.printSuiteResults(suite);
  }

  /**
   * Benchmark screenshot capture
   */
  private async benchmarkScreenshot(): Promise<void> {
    console.log('\n📊 Benchmarking Screenshot Capture...');
    const suite: BenchmarkSuite = {
      name: 'Screenshot Capture',
      results: [],
      totalDuration: 0,
      passed: 0,
      failed: 0
    };

    const manager = new AutoHealingCDPManager({
      httpUrl: this.config.httpUrl,
      token: this.config.token
    });

    await manager.connect();
    await manager.navigate('https://example.com');

    for (let i = 0; i < this.config.iterations; i++) {
      const start = Date.now();
      
      try {
        const result = await manager.sendCommand('Page.captureScreenshot', {
          format: 'png',
          fromSurface: true
        });
        
        const duration = Date.now() - start;
        const hasData = result?.data || result?.result?.data;
        
        suite.results.push({
          testName: `Screenshot #${i + 1}`,
          durationMs: duration,
          success: !!hasData,
          metadata: { 
            hasData: !!hasData,
            dataLength: hasData ? hasData.length : 0
          }
        });
        
        if (hasData) {
          suite.passed++;
        } else {
          suite.failed++;
        }
      } catch (error) {
        suite.results.push({
          testName: `Screenshot #${i + 1}`,
          durationMs: Date.now() - start,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
        suite.failed++;
      }
    }

    await manager.disconnect();

    suite.totalDuration = suite.results.reduce((sum, r) => sum + r.durationMs, 0);
    this.results.push(suite);
    this.printSuiteResults(suite);
  }

  /**
   * Benchmark CDP command execution
   */
  private async benchmarkCDPCommands(): Promise<void> {
    console.log('\n📊 Benchmarking CDP Commands...');
    const suite: BenchmarkSuite = {
      name: 'CDP Command Execution',
      results: [],
      totalDuration: 0,
      passed: 0,
      failed: 0
    };

    const manager = new AutoHealingCDPManager({
      httpUrl: this.config.httpUrl,
      token: this.config.token
    });

    await manager.connect();
    await manager.navigate('https://example.com');

    const commands = [
      { method: 'Runtime.evaluate', params: { expression: 'document.title' } },
      { method: 'DOM.getDocument', params: {} },
      { method: 'Page.getNavigationHistory', params: {} }
    ];

    for (const cmd of commands) {
      for (let i = 0; i < this.config.iterations; i++) {
        const start = Date.now();
        
        try {
          await manager.sendCommand(cmd.method, cmd.params);
          const duration = Date.now() - start;
          
          suite.results.push({
            testName: `${cmd.method} - Run #${i + 1}`,
            durationMs: duration,
            success: true,
            metadata: { method: cmd.method }
          });
          suite.passed++;
        } catch (error) {
          suite.results.push({
            testName: `${cmd.method} - Run #${i + 1}`,
            durationMs: Date.now() - start,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            metadata: { method: cmd.method }
          });
          suite.failed++;
        }
      }
    }

    await manager.disconnect();

    suite.totalDuration = suite.results.reduce((sum, r) => sum + r.durationMs, 0);
    this.results.push(suite);
    this.printSuiteResults(suite);
  }

  /**
   * Benchmark concurrent sessions
   */
  private async benchmarkConcurrentSessions(): Promise<void> {
    console.log('\n📊 Benchmarking Concurrent Sessions...');
    const suite: BenchmarkSuite = {
      name: 'Concurrent Sessions',
      results: [],
      totalDuration: 0,
      passed: 0,
      failed: 0
    };

    const concurrentCount = 3;
    const start = Date.now();

    try {
      const sessions = await Promise.all(
        Array(concurrentCount).fill(null).map(async (_, i) => {
          const sessionStart = Date.now();
          const manager = new AutoHealingCDPManager({
            httpUrl: this.config.httpUrl,
            token: this.config.token
          });

          await manager.connect();
          await manager.navigate('https://example.com');
          
          return {
            index: i,
            duration: Date.now() - sessionStart,
            manager
          };
        })
      );

      const totalDuration = Date.now() - start;

      // Cleanup
      await Promise.all(sessions.map(s => s.manager.disconnect()));

      suite.results.push({
        testName: `${concurrentCount} Concurrent Sessions`,
        durationMs: totalDuration,
        success: true,
        metadata: {
          concurrentCount,
          avgSessionTime: sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length
        }
      });
      suite.passed++;
    } catch (error) {
      suite.results.push({
        testName: `${concurrentCount} Concurrent Sessions`,
        durationMs: Date.now() - start,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      suite.failed++;
    }

    suite.totalDuration = suite.results.reduce((sum, r) => sum + r.durationMs, 0);
    this.results.push(suite);
    this.printSuiteResults(suite);
  }

  /**
   * Print suite results
   */
  private printSuiteResults(suite: BenchmarkSuite): void {
    const avg = suite.results.length > 0 ? suite.totalDuration / suite.results.length : 0;
    const min = Math.min(...suite.results.map(r => r.durationMs));
    const max = Math.max(...suite.results.map(r => r.durationMs));

    console.log(`  ✅ Passed: ${suite.passed}/${suite.results.length}`);
    console.log(`  ⏱️  Average: ${avg.toFixed(2)}ms`);
    console.log(`  ⚡ Min: ${min}ms | Max: ${max}ms`);
    console.log(`  📊 Total: ${suite.totalDuration}ms`);
  }

  /**
   * Generate benchmark report
   */
  private generateReport(): void {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  BENCHMARK SUMMARY                                         ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    let totalTests = 0;
    let totalPassed = 0;
    let totalDuration = 0;

    for (const suite of this.results) {
      totalTests += suite.results.length;
      totalPassed += suite.passed;
      totalDuration += suite.totalDuration;
      
      const avg = suite.results.length > 0 ? suite.totalDuration / suite.results.length : 0;
      console.log(`\n${suite.name}:`);
      console.log(`  Tests: ${suite.results.length} | Passed: ${suite.passed} | Failed: ${suite.failed}`);
      console.log(`  Avg: ${avg.toFixed(2)}ms | Total: ${suite.totalDuration}ms`);
    }

    console.log('\n─────────────────────────────────────────────────────────────');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Total Passed: ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log('─────────────────────────────────────────────────────────────');
    console.log('\n✅ Benchmark Complete!\n');

    // Save report to file
    const fs = require('fs');
    const reportPath = `./benchmark-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      config: this.config,
      results: this.results,
      summary: {
        totalTests,
        totalPassed,
        totalFailed: totalTests - totalPassed,
        totalDuration,
        passRate: ((totalPassed / totalTests) * 100).toFixed(1)
      }
    }, null, 2));
    
    console.log(`📊 Report saved to: ${reportPath}`);
  }
}

export default BrowserlessBenchmark;
