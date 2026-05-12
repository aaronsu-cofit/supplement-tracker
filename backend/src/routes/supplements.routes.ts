// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/routes/supplements.routes.ts
import { FastifyInstance } from 'fastify';
import { SupplementsController } from '../controllers/supplements.controller.js';
import { asyncHandler } from '../controllers/base.controller.js';
import { container } from '../lib/container.js';
import type { SupplementsService } from '../services/supplements.service.js';
import { softAuthenticateUser } from '../middleware/auth.js';
import {
  getSupplementsSchema,
  createSupplementSchema,
  updateSupplementSchema,
  deleteSupplementSchema,
} from '../schemas/supplements.schema.js';

/**
 * Supplements 路由 - 掛載到 /api/supplements
 *
 * 所有路由都需要用戶認證（使用 softAuthMiddleware 等效）
 *
 * 端點：
 * - GET    /api/supplements       - 獲取用戶的所有補充品
 * - POST   /api/supplements       - 創建新的補充品
 * - PUT    /api/supplements/:id   - 更新補充品
 * - DELETE /api/supplements/:id   - 刪除補充品
 */
export async function supplementsRoutes(app: FastifyInstance) {
  // 從 DI 容器獲取服務實例
  const supplementsService = container.get<SupplementsService>('supplementsService');

  // 為所有路由應用軟認證中間件（兼容匿名模式，與原 Hono softAuthMiddleware 一致）
  app.addHook('preHandler', softAuthenticateUser);

  // GET /api/supplements - 獲取用戶的所有補充品
  app.get(
    '/',
    { schema: getSupplementsSchema },
    asyncHandler(async (request, reply) => {
      const controller = new SupplementsController(request, reply, supplementsService);
      return controller.getSupplements();
    }),
  );

  // POST /api/supplements - 創建新的補充品
  app.post(
    '/',
    { schema: createSupplementSchema },
    asyncHandler(async (request, reply) => {
      const controller = new SupplementsController(request, reply, supplementsService);
      return controller.createSupplement();
    }),
  );

  // PUT /api/supplements/:id - 更新補充品
  app.put(
    '/:id',
    { schema: updateSupplementSchema },
    asyncHandler(async (request, reply) => {
      const controller = new SupplementsController(request, reply, supplementsService);
      return controller.updateSupplement();
    }),
  );

  // DELETE /api/supplements/:id - 刪除補充品
  app.delete(
    '/:id',
    { schema: deleteSupplementSchema },
    asyncHandler(async (request, reply) => {
      const controller = new SupplementsController(request, reply, supplementsService);
      return controller.deleteSupplement();
    }),
  );
}
