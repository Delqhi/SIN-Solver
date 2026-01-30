/**
 * KOLOTIBABLO.COM BROWSER AUTOMATION WORKFLOW
 * 
 * This workflow automates the entire process of:
 * 1. Logging into kolotibablo.com as a WORKER
 * 2. Navigating to the work/solve page
 * 3. Capturing CAPTCHA images
 * 4. Solving them with our AI solver
 * 5. Submitting answers and earning money
 * 
 * IMPORTANT: We are the WORKER, not the API provider!
 * We go to kolotibablo.com -> Click "Start Work" -> Solve CAPTCHAs -> Earn money
 * 
 * Kolotibablo specifics:
 * - Uses a different UI than 2captcha (simpler interface)
 * - Has text, image, and slider captchas
 * - Requires email/password login
 * - Work page shows balance and stats
 * 
 * @module kolotibablo-worker
 * @version 1.0.0
 */

import { chromium, Browser, Page, BrowserContext, ElementHandle } from 'playwright';
import pino from 'pino';
import axios from 'axios';

// ============================================================================
// CONFIGURATION & TYPES
// ============================================================================

interface KolotibabloConfig {
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

// Kolotibablo.com specific selectors (based on their actual website structure)
const SELECTORS = {
  // Login page
  login: {
    page: 'https://kolotibablo.com/login',
    alternativePages: [
      'https://kolotibablo.com/en/login',
      'https://kolotibablo.com/ru/login',
      'https://www.kolotibablo.com/login'
    ],
    emailInput: 'input[name="email"], input[type="email"], #email, input[placeholder*="email" i]',
    passwordInput: 'input[name="password"], input[type="password"], #password',
    submitButton: 'button[type="submit"], input[type="submit"], .btn-login, button:has-text("Login"), button:has-text("Sign in"), button:has-text("Войти")',
    rememberMe: 'input[type="checkbox"][name="remember"], #remember-me',
    errorMessage: '.alert-danger, .error-message, .login-error, .alert-error, .text-danger',
    successIndicator: '.user-panel, .dashboard, .balance, .navbar-user, [data-user], .logged-in'
  },
  
  // Registration page (in case user needs to register)
  register: {
    page: 'https://kolotibablo.com/register',
    registerLink: 'a[href*="register"], a:has-text("Register"), a:has-text("Sign up")'
  },
  
  // Worker dashboard / work page
  work: {
    page: 'https://kolotibablo.com/work',
    alternativePages: [
      'https://kolotibablo.com/en/work',
      'https://kolotibablo.com/ru/work',
      'https://kolotibablo.com/captcha',
      'https://kolotibablo.com/solve'
    ],
    startWorkButton: '.start-work, #start-work, button:has-text("Start"), button:has-text("Begin"), a:has-text("Start Work"), button:has-text("Начать")',
    
    // Captcha container and elements
    captchaContainer: '.captcha-wrapper, .task-container, .captcha-box, #captcha-container, .work-area',
    captchaImage: '.captcha-image, img.captcha, img[src*="captcha"], .task-image img, #captcha-img, .captcha img',
    captchaCanvas: 'canvas.captcha, #captcha-canvas',
    
    // Input and submission
    answerInput: 'input[name="answer"], input.answer, #answer, input[type="text"]:not([disabled]), input[placeholder*="answer" i], input[placeholder*="ответ" i]',
    submitButton: 'button[type="submit"], button:has-text("Submit"), button:has-text("Send"), button:has-text("OK"), #submit-answer, .submit-btn, button:has-text("Отправить")',
    skipButton: 'button:has-text("Skip"), button:has-text("Next"), button:has-text("Pass"), .skip-captcha, #skip, button:has-text("Пропустить")',
    
    // Instructions and info
    instructions: '.task-instructions, .captcha-text, .instructions, .task-description, .hint',
    captchaType: '.captcha-type, .task-type, [data-captcha-type]',
    
    // Stats and earnings display
    balanceDisplay: '.balance, .earnings, .money, [data-balance], .user-balance, #balance',
    solveCountDisplay: '.solved-count, .tasks-done, [data-solved], .stats-solved',
    rateDisplay: '.rate, .price-per-captcha, .earning-rate',
    
    // Status messages
    noCaptchaMessage: '.no-tasks, .empty-queue, .no-captcha, :has-text("No captchas"), :has-text("Please wait"), :has-text("Нет капчи")',
    errorMessage: '.error, .alert-danger, .solve-error, .wrong-answer, .text-danger',
    successMessage: '.success, .alert-success, .correct-answer, .text-success',
    wrongAnswerMessage: '.wrong, .incorrect, .alert-warning, :has-text("wrong"), :has-text("incorrect"), :has-text("Неверно")',
    
    // Timer elements (some providers have time limits)
    timer: '.timer, .countdown, .time-left, #timer',
    
    // Slider captcha specific
    sliderTrack: '.slider-track, .slide-verify, .slider-container',
    sliderHandle: '.slider-handle, .slider-button, .slide-btn',
    sliderTarget: '.slider-target, .puzzle-piece, .slide-target'
  },
  
  // Common elements
  common: {
    loading: '.loading, .spinner, .loader, .wait',
    modal: '.modal, .popup, [role="dialog"], .overlay',
    closeModal: '.close, .modal-close, button:has-text("Close"), .btn-close, button:has-text("×")',
    cookieConsent: '.cookie-consent, .cookie-banner, #cookie-accept, .gdpr-consent',
    acceptCookies: 'button:has-text("Accept"), button:has-text("OK"), button:has-text("Agree"), .accept-cookies'
  }
};

// ============================================================================
// MAIN WORKER CLASS
// ============================================================================

export class KolotibabloWorker {
  private config: Required<KolotibabloConfig>;
  private logger: pino.Logger;
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;
  private isRunning = false;
  private isPaused = false;
  private stats: WorkerStats;

