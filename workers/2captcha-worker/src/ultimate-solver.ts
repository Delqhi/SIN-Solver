import { execSync } from 'child_process';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface SolverResult {
  success: boolean;
  solution?: string;
  confidence: number;
  provider: string;
  method: string;
  durationMs: number;
  error?: string;
}

export class UltimateCaptchaSolver {
  private config = {
    ddddocrEnabled: true,
    tesseractEnabled: true,
    skyvernUrl: process.env.SKYVERN_URL || 'http://localhost:8030',
    ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    opencodeUrl: process.env.OPENCODE_URL || 'http://localhost:8080',
    mistralKey: process.env.MISTRAL_API_KEY || '',
    groqKey: process.env.GROQ_API_KEY || '',
    stagehandUrl: process.env.STAGEHAND_URL || 'http://localhost:3000',
  };

  async solve(imageBuffer: Buffer): Promise<SolverResult> {
    const start = Date.now();
    const providers = [
      { name: 'ddddocr', fn: this.solveDdddocr },
      { name: 'tesseract', fn: this.solveTesseract },
      { name: 'skyvern', fn: this.solveSkyvern },
      { name: 'ollama', fn: this.solveOllama },
      { name: 'opencode', fn: this.solveOpencode },
      { name: 'mistral', fn: this.solveMistral },
      { name: 'groq', fn: this.solveGroq },
      { name: 'stagehand', fn: this.solveStagehand },
    ];

    for (const p of providers) {
      try {
        const result = await p.fn.call(this, imageBuffer);
        if (result.success) {
          return { ...result, durationMs: Date.now() - start };
        }
      } catch {}
    }

    return { success: false, confidence: 0, provider: 'none', method: 'failed', durationMs: Date.now() - start, error: 'All failed' };
  }

  private async solveDdddocr(image: Buffer): Promise<SolverResult> {
    const tmp = `/tmp/cap-${uuidv4()}.png`;
    fs.writeFileSync(tmp, image);
    try {
      execSync('python3 -c "import ddddocr"', { stdio: 'ignore' });
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

  private async solveSkyvern(image: Buffer): Promise<SolverResult> {
    const tmp = `/tmp/sky-${uuidv4()}.png`;
    fs.writeFileSync(tmp, image);
    try {
      const res = await fetch(`${this.config.skyvernUrl}/api/v1/solve_captcha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_path: tmp, instructions: 'Solve CAPTCHA' }),
      });
      if (!res.ok) throw new Error('Skyvern failed');
      const data = await res.json();
      return { success: true, solution: data.solution, confidence: 0.8, provider: 'skyvern', method: 'skyvern', durationMs: 0 };
    } finally { fs.unlinkSync(tmp); }
  }

  private async solveOllama(image: Buffer): Promise<SolverResult> {
    const base64 = image.toString('base64');
    const res = await fetch(`${this.config.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2-vl-7b',
        prompt: 'Solve this CAPTCHA. Provide only the text:',
        images: [base64],
        stream: false,
      }),
    });
    if (!res.ok) throw new Error('Ollama failed');
    const data = await res.json();
    return { success: true, solution: data.response.trim(), confidence: 0.75, provider: 'ollama', method: 'ollama', durationMs: 0 };
  }

  private async solveOpencode(image: Buffer): Promise<SolverResult> {
    const base64 = image.toString('base64');
    const session = await fetch(`${this.config.opencodeUrl}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'CAPTCHA' }),
    });
    const { id } = await session.json();
    
    await fetch(`${this.config.opencodeUrl}/session/${id}/prompt_async`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: { providerID: 'opencode-zen', modelID: 'kimi-k2.5-free' },
        parts: [
          { type: 'text', text: 'Solve CAPTCHA:' },
          { type: 'file', mime: 'image/png', filename: 'cap.png', url: `data:image/png;base64,${base64}` },
        ],
      }),
    });

    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await fetch(`${this.config.opencodeUrl}/session/${id}/message`);
      const data = await res.json();
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
      body: JSON.stringify({
        model: 'pixtral-12b-2409',
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Solve CAPTCHA:' }, { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } }] }],
        max_tokens: 100,
      }),
    });
    if (!res.ok) throw new Error('Mistral failed');
    const data = await res.json();
    return { success: true, solution: data.choices[0].message.content.trim(), confidence: 0.82, provider: 'mistral', method: 'mistral', durationMs: 0 };
  }

  private async solveGroq(image: Buffer): Promise<SolverResult> {
    const base64 = image.toString('base64');
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.config.groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-preview',
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Solve CAPTCHA:' }, { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } }] }],
        max_tokens: 100,
      }),
    });
    if (!res.ok) throw new Error('Groq failed');
    const data = await res.json();
    return { success: true, solution: data.choices[0].message.content.trim(), confidence: 0.85, provider: 'groq', method: 'groq', durationMs: 0 };
  }

  private async solveStagehand(image: Buffer): Promise<SolverResult> {
    const base64 = image.toString('base64');
    const res = await fetch(`${this.config.stagehandUrl}/api/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, task: 'Solve CAPTCHA' }),
    });
    if (!res.ok) throw new Error('Stagehand failed');
    const data = await res.json();
    return { success: true, solution: data.solution, confidence: 0.8, provider: 'stagehand', method: 'stagehand', durationMs: 0 };
  }
}

export default UltimateCaptchaSolver;
