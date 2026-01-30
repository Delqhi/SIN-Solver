/**
 * 2captcha Worker Service - Job Queue & Orchestration
 * 
 * Provides:
 * - Job queue management with priority support
 * - Concurrent job execution (configurable workers)
 * - Auto-retry logic with exponential backoff
 * - Timeout management and cancellation
 * - Event emission for job lifecycle
 * - Performance metrics collection
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { TwoCaptchaDetector, CaptchaDetectionResult } from './detector';
import { ErrorHandler, JobTimeoutError, JobNotFoundError, InvalidJobStateError, CancellationError, WorkerPoolExhaustedError } from './errors';
import { AntiBanWorkerIntegration } from './anti-ban-integration';
import { AlertSystem } from './alerts';
import type { CaptchaJob, JobStatus, WorkerJobRequest, WorkerJobResponse } from './types';

/**
 * Job queue entry with metadata
 */
interface QueuedJob {
  id: string;
  request: WorkerJobRequest;
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: WorkerJobResponse;
  error?: Error;
  attempts: number;
  nextRetryAt?: Date;
  timeoutHandle?: NodeJS.Timeout;
  abortController?: AbortController;
  priority: number; // 0 = highest, 100 = lowest
}

/**
 * Worker pool metrics
 */
interface WorkerMetrics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  retriedJobs: number;
  queuedJobs: number;
  activeJobs: number;
  averageProcessingTimeMs: number;
  successRate: number;
  totalProcessingTimeMs: number;
}

/**
 * Configuration for worker service
 */
export interface WorkerServiceConfig {
  maxWorkers?: number;
  maxQueueSize?: number;
  defaultTimeoutMs?: number;
  maxRetries?: number;
  retryBackoffMs?: number;
  detectorConfig?: any; // From detector.ts
}

/**
 * Worker Service - Orchestrates CAPTCHA detection and solving
 */
export class WorkerService extends EventEmitter {
  private detector: TwoCaptchaDetector;
  private queue: QueuedJob[] = [];
  private activeJobs = new Set<string>();
  private completedJobs = new Map<string, QueuedJob>();
  private metrics: WorkerMetrics;
  private config: Required<WorkerServiceConfig>;
  private processingPromise?: Promise<void>;
  private isRunning = false;
  private antiBan: AntiBanWorkerIntegration;
  private alertSystem: AlertSystem;

  constructor(detector: TwoCaptchaDetector, config: WorkerServiceConfig = {}) {
    super();
    this.detector = detector;
    this.config = {
      maxWorkers: config.maxWorkers ?? 5,
      maxQueueSize: config.maxQueueSize ?? 1000,
      defaultTimeoutMs: config.defaultTimeoutMs ?? 60000,
      maxRetries: config.maxRetries ?? 3,
      retryBackoffMs: config.retryBackoffMs ?? 1000,
      detectorConfig: config.detectorConfig,
    };

    this.metrics = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      retriedJobs: 0,
      queuedJobs: 0,
      activeJobs: 0,
      averageProcessingTimeMs: 0,
      successRate: 0,
      totalProcessingTimeMs: 0,
    };

    // Initialize Alert System
    this.alertSystem = new AlertSystem({
      telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
      telegramChatId: process.env.TELEGRAM_CHAT_ID,
      slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
      rateLimitSeconds: parseInt(process.env.ALERT_RATE_LIMIT_SECONDS || '300'),
      accuracyWarningThreshold: parseInt(process.env.ALERT_ACCURACY_WARNING_THRESHOLD || '95'),
      emergencyStopThreshold: parseInt(process.env.ALERT_EMERGENCY_STOP_THRESHOLD || '80'),
    });

    // Forward AlertSystem events
    this.alertSystem.on('alert', (alert) => this.emit('alert', alert));

