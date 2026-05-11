import { FastifyRequest, FastifyReply } from 'fastify';
import { JwtPayload, AuthenticatedRequest } from '../types/http.js';

/**
 * JWT 和 Cookie 驗證中間件
 *
 * 優先級：
 * 1. Authorization: Bearer <token>
 * 2. Cookie: auth_token=<token>
 * 3. 未驗證
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    let token: string | null = null;

    // 方式 1: Authorization Header
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }

    // 方式 2: Cookie
    if (!token && request.cookies.auth_token) {
      token = request.cookies.auth_token;
    }

    // 如果有 token，驗證並設置用戶
    if (token) {
      try {
        // 使用 @fastify/jwt 的 verify 方法手動驗證 token
        const payload = request.server.jwt.verify<JwtPayload>(token);
        (request as AuthenticatedRequest).user = {
          id: payload.userId,
        };
      } catch (err) {
        // Token 無效，但不拋出錯誤，允許繼續
        // 某些端點可以是公開的
        (request as AuthenticatedRequest).user = undefined;
      }
    }
  } catch (err) {
    // 中間件錯誤，記錄但不中斷
    request.log.error(err, '[authMiddleware] unexpected error');
  }
}

/**
 * 需要認證的路由保護中間件
 * 如果用戶未驗證，返回 401
 */
export async function requireAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authenticatedReq = request as AuthenticatedRequest;

  if (!authenticatedReq.user?.id) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: '請提供有效的認證令牌',
    });
  }
}

/**
 * Soft auth 中間件：嘗試從多個來源獲取用戶 ID
 * 如果都沒有，生成一個 guest ID
 * 這個版本與 Hono 的 softAuthMiddleware 兼容
 */
export async function softAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    let userId: string | null = null;

    // 1. 嘗試從 Authorization header 獲取
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const payload = request.server.jwt.verify<JwtPayload>(token);
        userId = payload.userId;
      } catch (err) {
        // Token 無效，繼續嘗試其他方式
      }
    }

    // 2. 嘗試從 auth_token cookie 獲取
    if (!userId && request.cookies.auth_token) {
      try {
        const payload = request.server.jwt.verify<JwtPayload>(
          request.cookies.auth_token,
        );
        userId = payload.userId;
      } catch (err) {
        // Token 無效，繼續嘗試其他方式
      }
    }

    // 3. 回退到 line_user_id 或 supplement_user_id cookie
    if (!userId) {
      userId =
        request.cookies.line_user_id ||
        request.cookies.supplement_user_id ||
        crypto.randomUUID();
    }

    // 設置用戶 ID
    (request as AuthenticatedRequest).user = {
      id: userId,
    };
  } catch (err) {
    request.log.error(err, '[softAuthMiddleware] unexpected error');
    // 發生錯誤時，生成一個 guest ID
    (request as AuthenticatedRequest).user = {
      id: crypto.randomUUID(),
    };
  }
}

/**
 * 驗證用戶角色的中間件工廠
 * 使用方式：app.addHook('preHandler', createRoleMiddleware('admin'))
 */
export function createRoleMiddleware(requiredRole: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authenticatedReq = request as AuthenticatedRequest;

    if (!authenticatedReq.user?.id) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: '請提供有效的認證令牌',
      });
    }

    // 注意：實際的角色驗證應該在 Service 層中實現
    // 這裡只是通用框架，角色信息來自 Service 查詢
    // 例如：
    // const role = await getAdminRole(authenticatedReq.user.id);
    // if (role !== requiredRole) {
    //   return reply.code(403).send({ error: 'Forbidden' });
    // }
  };
}

/**
 * 用於創建 JWT token Cookie 的輔助函數
 */
export function createAuthTokenCookie(token: string, isProd: boolean) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ('none' as const) : ('lax' as const),
    maxAge: 60 * 60 * 24 * 365, // 365 天
    path: '/',
  };
}
