// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/intimacy.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { IntimacyService } from '../services/intimacy.service.js';

/**
 * IntimacyController - HTTP 層
 * 責任：
 * - 請求參數處理
 * - 調用 Service 業務邏輯
 * - 格式化響應
 * - 錯誤處理
 */
export class IntimacyController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private intimacyService: IntimacyService,
  ) {
    super(request, reply);
  }

  /**
   * GET /api/intimacy/assessments - 獲取用戶的親密關係評估
   */
  async getAssessments() {
    const userId = this.getAuthenticatedUserId();
    const assessments = await this.intimacyService.getIntimacyAssessments(userId);
    this.logDebug('Fetched intimacy assessments', { userId, count: assessments.length });
    return { success: true, assessments };
  }

  /**
   * POST /api/intimacy/assessments - 創建新的親密關係評估
   */
  async createAssessment() {
    const userId = this.getAuthenticatedUserId();
    const body = (await this.request.body) as Record<string, unknown>;
    const assessment = await this.intimacyService.createIntimacyAssessment(userId, body);
    this.logDebug('Created intimacy assessment', { userId, assessmentId: assessment.id });
    return { success: true, assessment };
  }
}
