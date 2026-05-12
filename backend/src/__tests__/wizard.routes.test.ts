// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/__tests__/wizard.routes.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createFastifyApp } from '../fastify-app.js';
import type { FastifyInstance } from 'fastify';

describe('Wizard Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createFastifyApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/wizard/oa/:oaId/scenarios', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/wizard/oa/1/scenarios',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/wizard/oa/:oaId/scenarios', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/wizard/oa/1/scenarios',
        payload: { name: 'Test Scenario' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/wizard/scenarios/:id', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/wizard/scenarios/test-id',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PATCH /api/wizard/scenarios/:id', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/wizard/scenarios/test-id',
        payload: { name: 'Updated' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/wizard/scenarios/:id', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/wizard/scenarios/test-id',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
