/**
 * ULTIMATE CAPTCHA SOLVER - Super Fallback Chain
 * 
 * Nutzt ALLE verfügbaren Ressourcen in Reihenfolge:
 * 1. Groq API (llama-3.2-11b-vision) - Schnell & billig
 * 2. Mistral API (pixtral-12b) - Fallback
 * 3. Skyvern (lokaler Docker) - Visual AI
 * 4. OpenCode Zen (kimi-k2.5-free) - Kostenlos, lokal
 * 5. ddddocr (Python) - Lokale OCR
 * 6. Tesseract.js - Lokale OCR (Node.js)
 * 
 * 🎯 Ziel: 99.9% Solve Rate durch maximale Redundanz!
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface SolverResult {
  success: boolean;
  solution?: string;
  confidence: number;
  provider: string;
  method: 'groq' | 'mistral' | 'skyvern' | 'opencode' | 'ddddocr' | 'tesseract' | 'failed';
  durationMs: number;
  error?: string;
}

export interface SuperSolverConfig {
  groqApiKey?: string;
  mistralApiKey?: string;
  skyvernUrl?: string;
  opencodeUrl?: string;
  enableLocalOCR?: boolean;
  timeoutMs?: number;
}

export class UltimateCaptchaSolver {
  private config: Required<SuperSolverConfig>;
  private attemptCount = 0;

  constructor(config: SuperSolverConfig = {}) {
    this.config = {
      groqApiKey: process.env.GROQ_API_KEY || '',
      mistralApiKey: process.env.MISTRAL_API_KEY || '',
      skyvernUrl: process.env.SKYVERN_URL || 'http://localhost:8030',
      opencodeUrl: process.env.OPENCODE_URL || 'http://localhost:8080',
      enableLocalOCR: true,
      timeoutMs: 30000,
      ...config,
    };
  }

  /**
   * 🎯 ULTIMATE SOLVE - Versucht alle Provider bis einer klappt
   */
  async solve(imageBuffer: Buffer, prompt: string = 'Solve this CAPTCHA. Provide only the text.'): Promise<SolverResult> {
    const startTime = Date.now();
    const providers = [
      { name: 'Groq', method: this.solveWithGroq.bind(this), enabled: !!this.config.groqApiKey },
      { name: 'Mistral', method: this.solveWithMistral.bind(this), enabled: !!this.config.mistralApiKey },
      { name: 'Skyvern', method: this.solveWithSkyvern.bind(this), enabled: true },
      { name: 'OpenCode Zen', method: this.solveWithOpenCode.bind(this), enabled: true },
      { name: 'ddddocr', method: this.solveWithDdddocr.bind(this), enabled: this.config.enableLocalOCR },
      { name: 'Tesseract', method: this.solveWithTesseract.bind(this), enabled: this.config.enableLocalOCR },
    ];

    console.log('🚀 ULTIMATE CAPTCHA SOLVER - Starting chain...');
    console.log(`📊 Available providers: ${providers.filter(p => p.enabled).length}/${providers.length}`);
    console.log('');

    for (const provider of providers) {
      if (!provider.enabled) {
        console.log(`⏭️  Skipping ${provider.name} (not configured)`);
        continue;
      }

      this.attemptCount++;
      console.log(`\n🎯 Attempt ${this.attemptCount}: ${provider.name}`);
      console.log('-'.repeat(50));

      try {
        const result = await provider.method(imageBuffer, prompt);
        
        if (result.success && result.solution) {
          const duration = Date.now() - startTime;
          console.log(`\n✅ SUCCESS with ${provider.name}!`);
          console.log(`   Solution: ${result.solution}`);
          console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
          console.log(`   Duration: ${duration}ms`);
          console.log(`   Attempts: ${this.attemptCount}`);
          
          return {
            ...result,
            durationMs: duration,
          };
        }
      } catch (error) {
        console.warn(`⚠️  ${provider.name} failed:`, error instanceof Error ? error.message : String(error));
      }
    }

    // All failed
    const duration = Date.now() - startTime;
    console.error('\n❌ ALL PROVIDERS FAILED!');
    
    return {
      success: false,
      confidence: 0,
      provider: 'none',
      method: 'failed',
      durationMs: duration,
      error: 'All providers failed to solve CAPTCHA',
    };
  }

  /**
   * 1️⃣ GROQ - Llama Vision
   */
  private async solveWithGroq(imageBuffer: Buffer, prompt: string): Promise<SolverResult> {
    const base64Image = imageBuffer.toString('base64');
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 100,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const solution = data.choices[0].message.content.trim();

    return {
      success: true,
      solution,
      confidence: 0.85,
      provider: 'groq',
      method: 'groq',
      durationMs: 0,
    };
  }

  /**
   * 2️⃣ MISTRAL - Pixtral
   */
  private async solveWithMistral(imageBuffer: Buffer, prompt: string): Promise<SolverResult> {
    const base64Image = imageBuffer.toString('base64');
    
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.mistralApiKey}`,
      },
      body: JSON.stringify({
        model: 'pixtral-12b-2409',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 100,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    const solution = data.choices[0].message.content.trim();

    return {
      success: true,
      solution,
      confidence: 0.82,
      provider: 'mistral',
      method: 'mistral',
      durationMs: 0,
    };
  }

  /**
   * 3️⃣ SKYVERN - Visual AI (lokaler Docker)
   */
  private async solveWithSkyvern(imageBuffer: Buffer, prompt: string): Promise<SolverResult> {
    // Save image temporarily
    const tempFile = `/tmp/skyvern-captcha-${uuidv4()}.png`;
    fs.writeFileSync(tempFile, imageBuffer);

    try {
      // Skyvern solve_captcha endpoint
      const response = await fetch(`${this.config.skyvernUrl}/api/v1/solve_captcha`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_path: tempFile,
          instructions: prompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Skyvern error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        solution: data.solution,
        confidence: data.confidence || 0.80,
        provider: 'skyvern',
        method: 'skyvern',
        durationMs: 0,
      };
    } finally {
      // Cleanup
      try {
        fs.unlinkSync(tempFile);
      } catch {}
    }
  }

  /**
   * 4️⃣ OPENCODE ZEN - kimi-k2.5-free (lokaler Server)
   */
  private async solveWithOpenCode(imageBuffer: Buffer, prompt: string): Promise<SolverResult> {
    const base64Image = imageBuffer.toString('base64');
    
    // Create session
    const sessionRes = await fetch(`${this.config.opencodeUrl}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'CAPTCHA Solver' }),
    });
    
    if (!sessionRes.ok) {
      throw new Error(`OpenCode session error: ${sessionRes.status}`);
    }
    
    const { id: sessionId } = await sessionRes.json();

    // Send prompt with image
    const response = await fetch(
      `${this.config.opencodeUrl}/session/${sessionId}/prompt_async`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: {
            providerID: 'opencode-zen',
            modelID: 'kimi-k2.5-free',
          },
          parts: [
            { type: 'text', text: prompt },
            {
              type: 'file',
              mime: 'image/png',
              filename: 'captcha.png',
              url: `data:image/png;base64,${base64Image}`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`OpenCode API error: ${response.status}`);
    }

    // Poll for result
    const result = await this.pollOpenCodeResult(sessionId);
    
    return {
      success: true,
      solution: result,
      confidence: 0.75,
      provider: 'opencode-zen',
      method: 'opencode',
      durationMs: 0,
    };
  }

  private async pollOpenCodeResult(sessionId: string, maxAttempts = 30): Promise<string> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await fetch(`${this.config.opencodeUrl}/session/${sessionId}/message`);
      if (response.ok) {
        const data = await response.json();
        if (data.content && !data.isStreaming) {
          return data.content;
        }
      }
    }
    
    throw new Error('OpenCode polling timeout');
  }

  /**
   * 5️⃣ DDDDOCR - Python OCR (lokal)
   */
  private async solveWithDdddocr(imageBuffer: Buffer, _prompt: string): Promise<SolverResult> {
    const tempFile = `/tmp/ddddocr-captcha-${uuidv4()}.png`;
    fs.writeFileSync(tempFile, imageBuffer);

    try {
      // Check if ddddocr is available
      execSync('python3 -c "import ddddocr"', { stdio: 'ignore' });
      
      // Run ddddocr
      const result = execSync(
        `python3 -c "
import ddddocr
import sys
ocr = ddddocr.DdddOcr()
with open('${tempFile}', 'rb') as f:
    result = ocr.classification(f.read())
print(result)
"`,
        { encoding: 'utf-8', timeout: 10000 }
      );

      const solution = result.trim();
      
      return {
        success: !!solution,
        solution,
        confidence: 0.70,
        provider: 'ddddocr',
        method: 'ddddocr',
        durationMs: 0,
      };
    } catch (error) {
      throw new Error(`ddddocr failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      try {
        fs.unlinkSync(tempFile);
      } catch {}
    }
  }

  /**
   * 6️⃣ TESSERACT - Node.js OCR (lokal)
   */
  private async solveWithTesseract(imageBuffer: Buffer, _prompt: string): Promise<SolverResult> {
    // Try to use tesseract.js if available
    try {
      // Dynamic import to avoid errors if not installed
      const { createWorker } = await import('tesseract.js');
      
      const worker = await createWorker('eng');
      const {
        data: { text },
      } = await worker.recognize(imageBuffer);
      await worker.terminate();

      const solution = text.trim();
      
      return {
        success: !!solution,
        solution,
        confidence: 0.65,
        provider: 'tesseract',
        method: 'tesseract',
        durationMs: 0,
      };
    } catch (error) {
      throw new Error(`Tesseract failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 📊 Get solver statistics
   */
  getStats(): {
    attemptCount: number;
    availableProviders: number;
    config: SuperSolverConfig;
  } {
    return {
      attemptCount: this.attemptCount,
      availableProviders: [
        !!this.config.groqApiKey,
        !!this.config.mistralApiKey,
        true, // Skyvern
        true, // OpenCode
        this.config.enableLocalOCR, // ddddocr
        this.config.enableLocalOCR, // Tesseract
      ].filter(Boolean).length,
      config: this.config,
    };
  }
}

export default UltimateCaptchaSolver;
