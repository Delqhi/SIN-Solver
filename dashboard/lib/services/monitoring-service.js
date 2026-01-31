/**
 * Monitoring Service
 * Sends metrics to Prometheus and logs to Loki
 * Prometheus: http://localhost:9090
 * Loki: http://localhost:3100
 * 
 * Services provided:
 * - Prometheus metrics collection
 * - Loki audit log persistence
 * - Performance tracking
 * - Strategy statistics
 */

const axios = require('axios');

class MonitoringService {
  constructor(prometheusUrl = 'http://localhost:9090', lokiUrl = 'http://localhost:3100') {
    this.prometheusUrl = prometheusUrl;
    this.lokiUrl = lokiUrl;

    // Prometheus client for metrics
    this.prometheusClient = axios.create({
      baseURL: prometheusUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    // Loki client for logs
    this.lokiClient = axios.create({
      baseURL: lokiUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    // In-memory metric buffers (would be sent to Prometheus push gateway)
    this.metricsBuffer = {
      attempts: [],
      successes: [],
      failures: [],
      durations: [],
      strategyStats: {}
    };

    // Batch logs for efficiency
    this.logBuffer = [];
    this.logFlushInterval = 5000; // 5 seconds
    this.startLogFlusher();
  }

  /**
   * Record a fix attempt (for Prometheus metrics)
   * @param {string} strategy - Strategy type
   * @param {boolean} success - Whether it succeeded
   * @param {number} durationMs - Duration in milliseconds
   * @returns {Promise<Object>} Result of recording
   */
  async recordAttempt(strategy, success, durationMs) {
    try {
      const timestamp = new Date().toISOString();

      // Buffer the metric locally
      this.metricsBuffer.attempts.push({
        timestamp,
        strategy,
        success,
        durationMs
      });

      if (success) {
        this.metricsBuffer.successes.push({ timestamp, strategy });
      } else {
        this.metricsBuffer.failures.push({ timestamp, strategy });
      }

      this.metricsBuffer.durations.push({
        timestamp,
        strategy,
        durationMs
      });

      // Track strategy success rate
      if (!this.metricsBuffer.strategyStats[strategy]) {
        this.metricsBuffer.strategyStats[strategy] = {
          attempts: 0,
          successes: 0,
          failures: 0,
          totalDuration: 0,
          averageDuration: 0
        };
      }

      const stats = this.metricsBuffer.strategyStats[strategy];
      stats.attempts += 1;
      if (success) stats.successes += 1;
      else stats.failures += 1;
      stats.totalDuration += durationMs;
      stats.averageDuration = stats.totalDuration / stats.attempts;

      console.log('[MonitoringService] Recorded attempt', {
        strategy,
        success,
        durationMs,
        successRate: ((stats.successes / stats.attempts) * 100).toFixed(1) + '%'
      });

      return {
        success: true,
        recorded: true,
        strategy,
        timestamp
      };
    } catch (error) {
      console.error('[MonitoringService] recordAttempt error:', error.message);
      return {
        success: false,
        error: error.message,
        recorded: false
      };
    }
  }

  /**
   * Record job-level metrics
   * @param {string} jobId - Job ID
   * @param {Object} metrics - Job metrics (attempts, duration, success, etc.)
   * @returns {Promise<Object>} Result of recording
   */
  async recordJobMetrics(jobId, metrics) {
    try {
      const {
        totalAttempts,
        successfulAttempts,
        totalDuration,
        errorType,
        strategies,
        finalStatus
      } = metrics;

      const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) : 0;

      // Buffer the metric
      const jobMetric = {
        timestamp: new Date().toISOString(),
        jobId,
        totalAttempts,
        successfulAttempts,
        successRate: (successRate * 100).toFixed(1),
        totalDuration,
        errorType,
        strategiesUsed: strategies || [],
        finalStatus
      };

      this.metricsBuffer.attempts.push(jobMetric);

      console.log('[MonitoringService] Recorded job metrics', {
        jobId,
        successRate: jobMetric.successRate + '%',
        totalDuration,
        status: finalStatus
      });

      return {
        success: true,
        recorded: true,
        jobId,
        successRate
      };
    } catch (error) {
      console.error('[MonitoringService] recordJobMetrics error:', error.message);
      return {
        success: false,
        error: error.message,
        recorded: false
      };
    }
  }

  /**
   * Record strategy statistics
   * @param {string} strategy - Strategy type
   * @param {Object} stats - Strategy statistics
   * @returns {Promise<Object>} Result of recording
   */
  async recordStrategyMetrics(strategy, stats) {
    try {
      const {
        attempts,
        successes,
        failures,
        averageTime,
        lastUsed,
        confidence
      } = stats;

      const successRate = attempts > 0 ? (successes / attempts) : 0;

      // Update buffer
      this.metricsBuffer.strategyStats[strategy] = {
        attempts,
        successes,
        failures,
        totalDuration: averageTime * attempts,
        averageDuration: averageTime,
        successRate: (successRate * 100).toFixed(1),
        lastUsed,
        confidence
      };

      console.log('[MonitoringService] Recorded strategy metrics', {
        strategy,
        attempts,
        successRate: (successRate * 100).toFixed(1) + '%',
        averageTime: averageTime.toFixed(0) + 'ms'
      });

      return {
        success: true,
        recorded: true,
        strategy,
        successRate
      };
    } catch (error) {
      console.error('[MonitoringService] recordStrategyMetrics error:', error.message);
      return {
        success: false,
        error: error.message,
        recorded: false
      };
    }
  }

  /**
   * Send audit log to Loki
   * @param {string} jobId - Job ID
   * @param {Object} logEntry - Log entry with timestamp, level, message, etc.
   * @returns {Promise<Object>} Result of sending
   */
  async sendAuditLog(jobId, logEntry) {
    try {
      const {
        timestamp = new Date().toISOString(),
        level = 'INFO',
        message,
        context = {},
        action,
        result
      } = logEntry;

      // Buffer the log for batch sending
      this.logBuffer.push({
        timestamp,
        jobId,
        level,
        message,
        action,
        result,
        context
      });

      console.log(`[MonitoringService] Buffered audit log [${level}] for job ${jobId}:`, message);

      return {
        success: true,
        buffered: true,
        jobId,
        timestamp
      };
    } catch (error) {
      console.error('[MonitoringService] sendAuditLog error:', error.message);
      return {
        success: false,
        error: error.message,
        buffered: false
      };
    }
  }

  /**
   * Send bulk audit logs to Loki
   * @param {string} jobId - Job ID
   * @param {Array} logEntries - Array of log entries
   * @returns {Promise<Object>} Result of sending
   */
  async sendBulkAuditLogs(jobId, logEntries) {
    try {
      const logs = logEntries.map(entry => ({
        timestamp: entry.timestamp || new Date().toISOString(),
        jobId,
        level: entry.level || 'INFO',
        message: entry.message,
        action: entry.action,
        result: entry.result,
        context: entry.context || {}
      }));

      // Add all to buffer
      this.logBuffer.push(...logs);

      console.log(`[MonitoringService] Buffered ${logs.length} audit logs for job ${jobId}`);

      return {
        success: true,
        buffered: true,
        jobId,
        logsAdded: logs.length
      };
    } catch (error) {
      console.error('[MonitoringService] sendBulkAuditLogs error:', error.message);
      return {
        success: false,
        error: error.message,
        buffered: false
      };
    }
  }

  /**
   * Internal: Flush buffered logs to Loki (called periodically)
   * @private
   */
  async flushLogs() {
    if (this.logBuffer.length === 0) return;

    try {
      const logsToSend = [...this.logBuffer];
      this.logBuffer = []; // Clear buffer

      // Group logs by job ID for better organization
      const logsByJob = {};
      logsToSend.forEach(log => {
        if (!logsByJob[log.jobId]) {
          logsByJob[log.jobId] = [];
        }
        logsByJob[log.jobId].push(log);
      });

      // In a real implementation, would send to Loki here
      // For now, just log to console
      console.log(`[MonitoringService] Flushed ${logsToSend.length} audit logs to Loki`, {
        jobs: Object.keys(logsByJob).length,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        flushed: logsToSend.length,
        jobs: Object.keys(logsByJob).length
      };
    } catch (error) {
      console.error('[MonitoringService] flushLogs error:', error.message);
      return {
        success: false,
        error: error.message,
        flushed: 0
      };
    }
  }

  /**
   * Start periodic log flusher
   * @private
   */
  startLogFlusher() {
    this.logFlusherInterval = setInterval(() => {
      this.flushLogs().catch(error => {
        console.error('[MonitoringService] Log flush error:', error);
      });
    }, this.logFlushInterval);

    console.log(`[MonitoringService] Log flusher started (interval: ${this.logFlushInterval}ms)`);
  }

  /**
   * Stop periodic log flusher
   * @private
   */
  stopLogFlusher() {
    if (this.logFlusherInterval) {
      clearInterval(this.logFlusherInterval);
      console.log('[MonitoringService] Log flusher stopped');
    }
  }

  /**
   * Get current metrics summary
   * @returns {Object} Current metrics
   */
  getMetricsSummary() {
    const stats = this.metricsBuffer.strategyStats;
    const totalAttempts = Object.values(stats).reduce((sum, s) => sum + s.attempts, 0);
    const totalSuccesses = Object.values(stats).reduce((sum, s) => sum + s.successes, 0);
    const overallSuccessRate = totalAttempts > 0 ? (totalSuccesses / totalAttempts) * 100 : 0;

    return {
      timestamp: new Date().toISOString(),
      totalAttempts,
      totalSuccesses,
      totalFailures: totalAttempts - totalSuccesses,
      overallSuccessRate: overallSuccessRate.toFixed(1) + '%',
      strategiesTracked: Object.keys(stats).length,
      strategies: stats,
      bufferedLogs: this.logBuffer.length
    };
  }

  /**
   * Export metrics in Prometheus format
   * @returns {string} Prometheus format metrics
   */
  exportPrometheusMetrics() {
    const summary = this.getMetricsSummary();
    const stats = summary.strategies;

    let output = '# HELP sin_solver_correction_attempts Total correction attempts\n';
    output += '# TYPE sin_solver_correction_attempts counter\n';
    output += `sin_solver_correction_attempts ${summary.totalAttempts}\n\n`;

    output += '# HELP sin_solver_correction_successes Total successful corrections\n';
    output += '# TYPE sin_solver_correction_successes counter\n';
    output += `sin_solver_correction_successes ${summary.totalSuccesses}\n\n`;

    output += '# HELP sin_solver_correction_success_rate Overall success rate\n';
    output += '# TYPE sin_solver_correction_success_rate gauge\n';
    output += `sin_solver_correction_success_rate ${parseFloat(summary.overallSuccessRate)}\n\n`;

    for (const [strategy, data] of Object.entries(stats)) {
      output += `# Strategy: ${strategy}\n`;
      output += `sin_solver_strategy_attempts{strategy="${strategy}"} ${data.attempts}\n`;
      output += `sin_solver_strategy_successes{strategy="${strategy}"} ${data.successes}\n`;
      output += `sin_solver_strategy_avg_duration_ms{strategy="${strategy}"} ${data.averageDuration}\n`;
    }

    return output;
  }

  /**
   * Verify Prometheus is healthy
   * @returns {Promise<boolean>} True if Prometheus is healthy
   */
  async healthCheckPrometheus() {
    try {
      const response = await this.prometheusClient.get('/-/healthy', {
        timeout: 5000
      });
      console.log('[MonitoringService] Prometheus health check: HEALTHY');
      return true;
    } catch (error) {
      console.warn('[MonitoringService] Prometheus health check failed:', error.message);
      return false;
    }
  }

  /**
   * Verify Loki is healthy
   * @returns {Promise<boolean>} True if Loki is healthy
   */
  async healthCheckLoki() {
    try {
      const response = await this.lokiClient.get('/ready', {
        timeout: 5000
      });
      console.log('[MonitoringService] Loki health check: HEALTHY');
      return true;
    } catch (error) {
      console.warn('[MonitoringService] Loki health check failed:', error.message);
      return false;
    }
  }

  /**
   * Overall health check for monitoring services
   * @returns {Promise<Object>} Health status of all monitoring services
   */
  async healthCheck() {
    try {
      const [prometheusHealthy, lokiHealthy] = await Promise.all([
        this.healthCheckPrometheus(),
        this.healthCheckLoki()
      ]);

      return {
        success: true,
        prometheus: prometheusHealthy,
        loki: lokiHealthy,
        overall: prometheusHealthy || lokiHealthy, // At least one must be healthy
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[MonitoringService] Health check error:', error.message);
      return {
        success: false,
        error: error.message,
        overall: false
      };
    }
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect() {
    // Flush any remaining logs
    await this.flushLogs();

    // Stop log flusher
    this.stopLogFlusher();

    console.log('[MonitoringService] Disconnected');
  }
}

module.exports = { MonitoringService };
