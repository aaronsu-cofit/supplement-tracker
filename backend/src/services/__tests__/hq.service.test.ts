// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/services/__tests__/hq.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HQService } from '../hq.service.js';
import { PrismaClient } from '@prisma/client';
import { ValidationError, NotFoundError, ForbiddenError } from '../../middleware/errorHandler.js';

// Mock Prisma Client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(),
}));

// Mock auth functions
vi.mock('../../lib/auth.js', () => ({
  hashPassword: vi.fn((password: string) => Promise.resolve(`hashed_${password}`)),
  comparePassword: vi.fn((plain: string, hash: string) =>
    Promise.resolve(hash === `hashed_${plain}`),
  ),
}));

// Mock missions functions
vi.mock('../../lib/missions.js', () => ({
  setUserAttributeWithHooks: vi.fn((userId: string, key: string, value: string | null) =>
    Promise.resolve({
      user_id: userId,
      key,
      value,
      created_at: new Date(),
      updated_at: new Date(),
    }),
  ),
}));

// Mock db functions
vi.mock('../../lib/db.js', () => ({
  getHQStats: vi.fn(() =>
    Promise.resolve({
      oaCount: 1,
      scenarioCount: 5,
      activeScenarioCount: 3,
      templateCount: 10,
      deployedTemplateCount: 8,
      recentAssignmentCount: 25,
      enrollmentCount: 15,
      recentEngagementCount: 50,
    }),
  ),
}));

