const axios = require('axios');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

class CaptchaBridge {
  constructor() {
    this.apiUrl = process.env.API_COORDINATOR_URL || 'http://zimmer-13-api-koordinator:8000';
    this.timeout = parseInt(process.env.CAPTCHA_TIMEOUT_SECONDS || '60') * 1000;
    this.maxRetries = parseInt(process.env.CAPTCHA_MAX_RETRIES || '3');
  }

  async solveImageCaptcha(imageBase64, options = {}) {
    const startTime = Date.now();
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`🔍 Attempting image captcha solve (attempt ${attempt}/${this.maxRetries})`);
        
        const response = await axios.post(
          `${this.apiUrl}/captcha/solve`,
          {
            type: 'image',
            image: imageBase64,
            options: {
              provider: options.provider || 'gemini',
              ...options
            }
          },
          { timeout: this.timeout }
        );

        if (response.data.success) {
          logger.info(`✅ Captcha solved in ${Date.now() - startTime}ms via ${response.data.provider}`);
          return {
            success: true,
            solution: response.data.solution,
            provider: response.data.provider,
            attempts: attempt,
            duration: Date.now() - startTime
          };
        }

      } catch (error) {
        logger.warn(`⚠️ Captcha attempt ${attempt} failed: ${error.message}`);
        if (attempt < this.maxRetries) {
          await this.delay(1000 * attempt);
        }
      }
    }

    logger.error(`❌ Captcha solving failed after ${this.maxRetries} attempts`);
    return { success: false, error: 'Max retries exceeded', attempts: this.maxRetries };
  }

  async solveRecaptchaV2(siteKey, pageUrl, options = {}) {
    const startTime = Date.now();
    
    try {
      logger.info(`🔍 Attempting reCAPTCHA v2 solve for ${pageUrl}`);
      
      const response = await axios.post(
        `${this.apiUrl}/captcha/solve`,
        {
          type: 'recaptcha_v2',
          siteKey,
          pageUrl,
          options: {
            method: options.method || 'audio',
            ...options
          }
        },
        { timeout: 120000 }
      );

      if (response.data.success) {
        logger.info(`✅ reCAPTCHA solved in ${Date.now() - startTime}ms`);
        return {
          success: true,
          token: response.data.token,
          provider: response.data.provider,
          duration: Date.now() - startTime
        };
      }

      return { success: false, error: response.data.error };

    } catch (error) {
      logger.error(`❌ reCAPTCHA solve failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async solveHCaptcha(siteKey, pageUrl, options = {}) {
    const startTime = Date.now();
    
    try {
      logger.info(`🔍 Attempting hCaptcha solve for ${pageUrl}`);
      
      const response = await axios.post(
        `${this.apiUrl}/captcha/solve`,
        {
          type: 'hcaptcha',
          siteKey,
          pageUrl,
          options
        },
        { timeout: 120000 }
      );

      if (response.data.success) {
        logger.info(`✅ hCaptcha solved in ${Date.now() - startTime}ms`);
        return {
          success: true,
          token: response.data.token,
          provider: response.data.provider,
          duration: Date.now() - startTime
        };
      }

      return { success: false, error: response.data.error };

    } catch (error) {
      logger.error(`❌ hCaptcha solve failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async detectCaptcha(page) {
    const captchaSelectors = [
      { selector: 'iframe[src*="recaptcha"]', type: 'recaptcha_v2' },
      { selector: 'iframe[src*="hcaptcha"]', type: 'hcaptcha' },
      { selector: '.g-recaptcha', type: 'recaptcha_v2' },
      { selector: '.h-captcha', type: 'hcaptcha' },
      { selector: '[data-sitekey]', type: 'unknown_checkbox' },
      { selector: 'img[src*="captcha"]', type: 'image' },
      { selector: 'img[alt*="captcha" i]', type: 'image' },
      { selector: 'input[name*="captcha" i]', type: 'image' }
    ];

    for (const { selector, type } of captchaSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          logger.info(`🔎 Detected captcha type: ${type} (selector: ${selector})`);
          
          let siteKey = null;
          if (type === 'recaptcha_v2' || type === 'hcaptcha') {
            siteKey = await this.extractSiteKey(page, element, type);
          }
          
          return { 
            type, 
            element,
            selector,
            siteKey,
            pageUrl: page.url()
          };
        }
      } catch (e) {
        continue;
      }
    }

    return null;
  }

  async extractSiteKey(page, element, type) {
    try {
      let siteKey = await element.getAttribute('data-sitekey');
      if (siteKey) return siteKey;
      
      if (type === 'recaptcha_v2') {
        const iframe = await page.$('iframe[src*="recaptcha"]');
        if (iframe) {
          const src = await iframe.getAttribute('src');
          const match = src?.match(/[?&]k=([^&]+)/);
          if (match) return match[1];
        }
      }
      
      if (type === 'hcaptcha') {
        const iframe = await page.$('iframe[src*="hcaptcha"]');
        if (iframe) {
          const src = await iframe.getAttribute('src');
          const match = src?.match(/sitekey=([^&]+)/);
          if (match) return match[1];
        }
      }
      
      return null;
    } catch (e) {
      logger.warn(`⚠️ Could not extract sitekey: ${e.message}`);
      return null;
    }
  }

  async solveCaptchaOnPage(page) {
    const captcha = await this.detectCaptcha(page);
    if (!captcha) {
      return { success: true, noCaptcha: true };
    }

    logger.info(`🎯 Solving ${captcha.type} captcha on ${captcha.pageUrl}`);

    switch (captcha.type) {
      case 'recaptcha_v2':
        if (!captcha.siteKey) {
          return { success: false, error: 'Could not extract reCAPTCHA sitekey' };
        }
        return this.solveRecaptchaV2(captcha.siteKey, captcha.pageUrl);

      case 'hcaptcha':
        if (!captcha.siteKey) {
          return { success: false, error: 'Could not extract hCaptcha sitekey' };
        }
        return this.solveHCaptcha(captcha.siteKey, captcha.pageUrl);

      case 'image':
        const screenshot = await captcha.element.screenshot({ encoding: 'base64' });
        return this.solveImageCaptcha(screenshot);

      default:
        logger.warn(`⚠️ Unknown captcha type: ${captcha.type}`);
        return { success: false, error: `Unknown captcha type: ${captcha.type}` };
    }
  }

  async injectCaptchaToken(page, token, type) {
    try {
      if (type === 'recaptcha_v2') {
        await page.evaluate((token) => {
          const textarea = document.querySelector('#g-recaptcha-response');
          if (textarea) {
            textarea.value = token;
            textarea.style.display = 'block';
          }
          if (typeof grecaptcha !== 'undefined' && grecaptcha.getResponse) {
            const callback = grecaptcha.getResponse;
            if (callback) callback(token);
          }
        }, token);
        return true;
      }

      if (type === 'hcaptcha') {
        await page.evaluate((token) => {
          const textarea = document.querySelector('[name="h-captcha-response"]');
          if (textarea) textarea.value = token;
          const input = document.querySelector('[name="g-recaptcha-response"]');
          if (input) input.value = token;
        }, token);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`❌ Token injection failed: ${error.message}`);
      return false;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { CaptchaBridge };
