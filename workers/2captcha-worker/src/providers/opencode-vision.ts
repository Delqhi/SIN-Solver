/**
 * OpenCode Vision Provider
 * 
 * Uses opencode serve HTTP API for vision-based CAPTCHA solving.
 * No browser automation needed - direct API calls!
 * 
 * 🎯 Architecture:
 * - opencode serve (localhost:8080) - Headless API server
 * - Kimi K2.5 Free - Vision model via OpenCode
 * - HTTP API - Direct communication, no browser overhead
 * 
 * Advantages over browser-based solutions:
 * ✅ 10x faster (no browser startup)
 * ✅ No browser detection issues
 * ✅ Direct API calls
 * ✅ Kimi K2.5 Free (no API costs)
 * ✅ Parallel requests supported
 */

import * as fs from 'fs';
import * as path from 'path';

export interface OpenCodeVisionConfig {
  baseUrl: string;           // e.g., http://localhost:8080
  model?: string;            // e.g., "kimi-k2.5-free"
  timeoutMs?: number;        // Request timeout
  maxRetries?: number;       // Retry attempts
}

export interface OpenCodeVisionResult {
  solution: string;
  confidence: number;
  rawResponse: string;
  latencyMs: number;
  model: string;
}

export interface OpenCodeSession {
  id: string;
  title: string;
  createdAt: string;
}

export interface OpenCodeMessage {
  info: {
    id: string;
    role: string;
    content?: string;
    time?: {
      created?: number;
      updated?: number;
    };
  };
  parts: Array<{
    type: string;
    content?: string;
    mimeType?: string;
  }>;
}

/**
 * OpenCode Vision Provider
 * Solves CAPTCHAs using opencode serve API with Kimi vision
 */
export class OpenCodeVisionProvider {
  private config: Required<OpenCodeVisionConfig>;
  private sessionId: string | null = null;

