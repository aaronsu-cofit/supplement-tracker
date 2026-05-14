// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/services/scheduler.service.ts
import { PrismaClient } from '@prisma/client';
import { ValidationError } from '../middleware/errorHandler.js';
import { runDailyCycle, dryRunScheduler, type TimeSlot } from '../lib/scheduler.js';
import {
  getActiveEnrollmentsList,
  getRecentDeliveries,
  getRecentEngagementEvents,
} from '../lib/db.js';

interface DryRunInput {
  user_id: string;
  scenario_id?: string;
  as_of?: string;
}

/**
 * SchedulerService - 業務邏輯層
 * 責任：
 * - Scheduler 操作（run, activity, dry-run）
 * - 數據驗證和業務規則
 * - 與數據庫和調度器交互
 */
export class SchedulerService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 執行每日調度週期
   * @param skipMenu - 是否跳過菜單重新評估
   * @returns 調度執行結果
   */
  async runDailyCycle(skipMenu: boolean, timeSlot?: TimeSlot) {
    return runDailyCycle({ includeMenuReeval: !skipMenu, timeSlot });
  }

  /**
   * 獲取調度器活動數據
   * @param queryOa - 可選的 OA ID
   * @returns 活動數據（enrollments, deliveries, engagement）
   */
  async getActivity(queryOa?: string) {
    const envOa = parseInt(process.env.LINE_OA_ID || '0');
    const oaId = queryOa ? parseInt(queryOa) : envOa > 0 ? envOa : undefined;

    const [enrollments, deliveries, engagement] = await Promise.all([
      getActiveEnrollmentsList(50, oaId),
      getRecentDeliveries(50, oaId),
      getRecentEngagementEvents(50),
    ]);

    return { enrollments, deliveries, engagement, oaId: oaId ?? null };
  }

  /**
   * 執行調度器乾跑（不產生副作用）
   * @param input - 乾跑參數
   * @returns 調度器會執行的動作
   */
  async dryRun(input: DryRunInput) {
    // 驗證 user_id
    if (!input.user_id || typeof input.user_id !== 'string') {
      throw new ValidationError('user_id is required', [
        { field: 'user_id', message: 'user_id must be a non-empty string' },
      ]);
    }

    // 驗證 as_of（如果提供）
    let asOf: Date | undefined;
    if (input.as_of) {
      const d = new Date(input.as_of);
      if (isNaN(d.getTime())) {
        throw new ValidationError('Invalid as_of date', [
          { field: 'as_of', message: 'as_of must be a valid ISO date string' },
        ]);
      }
      asOf = d;
    }

    return dryRunScheduler({
      userId: input.user_id,
      scenarioId: input.scenario_id,
      asOf,
    });
  }
}