  constructor(config: KolotibabloConfig) {
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
      name: 'kolotibablo-worker'
    });

    this.stats = this.initStats();

    this.logger.info({
      email: this.maskEmail(this.config.email),
      headless: this.config.headless,
      solverUrl: this.config.captchaSolverUrl,
      confidenceThreshold: this.config.confidenceThreshold
    }, 'KOLOTIBABLO WORKER INITIALIZED');
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
      averageSolveTimeMs: 0,
      sessionId: `kolotibablo-${Date.now()}`
    };
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return '***@***';
    return `${local.substring(0, 2)}***@${domain}`;
  }

  // ============================================================================
  // BROWSER CONNECTION
  // ============================================================================

  private async connectBrowser(): Promise<void> {
    this.logger.info('Connecting to browser...');

    try {
      // Try Steel Browser first (preferred for anti-detection)
      const steelEndpoint = `${this.config.steelBrowserUrl}/devtools/browser`;
      
      this.logger.debug({ endpoint: steelEndpoint }, 'Attempting Steel Browser connection');
      
      this.browser = await chromium.connectOverCDP(steelEndpoint, {
        timeout: 30000
      });
      
      this.logger.info('Connected to Steel Browser via CDP');
    } catch (steelError) {
      this.logger.warn({ error: (steelError as Error).message }, 'Steel Browser connection failed, falling back to local Chromium');
      
      // Fallback to local Chromium
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled'
        ]
      });
      
      this.logger.info({ headless: this.config.headless }, 'Launched local Chromium browser');
    }

    // Create browser context with anti-detection settings
    this.context = await this.browser.newContext({
      viewport: { width: 1366, height: 768 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US',
      timezoneId: 'America/New_York',
      permissions: ['geolocation'],
      geolocation: { latitude: 40.7128, longitude: -74.0060 }, // NYC
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    // Add anti-detection scripts
    await this.context.addInitScript(() => {
      // Hide webdriver
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      
      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
          { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
          { name: 'Native Client', filename: 'internal-nacl-plugin' }
        ]
      });
      
      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
      
      // Mock connection
      Object.defineProperty(navigator, 'connection', {
        get: () => ({
          effectiveType: '4g',
          rtt: 50,
          downlink: 10,
          saveData: false
        })
      });
      
      // Mock hardware concurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8
      });
      
      // Mock device memory
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8
      });
      
      // Remove automation indicators
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
    });

    this.page = await this.context.newPage();
    
    // Set default timeouts
    this.page.setDefaultTimeout(this.config.solveTimeout);
    this.page.setDefaultNavigationTimeout(60000);

    this.logger.info('Browser context and page created successfully');
  }

  // ============================================================================
  // LOGIN FLOW
  // ============================================================================

  private async login(): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized');

    this.logger.info('Starting login flow...');

    try {
      // Navigate to login page
      await this.page.goto(SELECTORS.login.page, { 
        waitUntil: 'networkidle',
        timeout: 60000 
      });

      // Handle cookie consent if present
      await this.handleCookieConsent();

      // Wait a bit for any dynamic content
      await this.randomDelay(1000, 2000);

      // Check if already logged in
      const isLoggedIn = await this.checkIfLoggedIn();
      if (isLoggedIn) {
        this.logger.info('Already logged in, skipping login flow');
        return true;
      }

      // Find and fill email
      const emailInput = await this.page.waitForSelector(SELECTORS.login.emailInput, { timeout: 10000 });
      if (!emailInput) throw new Error('Email input not found');
      
      await emailInput.click();
      await this.typeHumanLike(this.config.email);
      
      this.logger.debug('Email entered');

      // Find and fill password
      const passwordInput = await this.page.waitForSelector(SELECTORS.login.passwordInput, { timeout: 5000 });
      if (!passwordInput) throw new Error('Password input not found');
      
      await passwordInput.click();
      await this.typeHumanLike(this.config.password);
      
      this.logger.debug('Password entered');

      // Check "remember me" if available
      try {
        const rememberMe = await this.page.$(SELECTORS.login.rememberMe);
        if (rememberMe) {
          await rememberMe.check();
          this.logger.debug('Remember me checked');
        }
      } catch {
        // Ignore if not available
      }

      // Random delay before submit (human-like)
      await this.randomDelay(500, 1500);

      // Click submit button
      const submitButton = await this.page.waitForSelector(SELECTORS.login.submitButton, { timeout: 5000 });
      if (!submitButton) throw new Error('Submit button not found');
      
      await submitButton.click();
      
      this.logger.debug('Login form submitted');

      // Wait for navigation or error
      await Promise.race([
        this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
        this.page.waitForSelector(SELECTORS.login.errorMessage, { timeout: 30000 }),
        this.page.waitForSelector(SELECTORS.login.successIndicator, { timeout: 30000 })
      ]);

      // Check for login error
      const errorElement = await this.page.$(SELECTORS.login.errorMessage);
      if (errorElement) {
        const errorText = await errorElement.textContent();
        this.logger.error({ error: errorText }, 'Login failed with error');
        return false;
      }

      // Verify login success
      const success = await this.checkIfLoggedIn();
      if (success) {
        this.logger.info('Login successful');
        return true;
      }

      this.logger.error('Login verification failed');
      return false;

    } catch (error) {
      this.logger.error({ error: (error as Error).message }, 'Login flow failed');
      return false;
    }
  }

  private async checkIfLoggedIn(): Promise<boolean> {
    if (!this.page) return false;
    
    try {
      // Check for any success indicators
      const indicators = SELECTORS.login.successIndicator.split(', ');
      for (const indicator of indicators) {
        const element = await this.page.$(indicator);
        if (element) {
          return true;
        }
      }
      
      // Also check URL - if redirected to dashboard or work page
      const url = this.page.url();
      if (url.includes('/dashboard') || url.includes('/work') || url.includes('/solve')) {
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }

  private async handleCookieConsent(): Promise<void> {
    if (!this.page) return;
    
    try {
      const cookieBanner = await this.page.$(SELECTORS.common.cookieConsent);
      if (cookieBanner) {
        const acceptButton = await this.page.$(SELECTORS.common.acceptCookies);
        if (acceptButton) {
          await acceptButton.click();
          await this.randomDelay(500, 1000);
          this.logger.debug('Cookie consent accepted');
        }
      }
    } catch {
      // Ignore cookie consent errors
    }
  }

  // ============================================================================
  // WORK PAGE NAVIGATION
  // ============================================================================

  private async navigateToWorkPage(): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized');

    this.logger.info('Navigating to work page...');

    try {
      // Try main work URL first
      await this.page.goto(SELECTORS.work.page, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Check if we're on the work page
      let onWorkPage = await this.isOnWorkPage();
      
      // If not, try alternative URLs
      if (!onWorkPage) {
        for (const altUrl of SELECTORS.work.alternativePages) {
          this.logger.debug({ url: altUrl }, 'Trying alternative work URL');
          
          await this.page.goto(altUrl, { 
            waitUntil: 'networkidle',
            timeout: 20000 
          });
          
          onWorkPage = await this.isOnWorkPage();
          if (onWorkPage) break;
        }
      }

      if (!onWorkPage) {
        this.logger.error('Could not find work page');
        return false;
      }

      // Look for and click "Start Work" button if present
      try {
        const startButton = await this.page.$(SELECTORS.work.startWorkButton);
        if (startButton) {
          await startButton.click();
          await this.randomDelay(1000, 2000);
          this.logger.info('Clicked Start Work button');
        }
      } catch {
        // Start button might not be needed
      }

      this.logger.info('Successfully navigated to work page');
      return true;

    } catch (error) {
      this.logger.error({ error: (error as Error).message }, 'Failed to navigate to work page');
      return false;
    }
  }

  private async isOnWorkPage(): Promise<boolean> {
    if (!this.page) return false;
    
    // Check URL
    const url = this.page.url();
    if (url.includes('/work') || url.includes('/solve') || url.includes('/captcha')) {
      return true;
    }
    
    // Check for work page elements
    try {
      const workContainer = await this.page.$(SELECTORS.work.captchaContainer);
      const answerInput = await this.page.$(SELECTORS.work.answerInput);
      return !!(workContainer || answerInput);
    } catch {
      return false;
    }
  }

  // ============================================================================
  // CAPTCHA SOLVING LOOP
  // ============================================================================

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Worker already running');
      return;
    }

    this.isRunning = true;
    this.stats.startTime = Date.now();

    this.logger.info({
      sessionId: this.stats.sessionId,
      email: this.maskEmail(this.config.email)
    }, 'Starting Kolotibablo worker');

    try {
      // Connect browser
      await this.connectBrowser();

      // Login
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        throw new Error('Login failed');
      }

      // Navigate to work page
      const navSuccess = await this.navigateToWorkPage();
      if (!navSuccess) {
        throw new Error('Failed to navigate to work page');
      }

      // Start solving loop
      await this.solvingLoop();

    } catch (error) {
      this.logger.error({ error: (error as Error).message }, 'Worker startup failed');
      throw error;
    }
  }

  private async solvingLoop(): Promise<void> {
    this.logger.info('Starting CAPTCHA solving loop...');

    while (this.isRunning) {
      if (this.isPaused) {
        await this.randomDelay(1000, 2000);
        continue;
      }

      try {
        // Wait for captcha to appear
        const hasCaptcha = await this.waitForCaptcha();
        
        if (!hasCaptcha) {
          this.logger.debug('No captcha available, waiting...');
          await this.randomDelay(2000, 5000);
          continue;
        }

        // Solve the captcha
        const result = await this.solveCaptcha();
        
        if (result.success) {
          this.updateStatsOnSuccess(result);
        } else if (result.error === 'skipped') {
          this.stats.totalSkipped++;
          this.stats.currentStreak = 0;
        } else {
          this.updateStatsOnFailure(result);
        }

        // Random delay between solves (human-like behavior)
        const delay = this.randomInt(
          this.config.delayBetweenSolves.min,
          this.config.delayBetweenSolves.max
        );
        await this.randomDelay(delay, delay + 500);

      } catch (error) {
        this.logger.error({ error: (error as Error).message }, 'Error in solving loop');
        
        // Check if page is still valid
        if (!this.page || this.page.isClosed()) {
          this.logger.warn('Page closed, attempting to reconnect...');
          await this.reconnect();
        }
        
        await this.randomDelay(2000, 4000);
      }
    }
  }

  private async waitForCaptcha(): Promise<boolean> {
    if (!this.page) return false;

    try {
      // Wait for captcha image or container
      await this.page.waitForSelector(
        `${SELECTORS.work.captchaImage}, ${SELECTORS.work.captchaCanvas}`,
        { timeout: this.config.solveTimeout }
      );
      
      return true;
    } catch {
      // Check if "no captcha" message is shown
      const noCaptcha = await this.page.$(SELECTORS.work.noCaptchaMessage);
      if (noCaptcha) {
        this.logger.debug('No captchas available message detected');
      }
      return false;
    }
  }

  private async solveCaptcha(): Promise<SolveResult> {
    if (!this.page) throw new Error('Page not initialized');

    const startTime = Date.now();
    
    try {
      // Get captcha image
      const imageBase64 = await this.getCaptchaImage();
      if (!imageBase64) {
        return {
          success: false,
          answer: '',
          confidence: 0,
          captchaType: 'unknown',
          solveTimeMs: Date.now() - startTime,
          error: 'Failed to capture captcha image'
        };
      }

      // Get instructions if available
      const instructions = await this.getCaptchaInstructions();

      // Detect captcha type
      const captchaType = await this.detectCaptchaType();

      // Send to solver
      const solverResult = await this.callSolver(imageBase64, captchaType, instructions);
      
      this.logger.debug({
        captchaType,
        confidence: solverResult.confidence,
        answer: solverResult.answer?.substring(0, 10) + '...'
      }, 'Solver result received');

      // Check confidence threshold
      if (solverResult.confidence < this.config.confidenceThreshold) {
        this.logger.info({
          confidence: solverResult.confidence,
          threshold: this.config.confidenceThreshold
        }, 'Confidence below threshold, skipping');
        
        await this.skipCaptcha();
        
        return {
          success: false,
          answer: solverResult.answer,
          confidence: solverResult.confidence,
          captchaType,
          solveTimeMs: Date.now() - startTime,
          error: 'skipped'
        };
      }

      // Submit answer
      const submitSuccess = await this.submitAnswer(solverResult.answer);
      
      // Check result
      const isCorrect = await this.checkSubmissionResult();

      return {
        success: isCorrect,
        answer: solverResult.answer,
        confidence: solverResult.confidence,
        captchaType,
        solveTimeMs: Date.now() - startTime,
        error: isCorrect ? undefined : 'Wrong answer'
      };

    } catch (error) {
      return {
        success: false,
        answer: '',
        confidence: 0,
        captchaType: 'unknown',
        solveTimeMs: Date.now() - startTime,
        error: (error as Error).message
      };
    }
  }

  private async getCaptchaImage(): Promise<string | null> {
    if (!this.page) return null;

    try {
      // Try to find captcha image element
      let imageElement = await this.page.$(SELECTORS.work.captchaImage);
      
      // If not found, try canvas
      if (!imageElement) {
        const canvas = await this.page.$(SELECTORS.work.captchaCanvas);
        if (canvas) {
          // Convert canvas to base64
          const dataUrl = await this.page.evaluate((sel) => {
            const canvas = document.querySelector(sel) as HTMLCanvasElement;
            return canvas ? canvas.toDataURL('image/png') : null;
          }, SELECTORS.work.captchaCanvas);
          
          if (dataUrl) {
            return dataUrl.replace(/^data:image\/\w+;base64,/, '');
          }
        }
        return null;
      }

      // Screenshot the element
      const screenshot = await imageElement.screenshot({ type: 'png' });
      return screenshot.toString('base64');

    } catch (error) {
      this.logger.error({ error: (error as Error).message }, 'Failed to capture captcha image');
      return null;
    }
  }

  private async getCaptchaInstructions(): Promise<string> {
    if (!this.page) return '';

    try {
      const instructionsEl = await this.page.$(SELECTORS.work.instructions);
      if (instructionsEl) {
        return (await instructionsEl.textContent()) || '';
      }
    } catch {
      // Ignore
    }
    
    return '';
  }

  private async detectCaptchaType(): Promise<string> {
    if (!this.page) return 'text';

    try {
      // Check for explicit type indicator
      const typeElement = await this.page.$(SELECTORS.work.captchaType);
      if (typeElement) {
        const typeText = await typeElement.textContent();
        if (typeText) {
          const lower = typeText.toLowerCase();
          if (lower.includes('slider') || lower.includes('slide')) return 'slider';
          if (lower.includes('click') || lower.includes('select')) return 'click';
          if (lower.includes('math') || lower.includes('calculate')) return 'math';
          if (lower.includes('audio') || lower.includes('sound')) return 'audio';
        }
      }

      // Check for slider elements
      const hasSlider = await this.page.$(SELECTORS.work.sliderTrack);
      if (hasSlider) return 'slider';

      // Default to text
      return 'text';
    } catch {
      return 'text';
    }
  }

  private async callSolver(
    imageBase64: string,
    captchaType: string,
    instructions: string
  ): Promise<{ answer: string; confidence: number }> {
    try {
      // First classify the captcha
      const classifyResponse = await axios.post(
        `${this.config.captchaSolverUrl}/api/classify`,
        { image_base64: imageBase64 },
        { timeout: 10000 }
      );

      const detectedType = classifyResponse.data.captcha_type || captchaType;

      // Then solve based on type
      const solveEndpoint = this.getSolveEndpoint(detectedType);
      
      const solveResponse = await axios.post(
        `${this.config.captchaSolverUrl}${solveEndpoint}`,
        {
          image_base64: imageBase64,
          instructions,
          captcha_type: detectedType
        },
        { timeout: 30000 }
      );

      return {
        answer: solveResponse.data.answer || solveResponse.data.text || '',
        confidence: solveResponse.data.confidence || 0.5
      };

    } catch (error) {
      this.logger.error({ error: (error as Error).message }, 'Solver API call failed');
      return { answer: '', confidence: 0 };
    }
  }

  private getSolveEndpoint(captchaType: string): string {
    switch (captchaType) {
      case 'text':
        return '/api/solve/text';
      case 'slider':
        return '/api/solve/slider';
      case 'click':
        return '/api/solve/click';
      case 'math':
        return '/api/solve/math';
      case 'audio':
        return '/api/solve/audio';
      default:
        return '/api/solve/text';
    }
  }

  private async submitAnswer(answer: string): Promise<boolean> {
    if (!this.page) return false;

    try {
      // Find answer input
      const answerInput = await this.page.waitForSelector(SELECTORS.work.answerInput, { timeout: 5000 });
      if (!answerInput) {
        this.logger.error('Answer input not found');
        return false;
      }

      // Clear and type answer with human-like delays
      await answerInput.click({ clickCount: 3 }); // Select all
      await this.typeHumanLike(answer);

      // Small delay before submit
      await this.randomDelay(200, 500);

      // Find and click submit
      const submitButton = await this.page.$(SELECTORS.work.submitButton);
      if (submitButton) {
        await submitButton.click();
      } else {
        // Try pressing Enter
        await this.page.keyboard.press('Enter');
      }

      this.logger.debug({ answer: answer.substring(0, 10) + '...' }, 'Answer submitted');
      return true;

    } catch (error) {
      this.logger.error({ error: (error as Error).message }, 'Failed to submit answer');
      return false;
    }
  }

  private async skipCaptcha(): Promise<void> {
    if (!this.page) return;

    try {
      const skipButton = await this.page.$(SELECTORS.work.skipButton);
      if (skipButton) {
        await skipButton.click();
        this.logger.debug('Captcha skipped');
      }
    } catch {
      // Ignore skip errors
    }
  }

  private async checkSubmissionResult(): Promise<boolean> {
    if (!this.page) return false;

    try {
      // Wait for result indicator
      await Promise.race([
        this.page.waitForSelector(SELECTORS.work.successMessage, { timeout: 5000 }),
        this.page.waitForSelector(SELECTORS.work.wrongAnswerMessage, { timeout: 5000 }),
        this.page.waitForSelector(SELECTORS.work.errorMessage, { timeout: 5000 })
      ]);

      // Check for success
      const success = await this.page.$(SELECTORS.work.successMessage);
      if (success) return true;

      // Check for wrong answer
      const wrong = await this.page.$(SELECTORS.work.wrongAnswerMessage);
      if (wrong) return false;

      // Check for error
      const error = await this.page.$(SELECTORS.work.errorMessage);
      if (error) return false;

      // If no clear indicator, assume success (captcha probably changed)
      return true;

    } catch {
      // Timeout - assume we moved to next captcha (success)
      return true;
    }
  }

  // ============================================================================
  // STATISTICS
  // ============================================================================

  private updateStatsOnSuccess(result: SolveResult): void {
    this.stats.totalSolved++;
    this.stats.currentStreak++;
    this.stats.lastSolveTime = Date.now();
    
    if (this.stats.currentStreak > this.stats.bestStreak) {
      this.stats.bestStreak = this.stats.currentStreak;
    }

    // Update type breakdown
    if (!this.stats.captchaTypeBreakdown[result.captchaType]) {
      this.stats.captchaTypeBreakdown[result.captchaType] = { solved: 0, failed: 0 };
    }
    this.stats.captchaTypeBreakdown[result.captchaType].solved++;

    // Update average solve time
    const totalSolves = this.stats.totalSolved + this.stats.totalFailed;
    this.stats.averageSolveTimeMs = (
      (this.stats.averageSolveTimeMs * (totalSolves - 1) + result.solveTimeMs) / totalSolves
    );

    this.logger.info({
      totalSolved: this.stats.totalSolved,
      streak: this.stats.currentStreak,
      avgTime: Math.round(this.stats.averageSolveTimeMs),
      captchaType: result.captchaType
    }, 'CAPTCHA solved successfully');
  }

  private updateStatsOnFailure(result: SolveResult): void {
    this.stats.totalFailed++;
    this.stats.currentStreak = 0;

    // Update type breakdown
    if (!this.stats.captchaTypeBreakdown[result.captchaType]) {
      this.stats.captchaTypeBreakdown[result.captchaType] = { solved: 0, failed: 0 };
    }
    this.stats.captchaTypeBreakdown[result.captchaType].failed++;

    this.logger.warn({
      totalFailed: this.stats.totalFailed,
      error: result.error,
      captchaType: result.captchaType
    }, 'CAPTCHA solve failed');
  }

  async getStats(): Promise<WorkerStats> {
    // Try to update earnings from page
    await this.updateEarningsFromPage();
    return { ...this.stats };
  }

  private async updateEarningsFromPage(): Promise<void> {
    if (!this.page) return;

    try {
      const balanceEl = await this.page.$(SELECTORS.work.balanceDisplay);
      if (balanceEl) {
        const balanceText = await balanceEl.textContent();
        if (balanceText) {
          // Extract number from text (e.g., "$1.25" -> 125 cents)
          const match = balanceText.match(/[\d.]+/);
          if (match) {
            const dollars = parseFloat(match[0]);
            this.stats.totalEarnedCents = Math.round(dollars * 100);
          }
        }
      }
    } catch {
      // Ignore errors
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async typeHumanLike(text: string): Promise<void> {
    if (!this.page) return;
    
    for (const char of text) {
      await this.page.keyboard.type(char, { delay: this.randomInt(50, 150) });
    }
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private async randomDelay(min: number, max: number): Promise<void> {
    const delay = this.randomInt(min, max);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private async reconnect(): Promise<void> {
    this.logger.info('Attempting to reconnect...');
    
    await this.cleanup();
    await this.randomDelay(2000, 5000);
    
    try {
      await this.connectBrowser();
      const loginSuccess = await this.login();
      if (loginSuccess) {
        await this.navigateToWorkPage();
      }
    } catch (error) {
      this.logger.error({ error: (error as Error).message }, 'Reconnection failed');
    }
  }

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  pause(): void {
    this.isPaused = true;
    this.logger.info('Worker paused');
  }

  resume(): void {
    this.isPaused = false;
    this.logger.info('Worker resumed');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.logger.info({
      stats: this.stats
    }, 'Stopping worker...');
    
    await this.cleanup();
  }

  private async cleanup(): Promise<void> {
    if (this.page && !this.page.isClosed()) {
      await this.page.close().catch(() => {});
    }
    if (this.context) {
      await this.context.close().catch(() => {});
    }
    if (this.browser) {
      await this.browser.close().catch(() => {});
    }
    
    this.page = undefined;
    this.context = undefined;
    this.browser = undefined;
  }
}

// ============================================================================
// STANDALONE RUNNER
// ============================================================================

if (require.main === module) {
  const worker = new KolotibabloWorker({
    email: process.env.KOLOTIBABLO_WORKER_EMAIL || process.env.USERNAME || '',
    password: process.env.KOLOTIBABLO_WORKER_PASSWORD || process.env.PASSWORD || ''
  });

  // Handle shutdown
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down...');
    await worker.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down...');
    await worker.stop();
    process.exit(0);
  });

  // Start worker
  worker.start().catch((error) => {
    console.error('Worker failed to start:', error);
    process.exit(1);
  });
}
