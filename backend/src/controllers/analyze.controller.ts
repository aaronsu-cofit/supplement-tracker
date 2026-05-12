// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/analyze.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { AnalyzeService } from '../services/analyze.service.js';
import type { AnalyzeRequestBody } from '../types.js';

export class AnalyzeController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private analyzeService: AnalyzeService,
  ) {
    super(request, reply);
  }

  async analyze() {
    const userId = this.getUserId();
    const body = (await this.request.body) as AnalyzeRequestBody;

    try {
      const result = await this.analyzeService.analyzeImage(userId, body);
      // Service 已經返回 { success: true, ... } 格式，直接返回
      return result;
    } catch (error) {
      const message = (error as Error).message;

      if (message === 'No image provided') {
        this.reply.code(400);
        return { error: message };
      }

      if (message === 'GEMINI_API_KEY not configured') {
        this.reply.code(500);
        return { error: message };
      }

      if (message.includes('Could not parse AI response')) {
        this.reply.code(422);
        return { error: message };
      }

      if (message === 'No supplements to match against') {
        this.reply.code(400);
        return { error: message };
      }

      this.logError('[Analyze]', error);
      return this.reply.code(500).send({ error: 'Failed to analyze image' });
    }
  }
}
