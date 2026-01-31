import fetch from 'node-fetch';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { AutoHealingCDPManager } from './auto-healing-cdp';
import { VisualDebugger } from './visual-debugger';
import { BrowserlessConnectionPool } from './browserless-connection-pool';
import { getRegionConfig, validateRegionConfig, getRegionConfigSummary } from './region-config-parser';

interface SolverResult {
  success: boolean;
  solution?: string;
  confidence: number;
  provider: string;
  method: string;
  durationMs: number;
  error?: string;
  debugTimeline?: string;
}

export class AutonomousCaptchaWorker {
  private cdpManager: AutoHealingCDPManager | null = null;
  private debugger: VisualDebugger | null = null;
  private connectionPool: BrowserlessConnectionPool | null = null;
  private useRegionManager: boolean = false;
  private config = {
    // Using Agent-07 VNC Browser (Browserless - reliable CDP with GUI)
    steelHttpUrl: process.env.STEEL_HTTP_URL || 'http://localhost:50072',
    steelToken: process.env.STEEL_TOKEN || 'delqhi-admin',
    skyvernUrl: process.env.SKYVERN_URL || 'http://localhost:50006',
    ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    opencodeUrl: process.env.OPENCODE_URL || 'http://localhost:50004',
    mistralKey: process.env.MISTRAL_API_KEY || '',
    groqKey: process.env.GROQ_API_KEY || '',
    // Visual Debugger config
    debugEnabled: process.env.DEBUG_SCREENSHOTS !== 'false',
    screenshotDir: process.env.SCREENSHOT_DIR || './screenshots/autonomous',
  };

  async solve(url: string, instructions?: string): Promise<SolverResult> {
    const start = Date.now();
    console.log(`🎯 AUTONOMOUS CAPTCHA SOLVER`);
    console.log(`🌐 Target: ${url}`);
    console.log(`📝 Instructions: ${instructions || 'Auto-detect CAPTCHA'}`);
    console.log('');

    try {
      // Check if region-aware connections are enabled
      const regionConfig = getRegionConfig();
      if (regionConfig.enabled && validateRegionConfig(regionConfig)) {
        console.log('🌍 Region-aware connections ENABLED');
        console.log(getRegionConfigSummary(regionConfig));
        
        this.useRegionManager = true;
        this.connectionPool = new BrowserlessConnectionPool(
          this.config.steelHttpUrl,
          {
            maxTotal: 5,
            acquireTimeoutMs: 30000,
            idleTimeoutMs: 60000,
            healthCheckIntervalMs: 30000,
            enableRegionManager: true,
            regions: regionConfig.regions,
            regionManagerOptions: regionConfig.options
          }
        );
        
        this.setupRegionEventHandlers();
        
        // Get a connection from the pool
        const connection = await this.connectionPool.acquire();
        // Note: The pool manages CDP connections internally
        // We still need cdpManager for the existing methods
        this.cdpManager = new AutoHealingCDPManager({
          httpUrl: this.config.steelHttpUrl,
          token: this.config.steelToken
        });
        await this.cdpManager.connect();
      } else {
        console.log('🔧 Using standard CDP connection (regions disabled)');
        this.useRegionManager = false;
        
        // Initialize CDP Manager (backward compatible)
        this.cdpManager = new AutoHealingCDPManager({
          httpUrl: this.config.steelHttpUrl,
          token: this.config.steelToken
        });
        await this.cdpManager.connect();
      }

      // Initialize Visual Debugger
      this.debugger = new VisualDebugger(this.cdpManager, {
        enabled: this.config.debugEnabled,
        screenshotDir: this.config.screenshotDir
      });

      await this.navigate(url);
      await this.debugger?.captureScreenshot('after-navigation', { url });
      
      const captchaInfo = await this.detectCaptcha();
      if (!captchaInfo.found) {
        await this.debugger?.captureScreenshot('no-captcha-found');
        const timelinePath = this.debugger?.generateHTMLTimeline();
        await this.disconnect();
        return { success: false, confidence: 0, provider: 'none', method: 'detection', durationMs: Date.now() - start, error: 'No CAPTCHA found', debugTimeline: timelinePath };
      }

      console.log(`✅ CAPTCHA detected: ${captchaInfo.type}`);
      await this.debugger?.captureScreenshot('captcha-detected', { url });
      
      const screenshot = await this.captureScreenshot();
      const solution = await this.solveWithChain(screenshot, captchaInfo.type);
      
      if (solution.success && solution.solution) {
        await this.debugger?.captureScreenshot('before-submit', { url });
        await this.submitSolution(solution.solution, captchaInfo);
        await this.debugger?.captureScreenshot('after-submit', { url });
      }

      // Generate debug timeline before disconnecting
      const timelinePath = this.debugger?.generateHTMLTimeline();
      await this.disconnect();
      return { ...solution, durationMs: Date.now() - start, debugTimeline: timelinePath };

    } catch (error) {
      await this.debugger?.captureScreenshot('error', { error: error instanceof Error ? error.message : String(error) });
      const timelinePath = this.debugger?.generateHTMLTimeline();
      await this.disconnect();
      return { success: false, confidence: 0, provider: 'none', method: 'error', durationMs: Date.now() - start, error: error instanceof Error ? error.message : String(error), debugTimeline: timelinePath };
    }
  }

