/**
 * 2captcha Worker - REST API Routes
 * 
 * Provides endpoints for:
 * - Job creation and management
 * - Status queries
 * - Performance metrics
 * - Health checks
 * - Queue statistics
 */

import { Router, Request, Response, NextFunction } from 'express';
import { WorkerService } from './worker.service';
import { TwoCaptchaDetector } from './detector';
import { ErrorHandler } from './errors';
import type { WorkerJobRequest } from './types';

/**
 * Create API router
 */
export function createApiRouter(
  workerService: WorkerService,
  detector: TwoCaptchaDetector
): Router {
  const router = Router();

  /**
   * Middleware: Error handler
   */
  const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

  /**
   * Middleware: Request logging
   */
  router.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[API] ${req.method} ${req.path}`);
    next();
  });

  /**
   * GET /health - Health check
   */
  router.get(
    '/health',
    asyncHandler(async (req: Request, res: Response) => {
      const metrics = workerService.getMetrics();
      res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        metrics: {
          activeJobs: metrics.activeJobs,
          queuedJobs: metrics.queuedJobs,
          successRate: metrics.successRate,
        },
      });
    })
  );

  /**
   * POST /detect - Run CAPTCHA detection
   * 
   * Body:
   * {
   *   "url": "https://example.com",
   *   "timeoutMs": 60000,
   *   "priority": 50
   * }
   */
  router.post(
    '/detect',
    asyncHandler(async (req: Request, res: Response) => {
      const { url, timeoutMs, priority } = req.body;

      if (!url) {
        return res.status(400).json({
          code: 'MISSING_PARAM',
          message: 'URL is required',
        });
      }

      const jobId = workerService.createJob(
        {
          type: 'detect',
          url,
          timeoutMs,
        },
        priority
      );

      res.status(202).json({
        jobId,
        status: 'pending',
        statusUrl: `/api/status/${jobId}`,
      });
    })
  );

  /**
   * POST /solve - Run CAPTCHA solving
   * 
   * Body:
   * {
   *   "url": "https://example.com",
   *   "captchaType": "image|text|recaptcha_v2|hcaptcha",
   *   "timeoutMs": 60000,
   *   "priority": 50
   * }
   */
  router.post(
    '/solve',
    asyncHandler(async (req: Request, res: Response) => {
      const { url, captchaType, timeoutMs, priority } = req.body;

      if (!url || !captchaType) {
        return res.status(400).json({
          code: 'MISSING_PARAM',
          message: 'URL and captchaType are required',
        });
      }

      const jobId = workerService.createJob(
        {
          type: 'solve',
          url,
          captchaType,
          timeoutMs,
        },
        priority
      );

      res.status(202).json({
        jobId,
        status: 'pending',
        statusUrl: `/api/status/${jobId}`,
      });
    })
  );

  /**
   * POST /detect-and-solve - Full workflow
   * 
   * Body:
   * {
   *   "url": "https://example.com",
   *   "timeoutMs": 60000,
   *   "priority": 50
   * }
   */
  router.post(
    '/detect-and-solve',
    asyncHandler(async (req: Request, res: Response) => {
      const { url, timeoutMs, priority } = req.body;

      if (!url) {
        return res.status(400).json({
          code: 'MISSING_PARAM',
          message: 'URL is required',
        });
      }

      // Create detection job first
      const jobId = workerService.createJob(
        {
          type: 'detect',
          url,
          timeoutMs,
        },
        priority
      );

      res.status(202).json({
        jobId,
        status: 'pending',
        workflowSteps: ['detect', 'solve'],
        statusUrl: `/api/status/${jobId}`,
        note: 'Once detection completes, solve job will be automatically created',
      });
    })
  );

  /**
   * GET /status/:jobId - Get job status
   */
  router.get(
    '/status/:jobId',
    asyncHandler(async (req: Request, res: Response) => {
      const { jobId } = req.params;

      const job = workerService.getJobStatus(jobId);

      if (!job) {
        return res.status(404).json({
          code: 'JOB_NOT_FOUND',
          message: `Job ${jobId} not found`,
        });
      }

      res.json(job);
    })
  );

  /**
   * POST /cancel/:jobId - Cancel job
   */
  router.post(
    '/cancel/:jobId',
    asyncHandler(async (req: Request, res: Response) => {
      const { jobId } = req.params;
      const { reason } = req.body || {};

      await workerService.cancelJob(jobId, reason || 'Cancelled via API');

      res.json({
        jobId,
        status: 'cancelled',
        reason: reason || 'Cancelled via API',
      });
    })
  );

  /**
   * GET /metrics - Performance metrics
   */
  router.get(
    '/metrics',
    asyncHandler(async (req: Request, res: Response) => {
      const metrics = workerService.getMetrics();

      res.json({
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        metrics: {
          totalJobs: metrics.totalJobs,
          completedJobs: metrics.completedJobs,
          failedJobs: metrics.failedJobs,
          retriedJobs: metrics.retriedJobs,
          queuedJobs: metrics.queuedJobs,
          activeJobs: metrics.activeJobs,
          averageProcessingTimeMs: Math.round(metrics.averageProcessingTimeMs),
          successRate: (metrics.successRate * 100).toFixed(2) + '%',
          totalProcessingTimeMs: metrics.totalProcessingTimeMs,
        },
      });
    })
  );

  /**
   * GET /queue - Queue statistics
   */
  router.get(
    '/queue',
    asyncHandler(async (req: Request, res: Response) => {
      const stats = workerService.getQueueStats();

      res.json({
        timestamp: new Date().toISOString(),
        queue: {
          length: stats.queueLength,
          oldestJob: stats.oldestQueuedJob,
          jobsByPriority: stats.queuedByPriority,
        },
        workers: {
          active: stats.activeJobs,
          completed: stats.completedJobs,
        },
      });
    })
  );

  /**
   * Global error handler
   */
  router.use((error: any, req: Request, res: Response, next: NextFunction) => {
    console.error(`[API Error] ${req.method} ${req.path}:`, error);

    const status = ErrorHandler.getHttpStatus(error);
    const errorResponse = ErrorHandler.formatErrorResponse(error);

    res.status(status).json(errorResponse);
  });

  return router;
}

/**
 * Create Express application with API routes
 */
export function createApiServer(
  workerService: WorkerService,
  detector: TwoCaptchaDetector,
  port: number = 8019
): {
  app: any;
  server: any;
  start: () => Promise<void>;
  stop: () => Promise<void>;
} {
  const express = require('express');
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log(
        `[${res.statusCode}] ${req.method} ${req.path} (${duration}ms)`
      );
    });
    next();
  });

  // API routes
  app.use('/api', createApiRouter(workerService, detector));

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: '2captcha Worker',
      version: '1.0.0',
      endpoints: {
        health: 'GET /health',
        detect: 'POST /api/detect',
        solve: 'POST /api/solve',
        detectAndSolve: 'POST /api/detect-and-solve',
        status: 'GET /api/status/:jobId',
        cancel: 'POST /api/cancel/:jobId',
        metrics: 'GET /api/metrics',
        queue: 'GET /api/queue',
      },
    });
  });

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.path} not found`,
      availableEndpoints: {
        health: 'GET /health',
        detect: 'POST /api/detect',
        solve: 'POST /api/solve',
        metrics: 'GET /api/metrics',
        queue: 'GET /api/queue',
      },
    });
  });

  let server: any;

  return {
    app,
    server,
    start: async () => {
      return new Promise((resolve, reject) => {
        try {
          server = app.listen(port, '0.0.0.0', () => {
            console.log(`[API] Server listening on http://0.0.0.0:${port}`);
            resolve();
          });
        } catch (error) {
          reject(error);
        }
      });
    },
    stop: async () => {
      return new Promise((resolve, reject) => {
        if (server) {
          server.close((error?: Error) => {
            if (error) reject(error);
            else resolve();
          });
        } else {
          resolve();
        }
      });
    },
  };
}

export default { createApiRouter, createApiServer };
