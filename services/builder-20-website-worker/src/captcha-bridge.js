/**
 * Captcha Bridge - Integration with Zimmer-19 Captcha Worker
 * 
 * Connects to the FREE captcha solving service:
 * - OCR for text captchas (ddddocr)
 * - Slider captcha solving
 * - Audio captcha transcription (Whisper)
 * - Image classification (YOLOv8 for hCaptcha)
 * 
 * ALL FREE - NO PAID SERVICES (2captcha, anticaptcha, etc.)
 */

class CaptchaBridge {
  constructor(logger) {
    this.logger = logger || console;
    this.captchaWorkerUrl = process.env.CAPTCHA_WORKER_URL || 'http://zimmer-19-captcha-worker:8019';
  }

  async init() {
    try {
      const response = await fetch(`${this.captchaWorkerUrl}/health`);
      if (response.ok) {
        this.logger.info('🔓 CaptchaBridge connected to Zimmer-19');
      } else {
        this.logger.warn('⚠️ Captcha Worker not responding, will retry on demand');
      }
    } catch (error) {
      this.logger.warn({ error: error.message }, '⚠️ Captcha Worker connection failed, will retry on demand');
    }
  }

  async detectCaptcha(page) {
    const captchaTypes = [
      {
        type: 'recaptcha_v2',
        selectors: [
          'iframe[src*="recaptcha"]',
          '.g-recaptcha',
          '[data-sitekey]'
        ]
      },
      {
        type: 'recaptcha_v3',
        selectors: [
          'script[src*="recaptcha/api.js?render="]'
        ]
      },
      {
        type: 'hcaptcha',
        selectors: [
          'iframe[src*="hcaptcha"]',
          '.h-captcha',
          '[data-hcaptcha-sitekey]'
        ]
      },
      {
        type: 'image',
        selectors: [
          'img[src*="captcha"]',
          'img[id*="captcha"]',
          'img[class*="captcha"]',
          '.captcha-image img'
        ]
      },
      {
        type: 'slider',
        selectors: [
          '.slider-captcha',
          '.geetest_slider',
          '[class*="slide-verify"]'
        ]
      },
      {
        type: 'audio',
        selectors: [
          'audio[src*="captcha"]',
          '.audio-captcha'
        ]
      }
    ];

    for (const { type, selectors } of captchaTypes) {
      for (const selector of selectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            this.logger.info({ type, selector }, '🔍 Captcha detected');
            return { type, element, selector };
          }
        } catch (e) {
          continue;
        }
      }
    }

    return null;
  }

  async solveCaptcha(page, captchaInfo) {
    const { type, element, selector } = captchaInfo;

    try {
      switch (type) {
        case 'image':
          return await this.solveImageCaptcha(page, element);
        
        case 'slider':
          return await this.solveSliderCaptcha(page, element);
        
        case 'audio':
          return await this.solveAudioCaptcha(page, element);
        
        case 'recaptcha_v2':
          return await this.solveRecaptchaV2(page, element);
        
        case 'hcaptcha':
          return await this.solveHCaptcha(page, element);
        
        case 'recaptcha_v3':
          // v3 is invisible, usually handled by behavioral score
          this.logger.info('📝 reCAPTCHA v3 detected - relying on behavioral score');
          return { success: true, type: 'v3_behavioral' };
        
        default:
          this.logger.warn({ type }, '⚠️ Unknown captcha type');
          return { success: false, error: 'Unknown captcha type' };
      }
    } catch (error) {
      this.logger.error({ type, error: error.message }, '❌ Captcha solving failed');
      return { success: false, error: error.message };
    }
  }

  async solveImageCaptcha(page, element) {
    try {
      // Get image source
      const imgSrc = await element.evaluate(el => el.src);
      
      if (!imgSrc) {
        return { success: false, error: 'No image source found' };
      }

      // Get base64 image
      let imageBase64;
      if (imgSrc.startsWith('data:image')) {
        imageBase64 = imgSrc.split(',')[1];
      } else {
        // Fetch image and convert to base64
        const response = await page.evaluate(async (src) => {
          const res = await fetch(src);
          const blob = await res.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(blob);
          });
        }, imgSrc);
        imageBase64 = response;
      }

      // Send to captcha worker
      const result = await this.callCaptchaWorker('/solve/ocr', {
        image: imageBase64,
        type: 'text'
      });

      if (result.success && result.solution) {
        // Find input field and enter solution
        const input = await page.$('input[name*="captcha"], input[id*="captcha"], input[class*="captcha"]');
        if (input) {
          await input.type(result.solution, { delay: 50 });
          return { success: true, solution: result.solution };
        }
      }

      return result;

    } catch (error) {
      this.logger.error({ error: error.message }, 'Image captcha solving failed');
      return { success: false, error: error.message };
    }
  }

  async solveSliderCaptcha(page, element) {
    try {
      // Get slider puzzle images
      const bgImage = await page.$eval('.slider-bg, .geetest_canvas_bg', el => {
        const canvas = el.tagName === 'CANVAS' ? el : el.querySelector('canvas');
        return canvas?.toDataURL('image/png').split(',')[1];
      }).catch(() => null);

      const puzzleImage = await page.$eval('.slider-puzzle, .geetest_canvas_slice', el => {
        const canvas = el.tagName === 'CANVAS' ? el : el.querySelector('canvas');
        return canvas?.toDataURL('image/png').split(',')[1];
      }).catch(() => null);

      if (!bgImage || !puzzleImage) {
        return { success: false, error: 'Could not capture slider images' };
      }

      // Send to captcha worker for offset calculation
      const result = await this.callCaptchaWorker('/solve/slider', {
        background: bgImage,
        puzzle: puzzleImage
      });

      if (result.success && result.offset) {
        // Perform slider drag
        const slider = await page.$('.slider-handle, .geetest_slider_button, [class*="slider-btn"]');
        if (slider) {
          const box = await slider.boundingBox();
          
          // Human-like drag with random variations
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          
          // Drag with acceleration/deceleration
          const steps = 20;
          for (let i = 1; i <= steps; i++) {
            const progress = i / steps;
            const eased = this.easeOutQuad(progress);
            const x = box.x + box.width / 2 + result.offset * eased;
            const y = box.y + box.height / 2 + (Math.random() - 0.5) * 2;
            
            await page.mouse.move(x, y);
            await this.delay(10 + Math.random() * 20);
          }
          
          await page.mouse.up();
          
          return { success: true, offset: result.offset };
        }
      }

      return result;

    } catch (error) {
      this.logger.error({ error: error.message }, 'Slider captcha solving failed');
      return { success: false, error: error.message };
    }
  }

  async solveAudioCaptcha(page, element) {
    try {
      // Get audio source
      const audioSrc = await element.evaluate(el => el.src);
      
      if (!audioSrc) {
        return { success: false, error: 'No audio source found' };
      }

      // Fetch audio file
      const audioBuffer = await page.evaluate(async (src) => {
        const res = await fetch(src);
        const blob = await res.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(blob);
        });
      }, audioSrc);

      // Send to captcha worker for transcription
      const result = await this.callCaptchaWorker('/solve/audio', {
        audio: audioBuffer,
        format: 'mp3'
      });

      if (result.success && result.transcription) {
        // Find input field and enter solution
        const input = await page.$('input[name*="captcha"], input[id*="captcha"]');
        if (input) {
          await input.type(result.transcription, { delay: 50 });
          return { success: true, solution: result.transcription };
        }
      }

      return result;

    } catch (error) {
      this.logger.error({ error: error.message }, 'Audio captcha solving failed');
      return { success: false, error: error.message };
    }
  }

  async solveRecaptchaV2(page, element) {
    try {
      // Get sitekey
      const sitekey = await page.$eval('[data-sitekey]', el => el.getAttribute('data-sitekey')).catch(() => null);
      
      if (!sitekey) {
        return { success: false, error: 'reCAPTCHA sitekey not found' };
      }

      // Click the checkbox to trigger challenge
      const checkbox = await page.$('iframe[src*="recaptcha"]');
      if (checkbox) {
        const frame = await checkbox.contentFrame();
        await frame.click('.recaptcha-checkbox-border');
        await this.delay(2000);
      }

      // Check if solved (checkmark appeared)
      const solved = await page.evaluate(() => {
        const response = document.querySelector('#g-recaptcha-response');
        return response && response.value.length > 0;
      });

      if (solved) {
        return { success: true, type: 'checkbox_only' };
      }

      // If challenge appeared, we need image classification
      // This uses our FREE YOLOv8 model
      this.logger.info('🖼️ reCAPTCHA challenge requires image classification');
      
      // For now, return failure - full implementation requires visual AI
      return { 
        success: false, 
        error: 'reCAPTCHA image challenge not yet implemented',
        recommendation: 'Use proxy rotation to avoid challenges'
      };

    } catch (error) {
      this.logger.error({ error: error.message }, 'reCAPTCHA v2 solving failed');
      return { success: false, error: error.message };
    }
  }

  async solveHCaptcha(page, element) {
    try {
      // Get sitekey
      const sitekey = await page.$eval('[data-hcaptcha-sitekey], .h-captcha', 
        el => el.getAttribute('data-hcaptcha-sitekey') || el.getAttribute('data-sitekey')
      ).catch(() => null);
      
      if (!sitekey) {
        return { success: false, error: 'hCaptcha sitekey not found' };
      }

      // hCaptcha solving using our image classifier
      // This would use YOLOv8 for object detection
      this.logger.info('🖼️ hCaptcha requires image classification');
      
      return { 
        success: false, 
        error: 'hCaptcha image challenge requires YOLOv8 integration',
        sitekey
      };

    } catch (error) {
      this.logger.error({ error: error.message }, 'hCaptcha solving failed');
      return { success: false, error: error.message };
    }
  }

  async callCaptchaWorker(endpoint, data) {
    try {
      const response = await fetch(`${this.captchaWorkerUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        timeout: 30000
      });

      if (!response.ok) {
        throw new Error(`Captcha worker returned ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      this.logger.error({ endpoint, error: error.message }, 'Captcha worker call failed');
      return { success: false, error: error.message };
    }
  }

  easeOutQuad(t) {
    return t * (2 - t);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { CaptchaBridge };
