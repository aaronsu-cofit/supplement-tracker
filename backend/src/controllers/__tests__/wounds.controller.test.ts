// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/controllers/__tests__/wounds.controller.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WoundsController } from '../wounds.controller.js';
import { WoundsService } from '../../services/wounds.service.js';
import { ValidationError, NotFoundError } from '../../middleware/errorHandler.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

// Mock WoundsService
const mockWoundsService = {
  getWounds: vi.fn(),
  getWoundById: vi.fn(),
  createWound: vi.fn(),
  updateWound: vi.fn(),
  archiveWound: vi.fn(),
  getAllWoundsAdmin: vi.fn(),
  getWoundLogs: vi.fn(),
  createWoundLog: vi.fn(),
  generateSoapNote: vi.fn(),
} as any;

describe('WoundsController', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let controller: WoundsController;

  beforeEach(() => {
    // Mock Fastify Request
    mockRequest = {
      user: { id: 'user-123' },
      params: {},
      body: {},
      log: {
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      } as any,
    } as any;

    // Mock Fastify Reply
    mockReply = {
      code: vi.fn().mockReturnThis(),
      send: vi.fn(),
    } as any;

    controller = new WoundsController(
      mockRequest as FastifyRequest,
      mockReply as FastifyReply,
      mockWoundsService,
    );

    vi.clearAllMocks();
  });

  describe('getWounds', () => {
    it('應該返回用戶的傷口列表', async () => {
      const mockWounds = [
        { id: 1, name: '左膝擦傷', user_id: 'user-123' },
        { id: 2, name: '右手割傷', user_id: 'user-123' },
      ];

      mockWoundsService.getWounds.mockResolvedValue(mockWounds);

      const result = await controller.getWounds();

      expect(result).toEqual(mockWounds);
      expect(mockWoundsService.getWounds).toHaveBeenCalledWith('user-123');
    });

    it('應該在用戶未認證時拋出錯誤', async () => {
      mockRequest.user = undefined;

      await expect(controller.getWounds()).rejects.toThrow();
    });
  });

  describe('getWoundById', () => {
    it('應該返回單個傷口記錄', async () => {
      const mockWound = { id: 1, name: '左膝擦傷', user_id: 'user-123' };

      mockRequest.params = { woundId: '1' };
      mockWoundsService.getWoundById.mockResolvedValue(mockWound);

      const result = await controller.getWoundById();

      expect(result).toEqual(mockWound);
      expect(mockWoundsService.getWoundById).toHaveBeenCalledWith('user-123', 1);
    });

    it('應該在 woundId 無效時拋出 ValidationError', async () => {
      mockRequest.params = { woundId: 'invalid' };

      await expect(controller.getWoundById()).rejects.toThrow(ValidationError);
    });

    it('應該在傷口不存在時拋出 NotFoundError', async () => {
      mockRequest.params = { woundId: '999' };
      mockWoundsService.getWoundById.mockRejectedValue(new NotFoundError('Wound not found'));

      await expect(controller.getWoundById()).rejects.toThrow(NotFoundError);
    });
  });

  describe('createWound', () => {
    it('應該成功創建傷口記錄', async () => {
      const mockCreatedWound = {
        id: 1,
        name: '左膝擦傷',
        user_id: 'user-123',
      };

      mockRequest.body = {
        name: '左膝擦傷',
        location: '左膝',
      };

      mockWoundsService.createWound.mockResolvedValue(mockCreatedWound);

      const result = await controller.createWound();

      expect(result).toEqual(mockCreatedWound);
      expect(mockWoundsService.createWound).toHaveBeenCalledWith('user-123', {
        name: '左膝擦傷',
        location: '左膝',
      });
      expect(mockReply.code).toHaveBeenCalledWith(201);
    });
  });

  describe('updateWound', () => {
    it('應該成功更新傷口記錄', async () => {
      const mockUpdatedWound = {
        id: 1,
        name: '新名稱',
        user_id: 'user-123',
      };

      mockRequest.params = { woundId: '1' };
      mockRequest.body = { name: '新名稱' };

      mockWoundsService.updateWound.mockResolvedValue(mockUpdatedWound);

      const result = await controller.updateWound();

      expect(result).toEqual({ success: true, wound: mockUpdatedWound });
      expect(mockWoundsService.updateWound).toHaveBeenCalledWith('user-123', 1, {
        name: '新名稱',
      });
    });

    it('應該在 woundId 無效時拋出 ValidationError', async () => {
      mockRequest.params = { woundId: 'invalid' };
      mockRequest.body = { name: '新名稱' };

      await expect(controller.updateWound()).rejects.toThrow(ValidationError);
    });
  });

  describe('deleteWound', () => {
    it('應該成功歸檔傷口記錄', async () => {
      mockRequest.params = { woundId: '1' };
      mockWoundsService.archiveWound.mockResolvedValue({ success: true });

      const result = await controller.deleteWound();

      expect(result).toEqual({ success: true });
      expect(mockWoundsService.archiveWound).toHaveBeenCalledWith('user-123', 1);
    });

    it('應該在 woundId 無效時拋出 ValidationError', async () => {
      mockRequest.params = { woundId: 'invalid' };

      await expect(controller.deleteWound()).rejects.toThrow(ValidationError);
    });
  });

  describe('getAllWoundsAdmin', () => {
    it('應該返回所有傷口（管理員）', async () => {
      const mockWounds = [
        { id: 1, name: '傷口1', user_id: 'user-123' },
        { id: 2, name: '傷口2', user_id: 'user-456' },
      ];

      mockWoundsService.getAllWoundsAdmin.mockResolvedValue(mockWounds);

      const result = await controller.getAllWoundsAdmin();

      expect(result).toEqual(mockWounds);
      expect(mockWoundsService.getAllWoundsAdmin).toHaveBeenCalled();
    });
  });

  describe('getWoundLogs', () => {
    it('應該返回傷口的日誌記錄', async () => {
      const mockLogs = [
        { id: 1, wound_id: 1, nrs_pain_score: 5 },
        { id: 2, wound_id: 1, nrs_pain_score: 3 },
      ];

      mockRequest.params = { woundId: '1' };
      mockWoundsService.getWoundLogs.mockResolvedValue(mockLogs);

      const result = await controller.getWoundLogs();

      expect(result).toEqual(mockLogs);
      expect(mockWoundsService.getWoundLogs).toHaveBeenCalledWith('user-123', 1);
    });

    it('應該在 woundId 無效時拋出 ValidationError', async () => {
      mockRequest.params = { woundId: 'invalid' };

      await expect(controller.getWoundLogs()).rejects.toThrow(ValidationError);
    });
  });

  describe('createWoundLog', () => {
    it('應該成功創建日誌記錄', async () => {
      const mockCreatedLog = {
        id: 1,
        wound_id: 1,
        nrs_pain_score: 5,
        symptoms: '紅腫',
      };

      mockRequest.params = { woundId: '1' };
      mockRequest.body = {
        nrs_pain_score: 5,
        symptoms: '紅腫',
      };

      mockWoundsService.createWoundLog.mockResolvedValue(mockCreatedLog);

      const result = await controller.createWoundLog();

      expect(result).toEqual(mockCreatedLog);
      expect(mockWoundsService.createWoundLog).toHaveBeenCalledWith('user-123', 1, {
        nrs_pain_score: 5,
        symptoms: '紅腫',
      });
      expect(mockReply.code).toHaveBeenCalledWith(201);
    });

    it('應該在 woundId 無效時拋出 ValidationError', async () => {
      mockRequest.params = { woundId: 'invalid' };
      mockRequest.body = { nrs_pain_score: 5 };

      await expect(controller.createWoundLog()).rejects.toThrow(ValidationError);
    });
  });

  describe('generateSoapNote', () => {
    it('應該成功生成 SOAP Note', async () => {
      process.env.GEMINI_API_KEY = 'fake-api-key';

      mockRequest.params = { woundId: '1' };
      mockWoundsService.generateSoapNote.mockResolvedValue('Mock SOAP Note content');

      const result = await controller.generateSoapNote();

      expect(result).toEqual({
        success: true,
        soap_note: 'Mock SOAP Note content',
      });
      expect(mockWoundsService.generateSoapNote).toHaveBeenCalledWith(1, 'fake-api-key');
    });

    it('應該在 API Key 未配置時拋出 ValidationError', async () => {
      delete process.env.GEMINI_API_KEY;

      mockRequest.params = { woundId: '1' };

      await expect(controller.generateSoapNote()).rejects.toThrow(ValidationError);
    });

    it('應該在 woundId 無效時拋出 ValidationError', async () => {
      process.env.GEMINI_API_KEY = 'fake-api-key';
      mockRequest.params = { woundId: 'invalid' };

      await expect(controller.generateSoapNote()).rejects.toThrow(ValidationError);
    });
  });
});
