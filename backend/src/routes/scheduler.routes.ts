// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/routes/scheduler.routes.ts
import { FastifyInstance } from 'fastify';
import { SchedulerController } from '../controllers/scheduler.controller.js';
import { asyncHandler } from '../controllers/base.controller.js';
import { container } from '../lib/container.js';
import type { SchedulerService } from '../services/scheduler.service.js';
import { authPreHandler } from '../middleware/authMiddleware.js';
import {
  runSchedulerSchema,
  getSchedulerActivitySchema,
  schedulerDryRunSchema,
} from '../schemas/scheduler.schema.js';

/**
 * Scheduler 路由 - 掛載到 /api/scheduler
 *
 * 所有路由都需要強制用戶認證（使用 authMiddleware 等效）
 *
 * 端點：
 * - POST /api/scheduler/run        - 執行每日調度週期
 * - GET  /api/scheduler/activity   - 獲取調度器活動數據
 * - POST /api/scheduler/dry-run    - 執行調度器乾跑
 */
export async function schedulerRoutes(app: FastifyInstance) {
  const schedulerService = container.get<SchedulerService>('schedulerService');

  app.addHook('onRequest', authPreHandler);

  // POST /api/scheduler/run
  app.post(
    '/run',
    { schema: runSchedulerSchema },
    asyncHandler(async (request, reply) => {
      const controller = new SchedulerController(request, reply, schedulerService);
      return controller.runScheduler();
    }),
  );

  // GET /api/scheduler/activity
  app.get(
    '/activity',
    { schema: getSchedulerActivitySchema },
    asyncHandler(async (request, reply) => {
      const controller = new SchedulerController(request, reply, schedulerService);
      return controller.getActivity();
    }),
  );

  // POST /api/scheduler/dry-run
  app.post(
    '/dry-run',
    { schema: schedulerDryRunSchema },
    asyncHandler(async (request, reply) => {
      const controller = new SchedulerController(request, reply, schedulerService);
      return controller.dryRun();
    }),
  );
}
