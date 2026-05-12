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
  async getHabits(productId: string) {
    const userId = (this.request as any).userId;

    // 驗證 product_id
    const validationError = this.meService.validateProductId(productId);
    if (validationError) {
      return this.reply.code(400).send({ error: validationError });
    }

    try {
      const { tz, today } = this.meService.parseDateAndTimezone(userId);
      const rows = await this.meService.getHabitsForUserProduct(userId, productId, today);

      return {
        date: today.toISOString().slice(0, 10),
        timezone: tz,
        habits: rows,
      };
    } catch (error) {
      this.logError('Failed to get habits', error);
      throw error;
    }
  }

  /**
   * POST /api/me/habits/:missionKey/log
   * 記錄習慣日誌
   */
  async logHabit(missionKey: string, body: any) {
    const userId = (this.request as any).userId;
    const productId = body?.product_id;

    // 驗證輸入
    const validationError = this.meService.validateHabitLogInput(body, productId);
    if (validationError) {
      return this.reply.code(400).send({ error: validationError });
    }

    try {
      // 解析 action
      const action = this.meService.parseHabitAction(body);

      // 解析日期
      const { date } = this.meService.parseDateAndTimezone(userId, body.date);

      // 解析筆記
      const note = this.meService.parseNoteContent(body.note);

      // 記錄習慣
      const result = await this.meService.logHabitDay({
        productId,
        userId,
        missionKey,
        date,
        action,
        note: note as string | null | undefined,
        autoAssign: body.auto_assign !== false,
      });

      if (!result.ok) {
        return this.reply.code(400).send({ error: result.reason });
      }

      return result;
    } catch (error) {
      this.logError('Failed to log habit', error);
      throw error;
    }
  }

  /**
   * GET /api/me/habits/:missionKey/history
   * 獲取習慣日誌歷史
   */
  async getHabitHistory(missionKey: string, productId: string, days: string) {
    const userId = (this.request as any).userId;

    // 驗證 product_id
    const validationError = this.meService.validateProductId(productId);
    if (validationError) {
      return this.reply.code(400).send({ error: validationError });
    }

    try {
      // 檢查任務是否存在
      const template = await this.meService.getMissionTemplateByKey(productId, missionKey);
      if (!template) {
        return this.reply.code(404).send({ error: 'mission not found' });
      }

      // 計算日期範圍
      const { tz } = this.meService.parseDateAndTimezone(userId);
      const { since, today } = this.meService.calculateHistoryDateRange(tz, days);

      // 獲取歷史記錄
      const logs = await this.meService.getMissionDailyHistory(userId, template.id, since);

      return {
        mission_key: missionKey,
        from: since.toISOString().slice(0, 10),
        to: today.toISOString().slice(0, 10),
        logs,
      };
    } catch (error) {
      this.logError('Failed to get habit history', error);
      throw error;
    }
  }

  /**
   * POST /api/me/habits/:missionKey/reminder
   * 發送習慣提醒
   */
  async sendHabitReminder(missionKey: string, body: any) {
    const userId = (this.request as any).userId;
    const productId = body?.product_id;

    // 驗證 product_id
    const validationError = this.meService.validateProductId(productId);
    if (validationError) {
      return this.reply.code(400).send({ error: validationError });
    }

    try {
      // 檢查任務是否存在
      const template = await this.meService.getMissionTemplateByKey(productId, missionKey);
      if (!template) {
        return this.reply.code(404).send({ error: 'mission not found' });
      }

      // 發送提醒
      const result = await this.meService.sendHabitReminder(userId, template.id);
      return { ok: true, reminder_sent: result };
    } catch (error) {
      this.logError('Failed to send habit reminder', error);
      return this.reply.code(500).send({ ok: false, error: (error as Error).message });
    }
  }

  /**
   * DELETE /api/me/habits/:missionKey/logs/:logId
   * 刪除任務日誌
   */
  async deleteHabitLog(logId: string) {
    const userId = (this.request as any).userId;

    try {
      await this.meService.deleteMissionDailyLog(logId, userId);
      return { ok: true, message: '日誌已刪除' };
    } catch (error: any) {
      if (error?.code === 'P2025') {
        return this.reply.code(404).send({ error: '找不到此日誌' });
      }
      this.logError('Failed to delete habit log', error);
      return this.reply.code(500).send({ error: (error as Error).message });
    }
  }

  // ─── Mission Routes ─────────────────────────────────────────

  /**
   * GET /api/me/missions?product_id=xxx
   * 獲取用戶訂閱的所有任務
   */
  async getSubscribedMissions(productId: string) {
    const userId = (this.request as any).userId;

    // 驗證 product_id
    const validationError = this.meService.validateProductId(productId);
    if (validationError) {
      return this.reply.code(400).send({ error: validationError });
    }

    try {
      // 獲取產品的所有任務樣板
      const templates = await this.meService.getMissionTemplatesForProduct(productId);
      const templateIds = templates.map((t) => t.id);

      // 獲取用戶訂閱的任務
      const missions = await this.meService.getUserSubscribedMissions(userId, templateIds);
      return { missions };
    } catch (error) {
      this.logError('Failed to get subscribed missions', error);
      return this.reply.code(500).send({ error: (error as Error).message });
    }
  }

  /**
   * POST /api/me/missions/:missionKey/subscribe
   * 訂閱任務
   */
  async subscribeMission(missionKey: string, body: any) {
    const userId = (this.request as any).userId;
    const productId = body?.product_id;

    // 驗證 product_id
    const validationError = this.meService.validateProductId(productId);
    if (validationError) {
      return this.reply.code(400).send({ error: validationError });
    }

    try {
      // 檢查任務是否存在且啟用
      const template = await this.meService.getMissionTemplateByKey(productId, missionKey);
      if (!template || !template.is_active) {
        return this.reply.code(404).send({ error: 'mission not found' });
      }

      // 訂閱任務
      const assignment = await this.meService.assignMission(userId, template.id);
      return { assignment };
    } catch (error) {
      this.logError('Failed to subscribe mission', error);
      throw error;
    }
  }

  /**
   * POST /api/me/missions/:missionKey/abandon
   * 放棄訂閱任務
   */
  async abandonMission(missionKey: string, body: any) {
    const userId = (this.request as any).userId;
    const productId = body?.product_id;

    // 驗證 product_id
    const validationError = this.meService.validateProductId(productId);
    if (validationError) {
      return this.reply.code(400).send({ error: validationError });
    }

    try {
      // 檢查任務是否存在
      const template = await this.meService.getMissionTemplateByKey(productId, missionKey);
      if (!template) {
        return this.reply.code(404).send({ error: 'mission not found' });
      }

      // 放棄任務
      const result = await this.meService.abandonMissionAssignment(userId, template.id);
      return { ok: true, abandoned: result };
    } catch (error) {
      this.logError('Failed to abandon mission', error);
      return this.reply.code(500).send({ ok: false, error: (error as Error).message });
    }
  }

  /**
   * GET /api/me/missions/:missionKey/settings
   * 獲取任務設定
   */
  async getMissionSettings(missionKey: string, productId: string) {
    const userId = (this.request as any).userId;

    // 驗證 product_id
    const validationError = this.meService.validateProductId(productId);
    if (validationError) {
      return this.reply.code(400).send({ error: validationError });
    }

    try {
      // 檢查任務是否存在
      const template = await this.meService.getMissionTemplateByKey(productId, missionKey);
      if (!template) {
        return this.reply.code(404).send({ error: 'mission not found' });
      }

      // 獲取設定
      const settings = await this.meService.getUserMissionSetting(userId, template.id);
      return { settings };
    } catch (error) {
      this.logError('Failed to get mission settings', error);
      throw error;
    }
  }

  /**
   * PATCH /api/me/missions/:missionKey/settings
   * 更新任務設定
   */
  async updateMissionSettings(missionKey: string, body: any) {
    const userId = (this.request as any).userId;
    const productId = body?.product_id;

    // 驗證 product_id
    const validationError = this.meService.validateProductId(productId);
    if (validationError) {
      return this.reply.code(400).send({ error: validationError });
    }

    // 驗證設定輸入
    const settingsError = this.meService.validateMissionSettingsInput(body);
    if (settingsError) {
      return this.reply.code(400).send({ error: settingsError });
    }

    try {
      // 檢查任務是否存在
      const template = await this.meService.getMissionTemplateByKey(productId, missionKey);
      if (!template) {
        return this.reply.code(404).send({ error: 'mission not found' });
      }

      // 更新設定
      const settings = await this.meService.upsertUserMissionSetting(userId, template.id, {
        reminder_enabled: body.reminder_enabled,
        reminder_time: body.reminder_time,
        notes: body.notes,
      });

      return { settings };
    } catch (error) {
      this.logError('Failed to update mission settings', error);
      return this.reply.code(500).send({ error: (error as Error).message });
    }
  }
}
