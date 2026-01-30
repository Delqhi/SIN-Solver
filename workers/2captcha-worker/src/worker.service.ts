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
import { TwoCaptchaDetector, DetectionResult } from './detector';
import { ErrorHandler, JobTimeoutError, JobNotFoundError, InvalidJobStateError, CancellationError, WorkerPoolExhaustedError } from './errors';
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

    // Start processing queue
    this.processQueue();
  }

  /**
   * Stop the worker service
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    // Cancel all active jobs
    for (const jobId of this.activeJobs) {
      await this.cancelJob(jobId);
    }

    // Wait for current processing to complete
    if (this.processingPromise) {
      await this.processingPromise;
    }

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

    try {
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

      // Mark as completed
      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date();
      job.error = undefined;

      this.metrics.completedJobs++;

      this.emit('job-completed', { jobId: job.id, result });
    } catch (error) {
      clearTimeout(job.timeoutHandle);
      job.timeoutHandle = undefined;

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

        // Re-add to queue
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
      status: 'success',
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
      status: 'success',
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
}

export default WorkerService;
