// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/routes/hq.routes.ts
import { FastifyInstance } from 'fastify';
import { HQController } from '../controllers/hq.controller.js';
import { asyncHandler } from '../controllers/base.controller.js';
import { container } from '../lib/container.js';
import type { HQService } from '../services/hq.service.js';
import { authenticateUser } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import * as schemas from '../schemas/hq.schema.js';

/**
 * HQ 路由 - 掛載到 /api/hq
 *
 * 所有路由都需要管理員認證（admin 或 superadmin）
 *
 * 端點：
 * - GET    /api/hq/modules                              - 獲取所有模組
 * - PATCH  /api/hq/modules/:id                          - 更新模組
 * - GET    /api/hq/admins                               - 獲取所有管理員
 * - POST   /api/hq/admins                               - 創建新管理員
 * - PATCH  /api/hq/admins/:adminId                      - 更新管理員角色
 * - PATCH  /api/hq/me/password                          - 更改自己的密碼
 * - GET    /api/hq/users                                - 獲取所有用戶
 * - GET    /api/hq/users/:userId                        - 獲取單個用戶
 * - GET    /api/hq/users/:userId/engagement             - 獲取用戶參與事件
 * - GET    /api/hq/users/:userId/attributes             - 獲取用戶屬性
 * - PUT    /api/hq/users/:userId/attributes/:key        - 設置用戶屬性
 * - DELETE /api/hq/users/:userId/attributes/:key        - 刪除用戶屬性
 * - GET    /api/hq/users/:userId/missions               - 獲取用戶任務
 * - POST   /api/hq/users/:userId/missions               - 分配任務給用戶
 * - DELETE /api/hq/users/:userId/missions/:assignmentId - 放棄任務
 * - GET    /api/hq/users/:userId/badges                 - 獲取用戶徽章
 * - DELETE /api/hq/users/:userId/badges/:templateId     - 撤銷徽章
 * - GET    /api/hq/users/:userId/streaks                - 獲取用戶連續記錄
 * - GET    /api/hq/users/:userId/journeys               - 獲取用戶旅程
 * - GET    /api/hq/users/:userId/messages               - 獲取用戶消息日誌
 * - GET    /api/hq/stats                                - 獲取統計數據
 */
