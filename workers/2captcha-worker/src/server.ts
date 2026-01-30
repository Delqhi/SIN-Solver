/**
 * 2Captcha Worker - REST API Server
 * Provides endpoints for multi-agent CAPTCHA solving
 * 
 * Features:
 * - POST /api/solve-captcha - Solve CAPTCHA images using multi-agent solver
 * - GET /api/solver-info - Get solver capabilities and configuration
 * - GET /health - Health check endpoint
 * - Error handling, input validation, logging
 */

import express, { Request, Response, NextFunction, Router } from 'express';
import multer, { Multer } from 'multer';
import { createDefaultMultiAgentSolver, MultiAgentSolver, MultiAgentResult } from './solvers';
import winston from 'winston';

// ============================================
// TYPES
// ============================================

interface SolveRequestQuery {
  minConfidence?: string;
  format?: 'standard' | 'detailed' | 'consensus';
  timeout?: string;
}

interface SolveResponse {
  success: boolean;
  requestId: string;
  solveTime: number;
  data: {
    answer: string;
    confidence: number;
    format: string;
    agentResults?: any[];
    consensus?: any;
    totalTime?: number;
  };
  error?: string;
}

// ============================================
// LOGGER SETUP
// ============================================

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'captcha-solver-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
          return `${timestamp} [${level}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      ),
    }),
    new winston.transports.File({ 
      filename: 'logs/captcha-solver-error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({ 
      filename: 'logs/captcha-solver.log',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],
});

// ============================================
// MULTER CONFIGURATION
// ============================================

const upload: Multer = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      logger.warn('Invalid file type uploaded', { 
        originalname: file.originalname, 
        mimetype: file.mimetype 
      });
      return cb(new Error(`Only JPEG, PNG, WebP, GIF supported. Got: ${file.mimetype}`));
    }
    cb(null, true);
  },
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
});

// ============================================
// SOLVER INITIALIZATION
// ============================================

let solver: MultiAgentSolver | null = null;
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

const initializeSolver = async (): Promise<void> => {
   if (solver) return;

   if (isInitializing) {
     if (initializationPromise) {
       await initializationPromise;
     }
     return;
   }

   isInitializing = true;
   initializationPromise = (async () => {
     try {
       logger.info('Initializing multi-agent CAPTCHA solver...');
       solver = await createDefaultMultiAgentSolver({
         timeout: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000'),
         minConfidence: 0.7,
       });
       logger.info('✅ Multi-agent solver initialized successfully', {
         timeout: process.env.REQUEST_TIMEOUT_MS || '30000',
         minConfidence: 0.7,
       });
     } catch (err) {
       logger.error('❌ Solver initialization failed:', err);
       isInitializing = false;
       throw err;
     }
   })();

   await initializationPromise;
   isInitializing = false;
};

// ============================================
// RESPONSE FORMATTERS
// ============================================

function formatSolveResponse(
  result: MultiAgentResult,
  format: 'standard' | 'detailed' | 'consensus' = 'standard',
  isValid: boolean = true
): any {
  const base = {
    answer: result.bestResult.answer,
    confidence: result.bestResult.confidence,
    format,
  };

  if (format === 'detailed') {
    return {
      ...base,
      agent: result.bestResult.agent,
      agentResults: result.results.map(r => ({
        agent: r.agent,
        answer: r.answer,
        confidence: r.confidence,
        solveTime: r.solveTime,
      })),
      totalTime: result.totalTime,
    };
  }

  if (format === 'consensus' && result.consensus) {
    return {
      ...base,
      consensus: {
        answer: result.consensus.answer,
        agentCount: result.consensus.agentCount,
        confidence: result.consensus.confidence,
      },
    };
  }

  return base;
}

// ============================================
// ERROR HANDLER
// ============================================

const asyncHandler = (fn: Function) => 
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// ============================================
// API ROUTES
// ============================================

export function createMultiAgentSolverRouter(): Router {
  const router = Router();

  /**
   * Initialization middleware
   */
  router.use(asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      await initializeSolver();
      next();
    } catch (err) {
      logger.error('Solver initialization error in middleware:', err);
      return res.status(503).json({
        success: false,
        error: 'Solver service unavailable',
        message: 'CAPTCHA solver failed to initialize',
      });
    }
  }));

  /**
   * POST /api/solve-captcha
   * Solve a CAPTCHA image using the multi-agent solver
   * 
   * Request:
   *   - image (file, required): CAPTCHA image file
   *   - minConfidence (query, optional): 0.0-1.0, default 0.7
   *   - format (query, optional): standard|detailed|consensus, default standard
   * 
   * Response:
   *   - success: boolean
   *   - data: { answer, confidence, format, ... }
   *   - solveTime: milliseconds taken
   */
  router.post(
    '/solve-captcha',
    upload.single('image'),
    asyncHandler(async (req: Request, res: Response) => {
      const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const startTime = Date.now();

      try {
        // ============================================
        // VALIDATION
        // ============================================

        if (!req.file) {
          logger.warn(`[${requestId}] Missing image file in request`);
          return res.status(400).json({
            success: false,
            error: 'BAD_REQUEST',
            message: 'No image file provided. Use multipart/form-data with "image" field.',
          });
        }

        if (!req.file.buffer || req.file.buffer.length === 0) {
          logger.warn(`[${requestId}] Empty image file provided`);
          return res.status(400).json({
            success: false,
            error: 'BAD_REQUEST',
            message: 'Image file is empty',
          });
        }

        const query = req.query as SolveRequestQuery;
        const minConfidence = parseFloat(query.minConfidence || '0.7');
        const format = (query.format || 'standard') as 'standard' | 'detailed' | 'consensus';
        const timeout = query.timeout ? parseInt(query.timeout) : 30000;

        // Validate confidence range
        if (isNaN(minConfidence) || minConfidence < 0 || minConfidence > 1) {
          logger.warn(`[${requestId}] Invalid minConfidence value: ${query.minConfidence}`);
          return res.status(422).json({
            success: false,
            error: 'INVALID_PARAMETER',
            message: 'minConfidence must be between 0.0 and 1.0',
          });
        }

        // Validate format
        if (!['standard', 'detailed', 'consensus'].includes(format)) {
          logger.warn(`[${requestId}] Invalid format: ${query.format}`);
          return res.status(422).json({
            success: false,
            error: 'INVALID_PARAMETER',
            message: 'format must be one of: standard, detailed, consensus',
          });
        }

        // ============================================
        // SOLVE CAPTCHA
        // ============================================

        logger.info(`[${requestId}] Starting CAPTCHA solving`, {
          imageSize: req.file.buffer.length,
          minConfidence,
          format,
          timeout,
        });

        if (!solver) {
          throw new Error('Solver not initialized');
        }

        const solveStartTime = Date.now();
        const result = await solver.solve(req.file.buffer);
        const solveTime = Date.now() - solveStartTime;

        // ============================================
        // VALIDATE RESULT
        // ============================================

        const isValid = result.bestResult.confidence >= minConfidence;

        logger.info(`[${requestId}] CAPTCHA solved`, {
          answer: result.bestResult.answer,
          confidence: result.bestResult.confidence.toFixed(2),
          agent: result.bestResult.agent,
          valid: isValid,
          solveTime,
          consensus: result.consensus ? 'yes' : 'no',
          totalTime: result.totalTime,
        });

        // ============================================
        // FORMAT RESPONSE
        // ============================================

        const data = formatSolveResponse(result, format, isValid);
        const response: SolveResponse = {
          success: isValid,
          requestId,
          solveTime,
          data,
        };

        return res.json(response);

      } catch (error) {
        const totalTime = Date.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';

        logger.error(`[${requestId}] Solver error:`, {
          error: errorMsg,
          stack: error instanceof Error ? error.stack : undefined,
          totalTime,
        });

        // Determine HTTP status based on error type
        let statusCode = 500;
        if (errorMsg.includes('timeout')) {
          statusCode = 408; // Request Timeout
        } else if (errorMsg.includes('validation')) {
          statusCode = 422; // Unprocessable Entity
        }

        return res.status(statusCode).json({
          success: false,
          requestId,
          error: statusCode === 408 ? 'TIMEOUT' : 'SOLVER_ERROR',
          message: errorMsg,
        });
      }
    })
  );

  /**
   * GET /api/solver-info
   * Get solver capabilities and configuration
   * 
   * Response:
   *   - version: solver version
   *   - agents: list of available agents
   *   - capabilities: what the solver can handle
   *   - configuration: current settings
   */
  router.get(
    '/solver-info',
    asyncHandler(async (req: Request, res: Response) => {
      logger.info('Fetching solver information');

      return res.json({
        version: '1.0.0',
        status: solver ? 'initialized' : 'not initialized',
        agents: [
          {
            name: 'SkyvernSolver',
            type: 'visual-automation',
            timeout: 30000,
            confidence_range: [0.0, 1.0],
            description: 'Visual UI automation using Skyvern',
          },
          {
            name: 'VisionModelSolver',
            type: 'vision-ai',
            timeout: 30000,
            confidence_range: [0.0, 1.0],
            description: 'GPT-4 Vision or Claude 3 for CAPTCHA solving',
            models: [
              'gpt-4-vision-preview',
              'claude-3-sonnet-20240229',
            ],
          },
          {
            name: 'DDDDOCRSolver',
            type: 'ocr',
            timeout: 30000,
            confidence_range: [0.0, 1.0],
            description: 'Python ddddocr library for OCR-based solving',
          },
        ],
        capabilities: {
          image_formats: ['JPEG', 'PNG', 'WebP', 'GIF'],
          max_image_size: '5MB',
          parallel_execution: true,
          consensus_detection: true,
          confidence_filtering: true,
        },
        configuration: {
          minConfidence: 0.7,
          timeout_per_agent: 30000,
          total_timeout: 35000,
          response_formats: ['standard', 'detailed', 'consensus'],
        },
        endpoints: {
          solve: 'POST /api/solve-captcha',
          info: 'GET /api/solver-info',
          health: 'GET /health',
        },
      });
    })
  );

  /**
   * GET /health
   * Health check endpoint
   */
  router.get(
    '/health',
    asyncHandler(async (req: Request, res: Response) => {
      const solverStatus = solver ? 'healthy' : 'unhealthy';
      const statusCode = solver ? 200 : 503;

      return res.status(statusCode).json({
        status: solverStatus,
        service: 'captcha-solver-api',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        solver: {
          status: solverStatus,
          initialized: !!solver,
        },
        memory: process.memoryUsage(),
      });
    })
  );

  return router;
}

// ============================================
// EXPRESS APP CREATION
// ============================================

export function createExpressApp(): express.Application {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logger.info(`${res.statusCode} ${req.method} ${req.path}`, {
        duration,
        statusCode: res.statusCode,
      });
    });
    next();
  });

  // Health check endpoint (unprotected)
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'captcha-solver-api',
      timestamp: new Date().toISOString(),
    });
  });

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: '2Captcha Worker - Multi-Agent Solver API',
      version: '1.0.0',
      description: 'Enterprise-grade CAPTCHA solving using multiple AI agents',
      endpoints: {
        health: 'GET /health',
        solveCaptcha: 'POST /api/solve-captcha',
        solverInfo: 'GET /api/solver-info',
      },
    });
  });

  // Multi-agent solver API routes
  app.use('/api', createMultiAgentSolverRouter());

  // 404 handler
  app.use((req: Request, res: Response) => {
    logger.warn(`Route not found: ${req.method} ${req.path}`);
    res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.path} not found`,
      availableEndpoints: {
        health: 'GET /health',
        solveCaptcha: 'POST /api/solve-captcha',
        solverInfo: 'GET /api/solver-info',
      },
    });
  });

  // Global error handler
  app.use((error: any, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error:', {
      method: req.method,
      path: req.path,
      error: error.message,
      stack: error.stack,
    });

    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal server error';

    res.status(statusCode).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message,
    });
  });

  return app;
}

