import { z } from 'zod';

const SkyvernConfigSchema = z.object({
  baseUrl: z.string().url().default('http://agent-06-skyvern-solver:8030'),
  timeout: z.number().default(60000),
  apiKey: z.string().optional(),
});

type SkyvernConfig = z.infer<typeof SkyvernConfigSchema>;

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

export class SkyvernClient {
  private config: SkyvernConfig;

  constructor(config: Partial<SkyvernConfig> = {}) {
    this.config = SkyvernConfigSchema.parse({
      baseUrl: process.env.SKYVERN_API_URL || 'http://agent-06-skyvern-solver:8030',
      timeout: 60000,
      ...config,
    });
  }

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

export const skyvernClient = new SkyvernClient();

export function createSkyvernClient(config?: Partial<SkyvernConfig>): SkyvernClient {
  return new SkyvernClient(config);
}
