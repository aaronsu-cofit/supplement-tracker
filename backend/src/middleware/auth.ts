// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/middleware/auth.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '../lib/auth.js';
import { UnauthorizedError } from './errorHandler.js';
import type { AuthenticatedRequest } from '../types/http.js';

/**
 * Fastify 認證中間件
 *
 * 從 Authorization header (Bearer token) 或 cookie 中提取並驗證 JWT token
 * 將用戶信息附加到 request.user
 *
 * 使用方式：
 * app.addHook('preHandler', authenticateUser);
 */
export async function authenticateUser(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  let token: string | null = null;

  // 嘗試從 Authorization header 獲取 token
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  // 如果 header 中沒有，嘗試從 cookie 獲取
  if (!token) {
    token = request.cookies.auth_token || null;
  }

  // 如果沒有 token，拋出未授權錯誤
  if (!token) {
    throw new UnauthorizedError('Authentication required');
  }

  // 驗證 token
  const payload = await verifyToken(token);
  if (!payload?.userId) {
    throw new UnauthorizedError('Invalid or expired token');
  }

  // 將用戶信息附加到 request
  const authReq = request as AuthenticatedRequest;
  authReq.user = {
    id: payload.userId,
  };
}

/**
 * Fastify 軟認證中間件（兼容匿名模式）
 *
 * 類似 authenticateUser，但在沒有有效 token 時會：
 * 1. 嘗試從 line_user_id 或 supplement_user_id cookie 獲取用戶 ID
 * 2. 如果都沒有，生成一個新的 UUID 作為訪客用戶 ID
 *
 * 這確保了與舊版 Hono softAuthMiddleware 的兼容性
 */
export async function softAuthenticateUser(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  let userId: string | null = null;

  // 1. 嘗試從 Authorization header 獲取並驗證 token
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = await verifyToken(token);
      if (payload?.userId) {
        userId = payload.userId;
      }
    } catch (error) {
      // Token 無效，繼續嘗試其他方式
    }
  }

  // 2. 嘗試從 cookie 中的 auth_token 獲取並驗證
  if (!userId) {
    const cookieToken = request.cookies.auth_token;
    if (cookieToken) {
      try {
        const payload = await verifyToken(cookieToken);
        if (payload?.userId) {
          userId = payload.userId;
        }
      } catch (error) {
        // Token 無效，繼續嘗試其他方式
      }
    }
  }

  // 3. 嘗試從其他 cookies 獲取用戶 ID（匿名模式）
  if (!userId) {
    userId =
      request.cookies.line_user_id ||
      request.cookies.supplement_user_id ||
      null;
  }

  // 4. 如果仍然沒有，生成一個新的訪客 UUID
  if (!userId) {
    userId = crypto.randomUUID();
  }

  // 將用戶信息附加到 request
  const authReq = request as AuthenticatedRequest;
  authReq.user = {
    id: userId,
  };
}

/**
 * 可選的認證中間件
 *
 * 如果有有效的 token，會設置 request.user
 * 如果沒有或 token 無效，不會拋出錯誤，request.user 會是 undefined
 *
 * 適用於可選認證的端點（如公開內容，但認證用戶可以看到更多）
 */
export async function optionalAuthenticateUser(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  let token: string | null = null;

  // 嘗試從 Authorization header 獲取 token
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  // 如果 header 中沒有，嘗試從 cookie 獲取
  if (!token) {
    token = request.cookies.auth_token || null;
  }

  // 如果有 token，嘗試驗證
  if (token) {
    try {
      const payload = await verifyToken(token);
      if (payload?.userId) {
        const authReq = request as AuthenticatedRequest;
        authReq.user = {
          id: payload.userId,
        };
      }
    } catch (error) {
      // Token 無效，但不拋出錯誤（可選認證）
    }
  }
}
