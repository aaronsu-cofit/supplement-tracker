// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/services/__tests__/auth.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../auth.service.js';
import { UnauthorizedError, ValidationError, ForbiddenError } from '../../middleware/errorHandler.js';
import * as authLib from '../../lib/auth.js';

// Mock Prisma Client
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  admin: {
    findUnique: vi.fn(),
  },
} as any;

// Mock auth library functions
vi.mock('../../lib/auth.js', () => ({
  comparePassword: vi.fn(),
  hashPassword: vi.fn(),
  signToken: vi.fn(),
  verifyToken: vi.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService(mockPrisma);
    vi.clearAllMocks();
  });

  describe('userLogin', () => {
    it('應該成功登入並返回用戶信息和 token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        display_name: 'Test User',
        auth_provider: 'email',
        role: 'user',
        deleted_at: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(authLib.comparePassword).mockResolvedValue(true);
      vi.mocked(authLib.signToken).mockResolvedValue('jwt-token');

      const result = await authService.userLogin('test@example.com', 'password123');

      expect(result).toEqual({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          authProvider: 'email',
          role: 'user',
          userType: 'user',
        },
        token: 'jwt-token',
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(authLib.comparePassword).toHaveBeenCalledWith('password123', 'hashed-password');
      expect(authLib.signToken).toHaveBeenCalledWith('user-123');
    });

    it('應該在用戶不存在時拋出 UnauthorizedError', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.userLogin('notfound@example.com', 'password123')).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it('應該在密碼錯誤時拋出 UnauthorizedError', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        deleted_at: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(authLib.comparePassword).mockResolvedValue(false);

      await expect(authService.userLogin('test@example.com', 'wrong-password')).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it('應該在用戶被軟刪除時拋出 ForbiddenError', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        deleted_at: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(authLib.comparePassword).mockResolvedValue(true);

      await expect(authService.userLogin('test@example.com', 'password123')).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  describe('userRegister', () => {
    it('應該成功註冊新用戶', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      vi.mocked(authLib.hashPassword).mockResolvedValue('hashed-password');
      vi.mocked(authLib.signToken).mockResolvedValue('jwt-token');

      const mockCreatedUser = {
        id: 'user-new',
        email: 'new@example.com',
        password_hash: 'hashed-password',
        display_name: 'New User',
        auth_provider: 'email',
        role: 'user',
      };

      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);

      const result = await authService.userRegister('new@example.com', 'password123', 'New User');

      expect(result.user.email).toBe('new@example.com');
      expect(result.token).toBe('jwt-token');
      expect(authLib.hashPassword).toHaveBeenCalledWith('password123');
    });

    it('應該在 email 已存在時拋出 ValidationError', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(
        authService.userRegister('existing@example.com', 'password123'),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('adminLogin', () => {
    it('應該成功登入管理員', async () => {
      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@example.com',
        password_hash: 'hashed-password',
        display_name: 'Admin User',
        auth_provider: 'email',
        role: 'admin',
        deleted_at: null,
      };

      mockPrisma.admin.findUnique.mockResolvedValue(mockAdmin);
      vi.mocked(authLib.comparePassword).mockResolvedValue(true);
      vi.mocked(authLib.signToken).mockResolvedValue('admin-jwt-token');

      const result = await authService.adminLogin('admin@example.com', 'admin123');

      expect(result.user.userType).toBe('admin');
      expect(result.token).toBe('admin-jwt-token');
    });
  });

  describe('lineLogin', () => {
    it('應該為新 LINE 用戶創建帳號', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const mockCreatedUser = {
        id: 'line-user-123',
        email: 'line_LINE123@line.local',
        display_name: 'LINE User',
        picture_url: 'https://example.com/pic.jpg',
        auth_provider: 'line',
        role: 'user',
      };

      mockPrisma.user.create.mockResolvedValue(mockCreatedUser);
      vi.mocked(authLib.signToken).mockResolvedValue('line-jwt-token');

      const result = await authService.lineLogin('LINE123', 'LINE User', 'https://example.com/pic.jpg');

      expect(result.user.authProvider).toBe('line');
      expect(result.token).toBe('line-jwt-token');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('應該更新現有 LINE 用戶信息', async () => {
      const mockExistingUser = {
        id: 'line-user-123',
        email: 'line_LINE123@line.local',
        display_name: 'Old Name',
        picture_url: null,
        auth_provider: 'line',
        role: 'user',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockExistingUser);

      const mockUpdatedUser = {
        ...mockExistingUser,
        display_name: 'New Name',
        picture_url: 'https://example.com/new.jpg',
      };

      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);
      vi.mocked(authLib.signToken).mockResolvedValue('line-jwt-token');

      const result = await authService.lineLogin('LINE123', 'New Name', 'https://example.com/new.jpg');

      expect(result.user.displayName).toBe('New Name');
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('應該在缺少 lineUserId 時拋出錯誤', async () => {
      await expect(authService.lineLogin('')).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('getAuthenticatedUser', () => {
    it('應該返回已驗證的用戶信息', async () => {
      vi.mocked(authLib.verifyToken).mockResolvedValue({ userId: 'user-123' });

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        display_name: 'Test User',
        picture_url: null,
        auth_provider: 'email',
        role: 'user',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.getAuthenticatedUser('valid-token');

      expect(result.authenticated).toBe(true);
      expect(result.user.id).toBe('user-123');
      expect(result.user.userType).toBe('user');
    });

    it('應該在 token 無效時拋出錯誤', async () => {
      vi.mocked(authLib.verifyToken).mockResolvedValue(null);

      await expect(authService.getAuthenticatedUser('invalid-token')).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });
});
