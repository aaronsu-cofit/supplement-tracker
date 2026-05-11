import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * JWT Payload 類型
 */
export interface JwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

/**
 * 認證請求類型（包含 user 信息）
 */
export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email?: string;
    role?: string;
  };
}

/**
 * API 響應類型
 */
export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 分頁查詢參數
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  skip?: number;
}

/**
 * 控制器上下文
 */
export interface ControllerContext {
  request: FastifyRequest;
  reply: FastifyReply;
}
