// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/services/__tests__/wounds.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WoundsService } from '../wounds.service.js';
import { ValidationError, NotFoundError } from '../../middleware/errorHandler.js';

// Mock Prisma Client
const mockPrisma = {
  wound: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  woundLog: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
} as any;

// Mock AI module
vi.mock('../../lib/ai.js', () => ({
  callGeminiText: vi.fn().mockResolvedValue('Mock SOAP Note content'),
}));

describe('WoundsService', () => {
  let woundsService: WoundsService;

  beforeEach(() => {
    woundsService = new WoundsService(mockPrisma);
    vi.clearAllMocks();
  });

  describe('getWounds', () => {
    it('應該返回用戶的活躍傷口列表', async () => {
      const mockWounds = [
        {
          id: 1,
          user_id: 'user-123',
          name: '左膝擦傷',
          location: '左膝',
          date_of_injury: new Date('2024-01-01'),
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: 2,
          user_id: 'user-123',
          name: '右手割傷',
          location: '右手',
          date_of_injury: new Date('2024-01-15'),
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];

      mockPrisma.wound.findMany.mockResolvedValue(mockWounds);

      const result = await woundsService.getWounds('user-123');

      expect(result).toEqual(mockWounds);
      expect(mockPrisma.wound.findMany).toHaveBeenCalledWith({
        where: { user_id: 'user-123', status: 'active' },
        orderBy: { created_at: 'desc' },
      });
    });

    it('應該返回空數組當用戶沒有傷口時', async () => {
      mockPrisma.wound.findMany.mockResolvedValue([]);

      const result = await woundsService.getWounds('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getWoundById', () => {
    it('應該返回單個傷口記錄', async () => {
      const mockWound = {
        id: 1,
        user_id: 'user-123',
        name: '左膝擦傷',
        location: '左膝',
        date_of_injury: new Date('2024-01-01'),
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.wound.findFirst.mockResolvedValue(mockWound);

      const result = await woundsService.getWoundById('user-123', 1);

      expect(result).toEqual(mockWound);
      expect(mockPrisma.wound.findFirst).toHaveBeenCalledWith({
        where: { id: 1, user_id: 'user-123' },
      });
    });

    it('應該在傷口不存在時拋出 NotFoundError', async () => {
      mockPrisma.wound.findFirst.mockResolvedValue(null);

      await expect(woundsService.getWoundById('user-123', 999)).rejects.toThrow(NotFoundError);
    });

    it('應該防止跨用戶訪問', async () => {
      mockPrisma.wound.findFirst.mockResolvedValue(null);

      await expect(woundsService.getWoundById('user-456', 1)).rejects.toThrow(NotFoundError);

      expect(mockPrisma.wound.findFirst).toHaveBeenCalledWith({
        where: { id: 1, user_id: 'user-456' },
      });
    });
  });

  describe('createWound', () => {
    it('應該成功創建傷口記錄', async () => {
      const mockCreatedWound = {
        id: 1,
        user_id: 'user-123',
        name: '左膝擦傷',
        location: '左膝',
        date_of_injury: new Date('2024-01-01'),
        wound_type: '擦傷',
        body_location: '下肢',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.wound.create.mockResolvedValue(mockCreatedWound);

      const result = await woundsService.createWound('user-123', {
        name: '左膝擦傷',
        location: '左膝',
        date_of_injury: '2024-01-01',
        wound_type: '擦傷',
        body_location: '下肢',
      });

      expect(result).toEqual(mockCreatedWound);
      expect(mockPrisma.wound.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          user_id: 'user-123',
          name: '左膝擦傷',
          location: '左膝',
          wound_type: '擦傷',
          body_location: '下肢',
          status: 'active',
        }),
      });
    });

    it('應該使用默認名稱當未提供時', async () => {
      const mockCreatedWound = {
        id: 1,
        user_id: 'user-123',
        name: '未命名傷口',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.wound.create.mockResolvedValue(mockCreatedWound);

      await woundsService.createWound('user-123', {});

      expect(mockPrisma.wound.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: '未命名傷口',
        }),
      });
    });

    it('應該修剪空白字符', async () => {
      const mockCreatedWound = {
        id: 1,
        user_id: 'user-123',
        name: '左膝擦傷',
        location: '左膝',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.wound.create.mockResolvedValue(mockCreatedWound);

      await woundsService.createWound('user-123', {
        name: '  左膝擦傷  ',
        location: '  左膝  ',
      });

      expect(mockPrisma.wound.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: '左膝擦傷',
          location: '左膝',
        }),
      });
    });
  });

  describe('updateWound', () => {
    it('應該成功更新傷口記錄', async () => {
      const mockExisting = {
        id: 1,
        user_id: 'user-123',
        name: '舊名稱',
      };

      const mockUpdated = {
        id: 1,
        user_id: 'user-123',
        name: '新名稱',
        wound_type: '擦傷',
        body_location: '下肢',
        date_of_injury: new Date('2024-01-15'),
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockPrisma.wound.findFirst.mockResolvedValue(mockExisting);
      mockPrisma.wound.update.mockResolvedValue(mockUpdated);

      const result = await woundsService.updateWound('user-123', 1, {
        name: '新名稱',
        wound_type: '擦傷',
        body_location: '下肢',
        date_of_injury: '2024-01-15',
      });

      expect(result).toEqual(mockUpdated);
      expect(mockPrisma.wound.findFirst).toHaveBeenCalledWith({
        where: { id: 1, user_id: 'user-123' },
      });
      expect(mockPrisma.wound.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          name: '新名稱',
          wound_type: '擦傷',
          body_location: '下肢',
        }),
      });
    });

    it('應該在記錄不存在時拋出 NotFoundError', async () => {
      mockPrisma.wound.findFirst.mockResolvedValue(null);

      await expect(
        woundsService.updateWound('user-123', 999, { name: '新名稱' }),
      ).rejects.toThrow(NotFoundError);
    });

    it('應該在沒有字段更新時拋出 ValidationError', async () => {
      const mockExisting = {
        id: 1,
        user_id: 'user-123',
      };

      mockPrisma.wound.findFirst.mockResolvedValue(mockExisting);

      await expect(woundsService.updateWound('user-123', 1, {})).rejects.toThrow(ValidationError);
    });

    it('應該防止跨用戶更新', async () => {
      mockPrisma.wound.findFirst.mockResolvedValue(null);

      await expect(
        woundsService.updateWound('user-456', 1, { name: '黑客名稱' }),
      ).rejects.toThrow(NotFoundError);

      expect(mockPrisma.wound.findFirst).toHaveBeenCalledWith({
        where: { id: 1, user_id: 'user-456' },
      });
    });
  });

  describe('archiveWound', () => {
    it('應該成功歸檔傷口記錄', async () => {
      const mockExisting = {
        id: 1,
        user_id: 'user-123',
        status: 'active',
      };

      mockPrisma.wound.findFirst.mockResolvedValue(mockExisting);
      mockPrisma.wound.update.mockResolvedValue({ ...mockExisting, status: 'archived' });

      const result = await woundsService.archiveWound('user-123', 1);

      expect(result).toEqual({ success: true });
      expect(mockPrisma.wound.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'archived' },
      });
    });

    it('應該在記錄不存在時拋出 NotFoundError', async () => {
      mockPrisma.wound.findFirst.mockResolvedValue(null);

      await expect(woundsService.archiveWound('user-123', 999)).rejects.toThrow(NotFoundError);
    });

    it('應該防止跨用戶刪除', async () => {
      mockPrisma.wound.findFirst.mockResolvedValue(null);

      await expect(woundsService.archiveWound('user-456', 1)).rejects.toThrow(NotFoundError);

      expect(mockPrisma.wound.findFirst).toHaveBeenCalledWith({
        where: { id: 1, user_id: 'user-456' },
      });
    });
  });

  describe('getAllWoundsAdmin', () => {
    it('應該返回所有傷口（最多 50 個）', async () => {
      const mockWounds = Array(50).fill({
        id: 1,
        user_id: 'user-123',
        name: '傷口',
        status: 'active',
        created_at: new Date(),
      });

      mockPrisma.wound.findMany.mockResolvedValue(mockWounds);

      const result = await woundsService.getAllWoundsAdmin();

      expect(result).toHaveLength(50);
      expect(mockPrisma.wound.findMany).toHaveBeenCalledWith({
        orderBy: { created_at: 'desc' },
        take: 50,
      });
    });
  });

  describe('getWoundLogs', () => {
    it('應該返回傷口的日誌記錄', async () => {
      const mockWound = { id: 1, user_id: 'user-123' };
      const mockLogs = [
        {
          id: 1,
          wound_id: 1,
          user_id: 'user-123',
          nrs_pain_score: 5,
          symptoms: '紅腫',
          logged_at: new Date(),
        },
        {
          id: 2,
          wound_id: 1,
          user_id: 'user-123',
          nrs_pain_score: 3,
          symptoms: '改善',
          logged_at: new Date(),
        },
      ];

      mockPrisma.wound.findFirst.mockResolvedValue(mockWound);
      mockPrisma.woundLog.findMany.mockResolvedValue(mockLogs);

      const result = await woundsService.getWoundLogs('user-123', 1);

      expect(result).toEqual(mockLogs);
      expect(mockPrisma.woundLog.findMany).toHaveBeenCalledWith({
        where: { user_id: 'user-123', wound_id: 1 },
        orderBy: { logged_at: 'desc' },
      });
    });

    it('應該在傷口不存在時拋出 NotFoundError', async () => {
      mockPrisma.wound.findFirst.mockResolvedValue(null);

      await expect(woundsService.getWoundLogs('user-123', 999)).rejects.toThrow(NotFoundError);
    });
  });

  describe('createWoundLog', () => {
    it('應該成功創建日誌記錄', async () => {
      const mockWound = { id: 1, user_id: 'user-123' };
      const mockCreatedLog = {
        id: 1,
        wound_id: 1,
        user_id: 'user-123',
        nrs_pain_score: 5,
        symptoms: '紅腫',
        logged_at: new Date(),
      };

      mockPrisma.wound.findFirst.mockResolvedValue(mockWound);
      mockPrisma.woundLog.create.mockResolvedValue(mockCreatedLog);

      const result = await woundsService.createWoundLog('user-123', 1, {
        nrs_pain_score: 5,
        symptoms: '紅腫',
      });

      expect(result).toEqual(mockCreatedLog);
      expect(mockPrisma.woundLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          wound_id: 1,
          user_id: 'user-123',
          nrs_pain_score: 5,
          symptoms: '紅腫',
        }),
      });
    });

    it('應該在傷口不存在時拋出 NotFoundError', async () => {
      mockPrisma.wound.findFirst.mockResolvedValue(null);

      await expect(
        woundsService.createWoundLog('user-123', 999, { nrs_pain_score: 5 }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('generateSoapNote', () => {
    it('應該成功生成 SOAP Note', async () => {
      const mockLogs = [
        {
          id: 1,
          wound_id: 1,
          nrs_pain_score: 5,
          symptoms: '紅腫',
          ai_assessment_summary: 'AI 評估',
          ai_status_label: '穩定',
          logged_at: new Date('2024-01-01'),
        },
      ];

      mockPrisma.woundLog.findMany.mockResolvedValue(mockLogs);

      const result = await woundsService.generateSoapNote(1, 'fake-api-key');

      expect(result).toBe('Mock SOAP Note content');
    });

    it('應該在沒有日誌時拋出 ValidationError', async () => {
      mockPrisma.woundLog.findMany.mockResolvedValue([]);

      await expect(woundsService.generateSoapNote(1, 'fake-api-key')).rejects.toThrow(
        ValidationError,
      );
    });
  });
});
