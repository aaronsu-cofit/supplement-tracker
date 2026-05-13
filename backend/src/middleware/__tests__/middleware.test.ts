/**
 * 中間件測試文件
 *
 * 這個文件用於驗證中間件的基本功能
 * 可以使用 vitest 運行: pnpm test
 */

import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  handlePrismaError,
} from '../errorHandler.js';

// NOTE: the old "Auth Middleware" describe block was removed when the
// auth middleware was restructured (auth.middleware.ts → auth.ts +
// authMiddleware.ts). Cookie helpers now live in the auth controller's
// getCookieOptions() — they're verified via the auth controller tests.

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
