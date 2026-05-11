// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/services/supplements.service.ts
import { PrismaClient } from '@prisma/client';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import type { CreateSupplementInput } from '../types.js';

/**
 * SupplementsService - 業務邏輯層
 * 責任：
 * - Supplement CRUD 操作
 * - 數據驗證和業務規則
 * - 與數據庫交互
 */
export class SupplementsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 獲取用戶的補充品列表
   * @param userId - 用戶 ID
   * @returns 補充品列表，按時間段和名稱排序
   */
  async getSupplements(userId: string) {
    return this.prisma.supplement.findMany({
      where: { user_id: userId },
      orderBy: [{ time_of_day: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * 創建新的補充品記錄
   * @param userId - 用戶 ID
   * @param data - 補充品數據
   * @returns 創建的補充品記錄
   */
  async createSupplement(userId: string, data: CreateSupplementInput) {
    // 驗證必填字段
    if (!data.name?.trim()) {
      throw new ValidationError('Supplement name is required', [
        { field: 'name', message: 'Name cannot be empty' },
      ]);
    }

    // 創建補充品記錄
    return this.prisma.supplement.create({
      data: {
        user_id: userId,
        name: data.name.trim(),
        dosage: data.dosage?.trim() || null,
        frequency: data.frequency || 'daily',
        time_of_day: data.time_of_day || 'morning',
        notes: data.notes?.trim() || null,
      },
    });
  }

  /**
   * 更新補充品記錄
   * @param userId - 用戶 ID
   * @param id - 補充品 ID
   * @param data - 更新數據
   * @returns 更新後的補充品記錄
   * @throws NotFoundError 如果記錄不存在或不屬於該用戶
   */
  async updateSupplement(userId: string, id: string, data: CreateSupplementInput) {
    // 驗證必填字段
    if (!data.name?.trim()) {
      throw new ValidationError('Supplement name is required', [
        { field: 'name', message: 'Name cannot be empty' },
      ]);
    }

    // 驗證 ID 格式
    const supplementId = parseInt(id, 10);
    if (isNaN(supplementId)) {
      throw new ValidationError('Invalid supplement ID', [
        { field: 'id', message: 'ID must be a valid number' },
      ]);
    }

    // 檢查記錄是否存在且屬於該用戶
    const existing = await this.prisma.supplement.findFirst({
      where: {
        id: supplementId,
        user_id: userId,
      },
    });

    if (!existing) {
      throw new NotFoundError('Supplement not found or access denied');
    }

    // 更新記錄
    return this.prisma.supplement.update({
      where: { id: supplementId },
      data: {
        name: data.name.trim(),
        dosage: data.dosage?.trim() || null,
        frequency: data.frequency || 'daily',
        time_of_day: data.time_of_day || 'morning',
        notes: data.notes?.trim() || null,
      },
    });
  }

  /**
   * 刪除補充品記錄
   * @param userId - 用戶 ID
   * @param id - 補充品 ID
   * @returns 刪除操作結果
   * @throws ValidationError 如果 ID 無效
   */
  async deleteSupplement(userId: string, id: string): Promise<{ success: boolean }> {
    // 驗證 ID 格式
    const supplementId = parseInt(id, 10);
    if (isNaN(supplementId)) {
      throw new ValidationError('Invalid supplement ID', [
        { field: 'id', message: 'ID must be a valid number' },
      ]);
    }

    // 刪除記錄（只刪除屬於該用戶的記錄）
    await this.prisma.supplement.deleteMany({
      where: {
        id: supplementId,
        user_id: userId,
      },
    });

    return { success: true };
  }
}
