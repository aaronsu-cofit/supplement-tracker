import { PrismaClient } from '@prisma/client';
import {
  getAllLineOAs,
  getLineOAById,
  createLineOA as createLineOADb,
  updateLineOA as updateLineOADb,
  deleteLineOA as deleteLineOADb,
  getTemplatesForOA,
  getTemplateById,
  createTemplate as createTemplateDb,
  updateTemplate as updateTemplateDb,
  deleteTemplate as deleteTemplateDb,
  setActiveTemplate,
  deactivateAllTemplates,
  getMessageLogForOa,
  getDistinctMessageLogUsersForOa,
  db,
} from '../lib/db.js';
import { fetchLineBotInfo } from '../lib/line.js';
import { adkRun } from '../lib/adk.js';
import { pushContentToUser } from '../lib/notify.js';

/**
 * Lineoa Service - LINE Official Account Management
 *
 * 處理 LINE OA 設定、模板管理、消息日誌和 AI 平台整合
 */
export class LineoaService {
  constructor(private prisma: PrismaClient) {}

  // ─── Validation Methods ───────────────────────────────────────────

  /**
   * 驗證 LINE OA 建立/更新輸入
   */
  validateLineOAInput(data: any): string | null {
    if (data.channel_access_token === undefined && data.name === undefined) {
      return null; // 部分更新允許
    }

    if (data.name !== undefined && !data.name?.trim()) {
      return '名稱不能為空';
    }

    if (data.channel_access_token !== undefined && !data.channel_access_token?.trim()) {
      return 'Channel Access Token 不能為空';
    }

    return null;
  }

  /**
   * 驗證 LINE 模板輸入
   */
  validateTemplateInput(data: any): string | null {
    if (!data.name?.trim()) {
      return '請提供模板名稱';
    }

    return null;
  }

  /**
   * 驗證消息查詢參數
   */
  validateMessageQueryParams(
    oaId: string | any,
    limit?: string,
    before?: string,
  ): { error: string | null; parsed?: { oaIdNum: number; limit: number; before?: Date } } {
    const oaIdNum = parseInt(oaId, 10);
    if (!Number.isFinite(oaIdNum)) {
      return { error: 'invalid oa id' };
    }

    const parsedLimit = Math.min(500, parseInt(limit || '100', 10));

    let parsedBefore: Date | undefined;
    if (before) {
      const d = new Date(before);
      if (isNaN(d.getTime())) {
        return { error: 'invalid before date' };
      }
      parsedBefore = d;
    }

    return {
      error: null,
      parsed: { oaIdNum, limit: parsedLimit, before: parsedBefore },
    };
  }

  /**
   * 驗證手動推送輸入
   */
  validateManualPushInput(data: any): string | null {
    if (!data.user_id) {
      return 'user_id required';
    }

    if (!data.content_key) {
      return 'content_key required';
    }

    return null;
  }

  // ─── LINE OA Management Methods ───────────────────────────────────

  /**
   * 取得所有 LINE OA
   */
  async getAllLineOAs() {
    return getAllLineOAs();
  }

  /**
   * 根據 ID 取得 LINE OA
   */
  async getLineOAById(id: string) {
    return getLineOAById(id);
  }

  /**
   * 建立新的 LINE OA 設定
   */
  async createLineOA(data: {
    name: string;
    description?: string;
    channel_access_token: string;
    channel_secret?: string;
  }) {
    const botInfo = await fetchLineBotInfo(data.channel_access_token);
    return (createLineOADb as any)({
      name: data.name,
      description: data.description,
      channel_access_token: data.channel_access_token,
      channel_secret: data.channel_secret,
      line_destination_id: botInfo?.userId ?? null,
    });
  }

  /**
   * 更新 LINE OA 設定
   */
  async updateLineOA(id: string, data: any) {
    if (data.channel_access_token) {
      const botInfo = await fetchLineBotInfo(data.channel_access_token);
      if (botInfo?.userId) {
        data.line_destination_id = botInfo.userId;
      }
    }
    return (updateLineOADb as any)(id, data);
  }

  /**
   * 刷新 LINE bot 資訊
   */
  async refreshBotInfo(id: string) {
    const oa = await this.getLineOAById(id);
    if (!oa) {
      throw new Error('找不到此 LINE OA');
    }

    const botInfo = await fetchLineBotInfo(oa.channel_access_token);
    if (!botInfo?.userId) {
      throw new Error('無法取得 bot info — 請確認 Channel Access Token 正確');
    }

    const updated = await (updateLineOADb as any)(id, {
      line_destination_id: botInfo.userId,
    });
    return { oa: updated, botUserId: botInfo.userId, displayName: botInfo.displayName };
  }

