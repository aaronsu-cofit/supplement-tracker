// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/ai.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { AIService } from '../services/ai.service.js';
import { BadRequestError, ServiceUnavailableError } from '../middleware/errorHandler.js';

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
      this.logDebug('[POST /api/ai/run] 開始執行 AI Skill');
      const userId = this.getAuthenticatedUserId();

      let body: AIRequestBody;
      try {
        body = (await this.request.body) as AIRequestBody;
      } catch {
        this.logDebug('[POST /api/ai/run] 無效的 JSON');
        this.reply.code(400);
        return { error: 'invalid JSON' };
      }

      if (!body.agent_id || typeof body.agent_id !== 'string') {
        this.reply.code(400);
        return { error: 'agent_id is required' };
      }

      this.logDebug('[POST /api/ai/run] 執行 AI', { userId, agentId: body.agent_id });
      const result = await this.aiService.runAI(body.agent_id, userId);
      this.logDebug('[POST /api/ai/run] AI 執行完成');

      return result;
    } catch (error) {
      if (error instanceof BadRequestError) {
        this.reply.code(400);
        return { error: error.message };
      }

      if (error instanceof ServiceUnavailableError) {
        this.reply.code(503);
        return { error: error.message };
      }

      console.error('[POST /api/ai/run] 錯誤:', error);
      this.logError('[POST /api/ai/run] 錯誤', error);
      this.reply.code(500);
      return { error: 'AI execution failed' };
    }
  }

  /**
   * POST /api/ai/stream - SSE 串流執行 AI Skill
   */
  async streamAI() {
    try {
      this.logDebug('[POST /api/ai/stream] 開始執行 AI 串流');
      const userId = this.getAuthenticatedUserId();

      let body: AIRequestBody;
      try {
        body = (await this.request.body) as AIRequestBody;
      } catch {
        this.logDebug('[POST /api/ai/stream] 無效的 JSON');
        this.reply.code(400);
        return { error: 'invalid JSON' };
      }

      if (!body.agent_id || typeof body.agent_id !== 'string') {
        this.reply.code(400);
        return { error: 'agent_id is required' };
      }

      this.logDebug('[POST /api/ai/stream] 執行 AI 串流', { userId, agentId: body.agent_id });
      const upstream = await this.aiService.streamAI(body.agent_id, userId);

      if (!upstream.body) {
        this.reply.code(502);
        return { error: 'ADK stream has no body' };
      }

      // 返回 SSE 串流響應
      this.logDebug('[POST /api/ai/stream] 串流開始');
      return this.reply
        .header('Content-Type', 'text/event-stream')
        .header('Cache-Control', 'no-cache')
        .header('Connection', 'keep-alive')
        .send(upstream.body);
    } catch (error) {
      if (error instanceof BadRequestError) {
        this.reply.code(400);
        return { error: error.message };
      }

      if (error instanceof ServiceUnavailableError) {
        this.reply.code(503);
        return { error: error.message };
      }

      console.error('[POST /api/ai/stream] 錯誤:', error);
      this.logError('[POST /api/ai/stream] 錯誤', error);
      this.reply.code(500);
      return { error: 'AI stream failed' };
    }
  }
}
