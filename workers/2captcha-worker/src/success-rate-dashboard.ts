/**
 * Success Rate Dashboard for CAPTCHA Solving
 * Tracks and displays success rates, statistics, and performance metrics
 */

import * as fs from 'fs';
import * as path from 'path';

interface SolveAttempt {
  id: string;
  timestamp: number;
  captchaType: string;
  success: boolean;
  durationMs: number;
  provider: string;
  error?: string;
  url: string;
}

interface DashboardStats {
  totalAttempts: number;
  successfulSolves: number;
  failedSolves: number;
  successRate: number;
  averageDuration: number;
  fastestSolve: number;
  slowestSolve: number;
  byType: Map<string, { attempts: number; successes: number; rate: number }>;
  byProvider: Map<string, { attempts: number; successes: number; rate: number }>;
  hourlyStats: Map<number, { attempts: number; successes: number }>;
}

export class SuccessRateDashboard {
  private attempts: SolveAttempt[] = [];
  private dataDir: string;
  private maxHistory: number;

  constructor(dataDir: string = './dashboard-data', maxHistory: number = 10000) {
    this.dataDir = dataDir;
    this.maxHistory = maxHistory;
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    this.loadHistory();
  }

  /**
   * Record a solve attempt
   */
  recordAttempt(attempt: Omit<SolveAttempt, 'id' | 'timestamp'>): void {
    const fullAttempt: SolveAttempt = {
      ...attempt,
      id: this.generateId(),
      timestamp: Date.now()
    };
    
    this.attempts.push(fullAttempt);
    
    // Trim history if too large
    if (this.attempts.length > this.maxHistory) {
      this.attempts = this.attempts.slice(-this.maxHistory);
    }
    
    // Auto-save every 10 attempts
    if (this.attempts.length % 10 === 0) {
      this.saveHistory();
    }
  }