export async function hqRoutes(app: FastifyInstance) {
  // 從 DI 容器獲取服務實例
  const hqService = container.get<HQService>('hqService');

  // 為所有路由應用認證和管理員角色驗證中間件
  app.addHook('onRequest', authenticateUser);
  app.addHook('onRequest', requireAdmin());

  // ============================================
  // 模組管理 (Module Management)
  // ============================================

  // GET /api/hq/modules - 獲取所有模組
  app.get(
    '/modules',
    { schema: schemas.getModulesSchema },
    asyncHandler(async (request, reply) => {
      
      const controller = new HQController(request, reply, hqService);
      return controller.getModules();
    }),
  );

  // PATCH /api/hq/modules/:id - 更新模組
  app.patch(
    '/modules/:id',
    { schema: schemas.updateModuleSchema },
    asyncHandler(async (request, reply) => {
      
      const controller = new HQController(request, reply, hqService);
      return controller.updateModule();
    }),
  );

  // ============================================
  // 管理員管理 (Admin Management)
  // ============================================

  // GET /api/hq/admins - 獲取所有管理員
  app.get(
    '/admins',
    { schema: schemas.getAdminsSchema },
    asyncHandler(async (request, reply) => {
      
      const controller = new HQController(request, reply, hqService);
      return controller.getAdmins();
    }),
  );

  // POST /api/hq/admins - 創建新管理員
  app.post(
    '/admins',
    { schema: schemas.createAdminSchema },
    asyncHandler(async (request, reply) => {
      
      const controller = new HQController(request, reply, hqService);
      return controller.createAdmin();
    }),
  );

  // PATCH /api/hq/admins/:adminId - 更新管理員角色
  app.patch(
    '/admins/:adminId',
    { schema: schemas.updateAdminRoleSchema },
    asyncHandler(async (request, reply) => {
      
      const controller = new HQController(request, reply, hqService);
      return controller.updateAdminRole();
    }),
  );

  // PATCH /api/hq/me/password - 更改自己的密碼
  app.patch(
    '/me/password',
    { schema: schemas.updateMyPasswordSchema },
    asyncHandler(async (request, reply) => {
      
      const controller = new HQController(request, reply, hqService);
      return controller.updateMyPassword();
    }),
  );

  // ============================================
  // 用戶管理 (User Management)
  // ============================================

  // GET /api/hq/users - 獲取所有用戶
  app.get(
    '/users',
    { schema: schemas.getUsersSchema },
    asyncHandler(async (request, reply) => {
      
      const controller = new HQController(request, reply, hqService);
      return controller.getUsers();
    }),
  );

  // GET /api/hq/users/:userId - 獲取單個用戶詳情
  app.get(
    '/users/:userId',
    { schema: schemas.getUserByIdSchema },
    asyncHandler(async (request, reply) => {
      
      const controller = new HQController(request, reply, hqService);
      return controller.getUserById();
    }),
  );

  // GET /api/hq/users/:userId/engagement - 獲取用戶參與事件
  app.get(
    '/users/:userId/engagement',
    { schema: schemas.getUserEngagementSchema },
    asyncHandler(async (request, reply) => {
      
      const controller = new HQController(request, reply, hqService);
      return controller.getUserEngagement();
    }),
  );

  // ============================================
  // 用戶屬性管理 (User Attributes)
  // ============================================

  // GET /api/hq/users/:userId/attributes - 獲取用戶屬性
  app.get(
    '/users/:userId/attributes',
    { schema: schemas.getUserAttributesSchema },
    asyncHandler(async (request, reply) => {
      
      const controller = new HQController(request, reply, hqService);
      return controller.getUserAttributes();
    }),
  );

  // PUT /api/hq/users/:userId/attributes/:key - 設置用戶屬性
  app.put(
    '/users/:userId/attributes/:key',
    { schema: schemas.setUserAttributeSchema },
    asyncHandler(async (request, reply) => {
      
      const controller = new HQController(request, reply, hqService);
      return controller.setUserAttribute();
    }),
  );

  // DELETE /api/hq/users/:userId/attributes/:key - 刪除用戶屬性
  app.delete(
    '/users/:userId/attributes/:key',
    { schema: schemas.deleteUserAttributeSchema },
    asyncHandler(async (request, reply) => {
      
      const controller = new HQController(request, reply, hqService);
      return controller.deleteUserAttribute();
    }),
  );

  // ============================================
  // 任務管理 (Mission Management)
  // ============================================

  // GET /api/hq/users/:userId/missions - 獲取用戶任務
  app.get(
    '/users/:userId/missions',
    { schema: schemas.getUserMissionsSchema },
    asyncHandler(async (request, reply) => {
      
      const controller = new HQController(request, reply, hqService);
      return controller.getUserMissions();
    }),
  );

  // POST /api/hq/users/:userId/missions - 分配任務給用戶
  app.post(
    '/users/:userId/missions',
    { schema: schemas.assignMissionSchema },
    asyncHandler(async (request, reply) => {
      
      const controller = new HQController(request, reply, hqService);
      return controller.assignMission();
    }),
  );

  // DELETE /api/hq/users/:userId/missions/:assignmentId - 放棄任務
  app.delete(
    '/users/:userId/missions/:assignmentId',
    { schema: schemas.abandonMissionSchema },
    asyncHandler(async (request, reply) => {
      
      const controller = new HQController(request, reply, hqService);
      return controller.abandonMission();
    }),
  );

  // ============================================
  // 徽章管理 (Badge Management)
  // ============================================

  // GET /api/hq/users/:userId/badges - 獲取用戶徽章
  app.get(
    '/users/:userId/badges',
    { schema: schemas.getUserBadgesSchema },
    asyncHandler(async (request, reply) => {
      
      const controller = new HQController(request, reply, hqService);
      return controller.getUserBadges();
    }),
  );

  // DELETE /api/hq/users/:userId/badges/:templateId - 撤銷徽章
  app.delete(
    '/users/:userId/badges/:templateId',
    { schema: schemas.removeUserBadgeSchema },
    asyncHandler(async (request, reply) => {
      
      const controller = new HQController(request, reply, hqService);
      return controller.removeUserBadge();
    }),
  );

  // ============================================
  // 其他用戶數據 (Streaks, Journeys, Messages)
  // ============================================

  // GET /api/hq/users/:userId/streaks - 獲取用戶連續記錄
  app.get(
    '/users/:userId/streaks',
    { schema: schemas.getUserStreaksSchema },
    asyncHandler(async (request, reply) => {
      
      const controller = new HQController(request, reply, hqService);
      return controller.getUserStreaks();
    }),
  );

  // GET /api/hq/users/:userId/journeys - 獲取用戶旅程階段
  app.get(
    '/users/:userId/journeys',
    { schema: schemas.getUserJourneysSchema },
    asyncHandler(async (request, reply) => {
      
      const controller = new HQController(request, reply, hqService);
      return controller.getUserJourneys();
    }),
  );

  // GET /api/hq/users/:userId/messages - 獲取用戶消息日誌
  app.get(
    '/users/:userId/messages',
    { schema: schemas.getUserMessagesSchema },
    asyncHandler(async (request, reply) => {
      
      const controller = new HQController(request, reply, hqService);
      return controller.getUserMessages();
    }),
  );

  // ============================================
  // 統計數據 (Statistics)
  // ============================================

  // GET /api/hq/stats - 獲取統計數據
  app.get(
    '/stats',
    { schema: schemas.getStatsSchema },
    asyncHandler(async (request, reply) => {
      
      const controller = new HQController(request, reply, hqService);
      return controller.getStats();
    }),
  );
}
