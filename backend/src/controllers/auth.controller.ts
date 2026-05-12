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
      this.logDebug('[POST /api/auth/login] 開始登入');

      let body: LoginRequestBody;
      try {
        body = (await this.request.body) as LoginRequestBody;
      } catch {
        this.logDebug('[POST /api/auth/login] 無效的 JSON');
        this.reply.code(400);
        return { error: 'invalid JSON' };
      }

      // 驗證必填字段（直接檢查，不使用 validateRequired）
      if (!body.email || !body.password) {
        this.logDebug('[POST /api/auth/login] 缺少 email 或 password');
        this.reply.code(400);
        return { error: '請輸入 Email 和密碼' };
      }

      // 調用 Service 業務邏輯
      const { user, token } = await this.authService.userLogin(body.email, body.password);

      // 設置 Cookie
      this.setCookie('auth_token', token, getCookieOptions());

      // 記錄登入事件
      this.logDebug('[POST /api/auth/login] 登入成功', { userId: user.id });

      return {
        success: true,
        user,
      };
    } catch (error) {
      const message = (error as Error).message;

      if (message === 'Email 或密碼不正確') {
        this.logDebug('[POST /api/auth/login] 認證失敗', { reason: message });
        this.reply.code(401);
        return { error: message };
      }

      if (message === '此帳號已被停用') {
        this.logDebug('[POST /api/auth/login] 帳號已停用');
        this.reply.code(403);
        return { error: message };
      }

      console.error('[POST /api/auth/login] 錯誤:', error);
      this.logError('[POST /api/auth/login] 錯誤', error);
      this.reply.code(500);
      return { error: '登入失敗，請稍後再試' };
    }
  }

  /**
   * POST /api/auth/register - 用戶註冊
   */
  async register() {
    try {
      this.logDebug('[POST /api/auth/register] 開始註冊');

      let body: RegisterRequestBody;
      try {
        body = (await this.request.body) as RegisterRequestBody;
      } catch {
        this.logDebug('[POST /api/auth/register] 無效的 JSON');
        this.reply.code(400);
        return { error: 'invalid JSON' };
      }

      // 驗證必填字段（直接檢查）
      if (!body.email || !body.password) {
        this.logDebug('[POST /api/auth/register] 缺少 email 或 password');
        this.reply.code(400);
        return { error: '請填入 Email 和密碼' };
      }

      // 驗證密碼長度
      if (body.password.length < 6) {
        this.logDebug('[POST /api/auth/register] 密碼過短');
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
      this.logDebug('[POST /api/auth/register] 註冊成功', { userId: user.id, email: user.email });

      this.reply.code(201);
      return {
        success: true,
        user,
      };
    } catch (error) {
      const message = (error as Error).message;

      if (message === '此 Email 已被使用') {
        this.logDebug('[POST /api/auth/register] Email 已被使用');
        this.reply.code(409);
        return { error: message };
      }

      console.error('[POST /api/auth/register] 錯誤:', error);
      this.logError('[POST /api/auth/register] 錯誤', error);
      this.reply.code(500);
      return { error: '註冊失敗，請稍後再試' };
    }
  }

  /**
   * GET /api/auth/me - 獲取當前認證用戶
   */
  async getMe() {
    try {
      this.logDebug('[GET /api/auth/me] 開始獲取認證用戶');

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
        this.logDebug('[GET /api/auth/me] 缺少 token');
        this.reply.code(401);
        return {
          authenticated: false,
        };
      }

      // 調用 Service 獲取用戶信息
      const result = await this.authService.getAuthenticatedUser(token);
      this.logDebug('[GET /api/auth/me] 獲取成功', { userId: result.user.id });
      return result;
    } catch (error) {
      // 如果 token 無效，返回未驗證
      console.error('[GET /api/auth/me] 錯誤:', error);
      this.logError('[GET /api/auth/me] 錯誤', error);
      this.logDebug('[GET /api/auth/me] token 驗證失敗');
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
      this.logDebug('[POST /api/auth/admin/login] 開始管理員登入');

      let body: LoginRequestBody;
      try {
        body = (await this.request.body) as LoginRequestBody;
      } catch {
        this.logDebug('[POST /api/auth/admin/login] 無效的 JSON');
        this.reply.code(400);
        return { error: 'invalid JSON' };
      }

      // 驗證必填字段（直接檢查）
      if (!body.email || !body.password) {
        this.logDebug('[POST /api/auth/admin/login] 缺少 email 或 password');
        this.reply.code(400);
        return { error: '請輸入 Email 和密碼' };
      }

      // 調用 Service 業務邏輯
      const { user, token } = await this.authService.adminLogin(body.email, body.password);

      // 設置 Cookie
      this.setCookie('auth_token', token, getCookieOptions());

      // 記錄登入事件
      this.logDebug('[POST /api/auth/admin/login] 管理員登入成功', { adminId: user.id });

      return {
        success: true,
        user,
      };
    } catch (error) {
      const message = (error as Error).message;

      if (message === 'Email 或密碼不正確') {
        this.logDebug('[POST /api/auth/admin/login] 認證失敗', { reason: message });
        this.reply.code(401);
        return { error: message };
      }

      if (message === '此帳號已被停用') {
        this.logDebug('[POST /api/auth/admin/login] 帳號已停用');
        this.reply.code(403);
        return { error: message };
      }

      console.error('[POST /api/auth/admin/login] 錯誤:', error);
      this.logError('[POST /api/auth/admin/login] 錯誤', error);
      this.reply.code(500);
      return { error: '登入失敗，請稍後再試' };
    }
  }

  /**
   * POST /api/auth/me - LINE 登入
   */
  async lineLogin() {
    try {
      this.logDebug('[POST /api/auth/me] 開始 LINE 登入');

      let body: LineLoginRequestBody;
      try {
        body = (await this.request.body) as LineLoginRequestBody;
      } catch {
        this.logDebug('[POST /api/auth/me] 無效的 JSON');
        this.reply.code(400);
        return { error: 'invalid JSON' };
      }

      // 驗證必填字段
      if (!body.lineUserId) {
        this.logDebug('[POST /api/auth/me] 缺少 lineUserId');
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
      this.logDebug('[POST /api/auth/me] LINE 登入成功', { userId: user.id });

      return {
        authenticated: true,
        user,
      };
    } catch (error) {
      console.error('[POST /api/auth/me] 錯誤:', error);
      this.logError('[POST /api/auth/me] 錯誤', error);
      this.reply.code(500);
      return { error: 'LINE 登入失敗' };
    }
  }

  /**
   * DELETE /api/auth/me - 登出
   */
  async logout() {
    try {
      this.logDebug('[DELETE /api/auth/me] 開始登出');
      const domain = isProd ? process.env.COOKIE_DOMAIN || undefined : undefined;

      // 清除 Cookie（使用 reply 直接設置以支持 domain 參數）
      this.reply.setCookie('auth_token', '', { path: '/', domain, maxAge: 0 });
      this.reply.setCookie('supplement_user_id', '', { path: '/', domain, maxAge: 0 });
      this.reply.setCookie('line_user_id', '', { path: '/', domain, maxAge: 0 });

      // 記錄登出事件
      const userId = this.getUserId();
      if (userId) {
        this.logDebug('[DELETE /api/auth/me] 登出成功', { userId });
      }

      return { success: true };
    } catch (error) {
      console.error('[DELETE /api/auth/me] 錯誤:', error);
      this.logError('[DELETE /api/auth/me] 錯誤', error);
      this.reply.code(500);
      return { error: 'Logout failed' };
    }
  }
}
