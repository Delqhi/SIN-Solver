/**
 * Website Worker Orchestrator
 * Manages task processing and worker lifecycle
 * 
 * Integrates with:
 * - Steel Browser (CDP) for stealth browsing
 * - Redis for task persistence
 * - Captcha Worker (port 8019) for captcha solving
 * - ClawdBot (port 8080) for notifications
 */

const { BrowserController } = require('./browser-controller');
const { CaptchaBridge } = require('./captcha-bridge');
const { NotificationHandler } = require('./notification-handler');
const { getPlatformConfig, getSupportedPlatforms } = require('./platforms');

class WebsiteOrchestrator {
  constructor(taskQueue, redis, logger) {
    this.taskQueue = taskQueue;
    this.redis = redis;
    this.logger = logger;
    this.browserController = new BrowserController(logger);
    this.captchaBridge = new CaptchaBridge(logger);
    this.notificationHandler = new NotificationHandler(logger);
    
    this.isRunning = false;
    this.currentTask = null;
    this.workerLoop = null;
    
    this.stats = {
      tasksCompleted: 0,
      tasksFailed: 0,
      captchasSolved: 0,
      screenshotsTaken: 0,
      startedAt: null,
      lastTaskAt: null
    };
  }

  async init() {
    await this.browserController.init();
    await this.captchaBridge.init();
    await this.notificationHandler.init();
    this.logger.info('🚀 WebsiteOrchestrator initialized');
  }

  async startWorkerLoop(config = {}) {
    if (this.isRunning) {
      return { success: false, error: 'Worker loop already running' };
    }

    this.isRunning = true;
    this.stats.startedAt = new Date();
    this.logger.info('🔄 Worker loop started');

    this.workerLoop = this.runLoop(config);
    
    return { 
      success: true, 
      message: 'Worker loop started',
      platforms: getSupportedPlatforms()
    };
  }

  async stopWorkerLoop() {
    if (!this.isRunning) {
      return { success: false, error: 'Worker loop not running' };
    }

    this.isRunning = false;
    this.logger.info('🛑 Worker loop stopping...');
    
    // Wait for current task to complete
    if (this.currentTask) {
      this.logger.info(`⏳ Waiting for current task: ${this.currentTask.id}`);
    }

    return { 
      success: true, 
      message: 'Worker loop stopped',
      stats: this.getStats()
    };
  }

  async runLoop(config) {
    const pollInterval = config.pollInterval || 5000;
    const maxConcurrent = config.maxConcurrent || 1;

    while (this.isRunning) {
      try {
        // Get next task from queue
        const task = await this.taskQueue.getNextTask();
        
        if (!task) {
          await this.delay(pollInterval);
          continue;
        }

        this.currentTask = task;
        this.logger.info({ taskId: task.id, platform: task.platform }, '📋 Processing task');

        try {
          const result = await this.processTask(task);
          
          task.status = 'completed';
          task.result = result;
          task.completedAt = new Date().toISOString();
          
          await this.taskQueue.updateTask(task.id, task);
          await this.notificationHandler.notifySuccess(task);
          
          this.stats.tasksCompleted++;
          this.stats.lastTaskAt = new Date();
          
          this.logger.info({ taskId: task.id }, '✅ Task completed');
        } catch (error) {
          task.status = 'failed';
          task.error = error.message;
          task.completedAt = new Date().toISOString();
          
          await this.taskQueue.updateTask(task.id, task);
          await this.notificationHandler.notifyFailure(task);
          
          this.stats.tasksFailed++;
          
          this.logger.error({ taskId: task.id, error: error.message }, '❌ Task failed');
        }

        this.currentTask = null;

        // Human-like delay between tasks
        await this.delay(this.randomDelay(2000, 5000));

      } catch (error) {
        this.logger.error({ error: error.message }, 'Worker loop error');
        await this.delay(pollInterval);
      }
    }
  }

  async processTask(task) {
    const platform = getPlatformConfig(task.platform);
    
    if (!platform) {
      throw new Error(`Unsupported platform: ${task.platform}`);
    }

    switch (task.action) {
      case 'check_surveys':
        return await this.checkSurveys(task, platform);
      
      case 'login':
        return await this.loginToPlatform(task, platform);
      
      case 'scrape':
        return await this.scrapePage(task);
      
      case 'fill_form':
        return await this.fillForm(task);
      
      case 'screenshot':
        return await this.takeScreenshot(task);
      
      case 'complete_survey':
        return await this.completeSurvey(task, platform);
      
      default:
        throw new Error(`Unknown action: ${task.action}`);
    }
  }

