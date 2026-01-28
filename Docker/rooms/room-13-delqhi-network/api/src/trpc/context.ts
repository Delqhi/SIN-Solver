import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { verifyToken, TokenPayload } from '../auth/jwt.js';

export interface Context {
  user: TokenPayload | null;
}

export function createContext({ req }: CreateExpressContextOptions): Context {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null };
  }

  try {
    const token = authHeader.slice(7);
    const user = verifyToken(token);
    return { user };
  } catch {
    return { user: null };
  }
}
