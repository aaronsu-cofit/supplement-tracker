// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/hq.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { HQService } from '../services/hq.service.js';

/**
 * HQController - HQ 管理系統 HTTP 層
 *
 * 責任：
 * - 請求參數處理
 * - 調用 HQService 業務邏輯
 * - 格式化響應
 * - 錯誤處理
 */
export class HQController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private hqService: HQService,
  ) {
    super(request, reply);
  }

  // ============================================
  // 模組管理 (Module Management)
  // ============================================

  /**
   * GET /api/hq/modules - 獲取所有模組
   */
  async getModules() {
    const modules = await this.hqService.getAllModules();
    this.logDebug('Fetched HQ modules', { count: modules.length });
    return { modules };
  }

  /**
   * PATCH /api/hq/modules/:id - 更新模組
   */
  async updateModule() {
    const params = this.request.params as { id: string };
    const id = params.id;
    this.validateId(id);

    const body = (await this.request.body) as any;
    const module = await this.hqService.updateModule(id, body);

    this.logDebug('Updated module', { moduleId: id });
    return { success: true, module };
  }

  // ============================================
  // 管理員管理 (Admin Management)
  // ============================================

  /**
   * GET /api/hq/admins - 獲取所有管理員
   */
  async getAdmins() {
    const admins = await this.hqService.getAllAdmins();
    this.logDebug('Fetched admins', { count: admins.length });
    // 保持 'users' 鍵以兼容前端
    return { users: admins };
  }

  /**
   * POST /api/hq/admins - 創建新管理員
   */
  async createAdmin() {
    const body = (await this.request.body) as {
      email: string;
      password: string;
      displayName: string;
      role?: string;
    };

    const admin = await this.hqService.createAdmin(
      body.email,
      body.password,
      body.displayName,
      body.role,
    );

    this.logDebug('Created admin', { adminId: admin.id, email: admin.email });
    this.reply.code(201);
    return { success: true, user: admin };
  }

  /**
   * PATCH /api/hq/admins/:adminId - 更新管理員角色
   */
  async updateAdminRole() {
    const params = this.request.params as { adminId: string };
    const adminId = params.adminId;
    this.validateId(adminId);

    const body = (await this.request.body) as { role: string };
    if (!body.role) {
      throw new Error('role is required');
    }

    const admin = await this.hqService.updateAdminRole(adminId, body.role);

    this.logDebug('Updated admin role', { adminId, newRole: body.role });
    return { success: true, user: admin };
  }

  /**
   * PATCH /api/hq/me/password - 更改自己的密碼
   */
  async updateMyPassword() {
    const userId = this.getAuthenticatedUserId();

    const body = (await this.request.body) as {
      oldPassword: string;
      newPassword: string;
    };

    await this.hqService.updateAdminPassword(
      userId,
      body.oldPassword,
      body.newPassword,
    );

    this.logDebug('Updated admin password', { adminId: userId });
    return { success: true };
  }

  // ============================================
  // 用戶管理 (User Management)
  // ============================================

  /**
   * GET /api/hq/users - 獲取所有用戶
   */
  async getUsers() {
    const users = await this.hqService.getAllUsers();
    this.logDebug('Fetched users', { count: users.length });
    return { users };
  }

  /**
   * GET /api/hq/users/:userId - 獲取單個用戶詳情
   */
  async getUserById() {
    const params = this.request.params as { userId: string };
    const userId = params.userId;
    this.validateId(userId);

    const user = await this.hqService.getUserById(userId);

    this.logDebug('Fetched user by ID', { userId });
    return { user };
  }

  /**
   * GET /api/hq/users/:userId/engagement - 獲取用戶參與事件
   */
  async getUserEngagement() {
    const params = this.request.params as { userId: string };
    const userId = params.userId;
    this.validateId(userId);

    const query = this.request.query as { limit?: string };
    const limit = parseInt(query.limit || '50', 10);

    const events = await this.hqService.getUserEngagementEvents(userId, limit);

    this.logDebug('Fetched user engagement events', { userId, count: events.length });
    return { events };
  }

  // ============================================
  // 用戶屬性管理 (User Attributes)
  // ============================================

  /**
   * GET /api/hq/users/:userId/attributes - 獲取用戶屬性
   */
  async getUserAttributes() {
    const params = this.request.params as { userId: string };
    const userId = params.userId;
    this.validateId(userId);

    const attributes = await this.hqService.getUserAttributes(userId);

    this.logDebug('Fetched user attributes', { userId, count: attributes.length });
    return { attributes };
  }

  /**
   * PUT /api/hq/users/:userId/attributes/:key - 設置用戶屬性
   */
  async setUserAttribute() {
    const params = this.request.params as { userId: string; key: string };
    const { userId, key } = params;
    this.validateId(userId);

    const body = (this.request.body || {}) as { value?: string };
    const value = typeof body.value === 'string' ? body.value : null;

    const attribute = await this.hqService.setUserAttribute(userId, key, value);

    this.logDebug('Set user attribute', { userId, key, value });
    return { attribute };
  }

  /**
   * DELETE /api/hq/users/:userId/attributes/:key - 刪除用戶屬性
   */
  async deleteUserAttribute() {
    const params = this.request.params as { userId: string; key: string };
    const { userId, key } = params;
    this.validateId(userId);

    const result = await this.hqService.deleteUserAttribute(userId, key);

    this.logDebug('Deleted user attribute', { userId, key });
    return result;
  }

  // ============================================
  // 任務管理 (Mission Management)
  // ============================================

  /**
   * GET /api/hq/users/:userId/missions - 獲取用戶任務
   */
  async getUserMissions() {
    const params = this.request.params as { userId: string };
    const userId = params.userId;
    this.validateId(userId);

    const missions = await this.hqService.getUserMissions(userId);

    this.logDebug('Fetched user missions', { userId, count: missions.length });
    return { missions };
  }

  /**
   * POST /api/hq/users/:userId/missions - 分配任務給用戶
   */
  async assignMission() {
    const params = this.request.params as { userId: string };
    const userId = params.userId;
    this.validateId(userId);

    const body = (await this.request.body) as {
      product_id: string;
      mission_key: string;
    };

    const assignment = await this.hqService.assignMission(
      userId,
      body.product_id,
      body.mission_key,
    );

    this.logDebug('Assigned mission to user', {
      userId,
      productId: body.product_id,
      missionKey: body.mission_key,
    });
    this.reply.code(201);
    return { assignment };
  }

  /**
   * DELETE /api/hq/users/:userId/missions/:assignmentId - 放棄任務
   */
  async abandonMission() {
    const params = this.request.params as { userId: string; assignmentId: string };
    const { userId, assignmentId } = params;
    this.validateId(userId);
    this.validateId(assignmentId);

    const assignment = await this.hqService.abandonMission(userId, assignmentId);

    this.logDebug('Abandoned mission', { userId, assignmentId });
    return { assignment };
  }

  // ============================================
  // 徽章管理 (Badge Management)
  // ============================================

  /**
   * GET /api/hq/users/:userId/badges - 獲取用戶徽章
   */
  async getUserBadges() {
    const params = this.request.params as { userId: string };
    const userId = params.userId;
    this.validateId(userId);

    const badges = await this.hqService.getUserBadges(userId);

    this.logDebug('Fetched user badges', { userId, count: badges.length });
    return { badges };
  }

  /**
   * DELETE /api/hq/users/:userId/badges/:templateId - 撤銷徽章
   */
  async removeUserBadge() {
    const params = this.request.params as { userId: string; templateId: string };
    const { userId, templateId } = params;
    this.validateId(userId);
    this.validateId(templateId);

    const result = await this.hqService.removeUserBadge(userId, templateId);

    this.logDebug('Removed user badge', { userId, templateId });
    return result;
  }

  // ============================================
  // 其他用戶數據 (Streaks, Journeys, Messages)
  // ============================================

  /**
   * GET /api/hq/users/:userId/streaks - 獲取用戶連續記錄
   */
  async getUserStreaks() {
    const params = this.request.params as { userId: string };
    const userId = params.userId;
    this.validateId(userId);

    const streaks = await this.hqService.getUserStreaks(userId);

    this.logDebug('Fetched user streaks', { userId, count: streaks.length });
    return { streaks };
  }

  /**
   * GET /api/hq/users/:userId/journeys - 獲取用戶旅程階段
   */
  async getUserJourneys() {
    const params = this.request.params as { userId: string };
    const userId = params.userId;
    this.validateId(userId);

    const phases = await this.hqService.getUserJourneys(userId);

    this.logDebug('Fetched user journeys', { userId, count: phases.length });
    return { phases };
  }

  /**
   * GET /api/hq/users/:userId/messages - 獲取用戶消息日誌
   */
  async getUserMessages() {
    const params = this.request.params as { userId: string };
    const userId = params.userId;
    this.validateId(userId);

    const query = this.request.query as { limit?: string };
    const limit = parseInt(query.limit || '100', 10);

    const messages = await this.hqService.getUserMessages(userId, limit);

    this.logDebug('Fetched user messages', { userId, count: messages.length });
    return { messages };
  }

  // ============================================
  // 統計數據 (Statistics)
  // ============================================

  /**
   * GET /api/hq/stats - 獲取 HQ 統計數據
   */
  async getStats() {
    const stats = await this.hqService.getHQStats();

    this.logDebug('Fetched HQ stats', stats);
    return stats;
  }
}
