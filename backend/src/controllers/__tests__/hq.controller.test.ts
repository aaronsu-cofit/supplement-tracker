// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/__tests__/hq.controller.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HQController } from '../hq.controller.js';
import { HQService } from '../../services/hq.service.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

describe('HQController', () => {
  let controller: HQController;
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let mockHQService: Partial<HQService>;

  beforeEach(() => {
    // Mock FastifyRequest
    mockRequest = {
      params: {},
      query: {},
      body: {},
      log: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      } as any,
      user: { id: 'admin-123' } as any,
    };

    // Mock FastifyReply
    mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };

    // Mock HQService
    mockHQService = {
      getAllModules: vi.fn(),
      updateModule: vi.fn(),
      getAllAdmins: vi.fn(),
      createAdmin: vi.fn(),
      updateAdminRole: vi.fn(),
      updateAdminPassword: vi.fn(),
      getAllUsers: vi.fn(),
      getUserById: vi.fn(),
      getUserEngagementEvents: vi.fn(),
      getUserAttributes: vi.fn(),
      setUserAttribute: vi.fn(),
      deleteUserAttribute: vi.fn(),
      getUserMissions: vi.fn(),
      assignMission: vi.fn(),
      abandonMission: vi.fn(),
      getUserBadges: vi.fn(),
      removeUserBadge: vi.fn(),
      getUserStreaks: vi.fn(),
      getUserJourneys: vi.fn(),
      getUserMessages: vi.fn(),
      getHQStats: vi.fn(),
    };

    controller = new HQController(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
      mockHQService as HQService,
    );
  });

  // ============================================
  // 模組管理測試
  // ============================================
  describe('Module Management', () => {
    it('should get all modules', async () => {
      const mockModules = [{ id: '1', title: 'Module 1' }];
      (mockHQService.getAllModules as any).mockResolvedValue(mockModules);

      const result = await controller.getModules();

      expect(result).toEqual({ modules: mockModules });
      expect(mockHQService.getAllModules).toHaveBeenCalled();
    });

    it('should update a module', async () => {
      const mockModule = { id: '1', title: 'Updated' };
      mockRequest.params = { id: '1' };
      mockRequest.body = { title: 'Updated' };
      (mockHQService.updateModule as any).mockResolvedValue(mockModule);

      const result = await controller.updateModule();

      expect(result).toEqual({ success: true, module: mockModule });
      expect(mockHQService.updateModule).toHaveBeenCalledWith('1', { title: 'Updated' });
    });
  });

  // ============================================
  // 管理員管理測試
  // ============================================
  describe('Admin Management', () => {
    it('should get all admins', async () => {
      const mockAdmins = [{ id: '1', email: 'admin@test.com' }];
      (mockHQService.getAllAdmins as any).mockResolvedValue(mockAdmins);

      const result = await controller.getAdmins();

      expect(result).toEqual({ users: mockAdmins }); // Note: 'users' key for compatibility
      expect(mockHQService.getAllAdmins).toHaveBeenCalled();
    });

    it('should create a new admin', async () => {
      const mockAdmin = {
        id: 'new-admin',
        email: 'new@test.com',
        display_name: 'New Admin',
      };
      mockRequest.body = {
        email: 'new@test.com',
        password: 'password123',
        displayName: 'New Admin',
      };
      (mockHQService.createAdmin as any).mockResolvedValue(mockAdmin);

      const result = await controller.createAdmin();

      expect(result).toEqual({ success: true, user: mockAdmin });
      expect(mockReply.code).toHaveBeenCalledWith(201);
    });

    it('should update admin role', async () => {
      const mockAdmin = { id: 'admin-1', role: 'superadmin' };
      mockRequest.params = { adminId: 'admin-1' };
      mockRequest.body = { role: 'superadmin' };
      (mockHQService.updateAdminRole as any).mockResolvedValue(mockAdmin);

      const result = await controller.updateAdminRole();

      expect(result).toEqual({ success: true, user: mockAdmin });
    });

    it('should update my password', async () => {
      mockRequest.body = { oldPassword: 'old', newPassword: 'new' };
      (mockHQService.updateAdminPassword as any).mockResolvedValue({ success: true });

      const result = await controller.updateMyPassword();

      expect(result).toEqual({ success: true });
      expect(mockHQService.updateAdminPassword).toHaveBeenCalledWith(
        'admin-123',
        'old',
        'new',
      );
    });
  });

  // ============================================
  // 用戶管理測試
  // ============================================
  describe('User Management', () => {
    it('should get all users', async () => {
      const mockUsers = [{ id: 'user-1', email: 'user@test.com' }];
      (mockHQService.getAllUsers as any).mockResolvedValue(mockUsers);

      const result = await controller.getUsers();

      expect(result).toEqual({ users: mockUsers });
    });

    it('should get user by ID', async () => {
      const mockUser = { id: 'user-1', email: 'user@test.com' };
      mockRequest.params = { userId: 'user-1' };
      (mockHQService.getUserById as any).mockResolvedValue(mockUser);

      const result = await controller.getUserById();

      expect(result).toEqual({ user: mockUser });
    });

    it('should get user engagement events', async () => {
      const mockEvents = [{ id: 'event-1', event_type: 'login' }];
      mockRequest.params = { userId: 'user-1' };
      mockRequest.query = { limit: '50' };
      (mockHQService.getUserEngagementEvents as any).mockResolvedValue(mockEvents);

      const result = await controller.getUserEngagement();

      expect(result).toEqual({ events: mockEvents });
      expect(mockHQService.getUserEngagementEvents).toHaveBeenCalledWith('user-1', 50);
    });
  });

  // ============================================
  // 用戶屬性測試
  // ============================================
  describe('User Attributes', () => {
    it('should get user attributes', async () => {
      const mockAttributes = [{ key: 'attr1', value: 'value1' }];
      mockRequest.params = { userId: 'user-1' };
      (mockHQService.getUserAttributes as any).mockResolvedValue(mockAttributes);

      const result = await controller.getUserAttributes();

      expect(result).toEqual({ attributes: mockAttributes });
    });

    it('should set user attribute', async () => {
      const mockAttribute = { key: 'attr1', value: 'value1' };
      mockRequest.params = { userId: 'user-1', key: 'attr1' };
      mockRequest.body = { value: 'value1' };
      (mockHQService.setUserAttribute as any).mockResolvedValue(mockAttribute);

      const result = await controller.setUserAttribute();

      expect(result).toEqual({ attribute: mockAttribute });
    });

    it('should delete user attribute', async () => {
      mockRequest.params = { userId: 'user-1', key: 'attr1' };
      (mockHQService.deleteUserAttribute as any).mockResolvedValue({ success: true });

      const result = await controller.deleteUserAttribute();

      expect(result).toEqual({ success: true });
    });
  });

  // ============================================
  // 任務管理測試
  // ============================================
  describe('Mission Management', () => {
    it('should get user missions', async () => {
      const mockMissions = [{ id: 'mission-1', status: 'pending' }];
      mockRequest.params = { userId: 'user-1' };
      (mockHQService.getUserMissions as any).mockResolvedValue(mockMissions);

      const result = await controller.getUserMissions();

      expect(result).toEqual({ missions: mockMissions });
    });

    it('should assign mission', async () => {
      const mockAssignment = { id: 'assignment-1', status: 'pending' };
      mockRequest.params = { userId: 'user-1' };
      mockRequest.body = { product_id: 'product-1', mission_key: 'mission-key' };
      (mockHQService.assignMission as any).mockResolvedValue(mockAssignment);

      const result = await controller.assignMission();

      expect(result).toEqual({ assignment: mockAssignment });
      expect(mockReply.code).toHaveBeenCalledWith(201);
    });

    it('should abandon mission', async () => {
      const mockAssignment = { id: 'assignment-1', status: 'abandoned' };
      mockRequest.params = { userId: 'user-1', assignmentId: 'assignment-1' };
      (mockHQService.abandonMission as any).mockResolvedValue(mockAssignment);

      const result = await controller.abandonMission();

      expect(result).toEqual({ assignment: mockAssignment });
    });
  });

  // ============================================
  // 統計數據測試
  // ============================================
  describe('Statistics', () => {
    it('should get HQ stats', async () => {
      const mockStats = {
        users: { total: 100, activeLast7Days: 25 },
        missions: { total: 50, completed: 30, completionRate: 60 },
        badges: { total: 75 },
        modules: { total: 10 },
      };
      (mockHQService.getHQStats as any).mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
    });
  });
});
