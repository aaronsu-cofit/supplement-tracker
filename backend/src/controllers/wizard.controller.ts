// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/wizard.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { WizardService } from '../services/wizard.service.js';

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
    const params = this.request.params as { oaId: string };
    const oaId = parseInt(params.oaId, 10);

    const scenarios = await this.wizardService.getScenariosForOA(oaId);
    return { scenarios };
  }

  /**
   * POST /api/wizard/oa/:oaId/scenarios - 創建新場景
   */
  async createScenario() {
    const params = this.request.params as { oaId: string };
    const oaId = parseInt(params.oaId, 10);
    const body = (await this.request.body) as CreateScenarioBody;

    const scenario = await this.wizardService.createScenario(oaId, {
      name: body.name || '',
      flow_nodes: body.flow_nodes,
      flow_edges: body.flow_edges,
    });

    this.reply.code(201);
    return { scenario };
  }

  /**
   * GET /api/wizard/scenarios/:id - 獲取單個場景
   */
  async getScenario() {
    const params = this.request.params as { id: string };
    const scenario = await this.wizardService.getScenarioById(params.id);
    return { scenario };
  }

  /**
   * PATCH /api/wizard/scenarios/:id - 更新場景
   */
  async updateScenario() {
    const params = this.request.params as { id: string };
    const body = (await this.request.body) as UpdateScenarioBody;

    const scenario = await this.wizardService.updateScenario(params.id, body);
    return { scenario };
  }

  /**
   * DELETE /api/wizard/scenarios/:id - 刪除場景
   */
  async deleteScenario() {
    const params = this.request.params as { id: string };
    const result = await this.wizardService.deleteScenario(params.id);
    return result;
  }

  /**
   * POST /api/wizard/scenarios/:id/enroll-all - 批量註冊所有 LINE 用戶
   */
  async enrollAllUsers() {
    const params = this.request.params as { id: string };
    const count = await this.wizardService.enrollAllLineUsers(params.id);
    return { enrolled: count };
  }

  /**
   * DELETE /api/wizard/enrollments/:id - 刪除單個註冊
   */
  async deleteEnrollment() {
    const params = this.request.params as { id: string };
    const id = parseInt(params.id, 10);
    const result = await this.wizardService.deleteEnrollment(id);
    return result;
  }

  /**
   * DELETE /api/wizard/scenarios/:id/enrollments - 刪除場景的所有註冊
   */
  async deleteAllEnrollments() {
    const params = this.request.params as { id: string };
    const count = await this.wizardService.deleteAllEnrollments(params.id);
    return { deleted: count };
  }
}
