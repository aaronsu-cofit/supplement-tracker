// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/wizard.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { WizardService } from '../services/wizard.service.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';

interface CreateScenarioBody {
  name?: string;
  flow_nodes?: unknown;
  flow_edges?: unknown;
}

interface UpdateScenarioBody {
  name?: string;
  flow_nodes?: unknown;
  flow_edges?: unknown;
  is_active?: boolean;
}

/**
 * WizardController - HTTP 層
 * 責任：
 * - 請求參數處理
 * - 調用 Service 業務邏輯
 * - 格式化響應
 * - 錯誤處理
 */
export class WizardController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private wizardService: WizardService,
  ) {
    super(request, reply);
  }

  /**
   * GET /api/wizard/oa/:oaId/scenarios - 獲取 OA 的所有場景
   */
  async getScenarios() {
    try {
      this.logDebug('[GET /api/wizard/oa/:oaId/scenarios] 開始獲取 OA 場景');
      const params = this.request.params as { oaId: string };
      const oaId = parseInt(params.oaId, 10);

      const scenarios = await this.wizardService.getScenariosForOA(oaId);
      this.logDebug(`[GET /api/wizard/oa/:oaId/scenarios] 成功取得 ${scenarios.length} 個場景`);
      return { scenarios };
    } catch (error: unknown) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      console.error('[GET /api/wizard/oa/:oaId/scenarios] 錯誤:', error);
      this.logError('[GET /api/wizard/oa/:oaId/scenarios] 錯誤', error);
      throw error;
    }
  }

  /**
   * POST /api/wizard/oa/:oaId/scenarios - 創建新場景
   */
  async createScenario() {
    try {
      this.logDebug('[POST /api/wizard/oa/:oaId/scenarios] 開始創建場景');
      const params = this.request.params as { oaId: string };
      const oaId = parseInt(params.oaId, 10);

      let body: CreateScenarioBody;
      try {
        body = (await this.request.body) as CreateScenarioBody;
      } catch {
        this.logDebug('[POST /api/wizard/oa/:oaId/scenarios] 無效的 JSON');
        this.reply.code(400);
        return { error: 'invalid JSON' };
      }

      const scenario = await this.wizardService.createScenario(oaId, {
        name: body.name || '',
        flow_nodes: body.flow_nodes,
        flow_edges: body.flow_edges,
      });

      this.logDebug(`[POST /api/wizard/oa/:oaId/scenarios] 成功創建場景 ID: ${scenario.id}`);
      this.reply.code(201);
      return { scenario };
    } catch (error: unknown) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      console.error('[POST /api/wizard/oa/:oaId/scenarios] 錯誤:', error);
      this.logError('[POST /api/wizard/oa/:oaId/scenarios] 錯誤', error);
      throw error;
    }
  }

  /**
   * GET /api/wizard/scenarios/:id - 獲取單個場景
   */
  async getScenario() {
    try {
      this.logDebug('[GET /api/wizard/scenarios/:id] 開始獲取場景');
      const params = this.request.params as { id: string };
      const scenario = await this.wizardService.getScenarioById(params.id);
      this.logDebug(`[GET /api/wizard/scenarios/:id] 成功取得場景 ID: ${params.id}`);
      return { scenario };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        this.logDebug('[GET /api/wizard/scenarios/:id] 場景不存在');
        throw error;
      }
      console.error('[GET /api/wizard/scenarios/:id] 錯誤:', error);
      this.logError('[GET /api/wizard/scenarios/:id] 錯誤', error);
      throw error;
    }
  }

  /**
   * PATCH /api/wizard/scenarios/:id - 更新場景
   */
  async updateScenario() {
    try {
      this.logDebug('[PATCH /api/wizard/scenarios/:id] 開始更新場景');
      const params = this.request.params as { id: string };

      let body: UpdateScenarioBody;
      try {
        body = (await this.request.body) as UpdateScenarioBody;
      } catch {
        this.logDebug('[PATCH /api/wizard/scenarios/:id] 無效的 JSON');
        this.reply.code(400);
        return { error: 'invalid JSON' };
      }

      const scenario = await this.wizardService.updateScenario(params.id, body);
      this.logDebug(`[PATCH /api/wizard/scenarios/:id] 成功更新場景 ID: ${params.id}`);
      return { scenario };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        this.logDebug('[PATCH /api/wizard/scenarios/:id] 場景不存在');
        throw error;
      }
      console.error('[PATCH /api/wizard/scenarios/:id] 錯誤:', error);
      this.logError('[PATCH /api/wizard/scenarios/:id] 錯誤', error);
      throw error;
    }
  }

  /**
   * DELETE /api/wizard/scenarios/:id - 刪除場景
   */
  async deleteScenario() {
    try {
      this.logDebug('[DELETE /api/wizard/scenarios/:id] 開始刪除場景');
      const params = this.request.params as { id: string };
      const result = await this.wizardService.deleteScenario(params.id);
      this.logDebug(`[DELETE /api/wizard/scenarios/:id] 成功刪除場景 ID: ${params.id}`);
      return result;
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        this.logDebug('[DELETE /api/wizard/scenarios/:id] 場景不存在');
        throw error;
      }
      console.error('[DELETE /api/wizard/scenarios/:id] 錯誤:', error);
      this.logError('[DELETE /api/wizard/scenarios/:id] 錯誤', error);
      throw error;
    }
  }

  /**
   * POST /api/wizard/scenarios/:id/enroll-all - 批量註冊所有 LINE 用戶
   */
  async enrollAllUsers() {
    try {
      this.logDebug('[POST /api/wizard/scenarios/:id/enroll-all] 開始批量註冊用戶');
      const params = this.request.params as { id: string };
      const count = await this.wizardService.enrollAllLineUsers(params.id);
      this.logDebug(`[POST /api/wizard/scenarios/:id/enroll-all] 成功註冊 ${count} 個用戶`);
      return { enrolled: count };
    } catch (error: unknown) {
      if (error instanceof NotFoundError) {
        this.logDebug('[POST /api/wizard/scenarios/:id/enroll-all] 場景不存在');
        throw error;
      }
      console.error('[POST /api/wizard/scenarios/:id/enroll-all] 錯誤:', error);
      this.logError('[POST /api/wizard/scenarios/:id/enroll-all] 錯誤', error);
      throw error;
    }
  }

  /**
   * DELETE /api/wizard/enrollments/:id - 刪除單個註冊
   */
  async deleteEnrollment() {
    try {
      this.logDebug('[DELETE /api/wizard/enrollments/:id] 開始刪除註冊');
      const params = this.request.params as { id: string };
      const id = parseInt(params.id, 10);
      const result = await this.wizardService.deleteEnrollment(id);
      this.logDebug(`[DELETE /api/wizard/enrollments/:id] 成功刪除註冊 ID: ${id}`);
      return result;
    } catch (error: unknown) {
      if (error instanceof ValidationError) {
        this.logDebug('[DELETE /api/wizard/enrollments/:id] 驗證錯誤', error);
        throw error;
      }
      console.error('[DELETE /api/wizard/enrollments/:id] 錯誤:', error);
      this.logError('[DELETE /api/wizard/enrollments/:id] 錯誤', error);
      throw error;
    }
  }

  /**
   * DELETE /api/wizard/scenarios/:id/enrollments - 刪除場景的所有註冊
   */
  async deleteAllEnrollments() {
    try {
      this.logDebug('[DELETE /api/wizard/scenarios/:id/enrollments] 開始刪除場景的所有註冊');
      const params = this.request.params as { id: string };
      const count = await this.wizardService.deleteAllEnrollments(params.id);
      this.logDebug(`[DELETE /api/wizard/scenarios/:id/enrollments] 成功刪除 ${count} 個註冊`);
      return { deleted: count };
    } catch (error: unknown) {
      console.error('[DELETE /api/wizard/scenarios/:id/enrollments] 錯誤:', error);
      this.logError('[DELETE /api/wizard/scenarios/:id/enrollments] 錯誤', error);
      this.reply.code(500);
      return { error: 'Failed to delete enrollments' };
    }
  }
}