  constructor(config: OpenCodeVisionConfig) {
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ''), // Remove trailing slash
      model: config.model || 'kimi-k2.5-free',
      timeoutMs: config.timeoutMs || 30000,
      maxRetries: config.maxRetries || 3,
    };
  }

  /**
   * Initialize provider and create session
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔌 Initializing OpenCode Vision Provider...');
      console.log(`   API URL: ${this.config.baseUrl}`);
      console.log(`   Model: ${this.config.model}`);

      // Check server health
      const health = await this.checkHealth();
      if (!health.healthy) {
        console.error('❌ OpenCode server not healthy');
        return false;
      }

      // Create session
      const session = await this.createSession('CAPTCHA Solver');
      this.sessionId = session.id;

      console.log(`✅ OpenCode Vision Provider initialized`);
      console.log(`   Session: ${this.sessionId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize OpenCode Vision:', error);
      return false;
    }
  }

  /**
   * Solve CAPTCHA from image file
   */
  async solveCaptcha(imagePath: string): Promise<OpenCodeVisionResult> {
    const startTime = Date.now();

    try {
      // Read image and convert to base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeType(imagePath);

      // Send vision request
      const message = await this.sendVisionMessage(base64Image, mimeType);

      // Extract solution from response
      const solution = this.extractSolution(message);
      const confidence = this.calculateConfidence(message);

      const latencyMs = Date.now() - startTime;

      return {
        solution,
        confidence,
        rawResponse: JSON.stringify(message),
        latencyMs,
        model: this.config.model,
      };
    } catch (error) {
      console.error('❌ CAPTCHA solving failed:', error);
      throw error;
    }
  }

  /**
   * Solve CAPTCHA from buffer
   */
  async solveCaptchaFromBuffer(
    imageBuffer: Buffer,
    mimeType: string = 'image/png'
  ): Promise<OpenCodeVisionResult> {
    const startTime = Date.now();

    try {
      // Convert to base64
      const base64Image = imageBuffer.toString('base64');

      // Send vision request
      const message = await this.sendVisionMessage(base64Image, mimeType);

      // Extract solution
      const solution = this.extractSolution(message);
      const confidence = this.calculateConfidence(message);

      const latencyMs = Date.now() - startTime;

      return {
        solution,
        confidence,
        rawResponse: JSON.stringify(message),
        latencyMs,
        model: this.config.model,
      };
    } catch (error) {
      console.error('❌ CAPTCHA solving failed:', error);
      throw error;
    }
  }

  /**
   * Check server health
   */
  private async checkHealth(): Promise<{ healthy: boolean; version?: string }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/global/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        return { healthy: false };
      }

      const data = await response.json();
      return { healthy: data.healthy, version: data.version };
    } catch (error) {
      return { healthy: false };
    }
  }

  /**
   * Create new session
   */
  private async createSession(title: string): Promise<OpenCodeSession> {
    const response = await fetch(`${this.config.baseUrl}/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Send vision message with image and wait for async response
   */
  private async sendVisionMessage(
    base64Image: string,
    mimeType: string
  ): Promise<OpenCodeMessage> {
    if (!this.sessionId) {
      throw new Error('Provider not initialized');
    }

    const prompt = `You are a CAPTCHA solving expert. Analyze this image and extract the text/code shown in the CAPTCHA.

Rules:
1. Return ONLY the CAPTCHA text/code
2. No explanations, no markdown
3. If unclear, return "UNCLEAR"
4. For image grids (hCaptcha), list all images containing the target (e.g., "1,3,5")
5. For math CAPTCHAs, solve the equation and return the result

What is the CAPTCHA solution?`;

    const startTime = Date.now();
    
    // Use async endpoint (returns immediately)
    const response = await fetch(
      `${this.config.baseUrl}/session/${this.sessionId}/prompt_async`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: {
            providerID: 'opencode-zen',
            modelID: this.config.model,
          },
          parts: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image',
              content: base64Image,
              mimeType: mimeType,
            },
          ],
        }),
      }
    );

    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to send message: ${response.status}`);
    }

    // Poll for response
    return await this.waitForResponse(startTime);
  }

  /**
   * Poll for async response
   */
  private async waitForResponse(
    startTime: number,
    maxWaitMs: number = 60000,
    pollIntervalMs: number = 1000
  ): Promise<OpenCodeMessage> {

    while (Date.now() - startTime < maxWaitMs) {
      const messages = await this.getMessages();

      const assistantMessage = messages.find(
        (msg) => msg.info.role === 'assistant' &&
          (msg.info.time?.created ?? 0) > startTime
      );

      if (assistantMessage) {
        return assistantMessage;
      }

      await this.sleep(pollIntervalMs);
    }

    throw new Error(`Timeout waiting for response after ${maxWaitMs}ms`);
  }

  /**
   * Get all messages from session
   */
  private async getMessages(): Promise<OpenCodeMessage[]> {
    if (!this.sessionId) {
      throw new Error('Provider not initialized');
    }

    const response = await fetch(
      `${this.config.baseUrl}/session/${this.sessionId}/message?limit=20`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get messages: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Extract solution from message response
   */
  private extractSolution(message: OpenCodeMessage): string {
    // Extract text from all parts
    const textParts = message.parts
      .filter((part) => part.type === 'text' || part.type === 'markdown')
      .map((part) => part.content || '')
      .join(' ');

    // Clean up the response
    let solution = textParts.trim();

    // Remove common prefixes/suffixes
    solution = solution.replace(/^(the\s+captcha\s+(is|solution\s+is)\s*:?\s*)/i, '');
    solution = solution.replace(/^(answer\s*:?\s*)/i, '');
    solution = solution.replace(/^(solution\s*:?\s*)/i, '');
    solution = solution.replace(/[`"']/g, ''); // Remove quotes

    return solution.trim();
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(message: OpenCodeMessage): number {
    const text = message.parts
      .map((part) => part.content || '')
      .join(' ')
      .toLowerCase();

    // Lower confidence for uncertain responses
    if (text.includes('unclear') || text.includes('cannot') || text.includes('unable')) {
      return 0.3;
    }

    if (text.includes('maybe') || text.includes('possibly') || text.includes('likely')) {
      return 0.6;
    }

    // High confidence for clear answers
    if (text.length > 0 && text.length < 20) {
      return 0.9;
    }

    return 0.7;
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    return mimeTypes[ext] || 'image/png';
  }

  /**
   * Dispose provider and cleanup
   */
  async dispose(): Promise<void> {
    if (this.sessionId) {
      try {
        await fetch(`${this.config.baseUrl}/session/${this.sessionId}`, {
          method: 'DELETE',
        });
        console.log('🧹 OpenCode session cleaned up');
      } catch (error) {
        console.warn('⚠️  Failed to cleanup session:', error);
      }
    }
  }
}

export default OpenCodeVisionProvider;
