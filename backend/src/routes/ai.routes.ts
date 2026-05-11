// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/routes/ai.routes.ts
import { FastifyInstance } from 'fastify';
import { AIController } from '../controllers/ai.controller.js';
import { asyncHandler } from '../controllers/base.controller.js';
import { container } from '../lib/container.js';
import type { AIService } from '../services/ai.service.js';
import { authenticateUser } from '../middleware/auth.js';
import { runAISchema, streamAISchema } from '../schemas/ai.schema.js';

/**
 * AI 路由 - 掛載到 /api/ai
 *
 * 所有路由都需要強制用戶認證（使用 authMiddleware 等效）
 *
 * 端點：
 * - POST /api/ai/run    - 同步執行 AI Skill（LINE 聊天室用）
 * - POST /api/ai/stream - SSE 串流執行 AI Skill（LIFF 用）
 */
export async function aiRoutes(app: FastifyInstance) {
  const aiService = container.get<AIService>('aiService');

  app.addHook('onRequest', authenticateUser);

  // POST /api/ai/run - 同步執行 AI Skill
  app.post(
    '/run',
    { schema: runAISchema },
    asyncHandler(async (request, reply) => {
      const controller = new AIController(request, reply, aiService);
      return controller.runAI();
    }),
  );

  // POST /api/ai/stream - SSE 串流執行 AI Skill
  app.post(
    '/stream',
    { schema: streamAISchema },
    asyncHandler(async (request, reply) => {
      const controller = new AIController(request, reply, aiService);
      return controller.streamAI();
    }),
  );
}
