// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/__tests__/controllers/base.controller.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseController, asyncHandler } from '../../src/controllers/base.controller.js';
import { ValidationError } from '../../src/middleware/errorHandler.js';

// 模擬 FastifyRequest 和 FastifyReply
const createMockRequest = (overrides = {}) => ({
  user: { id: 'user-123' },
  log: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  ...overrides,
});

const createMockReply = () => ({
  code: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
  setCookie: vi.fn().mockReturnThis(),
});

// 測試用 Controller
class TestController extends BaseController {
  public validateRequiredTest(body: any, fields: string[]) {
    return this.validateRequired(body, fields);
  }

  public validateEmailTest(email: string) {
    return this.validateEmail(email);
  }

  public validatePasswordTest(password: string) {
    return this.validatePassword(password);
  }

  public getUserIdTest(): string | null {
    return this.getUserId();
  }

  public getAuthenticatedUserIdTest(): string {
    return this.getAuthenticatedUserId();
  }
}

describe('BaseController', () => {
  let controller: TestController;
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockReply = createMockReply();
    controller = new TestController(mockRequest, mockReply);
  });

  describe('getUserId', () => {
    it('should return user ID if authenticated', () => {
      const userId = controller.getUserIdTest();
      expect(userId).toBe('user-123');
    });

    it('should return null if not authenticated', () => {
      mockRequest = createMockRequest({ user: null });
      controller = new TestController(mockRequest, mockReply);
      const userId = controller.getUserIdTest();
      expect(userId).toBeNull();
    });
  });

  describe('validateRequired', () => {
    it('should pass validation if all required fields are present', () => {
      const body = { email: 'test@example.com', password: 'password123' };
      const result = controller.validateRequiredTest(body, ['email', 'password']);
      expect(result).toEqual(body);
    });

    it('should throw ValidationError if required field is missing', () => {
      const body = { email: 'test@example.com' };
      expect(() => {
        controller.validateRequiredTest(body, ['email', 'password']);
      }).toThrow(ValidationError);
    });

    it('should throw ValidationError if field is empty string', () => {
      const body = { email: '', password: 'password123' };
      expect(() => {
        controller.validateRequiredTest(body, ['email', 'password']);
      }).toThrow(ValidationError);
    });
  });

  describe('validateEmail', () => {
    it('should accept valid email', () => {
      const email = controller.validateEmailTest('test@example.com');
      expect(email).toBe('test@example.com');
    });

    it('should reject invalid email', () => {
      expect(() => {
        controller.validateEmailTest('invalid-email');
      }).toThrow(ValidationError);
    });
  });

  describe('validatePassword', () => {
    it('should accept password with at least 6 characters', () => {
      const password = controller.validatePasswordTest('password123');
      expect(password).toBe('password123');
    });

    it('should reject password with less than 6 characters', () => {
      expect(() => {
        controller.validatePasswordTest('short');
      }).toThrow(ValidationError);
    });
  });

  describe('sendSuccess', () => {
    it('should return success response with data', () => {
      const data = { id: '123', name: 'Test' };
      const response = controller.sendSuccess(data, 'Created successfully');
      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.message).toBe('Created successfully');
    });
  });

  describe('parsePaginationQuery', () => {
    it('should parse pagination query correctly', () => {
      const query = { page: '2', limit: '20' };
      const result = controller['parsePaginationQuery'](query);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
      expect(result.skip).toBe(20);
    });

    it('should default to page 1 and limit 10', () => {
      const result = controller['parsePaginationQuery']({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.skip).toBe(0);
    });

    it('should cap limit at 100', () => {
      const result = controller['parsePaginationQuery']({ limit: '200' });
      expect(result.limit).toBe(100);
    });
  });
});

describe('asyncHandler', () => {
  it('should wrap async handler and catch errors', async () => {
    const mockRequest = createMockRequest();
    const mockReply = createMockReply();
    const handler = vi.fn().mockRejectedValue(new Error('Test error'));

    const wrappedHandler = asyncHandler(handler);
    await expect(() => wrappedHandler(mockRequest, mockReply)).rejects.toThrow('Test error');
  });
});
