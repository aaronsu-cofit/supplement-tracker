// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/scheduler.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { SchedulerService } from '../services/scheduler.service.js';
import { ValidationError } from '../middleware/errorHandler.js';

interface DryRunBody {
  user_id?: string;
  scenario_id?: string;
  as_of?: string;
}

/**
 * SchedulerController - HTTP 層
 * 責任：
 * - 請求參數處理
 * - 調用 Service 業務邏輯
 * - 格式化響應
 * - 錯誤處理
 */
export class SchedulerController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private schedulerService: SchedulerService,
  ) {
    super(request, reply);
  }

  /**
   * POST /api/scheduler/run - 執行每日調度週期
   */
  async runScheduler() {
    try {
      const query = this.request.query as { skip_menu_reeval?: string; time_slot?: string };
      const skipMenu = query.skip_menu_reeval === '1';
      const timeSlot = (query.time_slot as import('../lib/scheduler.js').TimeSlot) || undefined;

      this.logDebug('Running daily scheduler', { skipMenu, timeSlot });
      const result = await this.schedulerService.runDailyCycle(skipMenu, timeSlot);

      return result;
    } catch (error) {
      console.error('[scheduler/run] error:', error);
      this.logError('[Scheduler /runScheduler]', error);
      this.reply.code(500);
      return { error: 'Scheduler run failed', details: (error as Error).message };
    }
  }

  /**
   * GET /api/scheduler/activity - 獲取調度器活動數據
   */
  async getActivity() {
    try {
      const query = this.request.query as { oa_id?: string };
      const result = await this.schedulerService.getActivity(query.oa_id);

      this.logDebug('Fetched scheduler activity', {
        enrollmentCount: result.enrollments.length,
        deliveryCount: result.deliveries.length,
      });

      return result;
    } catch (error) {
      console.error('[scheduler/activity] error:', error);
      this.logError('[Scheduler /getActivity]', error);
      this.reply.code(500);
      return { error: 'Failed to load activity' };
    }
  }

  /**
   * POST /api/scheduler/dry-run - 執行調度器乾跑
   */
  async dryRun() {
    try {
      let body: DryRunBody;
      try {
        body = (await this.request.body) as DryRunBody;
      } catch {
        this.reply.code(400);
        return { error: 'invalid JSON' };
      }

      this.logDebug('Running scheduler dry-run', { userId: body.user_id });
      const result = await this.schedulerService.dryRun({
        user_id: body.user_id || '',
        scenario_id: body.scenario_id,
        as_of: body.as_of,
      });

      return result;
    } catch (error) {
      const message = (error as Error).message;
      console.error('[scheduler/dry-run] error:', error);
      this.logError('[Scheduler /dryRun]', error);

      // Handle ValidationError from service
      if (error instanceof ValidationError) {
        this.reply.code(400);
        return { error: message };
      }

      this.reply.code(500);
      return { error: 'Dry run failed', details: message };
    }
  }
}
