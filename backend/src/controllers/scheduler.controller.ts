// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/scheduler.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { SchedulerService } from '../services/scheduler.service.js';

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
    const query = this.request.query as { skip_menu_reeval?: string };
    const skipMenu = query.skip_menu_reeval === '1';

    this.logDebug('Running daily scheduler', { skipMenu });
    const result = await this.schedulerService.runDailyCycle(skipMenu);

    return result;
  }

  /**
   * GET /api/scheduler/activity - 獲取調度器活動數據
   */
  async getActivity() {
    const query = this.request.query as { oa_id?: string };
    const result = await this.schedulerService.getActivity(query.oa_id);

    this.logDebug('Fetched scheduler activity', {
      enrollmentCount: result.enrollments.length,
      deliveryCount: result.deliveries.length,
    });

    return result;
  }

  /**
   * POST /api/scheduler/dry-run - 執行調度器乾跑
   */
  async dryRun() {
    const body = (await this.request.body) as DryRunBody;

    this.logDebug('Running scheduler dry-run', { userId: body.user_id });
    const result = await this.schedulerService.dryRun({
      user_id: body.user_id || '',
      scenario_id: body.scenario_id,
      as_of: body.as_of,
    });

    return result;
  }
}
