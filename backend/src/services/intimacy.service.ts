// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/services/intimacy.service.ts
import { PrismaClient } from '@prisma/client';
import { ValidationError } from '../middleware/errorHandler.js';
import {
  getIntimacyAssessments,
  createIntimacyAssessment,
} from '../lib/db.js';

/**
 * IntimacyService - 業務邏輯層
 * 責任：
 * - Intimacy Assessment CRUD 操作
 * - 數據驗證和業務規則
 * - 與數據庫交互
 */
export class IntimacyService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 獲取用戶的親密關係評估列表
   * @param userId - 用戶 ID
   * @returns 評估列表
   */
  async getIntimacyAssessments(userId: string) {
    return getIntimacyAssessments(userId);
  }

  /**
   * 創建新的親密關係評估
   * @param userId - 用戶 ID
   * @param data - 評估數據
   * @returns 創建的評估記錄
   */
  async createIntimacyAssessment(userId: string, data: Record<string, unknown>) {
    // 驗證數據
    if (!data || typeof data !== 'object') {
      throw new ValidationError('Invalid assessment data', [
        { field: 'data', message: 'Assessment data is required' },
      ]);
    }

    return createIntimacyAssessment(userId, data);
  }
}