  private generateId(): string {
    return `solve-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get comprehensive statistics
   */
  getStats(timeWindow?: { start: number; end: number }): DashboardStats {
    let attempts = this.attempts;
    
    if (timeWindow) {
      attempts = attempts.filter(a => a.timestamp >= timeWindow.start && a.timestamp <= timeWindow.end);
    }
    
    const total = attempts.length;
    const successful = attempts.filter(a => a.success).length;
    const failed = total - successful;
    const successRate = total > 0 ? (successful / total) * 100 : 0;
    
    const durations = attempts.filter(a => a.success).map(a => a.durationMs);
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    
    return {
      totalAttempts: total,
      successfulSolves: successful,
      failedSolves: failed,
      successRate,
      averageDuration: avgDuration,
      fastestSolve: durations.length > 0 ? Math.min(...durations) : 0,
      slowestSolve: durations.length > 0 ? Math.max(...durations) : 0,
      byType: this.getStatsByType(attempts),
      byProvider: this.getStatsByProvider(attempts),
      hourlyStats: this.getHourlyStats(attempts)
    };
  }

  private getStatsByType(attempts: SolveAttempt[]): Map<string, { attempts: number; successes: number; rate: number }> {
    const stats = new Map();
    
    for (const attempt of attempts) {
      const current = stats.get(attempt.captchaType) || { attempts: 0, successes: 0 };
      current.attempts++;
      if (attempt.success) current.successes++;
      stats.set(attempt.captchaType, current);
    }
    
    // Calculate rates
    for (const [type, data] of stats) {
      data.rate = data.attempts > 0 ? (data.successes / data.attempts) * 100 : 0;
    }
    
    return stats;
  }

  private getStatsByProvider(attempts: SolveAttempt[]): Map<string, { attempts: number; successes: number; rate: number }> {
    const stats = new Map();
    
    for (const attempt of attempts) {
      const current = stats.get(attempt.provider) || { attempts: 0, successes: 0 };
      current.attempts++;
      if (attempt.success) current.successes++;
      stats.set(attempt.provider, current);
    }
    
    // Calculate rates
    for (const [provider, data] of stats) {
      data.rate = data.attempts > 0 ? (data.successes / data.attempts) * 100 : 0;
    }
    
    return stats;
  }

  private getHourlyStats(attempts: SolveAttempt[]): Map<number, { attempts: number; successes: number }> {
    const stats = new Map();
    
    for (const attempt of attempts) {
      const hour = Math.floor(attempt.timestamp / (1000 * 60 * 60));
      const current = stats.get(hour) || { attempts: 0, successes: 0 };
      current.attempts++;
      if (attempt.success) current.successes++;
      stats.set(hour, current);
    }
    
    return stats;
  }

  /**
   * Generate HTML dashboard
   */
  generateHTMLDashboard(): string {
    const stats = this.getStats();
    const htmlPath = path.join(this.dataDir, `dashboard-${Date.now()}.html`);
    
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>CAPTCHA Success Rate Dashboard</title>
  <meta charset="utf-8"/>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #2c3e50; margin-bottom: 30px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .stat-label { color: #7f8c8d; font-size: 14px; text-transform: uppercase; }
    .stat-value { font-size: 32px; font-weight: bold; color: #2c3e50; margin: 10px 0; }
    .stat-sub { color: #95a5a6; font-size: 12px; }
    .success { color: #27ae60; }
    .warning { color: #f39c12; }
    .danger { color: #e74c3c; }
    table { width: 100%; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 30px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ecf0f1; }
    th { background: #34495e; color: white; font-weight: 600; }
    tr:hover { background: #f8f9fa; }
    .progress-bar { height: 20px; background: #ecf0f1; border-radius: 10px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #27ae60, #2ecc71); transition: width 0.3s; }
    .section { margin-bottom: 40px; }
    .section h2 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎯 CAPTCHA Success Rate Dashboard</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Attempts</div>
        <div class="stat-value">${stats.totalAttempts}</div>
        <div class="stat-sub">All time</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-label">Success Rate</div>
        <div class="stat-value ${stats.successRate >= 80 ? 'success' : stats.successRate >= 50 ? 'warning' : 'danger'}">
          ${stats.successRate.toFixed(1)}%
        </div>
        <div class="stat-sub">${stats.successfulSolves} successful / ${stats.failedSolves} failed</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-label">Avg Duration</div>
        <div class="stat-value">${(stats.averageDuration / 1000).toFixed(1)}s</div>
        <div class="stat-sub">Per solve</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-label">Fastest Solve</div>
        <div class="stat-value success">${(stats.fastestSolve / 1000).toFixed(1)}s</div>
        <div class="stat-sub">Best time</div>
      </div>
    </div>
    
    <div class="section">
      <h2>📊 Success Rate by CAPTCHA Type</h2>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Attempts</th>
            <th>Successes</th>
            <th>Success Rate</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from(stats.byType.entries()).map(([type, data]) => `
            <tr>
              <td>${type}</td>
              <td>${data.attempts}</td>
              <td>${data.successes}</td>
              <td>${data.rate.toFixed(1)}%</td>
              <td>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${data.rate}%"></div>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="section">
      <h2>🔧 Success Rate by Provider</h2>
      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Attempts</th>
            <th>Successes</th>
            <th>Success Rate</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from(stats.byProvider.entries()).map(([provider, data]) => `
            <tr>
              <td>${provider}</td>
              <td>${data.attempts}</td>
              <td>${data.successes}</td>
              <td>${data.rate.toFixed(1)}%</td>
              <td>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${data.rate}%"></div>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="section">
      <h2>⏰ Hourly Activity (Last 24h)</h2>
      <table>
        <thead>
          <tr>
            <th>Hour</th>
            <th>Attempts</th>
            <th>Successes</th>
            <th>Success Rate</th>
          </tr>
        </thead>
        <tbody>
          ${Array.from(stats.hourlyStats.entries())
            .sort((a, b) => b[0] - a[0])
            .slice(0, 24)
            .map(([hour, data]) => {
              const rate = data.attempts > 0 ? (data.successes / data.attempts) * 100 : 0;
              const date = new Date(hour * 60 * 60 * 1000);
              return `
                <tr>
                  <td>${date.toLocaleString()}</td>
                  <td>${data.attempts}</td>
                  <td>${data.successes}</td>
                  <td>${rate.toFixed(1)}%</td>
                </tr>
              `;
            }).join('')}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
    
    fs.writeFileSync(htmlPath, html);
    console.log(`📊 Dashboard generated: ${htmlPath}`);
    return htmlPath;
  }

  /**
   * Generate JSON report
   */
  generateJSONReport(): string {
    const stats = this.getStats();
    const reportPath = path.join(this.dataDir, `report-${Date.now()}.json`);
    
    const report = {
      generatedAt: new Date().toISOString(),
      stats: {
        ...stats,
        byType: Object.fromEntries(stats.byType),
        byProvider: Object.fromEntries(stats.byProvider),
        hourlyStats: Object.fromEntries(stats.hourlyStats)
      },
      recentAttempts: this.attempts.slice(-50)
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 JSON report generated: ${reportPath}`);
    return reportPath;
  }

