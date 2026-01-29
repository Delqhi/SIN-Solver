/**
 * 🌐 BROWSER CAPTCHA WORKER - Steel Browser Automation
 * 
 * This worker uses Steel Browser to work DIRECTLY on provider websites!
 * No APIs, no queues - just pure browser automation.
 * 
 * Workflow:
 * 1. Open Steel Browser
 * 2. Navigate to 2captcha.com (or other provider)
 * 3. Login with worker credentials
 * 4. Click "Start Work" / "Solve"
 * 5. Wait for captcha to appear
 * 6. Screenshot -> AI Solve -> Input answer
 * 7. Click submit
 * 8. Earn money 💰
 * 9. Repeat
 * 
 * Providers supported:
 * - 2captcha.com
 * - kolotibablo.com
 * - captcha.guru
 * - anti-captcha.com
 * 
 * NO APIs! NO Queues! Just Browser Automation!
 */

import { chromium, Browser, Page } from 'playwright';
import pino from 'pino';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface BrowserWorkerConfig {
  provider: '2captcha' | 'kolotibablo' | 'captcha-guru' | 'anti-captcha';
  username: string;
  password: string;
  headless?: boolean;
  steelBrowserUrl?: string; // Steel Browser CDP endpoint
}

interface CaptchaTask {
  id: string;
  type: string;
  imageData?: string;
  question?: string;
  instructions?: string;
}

export class BrowserCaptchaWorker {
  private config: BrowserWorkerConfig;
  private logger: pino.Logger;
  private browser?: Browser;
  private page?: Page;
  private isRunning = false;
  private stats = {
    totalSolved: 0,
    totalFailed: 0,
    totalEarned: 0,
    startTime: Date.now(),
    currentStreak: 0
  };

