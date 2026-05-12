import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { MeService } from '../services/me.service.js';

/**
 * Me Controller - User Personal Data & Mission Management
 *
 * 處理用戶習慣跟蹤、任務訂閱和個人設定的 API 端點
 */
export class MeController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private meService: MeService,
  ) {
    super(request, reply);
  }

  // ─── Habit Routes ───────────────────────────────────────────

  /**
   * GET /api/me/habits?product_id=xxx
   * 獲取用戶的習慣列表
   */
  async getHabits() {
    try {
      this.logDebug('[GET /api/me/habits] 開始獲取習慣列表');
      const userId = this.getUserId();
      const productId = (this.request.query as any)?.product_id;

      if (!productId) {
        this.logDebug('[GET /api/me/habits] product_id 查詢參數缺少');
        this.reply.code(400);
        return { error: 'product_id query required' };
      }

      const { tz, today } = this.meService.parseDateAndTimezone(userId);
      const rows = await this.meService.getHabitsForUserProduct(userId, productId, today);

      this.logDebug('[GET /api/me/habits] 成功取得習慣列表', { productId, count: rows.length });
      return {
        date: today.toISOString().slice(0, 10),
        timezone: tz,
        habits: rows,
      };
    } catch (error: unknown) {
      console.error('[GET /api/me/habits] 錯誤:', error);
      this.logError('[GET /api/me/habits] 錯誤', error);
      this.reply.code(500);
      return { error: 'Failed to fetch habits' };
    }
  }

  /**
   * POST /api/me/habits/:missionKey/log
   * 記錄習慣日誌
   */
  async logHabit() {
    try {
      this.logDebug('[POST /api/me/habits/:missionKey/log] 開始記錄習慣');
      const userId = this.getUserId();
      const missionKey = (this.request.params as any)?.missionKey;

      let body: any;
      try {
        body = await this.request.body;
      } catch {
        this.logDebug('[POST /api/me/habits/:missionKey/log] 無效的 JSON');
        this.reply.code(400);
        return { error: 'invalid JSON' };
      }

      if (!body?.product_id) {
        this.logDebug('[POST /api/me/habits/:missionKey/log] product_id 缺少');
        this.reply.code(400);
        return { error: 'product_id required' };
      }

      // 解析 action
      const action = this.meService.parseHabitAction(body);

      // 解析日期
      const { date } = this.meService.parseDateAndTimezone(userId, body.date);

      // 解析筆記
      const note = this.meService.parseNoteContent(body.note);

      // 記錄習慣
      const result = await this.meService.logHabitDay({
        productId: body.product_id,
        userId,
        missionKey,
        date,
        action,
        note: note as string | null | undefined,
        autoAssign: body.auto_assign !== false,
      });

      if (!result.ok) {
        this.logDebug('[POST /api/me/habits/:missionKey/log] 記錄失敗', { reason: result.reason });
        this.reply.code(400);
        return { error: result.reason };
      }

      this.logDebug('[POST /api/me/habits/:missionKey/log] 成功記錄習慣', { missionKey });
      return result;
    } catch (error: unknown) {
      console.error('[POST /api/me/habits/:missionKey/log] 錯誤:', error);
      this.logError('[POST /api/me/habits/:missionKey/log] 錯誤', error);
      this.reply.code(500);
      return { error: 'Failed to log habit' };
    }
  }

  /**
   * PATCH /api/me/habits/:missionKey/note
   * 更新習慣的筆記
   */
  async patchHabitNote() {
    try {
      this.logDebug('[PATCH /api/me/habits/:missionKey/note] 開始更新習慣筆記');
      const userId = this.getUserId();
      const missionKey = (this.request.params as any)?.missionKey;

      let body: any = {};
      try {
        body = await this.request.body;
      } catch {
        body = {};
      }

      if (!body?.product_id) {
        this.logDebug('[PATCH /api/me/habits/:missionKey/note] product_id 缺少');
        this.reply.code(400);
        return { error: 'product_id required' };
      }

      if (body.note === undefined) {
        this.logDebug('[PATCH /api/me/habits/:missionKey/note] note 欄位缺少');
        this.reply.code(400);
        return { error: 'note required (use null to clear)' };
      }

      const template = await this.meService.getMissionTemplateByKey(body.product_id, missionKey);
      if (!template) {
        this.logDebug('[PATCH /api/me/habits/:missionKey/note] 任務不存在', { missionKey });
        this.reply.code(404);
        return { error: 'mission not found' };
      }

      const { tz } = this.meService.parseDateAndTimezone(userId);
      const date = body.date
        ? new Date(body.date + 'T00:00:00Z')
        : this.meService.localDateInTz(new Date(), tz);
      if (isNaN(date.getTime())) {
        this.logDebug('[PATCH /api/me/habits/:missionKey/note] 無效的日期格式');
        this.reply.code(400);
        return { error: 'invalid date' };
      }

      const note = body.note === null ? null : String(body.note).slice(0, 500);
      const result = await this.meService.upsertMissionDailyLog(userId, template.id, date, { note });

      this.logDebug('[PATCH /api/me/habits/:missionKey/note] 成功更新筆記', { missionKey });
      return { ok: true, log: result };
    } catch (error: unknown) {
      console.error('[PATCH /api/me/habits/:missionKey/note] 錯誤:', error);
      this.logError('[PATCH /api/me/habits/:missionKey/note] 錯誤', error);
      this.reply.code(500);
      return { error: 'Failed to update note' };
    }
  }

  /**
   * DELETE /api/me/habits/:missionKey/log?product_id=xxx&date=YYYY-MM-DD
   * 刪除習慣日誌
   */
  async deleteHabitLog() {
    try {
      this.logDebug('[DELETE /api/me/habits/:missionKey/log] 開始刪除習慣日誌');
      const userId = this.getUserId();
      const missionKey = (this.request.params as any)?.missionKey;
      const productId = (this.request.query as any)?.product_id;
      const dateStr = (this.request.query as any)?.date;

      if (!productId) {
        this.logDebug('[DELETE /api/me/habits/:missionKey/log] product_id 查詢參數缺少');
        this.reply.code(400);
        return { error: 'product_id query required' };
      }

      const template = await this.meService.getMissionTemplateByKey(productId, missionKey);
      if (!template) {
        this.logDebug('[DELETE /api/me/habits/:missionKey/log] 任務不存在', { missionKey });
        this.reply.code(404);
        return { error: 'mission not found' };
      }

      const { tz } = this.meService.parseDateAndTimezone(userId);
      const date = dateStr
        ? new Date(dateStr + 'T00:00:00Z')
        : this.meService.localDateInTz(new Date(), tz);
      if (isNaN(date.getTime())) {
        this.logDebug('[DELETE /api/me/habits/:missionKey/log] 無效的日期格式');
        this.reply.code(400);
        return { error: 'invalid date' };
      }

      await this.meService.deleteMissionDailyLog(userId, template.id, date);

      this.logDebug('[DELETE /api/me/habits/:missionKey/log] 成功刪除日誌', { missionKey });
      return { success: true };
    } catch (error: unknown) {
      console.error('[DELETE /api/me/habits/:missionKey/log] 錯誤:', error);
      this.logError('[DELETE /api/me/habits/:missionKey/log] 錯誤', error);
      this.reply.code(500);
      return { error: 'Failed to delete log' };
    }
  }

  /**
   * GET /api/me/habits/:missionKey/history?product_id=xxx&days=30
   * 獲取習慣日誌歷史
   */
  async getHabitHistory() {
    try {
      this.logDebug('[GET /api/me/habits/:missionKey/history] 開始獲取習慣歷史');
      const userId = this.getUserId();
      const missionKey = (this.request.params as any)?.missionKey;
      const productId = (this.request.query as any)?.product_id;
      const days = (this.request.query as any)?.days || '30';

      if (!productId) {
        this.logDebug('[GET /api/me/habits/:missionKey/history] product_id 查詢參數缺少');
        this.reply.code(400);
        return { error: 'product_id query required' };
      }

      const template = await this.meService.getMissionTemplateByKey(productId, missionKey);
      if (!template) {
        this.logDebug('[GET /api/me/habits/:missionKey/history] 任務不存在', { missionKey });
        this.reply.code(404);
        return { error: 'mission not found' };
      }

      const { tz } = this.meService.parseDateAndTimezone(userId);
      const { since, today } = this.meService.calculateHistoryDateRange(tz, days);

      const logs = await this.meService.getMissionDailyHistory(userId, template.id, since);

      this.logDebug('[GET /api/me/habits/:missionKey/history] 成功取得習慣歷史', { missionKey, days });
      return {
        mission_key: missionKey,
        from: since.toISOString().slice(0, 10),
        to: today.toISOString().slice(0, 10),
        logs,
      };
    } catch (error: unknown) {
      console.error('[GET /api/me/habits/:missionKey/history] 錯誤:', error);
      this.logError('[GET /api/me/habits/:missionKey/history] 錯誤', error);
      this.reply.code(500);
      return { error: 'Failed to fetch history' };
    }
  }

  /**
   * POST /api/me/habits/:missionKey/test-reminder
   * 發送測試提醒
   */
  async testHabitReminder() {
    try {
      this.logDebug('[POST /api/me/habits/:missionKey/test-reminder] 開始發送測試提醒');
      const userId = this.getUserId();
      const missionKey = (this.request.params as any)?.missionKey;

      let body: any = {};
      try {
        body = await this.request.body;
      } catch {
        body = {};
      }

      if (!body?.product_id) {
        this.logDebug('[POST /api/me/habits/:missionKey/test-reminder] product_id 缺少');
        this.reply.code(400);
        return { error: 'product_id required' };
      }

      const template = await this.meService.getMissionTemplateByKey(body.product_id, missionKey);
      if (!template) {
        this.logDebug('[POST /api/me/habits/:missionKey/test-reminder] 任務不存在', { missionKey });
        this.reply.code(404);
        return { error: 'mission not found' };
      }

      const setting = await this.meService.getUserMissionSetting(userId, template.id);
      const sourceRef = `${template.key}:test:${Date.now()}`;

      const r = await this.meService.sendHabitReminder({ userId, template, setting, sourceRef });
      if (r.sent) {
        this.logDebug('[POST /api/me/habits/:missionKey/test-reminder] 成功發送提醒', { missionKey });
        return { ok: true };
      }
      this.logDebug('[POST /api/me/habits/:missionKey/test-reminder] 提醒發送失敗', { reason: r.reason });
      this.reply.code(400);
      return { ok: false, reason: r.reason ?? 'unknown' };
    } catch (error: unknown) {
      console.error('[POST /api/me/habits/:missionKey/test-reminder] 錯誤:', error);
      this.logError('[POST /api/me/habits/:missionKey/test-reminder] 錯誤', error);
      this.reply.code(500);
      return { ok: false, error: (error as Error).message };
    }
  }

  // ─── Mission Routes ─────────────────────────────────────────

  /**
   * GET /api/me/products/:productId/available-missions
   * 獲取所有可用任務（包含訂閱狀態）
   */
  async getAvailableMissions() {
    try {
      this.logDebug('[GET /api/me/products/:productId/available-missions] 開始獲取可用任務');
      const userId = this.getUserId();
      const productId = (this.request.params as any)?.productId;

      const [templates, assignments] = await Promise.all([
        this.meService.getMissionTemplatesForProduct(productId),
        this.meService.getUserMissionAssignments(userId),
      ]);

      const subscribed = new Set(assignments.map((a) => a.template_id));

      const missions = templates
        .filter((t) => t.is_active)
        .map((t) => ({ ...t, is_subscribed: subscribed.has(t.id) }));

      this.logDebug('[GET /api/me/products/:productId/available-missions] 成功取得任務列表', {
        productId,
        count: missions.length,
      });

      return { missions };
    } catch (error: unknown) {
      console.error('[GET /api/me/products/:productId/available-missions] 錯誤:', error);
      this.logError('[GET /api/me/products/:productId/available-missions] 錯誤', error);
      this.reply.code(500);
      return { error: 'Failed to fetch available missions' };
    }
  }

  /**
   * POST /api/me/missions/:missionKey/subscribe
   * 訂閱任務
   */
  async subscribeMission() {
    try {
      this.logDebug('[POST /api/me/missions/:missionKey/subscribe] 開始訂閱任務');
      const userId = this.getUserId();
      const missionKey = (this.request.params as any)?.missionKey;

      let body: any = {};
      try {
        body = await this.request.body;
      } catch {
        body = {};
      }

      if (!body?.product_id) {
        this.logDebug('[POST /api/me/missions/:missionKey/subscribe] product_id 缺少');
        this.reply.code(400);
        return { error: 'product_id required' };
      }

      const template = await this.meService.getMissionTemplateByKey(body.product_id, missionKey);
      if (!template || !template.is_active) {
        this.logDebug('[POST /api/me/missions/:missionKey/subscribe] 任務不存在或未啟用', { missionKey });
        this.reply.code(404);
        return { error: 'mission not found' };
      }

      const assignment = await this.meService.assignMission(userId, template.id);

      this.logDebug('[POST /api/me/missions/:missionKey/subscribe] 成功訂閱任務', { missionKey });
      return { assignment };
    } catch (error: unknown) {
      console.error('[POST /api/me/missions/:missionKey/subscribe] 錯誤:', error);
      this.logError('[POST /api/me/missions/:missionKey/subscribe] 錯誤', error);
      this.reply.code(500);
      return { error: 'Failed to subscribe mission' };
    }
  }

  /**
   * POST /api/me/missions/:missionKey/unsubscribe
   * 取消訂閱任務
   */
  async unsubscribeMission() {
    try {
      this.logDebug('[POST /api/me/missions/:missionKey/unsubscribe] 開始取消訂閱任務');
      const userId = this.getUserId();
      const missionKey = (this.request.params as any)?.missionKey;

      let body: any = {};
      try {
        body = await this.request.body;
      } catch {
        body = {};
      }

      if (!body?.product_id) {
        this.logDebug('[POST /api/me/missions/:missionKey/unsubscribe] product_id 缺少');
        this.reply.code(400);
        return { error: 'product_id required' };
      }

      const template = await this.meService.getMissionTemplateByKey(body.product_id, missionKey);
      if (!template) {
        this.logDebug('[POST /api/me/missions/:missionKey/unsubscribe] 任務不存在', { missionKey });
        this.reply.code(404);
        return { error: 'mission not found' };
      }

      const pending = await this.meService.getPendingMissionAssignment(userId, template.id);
      if (!pending) {
        this.logDebug('[POST /api/me/missions/:missionKey/unsubscribe] 任務未訂閱', { missionKey });
        return { success: true, already_unsubscribed: true };
      }

      const updated = await this.meService.abandonMissionAssignment(userId, pending.id);

      this.logDebug('[POST /api/me/missions/:missionKey/unsubscribe] 成功取消訂閱任務', { missionKey });
      return { assignment: updated };
    } catch (error: unknown) {
      console.error('[POST /api/me/missions/:missionKey/unsubscribe] 錯誤:', error);
      this.logError('[POST /api/me/missions/:missionKey/unsubscribe] 錯誤', error);
      this.reply.code(500);
      return { error: 'Failed to unsubscribe mission' };
    }
  }

  /**
   * GET /api/me/habits/:missionKey/setting?product_id=xxx
   * 獲取任務設定
   */
  async getMissionSetting() {
    try {
      this.logDebug('[GET /api/me/habits/:missionKey/setting] 開始獲取任務設定');
      const userId = this.getUserId();
      const missionKey = (this.request.params as any)?.missionKey;
      const productId = (this.request.query as any)?.product_id;

      if (!productId) {
        this.logDebug('[GET /api/me/habits/:missionKey/setting] product_id 查詢參數缺少');
        this.reply.code(400);
        return { error: 'product_id query required' };
      }

      const template = await this.meService.getMissionTemplateByKey(productId, missionKey);
      if (!template) {
        this.logDebug('[GET /api/me/habits/:missionKey/setting] 任務不存在', { missionKey });
        this.reply.code(404);
        return { error: 'mission not found' };
      }

      const setting = await this.meService.getUserMissionSetting(userId, template.id);

      this.logDebug('[GET /api/me/habits/:missionKey/setting] 成功取得任務設定', { missionKey });
      return {
        setting: setting ?? {
          daily_target: null,
          reminder_enabled: null,
          reminder_time: null,
        },
        template_defaults: {
          daily_target: template.daily_target,
          unit: template.unit,
          reminder: template.reminder,
        },
      };
    } catch (error: unknown) {
      console.error('[GET /api/me/habits/:missionKey/setting] 錯誤:', error);
      this.logError('[GET /api/me/habits/:missionKey/setting] 錯誤', error);
      this.reply.code(500);
      return { error: 'Failed to fetch setting' };
    }
  }

  /**
   * PATCH /api/me/habits/:missionKey/setting
   * 更新任務設定
   */
  async updateMissionSetting() {
    try {
      this.logDebug('[PATCH /api/me/habits/:missionKey/setting] 開始更新任務設定');
      const userId = this.getUserId();
      const missionKey = (this.request.params as any)?.missionKey;

      let body: any = {};
      try {
        body = await this.request.body;
      } catch {
        body = {};
      }

      if (!body?.product_id) {
        this.logDebug('[PATCH /api/me/habits/:missionKey/setting] product_id 缺少');
        this.reply.code(400);
        return { error: 'product_id required' };
      }

      const template = await this.meService.getMissionTemplateByKey(body.product_id, missionKey);
      if (!template) {
        this.logDebug('[PATCH /api/me/habits/:missionKey/setting] 任務不存在', { missionKey });
        this.reply.code(404);
        return { error: 'mission not found' };
      }

      const setting = await this.meService.upsertUserMissionSetting(userId, template.id, {
        daily_target: body.daily_target,
        reminder_enabled: body.reminder_enabled,
        reminder_time: body.reminder_time,
      });

      this.logDebug('[PATCH /api/me/habits/:missionKey/setting] 成功更新任務設定', { missionKey });
      return { setting };
    } catch (error: unknown) {
      console.error('[PATCH /api/me/habits/:missionKey/setting] 錯誤:', error);
      this.logError('[PATCH /api/me/habits/:missionKey/setting] 錯誤', error);
      this.reply.code(500);
      return { error: 'Failed to update setting' };
    }
  }
}