  private async navigate(url: string): Promise<void> {
    console.log(`🌐 Navigating to: ${url}`);
    await this.cdpManager!.navigate(url);
    console.log('✅ Page loaded');
  }

  private async detectCaptcha(): Promise<{ found: boolean; type?: string; selector?: string }> {
    console.log('🔍 Detecting CAPTCHA...');

    const captchaSelectors = [
      { type: 'recaptcha', selector: '.g-recaptcha, iframe[src*="recaptcha"]' },
      { type: 'hcaptcha', selector: '.h-captcha, iframe[src*="hcaptcha"]' },
      { type: 'image', selector: 'img[src*="captcha"], img[alt*="captcha"], .captcha img' },
      { type: 'text', selector: '.captcha-input, input[name*="captcha"], #captcha' }
    ];

    for (const captcha of captchaSelectors) {
      const found = await this.evaluate(`document.querySelector('${captcha.selector}') !== null`);
      if (found) {
        return { found: true, type: captcha.type, selector: captcha.selector };
      }
    }

    return { found: false };
  }

  private async captureScreenshot(): Promise<Buffer> {
    console.log('📸 Capturing screenshot...');
    const result = await this.cdpManager!.sendCommand('Page.captureScreenshot', { format: 'png', fullPage: false });
    return Buffer.from(result.data, 'base64');
  }

  private async solveWithChain(image: Buffer, captchaType: string): Promise<SolverResult> {
    console.log('🧠 Solving with 8-Provider Chain...');
    
    const providers = [
      { name: 'ddddocr', fn: () => this.solveDdddocr(image) },
      { name: 'tesseract', fn: () => this.solveTesseract(image) },
      { name: 'skyvern', fn: () => this.solveSkyvern(image, captchaType) },
      { name: 'ollama', fn: () => this.solveOllama(image) },
      { name: 'opencode', fn: () => this.solveOpencode(image) },
      { name: 'mistral', fn: () => this.solveMistral(image) },
      { name: 'groq', fn: () => this.solveGroq(image) },
    ];

    for (const provider of providers) {
      try {
        console.log(`  Trying ${provider.name}...`);
        const result = await provider.fn();
        if (result.success) {
          console.log(`  ✅ Solved with ${provider.name}: ${result.solution}`);
          return result;
        }
      } catch (err) {
        console.log(`  ❌ ${provider.name} failed`);
      }
    }

    return { success: false, confidence: 0, provider: 'none', method: 'failed', durationMs: 0, error: 'All providers failed' };
  }

  private async solveDdddocr(image: Buffer): Promise<SolverResult> {
    const tmp = `/tmp/cap-${uuidv4()}.png`;
    fs.writeFileSync(tmp, image);
    try {
      const { execSync } = require('child_process');
      const res = execSync(`python3 -c "import ddddocr; ocr=ddddocr.DdddOcr(); print(ocr.classification(open('${tmp}','rb').read()))"`, { encoding: 'utf-8', timeout: 5000 });
      return { success: true, solution: res.trim(), confidence: 0.7, provider: 'ddddocr', method: 'ddddocr', durationMs: 0 };
    } finally { fs.unlinkSync(tmp); }
  }

  private async solveTesseract(image: Buffer): Promise<SolverResult> {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(image);
    await worker.terminate();
    return { success: !!text.trim(), solution: text.trim(), confidence: 0.65, provider: 'tesseract', method: 'tesseract', durationMs: 0 };
  }

