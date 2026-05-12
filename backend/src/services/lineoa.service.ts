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
    return { oa: updated, bot_user_id: botInfo.userId, display_name: botInfo.displayName };
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
   * 部署模板並上傳選單圖片
   */
  async deployTemplateWithImage(
    oa: any,
    template: any,
    imageBuffer: Buffer,
    mimeType: string,
  ) {
    if (!oa.channel_access_token) {
      throw new Error('此 OA 尚未設定 Channel Access Token');
    }

    // 驗證 zones 格式
    const zones = (template.zones as any[]) || [];
    if (!Array.isArray(zones) || zones.length !== 4) {
      throw new Error('zones 格式錯誤 - 必須恰好 4 個區塊');
    }
    for (const z of zones) {
      if (!z.uri) {
        throw new Error('請先填入所有區塊的 LIFF URI 再部署');
      }
    }

    const { Client } = await import('@line/bot-sdk');
    const client = new (Client as any)({ channelAccessToken: oa.channel_access_token });

    // Parse zones to build areas
    const areas = zones.map((zone: any) => {
      let x = 0, y = 0, width = 1250, height = 843;
      // Default positions for 2x2 grid (2500x1686)
      if (zone.id === 'A' || zone.position === '左上') { x = 0; y = 0; }
      else if (zone.id === 'B' || zone.position === '右上') { x = 1250; y = 0; }
      else if (zone.id === 'C' || zone.position === '左下') { x = 0; y = 843; }
      else if (zone.id === 'D' || zone.position === '右下') { x = 1250; y = 843; }

      return {
        bounds: { x, y, width, height },
        action: {
          type: 'uri',
          uri: zone.uri,
        },
      };
    });

    const richMenuBody = {
      size: { width: 2500, height: 1686 },
      selected: true,
      name: `${oa.name} - ${template.name}`.substring(0, 300),
      chatBarText: '開啟選單',
      areas,
    };

    // Create and upload
    const richMenuId = await client.createRichMenu(richMenuBody);
    await client.setRichMenuImage(richMenuId, imageBuffer, mimeType);
    await client.setDefaultRichMenu(richMenuId);

    // Delete the template's old rich menu from LINE (if any)
    if (template.line_rich_menu_id) {
      try {
        await client.deleteRichMenu(template.line_rich_menu_id);
      } catch (e: any) {
        console.warn('舊模板選單刪除失敗（不影響部署）:', e.message);
      }
    }

    // Save to DB
    const updatedTemplate = await setActiveTemplate(oa.id.toString(), template.id.toString(), richMenuId);

    return { template: updatedTemplate, richMenuId };
  }

  /**
   * 設定模板為活躍狀態（無需重新上傳圖片）
   */
  async deployTemplate(oaId: string, templateId: string) {
    return setActiveTemplate(oaId, templateId);
  }

  /**
   * 激活已部署的模板（重新設置為預設選單）
   */
  async activateTemplate(oa: any, template: any) {
    if (!oa.channel_access_token) {
      throw new Error('此 OA 尚未設定 Channel Access Token');
    }

    if (!template.line_rich_menu_id) {
      throw new Error('此模板尚未部署，請先上傳圖片並部署');
    }

    const { Client } = await import('@line/bot-sdk');
    const client = new (Client as any)({ channelAccessToken: oa.channel_access_token });

    try {
      await client.setDefaultRichMenu(template.line_rich_menu_id);
      const updated = await setActiveTemplate(oa.id.toString(), template.id.toString());
      return { template: updated, richMenuId: template.line_rich_menu_id };
    } catch (error: any) {
      throw new Error(`切換失敗: ${error.message}`);
    }
  }

  /**
   * 停用 OA 的所有模板
   */
  async deactivateAllTemplates(oaId: string) {
    return deactivateAllTemplates(oaId);
  }

  /**
   * 部署選單到 LINE（通用選單）
   */
  async deployRichMenu(oa: any, zones: any[], imageBuffer: Buffer, mimeType: string) {
    if (!oa.channel_access_token) {
      throw new Error('此 OA 尚未設定 Channel Access Token');
    }

    // 驗證 zones 格式
    if (!Array.isArray(zones) || zones.length !== 4) {
      throw new Error('zones 必須包含 4 個區塊設定');
    }
    for (const z of zones) {
      if (!z.uri) {
        throw new Error('每個區塊都必須填入 LIFF URI');
      }
    }

    const { Client } = await import('@line/bot-sdk');
    const client = new (Client as any)({ channelAccessToken: oa.channel_access_token });

    const BOUNDS = [
      { x: 0, y: 0, width: 1250, height: 843 },
      { x: 1250, y: 0, width: 1250, height: 843 },
      { x: 0, y: 843, width: 1250, height: 843 },
      { x: 1250, y: 843, width: 1250, height: 843 },
    ];

    const richMenuBody = {
      size: { width: 2500, height: 1686 },
      selected: true,
      name: `${oa.name} Rich Menu`,
      chatBarText: '開啟選單',
      areas: zones.map((z: any, i: number) => ({
        bounds: BOUNDS[i],
        action: {
          type: 'uri',
          uri: z.uri,
        },
      })),
    };

    let oldMenuId = null;
    try {
      oldMenuId = await client.getDefaultRichMenuId();
    } catch {
      // 沒有現有選單時會拋出異常，這是預期的
    }

    const richMenuId = await client.createRichMenu(richMenuBody);
    await client.setRichMenuImage(richMenuId, imageBuffer, mimeType);
    await client.setDefaultRichMenu(richMenuId);

    if (oldMenuId) {
      try {
        await client.deleteRichMenu(oldMenuId);
      } catch (e: any) {
        console.warn('舊選單刪除失敗（不影響部署）:', e.message);
      }
    }

    return { richMenuId };
  }

  /**
   * 刪除預設選單並停用所有模板
   */
  async deleteDefaultRichMenu(oa: any) {
    if (!oa.channel_access_token) {
      throw new Error('此 OA 尚未設定 Channel Access Token');
    }

    const { Client } = await import('@line/bot-sdk');
    const client = new (Client as any)({ channelAccessToken: oa.channel_access_token });

    try {
      await client.deleteDefaultRichMenu();
    } catch (error: any) {
      console.warn('移除預設選單失敗（可能已無選單）:', error?.message);
    }

    await deactivateAllTemplates(oa.id.toString());
    return { success: true };
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
    return { ok: true, content_key: contentKey, user_id: userId };
  }
}