  /**
   * 刪除 LINE OA
   */
  async deleteLineOA(id: string) {
    return deleteLineOADb(id);
  }

  // ─── Template Management Methods ───────────────────────────────────

  /**
   * 取得 OA 的所有模板
   */
  async getTemplatesForOA(oaId: string) {
    return getTemplatesForOA(oaId);
  }

  /**
   * 取得模板詳細資訊
   */
  async getTemplateById(templateId: string) {
    return getTemplateById(templateId);
  }

  /**
   * 建立新模板
   */
  async createTemplate(
    oaId: string,
    data: { name: string; zones?: any[] },
  ) {
    const defaultZones = [
      { id: 'A', position: '左上', label: '', uri: '' },
      { id: 'B', position: '右上', label: '', uri: '' },
      { id: 'C', position: '左下', label: '', uri: '' },
      { id: 'D', position: '右下', label: '', uri: '' },
    ];

    return (createTemplateDb as any)(oaId, {
      name: data.name,
      zones: data.zones || defaultZones,
    });
  }

  /**
   * 更新模板
   */
  async updateTemplate(templateId: string, data: any) {
    return (updateTemplateDb as any)(templateId, data);
  }

  /**
   * 刪除模板
   */
  async deleteTemplate(templateId: string) {
    return deleteTemplateDb(templateId);
  }

  /**
   * 設定模板為活躍狀態
   */
  async deployTemplate(oaId: string, templateId: string) {
    return setActiveTemplate(oaId, templateId);
  }

  /**
   * 停用 OA 的所有模板
   */
  async deactivateAllTemplates(oaId: string) {
    return deactivateAllTemplates(oaId);
  }

  // ─── Message & Logging Methods ─────────────────────────────────────

  /**
   * 取得消息日誌並充實意圖名稱
   */
  async getMessageLogWithIntentNames(
    oaIdNum: number,
    options: { userId?: string; limit: number; before?: Date },
  ) {
    const messages = await getMessageLogForOa(oaIdNum, options);

    const intentIds = Array.from(
      new Set(
        messages
          .filter((m) => m.source === 'intent' && m.source_ref)
          .map((m) => m.source_ref as string),
      ),
    );

    let intentNames: Map<string, string> = new Map();
    if (intentIds.length > 0) {
      const rules = await (db() as any).intentRule.findMany({
        where: { id: { in: intentIds } },
        select: { id: true, name: true },
      });
      intentNames = new Map(rules.map((r: any) => [r.id, r.name]));
    }

    return messages.map((m) => ({
      ...m,
      intent_rule_name:
        m.source === 'intent' && m.source_ref ? intentNames.get(m.source_ref as string) ?? null : null,
    }));
  }

  /**
   * 取得消息日誌中的不同使用者列表
   */
  async getDistinctMessageLogUsers(oaIdNum: number, limit: number = 200) {
    return getDistinctMessageLogUsersForOa(oaIdNum, limit);
  }

  // ─── AI & Integration Methods ──────────────────────────────────────

  /**
   * 測試 AI 平台連線
   */
  async testAIPlatformConnection(
    oa: any,
    agentId?: string,
  ): Promise<{
    ok: boolean;
    agentId: string;
    skillKey?: string;
    replyPreview?: string;
    latencyMs: number;
    error?: string;
  }> {
    if (!oa.ai_skill_platform_url) {
      throw new Error('AI Skill Platform URL 未設定');
    }

    const finalAgentId = agentId || oa.default_agent_id || 'ai-expert';
    const started = Date.now();

    try {
      const result = await adkRun(
        finalAgentId,
        'admin-test',
        { message: '測試連線：請回覆任何文字確認 agent 可用' },
        {
          url: oa.ai_skill_platform_url,
          bearerToken: oa.ai_skill_platform_api_key,
        },
      );

      return {
        ok: true,
        agentId: finalAgentId,
        skillKey: result.skill_key,
        replyPreview: (result.result || '').slice(0, 200),
        latencyMs: Date.now() - started,
      };
    } catch (err: any) {
      return {
        ok: false,
        agentId: finalAgentId,
        latencyMs: Date.now() - started,
        error: err.message,
      };
    }
  }

  /**
   * 手動推送內容給使用者
   */
  async manualPushContent(
    productId: string,
    userId: string,
    contentKey: string,
  ) {
    await pushContentToUser(
      productId,
      userId,
      contentKey,
      'manual_push',
      `manual:${contentKey}:${Date.now()}`,
    );
    return { ok: true, contentKey, userId };
  }
}
