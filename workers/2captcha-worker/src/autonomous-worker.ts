import WebSocket from 'ws';
import fetch from 'node-fetch';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

interface SolverResult {
  success: boolean;
  solution?: string;
  confidence: number;
  provider: string;
  method: string;
  durationMs: number;
  error?: string;
}

export class AutonomousCaptchaWorker {
  private cdpWs: WebSocket | null = null;
  private targetId: string | null = null;
  private sessionId: string | null = null;
  private config = {
    steelCdpUrl: process.env.STEEL_CDP_URL || 'ws://localhost:50015/devtools/browser',
    skyvernUrl: process.env.SKYVERN_URL || 'http://localhost:50006',
    ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    opencodeUrl: process.env.OPENCODE_URL || 'http://localhost:50004',
    mistralKey: process.env.MISTRAL_API_KEY || '',
    groqKey: process.env.GROQ_API_KEY || '',
  };

  async solve(url: string, instructions?: string): Promise<SolverResult> {
    const start = Date.now();
    console.log(`🎯 AUTONOMOUS CAPTCHA SOLVER`);
    console.log(`🌐 Target: ${url}`);
    console.log(`📝 Instructions: ${instructions || 'Auto-detect CAPTCHA'}`);
    console.log('');

    try {
      await this.connectCDP();
      await this.navigate(url);
      
      const captchaInfo = await this.detectCaptcha();
      if (!captchaInfo.found) {
        return { success: false, confidence: 0, provider: 'none', method: 'detection', durationMs: Date.now() - start, error: 'No CAPTCHA found' };
      }

      console.log(`✅ CAPTCHA detected: ${captchaInfo.type}`);
      
      const screenshot = await this.captureScreenshot();
      const solution = await this.solveWithChain(screenshot, captchaInfo.type);
      
      if (solution.success && solution.solution) {
        await this.submitSolution(solution.solution, captchaInfo);
      }

      await this.disconnect();
      return { ...solution, durationMs: Date.now() - start };

    } catch (error) {
      await this.disconnect();
      return { success: false, confidence: 0, provider: 'none', method: 'error', durationMs: Date.now() - start, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private async connectCDP(): Promise<void> {
    console.log('🔌 Connecting to Steel Browser CDP...');
    
    const response = await fetch('http://localhost:50015/json/version');
    const version = await response.json() as any;
    console.log(`✅ Browser: ${version.Browser}`);

    const targetsRes = await fetch('http://localhost:50015/json/list');
    const targets = await targetsRes.json() as any[];
    
    let target = targets.find((t: any) => t.type === 'page');
    if (!target) {
      const newRes = await fetch('http://localhost:50015/json/new?about:blank', { method: 'PUT' });
      target = await newRes.json();
    }

    this.targetId = target.id;
    this.cdpWs = new WebSocket(target.webSocketDebuggerUrl);

    return new Promise((resolve, reject) => {
      this.cdpWs!.on('open', () => {
        console.log('✅ CDP Connected');
        this.cdpWs!.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        this.cdpWs!.send(JSON.stringify({ id: 2, method: 'Page.enable' }));
        this.cdpWs!.send(JSON.stringify({ id: 3, method: 'DOM.enable' }));
        resolve();
      });
      this.cdpWs!.on('error', reject);
    });
  }

  private async navigate(url: string): Promise<void> {
    console.log(`🌐 Navigating to: ${url}`);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Navigation timeout')), 30000);
      
      this.cdpWs!.send(JSON.stringify({
        id: 4,
        method: 'Page.navigate',
        params: { url }
      }));

      const handler = (data: any) => {
        const msg = JSON.parse(data.toString());
        if (msg.method === 'Page.loadEventFired') {
          clearTimeout(timeout);
          this.cdpWs!.off('message', handler);
          console.log('✅ Page loaded');
          resolve();
        }
      };

      this.cdpWs!.on('message', handler);
    });
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

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Screenshot timeout')), 10000);

      this.cdpWs!.send(JSON.stringify({
        id: 5,
        method: 'Page.captureScreenshot',
        params: { format: 'png', fullPage: false }
      }));

      const handler = (data: any) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === 5 && msg.result?.data) {
          clearTimeout(timeout);
          this.cdpWs!.off('message', handler);
          resolve(Buffer.from(msg.result.data, 'base64'));
        }
      };

      this.cdpWs!.on('message', handler);
    });
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
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Eval timeout')), 5000);
      
      this.cdpWs!.send(JSON.stringify({
        id: 6,
        method: 'Runtime.evaluate',
        params: { expression, returnByValue: true }
      }));

      const handler = (data: any) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === 6) {
          clearTimeout(timeout);
          this.cdpWs!.off('message', handler);
          resolve(msg.result?.result?.value);
        }
      };

      this.cdpWs!.on('message', handler);
    });
  }

  private async disconnect(): Promise<void> {
    if (this.cdpWs) {
      this.cdpWs.close();
      this.cdpWs = null;
    }
    console.log('🔌 Disconnected');
  }
}

export default AutonomousCaptchaWorker;
