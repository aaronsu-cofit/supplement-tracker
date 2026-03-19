import { Hono } from 'hono';
import { softAuthMiddleware } from '../middleware/authMiddleware.js';
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
  HonoEnv,
  CreateFootAssessmentInput,
  CreateFootImageInput,
  CreateShoeImageInput,
} from '../types.js';

const bones = new Hono<HonoEnv>();
bones.use('*', softAuthMiddleware);

// GET /api/footcare/assessments
bones.get('/assessments', async (c) => {
  try {
    await initializeDatabase();
    const userId = c.get('userId');
    const assessments = await getFootAssessments(userId);
    return c.json(assessments);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// POST /api/footcare/assessments
bones.post('/assessments', async (c) => {
  try {
    await initializeDatabase();
    const userId = c.get('userId');
    const data = await c.req.json<CreateFootAssessmentInput>();
    const assessment = await createFootAssessment(userId, data);
    return c.json(assessment, 201);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// GET /api/footcare/images
bones.get('/images', async (c) => {
  try {
    await initializeDatabase();
    const userId = c.get('userId');
    const images = await getFootImages(userId);
    return c.json(images);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// POST /api/footcare/images
bones.post('/images', async (c) => {
  try {
    await initializeDatabase();
    const userId = c.get('userId');
    const data = await c.req.json<CreateFootImageInput>();
    const image = await createFootImage(userId, data);
    return c.json(image, 201);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// GET /api/footcare/shoe-images
bones.get('/shoe-images', async (c) => {
  try {
    await initializeDatabase();
    const userId = c.get('userId');
    const images = await getShoeImages(userId);
    return c.json(images);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// POST /api/footcare/shoe-images
bones.post('/shoe-images', async (c) => {
  try {
    await initializeDatabase();
    const userId = c.get('userId');
    const data = await c.req.json<CreateShoeImageInput>();
    const image = await createShoeImage(userId, data);
    return c.json(image, 201);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

export default bones;
