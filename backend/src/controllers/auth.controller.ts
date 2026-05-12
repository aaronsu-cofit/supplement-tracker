// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/auth.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { AuthService } from '../services/auth.service.js';
import type { LoginRequestBody, RegisterRequestBody, LineLoginRequestBody } from '../types.js';

const isProd = process.env.NODE_ENV === 'production';

function getCookieOptions(): { httpOnly: boolean; secure: boolean; sameSite: 'none' | 'lax' | 'strict'; domain?: string; maxAge: number; path: string } {
  if (isProd) {
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: process.env.COOKIE_DOMAIN || undefined,
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    };
  }
  return {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  };
}

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
    try {
      const body = (await this.request.body) as LoginRequestBody;

      // 驗證必填字段（直接檢查，不使用 validateRequired）
      if (!body.email || !body.password) {
        this.reply.code(400);
        return { error: '請輸入 Email 和密碼' };
      }

      // 調用 Service 業務邏輯
      const { user, token } = await this.authService.userLogin(body.email, body.password);

      // 設置 Cookie
      this.setCookie('auth_token', token, getCookieOptions());

      // 記錄登入事件
      this.logDebug('User login successful', { userId: user.id });

      return {
        success: true,
        user,
      };
    } catch (error) {
      const message = (error as Error).message;
      this.logError('[Auth /login]', error);

      if (message === 'Email 或密碼不正確') {
        this.reply.code(401);
        return { error: message };
      }

      if (message === '此帳號已被停用') {
        this.reply.code(403);
        return { error: message };
      }

      throw error;
    }
  }

  /**
   * POST /api/auth/register - 用戶註冊
   */
  async register() {
    try {
      const body = (await this.request.body) as RegisterRequestBody;

      // 驗證必填字段（直接檢查）
      if (!body.email || !body.password) {
        this.reply.code(400);
        return { error: '請填入 Email 和密碼' };
      }

      // 驗證密碼長度
      if (body.password.length < 6) {
        this.reply.code(400);
        return { error: '密碼至少 6 個字元' };
      }

      // 調用 Service 業務邏輯
      const { user, token } = await this.authService.userRegister(
        body.email,
        body.password,
        body.displayName,
      );

      // 設置 Cookie
      this.setCookie('auth_token', token, getCookieOptions());

      // 記錄註冊事件
      this.logDebug('User registration successful', { userId: user.id, email: user.email });

      this.reply.code(201);
      return {
        success: true,
        user,
      };
    } catch (error) {
      const message = (error as Error).message;
      this.logError('[Auth /register]', error);

      if (message === '此 Email 已被使用') {
        this.reply.code(409);
        return { error: message };
      }

      throw error;
    }
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
        this.reply.code(401);
        return {
          authenticated: false,
        };
      }

      // 調用 Service 獲取用戶信息
      return await this.authService.getAuthenticatedUser(token);
    } catch (error) {
      // 如果 token 無效，返回未驗證
      this.logDebug('Auth check failed', { error: (error as Error).message });
      this.reply.code(401);
      return {
        authenticated: false,
      };
    }
  }

  /**
   * POST /api/auth/admin/login - 管理員登入
   */
  async adminLogin() {
    try {
      const body = (await this.request.body) as LoginRequestBody;

      // 驗證必填字段（直接檢查）
      if (!body.email || !body.password) {
        this.reply.code(400);
        return { error: '請輸入 Email 和密碼' };
      }

      // 調用 Service 業務邏輯
      const { user, token } = await this.authService.adminLogin(body.email, body.password);

      // 設置 Cookie
      this.setCookie('auth_token', token, getCookieOptions());

      // 記錄登入事件
      this.logDebug('Admin login successful', { adminId: user.id });

      return {
        success: true,
        user,
      };
    } catch (error) {
      const message = (error as Error).message;
      this.logError('[Auth /admin/login]', error);

      if (message === 'Email 或密碼不正確') {
        this.reply.code(401);
        return { error: message };
      }

      if (message === '此帳號已被停用') {
        this.reply.code(403);
        return { error: message };
      }

      throw error;
    }
  }

  /**
   * POST /api/auth/me - LINE 登入
   */
  async lineLogin() {
    try {
      const body = (await this.request.body) as LineLoginRequestBody;

      // 驗證必填字段
      if (!body.lineUserId) {
        this.reply.code(401);
        return { error: 'Unauthorized' };
      }

      // 調用 Service 業務邏輯
      const { user, token } = await this.authService.lineLogin(
        body.lineUserId,
        body.displayName,
        body.pictureUrl,
      );

      // 設置 Cookie
      this.setCookie('auth_token', token, getCookieOptions());

      // 記錄登入事件
      this.logDebug('LINE login successful', { userId: user.id });

      return {
        authenticated: true,
        user,
      };
    } catch (error) {
      this.logError('[Auth /me]', error);
      return this.reply.code(500).send({ error: 'LINE 登入失敗' });
    }
  }

  /**
   * DELETE /api/auth/me - 登出
   */
  async logout() {
    const domain = isProd ? process.env.COOKIE_DOMAIN || undefined : undefined;

    // 清除 Cookie（使用 reply 直接設置以支持 domain 參數）
    this.reply.setCookie('auth_token', '', { path: '/', domain, maxAge: 0 });
    this.reply.setCookie('supplement_user_id', '', { path: '/', domain, maxAge: 0 });
    this.reply.setCookie('line_user_id', '', { path: '/', domain, maxAge: 0 });

    // 記錄登出事件
    const userId = this.getUserId();
    if (userId) {
      this.logDebug('User logout', { userId });
    }

    return { success: true };
  }
}
