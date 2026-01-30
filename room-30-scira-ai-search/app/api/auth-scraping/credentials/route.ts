import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { redis } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/encryption';

const StoreCredentialsSchema = z.object({
  domain: z.string(),
  credentials: z.object({
    username: z.string(),
    password: z.string(),
    totpSecret: z.string().optional(),
  }),
  metadata: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
});

const UpdateCredentialsSchema = z.object({
  domain: z.string(),
  credentials: z.object({
    username: z.string().optional(),
    password: z.string().optional(),
    totpSecret: z.string().optional(),
  }),
  metadata: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
});

const DeleteCredentialsSchema = z.object({
  domain: z.string(),
});

export type StoredCredentials = {
  domain: string;
  credentials: {
    username: string;
    password: string;
    totpSecret?: string;
  };
  metadata?: {
    name?: string;
    description?: string;
  };
  createdAt: string;
  updatedAt: string;
};

function getCredentialsKey(userId: string, domain: string): string {
  return `auth_credentials:${userId}:${domain}`;
}

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
    const validationResult = StoreCredentialsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request: ' + validationResult.error.errors.map(e => e.message).join(', ') 
        },
        { status: 400 }
      );
    }

    const { domain, credentials, metadata } = validationResult.data;

    const encryptedPassword = await encrypt(credentials.password);
    const encryptedTOTPSecret = credentials.totpSecret 
      ? await encrypt(credentials.totpSecret) 
      : undefined;

    const storedCredentials: StoredCredentials = {
      domain,
      credentials: {
        username: credentials.username,
        password: encryptedPassword,
        ...(encryptedTOTPSecret && { totpSecret: encryptedTOTPSecret }),
      },
      metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await redis.setex(
      getCredentialsKey(session.user.id, domain),
      2592000,
      JSON.stringify(storedCredentials)
    );

    return NextResponse.json({
      success: true,
      data: {
        domain,
        username: credentials.username,
        hasTOTP: !!credentials.totpSecret,
        metadata,
        createdAt: storedCredentials.createdAt,
      },
    });
  } catch (error) {
    console.error('Store credentials error:', error);
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
    const domain = searchParams.get('domain');

    if (domain) {
      const credentialsData = await redis.get(getCredentialsKey(session.user.id, domain));
      
      if (!credentialsData) {
        return NextResponse.json(
          { success: false, error: 'Credentials not found' },
          { status: 404 }
        );
      }

      const storedCredentials: StoredCredentials = JSON.parse(credentialsData);
      const decryptedPassword = await decrypt(storedCredentials.credentials.password);
      const decryptedTOTPSecret = storedCredentials.credentials.totpSecret 
        ? await decrypt(storedCredentials.credentials.totpSecret) 
        : undefined;

      return NextResponse.json({
        success: true,
        data: {
          domain: storedCredentials.domain,
          credentials: {
            username: storedCredentials.credentials.username,
            password: decryptedPassword,
            ...(decryptedTOTPSecret && { totpSecret: decryptedTOTPSecret }),
          },
          metadata: storedCredentials.metadata,
          createdAt: storedCredentials.createdAt,
          updatedAt: storedCredentials.updatedAt,
        },
      });
    }

    const credentialKeys = await redis.keys(`auth_credentials:${session.user.id}:*`);
    
    if (credentialKeys.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const credentials = await Promise.all(
      credentialKeys.map(async (key) => {
        const data = await redis.get(key);
        if (data) {
          const stored: StoredCredentials = JSON.parse(data);
          return {
            domain: stored.domain,
            username: stored.credentials.username,
            hasTOTP: !!stored.credentials.totpSecret,
            metadata: stored.metadata,
            createdAt: stored.createdAt,
            updatedAt: stored.updatedAt,
          };
        }
        return null;
      })
    );

    return NextResponse.json({
      success: true,
      data: credentials.filter(Boolean),
    });
  } catch (error) {
    console.error('Get credentials error:', error);
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
    const validationResult = UpdateCredentialsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request: ' + validationResult.error.errors.map(e => e.message).join(', ') 
        },
        { status: 400 }
      );
    }

    const { domain, credentials, metadata } = validationResult.data;
    const key = getCredentialsKey(session.user.id, domain);
    const existingData = await redis.get(key);

    if (!existingData) {
      return NextResponse.json(
        { success: false, error: 'Credentials not found' },
        { status: 404 }
      );
    }

    const existing: StoredCredentials = JSON.parse(existingData);

    const updatedCredentials: StoredCredentials = {
      ...existing,
      credentials: {
        username: credentials.username ?? existing.credentials.username,
        password: credentials.password 
          ? await encrypt(credentials.password) 
          : existing.credentials.password,
        totpSecret: credentials.totpSecret !== undefined
          ? credentials.totpSecret 
            ? await encrypt(credentials.totpSecret) 
            : undefined
          : existing.credentials.totpSecret,
      },
      metadata: metadata ? { ...existing.metadata, ...metadata } : existing.metadata,
      updatedAt: new Date().toISOString(),
    };

    await redis.setex(key, 2592000, JSON.stringify(updatedCredentials));

    return NextResponse.json({
      success: true,
      data: {
        domain: updatedCredentials.domain,
        username: updatedCredentials.credentials.username,
        hasTOTP: !!updatedCredentials.credentials.totpSecret,
        metadata: updatedCredentials.metadata,
        updatedAt: updatedCredentials.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update credentials error:', error);
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
    const validationResult = DeleteCredentialsSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request: ' + validationResult.error.errors.map(e => e.message).join(', ') 
        },
        { status: 400 }
      );
    }

    const { domain } = validationResult.data;
    const key = getCredentialsKey(session.user.id, domain);
    const existingData = await redis.get(key);

    if (!existingData) {
      return NextResponse.json(
        { success: false, error: 'Credentials not found' },
        { status: 404 }
      );
    }

    await redis.del(key);

    return NextResponse.json({
      success: true,
      message: 'Credentials deleted successfully',
    });
  } catch (error) {
    console.error('Delete credentials error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
