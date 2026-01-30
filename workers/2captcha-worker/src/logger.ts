/**
 * 2captcha Worker - Winston Structured Logging
 * 
 * Provides:
 * - JSON formatted file logging with daily rotation
 * - Colored console output for development
 * - Correlation IDs for request tracing
 * - Performance metric logging with timing
 * - Error logging with full stack traces
 * - Structured logging by category
 */

import winston, { Logger, format, transports } from 'winston';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Log Levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

/**
 * Log Categories
 */
export enum LogCategory {
  BROWSER = 'Browser',
  DETECTOR = 'Detector',
  WORKER = 'Worker',
  API = 'API',
  QUEUE = 'Queue',
  ANTI_BAN = 'AntiBan',
  SOLVER = 'Solver',
  ERROR = 'Error',
  STARTUP = 'Startup',
  SHUTDOWN = 'Shutdown',
  PERFORMANCE = 'Performance',
}

/**
 * Winston Logger Configuration
 */
const createLogger = (): Logger => {
  // Custom JSON format with metadata
  const jsonFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, category, correlationId, duration, metadata, stack }) => {
      const logEntry: any = {
        timestamp,
        level: level.toUpperCase(),
        message,
      };

      if (category) logEntry.category = category;
      if (correlationId) logEntry.correlationId = correlationId;
      if (duration) logEntry.duration = `${duration}ms`;
      if (stack) logEntry.stack = stack;
      if (metadata) logEntry.metadata = metadata;

      return JSON.stringify(logEntry);
    })
  );

  // Simple format for console (development-friendly)
  const consoleFormat = format.combine(
    format.timestamp({ format: 'HH:mm:ss' }),
    format.printf(({ timestamp, level, message, category, duration }) => {
      const levelColors: any = {
        error: '\x1b[31m', // Red
        warn: '\x1b[33m', // Yellow
        info: '\x1b[36m', // Cyan
        debug: '\x1b[35m', // Magenta
      };
      const reset = '\x1b[0m';
      const color = levelColors[level] || reset;

      let prefix = `${timestamp} ${color}[${level.toUpperCase()}]${reset}`;
      if (category) prefix += ` [${category}]`;
      if (duration) prefix += ` (${duration}ms)`;

      return `${prefix} ${message}`;
    })
  );

  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      format.errors({ stack: true }),
      format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] })
    ),
    transports: [
      // Console transport (colored, development-friendly)
      new transports.Console({
        format: consoleFormat,
        level: process.env.CONSOLE_LOG_LEVEL || 'info',
      }),

      // File transport (JSON, all levels)
      new transports.File({
        filename: path.join(logsDir, '2captcha-worker.log'),
        format: jsonFormat,
        level: process.env.FILE_LOG_LEVEL || 'debug',
        maxsize: 10485760, // 10MB
        maxFiles: 5,
        tailable: true,
      }),

      // Error file transport (JSON, errors only)
      new transports.File({
        filename: path.join(logsDir, '2captcha-worker-error.log'),
        format: jsonFormat,
        level: 'error',
        maxsize: 10485760, // 10MB
        maxFiles: 5,
        tailable: true,
      }),
    ],
  });
};

/**
 * Global logger instance
 */
const logger = createLogger();

/**
 * Logger interface with category support
 */
export interface LoggerContext {
  category?: LogCategory | string;
  correlationId?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

/**
 * Structured logging utility
 */
class StructuredLogger {
  private logger: Logger;
  private correlationId: string;

  constructor(logger: Logger, correlationId?: string) {
    this.logger = logger;
    this.correlationId = correlationId || uuidv4();
  }

  /**
   * Get correlation ID
   */
  getCorrelationId(): string {
    return this.correlationId;
  }

  /**
   * Set correlation ID (for request tracing)
   */
  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  /**
   * Log error
   */
  error(message: string, context?: LoggerContext): void {
    this.log('error', message, context);
  }

  /**
   * Log warning
   */
  warn(message: string, context?: LoggerContext): void {
    this.log('warn', message, context);
  }

