// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/base.controller.ts
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticatedRequest, ApiResponse } from '../types/http.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';

/**
 * MVC 控制層的基礎類
 * 所有特定控制器 (AuthController, WoundController 等) 應繼承此類
 *
 * 責職：
 * - 請求參數驗證
 * - 響應格式化和序列化
 * - 錯誤處理轉換
 * - 身份驗證檢查
 */
export abstract class BaseController {
  protected request: FastifyRequest;
  protected reply: FastifyReply;

  constructor(request: FastifyRequest, reply: FastifyReply) {
    this.request = request;
    this.reply = reply;
  }

  /**
   * 獲取已驗證的用戶 ID
   * 若用戶未驗證，返回 null
   */
  protected getUserId(): string | null {
    const authReq = this.request as AuthenticatedRequest;
    return authReq.user?.id || null;
  }

  /**
   * 獲取已驗證的用戶信息
   * 若用戶未驗證，拋出 UnauthorizedError
   */
  protected getAuthenticatedUserId(): string {
    const userId = this.getUserId();
    if (!userId) {
      throw new Error('Unauthorized: User not authenticated');
    }
    return userId;
  }

  /**
   * 驗證請求體中的必需字段
   * @param body - 請求體
   * @param requiredFields - 必需字段名稱列表
   * @throws ValidationError 如果有缺失字段
   */
  protected validateRequired(
    body: any,
    requiredFields: string[],
  ): Record<string, any> {
    const errors: Array<{ field: string; message: string }> = [];

    for (const field of requiredFields) {
      if (!body || body[field] === undefined || body[field] === null || body[field] === '') {
        errors.push({
          field,
          message: `${field} is required`,
        });
      }
    }

    if (errors.length > 0) {
      throw new ValidationError('Validation failed', errors);
    }

    return body;
  }

  /**
   * 驗證電子郵件格式
   * @param email - 電子郵件
   * @throws ValidationError 如果格式無效
   */
  protected validateEmail(email: string): string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format', [
        { field: 'email', message: 'Must be a valid email address' },
      ]);
    }
    return email;
  }

  /**
   * 驗證密碼強度
   * 要求：至少 6 個字符
   * @param password - 密碼
   * @throws ValidationError 如果強度不足
   */
  protected validatePassword(password: string): string {
    if (password.length < 6) {
      throw new ValidationError('Password too weak', [
        { field: 'password', message: 'Must be at least 6 characters' },
      ]);
    }
    return password;
  }

  /**
   * 發送成功響應 (200)
   * @param data - 響應數據
   * @param message - 可選的成功信息
   */
  protected sendSuccess<T>(data: T, message: string = 'Success'): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
    };
  }

  /**
   * 發送已創建響應 (201)
   * @param data - 創建的資源數據
   * @param message - 可選的成功信息
   */
  protected sendCreated<T>(data: T, message: string = 'Resource created'): ApiResponse<T> {
    this.reply.code(201);
    return {
      success: true,
      data,
      message,
    };
  }

  /**
   * 發送分頁列表響應
   * @param items - 列表項目
   * @param total - 總項目數
   * @param page - 當前頁碼
   * @param limit - 每頁項目數
   */
  protected sendPaginated<T>(
    items: T[],
    total: number,
    page: number = 1,
    limit: number = 10,
  ): any {
    return {
      success: true,
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * 發送無內容響應 (204) - 通常用於 DELETE
   */
  protected sendNoContent(): void {
    this.reply.code(204);
  }

  /**
   * 驗證路由參數 ID 的存在和格式
   * @param id - ID 參數
   * @throws ValidationError 如果 ID 無效
   */
  protected validateId(id: string): string {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ValidationError('Invalid ID', [
        { field: 'id', message: 'ID must be a non-empty string' },
      ]);
    }
    return id.trim();
  }

  /**
   * 分頁查詢參數解析和驗證
   * @param query - 查詢參數對象
   * @returns 驗證後的分頁參數
   */
  protected parsePaginationQuery(query: any): {
    page: number;
    limit: number;
    skip: number;
  } {
    const page = Math.max(1, parseInt(query.page || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(query.limit || '10', 10)));
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  /**
   * 設置 Cookie
   * @param name - Cookie 名稱
   * @param value - Cookie 值
   * @param options - Cookie 選項
   */
  protected setCookie(
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: 'strict' | 'lax' | 'none';
      maxAge?: number;
      path?: string;
    },
  ): void {
    this.reply.setCookie(name, value, {
      httpOnly: true,
      path: '/',
      ...options,
    });
  }

  /**
   * 刪除 Cookie
   * @param name - Cookie 名稱
   */
  protected clearCookie(name: string): void {
    this.reply.setCookie(name, '', {
      maxAge: 0,
      path: '/',
    });
  }

  /**
   * 記錄調試信息
   * @param message - 調試信息
   * @param data - 可選的附加數據
   */
  protected logDebug(message: string, data?: any): void {
    this.request.log.debug({ data }, message);
  }

  /**
   * 記錄警告信息
   * @param message - 警告信息
   * @param data - 可選的附加數據
   */
  protected logWarn(message: string, data?: any): void {
    this.request.log.warn({ data }, message);
  }

  /**
   * 記錄錯誤信息
   * @param message - 錯誤信息
   * @param error - Error 對象
   */
  protected logError(message: string, error?: any): void {
    this.request.log.error(error || new Error(message), message);
  }

  /**
   * 轉換請求體（可被子類覆蓋）
   * 用於數據轉換和正規化
   */
  protected async transformRequestBody(body: any): Promise<any> {
    return body;
  }

  /**
   * 轉換響應數據（可被子類覆蓋）
   * 用於序列化和隐藏敏感字段
   */
  protected transformResponse<T>(data: T): T {
    return data;
  }
}

/**
 * 用於路由 handler 的便捷包裝函數
 * 自動捕捉異步錯誤並將其轉換為 Fastify 錯誤響應
 *
 * 使用方式：
 * app.post('/api/auth/login', asyncHandler(async (request, reply) => {
 *   const controller = new AuthController(request, reply);
 *   return controller.login();
 * }));
 */
export function asyncHandler(
  handler: (request: FastifyRequest, reply: FastifyReply) => Promise<any>,
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return await handler(request, reply);
    } catch (error) {
      // 錯誤將由 errorHandler 中間件處理
      throw error;
    }
  };
}
