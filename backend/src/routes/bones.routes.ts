import { FastifyInstance } from 'fastify';
import { softAuthPreHandler } from '../middleware/authMiddleware.js';
import {
  getFootAssessments,
  createFootAssessment,
  getFootImages,
  createFootImage,
  getShoeImages,
  createShoeImage,
  initializeDatabase,
} from '../lib/db.js';
import type {
  CreateFootAssessmentInput,
  CreateFootImageInput,
  CreateShoeImageInput,
} from '../types.js';

export async function bonesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', softAuthPreHandler);

  // GET /api/footcare/assessments
  app.get('/assessments', async (request, reply) => {
    try {
      await initializeDatabase();
      const userId = (request as any).userId;
      const assessments = await getFootAssessments(userId);
      return assessments;
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // POST /api/footcare/assessments
  app.post('/assessments', async (request, reply) => {
    try {
      await initializeDatabase();
      const userId = (request as any).userId;
      const data = request.body as CreateFootAssessmentInput;
      const assessment = await createFootAssessment(userId, data);
      return reply.code(201).send(assessment);
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // GET /api/footcare/images
  app.get('/images', async (request, reply) => {
    try {
      await initializeDatabase();
      const userId = (request as any).userId;
      const images = await getFootImages(userId);
      return images;
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // POST /api/footcare/images
  app.post('/images', async (request, reply) => {
    try {
      await initializeDatabase();
      const userId = (request as any).userId;
      const data = request.body as CreateFootImageInput;
      const image = await createFootImage(userId, data);
      return reply.code(201).send(image);
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // GET /api/footcare/shoe-images
  app.get('/shoe-images', async (request, reply) => {
    try {
      await initializeDatabase();
      const userId = (request as any).userId;
      const images = await getShoeImages(userId);
      return images;
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });

  // POST /api/footcare/shoe-images
  app.post('/shoe-images', async (request, reply) => {
    try {
      await initializeDatabase();
      const userId = (request as any).userId;
      const data = request.body as CreateShoeImageInput;
      const image = await createShoeImage(userId, data);
      return reply.code(201).send(image);
    } catch (error) {
      return reply.code(500).send({ error: (error as Error).message });
    }
  });
}
