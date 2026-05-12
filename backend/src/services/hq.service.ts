// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/services/hq.service.ts
import { PrismaClient } from '@prisma/client';
import { ValidationError, NotFoundError, ForbiddenError, BadRequestError } from '../middleware/errorHandler.js';
import { hashPassword, comparePassword } from '../lib/auth.js';
import { setUserAttributeWithHooks } from '../lib/missions.js';
import { getHQStats } from '../lib/db.js';

/**
 * HQService - HQ 管理系統業務邏輯層
 *
 * 責任：
 * - 模組管理 (Module Management)
 * - 管理員管理 (Admin Management)
 * - 用戶管理 (User Management)
 * - 用戶屬性管理 (User Attributes)
 * - 任務分配管理 (Mission Assignment)
 * - 徽章管理 (Badge Management)
 * - 統計數據 (Statistics)
 * - 業務邏輯驗證
 */
export class HQService {
  constructor(private prisma: PrismaClient) {}

  // ============================================
  // 模組管理 (Module Management)
  // ============================================

  /**
   * 獲取所有模組
   * @returns 模組列表，按排序順序排列
   */
  async getAllModules() {
    return this.prisma.module.findMany({
      orderBy: { sort_order: 'asc' },
    });
  }

  /**
   * 更新模組
   * @param id - 模組 ID
   * @param updates - 更新數據
   * @returns 更新後的模組
   * @throws NotFoundError 如果模組不存在
   */
  async updateModule(
    id: string,
    updates: {
      title?: string;
      description?: string;
      is_enabled?: boolean;
      sort_order?: number;
    },
  ) {
    try {
      return await this.prisma.module.update({
        where: { id },
        data: {
          ...(updates.title !== undefined && { title: updates.title }),
          ...(updates.description !== undefined && { description: updates.description }),
          ...(updates.is_enabled !== undefined && { is_enabled: updates.is_enabled }),
          ...(updates.sort_order !== undefined && { sort_order: updates.sort_order }),
        },
      });
    } catch (error) {
      throw new NotFoundError('Module not found');
    }
  }

  // ============================================
  // 管理員管理 (Admin Management)
  // ============================================

