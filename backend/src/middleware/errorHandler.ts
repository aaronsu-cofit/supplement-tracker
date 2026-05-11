import {
  FastifyInstance,
  FastifyError,
  FastifyReply,
  FastifyRequest,
} from 'fastify';

/**
 * 應用級錯誤類型定義
 */
export interface AppError {
  statusCode?: number;
  validation?: Array<{ field: string; message: string }>;
  message: string;
  name?: string;
  stack?: string;
}

/**
 * 應用級錯誤類
 */
export class ValidationError extends Error {
  public statusCode = 422;
  public validation: Array<{ field: string; message: string }>;

  constructor(
    message: string,
    validation: Array<{ field: string; message: string }> = [],
  ) {
    super(message);
    this.name = 'ValidationError';
    this.validation = validation;
  }
}

export class NotFoundError extends Error {
  public statusCode = 404;

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends Error {
  public statusCode = 401;

  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  public statusCode = 403;

  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error {
  public statusCode = 409;

  constructor(message: string = 'Conflict') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class BadRequestError extends Error {
  public statusCode = 400;

  constructor(message: string = 'Bad Request') {
    super(message);
    this.name = 'BadRequestError';
  }
}

/**
 * 註冊全局錯誤處理器到 Fastify 應用
 */
export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler(
    async (error: AppError, request: FastifyRequest, reply: FastifyReply) => {
      const statusCode = error.statusCode || 500;
      const isDev = process.env.NODE_ENV !== 'production';

      // 記錄錯誤
      if (statusCode >= 500) {
        request.log.error(error, `[${error.name}] Internal server error`);
      } else {
        request.log.warn(
          { statusCode, message: error.message },
          `[${error.name}] Client error`,
        );
      }

      // 構建響應
      const response: any = {
        error: error.name || 'Error',
        message: error.message || 'An unexpected error occurred',
      };

      // 如果有驗證錯誤，包含在響應中
      if ('validation' in error && Array.isArray(error.validation)) {
        response.validation = error.validation;
      }

      // 開發環境包含 stack trace
      if (isDev && statusCode >= 500) {
        response.stack = error.stack?.split('\n');
      }

      return reply.code(statusCode).send(response);
    },
  );
}

/**
 * 轉換 Prisma 錯誤到應用錯誤
 */
export function handlePrismaError(error: any): Error {
  // Prisma 唯一約束違反
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'field';
    return new ValidationError(`${field} already exists`, [
      { field, message: 'Must be unique' },
    ]);
  }

  // Prisma 記錄未找到
  if (error.code === 'P2025') {
    return new NotFoundError('Record not found');
  }

  // Prisma 外鍵約束違反
  if (error.code === 'P2003') {
    return new BadRequestError('Foreign key constraint failed');
  }

  // Prisma 記錄依賴檢查失敗
  if (error.code === 'P2014') {
    return new ConflictError(
      'The change you are trying to make would violate a relation',
    );
  }

  // Prisma 必填字段缺失
  if (error.code === 'P2011') {
    const field = error.meta?.constraint || 'field';
    return new ValidationError(`${field} is required`, [
      { field, message: 'This field is required' },
    ]);
  }

  // 其他 Prisma 錯誤視為內部錯誤
  return new Error('Database error');
}

/**
 * 包裝異步路由處理器，自動捕獲錯誤
 * 使用方式：app.get('/api/users', asyncHandler(async (req, reply) => { ... }))
 */
export function asyncHandler(
  handler: (request: FastifyRequest, reply: FastifyReply) => Promise<any>,
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return await handler(request, reply);
    } catch (error) {
      // 如果是 Prisma 錯誤，轉換它
      if (error && typeof error === 'object' && 'code' in error) {
        throw handlePrismaError(error);
      }
      // 否則，直接拋出原始錯誤
      throw error;
    }
  };
}
