// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/routes/wizard.routes.ts
import { FastifyInstance } from 'fastify';
import { WizardController } from '../controllers/wizard.controller.js';
import { asyncHandler } from '../controllers/base.controller.js';
import { container } from '../lib/container.js';
import type { WizardService } from '../services/wizard.service.js';
import { authenticateUser } from '../middleware/auth.js';
import {
  getScenariosSchema,
  createScenarioSchema,
  getScenarioSchema,
  updateScenarioSchema,
  deleteScenarioSchema,
  enrollAllUsersSchema,
  deleteEnrollmentSchema,
  deleteAllEnrollmentsSchema,
} from '../schemas/wizard.schema.js';

/**
 * Wizard 路由 - 掛載到 /api/wizard
 *
 * 所有路由都需要強制用戶認證（使用 authMiddleware 等效）
 *
 * 端點：
 * - GET    /api/wizard/oa/:oaId/scenarios          - 獲取 OA 的所有場景
 * - POST   /api/wizard/oa/:oaId/scenarios          - 創建新場景
 * - GET    /api/wizard/scenarios/:id               - 獲取單個場景
 * - PATCH  /api/wizard/scenarios/:id               - 更新場景
 * - DELETE /api/wizard/scenarios/:id               - 刪除場景
 * - POST   /api/wizard/scenarios/:id/enroll-all    - 批量註冊所有 LINE 用戶
 * - DELETE /api/wizard/enrollments/:id             - 刪除單個註冊
 * - DELETE /api/wizard/scenarios/:id/enrollments   - 刪除場景的所有註冊
 */
export async function wizardRoutes(app: FastifyInstance) {
  const wizardService = container.get<WizardService>('wizardService');

  app.addHook('onRequest', authenticateUser);

  // GET /api/wizard/oa/:oaId/scenarios
  app.get(
    '/oa/:oaId/scenarios',
    { schema: getScenariosSchema },
    asyncHandler(async (request, reply) => {
      const controller = new WizardController(request, reply, wizardService);
      return controller.getScenarios();
    }),
  );

  // POST /api/wizard/oa/:oaId/scenarios
  app.post(
    '/oa/:oaId/scenarios',
    { schema: createScenarioSchema },
    asyncHandler(async (request, reply) => {
      const controller = new WizardController(request, reply, wizardService);
      return controller.createScenario();
    }),
  );

  // GET /api/wizard/scenarios/:id
  app.get(
    '/scenarios/:id',
    { schema: getScenarioSchema },
    asyncHandler(async (request, reply) => {
      const controller = new WizardController(request, reply, wizardService);
      return controller.getScenario();
    }),
  );

  // PATCH /api/wizard/scenarios/:id
  app.patch(
    '/scenarios/:id',
    { schema: updateScenarioSchema },
    asyncHandler(async (request, reply) => {
      const controller = new WizardController(request, reply, wizardService);
      return controller.updateScenario();
    }),
  );

  // DELETE /api/wizard/scenarios/:id
  app.delete(
    '/scenarios/:id',
    { schema: deleteScenarioSchema },
    asyncHandler(async (request, reply) => {
      const controller = new WizardController(request, reply, wizardService);
      return controller.deleteScenario();
    }),
  );

  // POST /api/wizard/scenarios/:id/enroll-all
  app.post(
    '/scenarios/:id/enroll-all',
    { schema: enrollAllUsersSchema },
    asyncHandler(async (request, reply) => {
      const controller = new WizardController(request, reply, wizardService);
      return controller.enrollAllUsers();
    }),
  );

  // DELETE /api/wizard/enrollments/:id
  app.delete(
    '/enrollments/:id',
    { schema: deleteEnrollmentSchema },
    asyncHandler(async (request, reply) => {
      const controller = new WizardController(request, reply, wizardService);
      return controller.deleteEnrollment();
    }),
  );

  // DELETE /api/wizard/scenarios/:id/enrollments
  app.delete(
    '/scenarios/:id/enrollments',
    { schema: deleteAllEnrollmentsSchema },
    asyncHandler(async (request, reply) => {
      const controller = new WizardController(request, reply, wizardService);
      return controller.deleteAllEnrollments();
    }),
  );
}
