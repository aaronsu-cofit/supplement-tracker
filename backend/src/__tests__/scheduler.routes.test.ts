// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/__tests__/scheduler.routes.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createFastifyApp } from '../index.js';
import type { FastifyInstance } from 'fastify';

describe('Scheduler Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createFastifyApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/scheduler/run', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/scheduler/run',
        payload: {},
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/scheduler/activity', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/scheduler/activity',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/scheduler/dry-run', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/scheduler/dry-run',
        payload: { user_id: 'test-user' },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
