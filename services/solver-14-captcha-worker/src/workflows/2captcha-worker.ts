/**
 * 2CAPTCHA.COM BROWSER AUTOMATION WORKFLOW
 * 
 * This workflow automates the entire process of:
 * 1. Logging into 2captcha.com as a WORKER
 * 2. Navigating to the work/solve page
 * 3. Capturing CAPTCHA images
 * 4. Solving them with our AI solver
 * 5. Submitting answers and earning money
 * 
 * IMPORTANT: We are the WORKER, not the API provider!
 * We go to 2captcha.com -> Click "Start Work" -> Solve CAPTCHAs -> Earn money
 * 
 * @module 2captcha-worker
 * @version 1.0.0
 */

import { chromium, Browser, Page, BrowserContext, ElementHandle } from 'playwright';
import pino from 'pino';
import axios from 'axios';

// ============================================================================
// CONFIGURATION & TYPES
// ============================================================================

interface TwoCaptchaConfig {
  email: string;
  password: string;
  headless?: boolean;
  steelBrowserUrl?: string;
  captchaSolverUrl?: string;
  confidenceThreshold?: number;
  maxRetries?: number;
  solveTimeout?: number;
  delayBetweenSolves?: { min: number; max: number };
}

interface SolveResult {
  success: boolean;
  answer: string;
  confidence: number;
  captchaType: string;
  solveTimeMs: number;
  error?: string;
}

interface WorkerStats {
  totalSolved: number;
  totalFailed: number;
  totalSkipped: number;
  totalEarnedCents: number;
  currentStreak: number;
  bestStreak: number;
  startTime: number;
  lastSolveTime?: number;
  captchaTypeBreakdown: Record<string, { solved: number; failed: number }>;
  averageSolveTimeMs: number;
  sessionId?: string;
}

// 2captcha.com specific selectors (based on their actual website structure)
const SELECTORS = {
  // Login page
  login: {
    page: 'https://2captcha.com/auth/login',
    emailInput: 'input[name="email"], input[type="email"], #email',
    passwordInput: 'input[name="password"], input[type="password"], #password',
    submitButton: 'button[type="submit"], input[type="submit"], .btn-login',
    errorMessage: '.alert-danger, .error-message, .login-error',
    successIndicator: '.dashboard, .user-menu, [data-user], .navbar-user'
  },
  
  // Worker dashboard / work page
  work: {
    page: 'https://2captcha.com/work',
    alternativePages: [
      'https://2captcha.com/enterpage',
      'https://2captcha.com/worker',
      'https://2captcha.com/ru/work' // Russian version
    ],
    startWorkButton: '.start-work, #start-work, button:has-text("Start"), a:has-text("Start Work")',
    captchaContainer: '.captcha-wrapper, .task-container, .captcha-image-container, #captcha',
    captchaImage: '.captcha-image, img.captcha, img[src*="captcha"], .task-image img',
    answerInput: 'input[name="answer"], input.answer, #answer, input[type="text"]:not([disabled])',
    submitButton: 'button[type="submit"]:has-text("Submit"), button:has-text("Send"), #submit-answer, .submit-btn',
    skipButton: 'button:has-text("Skip"), button:has-text("Bad"), .skip-captcha, #skip',
    instructions: '.task-instructions, .captcha-text, .instructions, .task-description',
    earningsDisplay: '.earnings, .balance, .money, [data-earnings]',
    solveCountDisplay: '.solved-count, .tasks-done, [data-solved]',
    noCaptchaMessage: '.no-tasks, .empty-queue, :has-text("No captchas available")',
    errorMessage: '.error, .alert-danger, .solve-error',
    successMessage: '.success, .alert-success, .correct-answer',
    wrongAnswerMessage: '.wrong, .incorrect, .alert-warning:has-text("wrong")'
  },
  
  // Common elements
  common: {
    loading: '.loading, .spinner, .loader',
    modal: '.modal, .popup, [role="dialog"]',
    closeModal: '.close, .modal-close, button:has-text("Close")',
    cookieConsent: '.cookie-consent, .cookie-banner, #cookie-accept'
  }
};

// ============================================================================
// MAIN WORKER CLASS
// ============================================================================

