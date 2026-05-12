// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/hq.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { HQService } from '../services/hq.service.js';
import { BadRequestError, ValidationError } from '../middleware/errorHandler.js';

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
    try {
      const modules = await this.hqService.getAllModules();
      this.logDebug('Fetched HQ modules', { count: modules.length });
      return { modules };
    } catch (error) {
      console.error('[GET /api/hq/modules] Error:', error);
      this.logError('[HQ /getModules]', error);
      return this.reply.code(500).send({ error: 'Failed to fetch modules' });
    }
  }

  /**
   * PATCH /api/hq/modules/:id - 更新模組
   */
  async updateModule() {
    const params = this.request.params as { id: string };
    const id = params.id;
    this.validateId(id);

    let body: any;
    try {
      body = (await this.request.body) as any;
    } catch {
      this.logDebug('[PATCH /api/hq/modules/:id] 無效的 JSON');
      this.reply.code(400);
      return { error: 'Invalid JSON' };
    }

    try {
      const module = await this.hqService.updateModule(id, body);

      this.logDebug('Updated module', { moduleId: id });
      return { success: true, module };
    } catch (error) {
      console.error('[PATCH /api/hq/modules/:id] Error:', error);
      this.logError('[HQ /updateModule]', error);

      const message = (error as Error).message;
      if (message === 'Module not found') {
        this.reply.code(404);
        return { error: message };
      }

      return this.reply.code(500).send({ error: 'Failed to update module' });
    }
  }

  // ============================================
  // 管理員管理 (Admin Management)
  // ============================================

  /**
   * GET /api/hq/admins - 獲取所有管理員
   */
  async getAdmins() {
    try {
      const admins = await this.hqService.getAllAdmins();
      this.logDebug('Fetched admins', { count: admins.length });
      // 保持 'users' 鍵以兼容前端
      return { users: admins };
    } catch (error) {
      console.error('[GET /api/hq/admins] Error:', error);
      this.logError('[HQ /getAdmins]', error);
      return this.reply.code(500).send({ error: 'Failed to fetch admins' });
    }
  }

  /**
   * POST /api/hq/admins - 創建新管理員
   */
  async createAdmin() {
    let body: {
      email: string;
      password: string;
      displayName: string;
      role?: string;
    };

    try {
      body = (await this.request.body) as typeof body;
    } catch {
      this.logDebug('[POST /api/hq/admins] 無效的 JSON');
      this.reply.code(400);
      return { error: 'Invalid JSON' };
    }

    try {
      const admin = await this.hqService.createAdmin(
        body.email,
        body.password,
        body.displayName,
        body.role,
      );

      this.logDebug('Created admin', { adminId: admin.id, email: admin.email });
      this.reply.code(201);
      return { success: true, user: admin };
    } catch (error) {
      console.error('[POST /api/hq/admins] Error:', error);
      this.logError('[HQ /createAdmin]', error);

      if (error instanceof BadRequestError) {
        this.reply.code(400);
        return { error: error.message };
      }

      if (error instanceof ValidationError) {
        this.reply.code(422);
        return { error: error.message, validation: error.validation };
      }

      return this.reply.code(500).send({ error: 'Failed to create admin' });
    }
  }

  /**
   * PATCH /api/hq/admins/:adminId - 更新管理員角色
   */
  async updateAdminRole() {
    const params = this.request.params as { adminId: string };
    const adminId = params.adminId;
    this.validateId(adminId);

    let body: { role: string };
    try {
      body = (await this.request.body) as { role: string };
    } catch {
      this.logDebug('[PATCH /api/hq/admins/:adminId] 無效的 JSON');
      this.reply.code(400);
      return { error: 'Invalid JSON' };
    }

    if (!body.role) {
      this.logDebug('[PATCH /api/hq/admins/:adminId] role is required');
      this.reply.code(400);
      return { error: 'role is required' };
    }

    try {
      const admin = await this.hqService.updateAdminRole(adminId, body.role);

      this.logDebug('Updated admin role', { adminId, newRole: body.role });
      return { success: true, user: admin };
    } catch (error) {
      console.error('[PATCH /api/hq/admins/:adminId] Error:', error);
      this.logError('[HQ /updateAdminRole]', error);

      const message = (error as Error).message;
      if (message === 'Admin not found') {
        this.reply.code(404);
        return { error: message };
      }

      return this.reply.code(500).send({ error: 'Failed to update admin role' });
    }
  }

  /**
   * PATCH /api/hq/me/password - 更改自己的密碼
   */
  async updateMyPassword() {
    const userId = this.getAuthenticatedUserId();

    let body: {
      oldPassword: string;
      newPassword: string;
    };

    try {
      body = (await this.request.body) as typeof body;
    } catch {
      this.logDebug('[PATCH /api/hq/me/password] 無效的 JSON');
      this.reply.code(400);
      return { error: 'Invalid JSON' };
    }

    try {
      await this.hqService.updateAdminPassword(
        userId,
        body.oldPassword,
        body.newPassword,
      );

      this.logDebug('Updated admin password', { adminId: userId });
      return { success: true };
    } catch (error) {
      console.error('[PATCH /api/hq/me/password] Error:', error);
      this.logError('[HQ /updateMyPassword]', error);

      if (error instanceof ValidationError) {
        this.reply.code(400);
        return { error: error.message };
      }

      const message = (error as Error).message;
      if (message === 'Admin not found or password not set') {
        this.reply.code(404);
        return { error: message };
      }

      if (message === 'Current password is incorrect') {
        this.reply.code(403);
        return { error: message };
      }

      return this.reply.code(500).send({ error: 'Failed to update password' });
    }
  }

  // ============================================
  // 用戶管理 (User Management)
  // ============================================

  /**
   * GET /api/hq/users - 獲取所有用戶
   */
  async getUsers() {
    try {
      const users = await this.hqService.getAllUsers();
      this.logDebug('Fetched users', { count: users.length });
      return { users };
    } catch (error) {
      console.error('[GET /api/hq/users] Error:', error);
      this.logError('[HQ /getUsers]', error);
      return this.reply.code(500).send({ error: 'Failed to fetch users' });
    }
  }

  /**
   * GET /api/hq/users/:userId - 獲取單個用戶詳情
   */
  async getUserById() {
    try {
      const params = this.request.params as { userId: string };
      const userId = params.userId;
      this.validateId(userId);

      const user = await this.hqService.getUserById(userId);

      this.logDebug('Fetched user by ID', { userId });
      return { user };
    } catch (error) {
      console.error('[GET /api/hq/users/:userId] Error:', error);
      this.logError('[HQ /getUserById]', error);

      const message = (error as Error).message;
      if (message === 'User not found') {
        this.reply.code(404);
        return { error: message };
      }

      return this.reply.code(500).send({ error: 'Failed to fetch user' });
    }
  }

  /**
   * GET /api/hq/users/:userId/engagement - 獲取用戶參與事件
   */
  async getUserEngagement() {
    try {
      const params = this.request.params as { userId: string };
      const userId = params.userId;
      this.validateId(userId);

      const query = this.request.query as { limit?: string };
      const limit = parseInt(query.limit || '50', 10);

      const events = await this.hqService.getUserEngagementEvents(userId, limit);

      this.logDebug('Fetched user engagement events', { userId, count: events.length });
      return { events };
    } catch (error) {
      console.error('[GET /api/hq/users/:userId/engagement] Error:', error);
      this.logError('[HQ /getUserEngagement]', error);
      return this.reply.code(500).send({ error: 'Failed to fetch events' });
    }
  }

  // ============================================
  // 用戶屬性管理 (User Attributes)
  // ============================================

  /**
   * GET /api/hq/users/:userId/attributes - 獲取用戶屬性
   */
  async getUserAttributes() {
    try {
      const params = this.request.params as { userId: string };
      const userId = params.userId;
      this.validateId(userId);

      const attributes = await this.hqService.getUserAttributes(userId);

      this.logDebug('Fetched user attributes', { userId, count: attributes.length });
      return { attributes };
    } catch (error) {
      console.error('[GET /api/hq/users/:userId/attributes] Error:', error);
      this.logError('[HQ /getUserAttributes]', error);
      return this.reply.code(500).send({ error: 'Failed to fetch attributes' });
    }
  }

  /**
   * PUT /api/hq/users/:userId/attributes/:key - 設置用戶屬性
   */
  async setUserAttribute() {
    const params = this.request.params as { userId: string; key: string };
    const { userId, key } = params;
    this.validateId(userId);

    let body: { value?: string };
    try {
      body = (await this.request.body) as { value?: string };
    } catch {
      body = {};
    }

    try {
      const value = typeof body.value === 'string' ? body.value : null;

      const attribute = await this.hqService.setUserAttribute(userId, key, value);

      this.logDebug('Set user attribute', { userId, key, value });
      return { attribute };
    } catch (error) {
      console.error('[PUT /api/hq/users/:userId/attributes/:key] Error:', error);
      this.logError('[HQ /setUserAttribute]', error);
      return this.reply.code(500).send({ error: 'Failed to set attribute' });
    }
  }

  /**
   * DELETE /api/hq/users/:userId/attributes/:key - 刪除用戶屬性
   */
  async deleteUserAttribute() {
    try {
      const params = this.request.params as { userId: string; key: string };
      const { userId, key } = params;
      this.validateId(userId);

      const result = await this.hqService.deleteUserAttribute(userId, key);

      this.logDebug('Deleted user attribute', { userId, key });
      return result;
    } catch (error) {
      console.error('[DELETE /api/hq/users/:userId/attributes/:key] Error:', error);
      this.logError('[HQ /deleteUserAttribute]', error);
      return this.reply.code(500).send({ error: 'Failed to delete attribute' });
    }
  }

  // ============================================
  // 任務管理 (Mission Management)
  // ============================================

  /**
   * GET /api/hq/users/:userId/missions - 獲取用戶任務
   */
  async getUserMissions() {
    try {
      const params = this.request.params as { userId: string };
      const userId = params.userId;
      this.validateId(userId);

      const missions = await this.hqService.getUserMissions(userId);

      this.logDebug('Fetched user missions', { userId, count: missions.length });
      return { missions };
    } catch (error) {
      console.error('[GET /api/hq/users/:userId/missions] Error:', error);
      this.logError('[HQ /getUserMissions]', error);
      return this.reply.code(500).send({ error: 'Failed to fetch missions' });
    }
  }

  /**
   * POST /api/hq/users/:userId/missions - 分配任務給用戶
   */
  async assignMission() {
    const params = this.request.params as { userId: string };
    const userId = params.userId;
    this.validateId(userId);

    let body: {
      product_id: string;
      mission_key: string;
    };

    try {
      body = (await this.request.body) as typeof body;
    } catch {
      this.logDebug('[POST /api/hq/users/:userId/missions] 無效的 JSON');
      this.reply.code(400);
      return { error: 'Invalid JSON' };
    }

    try {
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
    } catch (error) {
      console.error('[POST /api/hq/users/:userId/missions] Error:', error);
      this.logError('[HQ /assignMission]', error);

      if (error instanceof BadRequestError) {
        this.reply.code(400);
        return { error: error.message };
      }

      const message = (error as Error).message;
      if (message === 'Mission not found or inactive') {
        this.reply.code(404);
        return { error: message };
      }

      return this.reply.code(500).send({ error: 'Failed to assign mission' });
    }
  }

  /**
   * DELETE /api/hq/users/:userId/missions/:assignmentId - 放棄任務
   */
  async abandonMission() {
    try {
      const params = this.request.params as { userId: string; assignmentId: string };
      const { userId, assignmentId } = params;
      this.validateId(userId);
      this.validateId(assignmentId);

      const assignment = await this.hqService.abandonMission(userId, assignmentId);

      this.logDebug('Abandoned mission', { userId, assignmentId });
      return { assignment };
    } catch (error) {
      console.error('[DELETE /api/hq/users/:userId/missions/:assignmentId] Error:', error);
      this.logError('[HQ /abandonMission]', error);

      const message = (error as Error).message;
      if (message === 'Assignment not found or access denied') {
        this.reply.code(404);
        return { error: message };
      }

      return this.reply.code(500).send({ error: 'Failed to abandon mission' });
    }
  }

  // ============================================
  // 徽章管理 (Badge Management)
  // ============================================

  /**
   * GET /api/hq/users/:userId/badges - 獲取用戶徽章
   */
  async getUserBadges() {
    try {
      const params = this.request.params as { userId: string };
      const userId = params.userId;
      this.validateId(userId);

      const badges = await this.hqService.getUserBadges(userId);

      this.logDebug('Fetched user badges', { userId, count: badges.length });
      return { badges };
    } catch (error) {
      console.error('[GET /api/hq/users/:userId/badges] Error:', error);
      this.logError('[HQ /getUserBadges]', error);
      return this.reply.code(500).send({ error: 'Failed to fetch badges' });
    }
  }

  /**
   * DELETE /api/hq/users/:userId/badges/:templateId - 撤銷徽章
   */
  async removeUserBadge() {
    try {
      const params = this.request.params as { userId: string; templateId: string };
      const { userId, templateId } = params;
      this.validateId(userId);
      this.validateId(templateId);

      const result = await this.hqService.removeUserBadge(userId, templateId);

      this.logDebug('Removed user badge', { userId, templateId });
      return result;
    } catch (error) {
      console.error('[DELETE /api/hq/users/:userId/badges/:templateId] Error:', error);
      this.logError('[HQ /removeUserBadge]', error);
      return this.reply.code(500).send({ error: 'Failed to revoke badge' });
    }
  }

  // ============================================
  // 其他用戶數據 (Streaks, Journeys, Messages)
  // ============================================

  /**
   * GET /api/hq/users/:userId/streaks - 獲取用戶連續記錄
   */
  async getUserStreaks() {
    try {
      const params = this.request.params as { userId: string };
      const userId = params.userId;
      this.validateId(userId);

      const streaks = await this.hqService.getUserStreaks(userId);

      this.logDebug('Fetched user streaks', { userId, count: streaks.length });
      return { streaks };
    } catch (error) {
      console.error('[GET /api/hq/users/:userId/streaks] Error:', error);
      this.logError('[HQ /getUserStreaks]', error);
      return this.reply.code(500).send({ error: 'Failed to fetch streaks' });
    }
  }

  /**
   * GET /api/hq/users/:userId/journeys - 獲取用戶旅程階段
   */
  async getUserJourneys() {
    try {
      const params = this.request.params as { userId: string };
      const userId = params.userId;
      this.validateId(userId);

      const phases = await this.hqService.getUserJourneys(userId);

      this.logDebug('Fetched user journeys', { userId, count: phases.length });
      return { phases };
    } catch (error) {
      console.error('[GET /api/hq/users/:userId/journeys] Error:', error);
      this.logError('[HQ /getUserJourneys]', error);
      return this.reply.code(500).send({ error: 'Failed to fetch journeys' });
    }
  }

  /**
   * GET /api/hq/users/:userId/messages - 獲取用戶消息日誌
   */
  async getUserMessages() {
    try {
      const params = this.request.params as { userId: string };
      const userId = params.userId;
      this.validateId(userId);

      const query = this.request.query as { limit?: string };
      const limit = parseInt(query.limit || '100', 10);

      const messages = await this.hqService.getUserMessages(userId, limit);

      this.logDebug('Fetched user messages', { userId, count: messages.length });
      return { messages };
    } catch (error) {
      console.error('[GET /api/hq/users/:userId/messages] Error:', error);
      this.logError('[HQ /getUserMessages]', error);
      return this.reply.code(500).send({ error: 'Failed to fetch messages' });
    }
  }

  // ============================================
  // 統計數據 (Statistics)
  // ============================================

  /**
   * GET /api/hq/stats - 獲取 HQ 統計數據
   */
  async getStats() {
    try {
      const stats = await this.hqService.getHQStats();

      this.logDebug('Fetched HQ stats', stats);
      return stats;
    } catch (error) {
      console.error('[GET /api/hq/stats] Error:', error);
      this.logError('[HQ /getStats]', error);
      return this.reply.code(500).send({ error: 'Failed to fetch stats' });
    }
  }
}
