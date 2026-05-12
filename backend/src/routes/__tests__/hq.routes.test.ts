// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/routes/__tests__/hq.routes.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { hqRoutes } from '../hq.routes.js';
import { container } from '../../lib/container.js';
import { initializeContainer } from '../../lib/initializeContainer.js';

// Mock dependencies
vi.mock('../../lib/db.js', () => ({
  db: vi.fn(() => mockPrismaClient),
  getAdminRole: vi.fn(() => Promise.resolve('admin')),
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

vi.mock('../../lib/auth.js', () => ({
  verifyToken: vi.fn(() => Promise.resolve({ userId: 'admin-123' })),
  hashPassword: vi.fn((password: string) => Promise.resolve(`hashed_${password}`)),
  comparePassword: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('../../lib/missions.js', () => ({
  setUserAttributeWithHooks: vi.fn((userId, key, value) =>
    Promise.resolve({ user_id: userId, key, value }),
  ),
}));

// Mock Prisma client
const mockPrismaClient = {
  module: {
    findMany: vi.fn(() => Promise.resolve([])),
    update: vi.fn(),
  },
  admin: {
    findMany: vi.fn(() => Promise.resolve([])),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findMany: vi.fn(() => Promise.resolve([])),
    findUnique: vi.fn(),
    count: vi.fn(() => Promise.resolve(0)),
  },
  userAttribute: {
    findMany: vi.fn(() => Promise.resolve([])),
    delete: vi.fn(),
  },
  missionTemplate: {
    findUnique: vi.fn(),
  },
  missionAssignment: {
    findMany: vi.fn(() => Promise.resolve([])),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(() => Promise.resolve(0)),
  },
  userBadge: {
    findMany: vi.fn(() => Promise.resolve([])),
    delete: vi.fn(),
    count: vi.fn(() => Promise.resolve(0)),
  },
  userStreak: {
    findMany: vi.fn(() => Promise.resolve([])),
  },
  userJourneyPhase: {
    findMany: vi.fn(() => Promise.resolve([])),
  },
  messageLog: {
    findMany: vi.fn(() => Promise.resolve([])),
  },
  engagementEvent: {
    findMany: vi.fn(() => Promise.resolve([])),
  },
};

describe('HQ Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    // Clear and reinitialize DI container for each test
    container.clear();
    initializeContainer(container);

    app = Fastify();

    // Register cookie plugin (required by auth middleware)
    await app.register(import('@fastify/cookie'), {
      secret: 'test-secret',
    });

    // Register HQ routes
    await app.register(hqRoutes, { prefix: '/api/hq' });

    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  // ============================================
  // 認證和授權測試
  // ============================================
  describe('Authentication & Authorization', () => {
    it('should require authentication for all HQ routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/hq/stats',
        // No auth token
      });

      expect(response.statusCode).toBe(401);
    });

    it('should allow authenticated admin to access routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/hq/stats',
        headers: {
          authorization: 'Bearer valid-admin-token',
        },
      });

      // Should not be 401 or 403
      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).not.toBe(403);
    });
  });

  // ============================================
  // 模組管理測試
  // ============================================
  describe('Module Management', () => {
    it('GET /api/hq/modules should return modules', async () => {
      const mockModules = [{ id: '1', title: 'Module 1' }];
      mockPrismaClient.module.findMany.mockResolvedValueOnce(mockModules);

      const response = await app.inject({
        method: 'GET',
        url: '/api/hq/modules',
        headers: { authorization: 'Bearer admin-token' },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('modules');
    });

    it('PATCH /api/hq/modules/:id should update module', async () => {
      const mockModule = { id: '1', title: 'Updated' };
      mockPrismaClient.module.update.mockResolvedValueOnce(mockModule);

      const response = await app.inject({
        method: 'PATCH',
        url: '/api/hq/modules/1',
        headers: { authorization: 'Bearer admin-token' },
        payload: { title: 'Updated' },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('module');
    });
  });

  // ============================================
  // 管理員管理測試
  // ============================================
  describe('Admin Management', () => {
    it('GET /api/hq/admins should return admins', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/hq/admins',
        headers: { authorization: 'Bearer admin-token' },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('users'); // Note: 'users' for compatibility
    });

    it('POST /api/hq/admins should create admin', async () => {
      mockPrismaClient.admin.findUnique.mockResolvedValueOnce(null); // Email not exists
      mockPrismaClient.admin.create.mockResolvedValueOnce({
        id: 'new-admin',
        email: 'new@test.com',
        display_name: 'New Admin',
        role: 'admin',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/hq/admins',
        headers: { authorization: 'Bearer admin-token' },
        payload: {
          email: 'new@test.com',
          password: 'password123',
          displayName: 'New Admin',
        },
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('user');
    });
  });

  // ============================================
  // 用戶管理測試
  // ============================================
  describe('User Management', () => {
    it('GET /api/hq/users should return users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/hq/users',
        headers: { authorization: 'Bearer admin-token' },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('users');
    });

    it('GET /api/hq/users/:userId should return user', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValueOnce({
        id: 'user-1',
        email: 'user@test.com',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/hq/users/user-1',
        headers: { authorization: 'Bearer admin-token' },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('user');
    });
  });

  // ============================================
  // 用戶屬性測試
  // ============================================
  describe('User Attributes', () => {
    it('GET /api/hq/users/:userId/attributes should return attributes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/hq/users/user-1/attributes',
        headers: { authorization: 'Bearer admin-token' },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('attributes');
    });

    it('PUT /api/hq/users/:userId/attributes/:key should set attribute', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/hq/users/user-1/attributes/test-key',
        headers: { authorization: 'Bearer admin-token' },
        payload: { value: 'test-value' },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('attribute');
    });

    it('DELETE /api/hq/users/:userId/attributes/:key should delete attribute', async () => {
      mockPrismaClient.userAttribute.delete.mockResolvedValueOnce({});

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/hq/users/user-1/attributes/test-key',
        headers: { authorization: 'Bearer admin-token' },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload.success).toBe(true);
    });
  });

  // ============================================
  // 任務管理測試
  // ============================================
  describe('Mission Management', () => {
    it('GET /api/hq/users/:userId/missions should return missions', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/hq/users/user-1/missions',
        headers: { authorization: 'Bearer admin-token' },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('missions');
    });

    it('POST /api/hq/users/:userId/missions should assign mission', async () => {
      mockPrismaClient.missionTemplate.findUnique.mockResolvedValueOnce({
        id: 'template-1',
        is_active: true,
        progress_target: 10,
      });
      mockPrismaClient.missionAssignment.findFirst.mockResolvedValueOnce(null);
      mockPrismaClient.missionAssignment.create.mockResolvedValueOnce({
        id: 'assignment-1',
        status: 'pending',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/hq/users/user-1/missions',
        headers: { authorization: 'Bearer admin-token' },
        payload: {
          product_id: 'product-1',
          mission_key: 'mission-key',
        },
      });

      expect(response.statusCode).toBe(201);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('assignment');
    });
  });

  // ============================================
  // 統計數據測試
  // ============================================
  describe('Statistics', () => {
    it('GET /api/hq/stats should return stats', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/hq/stats',
        headers: { authorization: 'Bearer admin-token' },
      });

      expect(response.statusCode).toBe(200);
      const payload = JSON.parse(response.payload);
      expect(payload).toHaveProperty('oaCount');
      expect(payload).toHaveProperty('scenarioCount');
      expect(payload).toHaveProperty('activeScenarioCount');
      expect(payload).toHaveProperty('templateCount');
      expect(payload).toHaveProperty('deployedTemplateCount');
      expect(payload).toHaveProperty('recentAssignmentCount');
      expect(payload).toHaveProperty('enrollmentCount');
      expect(payload).toHaveProperty('recentEngagementCount');
    });
  });
});
