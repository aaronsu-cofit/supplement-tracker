// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/__tests__/intimacy.routes.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createFastifyApp } from '../fastify-app.js';
import type { FastifyInstance } from 'fastify';

describe('Intimacy Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createFastifyApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/intimacy/assessments', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/intimacy/assessments',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return assessments for authenticated user', async () => {
      // TODO: 實現完整的測試（需要模擬認證）
      expect(true).toBe(true);
    });
  });

  describe('POST /api/intimacy/assessments', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/intimacy/assessments',
        payload: { data: {} },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
