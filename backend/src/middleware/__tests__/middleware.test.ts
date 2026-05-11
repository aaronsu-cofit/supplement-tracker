/**
 * 中間件測試文件
 *
 * 這個文件用於驗證中間件的基本功能
 * 可以使用 vitest 運行: pnpm test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createFastifyApp } from '../../config/fastify.js';
import {
  authMiddleware,
  requireAuthMiddleware,
  softAuthMiddleware,
  createAuthTokenCookie,
} from '../auth.middleware.js';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  handlePrismaError,
} from '../errorHandler.js';

describe('Auth Middleware', () => {
  let app: any;

  beforeEach(async () => {
    app = await createFastifyApp();
  });

  it('should create auth token cookie with correct options in production', () => {
    const token = 'test-token';
    const cookie = createAuthTokenCookie(token, true);

    expect(cookie.httpOnly).toBe(true);
    expect(cookie.secure).toBe(true);
    expect(cookie.sameSite).toBe('none');
    expect(cookie.maxAge).toBe(60 * 60 * 24 * 365);
    expect(cookie.path).toBe('/');
  });

  it('should create auth token cookie with correct options in development', () => {
    const token = 'test-token';
    const cookie = createAuthTokenCookie(token, false);

    expect(cookie.httpOnly).toBe(true);
    expect(cookie.secure).toBe(false);
    expect(cookie.sameSite).toBe('lax');
    expect(cookie.maxAge).toBe(60 * 60 * 24 * 365);
    expect(cookie.path).toBe('/');
  });
});

describe('Error Handler', () => {
  it('should create ValidationError with correct properties', () => {
    const error = new ValidationError('Validation failed', [
      { field: 'email', message: 'Invalid email' },
    ]);

    expect(error.statusCode).toBe(422);
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Validation failed');
    expect(error.validation).toHaveLength(1);
    expect(error.validation[0].field).toBe('email');
  });

  it('should create NotFoundError with correct properties', () => {
    const error = new NotFoundError('User not found');

    expect(error.statusCode).toBe(404);
    expect(error.name).toBe('NotFoundError');
    expect(error.message).toBe('User not found');
  });

  it('should create UnauthorizedError with correct properties', () => {
    const error = new UnauthorizedError('Invalid token');

    expect(error.statusCode).toBe(401);
    expect(error.name).toBe('UnauthorizedError');
    expect(error.message).toBe('Invalid token');
  });

  it('should create ForbiddenError with correct properties', () => {
    const error = new ForbiddenError('Access denied');

    expect(error.statusCode).toBe(403);
    expect(error.name).toBe('ForbiddenError');
    expect(error.message).toBe('Access denied');
  });

  it('should handle Prisma P2002 error (unique constraint)', () => {
    const prismaError = {
      code: 'P2002',
      meta: { target: ['email'] },
    };

    const error = handlePrismaError(prismaError);

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe('email already exists');
    if (error instanceof ValidationError) {
      expect(error.validation[0].field).toBe('email');
      expect(error.validation[0].message).toBe('Must be unique');
    }
  });

  it('should handle Prisma P2025 error (record not found)', () => {
    const prismaError = {
      code: 'P2025',
    };

    const error = handlePrismaError(prismaError);

    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.message).toBe('Record not found');
  });

  it('should handle unknown Prisma error', () => {
    const prismaError = {
      code: 'P9999',
    };

    const error = handlePrismaError(prismaError);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Database error');
  });
});