export class TwoCaptchaWorker {
  private config: Required<TwoCaptchaConfig>;
  private logger: pino.Logger;
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;
  private isRunning = false;
  private isPaused = false;
  private stats: WorkerStats;

  constructor(config: TwoCaptchaConfig) {
    this.config = {
      headless: process.env.HEADLESS !== 'false',
      steelBrowserUrl: process.env.STEEL_BROWSER_URL || 'http://localhost:3005',
      captchaSolverUrl: process.env.CAPTCHA_SOLVER_URL || 'http://localhost:8019',
      confidenceThreshold: parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.75'),
      maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
      solveTimeout: parseInt(process.env.SOLVE_TIMEOUT || '30', 10) * 1000,
      delayBetweenSolves: { min: 1000, max: 3000 },
      ...config
    };

    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      name: '2captcha-worker'
    });

    this.stats = this.initStats();

    this.logger.info({
      email: this.maskEmail(this.config.email),
      headless: this.config.headless,
      solverUrl: this.config.captchaSolverUrl,
      confidenceThreshold: this.config.confidenceThreshold
    }, '2CAPTCHA WORKER INITIALIZED');
  }

  private initStats(): WorkerStats {
    return {
      totalSolved: 0,
      totalFailed: 0,
      totalSkipped: 0,
      totalEarnedCents: 0,
      currentStreak: 0,
      bestStreak: 0,
      startTime: Date.now(),
      captchaTypeBreakdown: {},
      averageSolveTimeMs: 0
    };
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***@***';
    return `${local.slice(0, 2)}***@${domain}`;
  }

  // ============================================================================
  // BROWSER CONNECTION
  // ============================================================================

  private async connectToBrowser(): Promise<void> {
    this.logger.info('Connecting to browser...');

    try {
      // Try Steel Browser first (stealth mode)
      this.logger.info({ url: this.config.steelBrowserUrl }, 'Attempting Steel Browser connection...');
      this.browser = await chromium.connectOverCDP(this.config.steelBrowserUrl);
      
      // Get or create context with stealth settings
      const contexts = this.browser.contexts();
      this.context = contexts.length > 0 ? contexts[0] : await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'en-US',
        timezoneId: 'America/New_York'
      });

      this.page = await this.context.newPage();
      
      this.logger.info('Connected to Steel Browser (stealth mode)');

    } catch (error) {
      this.logger.warn({ error }, 'Steel Browser unavailable, falling back to local Chromium');
      
      // Fallback to local Playwright
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-infobars',
          '--window-position=0,0',
          '--ignore-certifcate-errors',
          '--ignore-certifcate-errors-spki-list'
        ]
      });

      this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      this.page = await this.context.newPage();
      
      this.logger.info('Connected to local Chromium (non-stealth)');
    }

    // Set default timeout
    this.page.setDefaultTimeout(this.config.solveTimeout);

    // Add anti-detection scripts
    await this.page.addInitScript(() => {
      // Hide webdriver
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });
      
      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
    });
  }

  // ============================================================================
  // LOGIN FLOW
  // ============================================================================

  private async login(): Promise<boolean> {
    if (!this.page) throw new Error('Browser not connected');

    this.logger.info('Navigating to 2captcha login page...');

    try {
      // Navigate to login page
      await this.page.goto(SELECTORS.login.page, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Handle cookie consent if present
      await this.handleCookieConsent();

      // Check if already logged in
      const isLoggedIn = await this.checkIfLoggedIn();
      if (isLoggedIn) {
        this.logger.info('Already logged in!');
        return true;
      }

      // Wait for login form
      await this.page.waitForSelector(SELECTORS.login.emailInput, { timeout: 10000 });

      // Fill email
      this.logger.info('Filling login credentials...');
      await this.page.fill(SELECTORS.login.emailInput, this.config.email);
      await this.randomDelay(200, 500);

      // Fill password
      await this.page.fill(SELECTORS.login.passwordInput, this.config.password);
      await this.randomDelay(200, 500);

      // Click submit
      await this.page.click(SELECTORS.login.submitButton);

      // Wait for navigation or error
      await Promise.race([
        this.page.waitForSelector(SELECTORS.login.successIndicator, { timeout: 15000 }),
        this.page.waitForSelector(SELECTORS.login.errorMessage, { timeout: 15000 })
      ]);

      // Check for login error
      const errorElement = await this.page.$(SELECTORS.login.errorMessage);
      if (errorElement) {
        const errorText = await errorElement.textContent();
        this.logger.error({ error: errorText }, 'Login failed');
        return false;
      }

      // Verify login success
      const loggedIn = await this.checkIfLoggedIn();
      if (loggedIn) {
        this.logger.info('Login successful!');
        return true;
      }

      this.logger.error('Login verification failed');
      return false;

    } catch (error) {
      this.logger.error({ error }, 'Login error');
      return false;
    }
  }

  private async checkIfLoggedIn(): Promise<boolean> {
    if (!this.page) return false;

    try {
      const indicator = await this.page.$(SELECTORS.login.successIndicator);
      return indicator !== null;
    } catch {
      return false;
    }
  }

  private async handleCookieConsent(): Promise<void> {
    if (!this.page) return;

    try {
      const consentButton = await this.page.$(SELECTORS.common.cookieConsent);
      if (consentButton) {
        await consentButton.click();
        this.logger.debug('Cookie consent accepted');
        await this.randomDelay(500, 1000);
      }
    } catch {
      // Ignore - cookie consent may not be present
    }
  }

  // ============================================================================
  // WORK PAGE NAVIGATION
  // ============================================================================

  private async navigateToWorkPage(): Promise<boolean> {
    if (!this.page) return false;

    this.logger.info('Navigating to work page...');

    try {
      // Try main work page first
      await this.page.goto(SELECTORS.work.page, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Check if we're on the work page
      const onWorkPage = await this.isOnWorkPage();
      if (onWorkPage) {
        this.logger.info('On work page');
        return true;
      }

      // Try alternative pages
      for (const altPage of SELECTORS.work.alternativePages) {
        this.logger.debug({ url: altPage }, 'Trying alternative work page...');
        await this.page.goto(altPage, { waitUntil: 'networkidle', timeout: 15000 });
        
        if (await this.isOnWorkPage()) {
          this.logger.info({ url: altPage }, 'Found work page at alternative URL');
          return true;
        }
      }

      // Look for "Start Work" button
      const startButton = await this.page.$(SELECTORS.work.startWorkButton);
      if (startButton) {
        await startButton.click();
        await this.page.waitForLoadState('networkidle');
        
        if (await this.isOnWorkPage()) {
          this.logger.info('Started work via button');
          return true;
        }
      }

      this.logger.error('Could not navigate to work page');
      return false;

    } catch (error) {
      this.logger.error({ error }, 'Navigation error');
      return false;
    }
  }

  private async isOnWorkPage(): Promise<boolean> {
    if (!this.page) return false;

    try {
      // Check for captcha container or answer input
      const captchaContainer = await this.page.$(SELECTORS.work.captchaContainer);
      const answerInput = await this.page.$(SELECTORS.work.answerInput);
      
      return captchaContainer !== null || answerInput !== null;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // CAPTCHA DETECTION & SOLVING
  // ============================================================================

  private async waitForCaptcha(): Promise<{ image: string; instructions?: string } | null> {
    if (!this.page) return null;

    this.logger.debug('Waiting for CAPTCHA...');

    try {
      // Wait for loading to complete
      await this.waitForLoadingComplete();

      // Check for "no captchas available" message
      const noCaptcha = await this.page.$(SELECTORS.work.noCaptchaMessage);
      if (noCaptcha) {
        this.logger.info('No captchas available in queue');
        return null;
      }

      // Wait for captcha image
      const imageElement = await this.page.waitForSelector(SELECTORS.work.captchaImage, {
        timeout: 10000,
        state: 'visible'
      });

      if (!imageElement) {
        return null;
      }

      // Get captcha image as base64
      const imageData = await this.extractCaptchaImage(imageElement);

      // Get instructions if available
      let instructions: string | undefined;
      try {
        const instructionsElement = await this.page.$(SELECTORS.work.instructions);
        if (instructionsElement) {
          instructions = await instructionsElement.textContent() || undefined;
        }
      } catch {
        // No instructions available
      }

      this.logger.info({ 
        hasInstructions: !!instructions,
        instructionsPreview: instructions?.slice(0, 50)
      }, 'CAPTCHA detected');

      return { image: imageData, instructions };

    } catch (error) {
      this.logger.debug({ error }, 'No CAPTCHA found or timeout');
      return null;
    }
  }

  private async extractCaptchaImage(element: ElementHandle): Promise<string> {
    // Take screenshot of the captcha element
    const screenshot = await element.screenshot({
      type: 'png'
    });

    return screenshot.toString('base64');
  }

  private async waitForLoadingComplete(): Promise<void> {
    if (!this.page) return;

    try {
      // Wait for any loading indicators to disappear
      const loader = await this.page.$(SELECTORS.common.loading);
      if (loader) {
        await this.page.waitForSelector(SELECTORS.common.loading, {
          state: 'hidden',
          timeout: 5000
        });
      }
    } catch {
      // Loading indicator may not exist
    }
  }

  private async solveCaptcha(imageBase64: string, instructions?: string): Promise<SolveResult> {
    const startTime = Date.now();

    try {
      this.logger.debug('Sending CAPTCHA to AI solver...');

      // Step 1: Classify the CAPTCHA type
      const classifyResponse = await axios.post(
        `${this.config.captchaSolverUrl}/api/classify`,
        { image: imageBase64 },
        { timeout: 10000 }
      );

      const captchaType = classifyResponse.data.captcha_type || 'text';
      const classifyConfidence = classifyResponse.data.confidence || 0.5;

      this.logger.info({ captchaType, confidence: classifyConfidence }, 'CAPTCHA classified');

      // Step 2: Solve based on type
      let solveEndpoint = '/api/solve/text';
      const solvePayload: Record<string, any> = {
        image_base64: imageBase64,
        captcha_type: captchaType
      };

      if (captchaType === 'slider') {
        solveEndpoint = '/api/solve/slider';
      } else if (captchaType === 'image_grid' || captchaType === 'hcaptcha') {
        solveEndpoint = '/api/solve/image-grid';
        solvePayload.instructions = instructions || 'Select all matching images';
      } else if (captchaType === 'audio') {
        solveEndpoint = '/api/solve/audio';
      }

      const solveResponse = await axios.post(
        `${this.config.captchaSolverUrl}${solveEndpoint}`,
        solvePayload,
        { timeout: 20000 }
      );

      const solveTimeMs = Date.now() - startTime;

      // Handle different response formats
      let answer: string;
      let confidence: number;

      if (solveResponse.data.solution) {
        answer = solveResponse.data.solution;
        confidence = solveResponse.data.confidence || 0.8;
      } else if (solveResponse.data.indices) {
        answer = solveResponse.data.indices.join(',');
        confidence = solveResponse.data.confidence || 0.8;
      } else if (solveResponse.data.offset !== undefined) {
        answer = solveResponse.data.offset.toString();
        confidence = solveResponse.data.confidence || 0.8;
      } else {
        throw new Error('Unknown solver response format');
      }

      this.logger.info({
        answer: answer.slice(0, 20),
        confidence,
        captchaType,
        solveTimeMs
      }, 'CAPTCHA solved by AI');

      return {
        success: true,
        answer,
        confidence,
        captchaType,
        solveTimeMs
      };

    } catch (error) {
      const solveTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error({ error: errorMessage, solveTimeMs }, 'Solver error');

      return {
        success: false,
        answer: '',
        confidence: 0,
        captchaType: 'unknown',
        solveTimeMs,
        error: errorMessage
      };
    }
  }

  private async submitAnswer(answer: string): Promise<boolean> {
    if (!this.page) return false;

    this.logger.debug({ answer }, 'Submitting answer...');

    try {
      // Find and fill answer input
      const input = await this.page.waitForSelector(SELECTORS.work.answerInput, {
        timeout: 5000,
        state: 'visible'
      });

      if (!input) {
        this.logger.error('Answer input not found');
        return false;
      }

      // Clear and fill
      await input.click({ clickCount: 3 }); // Select all
      await this.page.keyboard.type(answer, { delay: 50 }); // Type with human-like delay

      await this.randomDelay(200, 500);

      // Click submit
      const submitButton = await this.page.$(SELECTORS.work.submitButton);
      if (submitButton) {
        await submitButton.click();
      } else {
        // Try pressing Enter
        await this.page.keyboard.press('Enter');
      }

      // Wait for result feedback
      await this.randomDelay(1000, 2000);

      // Check for success/failure indicators
      const successIndicator = await this.page.$(SELECTORS.work.successMessage);
      const wrongIndicator = await this.page.$(SELECTORS.work.wrongAnswerMessage);

      if (successIndicator) {
        this.logger.info('Answer accepted!');
        return true;
      }

      if (wrongIndicator) {
        this.logger.warn('Answer was wrong');
        return false;
      }

      // No clear indicator - assume success if no error
      return true;

    } catch (error) {
      this.logger.error({ error }, 'Submit error');
      return false;
    }
  }

  private async skipCaptcha(): Promise<void> {
    if (!this.page) return;

    try {
      const skipButton = await this.page.$(SELECTORS.work.skipButton);
      if (skipButton) {
        await skipButton.click();
        this.stats.totalSkipped++;
        this.logger.info('CAPTCHA skipped');
        await this.randomDelay(500, 1000);
      }
    } catch (error) {
      this.logger.debug({ error }, 'Could not skip CAPTCHA');
    }
  }

  private async updateEarningsFromPage(): Promise<void> {
    if (!this.page) return;

    try {
      const earningsElement = await this.page.$(SELECTORS.work.earningsDisplay);
      if (earningsElement) {
        const text = await earningsElement.textContent();
        if (text) {
          // Parse earnings (format varies: "$0.05", "0.05 USD", "5 cents", etc.)
          const match = text.match(/[\d.]+/);
          if (match) {
            const amount = parseFloat(match[0]);
            // Convert to cents if needed
            const cents = amount < 1 ? Math.round(amount * 100) : Math.round(amount);
            this.stats.totalEarnedCents = cents;
          }
        }
      }
    } catch {
      // Ignore earnings parse errors
    }
  }

  // ============================================================================
  // MAIN WORK LOOP
  // ============================================================================

  async start(): Promise<void> {
    this.isRunning = true;
    this.stats = this.initStats();

    this.logger.info('STARTING 2CAPTCHA WORKER');

    try {
      // Step 1: Connect to browser
      await this.connectToBrowser();

      // Step 2: Login
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        throw new Error('Login failed - check credentials');
      }

      // Step 3: Navigate to work page
      const navSuccess = await this.navigateToWorkPage();
      if (!navSuccess) {
        throw new Error('Could not navigate to work page');
      }

      // Step 4: Start the main work loop
      this.logger.info('STARTING TO EARN MONEY!');
      await this.workLoop();

    } catch (error) {
      this.logger.error({ error }, 'Fatal worker error');
      throw error;
    }
  }

  private async workLoop(): Promise<void> {
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 10;

    while (this.isRunning) {
      if (this.isPaused) {
        this.logger.info('Worker paused, waiting...');
        await this.sleep(5000);
        continue;
      }

      try {
        // Check if still on work page
        if (!await this.isOnWorkPage()) {
          this.logger.info('Navigating back to work page...');
          await this.navigateToWorkPage();
        }

        // Wait for CAPTCHA
        const captcha = await this.waitForCaptcha();

        if (!captcha) {
          this.logger.debug('No CAPTCHA available, waiting...');
          await this.randomDelay(3000, 5000);
          continue;
        }

        // Solve the CAPTCHA
        const result = await this.solveCaptcha(captcha.image, captcha.instructions);

        if (!result.success) {
          this.logger.warn({ error: result.error }, 'Solver failed');
          await this.skipCaptcha();
          this.updateStats(result, false);
          consecutiveErrors++;
          continue;
        }

        // Check confidence threshold
        if (result.confidence < this.config.confidenceThreshold) {
          this.logger.warn({ 
            confidence: result.confidence, 
            threshold: this.config.confidenceThreshold 
          }, 'Confidence too low, skipping');
          await this.skipCaptcha();
          this.updateStats(result, false);
          continue;
        }

        // Submit the answer
        const submitSuccess = await this.submitAnswer(result.answer);
        this.updateStats(result, submitSuccess);

        // Update earnings from page
        await this.updateEarningsFromPage();

        // Log progress
        this.logProgress();

        // Random delay between solves (human-like behavior)
        await this.randomDelay(
          this.config.delayBetweenSolves.min,
          this.config.delayBetweenSolves.max
        );

        // Reset consecutive errors on success
        consecutiveErrors = 0;

      } catch (error) {
        consecutiveErrors++;
        this.logger.error({ error, consecutiveErrors }, 'Work loop error');

        if (consecutiveErrors >= maxConsecutiveErrors) {
          this.logger.error('Too many consecutive errors, stopping worker');
          this.isRunning = false;
          break;
        }

        await this.sleep(5000);
      }
    }

    this.logger.info({ stats: this.getStats() }, 'Work loop ended');
  }

  private updateStats(result: SolveResult, success: boolean): void {
    const type = result.captchaType || 'unknown';

    if (!this.stats.captchaTypeBreakdown[type]) {
      this.stats.captchaTypeBreakdown[type] = { solved: 0, failed: 0 };
    }

    if (success) {
      this.stats.totalSolved++;
      this.stats.currentStreak++;
      this.stats.captchaTypeBreakdown[type].solved++;
      
      if (this.stats.currentStreak > this.stats.bestStreak) {
        this.stats.bestStreak = this.stats.currentStreak;
      }

      // Update average solve time
      const totalSolves = this.stats.totalSolved + this.stats.totalFailed;
      this.stats.averageSolveTimeMs = 
        (this.stats.averageSolveTimeMs * (totalSolves - 1) + result.solveTimeMs) / totalSolves;

    } else {
      this.stats.totalFailed++;
      this.stats.currentStreak = 0;
      this.stats.captchaTypeBreakdown[type].failed++;
    }

    this.stats.lastSolveTime = Date.now();
  }

  private logProgress(): void {
    const stats = this.getStats();
    
    this.logger.info({
      solved: stats.totalSolved,
      failed: stats.totalFailed,
      skipped: stats.totalSkipped,
      streak: stats.currentStreak,
      successRate: `${stats.successRate.toFixed(1)}%`,
      earnedCents: stats.totalEarnedCents,
      avgSolveTimeMs: Math.round(stats.averageSolveTimeMs),
      uptime: `${Math.round(stats.uptimeMinutes)}min`
    }, 'Progress update');
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getStats(): WorkerStats & { successRate: number; uptimeMinutes: number; solvesPerHour: number } {
    const uptime = Date.now() - this.stats.startTime;
    const uptimeHours = uptime / (1000 * 60 * 60);
    const totalAttempts = this.stats.totalSolved + this.stats.totalFailed;

    return {
      ...this.stats,
      successRate: totalAttempts > 0 ? (this.stats.totalSolved / totalAttempts) * 100 : 0,
      uptimeMinutes: uptime / (1000 * 60),
      solvesPerHour: uptimeHours > 0 ? this.stats.totalSolved / uptimeHours : 0
    };
  }

  pause(): void {
    this.isPaused = true;
    this.logger.info('Worker paused');
  }

  resume(): void {
    this.isPaused = false;
    this.logger.info('Worker resumed');
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping worker...');
    this.isRunning = false;

    if (this.page) {
      await this.page.close().catch(() => {});
    }

    if (this.context) {
      await this.context.close().catch(() => {});
    }

    if (this.browser) {
      await this.browser.close().catch(() => {});
    }

    this.logger.info({ stats: this.getStats() }, 'Worker stopped - Final stats');
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await this.sleep(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// EXPORTS & STANDALONE RUNNER
// ============================================================================

export default TwoCaptchaWorker;

// Allow running directly: npx ts-node 2captcha-worker.ts
if (require.main === module) {
  const worker = new TwoCaptchaWorker({
    email: process.env.TWOCAPTCHA_WORKER_EMAIL || process.env.USERNAME || '',
    password: process.env.TWOCAPTCHA_WORKER_PASSWORD || process.env.PASSWORD || ''
  });

  const gracefulShutdown = async () => {
    console.log('\nShutting down...');
    await worker.stop();
    process.exit(0);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  worker.start().catch(error => {
    console.error('Worker failed:', error);
    process.exit(1);
  });
}
