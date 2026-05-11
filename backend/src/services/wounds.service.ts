// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/services/wounds.service.ts
import { PrismaClient } from '@prisma/client';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import type { CreateWoundInput, UpdateWoundInput, CreateWoundLogInput } from '../types.js';
import { callGeminiText } from '../lib/ai.js';

/**
 * WoundsService - 業務邏輯層
 * 責任：
 * - Wound 和 WoundLog CRUD 操作
 * - 數據驗證和業務規則
 * - 與數據庫交互
 * - AI SOAP Note 生成
 */
export class WoundsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 獲取用戶的傷口列表（僅活躍的）
   * @param userId - 用戶 ID
   * @returns 傷口列表，按創建時間倒序
   */
  async getWounds(userId: string) {
    return this.prisma.wound.findMany({
      where: { user_id: userId, status: 'active' },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * 獲取單個傷口詳情
   * @param userId - 用戶 ID
   * @param woundId - 傷口 ID
   * @returns 傷口記錄
   * @throws NotFoundError 如果記錄不存在或不屬於該用戶
   */
  async getWoundById(userId: string, woundId: number) {
    const wound = await this.prisma.wound.findFirst({
      where: { id: woundId, user_id: userId },
    });

    if (!wound) {
      throw new NotFoundError('Wound not found or access denied');
    }

    return wound;
  }

  /**
   * 創建新的傷口記錄
   * @param userId - 用戶 ID
   * @param data - 傷口數據
   * @returns 創建的傷口記錄
   */
  async createWound(userId: string, data: CreateWoundInput) {
    return this.prisma.wound.create({
      data: {
        user_id: userId,
        name: data.name?.trim() || '未命名傷口',
        location: data.location?.trim() || null,
        date_of_injury: data.date_of_injury ? new Date(data.date_of_injury) : new Date(),
        display_name: data.display_name?.trim() || null,
        picture_url: data.picture_url?.trim() || null,
        wound_type: data.wound_type?.trim() || null,
        body_location: data.body_location?.trim() || null,
        status: 'active',
      },
    });
  }

  /**
   * 更新傷口記錄
   * @param userId - 用戶 ID
   * @param woundId - 傷口 ID
   * @param updates - 更新數據
   * @returns 更新後的傷口記錄
   * @throws NotFoundError 如果記錄不存在或不屬於該用戶
   */
  async updateWound(userId: string, woundId: number, updates: UpdateWoundInput) {
    // 檢查記錄是否存在且屬於該用戶
    const existing = await this.prisma.wound.findFirst({
      where: {
        id: woundId,
        user_id: userId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Wound not found or access denied');
    }

    // 驗證至少有一個字段需要更新
    if (Object.keys(updates).length === 0) {
      throw new ValidationError('No fields to update', [
        { field: 'updates', message: 'At least one field must be provided' },
      ]);
    }

    // 更新記錄
    return this.prisma.wound.update({
      where: { id: woundId },
      data: {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.wound_type !== undefined && { wound_type: updates.wound_type }),
        ...(updates.body_location !== undefined && { body_location: updates.body_location }),
        ...(updates.date_of_injury !== undefined && {
          date_of_injury: new Date(updates.date_of_injury),
        }),
      },
    });
  }

  /**
   * 歸檔（軟刪除）傷口記錄
   * @param userId - 用戶 ID
   * @param woundId - 傷口 ID
   * @returns 刪除操作結果
   */
  async archiveWound(userId: string, woundId: number): Promise<{ success: boolean }> {
    // 檢查記錄是否存在且屬於該用戶
    const existing = await this.prisma.wound.findFirst({
      where: {
        id: woundId,
        user_id: userId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Wound not found or access denied');
    }

    // 歸檔記錄（軟刪除）
    await this.prisma.wound.update({
      where: { id: woundId },
      data: { status: 'archived' },
    });

    return { success: true };
  }

  /**
   * 管理員獲取所有傷口（用於管理後台）
   * @returns 最近 50 個傷口記錄
   */
  async getAllWoundsAdmin() {
    return this.prisma.wound.findMany({
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  // ============================================
  // Wound Logs 相關方法
  // ============================================

  /**
   * 獲取傷口的所有日誌記錄
   * @param userId - 用戶 ID
   * @param woundId - 傷口 ID
   * @returns 日誌列表，按時間倒序
   */
  async getWoundLogs(userId: string, woundId: number) {
    // 驗證傷口存在且屬於該用戶
    await this.getWoundById(userId, woundId);

    return this.prisma.woundLog.findMany({
      where: { user_id: userId, wound_id: woundId },
      orderBy: { logged_at: 'desc' },
    });
  }

  /**
   * 創建傷口日誌記錄
   * @param userId - 用戶 ID
   * @param woundId - 傷口 ID
   * @param data - 日誌數據
   * @returns 創建的日誌記錄
   */
  async createWoundLog(userId: string, woundId: number, data: CreateWoundLogInput) {
    // 驗證傷口存在且屬於該用戶
    await this.getWoundById(userId, woundId);

    return this.prisma.woundLog.create({
      data: {
        user_id: userId,
        wound_id: woundId,
        image_data: data.image_data || null,
        nrs_pain_score: data.nrs_pain_score || 0,
        symptoms: data.symptoms?.trim() || null,
        ai_assessment_summary: data.ai_assessment_summary?.trim() || null,
        ai_status_label: data.ai_status_label?.trim() || null,
      },
    });
  }

  /**
   * 管理員獲取傷口的所有日誌（無需驗證用戶歸屬）
   * @param woundId - 傷口 ID
   * @returns 日誌列表，按時間倒序
   */
  async getWoundLogsAdmin(woundId: number) {
    return this.prisma.woundLog.findMany({
      where: { wound_id: woundId },
      orderBy: { logged_at: 'desc' },
    });
  }

  /**
   * 生成 SOAP Note（護理紀錄）
   * @param woundId - 傷口 ID
   * @param apiKey - Gemini API Key
   * @returns SOAP Note 文本
   * @throws Error 如果沒有日誌記錄或 API 調用失敗
   */
  async generateSoapNote(woundId: number, apiKey: string): Promise<string> {
    // 獲取該傷口的所有日誌
    const logs = await this.getWoundLogsAdmin(woundId);

    if (!logs || logs.length === 0) {
      throw new ValidationError('No logs available for SOAP generation', [
        { field: 'woundId', message: 'This wound has no logs yet' },
      ]);
    }

    // 構建時間線數據
    const timelineData = logs
      .map((log) => {
        const dateStr = new Date(log.logged_at).toLocaleDateString('zh-TW');
        return `[日期: ${dateStr}]\n疼痛指數(NRS): ${log.nrs_pain_score}/10\n觀察症狀: ${log.symptoms || '無'}\n單日AI摘要: ${log.ai_assessment_summary || '無紀錄'}\n病程標籤: ${log.ai_status_label || '穩定'}\n---`;
      })
      .join('\n');

    // 構建 Prompt
    const prompt = `你是一位專業的外科傷口照護護理師。請根據以下病患過去數天的「居家傷口照護紀錄」,撰寫一份專業的【護理紀錄 SOAP Note】。

【病患居家照護紀錄 (由近到遠)】:
${timelineData}

【請嚴格使用以下 SOAP 格式輸出 (繁體中文)】：
S (Subjective - 主觀資料): 總結病患這段時間回報的痛感變化與主訴症狀。
O (Objective - 客觀資料): 總結 AI 連續觀察到的傷口客觀變化。
A (Assessment - 評估): 護理師對於傷口癒合進度的綜合評估。
P (Plan - 計畫): 建議接下來的照護處置。

請直接輸出 SOAP 內容，不要加上任何開場白或自我介紹。`;

    // 調用 AI
    const soapNote = await callGeminiText(apiKey, prompt);

    return soapNote;
  }
}
