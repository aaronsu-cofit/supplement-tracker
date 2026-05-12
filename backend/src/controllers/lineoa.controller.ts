import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { LineoaService } from '../services/lineoa.service.js';
import { NotFoundError, ServiceUnavailableError, BadRequestError } from '../middleware/errorHandler.js';

/**
 * Lineoa Controller - LINE Official Account Management
 *
 * 處理 LINE OA 設定、模板管理、消息日誌和 AI 平台整合的 API 端點
 */
export class LineoaController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private lineoaService: LineoaService,
  ) {
    super(request, reply);
  }

  // ─── LINE OA Management Handlers ───────────────────────────────────

  /**
   * GET /api/line/oa
   * 取得所有 LINE OA 設定
   */
  async getAllLineOAs() {
    try {
      const oas = await this.lineoaService.getAllLineOAs();
      return { oas };
    } catch (error) {
      this.logError('Failed to get LINE OAs', error);
      throw error;
    }
  }

  /**
   * POST /api/line/oa
   * 建立新 LINE OA 設定
   */
  async createLineOA(body: any) {
    const { name, description, channel_access_token, channel_secret } = body;

    // 驗證輸入
    const validationError = this.lineoaService.validateLineOAInput({
      name,
      channel_access_token,
    });
    if (validationError) {
      return this.reply.code(400).send({ error: validationError });
    }

    try {
      const oa = await this.lineoaService.createLineOA({
        name,
        description,
        channel_access_token,
        channel_secret,
      });
      return this.reply.code(201).send({ oa });
    } catch (error) {
      this.logError('Failed to create LINE OA', error);
      throw error;
    }
  }

  /**
   * PATCH /api/line/oa/:id
   * 更新 LINE OA 設定
   */
  async updateLineOA(id: string, body: any) {
    // 驗證輸入
    const validationError = this.lineoaService.validateLineOAInput(body);
    if (validationError) {
      return this.reply.code(400).send({ error: validationError });
    }

    try {
      const oa = await this.lineoaService.updateLineOA(id, body);
      return { oa };
    } catch (error: any) {
      this.logError('Failed to update LINE OA', error);

      if (error instanceof NotFoundError) {
        this.reply.code(404);
        return { error: error.message };
      }

      throw error;
    }
  }

  /**
   * POST /api/line/oa/:id/refresh-bot-info
   * 刷新 LINE bot 資訊
   */
  async refreshBotInfo(id: string) {
    try {
      const result = await this.lineoaService.refreshBotInfo(id);
      return result;
    } catch (error: any) {
      this.logError('Failed to refresh bot info', error);

      if (error instanceof NotFoundError) {
        this.reply.code(404);
        return { error: error.message };
      }

      if (error instanceof ServiceUnavailableError) {
        this.reply.code(503);
        return { error: error.message };
      }

      this.reply.code(500);
      return { error: 'Failed to refresh bot info' };
    }
  }

  /**
   * DELETE /api/line/oa/:id
   * 刪除 LINE OA
   */
  async deleteLineOA(id: string) {
    try {
      await this.lineoaService.deleteLineOA(id);
      return { success: true };
    } catch (error: any) {
      this.logError('Failed to delete LINE OA', error);

      if (error instanceof NotFoundError) {
        this.reply.code(404);
        return { error: error.message };
      }

      throw error;
    }
  }

  // ─── Template Management Handlers ──────────────────────────────────

  /**
   * GET /api/line/oa/:id/templates
   * 取得 OA 的所有模板
   */
  async getTemplatesForOA(id: string) {
    try {
      const templates = await this.lineoaService.getTemplatesForOA(id);
      return { templates };
    } catch (error) {
      this.logError('Failed to get templates', error);
      throw error;
    }
  }

  /**
   * POST /api/line/oa/:id/templates
   * 建立新模板
   */
  async createTemplate(id: string, body: any) {
    // 驗證 OA 存在
    const oa = await this.lineoaService.getLineOAById(id);
    if (!oa) {
      return this.reply.code(404).send({ error: '找不到此 LINE OA 設定' });
    }

    // 驗證輸入
    const validationError = this.lineoaService.validateTemplateInput(body);
    if (validationError) {
      return this.reply.code(400).send({ error: validationError });
    }

    try {
      const template = await this.lineoaService.createTemplate(id, {
        name: body.name,
        zones: body.zones,
      });
      return this.reply.code(201).send({ template });
    } catch (error) {
      this.logError('Failed to create template', error);
      throw error;
    }
  }

  /**
   * PATCH /api/line/oa/:id/templates/:templateId
   * 更新模板
   */
  async updateTemplate(id: string, templateId: string, body: any) {
    // 驗證 OA 存在
    const oa = await this.lineoaService.getLineOAById(id);
    if (!oa) {
      return this.reply.code(404).send({ error: '找不到此 LINE OA 設定' });
    }

    try {
      const template = await this.lineoaService.updateTemplate(templateId, body);
      return { template };
    } catch (error: any) {
      this.logError('Failed to update template', error);

      if (error instanceof NotFoundError) {
        this.reply.code(404);
        return { error: error.message };
      }

      throw error;
    }
  }

  /**
   * DELETE /api/line/oa/:id/templates/:templateId
   * 刪除模板
   */
  async deleteTemplate(id: string, templateId: string) {
    // 驗證 OA 存在
    const oa = await this.lineoaService.getLineOAById(id);
    if (!oa) {
      return this.reply.code(404).send({ error: '找不到此 LINE OA 設定' });
    }

    try {
      await this.lineoaService.deleteTemplate(templateId);
      return { success: true };
    } catch (error: any) {
      this.logError('Failed to delete template', error);

      if (error instanceof NotFoundError) {
        this.reply.code(404);
        return { error: error.message };
      }

      throw error;
    }
  }

  /**
   * POST /api/line/oa/:id/templates/:templateId/deploy
   * 部署模板
   */
  async deployTemplate(id: string, templateId: string) {
    // 驗證 OA 存在
    const oa = await this.lineoaService.getLineOAById(id);
    if (!oa) {
      return this.reply.code(404).send({ error: '找不到此 LINE OA 設定' });
    }

    // 驗證 OA 是否已啟用
    if (!oa.is_active) {
      return this.reply.code(400).send({ error: '此 LINE OA 已停用' });
    }

    // 驗證模板存在
    const template = await this.lineoaService.getTemplateById(templateId);
    if (!template) {
      return this.reply.code(404).send({ error: '找不到此模板' });
    }

    // 驗證模板所有權
    if (template.oa_id !== parseInt(id, 10)) {
      return this.reply.code(404).send({ error: '找不到此模板' });
    }

    // Parse image upload
    const fileData = await this.request.file();
    if (!fileData) {
      return this.reply.code(400).send({ error: '請提供選單圖片' });
    }

    try {
      const imageBuffer = await fileData.toBuffer();
      const mimeType = fileData.mimetype || 'image/jpeg';
      const result = await this.lineoaService.deployTemplateWithImage(oa, template, imageBuffer, mimeType);
      
      return { success: true, template: result.template, richMenuId: result.richMenuId, message: '模板已部署' };
    } catch (error: any) {
      this.logError('Failed to deploy template', error);
      return this.reply.code(500).send({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/line/oa/:id/templates/:templateId/activate
   * 激活已部署的模板（無需重新上傳圖片）
   */
  async activateTemplate(id: string, templateId: string) {
    // 驗證 OA 存在
    const oa = await this.lineoaService.getLineOAById(id);
    if (!oa) {
      return this.reply.code(404).send({ error: '找不到此 LINE OA 設定' });
    }

    // 驗證 OA 是否已啟用
    if (!oa.is_active) {
      return this.reply.code(400).send({ error: '此 LINE OA 已停用' });
    }

    // 驗證模板存在
    const template = await this.lineoaService.getTemplateById(templateId);
    if (!template) {
      return this.reply.code(404).send({ error: '找不到此模板' });
    }

    // 驗證模板所有權
    if (template.oa_id !== parseInt(id, 10)) {
      return this.reply.code(404).send({ error: '找不到此模板' });
    }

    try {
      const result = await this.lineoaService.activateTemplate(oa, template);
      return { success: true, template: result.template, richMenuId: result.richMenuId };
    } catch (error: any) {
      this.logError('Failed to activate template', error);
      return this.reply.code(400).send({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/line/oa/:id/templates/:templateId/deactivate
   * 停用所有模板
   */
  async deactivateTemplates(id: string, templateId: string) {
    // 驗證 OA 存在
    const oa = await this.lineoaService.getLineOAById(id);
    if (!oa) {
      return this.reply.code(404).send({ error: '找不到此 LINE OA 設定' });
    }

    // 驗證模板存在
    const template = await this.lineoaService.getTemplateById(templateId);
    if (!template) {
      return this.reply.code(404).send({ error: '找不到此模板' });
    }

    try {
      await this.lineoaService.deactivateAllTemplates(id);
      return { ok: true, message: '所有模板已停用' };
    } catch (error: any) {
      this.logError('Failed to deactivate templates', error);
      return this.reply.code(500).send({ ok: false, error: error.message });
    }
  }

  // ─── Rich Menu Handlers ────────────────────────────────────────────

  /**
   * POST /api/line/oa/:id/richmenu
   * 部署通用選單
   */
  async deployRichMenu(id: string) {
    // 驗證 OA 存在
    const oa = await this.lineoaService.getLineOAById(id);
    if (!oa) {
      return this.reply.code(404).send({ error: '找不到此 LINE OA 設定' });
    }

    // 驗證 OA 是否已啟用
    if (!oa.is_active) {
      return this.reply.code(400).send({ error: '此 LINE OA 已停用' });
    }

    let imageBuffer: Buffer | null = null;
    let mimeType = 'image/jpeg';
    let zones: any[] = [];

    // 解析 multipart form data
    try {
      const parts = this.request.files();
      for await (const part of parts) {
        if (part.fieldname === 'image') {
          const buffer = await part.toBuffer();
          imageBuffer = buffer;
          mimeType = part.mimetype || 'image/jpeg';
        } else if (part.fieldname === 'zones') {
          const buffer = await part.toBuffer();
          zones = JSON.parse(buffer.toString('utf-8'));
        }
      }
    } catch (error) {
      return this.reply.code(400).send({ error: '無法解析表單資料' });
    }

    if (!imageBuffer) {
      return this.reply.code(400).send({ error: '未提供圖片檔案' });
    }

    try {
      const result = await this.lineoaService.deployRichMenu(oa, zones, imageBuffer, mimeType);
      return { success: true, richMenuId: result.richMenuId };
    } catch (error: any) {
      this.logError('Failed to deploy rich menu', error);
      return this.reply.code(400).send({ success: false, error: error.message });
    }
  }

  /**
   * DELETE /api/line/oa/:id/richmenu
   * 移除預設選單
   */
  async deleteRichMenu(id: string) {
    // 驗證 OA 存在
    const oa = await this.lineoaService.getLineOAById(id);
    if (!oa) {
      return this.reply.code(404).send({ error: '找不到此 LINE OA 設定' });
    }

    try {
      await this.lineoaService.deleteDefaultRichMenu(oa);
      return { success: true };
    } catch (error: any) {
      this.logError('Failed to delete rich menu', error);
      return this.reply.code(500).send({ success: false, error: error.message });
    }
  }

  // ─── Message & Logging Handlers ────────────────────────────────────

  /**
   * GET /api/line/oa/:id/messages
   * 取得消息日誌
   */
  async getMessages(id: string, query: any) {
    // 驗證查詢參數
    const validation = this.lineoaService.validateMessageQueryParams(
      id,
      query.limit,
      query.before,
    );
    if (validation.error) {
      return this.reply.code(400).send({ error: validation.error });
    }

    try {
      const { oaIdNum, limit, before } = validation.parsed!;
      const messages = await this.lineoaService.getMessageLogWithIntentNames(
        oaIdNum,
        { userId: query.user_id, limit, before },
      );
      return { messages };
    } catch (error) {
      this.logError('Failed to get messages', error);
      throw error;
    }
  }

  /**
   * GET /api/line/oa/:id/messages/users
   * 取得消息日誌中的不同使用者
   */
  async getMessageUsers(id: string) {
    // 驗證 OA ID
    const oaIdNum = parseInt(id, 10);
    if (!Number.isFinite(oaIdNum)) {
      return this.reply.code(400).send({ error: 'invalid oa id' });
    }

    try {
      const users = await this.lineoaService.getDistinctMessageLogUsers(oaIdNum, 200);
      return { users };
    } catch (error) {
      this.logError('Failed to get message users', error);
      throw error;
    }
  }

  // ─── AI & Integration Handlers ────────────────────────────────────

  /**
   * POST /api/line/oa/:id/test-ai-platform
   * 測試 AI 平台連線
   */
  async testAIPlatform(id: string) {
    try {
      const oa = await this.lineoaService.getLineOAById(id);
      if (!oa) {
        return this.reply.code(404).send({ error: '找不到此 LINE OA' });
      }

      const result = await this.lineoaService.testAIPlatformConnection(oa);
      if (!result.ok) {
        return this.reply.code(502).send({
          ok: false,
          agent_id: result.agentId,
          latency_ms: result.latencyMs,
          error: result.error,
        });
      }

      return {
        ok: true,
        agent_id: result.agentId,
        skill_key: result.skillKey,
        reply_preview: result.replyPreview,
        latency_ms: result.latencyMs,
      };
    } catch (error) {
      this.logError('Failed to test AI platform', error);
      throw error;
    }
  }

  /**
   * POST /api/line/oa/:id/manual-push
   * 手動推送內容給使用者
   */
  async manualPush(id: string, body: any) {
    try {
      const oa = await this.lineoaService.getLineOAById(id);
      if (!oa) {
        return this.reply.code(404).send({ error: '找不到此 LINE OA' });
      }

      if (!oa.product_id) {
        return this.reply.code(400).send({ error: 'OA 未綁定 product' });
      }

      // 驗證輸入
      const validationError = this.lineoaService.validateManualPushInput(body);
      if (validationError) {
        return this.reply.code(400).send({ error: validationError });
      }

      const result = await this.lineoaService.manualPushContent(
        oa.product_id,
        body.user_id,
        body.content_key,
      );
      return result;
    } catch (error: any) {
      this.logError('Failed to manual push', error);
      return this.reply.code(500).send({ ok: false, error: error.message });
    }
  }
}