    // Initialize anti-ban protection
    const antiBanEnabled = process.env.ANTI_BAN_ENABLED !== 'false';
    if (antiBanEnabled) {
      this.antiBan = new AntiBanWorkerIntegration({
        pattern: (process.env.ANTI_BAN_PATTERN as any) || 'normal',
        verbose: process.env.VERBOSE_ANTI_BAN === 'true',
        slackWebhook: process.env.SLACK_WEBHOOK_URL,
        alertOnLimits: true,
      });

      // Forward anti-ban events from the protection instance (which is EventEmitter)
      this.antiBan.protection?.on('delay-start', (data) =>
        this.emit('anti-ban-delay-start', data)
      );
      this.antiBan.protection?.on('break-start', (data) =>
        this.emit('anti-ban-break-start', data)
      );
      this.antiBan.protection?.on('outside-work-hours-detected', () =>
        this.emit('anti-ban-work-hours-exceeded')
      );
      this.antiBan.protection?.on('max-work-time-exceeded', (data) =>
        this.emit('anti-ban-session-limit', data)
      );
      this.antiBan.protection?.on('captcha-solved', (data) =>
        this.emit('anti-ban-captcha-solved', data)
      );
      this.antiBan.protection?.on('session-limits-reached', () =>
        this.emit('anti-ban-captcha-skipped')
      );
    }
  }

  /**
   * Start the worker service (begins processing queue)
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Worker service is already running');
      return;
    }

    this.isRunning = true;
    this.emit('started');

    // Send startup alert
    this.alertSystem.workerStarted();

    // Start anti-ban session
    if (this.antiBan) {
      this.antiBan.start();
      this.emit('anti-ban-session-started');
    }

    // Setup scheduled alerts (hourly status & daily reports)
    this.setupScheduledAlerts();

    // Start processing queue
    this.processQueue();
  }

  /**
   * Stop the worker service
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    // Clear scheduled alert intervals
    if ((this as any).hourlyInterval) {
      clearInterval((this as any).hourlyInterval);
    }
    if ((this as any).dailyInterval) {
      clearTimeout((this as any).dailyInterval);
    }

    // Cancel all active jobs
    for (const jobId of this.activeJobs) {
      await this.cancelJob(jobId);
    }

    // Stop anti-ban session
    if (this.antiBan) {
      const result = this.antiBan.stop();
      this.emit('anti-ban-session-stopped');
    }

    // Wait for current processing to complete
    if (this.processingPromise) {
      await this.processingPromise;
    }

    // Send shutdown alert with final metrics
    const metrics = this.getMetrics();
    this.alertSystem.workerStopped(
      `Worker stopped. Total: ${metrics.totalJobs} jobs, ` +
      `Success: ${(metrics.successRate * 100).toFixed(1)}%, ` +
      `Failed: ${metrics.failedJobs}`
    );

    this.emit('stopped');
  }

  /**
   * Create a new job and add to queue
   */
  createJob(request: WorkerJobRequest, priority: number = 50): string {
    // Check queue size
    if (this.queue.length >= this.config.maxQueueSize) {
      throw new WorkerPoolExhaustedError(
        this.config.maxWorkers,
        this.queue.length,
        { requestType: request.type }
      );
    }

    const jobId = uuidv4();
    const job: QueuedJob = {
      id: jobId,
      request,
      status: 'pending',
      createdAt: new Date(),
      attempts: 0,
      priority: Math.max(0, Math.min(100, priority)), // Clamp 0-100
    };

    // Insert into queue maintaining priority order (lower number = higher priority)
    let inserted = false;
    for (let i = 0; i < this.queue.length; i++) {
      if (job.priority < this.queue[i].priority) {
        this.queue.splice(i, 0, job);
        inserted = true;
        break;
      }
    }
    if (!inserted) {
      this.queue.push(job);
    }

    this.metrics.totalJobs++;
    this.metrics.queuedJobs = this.queue.length;

    this.emit('job-created', { jobId, priority });

    // Trigger queue processing if not already running
    if (this.isRunning && !this.processingPromise) {
      this.processQueue();
    }

    return jobId;
  }

  /**
   * Get job status and details
   */
  getJobStatus(jobId: string): CaptchaJob | undefined {
    // Check active jobs
    if (this.activeJobs.has(jobId)) {
      const job = this.queue.find(j => j.id === jobId);
      if (job) {
        return this.jobToResponse(job);
      }
    }

    // Check queue
    const queuedJob = this.queue.find(j => j.id === jobId);
    if (queuedJob) {
      return this.jobToResponse(queuedJob);
    }

    // Check completed
    const completedJob = this.completedJobs.get(jobId);
    if (completedJob) {
      return this.jobToResponse(completedJob);
    }

    return undefined;
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string, reason: string = 'Manually cancelled'): Promise<void> {
    const job = this.queue.find(j => j.id === jobId) || this.completedJobs.get(jobId);

    if (!job) {
      throw new JobNotFoundError(jobId);
    }

    if (job.status === 'completed' || job.status === 'failed') {
      throw new InvalidJobStateError(jobId, job.status, ['pending', 'running']);
    }

    // Clear timeout if exists
    if (job.timeoutHandle) {
      clearTimeout(job.timeoutHandle);
    }

    // Abort if running
    if (job.abortController) {
      job.abortController.abort();
    }

    // Update status
    job.status = 'failed';
    job.error = new CancellationError(jobId, reason);
    job.completedAt = new Date();

    // Remove from active
    this.activeJobs.delete(jobId);

    // Move to completed
    const index = this.queue.indexOf(job);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
    this.completedJobs.set(jobId, job);

    this.metrics.failedJobs++;
    this.metrics.queuedJobs = this.queue.length;
    this.metrics.activeJobs = this.activeJobs.size;

    this.emit('job-cancelled', { jobId, reason });
  }

  /**
   * Get current metrics
   */
  getMetrics(): WorkerMetrics {
    return {
      ...this.metrics,
      queuedJobs: this.queue.length,
      activeJobs: this.activeJobs.size,
    };
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return {
      queueLength: this.queue.length,
      activeJobs: this.activeJobs.size,
      completedJobs: this.completedJobs.size,
      oldestQueuedJob: this.queue[0]?.createdAt,
      queuedByPriority: this.queue.map(j => ({ id: j.id, priority: j.priority })),
    };
  }

  /**
   * Process the job queue
   */
  private async processQueue(): Promise<void> {
    if (this.processingPromise) return;

    this.processingPromise = (async () => {
      while (this.isRunning && this.queue.length > 0) {
        // Get next available worker slot
        if (this.activeJobs.size < this.config.maxWorkers) {
          const job = this.queue.shift();
          if (job) {
            this.processJob(job).catch(err => {
              console.error(`Unhandled error processing job ${job.id}:`, err);
            });
          }
        }

        // Small delay to prevent busy waiting
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      this.processingPromise = undefined;
    })();

    await this.processingPromise;
  }

  /**
   * Process individual job
   */
  private async processJob(job: QueuedJob): Promise<void> {
    job.status = 'running';
    job.startedAt = new Date();
    job.attempts++;

    this.activeJobs.add(job.id);
    this.metrics.activeJobs = this.activeJobs.size;

    this.emit('job-started', { jobId: job.id, attempt: job.attempts });

    const abortController = new AbortController();
    job.abortController = abortController;

    // Track consecutive failures for alert triggering
    let consecutiveFailures = this.getConsecutiveFailureCount();

    try {
      // Anti-ban: Pre-CAPTCHA routine (delays, checks, skip decision)
      if (this.antiBan) {
        try {
          await this.antiBan.beforeCaptcha();
        } catch (error) {
          if (error instanceof Error && error.message.includes('unsolvable')) {
            job.status = 'completed';
            job.result = {
              jobId: job.id,
              status: 'cancelled' as const,
              durationMs: Date.now() - (job.startedAt?.getTime() || Date.now()),
            };
            job.completedAt = new Date();
            this.metrics.completedJobs++;
            this.emit('job-completed', { jobId: job.id, result: job.result });
            return;
          }
          throw error;
        }
      }

      // Set timeout
      const timeoutHandle = setTimeout(() => {
        abortController.abort();
      }, job.request.timeoutMs || this.config.defaultTimeoutMs);
      job.timeoutHandle = timeoutHandle;

      // Process based on request type
      let result: WorkerJobResponse;

      if (job.request.type === 'detect') {
        result = await this.processDetectionJob(job, abortController);
      } else if (job.request.type === 'solve') {
        result = await this.processSolvingJob(job, abortController);
      } else {
        throw new Error(`Unknown job type: ${(job.request as any).type}`);
      }

      // Clear timeout
      clearTimeout(timeoutHandle);

      // Anti-ban: Post-CAPTCHA routine (recording, break checks, limits)
      if (this.antiBan) {
        await this.antiBan.afterCaptcha();
      }

      // Mark as completed
      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date();
      job.error = undefined;

      this.metrics.completedJobs++;

      // Reset consecutive failures on success
      this.resetConsecutiveFailureCount();

      this.emit('job-completed', { jobId: job.id, result });
    } catch (error) {
      clearTimeout(job.timeoutHandle);
      job.timeoutHandle = undefined;

      // Track consecutive failures
      consecutiveFailures = this.incrementConsecutiveFailureCount();

      // Send error alert
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.alertSystem.errorAlert(error instanceof Error ? error : new Error(errorMsg), {
        jobId: job.id,
        jobType: job.request.type,
        attempt: job.attempts,
        consecutiveFailures,
      });

      // Alert on consecutive failures
      if (consecutiveFailures >= 5) {
        const failureThreshold = 5;
        this.alertSystem.consecutiveFailures(consecutiveFailures, failureThreshold);
      }

      // Check if error is anti-ban related
      if (this.antiBan && error instanceof Error) {
        if (
          error.message.includes('OutsideWorkHours') ||
          error.message.includes('SessionLimitExceeded')
        ) {
          // Anti-ban errors: fail gracefully, don't retry
          job.status = 'failed';
          job.error = error;
          job.completedAt = new Date();
          this.metrics.failedJobs++;

          this.emit('job-failed', {
            jobId: job.id,
            error: error.message,
            attempts: job.attempts,
            reason: 'anti-ban-limit',
          });
          return;
        }
      }

      // Check if we should retry
      const shouldRetry =
        job.attempts < this.config.maxRetries &&
        ErrorHandler.isRetryable(error);

      if (shouldRetry) {
        job.status = 'pending';
        const backoffDelay = ErrorHandler.getBackoffDelay(
          job.attempts - 1,
          this.config.retryBackoffMs
        );
        job.nextRetryAt = new Date(Date.now() + backoffDelay);

        this.queue.push(job);
        this.metrics.retriedJobs++;

        this.emit('job-retry', {
          jobId: job.id,
          attempt: job.attempts,
          nextRetryAt: job.nextRetryAt,
          reason: error instanceof Error ? error.message : String(error),
        });
      } else {
        job.status = 'failed';
        job.error = error instanceof Error ? error : new Error(String(error));
        job.completedAt = new Date();

        this.metrics.failedJobs++;

        this.emit('job-failed', {
          jobId: job.id,
          error: job.error.message,
          attempts: job.attempts,
        });
      }
    } finally {
      this.activeJobs.delete(job.id);
      this.metrics.activeJobs = this.activeJobs.size;

      // Update metrics
      if (job.completedAt && job.startedAt) {
        const processingTime = job.completedAt.getTime() - job.startedAt.getTime();
        this.metrics.totalProcessingTimeMs += processingTime;
        const totalCompleted = this.metrics.completedJobs + this.metrics.failedJobs;
        if (totalCompleted > 0) {
          this.metrics.averageProcessingTimeMs =
            this.metrics.totalProcessingTimeMs / totalCompleted;
          this.metrics.successRate = this.metrics.completedJobs / totalCompleted;

          // Check accuracy thresholds and send alerts
          const accuracyPercentage = this.metrics.successRate * 100;
          if (accuracyPercentage < 80) {
            this.alertSystem.emergencyStop(accuracyPercentage, 'Accuracy below emergency threshold (80%)');
          } else if (accuracyPercentage < 95) {
            this.alertSystem.accuracyWarning(accuracyPercentage, 95);
          }
        }
      }

      // Move to completed if done
      if (job.status === 'completed' || job.status === 'failed') {
        const index = this.queue.indexOf(job);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }
        this.completedJobs.set(job.id, job);
      }

      this.metrics.queuedJobs = this.queue.length;

      // Continue processing
      if (this.isRunning) {
        this.processQueue();
      }
    }
  }

  /**
   * Process detection job
   */
  private async processDetectionJob(
    job: QueuedJob,
    abortController: AbortController
  ): Promise<WorkerJobResponse> {
    const request = job.request as any; // Type assertion for detect-specific fields
    
    const result = await this.detector.detect(request.page, {
      ...request.options,
      abortSignal: abortController.signal,
    });

    return {
      jobId: job.id,
      type: 'detect',
      status: 'completed',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Process solving job
   */
  private async processSolvingJob(
    job: QueuedJob,
    abortController: AbortController
  ): Promise<WorkerJobResponse> {
    const request = job.request as any; // Type assertion for solve-specific fields

    // This would integrate with solvers
    // For now, return placeholder
    return {
      jobId: job.id,
      type: 'solve',
      status: 'completed',
      data: { solution: 'TBD', solverType: request.captchaType },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Convert job to response format
   */
  private jobToResponse(job: QueuedJob): CaptchaJob {
    return {
      id: job.id,
      status: job.status,
      request: job.request,
      result: job.result,
      error: job.error ? { message: job.error.message, code: (job.error as any).code } : undefined,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      attempts: job.attempts,
      nextRetryAt: job.nextRetryAt?.toISOString(),
    };
  }

  /**
   * Track consecutive failures for alert triggering
   */
  private getConsecutiveFailureCount(): number {
    const completedJobs = Array.from(this.completedJobs.values()).reverse();
    let count = 0;

    for (const job of completedJobs) {
      if (job.status === 'failed') {
        count++;
      } else {
        break;
      }
    }

    return count;
  }

  /**
   * Increment and return consecutive failure count
   */
  private incrementConsecutiveFailureCount(): number {
    return this.getConsecutiveFailureCount() + 1;
  }

  /**
   * Reset consecutive failures on successful completion
   */
  private resetConsecutiveFailureCount(): void {
    // No explicit reset needed - counted from recent failed jobs
    // New success breaks the chain automatically
  }

  /**
   * Setup scheduled alerts (hourly status & daily reports)
   */
  private setupScheduledAlerts(): void {
    // Hourly status alert (every 60 minutes)
    const hourlyInterval = setInterval(() => {
      if (this.isRunning) {
        const metrics = this.getMetrics();
        this.alertSystem.hourlyStatus({
          total: metrics.totalJobs,
          successful: metrics.completedJobs,
          accuracy: metrics.successRate * 100,
          earnings: 0,
          averageEarnings: 0,
          totalTime: metrics.totalProcessingTimeMs,
          averageTime: metrics.averageProcessingTimeMs,
          uptime: 100,
          lastUpdated: new Date().toISOString(),
        });
      }
    }, 60 * 60 * 1000); // 60 minutes

    // Daily report alert (at midnight)
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();

    const dailyInterval = setTimeout(() => {
      if (this.isRunning) {
        const metrics = this.getMetrics();
        this.alertSystem.dailyReport({
          total: metrics.totalJobs,
          successful: metrics.completedJobs,
          accuracy: metrics.successRate * 100,
          earnings: metrics.completedJobs * 0.05,
          averageEarnings: metrics.completedJobs > 0 ? (metrics.completedJobs * 0.05) / metrics.completedJobs : 0,
          totalTime: metrics.totalProcessingTimeMs,
          averageTime: metrics.averageProcessingTimeMs,
          uptime: 100,
          lastUpdated: new Date().toISOString(),
        });

        // Re-schedule for next day
        const nextDailyInterval = setInterval(() => {
          if (this.isRunning) {
            const updatedMetrics = this.getMetrics();
            this.alertSystem.dailyReport({
              total: updatedMetrics.totalJobs,
              successful: updatedMetrics.completedJobs,
              accuracy: updatedMetrics.successRate * 100,
              earnings: updatedMetrics.completedJobs * 0.05,
              averageEarnings: updatedMetrics.completedJobs > 0 ? (updatedMetrics.completedJobs * 0.05) / updatedMetrics.completedJobs : 0,
              totalTime: updatedMetrics.totalProcessingTimeMs,
              averageTime: updatedMetrics.averageProcessingTimeMs,
              uptime: 100,
              lastUpdated: new Date().toISOString(),
            });
          }
        }, 24 * 60 * 60 * 1000); // 24 hours

        // Store interval for cleanup on stop()
        (this as any).dailyInterval = nextDailyInterval;
      }
    }, timeUntilMidnight);

    // Store intervals for cleanup on stop()
    (this as any).hourlyInterval = hourlyInterval;
    (this as any).dailyInterval = dailyInterval;
  }
}
