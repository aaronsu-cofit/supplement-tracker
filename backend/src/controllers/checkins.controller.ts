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
    try {
      const userId = this.getUserId();
      const { date, startDate, endDate, type } = this.request.query as any;

      if (type === 'streak') {
        const streak = await this.checkinsService.getStreak(userId);
        return { streak };
      }

      if (type === 'history' && startDate && endDate) {
        const history = await this.checkinsService.getHistory(userId, startDate, endDate);
        return history;
      }

      const checkIns = await this.checkinsService.getCheckIns(userId, date);
      return checkIns;
    } catch (error) {
      this.logError('[Checkins /getCheckIns]', error);
      return this.reply.code(500).send({ error: 'Failed to fetch check-ins' });
    }
  }

  async createCheckIn() {
    try {
      const userId = this.getUserId();
      const body = (await this.request.body) as { supplementId?: number };

      // 驗證 supplementId
      if (!body.supplementId) {
        this.reply.code(400);
        return { error: 'supplementId is required' };
      }

      const checkIn = await this.checkinsService.createCheckIn(userId, body.supplementId);
      this.reply.code(201);
      return checkIn;
    } catch (error) {
      this.logError('[Checkins /createCheckIn]', error);
      return this.reply.code(500).send({ error: 'Failed to check in' });
    }
  }

  async removeCheckIn() {
    try {
      const userId = this.getUserId();
      const body = (await this.request.body) as { supplementId: number; date?: string };
      await this.checkinsService.removeCheckIn(userId, body.supplementId, body.date);
      return { success: true };
    } catch (error) {
      this.logError('[Checkins /removeCheckIn]', error);
      return this.reply.code(500).send({ error: 'Failed to remove check-in' });
    }
  }
}
