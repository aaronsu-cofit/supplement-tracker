// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/ai.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { AIService } from '../services/ai.service.js';

interface AIRequestBody {
  agent_id?: string;
}

/**
 * AIController - HTTP 層
 * 責任：
 * - 請求參數處理
 * - 調用 Service 業務邏輯
 * - 格式化響應
 * - 錯誤處理
 */
export class AIController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private aiService: AIService,
  ) {
    super(request, reply);
  }

  /**
   * POST /api/ai/run - 同步執行 AI Skill
   */
  async runAI() {
    try {
      const userId = this.getAuthenticatedUserId();
      const body = (await this.request.body) as AIRequestBody;

      if (!body.agent_id || typeof body.agent_id !== 'string') {
        return this.reply.code(400).send({ error: 'agent_id is required' });
      }

      this.logDebug('Running AI skill', { userId, agentId: body.agent_id });
      const result = await this.aiService.runAI(body.agent_id, userId);

      return result;
    } catch (err) {
      this.logError('[AI /run]', err);
      return this.reply.code(500).send({ error: 'AI execution failed' });
    }
  }

  /**
   * POST /api/ai/stream - SSE 串流執行 AI Skill
   */
  async streamAI() {
    try {
      const userId = this.getAuthenticatedUserId();
      const body = (await this.request.body) as AIRequestBody;

      if (!body.agent_id || typeof body.agent_id !== 'string') {
        return this.reply.code(400).send({ error: 'agent_id is required' });
      }

      this.logDebug('Streaming AI skill', { userId, agentId: body.agent_id });
      const upstream = await this.aiService.streamAI(body.agent_id, userId);

      if (!upstream.body) {
        return this.reply.code(502).send({ error: 'ADK stream has no body' });
      }

      // 返回 SSE 串流響應
      return this.reply
        .header('Content-Type', 'text/event-stream')
        .header('Cache-Control', 'no-cache')
        .header('Connection', 'keep-alive')
        .send(upstream.body);
    } catch (err) {
      this.logError('[AI /stream]', err);
      return this.reply.code(500).send({ error: 'AI stream failed' });
    }
  }
}
