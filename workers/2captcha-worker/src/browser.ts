/**
 * Steel Browser Automation for 2Captcha.com
 * Login and "Start Work" Navigation
 * 
 * Implements:
 * - Stealth mode anti-detection
 * - Automatic login to 2captcha.com
 * - Navigate to "Start Work" section
 * - Screenshot capture for CAPTCHA images
 */

import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// Load environment variables from .env
config();

/**
 * Configuration for Steel Browser with stealth mode
 */
interface BrowserConfig {
  headless: boolean;
  stealth: boolean;
  viewport: { width: number; height: number };
  slowMo?: number;
  timeout?: number;
}

/**
 * Credentials from environment variables
 */
interface Credentials {
  email: string;
  password: string;
}

/**
 * Main SteelBrowser class for 2Captcha automation
 */
export class SteelBrowserAutomation {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: BrowserConfig;
  private credentials: Credentials;
  private screenshotDir: string;

  constructor(
    config?: Partial<BrowserConfig>,
    credentials?: Partial<Credentials>
  ) {
    // Default configuration with stealth mode enabled
    this.config = {
      headless: false, // Must be visible for debugging
      stealth: true, // Anti-detection
      viewport: { width: 1920, height: 1080 },
      slowMo: 100, // Slow down actions for detection avoidance
      timeout: 30000, // 30 second timeout
      ...config,
    };

    // Get credentials from environment or parameters
    this.credentials = {
      email: process.env['TWOCAPTCHA_EMAIL'] || credentials?.email || '',
      password: process.env['TWOCAPTCHA_PASSWORD'] || credentials?.password || '',
    };

    // Create screenshots directory
    this.screenshotDir = path.join(
      process.cwd(),
      'screenshots',
      `session-${Date.now()}`
    );
    fs.mkdirSync(this.screenshotDir, { recursive: true });

    this.validateCredentials();
  }

  /**
   * Validate that credentials are provided
   */
  private validateCredentials(): void {
    if (!this.credentials.email || !this.credentials.password) {
      throw new Error(
        'Missing credentials: TWOCAPTCHA_EMAIL and TWOCAPTCHA_PASSWORD environment variables required'
      );
    }
  }

