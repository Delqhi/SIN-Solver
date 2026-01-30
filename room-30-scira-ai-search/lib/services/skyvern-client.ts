/**
 * 🦅 Skyvern Client - Visual AI Integration for Scira
 * 
 * Provides visual analysis, CAPTCHA solving, and login form detection
 * by connecting to the Skyvern Solver service (agent-06-skyvern-solver)
 * 
 * @author SIN-Solver Team
 * @version 1.0.0
 * @since 2026-01-30
 */

import { z } from 'zod';

// Configuration schema
const SkyvernConfigSchema = z.object({
  baseUrl: z.string().url().default('http://agent-06-skyvern-solver:8030'),
  timeout: z.number().default(60000),
  apiKey: z.string().optional(),
});

type SkyvernConfig = z.infer<typeof SkyvernConfigSchema>;

// Response schemas
const LoginFormAnalysisSchema = z.object({
  hasLoginForm: z.boolean(),
  usernameSelector: z.string().optional(),
  passwordSelector: z.string().optional(),
  submitSelector: z.string().optional(),
  confidence: z.number().min(0).max(1),
  formType: z.enum(['standard', 'oauth', 'sso', 'multi-step']).optional(),
});

const TwoFactorAnalysisSchema = z.object({
  has2FA: z.boolean(),
  method: z.enum(['totp', 'sms', 'email', 'authenticator_app']).optional(),
  codeInputSelector: z.string().optional(),
  submitSelector: z.string().optional(),
});

const CaptchaSolutionSchema = z.object({
  solution: z.string(),
  confidence: z.number().min(0).max(1),
  type: z.string(),
});

const CoordinatesResultSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  confidence: z.number(),
});

export type LoginFormAnalysis = z.infer<typeof LoginFormAnalysisSchema>;
export type TwoFactorAnalysis = z.infer<typeof TwoFactorAnalysisSchema>;
export type CaptchaSolution = z.infer<typeof CaptchaSolutionSchema>;
export type CoordinatesResult = z.infer<typeof CoordinatesResultSchema>;

/**
 * SkyvernClient - Visual AI automation client
 */
export class SkyvernClient {
  private config: SkyvernConfig;

  constructor(config: Partial<SkyvernConfig> = {}) {
    this.config = SkyvernConfigSchema.parse({
      baseUrl: process.env.SKYVERN_API_URL || 'http://agent-06-skyvern-solver:8030',
      timeout: 60000,
      ...config,
    });
  }

  /**
   * Analyze a screenshot to detect login forms
   * 
   * @param screenshotBase64 - Base64 encoded screenshot
   * @returns Login form analysis with selectors and confidence
   */
  async analyzeLoginForm(screenshotBase64: string): Promise<LoginFormAnalysis> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify({
        screenshot: screenshotBase64,
        task: 'detect_login_form',
      }),
    });

    if (!response.ok) {
      throw new Error(`Skyvern login form analysis failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return LoginFormAnalysisSchema.parse(data);
  }

  /**
   * Detect if 2FA is required after login attempt
   * 
   * @param screenshotBase64 - Base64 encoded screenshot
   * @returns 2FA detection result
   */
  async detect2FA(screenshotBase64: string): Promise<TwoFactorAnalysis> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify({
        screenshot: screenshotBase64,
        task: 'detect_2fa',
      }),
    });

    if (!response.ok) {
      throw new Error(`Skyvern 2FA detection failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return TwoFactorAnalysisSchema.parse(data);
  }

  /**
   * Analyze 2FA form to get input selectors
   * 
   * @param screenshotBase64 - Base64 encoded screenshot
   * @returns Detailed 2FA form analysis
   */
  async analyze2FAForm(screenshotBase64: string): Promise<TwoFactorAnalysis> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify({
        screenshot: screenshotBase64,
        task: 'analyze_2fa_form',
      }),
    });

    if (!response.ok) {
      throw new Error(`Skyvern 2FA form analysis failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return TwoFactorAnalysisSchema.parse(data);
  }

  /**
   * Generate TOTP code from secret
   * 
   * @param secret - TOTP secret key
   * @returns Generated TOTP code
   */
  async generateTOTP(secret: string): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/totp/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify({ secret }),
    });

    if (!response.ok) {
      throw new Error(`Skyvern TOTP generation failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return z.object({ code: z.string() }).parse(data).code;
  }

  /**
   * Solve CAPTCHA from image
   * 
   * @param imageBase64 - Base64 encoded CAPTCHA image
   * @param type - CAPTCHA type (recaptcha, hcaptcha, image, audio)
   * @returns CAPTCHA solution
   */
  async solveCaptcha(imageBase64: string, type: string): Promise<CaptchaSolution> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/solve-captcha`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify({
        image: imageBase64,
        type,
      }),
    });

    if (!response.ok) {
      throw new Error(`Skyvern CAPTCHA solving failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return CaptchaSolutionSchema.parse(data);
  }

  /**
   * Get click coordinates for an element based on visual description
   * 
   * @param screenshotBase64 - Base64 encoded screenshot
   * @param targetDescription - Description of element to find (e.g., "Login button")
   * @returns Coordinates for clicking
   */
  async getClickCoordinates(
    screenshotBase64: string,
    targetDescription: string
  ): Promise<CoordinatesResult | null> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/extract-coordinates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify({
        screenshot: screenshotBase64,
        target: targetDescription,
      }),
    });

    if (!response.ok) {
      throw new Error(`Skyvern coordinate extraction failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.coordinates) {
      return null;
    }

    return CoordinatesResultSchema.parse(data.coordinates);
  }

  /**
   * Navigate and solve a task autonomously
   * 
   * @param url - Target URL
   * @param task - Task description (e.g., "Login with username X and password Y")
   * @param sessionContext - Optional session context for continuity
   * @returns Navigation result
   */
  async navigateAndSolve(
    url: string,
    task: string,
    sessionContext?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/navigate-and-solve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify({
        url,
        goal: task,
        session_context: sessionContext,
        stealth: true,
        model: 'gemini-3-flash',
      }),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Skyvern navigation failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Health check for Skyvern service
   * 
   * @returns true if service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const skyvernClient = new SkyvernClient();

// Export factory function for custom instances
export function createSkyvernClient(config?: Partial<SkyvernConfig>): SkyvernClient {
  return new SkyvernClient(config);
}