describe('HQService', () => {
  let hqService: HQService;
  let mockPrisma: any;

  beforeEach(() => {
    // 創建 mock Prisma client
    mockPrisma = {
      module: {
        findMany: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      admin: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      userAttribute: {
        findMany: vi.fn(),
        delete: vi.fn(),
      },
      missionTemplate: {
        findUnique: vi.fn(),
      },
      missionAssignment: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      userBadge: {
        findMany: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      userStreak: {
        findMany: vi.fn(),
      },
      userJourneyPhase: {
        findMany: vi.fn(),
      },
      messageLog: {
        findMany: vi.fn(),
      },
      engagementEvent: {
        findMany: vi.fn(),
      },
    };

    hqService = new HQService(mockPrisma as unknown as PrismaClient);
  });

  // ============================================
  // 模組管理測試
  // ============================================
  describe('Module Management', () => {
    it('should get all modules', async () => {
      const mockModules = [
        { id: '1', title: 'Module 1', sort_order: 1 },
        { id: '2', title: 'Module 2', sort_order: 2 },
      ];
      mockPrisma.module.findMany.mockResolvedValue(mockModules);

      const result = await hqService.getAllModules();

      expect(result).toEqual(mockModules);
      expect(mockPrisma.module.findMany).toHaveBeenCalledWith({
        orderBy: { sort_order: 'asc' },
      });
    });

    it('should update a module', async () => {
      const mockModule = {
        id: '1',
        title: 'Updated Module',
        is_enabled: true,
      };
      mockPrisma.module.update.mockResolvedValue(mockModule);

      const result = await hqService.updateModule('1', { title: 'Updated Module' });

      expect(result).toEqual(mockModule);
    });

    it('should throw NotFoundError when updating non-existent module', async () => {
      mockPrisma.module.update.mockRejectedValue(new Error('Not found'));

      await expect(hqService.updateModule('999', { title: 'Test' })).rejects.toThrow(
        NotFoundError,
      );
    });
  });

  // ============================================
  // 管理員管理測試
  // ============================================
  describe('Admin Management', () => {
    it('should get all admins without password hash', async () => {
      const mockAdmins = [
        { id: '1', email: 'admin1@test.com', role: 'admin' },
        { id: '2', email: 'admin2@test.com', role: 'superadmin' },
      ];
      mockPrisma.admin.findMany.mockResolvedValue(mockAdmins);

      const result = await hqService.getAllAdmins();

      expect(result).toEqual(mockAdmins);
      expect(mockPrisma.admin.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.not.objectContaining({ password_hash: true }),
        }),
      );
    });

    it('should create a new admin', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue(null); // Email not exists
      mockPrisma.admin.create.mockResolvedValue({
        id: 'new-admin-id',
        email: 'new@test.com',
        display_name: 'New Admin',
        role: 'admin',
        password_hash: 'hashed_password123',
      });

      const result = await hqService.createAdmin(
        'new@test.com',
        'password123',
        'New Admin',
      );

      expect(result).not.toHaveProperty('password_hash');
      expect(result.email).toBe('new@test.com');
    });

    it('should throw ValidationError when creating admin with existing email', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue({
        id: 'existing',
        email: 'existing@test.com',
      });

      await expect(
        hqService.createAdmin('existing@test.com', 'password', 'Test'),
      ).rejects.toThrow(ValidationError);
    });

    it('should update admin password', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue({
        id: 'admin-1',
        password_hash: 'hashed_oldpass',
      });
      mockPrisma.admin.update.mockResolvedValue({});

      const result = await hqService.updateAdminPassword(
        'admin-1',
        'oldpass',
        'newpass',
      );

      expect(result.success).toBe(true);
    });

    it('should throw ForbiddenError when old password is incorrect', async () => {
      mockPrisma.admin.findUnique.mockResolvedValue({
        id: 'admin-1',
        password_hash: 'hashed_correctpass',
      });

      await expect(
        hqService.updateAdminPassword('admin-1', 'wrongpass', 'newpass'),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // ============================================
  // 用戶管理測試
  // ============================================
  describe('User Management', () => {
    it('should get all users without password hash', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'user1@test.com' },
        { id: 'user-2', email: 'user2@test.com' },
      ];
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await hqService.getAllUsers();

      expect(result).toEqual(mockUsers);
    });

    it('should get user by ID without password hash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        password_hash: 'hashed_pass',
      });

      const result = await hqService.getUserById('user-1');

      expect(result).not.toHaveProperty('password_hash');
      expect(result.id).toBe('user-1');
    });

    it('should throw NotFoundError when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(hqService.getUserById('non-existent')).rejects.toThrow(NotFoundError);
    });
  });

  // ============================================
  // 任務管理測試
  // ============================================
  describe('Mission Management', () => {
    it('should assign mission to user', async () => {
      const mockTemplate = {
        id: 'template-1',
        is_active: true,
        progress_target: 10,
      };
      const mockAssignment = {
        id: 'assignment-1',
        user_id: 'user-1',
        template_id: 'template-1',
        status: 'pending',
      };

      mockPrisma.missionTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrisma.missionAssignment.findFirst.mockResolvedValue(null); // No existing
      mockPrisma.missionAssignment.create.mockResolvedValue(mockAssignment);

      const result = await hqService.assignMission('user-1', 'product-1', 'mission-key');

      expect(result).toEqual(mockAssignment);
    });

    it('should return existing assignment if already exists', async () => {
      const mockTemplate = { id: 'template-1', is_active: true };
      const existingAssignment = {
        id: 'existing-assignment',
        status: 'pending',
      };

      mockPrisma.missionTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrisma.missionAssignment.findFirst.mockResolvedValue(existingAssignment);

      const result = await hqService.assignMission('user-1', 'product-1', 'mission-key');

      expect(result).toEqual(existingAssignment);
      expect(mockPrisma.missionAssignment.create).not.toHaveBeenCalled();
    });

    it('should abandon mission', async () => {
      const mockAssignment = { id: 'assignment-1', user_id: 'user-1' };
      const updatedAssignment = { ...mockAssignment, status: 'abandoned' };

      mockPrisma.missionAssignment.findFirst.mockResolvedValue(mockAssignment);
      mockPrisma.missionAssignment.update.mockResolvedValue(updatedAssignment);

      const result = await hqService.abandonMission('user-1', 'assignment-1');

      expect(result.status).toBe('abandoned');
    });
  });

  // ============================================
  // 統計數據測試
  // ============================================
  describe('Statistics', () => {
    it('should get HQ stats', async () => {
      const result = await hqService.getHQStats();

      expect(result).toEqual({
        oaCount: 1,
        scenarioCount: 5,
        activeScenarioCount: 3,
        templateCount: 10,
        deployedTemplateCount: 8,
        recentAssignmentCount: 25,
        enrollmentCount: 15,
        recentEngagementCount: 50,
      });
    });
  });
});
