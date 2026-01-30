import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { AuthScrapingService } from '@/lib/services/auth-scraping-service';
import { redis } from '@/lib/db';

const CreateSessionSchema = z.object({
  url: z.string().url(),
  headless: z.boolean().optional().default(true),
  proxy: z.object({
    server: z.string(),
    username: z.string().optional(),
    password: z.string().optional(),
  }).optional(),
  fingerprint: z.object({
    userAgent: z.string().optional(),
    viewport: z.object({
      width: z.number(),
      height: z.number(),
    }).optional(),
    timezone: z.string().optional(),
    locale: z.string().optional(),
  }).optional(),
});

const UpdateSessionSchema = z.object({
  sessionId: z.string(),
  cookies: z.array(z.object({
    name: z.string(),
    value: z.string(),
    domain: z.string(),
    path: z.string(),
    expires: z.number().optional(),
    httpOnly: z.boolean().optional(),
    secure: z.boolean().optional(),
    sameSite: z.enum(['Strict', 'Lax', 'None']).optional(),
  })).optional(),
});

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
    const validationResult = CreateSessionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request: ' + validationResult.error.errors.map(e => e.message).join(', ') 
        },
        { status: 400 }
      );
    }

    const { url, headless, proxy, fingerprint } = validationResult.data;

    const result = await authScrapingService.createSession({
      url,
      headless,
      proxy,
      fingerprint,
      userId: session.user.id,
    });

    if (result.success && result.sessionId) {
      await redis.setex(
        `auth_session:${session.user.id}:${result.sessionId}`,
        86400,
        JSON.stringify({
          url,
          createdAt: new Date().toISOString(),
          userId: session.user.id,
        })
      );
    }

    return NextResponse.json({
      success: result.success,
      sessionId: result.sessionId,
      error: result.error,
    });
  } catch (error) {
    console.error('Create session error:', error);
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

    if (sessionId) {
      const sessionData = await redis.get(`auth_session:${session.user.id}:${sessionId}`);
      
      if (!sessionData) {
        return NextResponse.json(
          { success: false, error: 'Session not found' },
          { status: 404 }
        );
      }

      const status = await authScrapingService.getSessionStatus(sessionId);

      return NextResponse.json({
        success: true,
        data: {
          session: JSON.parse(sessionData),
          status: status.data,
        },
      });
    }

    const sessionKeys = await redis.keys(`auth_session:${session.user.id}:*`);
    const sessions = await Promise.all(
      sessionKeys.map(async (key) => {
        const data = await redis.get(key);
        if (data) {
          const parsed = JSON.parse(data);
          const sessionIdFromKey = key.split(':').pop();
          return {
            sessionId: sessionIdFromKey,
            ...parsed,
          };
        }
        return null;
      })
    );

    return NextResponse.json({
      success: true,
      data: sessions.filter(Boolean),
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
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
    const validationResult = UpdateSessionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request: ' + validationResult.error.errors.map(e => e.message).join(', ') 
        },
        { status: 400 }
      );
    }

    const { sessionId, cookies } = validationResult.data;

    const sessionKey = `auth_session:${session.user.id}:${sessionId}`;
    const existingSession = await redis.get(sessionKey);

    if (!existingSession) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    if (cookies) {
      await authScrapingService.setCookies(sessionId, cookies);
    }

    const updatedSession = {
      ...JSON.parse(existingSession),
      updatedAt: new Date().toISOString(),
    };

    await redis.setex(sessionKey, 86400, JSON.stringify(updatedSession));

    return NextResponse.json({
      success: true,
      data: updatedSession,
    });
  } catch (error) {
    console.error('Update session error:', error);
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

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      const sessionKey = `auth_session:${session.user.id}:${sessionId}`;
      const existingSession = await redis.get(sessionKey);

      if (!existingSession) {
        return NextResponse.json(
          { success: false, error: 'Session not found' },
          { status: 404 }
        );
      }

      await authScrapingService.closeSession(sessionId);
      await redis.del(sessionKey);

      return NextResponse.json({
        success: true,
        message: 'Session closed successfully',
      });
    }

    const sessionKeys = await redis.keys(`auth_session:${session.user.id}:*`);
    
    if (sessionKeys.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No sessions found' },
        { status: 404 }
      );
    }

    await Promise.all(
      sessionKeys.map(async (key) => {
        const sessionIdFromKey = key.split(':').pop();
        if (sessionIdFromKey) {
          await authScrapingService.closeSession(sessionIdFromKey);
        }
        await redis.del(key);
      })
    );

    return NextResponse.json({
      success: true,
      message: `Closed ${sessionKeys.length} sessions`,
    });
  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
