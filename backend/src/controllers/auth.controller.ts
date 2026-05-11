// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/auth.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { AuthService } from '../services/auth.service.js';
import type { LoginRequestBody, RegisterRequestBody, LineLoginRequestBody } from '../types.js';

const isProd = process.env.NODE_ENV === 'production';

/**
 * AuthController - HTTP 層
 * 責任：
 * - 請求參數驗證
 * - 調用 Service 業務邏輯
 * - 設置 Cookie
 * - 格式化響應
 */
export class AuthController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private authService: AuthService,
  ) {
    super(request, reply);
  }

  /**
   * POST /api/auth/login - 用戶登入
   */
  async login() {
    const body = (await this.request.body) as LoginRequestBody;

    // 驗證必填字段
    this.validateRequired(body, ['email', 'password']);
    this.validateEmail(body.email);

    // 調用 Service 業務邏輯
    const { user, token } = await this.authService.userLogin(body.email, body.password);

    // 設置 Cookie
    this.setCookie('auth_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });

    // 記錄登入事件
    this.logDebug('User login successful', { userId: user.id });

    return this.sendSuccess({
      success: true,
      user,
    });
  }

  /**
   * POST /api/auth/register - 用戶註冊
   */
  async register() {
    const body = (await this.request.body) as RegisterRequestBody;

    // 驗證必填字段
    this.validateRequired(body, ['email', 'password']);
    this.validateEmail(body.email);
    this.validatePassword(body.password);

    // 調用 Service 業務邏輯
    const { user, token } = await this.authService.userRegister(
      body.email,
      body.password,
      body.displayName,
    );

    // 設置 Cookie
    this.setCookie('auth_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });

    // 記錄註冊事件
    this.logDebug('User registration successful', { userId: user.id, email: user.email });

    this.reply.code(201);
    return this.sendSuccess({
      success: true,
      user,
    });
  }

  /**
   * GET /api/auth/me - 獲取當前認證用戶
   */
  async getMe() {
    try {
      // 從 Authorization header 或 Cookie 獲取 token
      let token: string | null = null;

      const authHeader = this.request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }

      if (!token) {
        token = this.request.cookies.auth_token || null;
      }

      if (!token) {
        return {
          authenticated: false,
        };
      }

      // 調用 Service 獲取用戶信息
      return await this.authService.getAuthenticatedUser(token);
    } catch (error) {
      // 如果 token 無效，返回未驗證
      this.logDebug('Auth check failed', { error: (error as Error).message });
      return {
        authenticated: false,
      };
    }
  }

  /**
   * POST /api/auth/admin/login - 管理員登入
   */
  async adminLogin() {
    const body = (await this.request.body) as LoginRequestBody;

    // 驗證必填字段
    this.validateRequired(body, ['email', 'password']);
    this.validateEmail(body.email);

    // 調用 Service 業務邏輯
    const { user, token } = await this.authService.adminLogin(body.email, body.password);

    // 設置 Cookie
    this.setCookie('auth_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });

    // 記錄登入事件
    this.logDebug('Admin login successful', { adminId: user.id });

    return this.sendSuccess({
      success: true,
      user,
    });
  }

  /**
   * POST /api/auth/me - LINE 登入
   */
  async lineLogin() {
    const body = (await this.request.body) as LineLoginRequestBody;

    // 驗證必填字段
    if (!body.lineUserId) {
      throw new Error('LINE user ID is required');
    }

    // 調用 Service 業務邏輯
    const { user, token } = await this.authService.lineLogin(
      body.lineUserId,
      body.displayName,
      body.pictureUrl,
    );

    // 設置 Cookie
    this.setCookie('auth_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });

    // 記錄登入事件
    this.logDebug('LINE login successful', { userId: user.id });

    return this.sendSuccess({
      authenticated: true,
      user,
    });
  }

  /**
   * DELETE /api/auth/me - 登出
   */
  async logout() {
    // 清除 Cookie
    this.clearCookie('auth_token');
    this.clearCookie('supplement_user_id');
    this.clearCookie('line_user_id');

    // 記錄登出事件
    const userId = this.getUserId();
    if (userId) {
      this.logDebug('User logout', { userId });
    }

    return this.sendSuccess({ success: true });
  }
}
