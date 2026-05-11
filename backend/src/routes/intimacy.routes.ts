// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/routes/intimacy.routes.ts
import { FastifyInstance } from 'fastify';
import { IntimacyController } from '../controllers/intimacy.controller.js';
import { asyncHandler } from '../controllers/base.controller.js';
import { container } from '../lib/container.js';
import type { IntimacyService } from '../services/intimacy.service.js';
import { authenticateUser } from '../middleware/auth.js';
import {
  getIntimacyAssessmentsSchema,
  createIntimacyAssessmentSchema,
} from '../schemas/intimacy.schema.js';

/**
 * Intimacy 路由 - 掛載到 /api/intimacy
 *
 * 所有路由都需要強制用戶認證
 *
 * 端點：
 * - GET  /api/intimacy/assessments - 獲取用戶的親密關係評估
 * - POST /api/intimacy/assessments - 創建新的親密關係評估
 */
export async function intimacyRoutes(app: FastifyInstance) {
  const intimacyService = container.get<IntimacyService>('intimacyService');

  app.addHook('onRequest', authenticateUser);

  // GET /api/intimacy/assessments
  app.get(
    '/assessments',
    { schema: getIntimacyAssessmentsSchema },
    asyncHandler(async (request, reply) => {
      const controller = new IntimacyController(request, reply, intimacyService);
      return controller.getAssessments();
    }),
  );

  // POST /api/intimacy/assessments
  app.post(
    '/assessments',
    { schema: createIntimacyAssessmentSchema },
    asyncHandler(async (request, reply) => {
      const controller = new IntimacyController(request, reply, intimacyService);
      return controller.createAssessment();
    }),
  );
}
