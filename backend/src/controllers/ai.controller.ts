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
    const userId = this.getAuthenticatedUserId();
    const body = (await this.request.body) as AIRequestBody;

    this.logDebug('Running AI skill', { userId, agentId: body.agent_id });
    const result = await this.aiService.runAI(body.agent_id || '', userId);

    return result;
  }

  /**
   * POST /api/ai/stream - SSE 串流執行 AI Skill
   */
  async streamAI() {
    const userId = this.getAuthenticatedUserId();
    const body = (await this.request.body) as AIRequestBody;

    this.logDebug('Streaming AI skill', { userId, agentId: body.agent_id });
    const upstream = await this.aiService.streamAI(body.agent_id || '', userId);

    if (!upstream.body) {
      this.reply.code(502);
      return { error: 'ADK stream has no body' };
    }

    // 返回 SSE 串流響應
    return this.reply
      .header('Content-Type', 'text/event-stream')
      .header('Cache-Control', 'no-cache')
      .header('Connection', 'keep-alive')
      .send(upstream.body);
  }
}
