// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/supplements.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { SupplementsService } from '../services/supplements.service.js';
import type { CreateSupplementInput } from '../types.js';

/**
 * SupplementsController - HTTP 層
 * 責任：
 * - 請求參數處理
 * - 調用 Service 業務邏輯
 * - 格式化響應
 * - 錯誤處理
 */
export class SupplementsController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private supplementsService: SupplementsService,
  ) {
    super(request, reply);
  }

  /**
   * GET /api/supplements - 獲取用戶的所有補充品
   */
  async getSupplements() {
    // 獲取已驗證的用戶 ID
    const userId = this.getAuthenticatedUserId();

    // 調用 Service 獲取數據
    const supplements = await this.supplementsService.getSupplements(userId);

    // 記錄日誌
    this.logDebug('Fetched supplements', { userId, count: supplements.length });

    // 返回成功響應（直接返回數組，保持與原 Hono 實現兼容）
    return supplements;
  }

  /**
   * POST /api/supplements - 創建新的補充品
   */
  async createSupplement() {
    // 獲取已驗證的用戶 ID
    const userId = this.getAuthenticatedUserId();

    // 獲取請求體
    const body = (await this.request.body) as CreateSupplementInput;

    // 調用 Service 創建記錄
    const supplement = await this.supplementsService.createSupplement(userId, body);

    // 記錄日誌
    this.logDebug('Created supplement', { userId, supplementId: supplement.id });

    // 返回 201 Created 響應
    this.reply.code(201);
    return supplement;
  }

  /**
   * PUT /api/supplements/:id - 更新補充品
   */
  async updateSupplement() {
    // 獲取已驗證的用戶 ID
    const userId = this.getAuthenticatedUserId();

    // 獲取路由參數
    const params = this.request.params as { id: string };
    const id = params.id;

    // 驗證 ID 存在
    this.validateId(id);

    // 獲取請求體
    const body = (await this.request.body) as CreateSupplementInput;

    // 調用 Service 更新記錄
    const supplement = await this.supplementsService.updateSupplement(userId, id, body);

    // 記錄日誌
    this.logDebug('Updated supplement', { userId, supplementId: supplement.id });

    // 返回更新後的記錄
    return supplement;
  }

  /**
   * DELETE /api/supplements/:id - 刪除補充品
   */
  async deleteSupplement() {
    // 獲取已驗證的用戶 ID
    const userId = this.getAuthenticatedUserId();

    // 獲取路由參數
    const params = this.request.params as { id: string };
    const id = params.id;

    // 驗證 ID 存在
    this.validateId(id);

    // 調用 Service 刪除記錄
    const result = await this.supplementsService.deleteSupplement(userId, id);

    // 記錄日誌
    this.logDebug('Deleted supplement', { userId, supplementId: id });

    // 返回成功響應
    return result;
  }
}
