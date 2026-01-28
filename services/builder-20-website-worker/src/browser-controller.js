/**
 * Browser Controller - Steel Browser CDP Integration
 * Manages browser sessions with stealth capabilities
 * 
 * Uses Steel Browser for anti-detection:
 * - Fingerprint randomization
 * - Proxy rotation
 * - Human-like behavior
 */

const puppeteer = require('puppeteer-core');

class BrowserController {
  constructor(logger) {
    this.logger = logger || console;
    this.sessions = new Map();
    this.steelUrl = process.env.STEEL_CDP_URL || 'ws://zimmer-05-steel-tarnkappe:3000';
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
    ];
  }

  async init() {
    this.logger.info({ steelUrl: this.steelUrl }, '🔗 BrowserController initialized');
  }

  async createSession(options = {}) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    try {
      const browser = await puppeteer.connect({
        browserWSEndpoint: this.steelUrl,
        defaultViewport: {
          width: options.width || 1920,
          height: options.height || 1080
        }
      });

      const context = await browser.createIncognitoBrowserContext();
      
      const session = {
        id: sessionId,
        browser,
        context,
        pages: [],
        createdAt: new Date(),
        platform: options.platform || 'generic',
        stealth: options.stealth !== false,
        userAgent: this.getRandomUserAgent()
      };

      this.sessions.set(sessionId, session);
      
      this.logger.info({ sessionId, platform: session.platform }, '🌐 Browser session created');
      
      return {
        id: sessionId,
        newPage: async () => this.createPage(sessionId),
        close: async () => this.closeSession(sessionId)
      };

    } catch (error) {
      this.logger.error({ error: error.message }, '❌ Failed to create browser session');
      throw error;
    }
  }

  async createPage(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const page = await session.context.newPage();
    
    // Apply stealth settings
    if (session.stealth) {
      await this.applyStealthSettings(page, session);
    }

    session.pages.push(page);
    
    return page;
  }

  async applyStealthSettings(page, session) {
    // Set user agent
    await page.setUserAgent(session.userAgent);

    // Set extra headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1'
    });

    // Override navigator properties
    await page.evaluateOnNewDocument(() => {
      // Hide webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });

      // Chrome runtime
      window.chrome = {
        runtime: {}
      };

      // Permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['de-DE', 'de', 'en-US', 'en']
      });

      // Platform
      Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32'
      });

      // Hardware concurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8
      });

      // Device memory
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8
      });

      // Plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [
          { name: 'Chrome PDF Plugin', description: 'Portable Document Format' },
          { name: 'Chrome PDF Viewer', description: '' },
          { name: 'Native Client', description: '' }
        ]
      });
    });

    // Set viewport with realistic dimensions
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      hasTouch: false,
      isLandscape: true,
      isMobile: false
    });

    this.logger.debug({ sessionId: session.id }, '🛡️ Stealth settings applied');
  }

  async closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    try {
      // Close all pages
      for (const page of session.pages) {
        await page.close().catch(() => {});
      }

      // Close context
      await session.context.close().catch(() => {});
      
      // Disconnect browser
      await session.browser.disconnect().catch(() => {});

      this.sessions.delete(sessionId);
      
      this.logger.info({ sessionId }, '🔴 Browser session closed');
      
      return { success: true };
    } catch (error) {
      this.logger.error({ sessionId, error: error.message }, '❌ Error closing session');
      this.sessions.delete(sessionId);
      return { success: false, error: error.message };
    }
  }

  async listSessions() {
    return Array.from(this.sessions.entries()).map(([id, session]) => ({
      id,
      platform: session.platform,
      createdAt: session.createdAt,
      pageCount: session.pages.length,
      stealth: session.stealth
    }));
  }

  async takeScreenshot(url, sessionId = null) {
    let session;
    let shouldClose = false;

    if (sessionId) {
      session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }
    } else {
      session = await this.createSession({ stealth: true });
      shouldClose = true;
    }

    try {
      const page = await this.createPage(session.id || sessionId);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const screenshot = await page.screenshot({
        encoding: 'base64',
        type: 'jpeg',
        quality: 80
      });

      return screenshot;
    } finally {
      if (shouldClose) {
        await this.closeSession(session.id);
      }
    }
  }

  async fillForm(url, formData, sessionId = null) {
    let session;
    let shouldClose = false;

    if (sessionId) {
      session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }
    } else {
      session = await this.createSession({ stealth: true });
      shouldClose = true;
    }

    try {
      const page = await this.createPage(session.id || sessionId);
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      for (const [selector, value] of Object.entries(formData)) {
        const element = await page.$(selector);
        if (element) {
          await element.type(value, { delay: Math.random() * 50 + 30 });
          await this.humanDelay(200, 500);
        }
      }

      return {
        success: true,
        url: page.url(),
        fieldsCompleted: Object.keys(formData).length
      };
    } finally {
      if (shouldClose) {
        await this.closeSession(session.id);
      }
    }
  }

  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  async humanDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  async cleanup() {
    this.logger.info('🧹 Cleaning up all browser sessions...');
    
    for (const [sessionId] of this.sessions) {
      await this.closeSession(sessionId);
    }
  }
}

module.exports = { BrowserController };