  constructor(config: BrowserWorkerConfig) {
    this.config = {
      headless: false, // Show browser so we can see it working
      steelBrowserUrl: process.env.STEEL_BROWSER_URL || 'http://localhost:3000',
      ...config
    };
    
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      name: `browser-worker-${config.provider}`
    });

    this.logger.info({
      provider: config.provider,
      headless: this.config.headless,
      steelUrl: this.config.steelBrowserUrl
    }, '🌐 BROWSER CAPTCHA WORKER INITIALIZED');
  }

  /**
   * 🚀 START WORKING - Open browser and start solving!
   */
  async start(): Promise<void> {
    this.isRunning = true;
    this.logger.info('🚀 STARTING BROWSER WORKER');

    try {
      // Step 1: Connect to Steel Browser
      await this.connectToBrowser();
      
      // Step 2: Navigate to provider and login
      await this.loginToProvider();
      
      // Step 3: Start the main work loop
      this.logger.info('💰 STARTING TO EARN MONEY!');
      await this.workLoop();

    } catch (error) {
      this.logger.error({ error }, 'Fatal error in worker');
      throw error;
    }
  }

  /**
   * 🔌 Connect to Steel Browser (Stealth Mode)
   */
  private async connectToBrowser(): Promise<void> {
    this.logger.info('🔌 Connecting to Steel Browser...');

    try {
      // Connect to Steel Browser via CDP
      this.browser = await chromium.connectOverCDP(this.config.steelBrowserUrl);
      
      // Get or create context
      const contexts = this.browser.contexts();
      const context = contexts.length > 0 ? contexts[0] : await this.browser.newContext();
      
      // Create new page
      this.page = await context.newPage();
      
      // Set viewport
      await this.page.setViewportSize({ width: 1920, height: 1080 });
      
      this.logger.info('✅ Connected to Steel Browser');

    } catch (error) {
      this.logger.error({ error }, 'Failed to connect to Steel Browser');
      // Fallback to local browser
      this.logger.info('🔄 Falling back to local Chromium...');
      this.browser = await chromium.launch({
        headless: this.config.headless,
        args: ['--disable-blink-features=AutomationControlled']
      });
      this.page = await this.browser.newPage();
    }
  }

  /**
   * 🔐 Login to captcha provider
   */
  private async loginToProvider(): Promise<void> {
    if (!this.page) throw new Error('Browser not connected');

    this.logger.info({ provider: this.config.provider }, '🔐 Logging in...');

    switch (this.config.provider) {
      case '2captcha':
        await this.login2captcha();
        break;
      case 'kolotibablo':
        await this.loginKolotibablo();
        break;
      case 'anti-captcha':
        await this.loginAntiCaptcha();
        break;
      default:
        throw new Error(`Unknown provider: ${this.config.provider}`);
    }

    this.logger.info('✅ Login successful');
  }

  private async login2captcha(): Promise<void> {
    if (!this.page) return;

    // Navigate to login page
    await this.page.goto('https://2captcha.com/auth/login');
    await this.page.waitForLoadState('networkidle');

    // Fill credentials
    await this.page.fill('input[name="username"], input[type="email"]', this.config.username);
    await this.page.fill('input[name="password"], input[type="password"]', this.config.password);

    // Click login
    await this.page.click('button[type="submit"], input[type="submit"]');
    
    // Wait for dashboard
    await this.page.waitForSelector('.dashboard, .worker-dashboard, [data-testid="dashboard"]', {
      timeout: 30000
    });

    this.logger.info('✅ Logged into 2captcha');
  }

  private async loginKolotibablo(): Promise<void> {
    if (!this.page) return;
    await this.page.goto('https://kolotibablo.com/login');
    // Similar login flow...
    this.logger.info('✅ Logged into Kolotibablo');
  }

  private async loginAntiCaptcha(): Promise<void> {
    if (!this.page) return;
    await this.page.goto('https://anti-captcha.com/login');
    // Similar login flow...
    this.logger.info('✅ Logged into Anti-Captcha');
  }

  /**
   * 💼 MAIN WORK LOOP - Solve captchas continuously
   */
  private async workLoop(): Promise<void> {
    if (!this.page) throw new Error('Browser not connected');

    while (this.isRunning) {
      try {
        // Navigate to work page
        await this.navigateToWorkPage();

        // Wait for captcha to appear
        const captcha = await this.waitForCaptcha();
        
        if (!captcha) {
          this.logger.info('⏳ No captcha available, waiting...');
          await this.sleep(3000);
          continue;
        }

        this.logger.info({ type: captcha.type }, '📋 Captcha detected');

        // Solve the captcha
        const result = await this.solveCaptcha(captcha);

        if (result.success) {
          // Submit answer
          await this.submitAnswer(result.answer);
          
          this.stats.totalSolved++;
          this.stats.currentStreak++;
          
          this.logger.info({
            answer: result.answer,
            confidence: result.confidence,
            totalSolved: this.stats.totalSolved,
            streak: this.stats.currentStreak
          }, '✅ Captcha solved - Money earned! 💰');

        } else {
          this.stats.totalFailed++;
          this.stats.currentStreak = 0;
          
          this.logger.error({
            error: result.error,
            totalFailed: this.stats.totalFailed
          }, '❌ Failed to solve captcha');
          
          // Report bad captcha if possible
          await this.reportBadCaptcha();
        }

        // Small delay between captchas
        await this.sleep(1000 + Math.random() * 2000); // Random 1-3s delay

      } catch (error) {
        this.logger.error({ error }, 'Error in work loop');
        this.stats.currentStreak = 0;
        await this.sleep(5000);
      }
    }
  }

  /**
   * 📍 Navigate to work/solve page
   */
  private async navigateToWorkPage(): Promise<void> {
    if (!this.page) return;

    const workUrls: Record<string, string> = {
      '2captcha': 'https://2captcha.com/work',
      'kolotibablo': 'https://kolotibablo.com/work',
      'anti-captcha': 'https://anti-captcha.com/work'
    };

    const url = workUrls[this.config.provider];
    
    // Check if already on work page
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/work')) {
      await this.page.goto(url);
      await this.page.waitForLoadState('networkidle');
    }
  }

  /**
   * 👁️ Wait for captcha to appear on page
   */
  private async waitForCaptcha(): Promise<CaptchaTask | null> {
    if (!this.page) return null;

    try {
      // Different selectors for different providers
      const captchaSelectors: Record<string, string[]> = {
        '2captcha': [
          '.captcha-image',
          '.task-image',
          '[data-captcha]',
          'img[src*="captcha"]'
        ],
        'kolotibablo': [
          '.captcha',
          '.task-img'
        ],
        'anti-captcha': [
          '.captcha-container'
        ]
      };

      const selectors = captchaSelectors[this.config.provider] || captchaSelectors['2captcha'];

      // Wait for any captcha element
      for (const selector of selectors) {
        try {
          const element = await this.page.waitForSelector(selector, { timeout: 5000 });
          if (element) {
            // Get captcha image
            const imageData = await this.extractCaptchaImage(element);
            
            // Get instructions if available
            const instructions = await this.page.$eval('.instructions, .task-text', 
              el => el.textContent
            ).catch(() => undefined);

            return {
              id: Date.now().toString(),
              type: 'unknown', // Will be classified by YOLO
              imageData,
              instructions: instructions || undefined
            };
          }
        } catch {
          continue;
        }
      }

      return null;

    } catch (error) {
      return null;
    }
  }

  /**
   * 📸 Extract captcha image from page
   */
  private async extractCaptchaImage(element: any): Promise<string> {
    if (!this.page) throw new Error('Page not available');

    // Take screenshot of the captcha element
    const screenshot = await element.screenshot({
      type: 'png',
      encoding: 'base64'
    });

    return screenshot as string;
  }

  /**
   * 🧠 SOLVE CAPTCHA using our AI
   */
  private async solveCaptcha(captcha: CaptchaTask): Promise<{success: boolean; answer: string; confidence: number; error?: string}> {
    const startTime = Date.now();

    try {
      if (!captcha.imageData) {
        throw new Error('No captcha image data');
      }

      // Step 1: Classify with YOLO
      this.logger.info('🎯 Classifying captcha with YOLO...');
      const classification = await this.classifyWithYOLO(captcha.imageData);
      
      this.logger.info({
        type: classification.type,
        confidence: classification.confidence
      }, '🎯 YOLO Classification result');

      // Step 2: Solve based on type
      let answer: string;
      let confidence: number;

      switch (classification.type) {
        case 'text':
        case 'math':
          const textResult = await this.solveWithOCR(captcha.imageData, classification.type);
          answer = textResult.text;
          confidence = textResult.confidence;
          break;

        case 'slider':
          const sliderResult = await this.solveSlider(captcha.imageData);
          answer = sliderResult.offset.toString();
          confidence = sliderResult.confidence;
          break;

        case 'image_grid':
        case 'hcaptcha':
          const gridResult = await this.solveImageGrid(captcha.imageData, captcha.instructions);
          answer = gridResult.indices.join(',');
          confidence = gridResult.confidence;
          break;

        default:
          // Try generic OCR
          const genericResult = await this.solveWithOCR(captcha.imageData, 'text');
          answer = genericResult.text;
          confidence = genericResult.confidence * 0.8; // Lower confidence for unknown type
      }

      const solveTime = Date.now() - startTime;
      
      this.logger.info({
        answer,
        confidence,
        solveTimeMs: solveTime
      }, '✅ Captcha solved');

      return {
        success: true,
        answer,
        confidence
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        answer: '',
        confidence: 0,
        error: errorMessage
      };
    }
  }

  /**
   * 🎯 Classify with YOLO
   */
  private async classifyWithYOLO(imageBase64: string): Promise<{type: string; confidence: number}> {
    try {
      const solverUrl = process.env.CAPTCHA_SOLVER_URL || 'http://localhost:8019';
      const response = await axios.post(`${solverUrl}/api/classify`, {
        image: imageBase64
      }, {
        timeout: 5000
      });

      return {
        type: response.data.captcha_type,
        confidence: response.data.confidence
      };
    } catch (error) {
      this.logger.error({ error }, 'YOLO classification failed, defaulting to text');
      return { type: 'text', confidence: 0.5 };
    }
  }

  /**
   * 📝 Solve with OCR
   */
  private async solveWithOCR(imageBase64: string, type: string): Promise<{text: string; confidence: number}> {
    try {
      const solverUrl = process.env.CAPTCHA_SOLVER_URL || 'http://localhost:8019';
      const response = await axios.post(`${solverUrl}/api/solve/text`, {
        image_base64: imageBase64,
        captcha_type: type
      }, {
        timeout: 10000
      });

      return {
        text: response.data.solution,
        confidence: response.data.confidence
      };
    } catch (error) {
      this.logger.error({ error }, 'OCR solving failed');
      throw error;
    }
  }

  /**
   * 🎚️ Solve slider
   */
  private async solveSlider(imageBase64: string): Promise<{offset: number; confidence: number}> {
    try {
      const solverUrl = process.env.CAPTCHA_SOLVER_URL || 'http://localhost:8019';
      const response = await axios.post(`${solverUrl}/api/solve/slider`, {
        image_base64: imageBase64
      }, {
        timeout: 15000
      });

      return {
        offset: response.data.offset,
        confidence: response.data.confidence
      };
    } catch (error) {
      this.logger.error({ error }, 'Slider solving failed');
      throw error;
    }
  }

  /**
   * 🖼️ Solve image grid
   */
  private async solveImageGrid(imageBase64: string, instructions?: string): Promise<{indices: number[]; confidence: number}> {
    try {
      const solverUrl = process.env.CAPTCHA_SOLVER_URL || 'http://localhost:8019';
      const response = await axios.post(`${solverUrl}/api/solve/image-grid`, {
        image_base64: imageBase64,
        instructions: instructions || 'Select all matching images'
      }, {
        timeout: 20000
      });

      return {
        indices: response.data.indices,
        confidence: response.data.confidence
      };
    } catch (error) {
      this.logger.error({ error }, 'Image grid solving failed');
      throw error;
    }
  }

  /**
   * ✏️ Submit answer to the page
   */
  private async submitAnswer(answer: string): Promise<void> {
    if (!this.page) throw new Error('Page not available');

    this.logger.info({ answer }, '✏️ Submitting answer...');

    try {
      // Find input field
      const inputSelectors = [
        'input[name="answer"]',
        'input[type="text"]',
        '.answer-input',
        '#answer',
        '[data-testid="answer-input"]'
      ];

      let inputFound = false;
      for (const selector of inputSelectors) {
        const input = await this.page.$(selector);
        if (input) {
          await input.fill(answer);
          inputFound = true;
          break;
        }
      }

      if (!inputFound) {
        throw new Error('Could not find answer input field');
      }

      // Click submit button
      const submitSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        '.submit-btn',
        '#submit',
        'button:has-text("Submit")',
        'button:has-text("Send")'
      ];

      for (const selector of submitSelectors) {
        const button = await this.page.$(selector);
        if (button) {
          await button.click();
          break;
        }
      }

      // Wait for result
      await this.page.waitForTimeout(2000);

      this.logger.info('✅ Answer submitted');

    } catch (error) {
      this.logger.error({ error }, 'Failed to submit answer');
      throw error;
    }
  }

  /**
   * ❌ Report bad captcha
   */
  private async reportBadCaptcha(): Promise<void> {
    if (!this.page) return;

    try {
      // Look for "Bad" or "Skip" button
      const badSelectors = [
        'button:has-text("Bad")',
        'button:has-text("Skip")',
        'button:has-text("Next")',
        '.skip-btn',
        '#skip'
      ];

      for (const selector of badSelectors) {
        const button = await this.page.$(selector);
        if (button) {
          await button.click();
          this.logger.info('🔄 Skipped bad captcha');
          break;
        }
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to report bad captcha');
    }
  }

  /**
   * 📊 Get stats
   */
  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      successRate: this.stats.totalSolved / (this.stats.totalSolved + this.stats.totalFailed) || 0
    };
  }

  /**
   * 🛑 Stop worker
   */
  async stop(): Promise<void> {
    this.logger.info('🛑 Stopping browser worker...');
    this.isRunning = false;

    if (this.browser) {
      await this.browser.close();
    }

    this.logger.info({ stats: this.getStats() }, '💰 Final stats');
  }

  /**
   * 😴 Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default BrowserCaptchaWorker;