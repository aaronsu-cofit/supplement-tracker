// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/checkins.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { CheckinsService } from '../services/checkins.service.js';

export class CheckinsController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private checkinsService: CheckinsService,
  ) {
    super(request, reply);
  }

  async getCheckIns() {
    const userId = this.getUserId();
    const { date, startDate, endDate, type } = this.request.query as any;

    if (type === 'streak') {
      const streak = await this.checkinsService.getStreak(userId);
      return this.sendSuccess({ streak });
    }

    if (type === 'history' && startDate && endDate) {
      const history = await this.checkinsService.getHistory(userId, startDate, endDate);
      return this.sendSuccess(history);
    }

    const checkIns = await this.checkinsService.getCheckIns(userId, date);
    return this.sendSuccess(checkIns);
  }

  async createCheckIn() {
    const userId = this.getUserId();
    const body = (await this.request.body) as { supplementId: number };

    try {
      const checkIn = await this.checkinsService.createCheckIn(userId, body.supplementId);
      this.reply.code(201);
      return this.sendSuccess(checkIn);
    } catch (error) {
      if ((error as Error).message === 'supplementId is required') {
        this.reply.code(400);
        return { error: 'supplementId is required' };
      }
      throw error;
    }
  }

  async removeCheckIn() {
    const userId = this.getUserId();
    const body = (await this.request.body) as { supplementId: number; date?: string };
    await this.checkinsService.removeCheckIn(userId, body.supplementId, body.date);
    return this.sendSuccess({ success: true });
  }
}
