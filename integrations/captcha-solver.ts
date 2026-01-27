import { SteelBrowserClient, createSteelClient } from './steel-client';
import { SkyvernClient, createSkyvernClient } from './skyvern-client';
import { StagehandClient, createStagehandClient } from './stagehand-client';
import { VisionClient, createVisionClient } from './vision-client';
import { ICaptchaElement, ICaptchaSolveResult, IBrowserConfig } from './types';

interface CaptchaSolverConfig {
  browserConfig?: Partial<IBrowserConfig>;
  visionApiKey: string;
  maxRetries: number;
  retryDelay: number;
  preferredMethod: 'vision' | 'ai-navigation' | 'auto';
}

const DEFAULT_CONFIG: Omit<CaptchaSolverConfig, 'visionApiKey'> = {
  maxRetries: 3,
  retryDelay: 2000,
  preferredMethod: 'auto'
};

interface SolveAttempt {
  method: ICaptchaSolveResult['method'];
  success: boolean;
  error?: string;
  duration: number;
}

interface SolveContext {
  url: string;
  captcha: ICaptchaElement;
  attempts: SolveAttempt[];
  startTime: number;
}

export class CaptchaSolver {
  private config: CaptchaSolverConfig;
  private steel: SteelBrowserClient;
  private skyvern: SkyvernClient;
  private stagehand: StagehandClient;
  private vision: VisionClient;
  private activeContexts: Map<string, SolveContext> = new Map();

