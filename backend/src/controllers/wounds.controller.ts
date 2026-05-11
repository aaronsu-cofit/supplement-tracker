// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/wounds.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { WoundsService } from '../services/wounds.service.js';
import type { CreateWoundInput, UpdateWoundInput, CreateWoundLogInput } from '../types.js';
import { ValidationError } from '../middleware/errorHandler.js';

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
    // 獲取已驗證的用戶 ID
    const userId = this.getAuthenticatedUserId();

    // 調用 Service 獲取數據
    const wounds = await this.woundsService.getWounds(userId);

    // 記錄日誌
    this.logDebug('Fetched wounds', { userId, count: wounds.length });

    // 返回成功響應（直接返回數組，保持與原 Hono 實現兼容）
    return wounds;
  }

  /**
   * GET /api/wounds/:woundId - 獲取單個傷口詳情
   */
  async getWoundById() {
    // 獲取已驗證的用戶 ID
    const userId = this.getAuthenticatedUserId();

    // 獲取路由參數
    const params = this.request.params as { woundId: string };
    const woundId = this.parseWoundId(params.woundId);

    // 調用 Service 獲取數據
    const wound = await this.woundsService.getWoundById(userId, woundId);

    // 記錄日誌
    this.logDebug('Fetched wound details', { userId, woundId });

    // 返回傷口記錄
    return wound;
  }

  /**
   * POST /api/wounds - 創建新的傷口記錄
   */
  async createWound() {
    // 獲取已驗證的用戶 ID
    const userId = this.getAuthenticatedUserId();

    // 獲取請求體
    const body = (await this.request.body) as CreateWoundInput;

    // 調用 Service 創建記錄
    const wound = await this.woundsService.createWound(userId, body);

    // 記錄日誌
    this.logDebug('Created wound', { userId, woundId: wound.id });

    // 返回 201 Created 響應
    this.reply.code(201);
    return wound;
  }

  /**
   * PATCH /api/wounds/:woundId - 更新傷口記錄
   */
  async updateWound() {
    // 獲取已驗證的用戶 ID
    const userId = this.getAuthenticatedUserId();

    // 獲取路由參數
    const params = this.request.params as { woundId: string };
    const woundId = this.parseWoundId(params.woundId);

    // 獲取請求體
    const body = (await this.request.body) as UpdateWoundInput;

    // 調用 Service 更新記錄
    const wound = await this.woundsService.updateWound(userId, woundId, body);

    // 記錄日誌
    this.logDebug('Updated wound', { userId, woundId });

    // 返回更新後的記錄（包裹在 success 對象中，保持與原 Hono 實現兼容）
    return { success: true, wound };
  }

  /**
   * DELETE /api/wounds/:woundId - 歸檔（軟刪除）傷口記錄
   */
  async deleteWound() {
    // 獲取已驗證的用戶 ID
    const userId = this.getAuthenticatedUserId();

    // 獲取路由參數
    const params = this.request.params as { woundId: string };
    const woundId = this.parseWoundId(params.woundId);

    // 調用 Service 歸檔記錄
    const result = await this.woundsService.archiveWound(userId, woundId);

    // 記錄日誌
    this.logDebug('Archived wound', { userId, woundId });

    // 返回成功響應
    return result;
  }

  /**
   * GET /api/wounds/admin - 管理員獲取所有傷口
   */
  async getAllWoundsAdmin() {
    // 調用 Service 獲取數據
    const wounds = await this.woundsService.getAllWoundsAdmin();

    // 記錄日誌
    this.logDebug('Admin fetched all wounds', { count: wounds.length });

    // 返回傷口列表
    return wounds;
  }

  // ============================================
  // Wound Logs 相關方法
  // ============================================

  /**
   * GET /api/wounds/:woundId/logs - 獲取傷口的所有日誌記錄
   */
  async getWoundLogs() {
    // 獲取已驗證的用戶 ID
    const userId = this.getAuthenticatedUserId();

    // 獲取路由參數
    const params = this.request.params as { woundId: string };
    const woundId = this.parseWoundId(params.woundId);

    // 調用 Service 獲取數據
    const logs = await this.woundsService.getWoundLogs(userId, woundId);

    // 記錄日誌
    this.logDebug('Fetched wound logs', { userId, woundId, count: logs.length });

    // 返回日誌列表
    return logs;
  }

  /**
   * POST /api/wounds/:woundId/logs - 創建傷口日誌記錄
   */
  async createWoundLog() {
    // 獲取已驗證的用戶 ID
    const userId = this.getAuthenticatedUserId();

    // 獲取路由參數
    const params = this.request.params as { woundId: string };
    const woundId = this.parseWoundId(params.woundId);

    // 獲取請求體
    const body = (await this.request.body) as CreateWoundLogInput;

    // 調用 Service 創建記錄
    const log = await this.woundsService.createWoundLog(userId, woundId, body);

    // 記錄日誌
    this.logDebug('Created wound log', { userId, woundId, logId: log.id });

    // 返回 201 Created 響應
    this.reply.code(201);
    return log;
  }

  /**
   * POST /api/wounds/:woundId/soap - 生成 SOAP Note（護理紀錄）
   */
  async generateSoapNote() {
    // 獲取路由參數
    const params = this.request.params as { woundId: string };
    const woundId = this.parseWoundId(params.woundId);

    // 獲取 Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ValidationError('GEMINI_API_KEY not configured', [
        { field: 'apiKey', message: 'Server configuration error' },
      ]);
    }

    // 調用 Service 生成 SOAP Note
    const soapNote = await this.woundsService.generateSoapNote(woundId, apiKey);

    // 記錄日誌
    this.logDebug('Generated SOAP Note', { woundId });

    // 返回 SOAP Note
    return { success: true, soap_note: soapNote };
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
