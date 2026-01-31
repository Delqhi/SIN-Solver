import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { AuthScrapingService } from '@/lib/services/auth-scraping-service';

const RequestSchema = z.object({
  action: z.enum(['authenticate', 'scrape', 'solve-captcha', 'handle-2fa']),
  url: z.string().url(),
  credentials: z.object({
    username: z.string(),
    password: z.string(),
    totpSecret: z.string().optional(),
  }).optional(),
  sessionId: z.string().optional(),
  selectors: z.array(z.string()).optional(),
  captchaType: z.string().optional(),
  twoFactorCode: z.string().optional(),
});

const ResponseSchema = z.object({
  success: z.boolean(),
  sessionId: z.string().optional(),
  data: z.any().optional(),
  error: z.string().optional(),
  requires2FA: z.boolean().optional(),
  captchaDetected: z.boolean().optional(),
});

export type AuthScrapingRequest = z.infer<typeof RequestSchema>;
export type AuthScrapingResponse = z.infer<typeof ResponseSchema>;

const authScrapingService = new AuthScrapingService();

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validationResult = RequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request: ' + validationResult.error.errors.map(e => e.message).join(', ') 
        },
        { status: 400 }
      );
    }

    const { action, url, credentials, sessionId, selectors, captchaType, twoFactorCode } = validationResult.data;

    switch (action) {
      case 'authenticate': {
        if (!credentials) {
          return NextResponse.json(
            { success: false, error: 'Credentials required for authentication' },
            { status: 400 }
          );
        }

        const result = await authScrapingService.authenticateAndScrape(
          url,
          credentials,
          session?.user?.id
        );

        return NextResponse.json({
          success: result.success,
          sessionId: result.sessionId,
          data: result.content,
          requires2FA: result.requires2FA,
          captchaDetected: result.captchaDetected,
          error: result.error,
        });
      }

      case 'scrape': {
        if (!sessionId) {
          return NextResponse.json(
            { success: false, error: 'Session ID required for scraping' },
            { status: 400 }
          );
        }

        const result = await authScrapingService.scrapeContent(
          sessionId,
          url,
          selectors
        );

        return NextResponse.json({
          success: result.success,
          data: result.data,
          error: result.error,
        });
      }

      case 'solve-captcha': {
        if (!sessionId) {
          return NextResponse.json(
            { success: false, error: 'Session ID required for CAPTCHA solving' },
            { status: 400 }
          );
        }

        const result = await authScrapingService.solveCaptcha(
          sessionId,
          captchaType || 'image'
        );

        return NextResponse.json({
          success: result.success,
          data: result.solution,
          error: result.error,
        });
      }

      case 'handle-2fa': {
        if (!sessionId || !twoFactorCode) {
          return NextResponse.json(
            { success: false, error: 'Session ID and 2FA code required' },
            { status: 400 }
          );
        }

        const result = await authScrapingService.handle2FA(
          sessionId,
          twoFactorCode
        );

        return NextResponse.json({
          success: result.success,
          data: result.data,
          error: result.error,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Auth scraping error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID required' },
        { status: 400 }
      );
    }

    const result = await authScrapingService.getSessionStatus(sessionId);

    return NextResponse.json({
      success: result.success,
      data: result.data,
      error: result.error,
    });
  } catch (error) {
    console.error('Get session status error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID required' },
        { status: 400 }
      );
    }

    const result = await authScrapingService.closeSession(sessionId);

    return NextResponse.json({
      success: result.success,
      error: result.error,
    });
  } catch (error) {
    console.error('Close session error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
