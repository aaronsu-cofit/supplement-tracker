import type { Context, Next } from 'hono';
import { verifyToken } from '../lib/auth.js';
import { getCookie } from 'hono/cookie';
import type { HonoEnv } from '../types.js';

/**
 * Extracts userId from Authorization header (Bearer token) or cookie.
 * Attaches userId to context via c.set('userId', ...).
 */
export async function authMiddleware(c: Context<HonoEnv>, next: Next): Promise<Response | void> {
  let token: string | null = null;

  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  if (!token) {
    token = getCookie(c, 'auth_token') || null;
  }

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const payload = await verifyToken(token);
  if (!payload?.userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('userId', payload.userId);
  await next();
}

/**
 * Same as authMiddleware but falls back to generating a guest userId from
 * the supplement_user_id cookie (legacy anonymous mode).
 */
export async function softAuthMiddleware(c: Context<HonoEnv>, next: Next): Promise<void> {
  let userId: string | null = null;

  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = await verifyToken(token);
    if (payload?.userId) userId = payload.userId;
  }

  if (!userId) {
    const cookieToken = getCookie(c, 'auth_token');
    if (cookieToken) {
      const payload = await verifyToken(cookieToken);
      if (payload?.userId) userId = payload.userId;
    }
  }

  if (!userId) {
    userId = getCookie(c, 'line_user_id') || getCookie(c, 'supplement_user_id') || crypto.randomUUID();
  }

  c.set('userId', userId);
  await next();
}
