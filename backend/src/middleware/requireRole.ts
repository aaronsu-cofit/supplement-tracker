import type { FastifyRequest, FastifyReply } from 'fastify';
import { getAdminRole } from '../lib/db.js';

type AnyRole = 'admin' | 'superadmin';

/**
 * Factory: returns Fastify preHandler that allows only users whose role is in `allowed`.
 * Must run AFTER authPreHandler so (request as any).userId is set.
 */
export function requireRole(...allowed: AnyRole[]) {
  return async function requireRoleHandler(request: FastifyRequest, reply: FastifyReply) {
    const userId = (request as any).userId;
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const role = await getAdminRole(userId);
    if (!role || !allowed.includes(role as AnyRole)) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
  };
}
