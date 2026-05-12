// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/routes/analyze.routes.ts
import { FastifyInstance } from 'fastify';
import { AnalyzeController } from '../controllers/analyze.controller.js';
import { asyncHandler } from '../controllers/base.controller.js';
import { container } from '../lib/container.js';
import { softAuthPreHandler } from '../middleware/authMiddleware.js';
import type { AnalyzeService } from '../services/analyze.service.js';
import { analyzeSchema } from '../schemas/analyze.schema.js';

export async function analyzeRoutes(app: FastifyInstance) {
  const analyzeService = container.get<AnalyzeService>('analyzeService');

  // Apply softAuth to all routes
  app.addHook('preHandler', softAuthPreHandler);

  app.post(
    '/',
    { schema: analyzeSchema },
    asyncHandler(async (request, reply) => {
      const controller = new AnalyzeController(request, reply, analyzeService);
      return controller.analyze();
    }),
  );
}
