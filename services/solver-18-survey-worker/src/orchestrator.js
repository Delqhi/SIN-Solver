const { chromium } = require('playwright');
const { CookieManager } = require('./cookie-manager');
const { ProxyRotator } = require('./proxy-rotator');
const { AIAssistant } = require('./ai-assistant');
const { CaptchaBridge } = require('./captcha-bridge');
const { getHandler, getSupportedPlatforms, getPlatformInfo } = require('./platform-handlers');
const winston = require('winston');
const Redis = require('redis');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

class SurveyOrchestrator {
  constructor() {
    this.activeWorkers = new Map();
    this.platformLocks = new Map();
    this.stats = {
      surveysCompleted: 0,
      surveysAttempted: 0,
      captchasSolved: 0,
      earnings: 0,
      bansAvoided: 0
    };
    this.redis = null;
    this.cookieManager = new CookieManager();
    this.proxyRotator = new ProxyRotator();
    this.aiAssistant = new AIAssistant();
    this.captchaBridge = new CaptchaBridge();
    this.platformCredentials = new Map();
  }

  async init() {
    this.redis = Redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    await this.redis.connect();
    logger.info('🔗 Redis connected for survey orchestration');
    logger.info(`📋 Supported platforms: ${getSupportedPlatforms().join(', ')}`);
  }

  setCredentials(platformId, credentials) {
    this.platformCredentials.set(platformId, credentials);
    logger.info(`🔑 Credentials set for ${platformId}`);
  }