  constructor(config: Partial<CaptchaSolverConfig> & { visionApiKey: string }) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.steel = createSteelClient(config.browserConfig);
    this.skyvern = createSkyvernClient(config.browserConfig);
    this.stagehand = createStagehandClient(config.browserConfig);
    this.vision = createVisionClient(config.visionApiKey);
  }

  async solve(url: string, captcha?: ICaptchaElement): Promise<ICaptchaSolveResult> {
    const startTime = Date.now();
    const contextId = `${url}-${Date.now()}`;

    try {
      await this.steel.connect();
      await this.steel.navigate(url);

      const detectedCaptcha = captcha || await this.detectCaptcha();
      if (!detectedCaptcha) {
        return this.createResult(false, 'unknown', undefined, undefined, 0, startTime, 'No CAPTCHA detected');
      }

      this.activeContexts.set(contextId, {
        url,
        captcha: detectedCaptcha,
        attempts: [],
        startTime
      });

      const result = await this.solveCaptcha(contextId, detectedCaptcha);
      return result;

    } catch (error) {
      return this.createResult(
        false,
        captcha?.type || 'unknown',
        undefined,
        undefined,
        0,
        startTime,
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      await this.steel.close();
      this.activeContexts.delete(contextId);
    }
  }

  async solveOnPage(): Promise<ICaptchaSolveResult> {
    const startTime = Date.now();
    const pageState = await this.steel.getPageState();

    if (pageState.captchas.length === 0) {
      return this.createResult(false, 'unknown', undefined, undefined, 0, startTime, 'No CAPTCHA on page');
    }

    const captcha = pageState.captchas[0];
    const contextId = `${pageState.url}-${Date.now()}`;

    this.activeContexts.set(contextId, {
      url: pageState.url,
      captcha,
      attempts: [],
      startTime
    });

    try {
      return await this.solveCaptcha(contextId, captcha);
    } finally {
      this.activeContexts.delete(contextId);
    }
  }

  async detectCaptcha(): Promise<ICaptchaElement | null> {
    const captchas = this.steel.getCaptchas();
    if (captchas.length > 0) {
      return captchas[0];
    }

    const pageState = await this.steel.getPageState();
    if (pageState.captchas.length > 0) {
      return pageState.captchas[0];
    }

    const screenshot = await this.steel.screenshot();
    const type = await this.vision.identifyCaptchaType(screenshot);
    
    if (type !== 'unknown') {
      return {
        type,
        selector: '[data-captcha]',
        boundingBox: { x: 0, y: 0, width: 300, height: 74 }
      };
    }

    return null;
  }

  async detectAllCaptchas(): Promise<ICaptchaElement[]> {
    const results: ICaptchaElement[] = [];

    const steelCaptchas = this.steel.getCaptchas();
    results.push(...steelCaptchas);

    const stagehandResult = await this.stagehand.detectCaptchas(
      (await this.steel.getPageState()).url
    );
    
    for (const cap of stagehandResult) {
      if (!results.some(r => r.selector === cap.selector)) {
        results.push(cap);
      }
    }

    return results;
  }

  private async solveCaptcha(
    contextId: string,
    captcha: ICaptchaElement
  ): Promise<ICaptchaSolveResult> {
    const context = this.activeContexts.get(contextId);
    if (!context) {
      return this.createResult(false, captcha.type, undefined, undefined, 0, Date.now(), 'Context lost');
    }

    const methods = this.getMethodOrder(captcha.type);

    for (let retry = 0; retry < this.config.maxRetries; retry++) {
      for (const method of methods) {
        const attemptStart = Date.now();
        
        try {
          const result = await this.attemptSolve(captcha, method);
          
          context.attempts.push({
            method,
            success: result.success,
            duration: Date.now() - attemptStart
          });

          if (result.success) {
            return result;
          }
        } catch (error) {
          context.attempts.push({
            method,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - attemptStart
          });
        }
      }

      if (retry < this.config.maxRetries - 1) {
        await this.sleep(this.config.retryDelay);
      }
    }

    return this.createResult(
      false,
      captcha.type,
      undefined,
      undefined,
      0,
      context.startTime,
      `Failed after ${this.config.maxRetries} retries`
    );
  }

  private async attemptSolve(
    captcha: ICaptchaElement,
    method: ICaptchaSolveResult['method']
  ): Promise<ICaptchaSolveResult> {
    const startTime = Date.now();

    switch (method) {
      case 'vision':
        return this.solveWithVision(captcha, startTime);
      case 'ml':
        return this.solveWithML(captcha, startTime);
      case 'pattern':
        return this.solveWithPattern(captcha, startTime);
      default:
        return this.createResult(false, captcha.type, undefined, undefined, 0, startTime, 'Unknown method');
    }
  }

  private async solveWithVision(
    captcha: ICaptchaElement,
    startTime: number
  ): Promise<ICaptchaSolveResult> {
    switch (captcha.type) {
      case 'image':
        return this.solveImageCaptcha(captcha, startTime);
      case 'recaptcha-v2':
        return this.solveRecaptchaV2(captcha, startTime);
      case 'recaptcha-v3':
        return this.solveRecaptchaV3(captcha, startTime);
      case 'hcaptcha':
        return this.solveHCaptcha(captcha, startTime);
      case 'cloudflare-turnstile':
        return this.solveTurnstile(captcha, startTime);
      case 'text':
        return this.solveTextCaptcha(captcha, startTime);
      default:
        return this.createResult(false, captcha.type, undefined, undefined, 0, startTime, 'Unsupported CAPTCHA type for vision');
    }
  }

  private async solveImageCaptcha(
    captcha: ICaptchaElement,
    startTime: number
  ): Promise<ICaptchaSolveResult> {
    let imageBuffer: Buffer;

    if (captcha.imageUrl) {
      const response = await fetch(captcha.imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    } else {
      imageBuffer = await this.steel.screenshot();
    }

    const solution = await this.vision.solveImageCaptcha(imageBuffer);

    if (!solution) {
      return this.createResult(false, 'image', undefined, undefined, 0.3, startTime, 'Could not extract text');
    }

    const inputSelector = this.findCaptchaInput(captcha.selector);
    if (inputSelector) {
      await this.steel.type(inputSelector, solution);
    }

    return this.createResult(true, 'image', solution, undefined, 0.8, startTime);
  }

  private async solveRecaptchaV2(
    captcha: ICaptchaElement,
    startTime: number
  ): Promise<ICaptchaSolveResult> {
    await this.steel.click(captcha.selector);
    await this.sleep(2000);

    const screenshot = await this.steel.screenshot();
    const challenge = await this.vision.analyzeRecaptchaChallenge(screenshot);

    if (challenge.challengeType === 'checkbox') {
      const completion = await this.vision.checkChallengeCompletion(await this.steel.screenshot());
      if (completion.success) {
        return this.createResult(true, 'recaptcha-v2', undefined, undefined, 0.95, startTime);
      }
    }

    if (challenge.challengeType === 'image' && challenge.clickTargets.length > 0) {
      for (const target of challenge.clickTargets) {
        const gridSelector = this.getGridCellSelector(target, challenge.gridSize);
        await this.steel.click(gridSelector);
        await this.sleep(300);
      }

      await this.steel.click('[id="recaptcha-verify-button"]');
      await this.sleep(2000);

      const completion = await this.vision.checkChallengeCompletion(await this.steel.screenshot());
      if (completion.success) {
        return this.createResult(true, 'recaptcha-v2', undefined, undefined, 0.85, startTime);
      }
    }

    const skyvernResult = await this.skyvern.solveCaptchaWithAI(
      (await this.steel.getPageState()).url,
      'recaptcha-v2'
    );

    if (skyvernResult.status === 'completed') {
      return this.createResult(true, 'recaptcha-v2', undefined, undefined, 0.8, startTime);
    }

    return this.createResult(false, 'recaptcha-v2', undefined, undefined, 0.3, startTime, 'reCAPTCHA v2 challenge failed');
  }

  private async solveRecaptchaV3(
    captcha: ICaptchaElement,
    startTime: number
  ): Promise<ICaptchaSolveResult> {
    await this.steel.evaluate(`window.scrollTo(0, document.body.scrollHeight / 2)`);
    await this.sleep(500);
    await this.steel.evaluate(`window.scrollTo(0, 0)`);
    await this.sleep(300);

    const pageState = await this.steel.getPageState();
    const forms = pageState.forms;

    if (forms.length > 0) {
      for (const form of forms) {
        for (const input of form.inputs.slice(0, 2)) {
          if (!input.isHoneypot && !input.isHidden) {
            await this.steel.click(input.selector);
            await this.sleep(100);
          }
        }
      }
    }

    return this.createResult(true, 'recaptcha-v3', undefined, undefined, 0.7, startTime);
  }

  private async solveHCaptcha(
    captcha: ICaptchaElement,
    startTime: number
  ): Promise<ICaptchaSolveResult> {
    await this.steel.click(captcha.selector);
    await this.sleep(2000);

    const screenshot = await this.steel.screenshot();
    const challenge = await this.vision.analyzeRecaptchaChallenge(screenshot);

    if (challenge.instruction && challenge.clickTargets.length > 0) {
      for (const target of challenge.clickTargets) {
        const gridSelector = this.getGridCellSelector(target, challenge.gridSize);
        await this.steel.click(gridSelector);
        await this.sleep(300);
      }

      await this.steel.click('[data-testid="verify-button"]');
      await this.sleep(2000);

      const completion = await this.vision.checkChallengeCompletion(await this.steel.screenshot());
      if (completion.success) {
        return this.createResult(true, 'hcaptcha', undefined, undefined, 0.85, startTime);
      }
    }

    const skyvernResult = await this.skyvern.solveCaptchaWithAI(
      (await this.steel.getPageState()).url,
      'hcaptcha'
    );

    if (skyvernResult.status === 'completed') {
      return this.createResult(true, 'hcaptcha', undefined, undefined, 0.8, startTime);
    }

    return this.createResult(false, 'hcaptcha', undefined, undefined, 0.3, startTime, 'hCaptcha challenge failed');
  }

  private async solveTurnstile(
    captcha: ICaptchaElement,
    startTime: number
  ): Promise<ICaptchaSolveResult> {
    await this.steel.click(captcha.selector);
    await this.sleep(3000);

    const completion = await this.vision.checkChallengeCompletion(await this.steel.screenshot());
    
    if (completion.success) {
      return this.createResult(true, 'cloudflare-turnstile', undefined, undefined, 0.9, startTime);
    }

    const skyvernResult = await this.skyvern.solveCaptchaWithAI(
      (await this.steel.getPageState()).url,
      'cloudflare-turnstile'
    );

    if (skyvernResult.status === 'completed') {
      return this.createResult(true, 'cloudflare-turnstile', undefined, undefined, 0.8, startTime);
    }

    return this.createResult(false, 'cloudflare-turnstile', undefined, undefined, 0.3, startTime, 'Turnstile challenge failed');
  }

  private async solveTextCaptcha(
    captcha: ICaptchaElement,
    startTime: number
  ): Promise<ICaptchaSolveResult> {
    const screenshot = await this.steel.screenshot();
    
    const result = await this.vision.analyze({
      image: screenshot,
      prompt: `This page contains a text-based CAPTCHA question. Find the question and provide the correct answer. Return ONLY the answer, nothing else.`
    });

    const answer = result.text.trim();
    
    if (answer) {
      const inputSelector = this.findCaptchaInput(captcha.selector);
      if (inputSelector) {
        await this.steel.type(inputSelector, answer);
      }
      return this.createResult(true, 'text', answer, undefined, 0.7, startTime);
    }

    return this.createResult(false, 'text', undefined, undefined, 0.3, startTime, 'Could not answer text challenge');
  }

  private async solveWithML(
    captcha: ICaptchaElement,
    startTime: number
  ): Promise<ICaptchaSolveResult> {
    return this.createResult(false, captcha.type, undefined, undefined, 0, startTime, 'ML solver not yet implemented');
  }

  private async solveWithPattern(
    captcha: ICaptchaElement,
    startTime: number
  ): Promise<ICaptchaSolveResult> {
    return this.createResult(false, captcha.type, undefined, undefined, 0, startTime, 'Pattern solver not yet implemented');
  }

  private getMethodOrder(captchaType: ICaptchaElement['type']): ICaptchaSolveResult['method'][] {
    if (this.config.preferredMethod !== 'auto') {
      return [this.config.preferredMethod === 'ai-navigation' ? 'vision' : this.config.preferredMethod];
    }

    switch (captchaType) {
      case 'image':
      case 'text':
        return ['vision', 'ml', 'pattern'];
      case 'recaptcha-v2':
      case 'hcaptcha':
        return ['vision', 'pattern'];
      case 'recaptcha-v3':
      case 'cloudflare-turnstile':
        return ['pattern', 'vision'];
      default:
        return ['vision', 'ml', 'pattern'];
    }
  }

  private findCaptchaInput(captchaSelector: string): string | null {
    const commonInputSelectors = [
      'input[name*="captcha"]',
      'input[id*="captcha"]',
      'input[name*="code"]',
      'input[id*="code"]',
      'input[name*="verify"]',
      'input[type="text"]:not([type="hidden"])'
    ];

    return commonInputSelectors[0];
  }

  private getGridCellSelector(
    cellNumber: number,
    gridSize: { rows: number; cols: number } | null
  ): string {
    const grid = gridSize || { rows: 3, cols: 3 };
    const row = Math.floor((cellNumber - 1) / grid.cols);
    const col = (cellNumber - 1) % grid.cols;

    return `[data-cell="${cellNumber}"], .rc-imageselect-tile:nth-child(${cellNumber}), table tr:nth-child(${row + 1}) td:nth-child(${col + 1})`;
  }

  private createResult(
    success: boolean,
    captchaType: ICaptchaElement['type'],
    solution: string | undefined,
    token: string | undefined,
    confidence: number,
    startTime: number,
    error?: string
  ): ICaptchaSolveResult {
    const completed = Date.now();
    return {
      success,
      captchaType,
      solution,
      token,
      confidence,
      method: 'vision',
      timing: {
        started: startTime,
        completed,
        duration: completed - startTime
      },
      error
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getBrowserClient(): SteelBrowserClient {
    return this.steel;
  }

  getSkyvernClient(): SkyvernClient {
    return this.skyvern;
  }

  getStagehandClient(): StagehandClient {
    return this.stagehand;
  }

  getVisionClient(): VisionClient {
    return this.vision;
  }
}

export function createCaptchaSolver(
  config: Partial<CaptchaSolverConfig> & { visionApiKey: string }
): CaptchaSolver {
  return new CaptchaSolver(config);
}
