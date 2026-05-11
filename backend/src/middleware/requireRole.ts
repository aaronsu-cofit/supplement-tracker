import type { Context, Next } from 'hono';
import type { HonoEnv } from '../types.js';
import { getAdminRole } from '../lib/db.js';

type AnyRole = 'admin' | 'superadmin';

/**
 * Factory: returns Hono middleware that allows only users whose role is in `allowed`.
 * Must run AFTER authMiddleware so c.get('userId') is set.
 */
export function requireRole(...allowed: AnyRole[]) {
  return async function requireRoleMiddleware(c: Context<HonoEnv>, next: Next) {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const role = await getAdminRole(userId);
    if (!role || !allowed.includes(role as AnyRole)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  };
}
