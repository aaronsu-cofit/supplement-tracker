import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '../lib/auth.js';

/**
 * Fastify preHandler for authentication (required auth)
 */
export async function authPreHandler(request: FastifyRequest, reply: FastifyReply) {
  let token: string | null = null;

  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  if (!token) {
    token = request.cookies.auth_token || null;
  }

  if (!token) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  const payload = await verifyToken(token);
  if (!payload?.userId) {
    return reply.code(401).send({ error: 'Unauthorized' });
  }

  // Attach userId to request object
  (request as any).userId = payload.userId;
}

/**
 * Fastify preHandler for soft authentication (falls back to guest)
 */
export async function softAuthPreHandler(request: FastifyRequest, reply: FastifyReply) {
  let userId: string | null = null;

  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const payload = await verifyToken(token);
    if (payload?.userId) userId = payload.userId;
  }

  if (!userId) {
    const cookieToken = request.cookies.auth_token;
    if (cookieToken) {
      const payload = await verifyToken(cookieToken);
      if (payload?.userId) userId = payload.userId;
    }
  }

  if (!userId) {
    userId = request.cookies.line_user_id || request.cookies.supplement_user_id || crypto.randomUUID();
  }

  // Attach userId to request object
  (request as any).userId = userId;
}
