import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { WomenHealingService } from '../services/womenHealing.service.js';

/**
 * Women Healing Controller - HTTP Request Handlers
 *
 * 處理所有女性療心室相關的 API 端點
 */
export class WomenHealingController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private womenHealingService: WomenHealingService,
  ) {
    super(request, reply);
  }

  // ─── Diary Routes ───────────────────────────────────────────

  /**
   * GET /api/women/diary/today
   * 取得今日日記
   */
  async getTodayDiary() {
    const userId = (this.request as any).userId;
    const entry = await this.womenHealingService.getTodayDiary(userId);
    return entry ?? null;
  }

  /**
   * GET /api/women/diary?page=1&limit=20
   * 取得日記列表（分頁）
   */
  async getDiaryEntries() {
    const userId = (this.request as any).userId;
    const { page, limit } = this.request.query as any;
    const pageNum = parseInt(page ?? '1', 10);
    const limitNum = parseInt(limit ?? '20', 10);
    const result = await this.womenHealingService.getDiaryEntries(
      userId,
      pageNum,
      Math.min(limitNum, 50)
    );
    return result;
  }

  /**
   * POST /api/women/diary
   * 新增或更新日記，並生成 AI 反饋
   */
  async createDiaryEntry(body: any) {
    const userId = (this.request as any).userId;

    // 驗證輸入
    const validationError = this.womenHealingService.validateDiaryInput(body);
    if (validationError) {
      return this.reply.code(400).send({ error: validationError });
    }

    try {
      // 生成 AI 反饋
      const aiFeedback = await this.womenHealingService.generateDiaryFeedback(
        body.mood,
        body.sleep,
        body.diary || ''
      );

      // 保存日記
      const entry = await this.womenHealingService.upsertDiaryEntry(userId, {
        mood: body.mood,
        sleep: body.sleep,
        diary: body.diary,
        aiFeedback,
      });

      return entry;
    } catch (error) {
      this.logError('Failed to create diary entry', error);
      throw error;
    }
  }

  // ─── Assessment Routes ──────────────────────────────────────

  /**
   * POST /api/women/assessment/scan
   * 掃描並分析臉部影像
   */
  async scanFaceAssessment(body: any) {
    try {
      const insight = await this.womenHealingService.scanFaceInsight(body.imageBase64);
      return { insight };
    } catch (error) {
      this.logError('Face assessment scan error', error);
      return { insight: '' };
    }
  }

  /**
   * POST /api/women/assessment/analyze
   * 根據問卷和臉部掃描結果生成個人化評估報告
   */
  async analyzeAssessment(body: any) {
    const userId = (this.request as any).userId;

    // 驗證輸入
    const validationError = this.womenHealingService.validateAssessmentAnalysisInput(body);
    if (validationError) {
      return this.reply.code(400).send({ error: validationError });
    }

    try {
      const { scores, scanInsight, answers } = body;

      // 判斷評估類型
      const resultType = this.womenHealingService.determineAssessmentType(scores);

      // 生成 AI 分析
      const analysis = await this.womenHealingService.generateAssessmentAnalysis(
        resultType,
        scores,
        answers,
        scanInsight || ''
      );

      // 非阻塞式保存評估結果
      this.womenHealingService.saveAssessmentResult(userId, {
        resultType,
        scores,
        aiAnalysis: analysis as object,
        faceInsight: scanInsight,
      }).catch(console.error);

      return analysis;
    } catch (error) {
      this.logError('Assessment analysis error', error);
      return this.reply.code(500).send({ error: (error as Error).message });
    }
  }

  // ─── Relief Routes ──────────────────────────────────────────

  /**
   * POST /api/women/relief
   * 記錄救濟療程會話
   */
  async createReliefSession(body: any) {
    const userId = (this.request as any).userId;

    // 驗證輸入
    const validationError = this.womenHealingService.validateReliefSessionInput(body);
    if (validationError) {
      return this.reply.code(400).send({ error: validationError });
    }

    try {
      const session = await this.womenHealingService.saveReliefSession(userId, {
        type: body.type as any,
        durationSec: body.durationSec ?? 0,
      });
      return this.reply.code(201).send(session);
    } catch (error) {
      this.logError('Failed to create relief session', error);
      throw error;
    }
  }
}
