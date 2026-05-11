import { Hono } from 'hono';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import {
  initializeDatabase,
  findUserByEmail,
  createEmailUser,
  findUserById,
  findOrCreateLineUser,
  findAdminByEmail,
  findAdminById,
} from '../lib/db.js';
import { comparePassword, hashPassword, signToken, verifyToken } from '../lib/auth.js';
import type { LoginRequestBody, RegisterRequestBody, LineLoginRequestBody } from '../types.js';

const auth = new Hono();

const isProd = process.env.NODE_ENV === 'production';

interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'None' | 'Lax' | 'Strict';
  domain?: string;
  maxAge: number;
  path: string;
}

function cookieOptions(): CookieOptions {
  if (isProd) {
    return {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      domain: process.env.COOKIE_DOMAIN || undefined,
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    };
  }
  return {
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  };
}

// POST /api/auth/login — Patient/User login
auth.post('/login', async (c) => {
  try {
    await initializeDatabase();
    const { email, password } = await c.req.json<LoginRequestBody>();

    if (!email || !password) {
      return c.json({ error: '請輸入 Email 和密碼' }, 400);
    }

    const user = await findUserByEmail(email.toLowerCase());
    if (!user) return c.json({ error: 'Email 或密碼不正確' }, 401);

    const valid = await comparePassword(password, user.password_hash!);
    if (!valid) return c.json({ error: 'Email 或密碼不正確' }, 401);

    // Check if user is soft-deleted
    if (user.deleted_at) return c.json({ error: '此帳號已被停用' }, 403);

    const token = await signToken(user.id);
    setCookie(c, 'auth_token', token, cookieOptions());

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        authProvider: user.auth_provider,
        role: user.role,
        userType: 'user',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: '登入失敗，請稍後再試' }, 500);
  }
});

// POST /api/auth/register — Patient/User registration
auth.post('/register', async (c) => {
  try {
    await initializeDatabase();
    const { email, password, displayName } = await c.req.json<RegisterRequestBody>();

    if (!email || !password) return c.json({ error: '請填入 Email 和密碼' }, 400);
    if (password.length < 6) return c.json({ error: '密碼至少 6 個字元' }, 400);

    const existing = await findUserByEmail(email.toLowerCase());
    if (existing) return c.json({ error: '此 Email 已被使用' }, 409);

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const user = await createEmailUser(
      id,
      email.toLowerCase(),
      passwordHash,
      displayName || email.split('@')[0],
    );
    const token = await signToken(user.id);

    setCookie(c, 'auth_token', token, cookieOptions());

    return c.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          authProvider: user.auth_provider,
          role: user.role,
          userType: 'user',
        },
      },
      201,
    );
  } catch (error) {
    console.error('Register error:', error);
    return c.json({ error: '註冊失敗，請稍後再試' }, 500);
  }
});

// GET /api/auth/me
auth.get('/me', async (c) => {
  try {
    await initializeDatabase();

    let token: string | null = null;
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7);
    if (!token) token = getCookie(c, 'auth_token') || null;
    if (!token) return c.json({ authenticated: false }, 401);

    const payload = await verifyToken(token);
    if (!payload?.userId) return c.json({ authenticated: false }, 401);

    // Try to find as User first, then as Admin
    let user = await findUserById(payload.userId);
    let userType = 'user';

    if (!user) {
      user = await findAdminById(payload.userId);
      userType = 'admin';
    }

    if (!user) return c.json({ authenticated: false }, 401);

    return c.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        pictureUrl: user.picture_url,
        authProvider: user.auth_provider,
        role: user.role,
        userType,
      },
    });
  } catch {
    return c.json({ authenticated: false }, 401);
  }
});

// POST /api/auth/admin/login — Admin login
auth.post('/admin/login', async (c) => {
  try {
    await initializeDatabase();
    const { email, password } = await c.req.json<LoginRequestBody>();

    if (!email || !password) {
      return c.json({ error: '請輸入 Email 和密碼' }, 400);
    }

    const admin = await findAdminByEmail(email.toLowerCase());
    if (!admin) return c.json({ error: 'Email 或密碼不正確' }, 401);

    const valid = await comparePassword(password, admin.password_hash);
    if (!valid) return c.json({ error: 'Email 或密碼不正確' }, 401);

    // Check if admin is soft-deleted
    if (admin.deleted_at) return c.json({ error: '此帳號已被停用' }, 403);

    const token = await signToken(admin.id);
    setCookie(c, 'auth_token', token, cookieOptions());

    return c.json({
      success: true,
      user: {
        id: admin.id,
        email: admin.email,
        displayName: admin.display_name,
        role: admin.role,
        userType: 'admin',
      },
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return c.json({ error: '登入失敗，請稍後再試' }, 500);
  }
});

// POST /api/auth/me — LINE login
auth.post('/me', async (c) => {
  try {
    await initializeDatabase();
    const { lineUserId, displayName, pictureUrl } = await c.req.json<LineLoginRequestBody>();
    if (!lineUserId) return c.json({ error: 'Unauthorized' }, 401);

    const user = await findOrCreateLineUser(lineUserId, displayName, pictureUrl);
    const token = await signToken(user.id);

    setCookie(c, 'auth_token', token, cookieOptions());

    return c.json({
      authenticated: true,
      user: {
        id: user.id,
        displayName: user.display_name,
        pictureUrl: user.picture_url,
        authProvider: user.auth_provider,
        role: user.role,
        userType: 'user',
      },
    });
  } catch (error) {
    console.error('LINE auth error:', error);
    return c.json({ error: 'LINE 登入失敗' }, 500);
  }
});

// DELETE /api/auth/me — logout
auth.delete('/me', (c) => {
  const domain = isProd ? process.env.COOKIE_DOMAIN || undefined : undefined;
  deleteCookie(c, 'auth_token', { path: '/', domain });
  deleteCookie(c, 'supplement_user_id', { path: '/', domain });
  deleteCookie(c, 'line_user_id', { path: '/', domain });
  return c.json({ success: true });
});

export default auth;
