// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/routes/wounds.routes.ts
import { FastifyInstance } from 'fastify';
import { WoundsController } from '../controllers/wounds.controller.js';
import { asyncHandler } from '../controllers/base.controller.js';
import { container } from '../lib/container.js';
import type { WoundsService } from '../services/wounds.service.js';
import { softAuthenticateUser } from '../middleware/auth.js';
import {
  getWoundsSchema,
  getWoundByIdSchema,
  createWoundSchema,
  updateWoundSchema,
  deleteWoundSchema,
  getAllWoundsAdminSchema,
  getWoundLogsSchema,
  createWoundLogSchema,
  generateSoapNoteSchema,
} from '../schemas/wounds.schema.js';

/**
 * Wounds 路由 - 掛載到 /api/wounds
 *
 * 所有路由都需要用戶認證（使用 softAuthMiddleware 等效）
 *
 * 端點：
 * - GET    /api/wounds                - 獲取用戶的所有活躍傷口
 * - GET    /api/wounds/admin          - 管理員獲取所有傷口
 * - GET    /api/wounds/:woundId       - 獲取單個傷口詳情
 * - POST   /api/wounds                - 創建新的傷口記錄
 * - PATCH  /api/wounds/:woundId       - 更新傷口記錄
 * - DELETE /api/wounds/:woundId       - 歸檔（軟刪除）傷口記錄
 * - GET    /api/wounds/:woundId/logs  - 獲取傷口的所有日誌記錄
 * - POST   /api/wounds/:woundId/logs  - 創建傷口日誌記錄
 * - POST   /api/wounds/:woundId/soap  - 生成 SOAP Note（護理紀錄）
 */
export async function woundsRoutes(app: FastifyInstance) {
  // 從 DI 容器獲取服務實例
  const woundsService = container.get<WoundsService>('woundsService');

  // 為所有路由應用軟認證中間件（兼容匿名模式，與原 Hono softAuthMiddleware 一致）
  app.addHook('preHandler', softAuthenticateUser);

  // GET /api/wounds/admin - 管理員獲取所有傷口（需要放在 /:woundId 之前避免路由衝突）
  app.get(
    '/admin',
    { schema: getAllWoundsAdminSchema },
    asyncHandler(async (request, reply) => {
      const controller = new WoundsController(request, reply, woundsService);
      return controller.getAllWoundsAdmin();
    }),
  );

  // GET /api/wounds - 獲取用戶的所有活躍傷口
  app.get(
    '/',
    { schema: getWoundsSchema },
    asyncHandler(async (request, reply) => {
      const controller = new WoundsController(request, reply, woundsService);
      return controller.getWounds();
    }),
  );

  // POST /api/wounds - 創建新的傷口記錄
  app.post(
    '/',
    { schema: createWoundSchema },
    asyncHandler(async (request, reply) => {
      const controller = new WoundsController(request, reply, woundsService);
      return controller.createWound();
    }),
  );

  // GET /api/wounds/:woundId - 獲取單個傷口詳情
  app.get(
    '/:woundId',
    { schema: getWoundByIdSchema },
    asyncHandler(async (request, reply) => {
      const controller = new WoundsController(request, reply, woundsService);
      return controller.getWoundById();
    }),
  );

  // PATCH /api/wounds/:woundId - 更新傷口記錄
  app.patch(
    '/:woundId',
    { schema: updateWoundSchema },
    asyncHandler(async (request, reply) => {
      const controller = new WoundsController(request, reply, woundsService);
      return controller.updateWound();
    }),
  );

  // DELETE /api/wounds/:woundId - 歸檔（軟刪除）傷口記錄
  app.delete(
    '/:woundId',
    { schema: deleteWoundSchema },
    asyncHandler(async (request, reply) => {
      const controller = new WoundsController(request, reply, woundsService);
      return controller.deleteWound();
    }),
  );

  // GET /api/wounds/:woundId/logs - 獲取傷口的所有日誌記錄
  app.get(
    '/:woundId/logs',
    { schema: getWoundLogsSchema },
    asyncHandler(async (request, reply) => {
      const controller = new WoundsController(request, reply, woundsService);
      return controller.getWoundLogs();
    }),
  );

  // POST /api/wounds/:woundId/logs - 創建傷口日誌記錄
  app.post(
    '/:woundId/logs',
    { schema: createWoundLogSchema },
    asyncHandler(async (request, reply) => {
      const controller = new WoundsController(request, reply, woundsService);
      return controller.createWoundLog();
    }),
  );

  // POST /api/wounds/:woundId/soap - 生成 SOAP Note（護理紀錄）
  app.post(
    '/:woundId/soap',
    { schema: generateSoapNoteSchema },
    asyncHandler(async (request, reply) => {
      const controller = new WoundsController(request, reply, woundsService);
      return controller.generateSoapNote();
    }),
  );
}
