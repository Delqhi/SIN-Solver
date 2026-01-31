/**
 * 2captcha Worker - Main Entry Point
 * 
 * Initializes:
 * - Playwright browser with stealth mode
 * - CAPTCHA detector
 * - Worker service with job queue
 * - REST API server
 * - Graceful shutdown handlers
 */

import { chromium, Browser, Page } from 'playwright';
import { TwoCaptchaDetector } from './detector';
import { WorkerService } from './worker.service';
import { createApiServer } from './api';
import { startServer as startMultiAgentServer } from './server';
import { ConfigurationError, BrowserInitializationError } from './errors';
import { AlertSystem } from './alerts';
import { createAlertSystemWithCallbacks } from './alerts';
import { AlertSystem as AlertSystemInterface } from './types';
import { config as loadEnv } from 'dotenv';
import path from 'path';
import { createCategoryLogger, LogCategory } from './logger';

// Type declarations
declare global {
  interface Window {
    chrome?: {
      runtime: Record<string, unknown>;
    };
  }
}

// Load environment variables
loadEnv({ path: path.resolve(__dirname, '../.env') });

const startupLogger = createCategoryLogger(LogCategory.STARTUP);
const browserLogger = createCategoryLogger(LogCategory.BROWSER);
const detectorLogger = createCategoryLogger(LogCategory.DETECTOR);
const workerLogger = createCategoryLogger(LogCategory.WORKER);
const multiAgentLogger = createCategoryLogger(LogCategory.API);
const shutdownLogger = createCategoryLogger(LogCategory.SHUTDOWN);
const signalLogger = createCategoryLogger(LogCategory.API);
const queueLogger = createCategoryLogger(LogCategory.QUEUE);
const antiBanLogger = createCategoryLogger(LogCategory.ANTI_BAN);

/**
 * Worker Service Instance
 */
let browser: Browser | null = null;
let detector: TwoCaptchaDetector | null = null;
let workerService: WorkerService | null = null;
let apiServer: any = null;
let multiAgentServer: any = null;
let isShuttingDown = false;

/**
 * Initialize Playwright browser with stealth mode
 */
async function initializeBrowser(): Promise<Browser> {
  try {
    browserLogger.info('Initializing Playwright browser with stealth mode');

    const browser = await chromium.launch({
      headless: process.env.HEADLESS !== 'false',
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-component-update',
        '--disable-sync',
      ],
    });

    browserLogger.info('✅ Browser initialized successfully');
    return browser;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new BrowserInitializationError(message, {
      environment: {
        headless: process.env.HEADLESS,
        nodeVersion: process.version,
      },
    });
  }
}

/**
 * Initialize CAPTCHA detector
 */
async function initializeDetector(browser: Browser): Promise<TwoCaptchaDetector> {
  try {
    detectorLogger.info('Initializing CAPTCHA detector');

    // Create a temporary page for detector initialization
    const page = await browser.newPage();

    // Apply stealth mode modifications
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });

      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      window.chrome = {
        runtime: {},
      } as any;
    });

    // Initialize detector (will use the provided page or create new ones)
    const alertSystem = createAlertSystemWithCallbacks(
      {}, // Empty AlertConfig - no Telegram/Slack configured
      {   // AlertCallbacks
        onCaptchaDetected: async (info) => detectorLogger.info(`CAPTCHA detected: ${info.id}`),
        onError: async (error) => detectorLogger.error(`Error: ${error.message}`),
        onSuccess: async (result) => detectorLogger.info(`✅ ${result.message}`),
        onWarning: async (message) => detectorLogger.warn(`⚠️ ${message}`),
        onTimeout: async (message) => detectorLogger.warn(`⏱️ ${message}`),
      }
    );
    const detector = new TwoCaptchaDetector(page, alertSystem, parseInt(process.env.DETECTOR_TIMEOUT_MS || '60000', 10));

    // Close the temporary page (detector will create its own when needed)
    await page.close();

    detectorLogger.info('✅ CAPTCHA detector initialized successfully');
    return detector;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new BrowserInitializationError(
      `Failed to initialize detector: ${message}`,
      { detectorError: true }
    );
  }
}

/**
 * Initialize worker service
 */
