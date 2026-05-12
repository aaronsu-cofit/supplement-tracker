// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/routes/auth.routes.ts
import { FastifyInstance } from 'fastify';
import { AuthController } from '../controllers/auth.controller.js';
import { asyncHandler } from '../controllers/base.controller.js';
import { container } from '../lib/container.js';
import type { AuthService } from '../services/auth.service.js';
import {
  loginSchema,
  registerSchema,
  getMeSchema,
  adminLoginSchema,
  lineLoginSchema,
  logoutSchema,
} from '../schemas/auth.schema.js';

/**
 * 認證路由 - 掛載到 /api/auth
 */
export async function authRoutes(app: FastifyInstance) {
  // 從 DI 容器獲取服務實例
  const authService = container.get<AuthService>('authService');

  // POST /api/auth/login
  app.post(
    '/login',
    { schema: loginSchema },
    asyncHandler(async (request, reply) => {
      const controller = new AuthController(request, reply, authService);
      return controller.login();
    }),
  );

  // POST /api/auth/register
  app.post(
    '/register',
    { schema: registerSchema },
    asyncHandler(async (request, reply) => {
      const controller = new AuthController(request, reply, authService);
      return controller.register();
    }),
  );

  // GET /api/auth/me
  app.get(
    '/me',
    { schema: getMeSchema },
    asyncHandler(async (request, reply) => {
      const controller = new AuthController(request, reply, authService);
      return controller.getMe();
    }),
  );

  // POST /api/auth/admin/login
  app.post(
    '/admin/login',
    { schema: adminLoginSchema },
    asyncHandler(async (request, reply) => {
      const controller = new AuthController(request, reply, authService);
      return controller.adminLogin();
    }),
  );

  // POST /api/auth/me (LINE login)
  app.post(
    '/me',
    { schema: lineLoginSchema },
    asyncHandler(async (request, reply) => {
      const controller = new AuthController(request, reply, authService);
      return controller.lineLogin();
    }),
  );

  // DELETE /api/auth/me (logout)
  app.delete(
    '/me',
    { schema: logoutSchema },
    asyncHandler(async (request, reply) => {
      const controller = new AuthController(request, reply, authService);
      return controller.logout();
    }),
  );
}
