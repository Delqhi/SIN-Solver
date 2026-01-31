/**
 * Agent 2: GPT-4V / Claude Vision Solver
 * Verwendet Vision Language Models (OpenAI GPT-4V oder Anthropic Claude) für CAPTCHA-Lösung
 */

import { ICapatchaSolver, SolverResult, VisionModelConfig } from './types';

export class VisionModelSolver implements ICapatchaSolver {
  name = 'vision-model-gpt4v-claude';
  private config: VisionModelConfig;
  private timeout: number;

  constructor(config?: VisionModelConfig) {
    this.config = config || {
      provider: (process.env.VISION_PROVIDER as 'openai' | 'anthropic') || 'openai',
      apiKey: process.env.VISION_API_KEY || '',
      model: process.env.VISION_MODEL || 'gpt-4-vision-preview',
      timeout: parseInt(process.env.VISION_TIMEOUT || '30000'),
    };
    this.timeout = this.config.timeout || 30000;
  }

  /**
   * Löst CAPTCHA mit Vision Language Model
   * Unterstützt sowohl OpenAI als auch Anthropic APIs
   * @param captchaImage Buffer mit CAPTCHA-Bild
   * @returns SolverResult mit Antwort und Konfidenz
   */
  async solve(captchaImage: Buffer): Promise<SolverResult> {
    const startTime = Date.now();

    try {
      const base64Image = captchaImage.toString('base64');

      let result: any;

      if (this.config.provider === 'openai') {
        result = await this.solveWithOpenAI(base64Image);
      } else if (this.config.provider === 'anthropic') {
        result = await this.solveWithAnthropic(base64Image);
      } else {
        throw new Error(`Unsupported provider: ${this.config.provider}`);
      }

      const time = Date.now() - startTime;

      return {
        answer: result.answer || '',
        confidence: result.confidence || 0.8,
        model: `${this.config.provider}-${this.config.model}`,
        time,
      };
    } catch (error) {
      const time = Date.now() - startTime;
      console.error('[VisionModelSolver] Fehler:', error);

      return {
        answer: '',
        confidence: 0,
        model: `${this.config.provider}-${this.config.model}`,
        time,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      };
    }
  }

  /**
   * Löst CAPTCHA mit OpenAI GPT-4V
   * @private
   */
  private async solveWithOpenAI(base64Image: string): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'This is a CAPTCHA image. Read and extract the text/numbers shown in this image. Reply with ONLY the text, no explanation.',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 100,
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`OpenAI API returned ${response.status}`);
      }

      const data = await response.json();
      const answer = data.choices[0].message.content.trim();

      return {
        answer,
        confidence: 0.9, // GPT-4V hat generell hohe Accuracy
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Löst CAPTCHA mit Anthropic Claude Vision
   * @private
   */
  private async solveWithAnthropic(base64Image: string): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: 100,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: base64Image,
                  },
                },
                {
                  type: 'text',
                  text: 'This is a CAPTCHA image. Read and extract the text/numbers shown in this image. Reply with ONLY the text, no explanation.',
                },
              ],
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Anthropic API returned ${response.status}`);
      }

      const data = await response.json();
      const answer = data.content[0].text.trim();

      return {
        answer,
        confidence: 0.85, // Claude Vision hat sehr hohe Accuracy
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Factory function für Vision Model Solver
 */
export function createVisionModelSolver(config?: VisionModelConfig): VisionModelSolver {
  return new VisionModelSolver(config);
}
