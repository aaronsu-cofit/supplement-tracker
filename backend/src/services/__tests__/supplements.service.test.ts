// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/services/__tests__/supplements.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SupplementsService } from '../supplements.service.js';
import { ValidationError, NotFoundError } from '../../middleware/errorHandler.js';

// Mock Prisma Client
const mockPrisma = {
  supplement: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
} as any;

describe('SupplementsService', () => {
  let supplementsService: SupplementsService;

  beforeEach(() => {
    supplementsService = new SupplementsService(mockPrisma);
    vi.clearAllMocks();
  });

  describe('getSupplements', () => {
    it('應該返回用戶的補充品列表', async () => {
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
        {
          id: 2,
          user_id: 'user-123',
          name: 'Magnesium',
          dosage: '400 mg',
          frequency: 'daily',
          time_of_day: 'evening',
          notes: 'With dinner',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockPrisma.supplement.findMany.mockResolvedValue(mockSupplements);

      const result = await supplementsService.getSupplements('user-123');

      expect(result).toEqual(mockSupplements);
      expect(mockPrisma.supplement.findMany).toHaveBeenCalledWith({
        where: { user_id: 'user-123' },
        orderBy: [{ time_of_day: 'asc' }, { name: 'asc' }],
      });
    });

    it('應該返回空數組當用戶沒有補充品時', async () => {
      mockPrisma.supplement.findMany.mockResolvedValue([]);

      const result = await supplementsService.getSupplements('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('createSupplement', () => {
    it('應該成功創建補充品記錄', async () => {
      const mockCreatedSupplement = {
        id: 1,
        user_id: 'user-123',
        name: 'Vitamin D',
        dosage: '1000 IU',
        frequency: 'daily',
        time_of_day: 'morning',
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.supplement.create.mockResolvedValue(mockCreatedSupplement);

      const result = await supplementsService.createSupplement('user-123', {
        name: 'Vitamin D',
        dosage: '1000 IU',
        frequency: 'daily',
        time_of_day: 'morning',
      });

      expect(result).toEqual(mockCreatedSupplement);
      expect(mockPrisma.supplement.create).toHaveBeenCalledWith({
        data: {
          user_id: 'user-123',
          name: 'Vitamin D',
          dosage: '1000 IU',
          frequency: 'daily',
          time_of_day: 'morning',
          notes: null,
        },
      });
    });

    it('應該使用默認值創建補充品', async () => {
      const mockCreatedSupplement = {
        id: 1,
        user_id: 'user-123',
        name: 'Calcium',
        dosage: null,
        frequency: 'daily',
        time_of_day: 'morning',
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.supplement.create.mockResolvedValue(mockCreatedSupplement);

      const result = await supplementsService.createSupplement('user-123', {
        name: 'Calcium',
      });

      expect(result.frequency).toBe('daily');
      expect(result.time_of_day).toBe('morning');
      expect(mockPrisma.supplement.create).toHaveBeenCalledWith({
        data: {
          user_id: 'user-123',
          name: 'Calcium',
          dosage: null,
          frequency: 'daily',
          time_of_day: 'morning',
          notes: null,
        },
      });
    });

    it('應該修剪名稱中的空白字符', async () => {
      const mockCreatedSupplement = {
        id: 1,
        user_id: 'user-123',
        name: 'Vitamin C',
        dosage: null,
        frequency: 'daily',
        time_of_day: 'morning',
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.supplement.create.mockResolvedValue(mockCreatedSupplement);

      await supplementsService.createSupplement('user-123', {
        name: '  Vitamin C  ',
      });

      expect(mockPrisma.supplement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Vitamin C',
        }),
      });
    });

    it('應該在名稱為空時拋出 ValidationError', async () => {
      await expect(
        supplementsService.createSupplement('user-123', {
          name: '',
        }),
      ).rejects.toThrow(ValidationError);

      await expect(
        supplementsService.createSupplement('user-123', {
          name: '   ',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('應該在缺少名稱時拋出 ValidationError', async () => {
      await expect(
        supplementsService.createSupplement('user-123', {} as any),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('updateSupplement', () => {
    it('應該成功更新補充品記錄', async () => {
      const mockExisting = {
        id: 1,
        user_id: 'user-123',
        name: 'Old Name',
      };

      const mockUpdated = {
        id: 1,
        user_id: 'user-123',
        name: 'New Name',
        dosage: '500 mg',
        frequency: 'twice_daily',
        time_of_day: 'evening',
        notes: 'Updated notes',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.supplement.findFirst.mockResolvedValue(mockExisting);
      mockPrisma.supplement.update.mockResolvedValue(mockUpdated);

      const result = await supplementsService.updateSupplement('user-123', '1', {
        name: 'New Name',
        dosage: '500 mg',
        frequency: 'twice_daily',
        time_of_day: 'evening',
        notes: 'Updated notes',
      });

      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.supplement.findFirst).toHaveBeenCalledWith({
        where: { id: 1, user_id: 'user-123' },
      });
      expect(mockPrisma.supplement.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          name: 'New Name',
          dosage: '500 mg',
          frequency: 'twice_daily',
          time_of_day: 'evening',
          notes: 'Updated notes',
        },
      });
    });

    it('應該在記錄不存在時拋出 NotFoundError', async () => {
      mockPrisma.supplement.findFirst.mockResolvedValue(null);

      await expect(
        supplementsService.updateSupplement('user-123', '999', {
          name: 'New Name',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('應該在 ID 無效時拋出 ValidationError', async () => {
      await expect(
        supplementsService.updateSupplement('user-123', 'invalid', {
          name: 'New Name',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('應該在名稱為空時拋出 ValidationError', async () => {
      await expect(
        supplementsService.updateSupplement('user-123', '1', {
          name: '',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('應該防止跨用戶更新', async () => {
      mockPrisma.supplement.findFirst.mockResolvedValue(null);

      await expect(
        supplementsService.updateSupplement('user-123', '1', {
          name: 'Hacked Name',
        }),
      ).rejects.toThrow(NotFoundError);

      expect(mockPrisma.supplement.findFirst).toHaveBeenCalledWith({
        where: { id: 1, user_id: 'user-123' },
      });
    });
  });

  describe('deleteSupplement', () => {
    it('應該成功刪除補充品記錄', async () => {
      mockPrisma.supplement.deleteMany.mockResolvedValue({ count: 1 });

      const result = await supplementsService.deleteSupplement('user-123', '1');

      expect(result).toEqual({ success: true });
      expect(mockPrisma.supplement.deleteMany).toHaveBeenCalledWith({
        where: { id: 1, user_id: 'user-123' },
      });
    });

    it('應該在記錄不存在時仍返回成功', async () => {
      mockPrisma.supplement.deleteMany.mockResolvedValue({ count: 0 });

      const result = await supplementsService.deleteSupplement('user-123', '999');

      expect(result).toEqual({ success: true });
    });

    it('應該在 ID 無效時拋出 ValidationError', async () => {
      await expect(
        supplementsService.deleteSupplement('user-123', 'invalid'),
      ).rejects.toThrow(ValidationError);
    });

    it('應該防止跨用戶刪除', async () => {
      mockPrisma.supplement.deleteMany.mockResolvedValue({ count: 0 });

      await supplementsService.deleteSupplement('user-123', '1');

      // 驗證查詢條件包含 user_id
      expect(mockPrisma.supplement.deleteMany).toHaveBeenCalledWith({
        where: { id: 1, user_id: 'user-123' },
      });
    });
  });
});