  /**
   * Log info
   */
  info(message: string, context?: LoggerContext): void {
    this.log('info', message, context);
  }

  /**
   * Log debug
   */
  debug(message: string, context?: LoggerContext): void {
    this.log('debug', message, context);
  }

  /**
   * Core logging function
   */
  private log(level: LogLevel, message: string, context?: LoggerContext): void {
    const meta: any = {
      correlationId: this.correlationId,
    };

    if (context?.category) meta.category = context.category;
    if (context?.duration) meta.duration = context.duration;
    if (context?.metadata) meta.metadata = context.metadata;

    this.logger.log({
      level,
      message,
      ...meta,
    });
  }

  /**
   * Log with timing (for performance monitoring)
   */
  async logWithTiming<T>(
    message: string,
    fn: () => Promise<T>,
    context?: LoggerContext
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.info(`${message} (completed)`, {
        ...context,
        duration,
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.error(`${message} (failed after ${duration}ms)`, {
        ...context,
        duration,
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }

  /**
   * Log error with full context
   */
  errorWithContext(
    message: string,
    error: Error,
    context?: LoggerContext
  ): void {
    this.logger.error(message, {
      correlationId: this.correlationId,
      category: context?.category || LogCategory.ERROR,
      stack: error.stack,
      metadata: {
        ...context?.metadata,
        errorName: error.name,
        errorMessage: error.message,
      },
    });
  }

  /**
   * Create child logger with category
   */
  getCategory(category: LogCategory | string): CategoryLogger {
    return new CategoryLogger(this.logger, this.correlationId, category);
  }
}

/**
 * Category-specific logger
 */
class CategoryLogger {
  private logger: Logger;
  private correlationId: string;
  private category: string;

  constructor(logger: Logger, correlationId: string, category: LogCategory | string) {
    this.logger = logger;
    this.correlationId = correlationId;
    this.category = category;
  }

  error(message: string, metadata?: Record<string, any>): void {
    this.log('error', message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata);
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata);
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    this.logger.log({
      level,
      message,
      category: this.category,
      correlationId: this.correlationId,
      metadata,
    });
  }

  async logWithTiming<T>(
    message: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.info(`${message} ✓`, {
        ...metadata,
        duration,
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.error(`${message} ✗ (${duration}ms)`, {
        ...metadata,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  errorWithStack(message: string, error: Error, metadata?: Record<string, any>): void {
    this.logger.error(message, {
      category: this.category,
      correlationId: this.correlationId,
      stack: error.stack,
      metadata: {
        ...metadata,
        errorName: error.name,
        errorMessage: error.message,
      },
    });
  }
}

/**
 * Express middleware for request logging and correlation ID injection
 */
export function createLoggerMiddleware() {
  return (req: any, res: any, next: any) => {
    // Create or use existing correlation ID
    const correlationId = req.headers['x-correlation-id'] || uuidv4();
    
    // Attach to request and response
    req.correlationId = correlationId;
    req.logger = createRequestLogger(correlationId);
    
    // Add to response headers for client tracking
    res.setHeader('X-Correlation-ID', correlationId);
    
    // Log request
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const level = res.statusCode >= 400 ? 'warn' : 'info';
      
      logger.log({
        level,
        message: `${req.method} ${req.path}`,
        category: LogCategory.API,
        correlationId,
        duration,
        metadata: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          contentLength: res.get('content-length'),
        },
      });
    });
    
    next();
  };
}

/**
 * Create logger for request handling
 */
export function createRequestLogger(correlationId?: string): StructuredLogger {
  return new StructuredLogger(logger, correlationId);
}

/**
 * Create category-specific logger
 */
export function createCategoryLogger(
  category: LogCategory | string,
  correlationId?: string
): CategoryLogger {
  const structuredLogger = new StructuredLogger(logger, correlationId);
  return structuredLogger.getCategory(category);
}

/**
 * Global logger instance for default use
 */
export const defaultLogger = new StructuredLogger(logger);

/**
 * Export logger instance for direct use
 */
export { logger };