  /**
   * 獲取所有管理員
   * @returns 管理員列表（不含密碼哈希）
   */
  async getAllAdmins() {
    return this.prisma.admin.findMany({
      select: {
        id: true,
        email: true,
        display_name: true,
        role: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * 根據 ID 查找管理員
   * @param adminId - 管理員 ID
   * @returns 管理員資料（含密碼哈希）
   */
  async findAdminById(adminId: string) {
    return this.prisma.admin.findUnique({
      where: { id: adminId },
    });
  }

  /**
   * 根據 Email 查找管理員
   * @param email - 管理員 Email
   * @returns 管理員資料
   */
  async findAdminByEmail(email: string) {
    return this.prisma.admin.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * 創建新管理員
   * @param email - Email
   * @param password - 密碼（明文）
   * @param displayName - 顯示名稱
   * @param role - 角色 (admin/superadmin)
   * @returns 創建的管理員資料（不含密碼哈希）
   * @throws ValidationError 如果必填字段缺失或 Email 已存在
   */
  async createAdmin(
    email: string,
    password: string,
    displayName: string,
    role: string = 'admin',
  ) {
    // 驗證必填字段
    if (!email || !password || !displayName) {
      throw new BadRequestError('Email, password, and display name are required');
    }

    // 檢查 Email 是否已存在
    const existing = await this.findAdminByEmail(email);
    if (existing) {
      throw new ValidationError('This email is already registered as an admin', [
        { field: 'email', message: 'Email already exists' },
      ]);
    }

    // 哈希密碼
    const passwordHash = await hashPassword(password);

    // 創建管理員
    const admin = await this.prisma.admin.create({
      data: {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        password_hash: passwordHash,
        display_name: displayName,
        role: role || 'admin',
      },
    });

    // 返回時移除密碼哈希
    const { password_hash, ...safeAdmin } = admin;
    void password_hash;
    return safeAdmin;
  }

  /**
   * 更新管理員角色
   * @param adminId - 管理員 ID
   * @param newRole - 新角色
   * @returns 更新後的管理員資料
   * @throws NotFoundError 如果管理員不存在
   */
  async updateAdminRole(adminId: string, newRole: string) {
    try {
      const admin = await this.prisma.admin.update({
        where: { id: adminId },
        data: { role: newRole },
      });

      // 返回時移除密碼哈希
      const { password_hash, ...safeAdmin } = admin;
      void password_hash;
      return safeAdmin;
    } catch (error) {
      throw new NotFoundError('Admin not found');
    }
  }

  /**
   * 更改管理員密碼（自己）
   * @param adminId - 管理員 ID
   * @param oldPassword - 舊密碼
   * @param newPassword - 新密碼
   * @throws ValidationError 如果密碼缺失
   * @throws NotFoundError 如果管理員不存在
   * @throws ForbiddenError 如果舊密碼不正確
   */
  async updateAdminPassword(adminId: string, oldPassword: string, newPassword: string) {
    // 驗證必填字段
    if (!oldPassword || !newPassword) {
      throw new ValidationError('Current and new passwords are required', [
        { field: 'oldPassword', message: 'Current password is required' },
        { field: 'newPassword', message: 'New password is required' },
      ]);
    }

    // 查找管理員
    const admin = await this.findAdminById(adminId);
    if (!admin || !admin.password_hash) {
      throw new NotFoundError('Admin not found or password not set');
    }

    // 驗證舊密碼
    const isMatch = await comparePassword(oldPassword, admin.password_hash);
    if (!isMatch) {
      throw new ForbiddenError('Current password is incorrect');
    }

    // 哈希新密碼並更新
    const newHash = await hashPassword(newPassword);
    await this.prisma.admin.update({
      where: { id: adminId },
      data: { password_hash: newHash },
    });

    return { success: true };
  }

  // ============================================
  // 用戶管理 (User Management)
  // ============================================

  /**
   * 獲取所有用戶（患者）
   * @returns 用戶列表（不含密碼哈希）
   */
  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        display_name: true,
        auth_provider: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * 根據 ID 查找用戶
   * @param userId - 用戶 ID
   * @returns 用戶資料（不含密碼哈希）
   * @throws NotFoundError 如果用戶不存在
   */
  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 移除密碼哈希
    const { password_hash, ...safeUser } = user;
    void password_hash;
    return safeUser;
  }

  /**
   * 獲取用戶的參與事件
   * @param userId - 用戶 ID
   * @param limit - 限制數量（最大 200）
   * @returns 參與事件列表
   */
  async getUserEngagementEvents(userId: string, limit: number = 50) {
    const safeLimit = Math.min(200, Math.max(1, limit));

    return this.prisma.engagementEvent.findMany({
      where: { user_id: userId },
      orderBy: { occurred_at: 'desc' },
      take: safeLimit,
      select: {
        id: true,
        user_id: true,
        event_type: true,
        payload: true,
        occurred_at: true,
      },
    });
  }

  // ============================================
  // 用戶屬性管理 (User Attributes)
  // ============================================

  /**
   * 獲取用戶的所有屬性
   * @param userId - 用戶 ID
   * @returns 屬性列表
   */
  async getUserAttributes(userId: string) {
    return this.prisma.userAttribute.findMany({
      where: { user_id: userId },
      orderBy: { key: 'asc' },
    });
  }

  /**
   * 設置用戶屬性（帶 Hooks）
   * @param userId - 用戶 ID
   * @param key - 屬性鍵
   * @param value - 屬性值
   * @returns 設置後的屬性
   */
  async setUserAttribute(userId: string, key: string, value: string | null) {
    return setUserAttributeWithHooks(userId, key, value);
  }

  /**
   * 刪除用戶屬性
   * @param userId - 用戶 ID
   * @param key - 屬性鍵
   */
  async deleteUserAttribute(userId: string, key: string) {
    try {
      await this.prisma.userAttribute.delete({
        where: {
          user_id_key: {
            user_id: userId,
            key,
          },
        },
      });
      return { success: true };
    } catch (error) {
      // 如果記錄不存在，仍然返回成功（冪等操作）
      return { success: true };
    }
  }

  // ============================================
  // 任務管理 (Mission Management)
  // ============================================

  /**
   * 獲取用戶的任務分配
   * @param userId - 用戶 ID
   * @returns 任務分配列表
   */
  async getUserMissions(userId: string) {
    return this.prisma.missionAssignment.findMany({
      where: { user_id: userId },
      orderBy: { assigned_at: 'desc' },
      include: {
        template: true,
      },
    });
  }

  /**
   * 為用戶分配任務
   * @param userId - 用戶 ID
   * @param productId - 產品 ID
   * @param missionKey - 任務鍵
   * @returns 任務分配記錄
   * @throws ValidationError 如果參數無效
   * @throws NotFoundError 如果任務模板不存在或未啟用
   */
  async assignMission(userId: string, productId: string, missionKey: string) {
    // 驗證參數
    if (!productId || !missionKey) {
      throw new BadRequestError('product_id and mission_key required');
    }

    // 查找任務模板
    const template = await this.prisma.missionTemplate.findUnique({
      where: {
        product_id_key: {
          product_id: productId,
          key: missionKey,
        },
      },
    });

    if (!template || !template.is_active) {
      throw new NotFoundError('Mission not found or inactive');
    }

    // 檢查是否已有 pending 的分配（冪等）
    const existing = await this.prisma.missionAssignment.findFirst({
      where: {
        user_id: userId,
        template_id: template.id,
        status: 'pending',
      },
    });

    if (existing) {
      return existing;
    }

    // 創建新的任務分配
    return this.prisma.missionAssignment.create({
      data: {
        id: crypto.randomUUID(),
        user_id: userId,
        template_id: template.id,
        status: 'pending',
        progress_current: 0,
        progress_target: template.progress_target,
      },
    });
  }

  /**
   * 放棄任務分配
   * @param userId - 用戶 ID
   * @param assignmentId - 任務分配 ID
   * @returns 更新後的任務分配
   * @throws NotFoundError 如果任務分配不存在或不屬於該用戶
   */
  async abandonMission(userId: string, assignmentId: string) {
    // 查找任務分配
    const assignment = await this.prisma.missionAssignment.findFirst({
      where: {
        id: assignmentId,
        user_id: userId,
      },
    });

    if (!assignment) {
      throw new NotFoundError('Assignment not found or access denied');
    }

    // 更新狀態為 abandoned
    return this.prisma.missionAssignment.update({
      where: { id: assignmentId },
      data: { status: 'abandoned' },
    });
  }

  // ============================================
  // 徽章管理 (Badge Management)
  // ============================================

  /**
   * 獲取用戶的徽章
   * @param userId - 用戶 ID
   * @returns 徽章列表
   */
  async getUserBadges(userId: string) {
    return this.prisma.userBadge.findMany({
      where: { user_id: userId },
      orderBy: { earned_at: 'desc' },
      include: {
        template: true,
      },
    });
  }

  /**
   * 撤銷用戶徽章
   * @param userId - 用戶 ID
   * @param templateId - 徽章模板 ID
   */
  async removeUserBadge(userId: string, templateId: string) {
    try {
      await this.prisma.userBadge.delete({
        where: {
          user_id_template_id: {
            user_id: userId,
            template_id: templateId,
          },
        },
      });
      return { success: true };
    } catch (error) {
      // 如果記錄不存在，仍然返回成功（冪等操作）
      return { success: true };
    }
  }

  // ============================================
  // 其他用戶數據 (Streaks, Journeys, Messages)
  // ============================================

  /**
   * 獲取用戶的連續記錄
   * @param userId - 用戶 ID
   * @returns 連續記錄列表
   */
  async getUserStreaks(userId: string) {
    return this.prisma.userStreak.findMany({
      where: { user_id: userId },
      orderBy: { updated_at: 'desc' },
    });
  }

  /**
   * 獲取用戶的旅程階段
   * @param userId - 用戶 ID
   * @returns 旅程階段列表
   */
  async getUserJourneys(userId: string) {
    return this.prisma.userJourneyPhase.findMany({
      where: { user_id: userId },
      orderBy: { updated_at: 'desc' },
    });
  }

  /**
   * 獲取用戶的消息日誌
   * @param userId - 用戶 ID
   * @param limit - 限制數量（最大 500）
   * @returns 消息日誌列表
   */
  async getUserMessages(userId: string, limit: number = 100) {
    const safeLimit = Math.min(500, Math.max(1, limit));

    return this.prisma.messageLog.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: safeLimit,
    });
  }

  // ============================================
  // 統計數據 (Statistics)
  // ============================================

  /**
   * 獲取 HQ 統計數據
   * @returns 統計數據對象
   */
  async getHQStats() {
    return getHQStats();
  }
}
