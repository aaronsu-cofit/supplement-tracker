// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/wounds.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { WoundsService } from '../services/wounds.service.js';
import type { CreateWoundInput, UpdateWoundInput, CreateWoundLogInput } from '../types.js';
import { ValidationError, NotFoundError, UnauthorizedError } from '../middleware/errorHandler.js';

/**
 * WoundsController - HTTP 層
 * 責任：
 * - 請求參數處理
 * - 調用 Service 業務邏輯
 * - 格式化響應
 * - 錯誤處理
 */
export class WoundsController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private woundsService: WoundsService,
  ) {
    super(request, reply);
  }

  /**
   * GET /api/wounds - 獲取用戶的所有活躍傷口
   */
  async getWounds() {
    try {
      this.logDebug('[GET /api/wounds] 開始獲取傷口列表');
      const userId = this.getAuthenticatedUserId();

      const wounds = await this.woundsService.getWounds(userId);

      this.logDebug('[GET /api/wounds] 成功取得傷口列表', { count: wounds.length });
      return wounds;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedError) throw error;
      console.error('[GET /api/wounds] 錯誤:', error);
      this.logError('[GET /api/wounds] 錯誤', error);
      this.reply.code(500);
      return { error: 'Failed to fetch wounds' };
    }
  }

  /**
   * GET /api/wounds/:woundId - 獲取單個傷口詳情
   */
  async getWoundById() {
    try {
      this.logDebug('[GET /api/wounds/:woundId] 開始獲取傷口詳情');
      const userId = this.getAuthenticatedUserId();
      const params = this.request.params as { woundId: string };

      let woundId: number;
      try {
        woundId = this.parseWoundId(params.woundId);
      } catch (error: unknown) {
        if (error instanceof ValidationError) {
          this.logDebug('[GET /api/wounds/:woundId] 無效的 wound ID', error);
          throw error;
        }
        throw error;
      }

      const wound = await this.woundsService.getWoundById(userId, woundId);

      this.logDebug('[GET /api/wounds/:woundId] 成功取得傷口詳情', { woundId });
      return wound;
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        this.logDebug('[GET /api/wounds/:woundId] 傷口不存在或無權限');
        throw error;
      }
      console.error('[GET /api/wounds/:woundId] 錯誤:', error);
      this.logError('[GET /api/wounds/:woundId] 錯誤', error);
      throw error;
    }
  }

  /**
   * POST /api/wounds - 創建新的傷口記錄
   */
  async createWound() {
    try {
      this.logDebug('[POST /api/wounds] 開始創建傷口');
      const userId = this.getAuthenticatedUserId();

      let body: CreateWoundInput;
      try {
        body = (await this.request.body) as CreateWoundInput;
      } catch {
        this.logDebug('[POST /api/wounds] 無效的 JSON');
        this.reply.code(400);
        return { error: 'invalid JSON' };
      }

      const wound = await this.woundsService.createWound(userId, body);

      this.logDebug('[POST /api/wounds] 成功創建傷口', { woundId: wound.id });
      this.reply.code(201);
      return wound;
    } catch (error: unknown) {
      console.error('[POST /api/wounds] 錯誤:', error);
      this.logError('[POST /api/wounds] 錯誤', error);
      this.reply.code(500);
      return { error: 'Failed to create wound' };
    }
  }

  /**
   * PATCH /api/wounds/:woundId - 更新傷口記錄
   */
  async updateWound() {
    try {
      this.logDebug('[PATCH /api/wounds/:woundId] 開始更新傷口');
      const userId = this.getAuthenticatedUserId();
      const params = this.request.params as { woundId: string };

      let woundId: number;
      try {
        woundId = this.parseWoundId(params.woundId);
      } catch (error: unknown) {
        if (error instanceof ValidationError) {
          this.logDebug('[PATCH /api/wounds/:woundId] 無效的 wound ID', error);
          this.reply.code(400);
          throw error;
        }
        throw error;
      }

      let body: UpdateWoundInput;
      try {
        body = (await this.request.body) as UpdateWoundInput;
      } catch {
        this.logDebug('[PATCH /api/wounds/:woundId] 無效的 JSON');
        this.reply.code(400);
        return { error: 'invalid JSON' };
      }

      const wound = await this.woundsService.updateWound(userId, woundId, body);

      this.logDebug('[PATCH /api/wounds/:woundId] 成功更新傷口', { woundId });
      return { success: true, wound };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        this.logDebug('[PATCH /api/wounds/:woundId] 傷口不存在或無權限');
        this.reply.code(404);
        throw error;
      }
      if (error instanceof ValidationError) {
        this.logDebug('[PATCH /api/wounds/:woundId] 驗證錯誤', error);
        this.reply.code(400);
        throw error;
      }
      console.error('[PATCH /api/wounds/:woundId] 錯誤:', error);
      this.logError('[PATCH /api/wounds/:woundId] 錯誤', error);
      this.reply.code(500);
      return { error: 'Failed to update wound' };
    }
  }

  /**
   * DELETE /api/wounds/:woundId - 歸檔（軟刪除）傷口記錄
   */
  async deleteWound() {
    try {
      this.logDebug('[DELETE /api/wounds/:woundId] 開始刪除傷口');
      const userId = this.getAuthenticatedUserId();
      const params = this.request.params as { woundId: string };

      let woundId: number;
      try {
        woundId = this.parseWoundId(params.woundId);
      } catch (error: unknown) {
        if (error instanceof ValidationError) {
          this.logDebug('[DELETE /api/wounds/:woundId] 無效的 wound ID', error);
          this.reply.code(400);
          throw error;
        }
        throw error;
      }

      const result = await this.woundsService.archiveWound(userId, woundId);

      this.logDebug('[DELETE /api/wounds/:woundId] 成功刪除傷口', { woundId });
      return result;
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        this.logDebug('[DELETE /api/wounds/:woundId] 傷口不存在或無權限');
        this.reply.code(404);
        throw error;
      }
      if (error instanceof ValidationError) throw error;
      console.error('[DELETE /api/wounds/:woundId] 錯誤:', error);
      this.logError('[DELETE /api/wounds/:woundId] 錯誤', error);
      this.reply.code(500);
      return { error: 'Failed to delete wound' };
    }
  }

  /**
   * GET /api/wounds/admin - 管理員獲取所有傷口
   */
  async getAllWoundsAdmin() {
    try {
      this.logDebug('[GET /api/wounds/admin] 開始獲取所有傷口（管理員）');
      const wounds = await this.woundsService.getAllWoundsAdmin();

      this.logDebug('[GET /api/wounds/admin] 成功取得所有傷口', { count: wounds.length });
      return wounds;
    } catch (error: unknown) {
      console.error('[GET /api/wounds/admin] 錯誤:', error);
      this.logError('[GET /api/wounds/admin] 錯誤', error);
      this.reply.code(500);
      return { error: 'Failed to fetch wounds' };
    }
  }

  // ============================================
  // Wound Logs 相關方法
  // ============================================

  /**
   * GET /api/wounds/:woundId/logs - 獲取傷口的所有日誌記錄
   */
  async getWoundLogs() {
    try {
      this.logDebug('[GET /api/wounds/:woundId/logs] 開始獲取傷口日誌');
      const userId = this.getAuthenticatedUserId();
      const params = this.request.params as { woundId: string };

      let woundId: number;
      try {
        woundId = this.parseWoundId(params.woundId);
      } catch (error: unknown) {
        if (error instanceof ValidationError) {
          this.logDebug('[GET /api/wounds/:woundId/logs] 無效的 wound ID', error);
          this.reply.code(400);
          throw error;
        }
        throw error;
      }

      const logs = await this.woundsService.getWoundLogs(userId, woundId);

      this.logDebug('[GET /api/wounds/:woundId/logs] 成功取得傷口日誌', { woundId, count: logs.length });
      return logs;
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        this.logDebug('[GET /api/wounds/:woundId/logs] 傷口不存在或無權限');
        this.reply.code(404);
        throw error;
      }
      if (error instanceof ValidationError) throw error;
      console.error('[GET /api/wounds/:woundId/logs] 錯誤:', error);
      this.logError('[GET /api/wounds/:woundId/logs] 錯誤', error);
      this.reply.code(500);
      return { error: 'Failed to fetch logs' };
    }
  }

  /**
   * POST /api/wounds/:woundId/logs - 創建傷口日誌記錄
   */
  async createWoundLog() {
    try {
      this.logDebug('[POST /api/wounds/:woundId/logs] 開始創建傷口日誌');
      const userId = this.getAuthenticatedUserId();
      const params = this.request.params as { woundId: string };

      let woundId: number;
      try {
        woundId = this.parseWoundId(params.woundId);
      } catch (error: unknown) {
        if (error instanceof ValidationError) {
          this.logDebug('[POST /api/wounds/:woundId/logs] 無效的 wound ID', error);
          this.reply.code(400);
          throw error;
        }
        throw error;
      }

      let body: CreateWoundLogInput;
      try {
        body = (await this.request.body) as CreateWoundLogInput;
      } catch {
        this.logDebug('[POST /api/wounds/:woundId/logs] 無效的 JSON');
        this.reply.code(400);
        return { error: 'invalid JSON' };
      }

      const log = await this.woundsService.createWoundLog(userId, woundId, body);

      this.logDebug('[POST /api/wounds/:woundId/logs] 成功創建傷口日誌', { woundId, logId: log.id });
      this.reply.code(201);
      return log;
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        this.logDebug('[POST /api/wounds/:woundId/logs] 傷口不存在或無權限');
        this.reply.code(404);
        throw error;
      }
      if (error instanceof ValidationError) throw error;
      console.error('[POST /api/wounds/:woundId/logs] 錯誤:', error);
      this.logError('[POST /api/wounds/:woundId/logs] 錯誤', error);
      this.reply.code(500);
      return { error: 'Failed to create wound log' };
    }
  }

  /**
   * POST /api/wounds/:woundId/soap - 生成 SOAP Note（護理紀錄）
   */
  async generateSoapNote() {
    try {
      this.logDebug('[POST /api/wounds/:woundId/soap] 開始生成 SOAP Note');
      const params = this.request.params as { woundId: string };

      let woundId: number;
      try {
        woundId = this.parseWoundId(params.woundId);
      } catch (error: unknown) {
        if (error instanceof ValidationError) {
          this.logDebug('[POST /api/wounds/:woundId/soap] 無效的 wound ID', error);
          this.reply.code(400);
          throw error;
        }
        throw error;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        this.logDebug('[POST /api/wounds/:woundId/soap] GEMINI_API_KEY 未設置');
        this.reply.code(500);
        return { error: 'GEMINI_API_KEY not configured' };
      }

      const soapNote = await this.woundsService.generateSoapNote(woundId, apiKey);

      this.logDebug('[POST /api/wounds/:woundId/soap] 成功生成 SOAP Note', { woundId });
      return { success: true, soap_note: soapNote };
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        this.logDebug('[POST /api/wounds/:woundId/soap] 驗證錯誤', error);
        this.reply.code(400);
        throw error;
      }
      console.error('[POST /api/wounds/:woundId/soap] 錯誤:', error);
      this.logError('[POST /api/wounds/:woundId/soap] 錯誤', error);
      this.reply.code(500);
      return { error: 'Failed to generate SOAP Note' };
    }
  }

  // ============================================
  // 輔助方法
  // ============================================

  /**
   * 解析和驗證 woundId 參數
   * @param woundIdStr - 字符串形式的 woundId
   * @returns 數字形式的 woundId
   * @throws ValidationError 如果 ID 無效
   */
  private parseWoundId(woundIdStr: string): number {
    const woundId = parseInt(woundIdStr, 10);
    if (isNaN(woundId)) {
      throw new ValidationError('Invalid wound ID', [
        { field: 'woundId', message: 'Wound ID must be a valid number' },
      ]);
    }
    return woundId;
  }
}