  private async solveSkyvern(image: Buffer, captchaType: string): Promise<SolverResult> {
    const tmp = `/tmp/sky-${uuidv4()}.png`;
    fs.writeFileSync(tmp, image);
    try {
      const res = await fetch(`${this.config.skyvernUrl}/api/v1/solve_captcha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_path: tmp, captcha_type: captchaType }),
      });
      if (!res.ok) throw new Error('Skyvern failed');
      const data = await res.json() as any;
      return { success: true, solution: data.solution, confidence: 0.8, provider: 'skyvern', method: 'skyvern', durationMs: 0 };
    } finally { fs.unlinkSync(tmp); }
  }

  private async solveOllama(image: Buffer): Promise<SolverResult> {
    const base64 = image.toString('base64');
    const res = await fetch(`${this.config.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llava', prompt: 'Solve this CAPTCHA. Provide only the text:', images: [base64], stream: false }),
    });
    if (!res.ok) throw new Error('Ollama failed');
    const data = await res.json() as any;
    return { success: true, solution: data.response.trim(), confidence: 0.75, provider: 'ollama', method: 'ollama', durationMs: 0 };
  }

  private async solveOpencode(image: Buffer): Promise<SolverResult> {
    const base64 = image.toString('base64');
    const session = await fetch(`${this.config.opencodeUrl}/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'CAPTCHA' }) });
    const { id } = await session.json() as any;
    
    await fetch(`${this.config.opencodeUrl}/session/${id}/prompt_async`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: { providerID: 'opencode-zen', modelID: 'kimi-k2.5-free' }, parts: [{ type: 'text', text: 'Solve CAPTCHA:' }, { type: 'file', mime: 'image/png', filename: 'cap.png', url: `data:image/png;base64,${base64}` }] }),
    });

    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await fetch(`${this.config.opencodeUrl}/session/${id}/message`);
      const data = await res.json() as any;
      if (data.content && !data.isStreaming) {
        return { success: true, solution: data.content, confidence: 0.75, provider: 'opencode', method: 'opencode', durationMs: 0 };
      }
    }
    throw new Error('Timeout');
  }

  private async solveMistral(image: Buffer): Promise<SolverResult> {
    const base64 = image.toString('base64');
    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.config.mistralKey}` },
      body: JSON.stringify({ model: 'pixtral-12b-2409', messages: [{ role: 'user', content: [{ type: 'text', text: 'Solve CAPTCHA:' }, { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } }] }], max_tokens: 100 }),
    });
    if (!res.ok) throw new Error('Mistral failed');
    const data = await res.json() as any;
    return { success: true, solution: data.choices[0].message.content.trim(), confidence: 0.82, provider: 'mistral', method: 'mistral', durationMs: 0 };
  }

  private async solveGroq(image: Buffer): Promise<SolverResult> {
    const base64 = image.toString('base64');
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.config.groqKey}` },
      body: JSON.stringify({ model: 'llama-3.2-11b-vision-preview', messages: [{ role: 'user', content: [{ type: 'text', text: 'Solve CAPTCHA:' }, { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } }] }], max_tokens: 100 }),
    });
    if (!res.ok) throw new Error('Groq failed');
    const data = await res.json() as any;
    return { success: true, solution: data.choices[0].message.content.trim(), confidence: 0.85, provider: 'groq', method: 'groq', durationMs: 0 };
  }

  private async submitSolution(solution: string, captchaInfo: any): Promise<void> {
    console.log(`📝 Submitting solution: ${solution}`);
    
    if (captchaInfo.type === 'recaptcha') {
      await this.evaluate(`document.getElementById('g-recaptcha-response').value = '${solution}'`);
    } else if (captchaInfo.type === 'hcaptcha') {
      await this.evaluate(`document.getElementById('h-captcha-response').value = '${solution}'`);
    } else {
      const input = await this.evaluate(`document.querySelector('${captchaInfo.selector}')?.tagName`);
      if (input) {
        await this.evaluate(`document.querySelector('${captchaInfo.selector}').value = '${solution}'`);
      }
    }
    
    console.log('✅ Solution submitted');
  }

  private async evaluate(expression: string): Promise<any> {
    const result = await this.cdpManager!.sendCommand('Runtime.evaluate', { expression, returnByValue: true });
    return result.result?.value;
  }

  private setupRegionEventHandlers(): void {
    if (!this.connectionPool) return;
    
    this.connectionPool.on('connectionAcquired', ({ connectionId }: { connectionId: string }) => {
      console.log(`🔗 Connection acquired: ${connectionId}`);
    });
    
    this.connectionPool.on('connectionReleased', ({ connectionId }: { connectionId: string }) => {
      console.log(`🔓 Connection released: ${connectionId}`);
    });
    
    this.connectionPool.on('connectionError', ({ connectionId, error }: { connectionId: string; error: string }) => {
      console.log(`⚠️ Connection error (${connectionId}): ${error}`);
    });
    
    this.connectionPool.on('poolExhausted', () => {
      console.log(`🚨 Connection pool exhausted!`);
    });
  }

  private async disconnect(): Promise<void> {
    if (this.connectionPool) {
      await this.connectionPool.shutdown();
      this.connectionPool = null;
    }
    await this.cdpManager?.disconnect();
    this.cdpManager = null;
    this.debugger = null;
    console.log('🔌 Disconnected');
  }
}

export default AutonomousCaptchaWorker;