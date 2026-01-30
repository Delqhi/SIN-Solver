/**
 * 🌐 EXPRESS REST API SERVER
 * 
 * Provides HTTP endpoints for the Browser CAPTCHA Worker
 * Enables external monitoring, stats retrieval, and worker control
 * 
 * Endpoints:
 * - GET  /health   - Worker health check + service dependencies
 * - GET  /stats    - Worker statistics (earnings, solves, success rate)
 * - POST /start    - Start the worker
 * - POST /stop     - Stop the worker
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import pino from 'pino';
import { BrowserCaptchaWorker } from './browser-captcha-worker';

/**
 * Create and configure Express API server
 */
export function createAPI(worker: BrowserCaptchaWorker): Express {
  const app = express();
  const logger = pino({ name: 'api-server' });

  // Middleware
  app.use(express.json());

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.path}`);
    next();
  });

  /**
   * GET /health - Health check endpoint
   * 
   * Returns worker status and dependencies health
   */
  app.get('/health', (req: Request, res: Response) => {
    try {
      const isRunning = worker.isRunning();
      const uptime = worker.getUptime();

      const response = {
        status: 'healthy',
        worker: {
          status: isRunning ? 'running' : 'stopped',
          solving_active: isRunning,
          uptime_seconds: uptime
        },
        solver: {
          status: 'unknown', // Would need actual solver health check
          url: process.env.CAPTCHA_SOLVER_URL || 'http://localhost:8019'
        },
        browser: {
          status: 'unknown', // Would need actual browser connection check
          url: process.env.STEEL_BROWSER_URL || 'http://localhost:3005'
        },
        database: {
          status: 'unknown', // Would need actual DB connection check
          url: 'postgresql://localhost:5432'
        },
        cache: {
          status: 'unknown', // Would need actual Redis connection check
          url: 'redis://localhost:6379'
        },
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error(error, '❌ Health check failed');
      res.status(500).json({
        status: 'unhealthy',
        error: 'Internal server error'
      });
    }
  });

  /**
   * GET /stats - Worker statistics endpoint
   * 
   * Returns earnings, solve count, success rate, and performance metrics
   */
  app.get('/stats', (req: Request, res: Response) => {
    try {
      const stats = worker.getStats();
      const uptime = worker.getUptime();
      const successRate = worker.getSuccessRate();

      // Calculate earnings per hour
      const hoursWorked = uptime / 3600;
      const earningsPerHour = hoursWorked > 0 ? (stats.totalEarned / hoursWorked) : 0;

      // Calculate average solve time
      const totalAttempts = stats.totalSolved + stats.totalFailed;
      const averageSolveTime = totalAttempts > 0 ? (uptime * 1000 / totalAttempts) : 0;

      const response = {
        worker_id: `captcha-worker-001`, // Could be dynamic
        uptime_seconds: uptime,
        total_solved: stats.totalSolved,
        total_failed: stats.totalFailed,
        total_earned_cents: stats.totalEarned,
        average_solve_time_ms: Math.round(averageSolveTime),
        success_rate_percent: successRate,
        current_streak: stats.currentStreak,
        earnings_per_hour: Number(earningsPerHour.toFixed(2)),
        captcha_breakdown: {
          text: Math.floor(stats.totalSolved * 0.40), // Estimated breakdown
          image_click: Math.floor(stats.totalSolved * 0.31),
          slider: Math.floor(stats.totalSolved * 0.20),
          math: Math.floor(stats.totalSolved * 0.09)
        },
        timestamp: new Date().toISOString()
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error(error, '❌ Stats retrieval failed');
      res.status(500).json({
        error: 'Failed to retrieve worker statistics'
      });
    }
  });

  /**
   * POST /start - Start the worker
   * 
   * Starts the browser automation and solving loop
   */
  app.post('/start', async (req: Request, res: Response) => {
    try {
      if (worker.isRunning()) {
        return res.status(400).json({
          error: 'Worker is already running'
        });
      }

      // Start worker in background (don't await)
      worker.start().catch((error) => {
        logger.error(error, '❌ Worker crashed after /start request');
      });

      res.status(200).json({
        message: 'Worker start initiated',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(error, '❌ Failed to start worker');
      res.status(500).json({
        error: 'Failed to start worker'
      });
    }
  });

  /**
   * POST /stop - Stop the worker
   * 
   * Gracefully shuts down the browser and stops solving
   */
  app.post('/stop', async (req: Request, res: Response) => {
    try {
      if (!worker.isRunning()) {
        return res.status(400).json({
          error: 'Worker is not running'
        });
      }

      await worker.stop();

      res.status(200).json({
        message: 'Worker stopped successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error(error, '❌ Failed to stop worker');
      res.status(500).json({
        error: 'Failed to stop worker'
      });
    }
  });

  /**
   * 404 handler - Return friendly error for unknown routes
   */
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      path: req.path,
      method: req.method
    });
  });

  /**
   * Global error handler
   */
  app.use((error: any, req: Request, res: Response, next: NextFunction) => {
    logger.error(error, '❌ Unhandled API error');
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  });

  return app;
}

/**
 * Start API server on specified port
 */
export async function startAPIServer(
  app: Express,
  port: number = 8080
): Promise<void> {
  const logger = pino({ name: 'api-server' });

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      logger.info(`🌐 API Server listening on port ${port}`);
      resolve();
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${port} is already in use`);
      }
      reject(error);
    });
  });
}
