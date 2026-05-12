// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/analyze.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { AnalyzeService } from '../services/analyze.service.js';
import { BadRequestError, ServiceUnavailableError, ValidationError } from '../middleware/errorHandler.js';
import type { AnalyzeRequestBody } from '../types.js';

export class AnalyzeController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private analyzeService: AnalyzeService,
  ) {
    super(request, reply);
  }

  async analyzeImage() {
    try {
      this.logDebug('[POST /api/analyze] 開始分析');
      const userId = this.getUserId();

      let body: AnalyzeRequestBody;
      try {
        body = (await this.request.body) as AnalyzeRequestBody;
      } catch {
        this.logDebug('[POST /api/analyze] 無效的 JSON');
        this.reply.code(400);
        return { error: 'invalid JSON' };
      }

      const result = await this.analyzeService.analyzeImage(userId, body);
      this.logDebug('[POST /api/analyze] 分析完成', { mode: body.mode });
      // Service 已經返回 { success: true, ... } 格式，直接返回
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

      if (error instanceof ValidationError) {
        this.reply.code(422);
        return { error: error.message, validation: error.validation };
      }

      console.error('[POST /api/analyze] 錯誤:', error);
      this.logError('[POST /api/analyze] 錯誤', error);
      this.reply.code(500);
      return { error: 'Failed to analyze image' };
    }
  }
}