  async checkSurveys(task, platform) {
    const session = await this.browserController.createSession({
      platform: task.platform,
      stealth: true
    });

    try {
      const page = await session.newPage();
      
      // Load cookies if available
      if (task.cookies) {
        await page.setCookies(task.cookies);
      }

      await page.goto(platform.dashboardUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Check for captcha
      const captcha = await this.captchaBridge.detectCaptcha(page);
      if (captcha) {
        this.logger.info({ type: captcha.type }, '🔓 Captcha detected');
        const solved = await this.captchaBridge.solveCaptcha(page, captcha);
        if (solved) {
          this.stats.captchasSolved++;
        }
      }

      // Find surveys
      const surveySelector = platform.selectors.surveys || platform.selectors.studies || platform.selectors.jobs;
      const surveys = await page.$$(surveySelector);
      
      const surveyData = await Promise.all(surveys.slice(0, 20).map(async (el, i) => ({
        index: i,
        text: await el.evaluate(e => e.textContent?.trim()),
        href: await el.evaluate(e => e.href || e.querySelector('a')?.href || null)
      })));

      return {
        platform: task.platform,
        surveyCount: surveys.length,
        surveys: surveyData,
        timestamp: new Date().toISOString()
      };

    } finally {
      await this.browserController.closeSession(session.id);
    }
  }

  async loginToPlatform(task, platform) {
    if (!task.credentials?.email || !task.credentials?.password) {
      throw new Error('Credentials required for login');
    }

    const session = await this.browserController.createSession({
      platform: task.platform,
      stealth: true
    });

    try {
      const page = await session.newPage();
      
      await page.goto(platform.loginUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Human-like typing
      await page.type(platform.selectors.email, task.credentials.email, { delay: this.randomDelay(30, 80) });
      await this.delay(this.randomDelay(500, 1500));
      await page.type(platform.selectors.password, task.credentials.password, { delay: this.randomDelay(30, 80) });

      // Check for captcha before submit
      const captcha = await this.captchaBridge.detectCaptcha(page);
      if (captcha) {
        this.logger.info({ type: captcha.type }, '🔓 Login captcha detected');
        await this.captchaBridge.solveCaptcha(page, captcha);
        this.stats.captchasSolved++;
      }

      // Submit and wait for navigation
      await Promise.all([
        page.click(platform.selectors.submit),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 })
      ]);

      // Get cookies for persistence
      const cookies = await page.cookies();
      
      // Store cookies in Redis
      await this.redis.set(
        `cookies:${task.platform}:${task.credentials.email}`,
        JSON.stringify(cookies),
        'EX',
        86400 * 30 // 30 days
      );

      return {
        success: true,
        platform: task.platform,
        cookieCount: cookies.length,
        expiresAt: new Date(Date.now() + 86400000 * 30).toISOString()
      };

    } finally {
      await this.browserController.closeSession(session.id);
    }
  }

  async scrapePage(task) {
    if (!task.url) {
      throw new Error('URL required for scraping');
    }

    const session = await this.browserController.createSession({ stealth: true });

    try {
      const page = await session.newPage();
      
      await page.goto(task.url, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await this.delay(task.waitFor || 2000);

      const result = {
        url: page.url(),
        title: await page.title(),
        data: {}
      };

      if (task.selectors) {
        for (const [key, selector] of Object.entries(task.selectors)) {
          try {
            const elements = await page.$$(selector);
            result.data[key] = await Promise.all(elements.map(async el => ({
              text: await el.evaluate(e => e.textContent?.trim()),
              href: await el.evaluate(e => e.href || null)
            })));
          } catch (e) {
            result.data[key] = [];
          }
        }
      }

      if (task.includeScreenshot) {
        result.screenshot = await page.screenshot({ 
          encoding: 'base64', 
          type: 'jpeg', 
          quality: 60 
        });
        this.stats.screenshotsTaken++;
      }

      return result;

    } finally {
      await this.browserController.closeSession(session.id);
    }
  }

  async fillForm(task) {
    if (!task.url || !task.formData) {
      throw new Error('URL and formData required');
    }

    const session = await this.browserController.createSession({ stealth: true });

    try {
      const page = await session.newPage();
      
      await page.goto(task.url, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      for (const [selector, value] of Object.entries(task.formData)) {
        const element = await page.$(selector);
        if (element) {
          const tagName = await element.evaluate(e => e.tagName.toLowerCase());
          const inputType = await element.evaluate(e => e.type?.toLowerCase());

          if (tagName === 'select') {
            await element.select(value);
          } else if (inputType === 'checkbox' || inputType === 'radio') {
            if (value) await element.click();
          } else {
            await element.type(value, { delay: this.randomDelay(30, 60) });
          }

          await this.delay(this.randomDelay(200, 500));
        }
      }

      if (task.submitSelector) {
        await page.click(task.submitSelector);
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
      }

      return {
        success: true,
        url: page.url(),
        fieldsCompleted: Object.keys(task.formData).length
      };

    } finally {
      await this.browserController.closeSession(session.id);
    }
  }

  async takeScreenshot(task) {
    if (!task.url) {
      throw new Error('URL required for screenshot');
    }

    const session = await this.browserController.createSession({ stealth: true });

    try {
      const page = await session.newPage();
      
      await page.goto(task.url, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await this.delay(task.waitFor || 2000);

      const screenshot = await page.screenshot({
        encoding: 'base64',
        type: task.format || 'jpeg',
        quality: task.quality || 80,
        fullPage: task.fullPage || false
      });

      this.stats.screenshotsTaken++;

      return {
        success: true,
        url: page.url(),
        screenshot,
        timestamp: new Date().toISOString()
      };

    } finally {
      await this.browserController.closeSession(session.id);
    }
  }

  async completeSurvey(task, platform) {
    // Complex survey completion - uses AI assistant from survey-worker pattern
    throw new Error('completeSurvey requires zimmer-18-survey-worker integration');
  }

  getStats() {
    return {
      ...this.stats,
      isRunning: this.isRunning,
      uptime: this.stats.startedAt 
        ? Date.now() - this.stats.startedAt.getTime() 
        : 0,
      currentTask: this.currentTask?.id || null
    };
  }

  getCurrentTask() {
    return this.currentTask;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

module.exports = { WebsiteOrchestrator };
