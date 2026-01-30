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
import { ConfigurationError, BrowserInitializationError } from './errors';
import { config as loadEnv } from 'dotenv';
import path from 'path';

// Load environment variables
loadEnv({ path: path.resolve(__dirname, '../.env') });

/**
 * Worker Service Instance
 */
let browser: Browser | null = null;
let detector: TwoCaptchaDetector | null = null;
let workerService: WorkerService | null = null;
let apiServer: any = null;
let isShuttingDown = false;

/**
 * Initialize Playwright browser with stealth mode
 */
async function initializeBrowser(): Promise<Browser> {
  try {
    console.log('[Browser] Initializing Playwright browser with stealth mode...');

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

    console.log('[Browser] ✅ Browser initialized successfully');
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
    console.log('[Detector] Initializing CAPTCHA detector...');

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
    const detector = new TwoCaptchaDetector(page, {
      headless: process.env.HEADLESS !== 'false',
      timeout: parseInt(process.env.DETECTOR_TIMEOUT_MS || '60000', 10),
    });

    // Close the temporary page (detector will create its own when needed)
    await page.close();

    console.log('[Detector] ✅ CAPTCHA detector initialized successfully');
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
  console.log('[Worker] Initializing worker service...');

  const workerService = new WorkerService(detector, {
    maxWorkers: parseInt(process.env.MAX_WORKERS || '5', 10),
    maxQueueSize: parseInt(process.env.MAX_QUEUE_SIZE || '1000', 10),
    defaultTimeoutMs: parseInt(process.env.DEFAULT_TIMEOUT_MS || '60000', 10),
    maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
    retryBackoffMs: parseInt(process.env.RETRY_BACKOFF_MS || '1000', 10),
  });

  // Set up event listeners
  workerService.on('job-created', (data) => {
    console.log(`[Queue] Job created: ${data.jobId} (priority: ${data.priority})`);
  });

  workerService.on('job-started', (data) => {
    console.log(`[Queue] Job started: ${data.jobId} (attempt ${data.attempt})`);
  });

  workerService.on('job-completed', (data) => {
    console.log(`[Queue] Job completed: ${data.jobId}`);
  });

  workerService.on('job-failed', (data) => {
    console.error(`[Queue] Job failed: ${data.jobId} - ${data.error} (attempts: ${data.attempts})`);
  });

  workerService.on('job-retry', (data) => {
    console.log(`[Queue] Job queued for retry: ${data.jobId} (attempt ${data.attempt})`);
  });

   workerService.on('job-cancelled', (data) => {
     console.log(`[Queue] Job cancelled: ${data.jobId} - ${data.reason}`);
   });

   // Anti-ban event listeners
   workerService.on('anti-ban-delay', (data) => {
     if (process.env.VERBOSE_ANTI_BAN === 'true') {
       console.log(`[AntiBan] ⏸️  Applying delay: ${data.ms}ms`);
     }
   });

   workerService.on('anti-ban-break', (data) => {
     console.log(`[AntiBan] 🛑 Break required: ${data.duration}ms`);
   });

   workerService.on('anti-ban-captcha-skipped', () => {
     if (process.env.VERBOSE_ANTI_BAN === 'true') {
       console.log(`[AntiBan] ⊘ CAPTCHA skipped (anti-ban protection)`);
     }
   });

   workerService.on('anti-ban-captcha-solved', (data) => {
     if (process.env.VERBOSE_ANTI_BAN === 'true') {
       console.log(`[AntiBan] ✅ CAPTCHA solved (total in session: ${data.totalInSession})`);
     }
   });

   workerService.on('anti-ban-work-hours-exceeded', () => {
     console.warn(`[AntiBan] ⚠️  Work hours exceeded - pausing job processing`);
   });

   workerService.on('anti-ban-session-limit', () => {
     console.warn(`[AntiBan] ⚠️  Session limit reached - no more jobs will be processed`);
   });

   workerService.on('anti-ban-session-started', () => {
     const pattern = process.env.ANTI_BAN_PATTERN || 'normal';
     console.log(`[AntiBan] ✅ Anti-ban session started (pattern: ${pattern})`);
   });

   workerService.on('anti-ban-session-stopped', () => {
     console.log(`[AntiBan] ⏹️  Anti-ban session stopped`);
   });

   console.log('[Worker] ✅ Worker service initialized successfully');
   return workerService;
 }

/**
 * Start the worker service
 */
async function startWorker(): Promise<void> {
  try {
    console.log('\n[Startup] Starting 2captcha worker...\n');

    // Initialize browser
    browser = await initializeBrowser();

    // Initialize detector
    detector = await initializeDetector(browser);

    // Initialize worker service
    workerService = initializeWorkerService(detector);

     // Start processing
     await workerService.start();

     // Initialize and start REST API server
     const port = parseInt(process.env.PORT || '8019', 10);
     apiServer = createApiServer(workerService, detector, port);
     await apiServer.start();

      console.log('\n✅ 2captcha worker started successfully\n');
      console.log('Environment:');
      console.log(`  - Max workers: ${process.env.MAX_WORKERS || 5}`);
      console.log(`  - Queue size: ${process.env.MAX_QUEUE_SIZE || 1000}`);
      console.log(`  - Timeout: ${process.env.DEFAULT_TIMEOUT_MS || 60000}ms`);
      console.log(`  - Max retries: ${process.env.MAX_RETRIES || 3}`);
      console.log(`  - Headless: ${process.env.HEADLESS !== 'false'}`);
      
      // Anti-ban configuration
      const antiBanEnabled = process.env.ANTI_BAN_ENABLED !== 'false';
      if (antiBanEnabled) {
        console.log(`  - Anti-Ban: enabled (pattern: ${process.env.ANTI_BAN_PATTERN || 'normal'}, hours: ${process.env.WORK_HOURS_START || 8}-${process.env.WORK_HOURS_END || 22})`);
      } else {
        console.log(`  - Anti-Ban: disabled`);
      }
      
      console.log('\n✅ API Server:');
      console.log(`  - Server: http://0.0.0.0:${port}`);
      console.log(`  - Health Check: GET http://localhost:${port}/health`);
      console.log(`  - Metrics: GET http://localhost:${port}/api/metrics`);
      console.log(`  - Queue Status: GET http://localhost:${port}/api/queue`);
      console.log(`  - Job Submission: POST http://localhost:${port}/api/jobs\n`);
  } catch (error) {
    console.error('\n❌ Failed to start worker:', error);
    await gracefulShutdown(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(exitCode: number = 0): Promise<void> {
  if (isShuttingDown) {
    console.log('[Shutdown] Shutdown already in progress...');
    process.exit(exitCode);
  }

  isShuttingDown = true;
  console.log('\n[Shutdown] Initiating graceful shutdown...');

  try {
    if (apiServer) {
      console.log('[Shutdown] Stopping API server...');
      await apiServer.stop();
      console.log('[Shutdown] ✅ API server stopped');
    }

    // Stop worker service
    if (workerService) {
      console.log('[Shutdown] Stopping worker service...');
      await workerService.stop();
      console.log('[Shutdown] ✅ Worker service stopped');
    }

    // Close browser
    if (browser) {
      console.log('[Shutdown] Closing browser...');
      await browser.close();
      console.log('[Shutdown] ✅ Browser closed');
    }

    console.log('[Shutdown] ✅ Graceful shutdown completed\n');
    process.exit(exitCode);
  } catch (error) {
    console.error('[Shutdown] Error during shutdown:', error);
    process.exit(1);
  }
}

/**
 * Setup signal handlers
 */
function setupSignalHandlers(): void {
  process.on('SIGTERM', async () => {
    console.log('\n[Signal] Received SIGTERM');
    await gracefulShutdown(0);
  });

  process.on('SIGINT', async () => {
    console.log('\n[Signal] Received SIGINT');
    await gracefulShutdown(0);
  });

  process.on('SIGHUP', async () => {
    console.log('\n[Signal] Received SIGHUP');
    await gracefulShutdown(0);
  });

  process.on('uncaughtException', (error) => {
    console.error('\n[Error] Uncaught Exception:', error);
    gracefulShutdown(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('\n[Error] Unhandled Rejection:', reason);
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
    console.error('Fatal error:', error);
    gracefulShutdown(1);
  });
}

export default { startWorker, gracefulShutdown, getWorkerService, getDetector, getBrowser };
