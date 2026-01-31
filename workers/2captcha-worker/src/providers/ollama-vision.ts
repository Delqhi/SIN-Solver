import * as fs from 'fs';
import * as path from 'path';

export interface OllamaVisionConfig {
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export interface OllamaVisionResult {
  solution: string;
  confidence: number;
  rawResponse: string;
  latencyMs: number;
  model: string;
}

export class OllamaVisionProvider {
  private config: Required<OllamaVisionConfig>;

  constructor(config: OllamaVisionConfig = {}) {
    this.config = {
      baseUrl: (config.baseUrl || 'http://localhost:11434').replace(/\/$/, ''),
      model: config.model || 'qwen2-vl',
      timeoutMs: config.timeoutMs || 60000,
      maxRetries: config.maxRetries || 2,
    };
  }

  async initialize(): Promise<boolean> {
    try {
      console.log('Initializing Ollama Vision Provider...');
      const isRunning = await this.checkHealth();
      if (!isRunning) {
        console.error('Ollama is not running');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to initialize Ollama Vision:', error);
      return false;
    }
  }

  async solveCaptcha(imagePath: string): Promise<OllamaVisionResult> {
    const startTime = Date.now();
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    
    const response = await this.sendVisionRequest(base64Image);
    const solution = this.extractSolution(response.response);
    const confidence = this.calculateConfidence(response.response);

    return {
      solution,
      confidence,
      rawResponse: JSON.stringify(response),
      latencyMs: Date.now() - startTime,
      model: this.config.model,
    };
  }

  async solveCaptchaFromBuffer(imageBuffer: Buffer): Promise<OllamaVisionResult> {
    const startTime = Date.now();
    const base64Image = imageBuffer.toString('base64');
    
    const response = await this.sendVisionRequest(base64Image);
    const solution = this.extractSolution(response.response);
    const confidence = this.calculateConfidence(response.response);

    return {
      solution,
      confidence,
      rawResponse: JSON.stringify(response),
      latencyMs: Date.now() - startTime,
      model: this.config.model,
    };
  }

  private async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async sendVisionRequest(base64Image: string): Promise<any> {
    const prompt = `You are a CAPTCHA solving expert. Analyze this image and extract the text/code shown in the CAPTCHA.

Rules:
1. Return ONLY the CAPTCHA text/code
2. No explanations, no markdown
3. If unclear, return "UNCLEAR"
4. For image grids (hCaptcha), list all images containing the target (e.g., "1,3,5")
5. For math CAPTCHAs, solve the equation and return the result

What is the CAPTCHA solution?`;

    const response = await fetch(`${this.config.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        prompt: prompt,
        images: [base64Image],
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 50,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    return await response.json();
  }

  private extractSolution(response: string): string {
    let solution = response.trim();
    solution = solution.replace(/^(the\s+captcha\s+(is|solution\s+is)\s*:?\s*)/i, '');
    solution = solution.replace(/^(answer\s*:?\s*)/i, '');
    solution = solution.replace(/^(solution\s*:?\s*)/i, '');
    solution = solution.replace(/[`"']/g, '');
    return solution.trim();
  }

  private calculateConfidence(response: string): number {
    const text = response.toLowerCase();
    if (text.includes('unclear') || text.includes('cannot') || text.includes('unable')) {
      return 0.3;
    }
    if (text.includes('maybe') || text.includes('possibly') || text.includes('likely')) {
      return 0.6;
    }
    return 0.85;
  }

  async dispose(): Promise<void> {
    // No cleanup needed for local API
  }
}

export default OllamaVisionProvider;
