// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/services/auth.service.ts
import { PrismaClient } from '@prisma/client';
import { comparePassword, hashPassword, signToken, verifyToken } from '../lib/auth.js';
import { UnauthorizedError, ForbiddenError, ConflictError } from '../middleware/errorHandler.js';
import type { JwtPayload } from '../types/http.js';

/**
 * AuthService - 業務邏輯層
 * 責任：
 * - 密碼驗證和加密
 * - Token 生成和驗證
 * - 用戶註冊、登入、登出
 * - 用戶和管理員查詢
 */
export class AuthService {
  constructor(private prisma: PrismaClient) {}

  /**
   * 用戶登入
   * @param email - 用戶電子郵件
   * @param password - 用戶密碼
   * @returns 用戶對象和 JWT token
   */
  async userLogin(email: string, password: string) {
    // 查詢用戶
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedError('Email 或密碼不正確');
    }

    // 驗證密碼
    const passwordValid = await comparePassword(password, user.password_hash!);
    if (!passwordValid) {
      throw new UnauthorizedError('Email 或密碼不正確');
    }

    // 檢查用戶是否被軟刪除
    if (user.deleted_at) {
      throw new ForbiddenError('此帳號已被停用');
    }

    // 生成 JWT token
    const token = await signToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        authProvider: user.auth_provider,
        role: user.role,
        userType: 'user',
      },
      token,
    };
  }

  /**
   * 用戶註冊
   * @param email - 用戶電子郵件
   * @param password - 用戶密碼
   * @param displayName - 用戶顯示名稱（可選）
   * @returns 創建的用戶對象和 JWT token
   */
  async userRegister(email: string, password: string, displayName?: string) {
    const normalizedEmail = email.toLowerCase();

    // 檢查 email 是否已被使用
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictError('此 Email 已被使用');
    }

    // 哈希密碼
    const passwordHash = await hashPassword(password);

    // 創建用戶
    const user = await this.prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: normalizedEmail,
        password_hash: passwordHash,
        display_name: displayName || normalizedEmail.split('@')[0],
        auth_provider: 'email',
        role: 'user',
      },
    });

    // 生成 JWT token
    const token = await signToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        authProvider: user.auth_provider,
        role: user.role,
        userType: 'user',
      },
      token,
    };
  }

  /**
   * 獲取當前認證用戶的信息
   * @param token - JWT token
   * @returns 用戶對象和類型（user 或 admin）
   */
  async getAuthenticatedUser(token: string) {
    // 驗證 token
    const payload = await verifyToken(token);

    if (!payload?.userId) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    // 嘗試查詢為 User
    let user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });

    let userType = 'user';

    // 如果找不到，嘗試查詢為 Admin
    if (!user) {
      user = await this.prisma.admin.findUnique({
        where: { id: payload.userId },
      });

      if (user) {
        userType = 'admin';
      }
    }

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        pictureUrl: user.picture_url || undefined,
        authProvider: user.auth_provider,
        role: user.role,
        userType,
      },
    };
  }

  /**
   * 管理員登入
   * @param email - 管理員電子郵件
   * @param password - 管理員密碼
   * @returns 管理員對象和 JWT token
   */
  async adminLogin(email: string, password: string) {
    // 查詢管理員
    const admin = await this.prisma.admin.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!admin) {
      throw new UnauthorizedError('Email 或密碼不正確');
    }

    // 驗證密碼
    const passwordValid = await comparePassword(password, admin.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedError('Email 或密碼不正確');
    }

    // 檢查管理員是否被軟刪除
    if (admin.deleted_at) {
      throw new ForbiddenError('此帳號已被停用');
    }

    // 生成 JWT token
    const token = await signToken(admin.id);

    return {
      user: {
        id: admin.id,
        email: admin.email,
        displayName: admin.display_name,
        role: admin.role,
        userType: 'admin',
      },
      token,
    };
  }

  /**
   * LINE 用戶登入或註冊
   * @param lineUserId - LINE 用戶 ID
   * @param displayName - 用戶顯示名稱
   * @param pictureUrl - 用戶頭像 URL
   * @returns 用戶對象和 JWT token
   */
  async lineLogin(lineUserId: string, displayName?: string, pictureUrl?: string) {
    if (!lineUserId) {
      throw new UnauthorizedError('LINE user ID is required');
    }

    // 查詢或創建 LINE 用戶 - 使用 email 進行識別
    const lineEmail = `line_${lineUserId}@line.local`;
    let user = await this.prisma.user.findUnique({
      where: {
        email: lineEmail,
      },
    });

    if (!user) {
      // 創建新用戶
      user = await this.prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email: lineEmail,
          display_name: displayName || 'LINE User',
          picture_url: pictureUrl || null,
          auth_provider: 'line',
          role: 'user',
        },
      });
    } else if (displayName || pictureUrl) {
      // 更新現有用戶信息
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          display_name: displayName || user.display_name,
          picture_url: pictureUrl || user.picture_url,
        },
      });
    }

    // 生成 JWT token
    const token = await signToken(user.id);

    return {
      user: {
        id: user.id,
        displayName: user.display_name,
        pictureUrl: user.picture_url || undefined,
        authProvider: user.auth_provider,
        role: user.role,
        userType: 'user',
      },
      token,
    };
  }
}