function initializeWorkerService(
  detector: TwoCaptchaDetector
): WorkerService {
  workerLogger.info('Initializing worker service');

  const workerService = new WorkerService(detector, {
    maxWorkers: parseInt(process.env.MAX_WORKERS || '5', 10),
    maxQueueSize: parseInt(process.env.MAX_QUEUE_SIZE || '1000', 10),
    defaultTimeoutMs: parseInt(process.env.DEFAULT_TIMEOUT_MS || '60000', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    retryBackoffMs: parseInt(process.env.RETRY_BACKOFF_MS || '1000', 10),
  });

  // Set up event listeners
  workerService.on('job-created', (data) => {
    queueLogger.info('Job created', { metadata: { jobId: data.jobId, priority: data.priority } });
  });

  workerService.on('job-started', (data) => {
    queueLogger.info('Job started', { metadata: { jobId: data.jobId, attempt: data.attempt } });
  });

  workerService.on('job-completed', (data) => {
    queueLogger.info('Job completed', { metadata: { jobId: data.jobId } });
  });

  workerService.on('job-failed', (data) => {
    queueLogger.error('Job failed', { metadata: { jobId: data.jobId, error: data.error, attempts: data.attempts } });
  });

  workerService.on('job-retry', (data) => {
    queueLogger.info('Job queued for retry', { metadata: { jobId: data.jobId, attempt: data.attempt } });
  });

   workerService.on('job-cancelled', (data) => {
     queueLogger.info('Job cancelled', { metadata: { jobId: data.jobId, reason: data.reason } });
   });

    // Anti-ban event listeners
    workerService.on('anti-ban-delay', (data) => {
      if (process.env.VERBOSE_ANTI_BAN === 'true') {
        antiBanLogger.info('⏸️  Applying delay', { metadata: { ms: data.ms } });
      }
    });

    workerService.on('anti-ban-break', (data) => {
      antiBanLogger.info('🛑 Break required', { metadata: { duration: data.duration } });
    });

    workerService.on('anti-ban-captcha-skipped', () => {
      if (process.env.VERBOSE_ANTI_BAN === 'true') {
        antiBanLogger.info('⊘ CAPTCHA skipped (anti-ban protection)');
      }
    });

    workerService.on('anti-ban-captcha-solved', (data) => {
      if (process.env.VERBOSE_ANTI_BAN === 'true') {
        antiBanLogger.info('✅ CAPTCHA solved', { metadata: { totalInSession: data.totalInSession } });
      }
    });

    workerService.on('anti-ban-work-hours-exceeded', () => {
      antiBanLogger.warn('⚠️  Work hours exceeded - pausing job processing');
    });

    workerService.on('anti-ban-session-limit', () => {
      antiBanLogger.warn('⚠️  Session limit reached - no more jobs will be processed');
    });

    workerService.on('anti-ban-session-started', () => {
      const pattern = process.env.ANTI_BAN_PATTERN || 'normal';
      antiBanLogger.info('✅ Anti-ban session started', { metadata: { pattern } });
    });

    workerService.on('anti-ban-session-stopped', () => {
      antiBanLogger.info('⏹️  Anti-ban session stopped');
    });

    workerLogger.info('✅ Worker service initialized successfully');
    return workerService;
 }

/**
 * Start the worker service
 */
async function startWorker(): Promise<void> {
    try {
      startupLogger.info('Starting 2captcha worker with multi-agent solver...');

      // Initialize browser
      browser = await initializeBrowser();

      // Initialize detector
      detector = await initializeDetector(browser);

      // Initialize worker service
      workerService = initializeWorkerService(detector);

       // Start processing
       await workerService.start();

       // Initialize and start browser automation API server (port 8019)
       const browsAutomationPort = parseInt(process.env.PORT || '8019', 10);
       apiServer = createApiServer(workerService, detector, browsAutomationPort);
       await apiServer.start();

       // Initialize and start multi-agent CAPTCHA solver API server (port 8000)
       const multiAgentSolverPort = parseInt(process.env.SOLVER_API_PORT || '8000', 10);
       try {
         multiAgentServer = await startMultiAgentServer(multiAgentSolverPort);
         multiAgentLogger.info('✅ Multi-agent solver API started', { metadata: { port: multiAgentSolverPort } });
       } catch (error) {
         multiAgentLogger.warn('⚠️  Multi-agent solver API failed to start', { metadata: { error: error instanceof Error ? error.message : String(error) } });
         multiAgentLogger.info('Browser automation API will continue working...');
       }

        startupLogger.info('✅ 2captcha worker started successfully');
        startupLogger.info('Environment configuration', {
          metadata: {
            maxWorkers: process.env.MAX_WORKERS || 5,
            queueSize: process.env.MAX_QUEUE_SIZE || 1000,
            timeoutMs: process.env.DEFAULT_TIMEOUT_MS || 60000,
            maxRetries: process.env.MAX_RETRIES || 3,
            headless: process.env.HEADLESS !== 'false'
          }
        });
        
        // Anti-ban configuration
        const antiBanEnabled = process.env.ANTI_BAN_ENABLED !== 'false';
        if (antiBanEnabled) {
          startupLogger.info('Anti-Ban enabled', {
            metadata: {
              pattern: process.env.ANTI_BAN_PATTERN || 'normal',
              workHours: `${process.env.WORK_HOURS_START || 8}-${process.env.WORK_HOURS_END || 22}`
            }
          });
        } else {
          startupLogger.info('Anti-Ban disabled');
        }
        
        startupLogger.info('Browser Automation API Server', {
          metadata: {
            server: `http://0.0.0.0:${browsAutomationPort}`,
            healthCheck: `GET http://localhost:${browsAutomationPort}/health`,
            metrics: `GET http://localhost:${browsAutomationPort}/api/metrics`,
            queueStatus: `GET http://localhost:${browsAutomationPort}/api/queue`,
            jobSubmission: `POST http://localhost:${browsAutomationPort}/api/jobs`
          }
        });

        startupLogger.info('Multi-Agent CAPTCHA Solver API Server', {
          metadata: {
            server: `http://0.0.0.0:${multiAgentSolverPort}`,
            healthCheck: `GET http://localhost:${multiAgentSolverPort}/health`,
            solverInfo: `GET http://localhost:${multiAgentSolverPort}/api/solver-info`,
            solveCaptcha: `POST http://localhost:${multiAgentSolverPort}/api/solve-captcha`
          }
        });
    } catch (error) {
      startupLogger.errorWithStack('Failed to start worker', error);
      await gracefulShutdown(1);
    }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(exitCode: number = 0): Promise<void> {
   if (isShuttingDown) {
     shutdownLogger.info('Shutdown already in progress...');
     process.exit(exitCode);
   }

   isShuttingDown = true;
   shutdownLogger.info('\nInitiating graceful shutdown...');

   try {
     // Stop multi-agent solver server first
     if (multiAgentServer) {
       shutdownLogger.info('Stopping multi-agent solver API server...');
       await multiAgentServer.stop();
       shutdownLogger.info('✅ Multi-agent solver API server stopped');
     }

     // Stop browser automation API server
     if (apiServer) {
       shutdownLogger.info('Stopping browser automation API server...');
       await apiServer.stop();
       shutdownLogger.info('✅ Browser automation API server stopped');
     }

     // Stop worker service
     if (workerService) {
       shutdownLogger.info('Stopping worker service...');
       await workerService.stop();
       shutdownLogger.info('✅ Worker service stopped');
     }

     // Close browser
     if (browser) {
       shutdownLogger.info('Closing browser...');
       await browser.close();
       shutdownLogger.info('✅ Browser closed');
     }

     shutdownLogger.info('✅ Graceful shutdown completed\n');
     process.exit(exitCode);
   } catch (error) {
     shutdownLogger.errorWithStack('Error during shutdown', error);
     process.exit(1);
   }
}

/**
 * Setup signal handlers
 */
function setupSignalHandlers(): void {
  process.on('SIGTERM', async () => {
    signalLogger.info('\nReceived SIGTERM');
    await gracefulShutdown(0);
  });

  process.on('SIGINT', async () => {
    signalLogger.info('\nReceived SIGINT');
    await gracefulShutdown(0);
  });

  process.on('SIGHUP', async () => {
    signalLogger.info('\nReceived SIGHUP');
    await gracefulShutdown(0);
  });

  process.on('uncaughtException', (error) => {
    signalLogger.errorWithStack('\nUncaught Exception', error);
    gracefulShutdown(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    signalLogger.errorWithStack('\nUnhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)));
    gracefulShutdown(1);
  });
}

/**
 * Export services for API usage
 */
export function getWorkerService(): WorkerService {
  if (!workerService) {
    throw new Error('Worker service not initialized');
  }
  return workerService;
}

export function getDetector(): TwoCaptchaDetector {
  if (!detector) {
    throw new Error('Detector not initialized');
  }
  return detector;
}

export function getBrowser(): Browser {
  if (!browser) {
    throw new Error('Browser not initialized');
  }
  return browser;
}

/**
 * Main execution
 */
if (require.main === module) {
  setupSignalHandlers();
  startWorker().catch(error => {
    startupLogger.errorWithStack('Fatal error', error);
    gracefulShutdown(1);
  });
}

export default { startWorker, gracefulShutdown, getWorkerService, getDetector, getBrowser };
