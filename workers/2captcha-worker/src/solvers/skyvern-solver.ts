/**
 * Agent 1: Skyvern Vision Solver
 * Verwendet Browser-Automation mit Vision AI zur CAPTCHA-Lösung
 */

import { ICapatchaSolver, SolverResult, SkyvernConfig } from './types';

export class SkyvernSolver implements ICapatchaSolver {
  name = 'skyvern-vision';
  private config: SkyvernConfig;
  private timeout: number;

  constructor(config: SkyvernConfig = {}) {
    this.config = {
      apiUrl: config.apiUrl || process.env.SKYVERN_API_URL || 'http://localhost:3000',
      apiKey: config.apiKey || process.env.SKYVERN_API_KEY || '',
      timeout: config.timeout || 30000,
    };
    this.timeout = this.config.timeout!;
  }

  /**
   * Löst CAPTCHA mit Skyvern Vision Agent
   * @param captchaImage Buffer mit CAPTCHA-Bild
   * @returns SolverResult mit Antwort und Konfidenz
   */
  async solve(captchaImage: Buffer): Promise<SolverResult> {
    const startTime = Date.now();

    try {
      // Konvertiere Buffer zu Base64 für API-Transfer
      const base64Image = captchaImage.toString('base64');

      // Erstelle Request für Skyvern Vision API
      const response = await this.callSkyvernAPI(base64Image);

      const time = Date.now() - startTime;

      // Parse Skyvern Response
      if (response.success && response.answer) {
        return {
          answer: response.answer,
          confidence: response.confidence || 0.85,
          model: 'skyvern-vision-ai',
          time,
        };
      } else {
        throw new Error(response.error || 'Skyvern Vision konnte CAPTCHA nicht lösen');
      }
    } catch (error) {
      const time = Date.now() - startTime;
      console.error('[SkyvernSolver] Fehler:', error);

      return {
        answer: '',
        confidence: 0,
        model: 'skyvern-vision-ai',
        time,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      };
    }
  }

  /**
   * Ruft Skyvern Vision API auf
   * @private
   */
  private async callSkyvernAPI(base64Image: string): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.config.apiUrl}/api/solve-captcha`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          image: base64Image,
          captchaType: 'image',
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Skyvern API returned ${response.status}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Factory function für Skyvern Solver
 */
export function createSkyvernSolver(config?: SkyvernConfig): SkyvernSolver {
  return new SkyvernSolver(config);
}
