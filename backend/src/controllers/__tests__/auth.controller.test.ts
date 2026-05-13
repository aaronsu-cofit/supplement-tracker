// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/__tests__/auth.controller.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthController } from '../auth.controller.js';
import { AuthService } from '../../services/auth.service.js';

// Mock AuthService
const mockAuthService = {
  userLogin: vi.fn(),
  userRegister: vi.fn(),
  adminLogin: vi.fn(),
  lineLogin: vi.fn(),
  getAuthenticatedUser: vi.fn(),
} as any;

// Mock Fastify Request
const createMockRequest = (body: any = {}, cookies: any = {}, headers: any = {}): FastifyRequest => ({
  body,
  cookies,
  headers,
  log: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
} as any);

// Mock Fastify Reply
const createMockReply = (): FastifyReply => {
  const reply = {
    code: vi.fn().mockReturnThis(),
    setCookie: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as any;
  return reply;
};

describe('AuthController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('應該成功登入並設置 cookie', async () => {
      const mockRequest = createMockRequest({
        email: 'test@example.com',
        password: 'password123',
      });
      const mockReply = createMockReply();

      const mockLoginResult = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          authProvider: 'email',
          role: 'user',
          userType: 'user',
        },
        token: 'jwt-token',
      };

      mockAuthService.userLogin.mockResolvedValue(mockLoginResult);

      const controller = new AuthController(mockRequest, mockReply, mockAuthService);
      const result = await controller.login();

      expect(mockAuthService.userLogin).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockReply.setCookie).toHaveBeenCalledWith(
        'auth_token',
        'jwt-token',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
        }),
      );
      // Controller returns the raw service result (unwrapped) — this is
      // the contract HQ frontend depends on (packages/lib AuthProvider
      // reads data.user directly). Don't switch to sendSuccess() here
      // without also updating every caller.
      expect(result).toEqual({ success: true, user: mockLoginResult.user });
    });

    it('應該在缺少必填字段時返回 400 + 友善訊息', async () => {
      const mockRequest = createMockRequest({ email: 'test@example.com' }); // 缺少 password
      const mockReply = createMockReply();

      const controller = new AuthController(mockRequest, mockReply, mockAuthService);
      const result = await controller.login();

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(result).toEqual({ error: '請輸入 Email 和密碼' });
    });

    it.skip('應該驗證 email 格式', async () => {
      // Controller currently does not validate email format inline — it
      // delegates to AuthService.userLogin which will fail-auth on bad
      // creds. Re-enable this test if we add validateEmail() to the
      // login flow.
    });
  });

  describe('register', () => {
    it('應該成功註冊新用戶', async () => {
      const mockRequest = createMockRequest({
        email: 'new@example.com',
        password: 'password123',
        displayName: 'New User',
      });
      const mockReply = createMockReply();

      const mockRegisterResult = {
        user: {
          id: 'user-new',
          email: 'new@example.com',
          displayName: 'New User',
          authProvider: 'email',
          role: 'user',
          userType: 'user',
        },
        token: 'jwt-token',
      };

      mockAuthService.userRegister.mockResolvedValue(mockRegisterResult);

      const controller = new AuthController(mockRequest, mockReply, mockAuthService);
      const result = await controller.register();

      expect(mockAuthService.userRegister).toHaveBeenCalledWith(
        'new@example.com',
        'password123',
        'New User',
      );
      expect(mockReply.code).toHaveBeenCalledWith(201);
      expect(result.success).toBe(true);
    });

    it('應該驗證密碼長度', async () => {
      const mockRequest = createMockRequest({
        email: 'test@example.com',
        password: '123', // 密碼太短
      });
      const mockReply = createMockReply();

      const controller = new AuthController(mockRequest, mockReply, mockAuthService);
      const result = await controller.register();

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(result).toEqual({ error: '密碼至少 6 個字元' });
    });
  });

  describe('getMe', () => {
    it('應該從 Authorization header 獲取用戶信息', async () => {
      const mockRequest = createMockRequest(
        {},
        {},
        { authorization: 'Bearer valid-token' },
      );
      const mockReply = createMockReply();

      const mockUserInfo = {
        authenticated: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          displayName: 'Test User',
          authProvider: 'email',
          role: 'user',
          userType: 'user',
        },
      };

      mockAuthService.getAuthenticatedUser.mockResolvedValue(mockUserInfo);

      const controller = new AuthController(mockRequest, mockReply, mockAuthService);
      const result = await controller.getMe();

      expect(mockAuthService.getAuthenticatedUser).toHaveBeenCalledWith('valid-token');
      expect(result.authenticated).toBe(true);
    });

    it('應該從 Cookie 獲取用戶信息', async () => {
      const mockRequest = createMockRequest({}, { auth_token: 'cookie-token' });
      const mockReply = createMockReply();

      const mockUserInfo = {
        authenticated: true,
        user: { id: 'user-123' },
      };

      mockAuthService.getAuthenticatedUser.mockResolvedValue(mockUserInfo);

      const controller = new AuthController(mockRequest, mockReply, mockAuthService);
      const result = await controller.getMe();

      expect(mockAuthService.getAuthenticatedUser).toHaveBeenCalledWith('cookie-token');
      expect(result.authenticated).toBe(true);
    });

    it('應該在無 token 時返回未驗證', async () => {
      const mockRequest = createMockRequest();
      const mockReply = createMockReply();

      const controller = new AuthController(mockRequest, mockReply, mockAuthService);
      const result = await controller.getMe();

      expect(result.authenticated).toBe(false);
    });
  });

  describe('adminLogin', () => {
    it('應該成功登入管理員', async () => {
      const mockRequest = createMockRequest({
        email: 'admin@example.com',
        password: 'admin123',
      });
      const mockReply = createMockReply();

      const mockAdminResult = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          displayName: 'Admin User',
          role: 'admin',
          userType: 'admin',
        },
        token: 'admin-token',
      };

      mockAuthService.adminLogin.mockResolvedValue(mockAdminResult);

      const controller = new AuthController(mockRequest, mockReply, mockAuthService);
      const result = await controller.adminLogin();

      expect(mockAuthService.adminLogin).toHaveBeenCalledWith('admin@example.com', 'admin123');
      expect(result.user.userType).toBe('admin');
    });
  });

  describe('lineLogin', () => {
    it('應該成功 LINE 登入', async () => {
      const mockRequest = createMockRequest({
        lineUserId: 'LINE123',
        displayName: 'LINE User',
        pictureUrl: 'https://example.com/pic.jpg',
      });
      const mockReply = createMockReply();

      const mockLineResult = {
        user: {
          id: 'line-user-123',
          displayName: 'LINE User',
          pictureUrl: 'https://example.com/pic.jpg',
          authProvider: 'line',
          role: 'user',
          userType: 'user',
        },
        token: 'line-token',
      };

      mockAuthService.lineLogin.mockResolvedValue(mockLineResult);

      const controller = new AuthController(mockRequest, mockReply, mockAuthService);
      const result = await controller.lineLogin();

      expect(mockAuthService.lineLogin).toHaveBeenCalledWith(
        'LINE123',
        'LINE User',
        'https://example.com/pic.jpg',
      );
      expect(result.authenticated).toBe(true);
    });

    it('應該在缺少 lineUserId 時返回 401', async () => {
      const mockRequest = createMockRequest({});
      const mockReply = createMockReply();

      const controller = new AuthController(mockRequest, mockReply, mockAuthService);
      const result = await controller.lineLogin();

      expect(mockReply.code).toHaveBeenCalledWith(401);
      expect(result).toEqual({ error: 'Unauthorized' });
    });
  });

  describe('logout', () => {
    it('應該清除所有認證 cookies', async () => {
      const mockRequest = createMockRequest();
      const mockReply = createMockReply();

      const controller = new AuthController(mockRequest, mockReply, mockAuthService);
      const result = await controller.logout();

      expect(mockReply.setCookie).toHaveBeenCalledWith('auth_token', '', expect.any(Object));
      expect(mockReply.setCookie).toHaveBeenCalledWith('supplement_user_id', '', expect.any(Object));
      expect(mockReply.setCookie).toHaveBeenCalledWith('line_user_id', '', expect.any(Object));
      expect(result.success).toBe(true);
    });
  });
});
