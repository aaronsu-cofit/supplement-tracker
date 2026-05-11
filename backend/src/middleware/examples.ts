/**
 * 中間件使用示例
 *
 * 這個文件展示了如何在 Fastify 路由中使用各種中間件
 * 僅供參考，不會被實際編譯或運行
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  authMiddleware,
  requireAuthMiddleware,
  softAuthMiddleware,
  createAuthTokenCookie,
} from './auth.middleware.js';
import {
  registerErrorHandler,
  asyncHandler,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
} from './errorHandler.js';
import { registerLoggerMiddleware } from './logger.js';
import { AuthenticatedRequest } from '../types/http.js';

/**
 * 示例 1: 基本設置
 */
export async function setupMiddleware(app: FastifyInstance) {
  // 註冊全局錯誤處理
  registerErrorHandler(app);

  // 註冊日誌中間件
  registerLoggerMiddleware(app);

  // 全局認證中間件（可選，也可以只在特定路由使用）
  // app.addHook('preHandler', authMiddleware);
}

/**
 * 示例 2: 公開路由（不需要認證）
 */
export async function publicRoutes(app: FastifyInstance) {
  // 健康檢查
  app.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // 登入
  app.post('/api/auth/login', async (request, reply) => {
    const { email, password } = request.body as any;

    // 驗證用戶
    // ... 驗證邏輯

    // 生成 JWT token
    const token = app.jwt.sign({
      userId: 'user-id',
    });

    // 設置 Cookie
    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions = createAuthTokenCookie(token, isProd);
    reply.setCookie('auth_token', token, cookieOptions);

    return { token, user: { id: 'user-id', email } };
  });
}

/**
 * 示例 3: 需要認證的路由
 */
export async function protectedRoutes(app: FastifyInstance) {
  // 方式 1: 在路由配置中使用 preHandler
  app.get(
    '/api/profile',
    {
      preHandler: [authMiddleware, requireAuthMiddleware],
    },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user;
      return { userId: user!.id };
    },
  );

  // 方式 2: 使用 asyncHandler 包裝
  app.get(
    '/api/data',
    {
      preHandler: [authMiddleware, requireAuthMiddleware],
    },
    asyncHandler(async (request, reply) => {
      const user = (request as AuthenticatedRequest).user;

      // Prisma 錯誤會自動轉換
      // const data = await prisma.data.findMany({
      //   where: { userId: user!.id }
      // });

      return { userId: user!.id };
    }),
  );
}

/**
 * 示例 4: Soft Auth 路由（支持匿名和已認證用戶）
 */
export async function softAuthRoutes(app: FastifyInstance) {
  app.get(
    '/api/data',
    {
      preHandler: [softAuthMiddleware],
    },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user;
      // user.id 一定存在（可能是真實用戶或 guest ID）
      return { userId: user!.id };
    },
  );
}

/**
 * 示例 5: 錯誤處理
 */
export async function errorHandlingRoutes(app: FastifyInstance) {
  // 拋出 404 錯誤
  app.get('/api/users/:id', async (request, reply) => {
    const { id } = request.params as any;
    // const user = await prisma.user.findUnique({ where: { id } });

    // if (!user) {
    //   throw new NotFoundError('User not found');
    // }

    // return user;
  });

  // 拋出驗證錯誤
  app.post('/api/users', async (request, reply) => {
    const { email, name } = request.body as any;

    if (!email) {
      throw new ValidationError('Validation failed', [
        { field: 'email', message: 'Email is required' },
      ]);
    }

    if (!name) {
      throw new ValidationError('Validation failed', [
        { field: 'name', message: 'Name is required' },
      ]);
    }

    // return await prisma.user.create({ data: { email, name } });
  });

  // 拋出未授權錯誤
  app.delete('/api/admin/users/:id', async (request, reply) => {
    const user = (request as AuthenticatedRequest).user;

    // 檢查權限
    // const isAdmin = await checkAdminRole(user!.id);
    // if (!isAdmin) {
    //   throw new UnauthorizedError('Admin access required');
    // }

    // ... 刪除邏輯
  });
}

/**
 * 示例 6: 路由分組
 */
export async function routeGrouping(app: FastifyInstance) {
  // 為所有 /api/admin/* 路由添加認證
  app.register(async (adminRoutes) => {
    // 在這個 scope 內的所有路由都需要認證
    adminRoutes.addHook('preHandler', authMiddleware);
    adminRoutes.addHook('preHandler', requireAuthMiddleware);

    adminRoutes.get('/api/admin/users', async (request, reply) => {
      const user = (request as AuthenticatedRequest).user;
      // 檢查 admin 權限
      return { message: 'Admin users list' };
    });

    adminRoutes.post('/api/admin/users', async (request, reply) => {
      const user = (request as AuthenticatedRequest).user;
      // 檢查 admin 權限
      return { message: 'User created' };
    });
  });
}

/**
 * 示例 7: 完整應用設置
 */
export async function fullAppSetup() {
  const { createFastifyApp } = await import('../config/fastify.js');
  const app = await createFastifyApp();

  // 1. 註冊中間件
  registerErrorHandler(app);
  registerLoggerMiddleware(app);

  // 2. 公開路由
  await publicRoutes(app);

  // 3. 保護路由
  await protectedRoutes(app);

  // 4. Soft auth 路由
  await softAuthRoutes(app);

  // 5. 錯誤處理路由
  await errorHandlingRoutes(app);

  // 6. 路由分組
  await routeGrouping(app);

  // 7. 404 處理（已在 config/fastify.ts 中設置）

  // 8. 啟動服務器
  const port = parseInt(process.env.PORT || '8080', 10);
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`🚀 Server running on port ${port}`);
}