// ============================================
// SERVER INITIALIZATION & LIFECYCLE
// ============================================

export async function startServer(port: number = 8000): Promise<{
  app: express.Application;
  server: any;
  stop: () => Promise<void>;
}> {
  const app = createExpressApp();

  return new Promise((resolve, reject) => {
    try {
      const server = app.listen(port, '0.0.0.0', () => {
        logger.info(`🚀 Multi-Agent Solver API listening on http://0.0.0.0:${port}`);
        logger.info('Available endpoints:');
        logger.info('  POST /api/solve-captcha - Solve CAPTCHA images');
        logger.info('  GET /api/solver-info - Get solver information');
        logger.info('  GET /health - Health check');

        resolve({
          app,
          server,
          stop: async () => {
            return new Promise((resolveStop, rejectStop) => {
              if (server) {
                server.close((err?: Error) => {
                  if (err) {
                    logger.error('Error closing server:', err);
                    rejectStop(err);
                  } else {
                    logger.info('Server closed');
                    resolveStop();
                  }
                });
              } else {
                resolveStop();
              }
            });
          },
        });
      });
    } catch (err) {
      logger.error('Failed to start server:', err);
      reject(err);
    }
  });
}

export default {
  createExpressApp,
  createMultiAgentSolverRouter,
  startServer,
  initializeSolver,
};