  async startPlatformWorker(platformId, config = {}) {
    const handler = getHandler(platformId);
    if (!handler) {
      return { 
        success: false, 
        error: `Platform ${platformId} not supported. Supported: ${getSupportedPlatforms().join(', ')}` 
      };
    }

    if (this.platformLocks.get(platformId)) {
      return { 
        success: false, 
        error: `Platform ${platformId} already has active worker. One worker per platform rule.` 
      };
    }

    const credentials = this.platformCredentials.get(platformId);
    if (!credentials && !config.skipLogin) {
      return {
        success: false,
        error: `No credentials set for ${platformId}. Call setCredentials() first.`
      };
    }

    this.platformLocks.set(platformId, true);
    logger.info(`🚀 Starting worker for platform: ${platformId}`);

    try {
      const proxy = await this.proxyRotator.getProxyForPlatform(platformId);
      const cookies = await this.cookieManager.getCookies(platformId);
      
      const browser = await chromium.launch({
        headless: config.headless !== false,
        proxy: proxy ? { server: proxy.url } : undefined
      });

      const context = await browser.newContext({
        userAgent: this.getHumanUserAgent(),
        viewport: { width: 1920, height: 1080 },
        locale: 'de-DE',
        timezoneId: 'Europe/Berlin'
      });

      if (cookies.length > 0) {
        await context.addCookies(cookies);
        logger.info(`🍪 Loaded ${cookies.length} cookies for ${platformId}`);
      }

      const worker = {
        id: `${platformId}-${Date.now()}`,
        platformId,
        browser,
        context,
        proxy,
        handler,
        credentials,
        status: 'running',
        startedAt: new Date(),
        surveysCompleted: 0,
        earnings: 0
      };

      this.activeWorkers.set(platformId, worker);
      
      this.runSurveyLoop(worker, config);

      return { 
        success: true, 
        workerId: worker.id,
        proxy: proxy?.url || 'direct',
        cookiesLoaded: cookies.length
      };

    } catch (error) {
      this.platformLocks.delete(platformId);
      logger.error(`❌ Failed to start worker for ${platformId}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async stopPlatformWorker(platformId) {
    const worker = this.activeWorkers.get(platformId);
    if (!worker) {
      return { success: false, error: 'No active worker for this platform' };
    }

    worker.status = 'stopping';
    
    const cookies = await worker.context.cookies();
    await this.cookieManager.saveCookies(platformId, cookies);
    logger.info(`🍪 Saved ${cookies.length} cookies for ${platformId}`);

    await worker.browser.close();
    
    this.activeWorkers.delete(platformId);
    this.platformLocks.delete(platformId);

    return { 
      success: true, 
      surveysCompleted: worker.surveysCompleted,
      earnings: worker.earnings,
      runTime: Date.now() - worker.startedAt.getTime()
    };
  }

  async runSurveyLoop(worker, config) {
    const page = await worker.context.newPage();
    
    while (worker.status === 'running') {
      try {
        await this.humanDelay(2000, 5000);

        const survey = await this.findAvailableSurvey(page, worker.platformId, worker);
        if (!survey) {
          logger.info(`😴 No surveys available on ${worker.platformId}, waiting...`);
          await this.humanDelay(30000, 60000);
          continue;
        }

        logger.info(`📋 Found survey: ${survey.title} (${survey.reward})`);
        this.stats.surveysAttempted++;

        const result = await this.completeSurvey(page, survey, worker);
        
        if (result.success) {
          worker.surveysCompleted++;
          worker.earnings += result.earnings || 0;
          this.stats.surveysCompleted++;
          this.stats.earnings += result.earnings || 0;
          logger.info(`✅ Survey completed! Earnings: ${result.earnings}`);
        } else if (result.banned) {
          logger.warn(`⚠️ Possible ban detected on ${worker.platformId}, cooling down...`);
          await this.handleBanRisk(worker);
        }

        const cookies = await worker.context.cookies();
        await this.cookieManager.saveCookies(worker.platformId, cookies);

        await this.humanDelay(config.minDelay || 10000, config.maxDelay || 30000);

      } catch (error) {
        logger.error(`❌ Survey loop error: ${error.message}`);
        await this.humanDelay(60000, 120000);
      }
    }

    await page.close();
  }

  async findAvailableSurvey(page, platformId, worker) {
    const handler = worker.handler;
    if (!handler || !handler.findSurveys) {
      logger.warn(`No findSurveys handler for ${platformId}`);
      return null;
    }

    try {
      const isLoggedIn = handler.isLoggedIn ? await handler.isLoggedIn(page) : true;
      
      if (!isLoggedIn && worker.credentials) {
        logger.info(`🔐 Logging in to ${platformId}...`);
        const loginSuccess = await handler.login(page, worker.credentials);
        if (!loginSuccess) {
          logger.error(`❌ Login failed for ${platformId}`);
          return null;
        }
        logger.info(`✅ Login successful for ${platformId}`);
      }

      const surveys = await handler.findSurveys(page);
      if (!surveys || surveys.length === 0) {
        return null;
      }

      return surveys[0];
    } catch (error) {
      logger.error(`findAvailableSurvey error for ${platformId}: ${error.message}`);
      return null;
    }
  }

  async completeSurvey(page, survey, worker) {
    const handler = worker.handler;
    
    try {
      if (!handler.startSurvey) {
        return { success: false, earnings: 0, error: 'No startSurvey handler' };
      }

      const started = await handler.startSurvey(page, survey.index || 0);
      if (!started) {
        return { success: false, earnings: 0, error: 'Failed to start survey' };
      }

      await this.humanDelay(2000, 4000);

      let questionCount = 0;
      const maxQuestions = 100;

      while (questionCount < maxQuestions && worker.status === 'running') {
        const captcha = await this.captchaBridge.detectCaptcha(page);
        if (captcha) {
          logger.info(`🔓 Captcha detected: ${captcha.type}`);
          const captchaSolved = await this.solveCaptcha(page, captcha);
          if (!captchaSolved) {
            return { success: false, earnings: 0, error: 'Captcha failed' };
          }
          this.stats.captchasSolved++;
        }

        const questionInfo = handler.detectQuestionType 
          ? await handler.detectQuestionType(page) 
          : await this.detectGenericQuestion(page);

        if (!questionInfo || questionInfo.type === 'unknown') {
          const pageText = await page.textContent('body').catch(() => '');
          if (this.isCompletionPage(pageText)) {
            logger.info(`🎉 Survey completed!`);
            return { 
              success: true, 
              earnings: survey.reward || 0, 
              questionsAnswered: questionCount 
            };
          }
          
          await this.humanDelay(1000, 2000);
          questionCount++;
          continue;
        }

        const answer = await this.aiAssistant.chat(
          `Answer this survey question: "${questionInfo.questionText}". Type: ${questionInfo.type}, Options: ${questionInfo.options}`,
          { platform: worker.platformId, surveyTitle: survey.title }
        );

        await this.applyAnswer(page, questionInfo, answer);
        await this.humanDelay(1500, 3500);

        if (questionInfo.hasNext) {
          await page.click('button[type="submit"], .next-btn, .continue, input[type="submit"]').catch(() => {});
          await this.humanDelay(2000, 4000);
        }

        questionCount++;
      }

      return { success: false, earnings: 0, error: 'Max questions reached' };

    } catch (error) {
      logger.error(`completeSurvey error: ${error.message}`);
      return { success: false, earnings: 0, error: error.message };
    }
  }

  async detectGenericQuestion(page) {
    const radioOptions = await page.$$('input[type="radio"]');
    const checkboxOptions = await page.$$('input[type="checkbox"]');
    const textInputs = await page.$$('input[type="text"], textarea');
    
    let type = 'unknown';
    let options = 0;
    
    if (radioOptions.length > 0) {
      type = 'single_choice';
      options = radioOptions.length;
    } else if (checkboxOptions.length > 0) {
      type = 'multiple_choice';
      options = checkboxOptions.length;
    } else if (textInputs.length > 0) {
      type = 'text';
      options = textInputs.length;
    }

    const questionEl = await page.$('.question, .survey-question, [role="heading"], h1, h2, h3');
    const questionText = questionEl ? await questionEl.textContent() : '';

    return {
      type,
      options,
      questionText: questionText.trim(),
      hasNext: !!(await page.$('button[type="submit"], .next-btn, .continue'))
    };
  }

  isCompletionPage(text) {
    const completionPhrases = [
      'thank you', 'completed', 'finished', 'submission', 'earned',
      'points added', 'reward', 'completion code', 'survey complete'
    ];
    const lowerText = text.toLowerCase();
    return completionPhrases.some(phrase => lowerText.includes(phrase));
  }

  async applyAnswer(page, questionInfo, aiAnswer) {
    try {
      if (questionInfo.type === 'single_choice') {
        const options = await page.$$('input[type="radio"]');
        if (options.length > 0) {
          const randomIndex = Math.floor(Math.random() * options.length);
          await options[randomIndex].click();
        }
      } else if (questionInfo.type === 'multiple_choice') {
        const options = await page.$$('input[type="checkbox"]');
        if (options.length > 0) {
          const selectCount = Math.min(Math.floor(Math.random() * 3) + 1, options.length);
          for (let i = 0; i < selectCount; i++) {
            await options[i].click();
            await this.humanDelay(200, 500);
          }
        }
      } else if (questionInfo.type === 'text') {
        const textInput = await page.$('input[type="text"], textarea');
        if (textInput && aiAnswer) {
          await textInput.fill(aiAnswer.substring(0, 500));
        }
      }
    } catch (error) {
      logger.warn(`applyAnswer error: ${error.message}`);
    }
  }

  async solveCaptcha(page, captchaInfo) {
    try {
      if (captchaInfo.type === 'image') {
        const imgSrc = await captchaInfo.element.getAttribute('src');
        if (imgSrc) {
          const result = await this.captchaBridge.solveImageCaptcha(imgSrc);
          if (result.success) {
            const input = await page.$('input[name*="captcha"], input[id*="captcha"]');
            if (input) {
              await input.fill(result.solution);
              return true;
            }
          }
        }
      } else if (captchaInfo.type === 'recaptcha_v2') {
        const siteKey = await page.$eval('[data-sitekey]', el => el.getAttribute('data-sitekey')).catch(() => null);
        if (siteKey) {
          const result = await this.captchaBridge.solveRecaptchaV2(siteKey, page.url());
          return result.success;
        }
      }
      return false;
    } catch (error) {
      logger.error(`solveCaptcha error: ${error.message}`);
      return false;
    }
  }

  async handleBanRisk(worker) {
    this.stats.bansAvoided++;
    const newProxy = await this.proxyRotator.rotateProxy(worker.platformId);
    logger.info(`🔄 Rotated proxy to: ${newProxy?.url || 'direct'}`);
    await this.humanDelay(300000, 600000);
  }

  async humanDelay(min, max) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  getHumanUserAgent() {
    const agents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
    ];
    return agents[Math.floor(Math.random() * agents.length)];
  }

  async getGlobalStats() {
    const platforms = [];
    for (const [platformId, worker] of this.activeWorkers) {
      platforms.push({
        platformId,
        status: worker.status,
        surveysCompleted: worker.surveysCompleted,
        earnings: worker.earnings,
        uptime: Date.now() - worker.startedAt.getTime(),
        proxy: worker.proxy?.url || 'direct'
      });
    }

    return {
      ...this.stats,
      activePlatforms: platforms,
      totalActive: this.activeWorkers.size
    };
  }

  async getEarnings(period) {
    return {
      period,
      total: this.stats.earnings,
      surveysCompleted: this.stats.surveysCompleted,
      perPlatform: Array.from(this.activeWorkers.entries()).map(([id, w]) => ({
        platform: id,
        earnings: w.earnings
      }))
    };
  }
}

module.exports = { SurveyOrchestrator };
