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
      this.logDebug('[GET /api/checkins] 開始獲取簽到');
      const userId = this.getUserId();
      const { date, startDate, endDate, type } = this.request.query as any;

      if (type === 'streak') {
        this.logDebug('[GET /api/checkins] 獲取連續簽到');
        const streak = await this.checkinsService.getStreak(userId);
        this.logDebug('[GET /api/checkins] 連續簽到獲取成功', { streak });
        return { streak };
      }

      if (type === 'history' && startDate && endDate) {
        this.logDebug('[GET /api/checkins] 獲取簽到歷史');
        const history = await this.checkinsService.getHistory(userId, startDate, endDate);
        this.logDebug('[GET /api/checkins] 簽到歷史獲取成功');
        return history;
      }

      const checkIns = await this.checkinsService.getCheckIns(userId, date);
      this.logDebug('[GET /api/checkins] 簽到列表獲取成功');
      return checkIns;
    } catch (error) {
      console.error('[GET /api/checkins] 錯誤:', error);
      this.logError('[GET /api/checkins] 錯誤', error);
      this.reply.code(500);
      return { error: 'Failed to fetch check-ins' };
    }
  }

  async createCheckIn() {
    try {
      this.logDebug('[POST /api/checkins] 開始創建簽到');
      const userId = this.getUserId();

      let body: { supplementId?: number };
      try {
        body = (await this.request.body) as { supplementId?: number };
      } catch {
        this.logDebug('[POST /api/checkins] 無效的 JSON');
        this.reply.code(400);
        return { error: 'invalid JSON' };
      }

      // 驗證 supplementId
      if (!body.supplementId) {
        this.logDebug('[POST /api/checkins] 缺少 supplementId');
        this.reply.code(400);
        return { error: 'supplementId is required' };
      }

      const checkIn = await this.checkinsService.createCheckIn(userId, body.supplementId);
      this.logDebug('[POST /api/checkins] 簽到創建成功', { supplementId: body.supplementId });
      this.reply.code(201);
      return checkIn;
    } catch (error) {
      console.error('[POST /api/checkins] 錯誤:', error);
      this.logError('[POST /api/checkins] 錯誤', error);
      this.reply.code(500);
      return { error: 'Failed to check in' };
    }
  }

  async removeCheckIn() {
    try {
      this.logDebug('[DELETE /api/checkins] 開始刪除簽到');
      const userId = this.getUserId();

      let body: { supplementId: number; date?: string };
      try {
        body = (await this.request.body) as { supplementId: number; date?: string };
      } catch {
        this.logDebug('[DELETE /api/checkins] 無效的 JSON');
        this.reply.code(400);
        return { error: 'invalid JSON' };
      }

      await this.checkinsService.removeCheckIn(userId, body.supplementId, body.date);
      this.logDebug('[DELETE /api/checkins] 簽到刪除成功', { supplementId: body.supplementId });
      return { success: true };
    } catch (error) {
      console.error('[DELETE /api/checkins] 錯誤:', error);
      this.logError('[DELETE /api/checkins] 錯誤', error);
      this.reply.code(500);
      return { error: 'Failed to remove check-in' };
    }
  }
}
