// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/services/wizard.service.ts
import { PrismaClient } from '@prisma/client';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import {
  getScenariosForOA,
  createScenario,
  updateScenario,
  getScenarioById,
  deleteScenario,
  enrollAllLineUsersInScenario,
  deleteEnrollment,
  deleteAllEnrollmentsForScenario,
} from '../lib/db.js';

interface CreateScenarioInput {
  name: string;
  flow_nodes?: unknown;
  flow_edges?: unknown;
}

interface UpdateScenarioInput {
  name?: string;
  flow_nodes?: unknown;
  flow_edges?: unknown;
  is_active?: boolean;
}

/**
 * WizardService - 業務邏輯層
 * 責任：
 * - Wizard/Scenario CRUD 操作
 * - Enrollment 管理
 * - 數據驗證和業務規則
 * - 與數據庫交互
 */
export class WizardService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 獲取 OA 的所有場景
   * @param oaId - OA ID
   * @returns 場景列表
   */
  async getScenariosForOA(oaId: number) {
    if (!Number.isFinite(oaId)) {
      throw new ValidationError('Invalid oaId', [
        { field: 'oaId', message: 'oaId must be a valid number' },
      ]);
    }

    return getScenariosForOA(oaId);
  }

  /**
   * 創建新場景
   * @param oaId - OA ID
   * @param input - 場景數據
   * @returns 創建的場景
   */
  async createScenario(oaId: number, input: CreateScenarioInput) {
    if (!Number.isFinite(oaId)) {
      throw new ValidationError('Invalid oaId', [
        { field: 'oaId', message: 'oaId must be a valid number' },
      ]);
    }

    if (!input.name?.trim()) {
      throw new ValidationError('Scenario name is required', [
        { field: 'name', message: 'name cannot be empty' },
      ]);
    }

    const scenario = await createScenario(oaId, input.name.trim());

    // 如果提供了 flow 數據，立即更新
    if (input.flow_nodes !== undefined || input.flow_edges !== undefined) {
      return updateScenario(scenario.id, {
        flow_nodes: input.flow_nodes,
        flow_edges: input.flow_edges,
      });
    }

    return scenario;
  }

  /**
   * 根據 ID 獲取場景
   * @param id - 場景 ID
   * @returns 場景數據
   */
  async getScenarioById(id: string) {
    const scenario = await getScenarioById(id);

    if (!scenario) {
      throw new NotFoundError('Scenario not found');
    }

    return scenario;
  }

  /**
   * 更新場景
   * @param id - 場景 ID
   * @param input - 更新數據
   * @returns 更新後的場景
   */
  async updateScenario(id: string, input: UpdateScenarioInput) {
    try {
      return await updateScenario(id, input);
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === 'P2025') {
        throw new NotFoundError('Scenario not found');
      }
      throw e;
    }
  }

  /**
   * 刪除場景
   * @param id - 場景 ID
   * @returns 刪除結果
   */
  async deleteScenario(id: string) {
    try {
      await deleteScenario(id);
      return { success: true };
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === 'P2025') {
        throw new NotFoundError('Scenario not found');
      }
      throw e;
    }
  }

  /**
   * 批量註冊所有 LINE 用戶到場景
   * @param id - 場景 ID
   * @returns 註冊數量
   */
  async enrollAllLineUsers(id: string) {
    try {
      return await enrollAllLineUsersInScenario(id);
    } catch (e: unknown) {
      if ((e as { code?: string })?.code === 'P2003') {
        throw new NotFoundError('Scenario not found');
      }
      throw e;
    }
  }

  /**
   * 刪除單個註冊
   * @param id - 註冊 ID
   * @returns 刪除結果
   */
  async deleteEnrollment(id: number) {
    if (!id || isNaN(id)) {
      throw new ValidationError('Invalid enrollment ID', [
        { field: 'id', message: 'id must be a valid number' },
      ]);
    }

    await deleteEnrollment(id);
    return { success: true };
  }

  /**
   * 刪除場景的所有註冊
   * @param scenarioId - 場景 ID
   * @returns 刪除數量
   */
  async deleteAllEnrollments(scenarioId: string) {
    return await deleteAllEnrollmentsForScenario(scenarioId);
  }
}
