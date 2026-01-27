const winston = require('winston');
const { AIAssistant } = require('./ai-assistant');
const { CaptchaBridge } = require('./captcha-bridge');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

class SurveyCompleter {
  constructor(options = {}) {
    this.aiAssistant = options.aiAssistant || new AIAssistant();
    this.captchaBridge = options.captchaBridge || new CaptchaBridge();
    this.humanLikeDelays = options.humanLikeDelays !== false;
    this.minDelay = options.minDelay || 2000;
    this.maxDelay = options.maxDelay || 8000;
    this.attentionCheckPatterns = [
      /select\s+(the\s+)?(second|third|fourth|fifth)/i,
      /choose\s+"?([^"]+)"?/i,
      /click\s+(on\s+)?the\s+(\w+)/i,
      /please\s+select\s+(\w+)/i,
      /to\s+ensure\s+you('re|re)\s+paying\s+attention/i,
      /quality\s+check/i,
      /attention\s+check/i
    ];
  }

  async complete(page, survey, platformHandler) {
    const startTime = Date.now();
    let questionsAnswered = 0;
    let captchasSolved = 0;
    
    try {
      logger.info('SurveyCompleter: Starting survey completion', { surveyTitle: survey.title });
      
      while (true) {
        const captchaResult = await this.captchaBridge.solveCaptchaOnPage(page);
        if (captchaResult.success && !captchaResult.noCaptcha) {
          captchasSolved++;
          logger.info('SurveyCompleter: Captcha solved', { captchasSolved });
        }
        
        const questionInfo = await platformHandler.detectQuestionType(page);
        if (!questionInfo || questionInfo.type === 'unknown') {
          const isComplete = await this.checkSurveyComplete(page);
          if (isComplete) {
            logger.info('SurveyCompleter: Survey completed successfully', { questionsAnswered, duration: Date.now() - startTime });
            return { success: true, questionsAnswered, captchasSolved, duration: Date.now() - startTime };
          }
          await this.humanDelay();
          continue;
        }
        
        const isAttentionCheck = this.detectAttentionCheck(questionInfo.questionText);
        let answer;
        
        if (isAttentionCheck) {
          answer = await this.handleAttentionCheck(questionInfo);
          logger.info('SurveyCompleter: Attention check detected', { question: questionInfo.questionText.substring(0, 50) });
        } else {
          answer = await this.getAIAnswer(questionInfo);
        }
        
        if (answer) {
          await this.fillAnswer(page, questionInfo, answer);
          questionsAnswered++;
        }
        
        if (questionInfo.hasNext) {
          await this.humanDelay();
          await this.clickNext(page, platformHandler);
        } else {
          break;
        }
        
        await page.waitForTimeout(500);
      }
      
      return { success: true, questionsAnswered, captchasSolved, duration: Date.now() - startTime };
      
    } catch (error) {
      logger.error('SurveyCompleter: Error during completion', { error: error.message });
      return { success: false, error: error.message, questionsAnswered, captchasSolved, duration: Date.now() - startTime };
    }
  }

  async getAIAnswer(questionInfo) {
    const prompt = this.buildPrompt(questionInfo);
    
    try {
      const response = await this.aiAssistant.generateAnswer(
        'You are a survey respondent. Answer naturally and consistently. Be decisive.',
        prompt
      );
      
      return this.parseAIResponse(response, questionInfo);
    } catch (error) {
      logger.warn('SurveyCompleter: AI answer failed, using fallback', { error: error.message });
      return this.getFallbackAnswer(questionInfo);
    }
  }

  buildPrompt(questionInfo) {
    let prompt = `Survey Question: "${questionInfo.questionText}"\n\nQuestion Type: ${questionInfo.type}\n`;
    
    if (questionInfo.type === 'single_choice' || questionInfo.type === 'multiple_choice') {
      prompt += `Number of options: ${questionInfo.options}\n`;
      prompt += `\nProvide the option number (1-${questionInfo.options}) to select.`;
      if (questionInfo.type === 'multiple_choice') {
        prompt += ' You can select multiple options separated by commas.';
      }
    } else if (questionInfo.type === 'text') {
      prompt += '\nProvide a natural, concise response (1-2 sentences).';
    } else if (questionInfo.type === 'scale') {
      prompt += `\nProvide a number on the scale (typically 1-5 or 1-10).`;
    } else if (questionInfo.type === 'dropdown') {
      prompt += '\nProvide the option text or number to select.';
    }
    
    prompt += '\n\nRespond with ONLY the answer, no explanation.';
    return prompt;
  }

  parseAIResponse(response, questionInfo) {
    if (!response) return null;
    
    const cleaned = response.trim();
    
    if (questionInfo.type === 'single_choice' || questionInfo.type === 'scale') {
      const match = cleaned.match(/\d+/);
      return match ? parseInt(match[0], 10) : 1;
    }
    
    if (questionInfo.type === 'multiple_choice') {
      const numbers = cleaned.match(/\d+/g);
      return numbers ? numbers.map(n => parseInt(n, 10)) : [1];
    }
    
    if (questionInfo.type === 'text') {
      return cleaned.substring(0, 500);
    }
    
    return cleaned;
  }

  getFallbackAnswer(questionInfo) {
    switch (questionInfo.type) {
      case 'single_choice':
        return Math.floor(Math.random() * questionInfo.options) + 1;
      case 'multiple_choice':
        return [1];
      case 'text':
        return 'No specific opinion';
      case 'scale':
        return 3;
      case 'dropdown':
        return 1;
      default:
        return 1;
    }
  }

  async fillAnswer(page, questionInfo, answer) {
    try {
      switch (questionInfo.type) {
        case 'single_choice':
          await this.selectRadioOption(page, answer);
          break;
        case 'multiple_choice':
          await this.selectCheckboxOptions(page, Array.isArray(answer) ? answer : [answer]);
          break;
        case 'text':
          await this.fillTextInput(page, answer);
          break;
        case 'scale':
          await this.selectScaleOption(page, answer);
          break;
        case 'dropdown':
          await this.selectDropdownOption(page, answer);
          break;
        case 'matrix':
          await this.fillMatrixCell(page, answer);
          break;
      }
    } catch (error) {
      logger.warn('SurveyCompleter: Failed to fill answer', { type: questionInfo.type, error: error.message });
    }
  }

  async selectRadioOption(page, optionIndex) {
    const radios = await page.$$('input[type="radio"]');
    const idx = Math.min(optionIndex - 1, radios.length - 1);
    if (radios[idx]) {
      await radios[idx].click();
      await this.typeDelay();
    }
  }

  async selectCheckboxOptions(page, optionIndices) {
    const checkboxes = await page.$$('input[type="checkbox"]');
    for (const idx of optionIndices) {
      const realIdx = Math.min(idx - 1, checkboxes.length - 1);
      if (checkboxes[realIdx]) {
        await checkboxes[realIdx].click();
        await this.typeDelay();
      }
    }
  }

  async fillTextInput(page, text) {
    const inputs = await page.$$('input[type="text"], textarea');
    if (inputs[0]) {
      await inputs[0].click();
      await this.typeDelay();
      await inputs[0].fill('');
      for (const char of text) {
        await inputs[0].type(char, { delay: this.randomDelay(30, 100) });
      }
    }
  }

  async selectScaleOption(page, value) {
    const scaleInputs = await page.$$('input[type="radio"], input[type="range"], .scale-option');
    const idx = Math.min(value - 1, scaleInputs.length - 1);
    if (scaleInputs[idx]) {
      await scaleInputs[idx].click();
    }
  }

  async selectDropdownOption(page, value) {
    const selects = await page.$$('select');
    if (selects[0]) {
      const options = await selects[0].$$('option');
      const idx = typeof value === 'number' ? Math.min(value, options.length - 1) : 1;
      if (options[idx]) {
        const optionValue = await options[idx].getAttribute('value');
        await selects[0].selectOption(optionValue);
      }
    }
  }

  async fillMatrixCell(page, answer) {
    const cells = await page.$$('.matrix-cell input, td input[type="radio"]');
    if (cells.length > 0) {
      const idx = typeof answer === 'number' ? Math.min(answer - 1, cells.length - 1) : 0;
      await cells[idx].click();
    }
  }

  async clickNext(page, platformHandler) {
    const selectors = platformHandler?.SELECTORS?.surveyPage?.nextButton || 'button[type="submit"], .next-btn, .continue, input[type="submit"]';
    const nextBtn = await page.$(selectors);
    if (nextBtn) {
      await nextBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  detectAttentionCheck(questionText) {
    if (!questionText) return false;
    return this.attentionCheckPatterns.some(pattern => pattern.test(questionText));
  }

  async handleAttentionCheck(questionInfo) {
    const text = questionInfo.questionText.toLowerCase();
    
    const ordinalMap = { 'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5, 'sixth': 6, 'last': questionInfo.options };
    
    for (const [word, num] of Object.entries(ordinalMap)) {
      if (text.includes(word)) {
        return num;
      }
    }
    
    const selectMatch = text.match(/select\s+"?([^"]+)"?/i);
    if (selectMatch) {
      return selectMatch[1];
    }
    
    return await this.getAIAnswer(questionInfo);
  }

  async checkSurveyComplete(page) {
    const completeIndicators = [
      '.survey-complete', '.thank-you', '.completion-message',
      'text="Thank you"', 'text="Survey complete"', 'text="Completed"',
      '.success-message', '.reward-earned'
    ];
    
    for (const selector of completeIndicators) {
      try {
        const element = await page.$(selector);
        if (element) return true;
      } catch (e) {}
    }
    
    const url = page.url();
    if (url.includes('complete') || url.includes('thank') || url.includes('success')) {
      return true;
    }
    
    return false;
  }

  async humanDelay() {
    if (this.humanLikeDelays) {
      const delay = this.randomDelay(this.minDelay, this.maxDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  async typeDelay() {
    await new Promise(resolve => setTimeout(resolve, this.randomDelay(100, 300)));
  }

  randomDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

module.exports = { SurveyCompleter };
