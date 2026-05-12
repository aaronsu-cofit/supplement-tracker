import { PrismaClient } from '@prisma/client';
import {
  findUserById, getHabitsForUserProduct, getMissionDailyHistory, getMissionTemplateByKey,
  deleteMissionDailyLog as deleteMissionDailyLogDb, getMissionTemplatesForProduct, assignMission, abandonMissionAssignment,
  upsertUserMissionSetting, getUserMissionSetting, db, upsertMissionDailyLog as upsertMissionDailyLogDb,
} from '../lib/db.js';
import { logHabitDay } from '../lib/habits.js';
import { sendHabitReminder as sendHabitReminderLib } from '../lib/reminders.js';
import { localDateInTz } from '../lib/time.js';

/**
 * Me Service - User Personal Data & Mission Management
 *
 * 負責用戶個人數據、習慣跟蹤、任務訂閱和設定管理
 */
export class MeService {
  constructor(private prisma: PrismaClient) {}

  // ─── Validation Methods ─────────────────────────────────────────

  /**
   * 驗證 product_id 欄位
   */
  validateProductId(productId: string | undefined): string | null {
    if (!productId) {
      return 'product_id query/body required';
    }
    return null;
  }

  /**
   * 驗證任務日誌記錄輸入
   */
  validateHabitLogInput(body: Record<string, unknown>, productId?: string): string | null {
    if (!productId) {
      return 'product_id required';
    }

    // 驗證 action 類型
    const action = body.action as string | undefined;
    const validActions = ['toggle', 'increment', 'set_value', 'subtask', 'skip', 'unskip'];
    if (action && !validActions.includes(action)) {
      return `action 需為 ${validActions.join('/')}`;
    }

    // 驗證 step (increment 時)
    if (action === 'increment' && body.step !== undefined) {
      if (typeof body.step !== 'number') {
        return 'step 需為數字';
      }
    }

    // 驗證 value (set_value 時)
    if (action === 'set_value' && body.value !== undefined) {
      if (typeof body.value !== 'number') {
        return 'value 需為數字';
      }
    }

    // 驗證 subtask (subtask action 時)
    if (action === 'subtask' && !body.subtask_key) {
      return 'subtask_key required for subtask action';
    }

    // 驗證 date 格式
    if (body.date !== undefined) {
      const d = new Date((body.date as string) + 'T00:00:00Z');
      if (isNaN(d.getTime())) {
        return 'invalid date, expected YYYY-MM-DD';
      }
    }

    return null;
  }

  /**
   * 驗證任務設定輸入
   */
  validateMissionSettingsInput(body: Record<string, unknown>): string | null {
    // 所有欄位都是可選的，只驗證類型
    if (body.reminder_enabled !== undefined && typeof body.reminder_enabled !== 'boolean') {
      return 'reminder_enabled 需為布林值';
    }
    if (body.reminder_time !== undefined && typeof body.reminder_time !== 'string') {
      return 'reminder_time 需為字串';
    }
    if (body.notes !== undefined && body.notes !== null && typeof body.notes !== 'string') {
      return 'notes 需為字串或 null';
    }
    return null;
  }

  // ─── Business Logic Methods ─────────────────────────────────────

  /**
   * 解析習慣日誌記錄的 action
   */
  parseHabitAction(body: Record<string, unknown>): Parameters<typeof logHabitDay>[0]['action'] {
    switch (body.action ?? 'toggle') {
      case 'increment':
        return { kind: 'increment', step: typeof body.step === 'number' ? body.step : 1 };
      case 'set_value':
        return { kind: 'set_value', value: typeof body.value === 'number' ? body.value : 0 };
      case 'subtask':
        return {
          kind: 'subtask',
          key: body.subtask_key as string,
          completed: (body.subtask_completed as boolean) ?? true,
        };
      case 'skip':
        return { kind: 'skip' };
      case 'unskip':
        return { kind: 'unskip' };
      default:
        return { kind: 'toggle' };
    }
  }

  /**
   * 解析日期和時區
   */
  parseDateAndTimezone(userId: string, dateStr?: string): {
    date?: Date;
    tz: string;
    today: Date;
  } {
    const user = { timezone: 'Asia/Taipei' }; // 預設值，實際應查詢用戶
    const tz = user.timezone || 'Asia/Taipei';
    const today = localDateInTz(new Date(), tz);

    let date: Date | undefined;
    if (dateStr) {
      const d = new Date(dateStr + 'T00:00:00Z');
      if (!isNaN(d.getTime())) {
        date = d;
      }
    }

    return { date, tz, today };
  }