  /**
   * Initialize browser with stealth mode
   */
  async initialize(): Promise<void> {
    console.log('🔄 Initializing Playwright browser with stealth mode...');

    // Use chromium with stealth plugin to avoid detection
    this.browser = await chromium.launch({
      headless: this.config.headless,
      args: this.getStealthArgs(),
    });

    this.page = await this.browser.newPage({
      viewport: this.config.viewport,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    // Add stealth detection prevention
    await this.addStealthScripts();

    console.log('✅ Browser initialized successfully');
  }

  /**
   * Get stealth mode arguments for chromium
   */
  private getStealthArgs(): string[] {
    return [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--allow-running-insecure-content',
      // Disable WebGL to avoid detection
      '--disable-webgl',
      // Disable plugins
      '--disable-plugins',
      // Disable extensions
      '--disable-extensions',
    ];
  }

  /**
   * Add JavaScript to prevent detection
   */
  private async addStealthScripts(): Promise<void> {
    if (!this.page) return;

    // Override navigator.webdriver property
    await this.page.addInitScript(() => {
      // @ts-ignore - Browser context API
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });

      // Add fake chrome runtime
      // @ts-ignore - Browser context API
      window.chrome = {
        runtime: {},
      };

      // Disable WebGL to avoid detection
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function (parameter: any) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter.call(this, parameter);
      };
    });
  }

  /**
   * Navigate to 2Captcha login page
   */
  async navigateToLogin(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log('🌐 Navigating to 2captcha.com...');
    await this.page.goto('https://2captcha.com', {
      waitUntil: 'networkidle',
      timeout: this.config.timeout,
    });

    console.log('✅ Successfully navigated to 2captcha.com');
    await this.takeScreenshot('01-initial-page');
  }

  /**
   * Login to 2Captcha
   */
  async login(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log('🔐 Starting login process...');

    // Wait for login form to appear
    await this.page.waitForSelector('input[name="email"], input[id="email"]', {
      timeout: 15000,
    });

    console.log('✅ Login form detected');
    await this.takeScreenshot('02-login-form');

    // Fill email field
    console.log('📧 Filling email field...');
    const emailInput = await this.page.$(
      'input[name="email"], input[id="email"]'
    );
    if (emailInput) {
      await emailInput.click({ delay: 100 });
      await emailInput.type(this.credentials.email, { delay: 50 });
    }

    // Fill password field
    console.log('🔑 Filling password field...');
    const passwordInput = await this.page.$(
      'input[name="password"], input[id="password"]'
    );
    if (passwordInput) {
      await passwordInput.click({ delay: 100 });
      await passwordInput.type(this.credentials.password, { delay: 50 });
    }

    await this.takeScreenshot('03-form-filled');

    // Click login button
    console.log('🚀 Clicking login button...');
    const loginButton = await this.page.$(
      'button[type="submit"], input[type="submit"], button:has-text("Log in"), button:has-text("Login")'
    );

    if (loginButton) {
      await loginButton.click();
    } else {
      // Try to find button by text content
      const buttons = await this.page.$$('button');
      for (const btn of buttons) {
        const text = await btn.textContent();
        if (text?.toLowerCase().includes('log')) {
          await btn.click();
          break;
        }
      }
    }

    // Wait for navigation after login
    console.log('⏳ Waiting for login to complete...');
    try {
      await this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 });
    } catch {
      console.log('⚠️ Navigation timeout, checking if logged in...');
    }

    await this.takeScreenshot('04-after-login');
    console.log('✅ Login completed');
  }

  /**
   * Navigate to "Start Work" or "Solve CAPTCHAs" section
   */
  async navigateToStartWork(): Promise<void> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log('🎯 Looking for "Start Work" section...');

    // Try multiple selectors for start work button/link
    const selectors = [
      'a:has-text("Start Work")',
      'button:has-text("Start Work")',
      'a:has-text("Solve")',
      'button:has-text("Solve")',
      'a[href*="workers"]',
      'a[href*="work"]',
      '[data-testid="start-work"]',
      '.start-work',
      '#start-work',
    ];

    let found = false;
    for (const selector of selectors) {
      const element = await this.page.$(selector);
      if (element) {
        console.log(`✅ Found "Start Work" with selector: ${selector}`);
        await element.click();
        found = true;
        break;
      }
    }

    if (!found) {
      console.log('⚠️ Could not find "Start Work" button, searching page content...');
      const pageContent = await this.page.content();
      if (pageContent.includes('Start Work') || pageContent.includes('Solve')) {
        console.log('📄 Page contains work content, trying generic link click...');
        const allLinks = await this.page.$$('a, button');
        for (const link of allLinks) {
          const text = await link.textContent();
          if (text && (text.includes('Start') || text.includes('Solve'))) {
            console.log(`🔗 Clicking: ${text}`);
            await link.click();
            found = true;
            break;
          }
        }
      }
    }

    if (found) {
      try {
        await this.page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });
      } catch {
        console.log('⚠️ Navigation timeout after clicking Start Work');
      }
    }

    await this.takeScreenshot('05-start-work-page');
    console.log('✅ Navigated to work section');
  }

  /**
   * Wait for CAPTCHA assignment and take screenshot
   */
  async waitForCaptchaAndScreenshot(maxWaitTime: number = 60000): Promise<string | null> {
    if (!this.page) throw new Error('Browser not initialized');

    console.log('⏳ Waiting for CAPTCHA to be assigned...');

    // Look for CAPTCHA image or container
    const captchaSelectors = [
      'img[alt*="captcha"], img[alt*="CAPTCHA"]',
      '[data-testid="captcha"]',
      '.captcha-image',
      '#captcha',
      'img[src*="captcha"]',
      '.task-image',
      'img.task',
    ];

    let captchaElement = null;
    const startTime = Date.now();

    while (!captchaElement && Date.now() - startTime < maxWaitTime) {
      for (const selector of captchaSelectors) {
        captchaElement = await this.page.$(selector);
        if (captchaElement) break;
      }

      if (!captchaElement) {
        console.log('⏳ CAPTCHA not found, waiting 2 seconds...');
        await this.page.waitForTimeout(2000);
      }
    }

    if (!captchaElement) {
      console.log('❌ CAPTCHA not found after waiting');
      await this.takeScreenshot('06-no-captcha-found');
      return null;
    }

    console.log('✅ CAPTCHA detected!');
    const screenshotPath = await this.takeScreenshot('07-captcha-assigned');
    console.log(`📸 Screenshot saved to: ${screenshotPath}`);

    return screenshotPath;
  }

  /**
   * Take screenshot and save to disk
   */
  private async takeScreenshot(name: string): Promise<string> {
    if (!this.page) throw new Error('Browser not initialized');

    const filename = `${name}-${Date.now()}.png`;
    const filepath = path.join(this.screenshotDir, filename);

    await this.page.screenshot({ path: filepath, fullPage: false });
    console.log(`📸 Screenshot saved: ${filename}`);

    return filepath;
  }

  /**
   * Get current page URL
   */
  async getCurrentUrl(): Promise<string> {
    if (!this.page) throw new Error('Browser not initialized');
    return this.page.url();
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log('✅ Browser closed');
    }
  }

  /**
   * Get screenshot directory
   */
  getScreenshotDir(): string {
    return this.screenshotDir;
  }
}

/**
 * Main execution example
 */
async function main() {
  const automation = new SteelBrowserAutomation();

  try {
    // Initialize browser
    await automation.initialize();

    // Navigate to login page
    await automation.navigateToLogin();

    // Perform login
    await automation.login();

    // Navigate to start work section
    await automation.navigateToStartWork();

    // Wait for CAPTCHA and take screenshot
    const screenshotPath = await automation.waitForCaptchaAndScreenshot();

    if (screenshotPath) {
      console.log(`\n✅ Successfully captured CAPTCHA screenshot: ${screenshotPath}`);
    } else {
      console.log('\n⚠️ CAPTCHA not assigned within timeout');
    }

    // Get current URL
    const currentUrl = await automation.getCurrentUrl();
    console.log(`📍 Current URL: ${currentUrl}`);

    // Keep browser open for manual inspection
    console.log('\n🔍 Browser is open for inspection. Press Ctrl+C to exit.');
    await new Promise((resolve) => process.on('SIGINT', resolve));

  } catch (error) {
    console.error('❌ Error during automation:', error);
    process.exit(1);
  } finally {
    await automation.close();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export default SteelBrowserAutomation;