  /**
   * Print console dashboard
   */
  printConsoleDashboard(): void {
    const stats = this.getStats();
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  📊 CAPTCHA SUCCESS RATE DASHBOARD                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log(`\nTotal Attempts:    ${stats.totalAttempts}`);
    console.log(`Success Rate:      ${stats.successRate.toFixed(1)}%`);
    console.log(`Successful:        ${stats.successfulSolves}`);
    console.log(`Failed:            ${stats.failedSolves}`);
    console.log(`Avg Duration:      ${(stats.averageDuration / 1000).toFixed(1)}s`);
    console.log(`Fastest:           ${(stats.fastestSolve / 1000).toFixed(1)}s`);
    console.log(`Slowest:           ${(stats.slowestSolve / 1000).toFixed(1)}s`);
    
    console.log('\n📈 By CAPTCHA Type:');
    for (const [type, data] of stats.byType) {
      const bar = '█'.repeat(Math.floor(data.rate / 5)) + '░'.repeat(20 - Math.floor(data.rate / 5));
      console.log(`  ${type.padEnd(15)} ${bar} ${data.rate.toFixed(1)}% (${data.successes}/${data.attempts})`);
    }
    
    console.log('\n🔧 By Provider:');
    for (const [provider, data] of stats.byProvider) {
      const bar = '█'.repeat(Math.floor(data.rate / 5)) + '░'.repeat(20 - Math.floor(data.rate / 5));
      console.log(`  ${provider.padEnd(15)} ${bar} ${data.rate.toFixed(1)}% (${data.successes}/${data.attempts})`);
    }
    
    console.log('\n─────────────────────────────────────────────────────────────\n');
  }

  /**
   * Save history to disk
   */
  private saveHistory(): void {
    const historyPath = path.join(this.dataDir, 'history.json');
    fs.writeFileSync(historyPath, JSON.stringify(this.attempts, null, 2));
  }

  /**
   * Load history from disk
   */
  private loadHistory(): void {
    const historyPath = path.join(this.dataDir, 'history.json');
    
    if (fs.existsSync(historyPath)) {
      try {
        const data = fs.readFileSync(historyPath, 'utf-8');
        this.attempts = JSON.parse(data);
        console.log(`📂 Loaded ${this.attempts.length} historical attempts`);
      } catch (error) {
        console.warn('⚠️ Failed to load history:', error);
      }
    }
  }

  /**
   * Get recent attempts
   */
  getRecentAttempts(count: number = 10): SolveAttempt[] {
    return this.attempts.slice(-count);
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.attempts = [];
    this.saveHistory();
    console.log('🗑️ Dashboard data cleared');
  }
}

export default SuccessRateDashboard;