  /**
   * 解析並清理筆記內容
   */
  parseNoteContent(note: unknown): string | null | undefined {
    if (note === undefined) return undefined;
    if (note === null) return null;
    return String(note).slice(0, 500);
  }

  /**
   * 計算歷史記錄的日期範圍
   */
  calculateHistoryDateRange(tz: string, daysParam?: string): { since: Date; today: Date } {
    const today = localDateInTz(new Date(), tz);
    const daysNum = Math.min(365, parseInt(daysParam || '30', 10));
    const since = new Date(today);
    since.setUTCDate(since.getUTCDate() - daysNum);
    return { since, today };
  }

  // ─── Database Access Methods ───────────────────────────────────

  /**
   * 獲取用戶習慣列表
   */
  async getHabitsForUserProduct(userId: string, productId: string, today: Date) {
    return getHabitsForUserProduct(userId, productId, today);
  }

  /**
   * 記錄習慣日誌
   */
  async logHabitDay(input: {
    productId: string;
    userId: string;
    missionKey: string;
    date?: Date;
    action: Parameters<typeof logHabitDay>[0]['action'];
    note?: string | null;
    autoAssign?: boolean;
  }) {
    return logHabitDay({
      productId: input.productId,
      userId: input.userId,
      missionKey: input.missionKey,
      date: input.date,
      action: input.action,
      note: input.note,
      autoAssign: input.autoAssign !== false,
    });
  }

  /**
   * 獲取任務樣板
   */
  async getMissionTemplateByKey(productId: string, missionKey: string) {
    return getMissionTemplateByKey(productId, missionKey);
  }

  /**
   * 獲取任務日誌歷史
   */
  async getMissionDailyHistory(userId: string, templateId: string, since: Date) {
    return getMissionDailyHistory(userId, templateId, since);
  }

  /**
   * 訂閱任務
   */
  async assignMission(userId: string, templateId: string) {
    return assignMission(userId, templateId);
  }

  /**
   * 放棄任務
   */
  async abandonMissionAssignment(userId: string, templateId: string) {
    return abandonMissionAssignment(userId, templateId);
  }

  /**
   * 獲取用戶任務設定
   */
  async getUserMissionSetting(userId: string, templateId: string) {
    return getUserMissionSetting(userId, templateId);
  }

  /**
   * 更新用戶任務設定
   */
  async upsertUserMissionSetting(
    userId: string,
    templateId: string,
    settings: Record<string, unknown>
  ) {
    return upsertUserMissionSetting(userId, templateId, settings as any);
  }

  /**
   * 獲取產品的所有任務樣板
   */
  async getMissionTemplatesForProduct(productId: string) {
    return getMissionTemplatesForProduct(productId);
  }

  /**
   * 獲取用戶訂閱的任務
   */
  async getUserSubscribedMissions(userId: string, templateIds: string[]) {
    return db().missionAssignment.findMany({
      where: {
        user_id: userId,
        mission_template_id: { in: templateIds },
      },
      include: {
        mission_template: true,
      },
    } as any);
  }

  /**
   * 發送習慣提醒
   */
  async sendHabitReminder(input: {
    userId: string;
    template: any;
    setting: any;
    sourceRef: string;
  }) {
    return sendHabitReminderLib(input);
  }

  /**
   * 刪除任務日誌（按 templateId 和日期）
   */
  async deleteMissionDailyLog(userId: string, templateId: string, date: Date) {
    return deleteMissionDailyLogDb(userId, templateId, date);
  }

  /**
   * 更新或創建任務日誌
   */
  async upsertMissionDailyLog(userId: string, templateId: string, date: Date, data: any) {
    const result = await upsertMissionDailyLogDb(userId, templateId, date, data);
    return result.next;
  }

  /**
   * 獲取用戶的所有任務訂閱（pending 狀態）
   */
  async getUserMissionAssignments(userId: string) {
    return db().missionAssignment.findMany({
      where: { user_id: userId, status: 'pending' },
      select: { template_id: true },
    });
  }

  /**
   * 獲取用戶對特定任務的待決訂閱
   */
  async getPendingMissionAssignment(userId: string, templateId: string) {
    return db().missionAssignment.findFirst({
      where: { user_id: userId, template_id: templateId, status: 'pending' },
    });
  }

  /**
   * 重新導出 localDateInTz 方便使用
   */
  localDateInTz(date: Date, tz: string) {
    return localDateInTz(date, tz);
  }
}
