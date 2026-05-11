// /Users/chingchingyeh/cofit/dtx-space/Vitera/backend/src/__tests__/ai.routes.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createFastifyApp } from '../fastify-app.js';
import type { FastifyInstance } from 'fastify';

describe('AI Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createFastifyApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/ai/run', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/run',
        payload: { agent_id: 'test-agent' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/ai/stream', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/ai/stream',
        payload: { agent_id: 'test-agent' },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
