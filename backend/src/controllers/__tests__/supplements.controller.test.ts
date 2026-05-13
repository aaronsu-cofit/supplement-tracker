// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/__tests__/supplements.controller.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import { SupplementsController } from '../supplements.controller.js';
import { SupplementsService } from '../../services/supplements.service.js';
import type { AuthenticatedRequest } from '../../types/http.js';

// Mock SupplementsService
const mockSupplementsService = {
  getSupplements: vi.fn(),
  createSupplement: vi.fn(),
  updateSupplement: vi.fn(),
  deleteSupplement: vi.fn(),
} as any;

// Mock Fastify Request with authenticated user
const createMockRequest = (
  body: any = {},
  params: any = {},
  userId: string = 'user-123',
): FastifyRequest => {
  const req = {
    body,
    params,
    log: {
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  } as any;
  // Set authenticated user
  (req as AuthenticatedRequest).user = { id: userId };
  return req;
};

// Mock Fastify Reply
const createMockReply = (): FastifyReply => {
  const reply = {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  } as any;
  return reply;
};

describe('SupplementsController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSupplements', () => {
    it('應該返回用戶的補充品列表', async () => {
      const mockRequest = createMockRequest();
      const mockReply = createMockReply();

      const mockSupplements = [
        {
          id: 1,
          user_id: 'user-123',
          name: 'Vitamin D',
          dosage: '1000 IU',
          frequency: 'daily',
          time_of_day: 'morning',
          notes: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockSupplementsService.getSupplements.mockResolvedValue(mockSupplements);

      const controller = new SupplementsController(mockRequest, mockReply, mockSupplementsService);
      const result = await controller.getSupplements();

      expect(mockSupplementsService.getSupplements).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockSupplements);
    });

    it('應該在用戶未認證時拋出錯誤', async () => {
      const mockRequest = {
        log: {
          debug: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
        },
      } as any; // No user attached

      const mockReply = createMockReply();

      const controller = new SupplementsController(mockRequest, mockReply, mockSupplementsService);

      // UnauthorizedError propagates to the global error handler so the
      // response carries the correct 401 status. The catch-all only
      // converts unexpected errors (DB failure etc.) to a generic 500.
      await expect(controller.getSupplements()).rejects.toThrow('User not authenticated');
    });
  });

  describe('createSupplement', () => {
    it('應該成功創建補充品', async () => {
      const mockRequest = createMockRequest({
        name: 'Vitamin C',
        dosage: '500 mg',
        frequency: 'daily',
        time_of_day: 'morning',
      });
      const mockReply = createMockReply();

      const mockCreated = {
        id: 1,
        user_id: 'user-123',
        name: 'Vitamin C',
        dosage: '500 mg',
        frequency: 'daily',
        time_of_day: 'morning',
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockSupplementsService.createSupplement.mockResolvedValue(mockCreated);

      const controller = new SupplementsController(mockRequest, mockReply, mockSupplementsService);
      const result = await controller.createSupplement();

      expect(mockSupplementsService.createSupplement).toHaveBeenCalledWith('user-123', {
        name: 'Vitamin C',
        dosage: '500 mg',
        frequency: 'daily',
        time_of_day: 'morning',
      });
      expect(mockReply.code).toHaveBeenCalledWith(201);
      expect(result).toEqual(mockCreated);
    });
  });

  describe('updateSupplement', () => {
    it('應該成功更新補充品', async () => {
      const mockRequest = createMockRequest(
        {
          name: 'Updated Name',
          dosage: '1000 mg',
        },
        { id: '1' },
      );
      const mockReply = createMockReply();

      const mockUpdated = {
        id: 1,
        user_id: 'user-123',
        name: 'Updated Name',
        dosage: '1000 mg',
        frequency: 'daily',
        time_of_day: 'morning',
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockSupplementsService.updateSupplement.mockResolvedValue(mockUpdated);

      const controller = new SupplementsController(mockRequest, mockReply, mockSupplementsService);
      const result = await controller.updateSupplement();

      expect(mockSupplementsService.updateSupplement).toHaveBeenCalledWith('user-123', '1', {
        name: 'Updated Name',
        dosage: '1000 mg',
      });
      expect(result).toEqual(mockUpdated);
    });

    it('應該在 ID 缺失時返回 400 + Invalid ID', async () => {
      const mockRequest = createMockRequest(
        { name: 'Test' },
        { id: '' }, // Empty ID
      );
      const mockReply = createMockReply();

      const controller = new SupplementsController(mockRequest, mockReply, mockSupplementsService);
      const result = await controller.updateSupplement();

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(result).toEqual({ error: 'Invalid ID' });
    });
  });

  describe('deleteSupplement', () => {
    it('應該成功刪除補充品', async () => {
      const mockRequest = createMockRequest({}, { id: '1' });
      const mockReply = createMockReply();

      mockSupplementsService.deleteSupplement.mockResolvedValue({ success: true });

      const controller = new SupplementsController(mockRequest, mockReply, mockSupplementsService);
      const result = await controller.deleteSupplement();

      expect(mockSupplementsService.deleteSupplement).toHaveBeenCalledWith('user-123', '1');
      expect(result).toEqual({ success: true });
    });

    it('應該在 ID 無效時返回 400 + Invalid ID', async () => {
      const mockRequest = createMockRequest({}, { id: '   ' });
      const mockReply = createMockReply();

      const controller = new SupplementsController(mockRequest, mockReply, mockSupplementsService);
      const result = await controller.deleteSupplement();

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(result).toEqual({ error: 'Invalid ID' });
    });
  });
});
