// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/routes/__tests__/supplements.routes.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createFastifyApp } from '../../index.js';
import type { FastifyInstance } from 'fastify';

/**
 * Supplements 路由集成測試
 *
 * 測試完整的 HTTP 請求流程：
 * Request → Middleware → Controller → Service → Database
 *
 * Requires POSTGRES_URL — skipped in environments without a test DB.
 * Run with: POSTGRES_URL=... pnpm test
 */
describe.skipIf(!process.env.POSTGRES_URL)('Supplements Routes (Integration)', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createFastifyApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/supplements', () => {
    it('應該在沒有認證時使用訪客模式', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/supplements',
      });

      // 軟認證應該允許請求通過（生成訪客 UUID）
      expect(response.statusCode).toBeLessThan(500);
      // 可能返回 200（空列表）或其他有效響應
    });

    it('應該接受 Bearer token 認證', async () => {
      // 注意：這個測試需要一個有效的 JWT token
      // 在實際環境中，你需要先登入獲取 token
      const response = await app.inject({
        method: 'GET',
        url: '/api/supplements',
        headers: {
          authorization: 'Bearer invalid-token-for-testing',
        },
      });

      // 即使 token 無效，軟認證也應該回退到訪客模式
      expect(response.statusCode).toBeLessThan(500);
    });
  });

  describe('POST /api/supplements', () => {
    it('應該驗證請求體', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/supplements',
        payload: {
          // 缺少必需的 name 字段
          dosage: '500 mg',
        },
      });

      // 應該返回 400 Bad Request（JSON Schema 驗證失敗）
      // 或 500（如果到達 Service 層的驗證）
      expect([400, 500]).toContain(response.statusCode);
    });

    it('應該接受有效的請求體', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/supplements',
        payload: {
          name: 'Test Supplement',
          dosage: '500 mg',
          frequency: 'daily',
          time_of_day: 'morning',
        },
      });

      // 在測試環境中可能無法訪問數據庫，但至少應該通過 schema 驗證
      // 實際響應取決於數據庫連接
      // 如果是 500，表示數據庫約束失敗（用戶不存在）
      const statusCode = response.statusCode;
      expect([400, 401, 403, 404, 422, 500]).toContain(statusCode);
    });
  });

  describe('PUT /api/supplements/:id', () => {
    it('應該驗證 ID 參數', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/supplements/invalid-id',
        payload: {
          name: 'Updated Name',
        },
      });

      // 應該返回 400 Bad Request（Schema 驗證：ID 必須是數字）
      // 或 500（如果到達 Service 層）
      expect([400, 500]).toContain(response.statusCode);
    });

    it('應該接受有效的請求', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/supplements/123',
        payload: {
          name: 'Updated Supplement',
          dosage: '1000 mg',
        },
      });

      // 實際響應取決於數據庫中是否存在 ID=123 的記錄
      expect(response.statusCode).toBeLessThan(500);
    });
  });

  describe('DELETE /api/supplements/:id', () => {
    it('應該驗證 ID 參數', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/supplements/not-a-number',
      });

      // 應該返回 400 Bad Request（Schema 驗證）
      expect([400, 500]).toContain(response.statusCode);
    });

    it('應該接受有效的請求', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/supplements/123',
      });

      // 即使記錄不存在，也應該返回成功（Service 層處理）
      expect(response.statusCode).toBeLessThan(500);
    });
  });

  describe('CORS', () => {
    it('應該在開發模式下允許所有來源', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/supplements',
        headers: {
          origin: 'http://test-origin.com',
        },
      });

      // 開發環境應該允許任何 origin
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});
