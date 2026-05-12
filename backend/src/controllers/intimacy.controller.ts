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
    try {
      this.logDebug('[GET /api/intimacy/assessments] 開始獲取評估列表');
      const userId = this.getUserId();
      const assessments = await this.intimacyService.getIntimacyAssessments(userId);
      this.logDebug('[GET /api/intimacy/assessments] 成功取得評估列表', { count: assessments.length });
      return { success: true, assessments };
    } catch (error: unknown) {
      console.error('[GET /api/intimacy/assessments] 錯誤:', error);
      this.logError('[GET /api/intimacy/assessments] 錯誤', error);
      this.reply.code(500);
      return { error: (error as Error).message || 'Failed to fetch assessments' };
    }
  }

  /**
   * POST /api/intimacy/assessments - 創建新的親密關係評估
   */
  async createAssessment() {
    try {
      this.logDebug('[POST /api/intimacy/assessments] 開始創建評估');
      const userId = this.getUserId();

      let body: Record<string, unknown>;
      try {
        body = (await this.request.body) as Record<string, unknown>;
      } catch {
        this.logDebug('[POST /api/intimacy/assessments] 無效的 JSON');
        this.reply.code(400);
        return { error: 'invalid JSON' };
      }

      const assessment = await this.intimacyService.createIntimacyAssessment(userId, body);
      this.logDebug('[POST /api/intimacy/assessments] 成功創建評估', { assessmentId: assessment.id });
      return { success: true, assessment };
    } catch (error: unknown) {
      console.error('[POST /api/intimacy/assessments] 錯誤:', error);
      this.logError('[POST /api/intimacy/assessments] 錯誤', error);
      this.reply.code(500);
      return { error: (error as Error).message || 'Failed to create assessment' };
    }
  }
}
