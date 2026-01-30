import { steelClient, Cookie, SessionConfig } from './steel-client';
import { skyvernClient } from './skyvern-client';
import { redis } from '@/lib/db';

export interface Credentials {
  username: string;
  password: string;
  totpSecret?: string;
}

export interface AuthenticateResult {
  success: boolean;
  sessionId?: string;
  content?: any;
  requires2FA?: boolean;
  captchaDetected?: boolean;
  error?: string;
}

export interface ScrapeResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface SessionStatus {
  success: boolean;
  data?: {
    isActive: boolean;
    url?: string;
    cookies?: Cookie[];
  };
  error?: string;
}

export interface CreateSessionOptions {
  url: string;
  headless?: boolean;
  proxy?: SessionConfig['proxy'];
  fingerprint?: SessionConfig['fingerprint'];
  userId?: string;
}

export interface CreateSessionResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

export class AuthScrapingService {
  async authenticateAndScrape(
    url: string,
    credentials: Credentials,
    userId?: string
  ): Promise<AuthenticateResult> {
    let sessionId: string | undefined;

    try {
      sessionId = await steelClient.createSession({
        headless: true,
        stealth: true,
      });

      await steelClient.navigate(sessionId, url, 'networkidle');

      const screenshot = await steelClient.screenshot(sessionId);
      const loginAnalysis = await skyvernClient.analyzeLoginForm(screenshot);

      if (!loginAnalysis.hasLoginForm) {
        await steelClient.close(sessionId);
        return {
          success: false,
          error: 'No login form detected on the page',
        };
      }

      if (loginAnalysis.usernameSelector) {
        await steelClient.type(sessionId, loginAnalysis.usernameSelector, credentials.username);
      }

      if (loginAnalysis.passwordSelector) {
        await steelClient.type(sessionId, loginAnalysis.passwordSelector, credentials.password);
      }

      if (loginAnalysis.submitSelector) {
        await steelClient.click(sessionId, loginAnalysis.submitSelector, true);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      const postLoginScreenshot = await steelClient.screenshot(sessionId);
      const twoFactorAnalysis = await skyvernClient.detect2FA(postLoginScreenshot);

      if (twoFactorAnalysis.has2FA) {
        if (credentials.totpSecret && twoFactorAnalysis.method === 'totp') {
          const code = await skyvernClient.generateTOTP(credentials.totpSecret);
          
          if (twoFactorAnalysis.codeInputSelector) {
            await steelClient.type(sessionId, twoFactorAnalysis.codeInputSelector, code);
          }
          
          if (twoFactorAnalysis.submitSelector) {
            await steelClient.click(sessionId, twoFactorAnalysis.submitSelector, true);
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          if (userId && sessionId) {
            await this.saveSession(sessionId, url, userId);
          }

          return {
            success: false,
            sessionId,
            requires2FA: true,
            error: '2FA required but no TOTP secret provided',
          };
        }
      }

      const captchaAnalysis = await skyvernClient.solveCaptcha(postLoginScreenshot, 'image');
      
      if (captchaAnalysis.confidence > 0.5) {
        if (userId && sessionId) {
          await this.saveSession(sessionId, url, userId);
        }

        return {
          success: false,
          sessionId,
          captchaDetected: true,
          error: 'CAPTCHA detected and requires solving',
        };
      }

      const pageState = await steelClient.getPageState(sessionId);
      const cookies = await steelClient.getCookies(sessionId);

      if (userId && sessionId) {
        await this.saveSession(sessionId, url, userId, cookies);
      }

      return {
        success: true,
        sessionId,
        content: {
          url: pageState.url,
          title: pageState.title,
          html: pageState.html,
          cookies,
        },
      };
    } catch (error) {
      if (sessionId) {
        await steelClient.close(sessionId);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  }

  async scrapeContent(
    sessionId: string,
    url: string,
    selectors?: string[]
  ): Promise<ScrapeResult> {
    try {
      await steelClient.navigate(sessionId, url, 'networkidle');
      const pageState = await steelClient.getPageState(sessionId);

      let extractedData: any = {
        url: pageState.url,
        title: pageState.title,
        html: pageState.html,
      };

      if (selectors && selectors.length > 0) {
        const selectorData: Record<string, any> = {};
        
        for (const selector of selectors) {
          try {
            const elements = await steelClient.evaluate<
              Array<{ text: string; href?: string; src?: string }>
            >(
              sessionId,
              `
                Array.from(document.querySelectorAll('${selector}')).map(el => ({
                  text: el.textContent?.trim(),
                  href: el.href,
                  src: el.src,
                }))
              `
            );
            selectorData[selector] = elements;
          } catch (e) {
            selectorData[selector] = { error: 'Selector not found' };
          }
        }

        extractedData.selectors = selectorData;
      }

      return {
        success: true,
        data: extractedData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Scraping failed',
      };
    }
  }

  async solveCaptcha(
    sessionId: string,
    type: string = 'image'
  ): Promise<{ success: boolean; solution?: string; error?: string }> {
    try {
      const screenshot = await steelClient.screenshot(sessionId);
      const solution = await skyvernClient.solveCaptcha(screenshot, type);

      if (solution.confidence > 0.5) {
        return {
          success: true,
          solution: solution.solution,
        };
      } else {
        return {
          success: false,
          error: 'CAPTCHA solution confidence too low',
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'CAPTCHA solving failed',
      };
    }
  }

  async handle2FA(
    sessionId: string,
    code: string
  ): Promise<ScrapeResult> {
    try {
      const screenshot = await steelClient.screenshot(sessionId);
      const twoFactorAnalysis = await skyvernClient.analyze2FAForm(screenshot);

      if (!twoFactorAnalysis.has2FA) {
        return {
          success: false,
          error: 'No 2FA form detected',
        };
      }

      if (twoFactorAnalysis.codeInputSelector) {
        await steelClient.type(sessionId, twoFactorAnalysis.codeInputSelector, code);
      }

      if (twoFactorAnalysis.submitSelector) {
        await steelClient.click(sessionId, twoFactorAnalysis.submitSelector, true);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      const pageState = await steelClient.getPageState(sessionId);

      return {
        success: true,
        data: {
          url: pageState.url,
          title: pageState.title,
          html: pageState.html,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '2FA handling failed',
      };
    }
  }

  async createSession(options: CreateSessionOptions): Promise<CreateSessionResult> {
    try {
      const sessionId = await steelClient.createSession({
        headless: options.headless ?? true,
        proxy: options.proxy,
        fingerprint: options.fingerprint,
      });

      if (options.url) {
        await steelClient.navigate(sessionId, options.url, 'networkidle');
      }

      if (options.userId) {
        await this.saveSession(sessionId, options.url || '', options.userId);
      }

      return {
        success: true,
        sessionId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create session',
      };
    }
  }

  async getSessionStatus(sessionId: string): Promise<SessionStatus> {
    try {
      const cookies = await steelClient.getCookies(sessionId);
      
      return {
        success: true,
        data: {
          isActive: true,
          cookies,
        },
      };
    } catch (error) {
      return {
        success: false,
        data: {
          isActive: false,
        },
        error: error instanceof Error ? error.message : 'Failed to get session status',
      };
    }
  }

  async closeSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await steelClient.close(sessionId);
      
      const sessionKeys = await redis.keys(`auth_session:*:${sessionId}`);
      for (const key of sessionKeys) {
        await redis.del(key);
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to close session',
      };
    }
  }

  async setCookies(sessionId: string, cookies: Cookie[]): Promise<void> {
    await steelClient.setCookies(sessionId, cookies);
  }

  private async saveSession(
    sessionId: string,
    url: string,
    userId: string,
    cookies?: Cookie[]
  ): Promise<void> {
    const sessionData = {
      sessionId,
      url,
      userId,
      cookies,
      createdAt: new Date().toISOString(),
    };

    await redis.setex(
      `auth_session:${userId}:${sessionId}`,
      86400,
      JSON.stringify(sessionData)
    );
  }
}

export const authScrapingService = new AuthScrapingService();
