import { Hono } from 'hono';
import { softAuthMiddleware } from '../middleware/authMiddleware.js';
import { getSupplements, createSupplement, updateSupplement, deleteSupplement } from '../lib/db.js';

const supplements = new Hono();
supplements.use('*', softAuthMiddleware);

// GET /api/supplements
supplements.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    const data = await getSupplements(userId);
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Failed to fetch supplements' }, 500);
  }
});

// POST /api/supplements
supplements.post('/', async (c) => {
  try {
    const userId = c.get('userId');
    const data = await c.req.json();
    if (!data.name?.trim()) return c.json({ error: 'Name is required' }, 400);
    const supplement = await createSupplement(userId, data);
    return c.json(supplement, 201);
  } catch (error) {
    return c.json({ error: 'Failed to create supplement' }, 500);
  }
});

// PUT /api/supplements/:id
supplements.put('/:id', async (c) => {
  try {
    const userId = c.get('userId');
    const id = parseInt(c.req.param('id'), 10);
    const data = await c.req.json();
    if (!data.name?.trim()) return c.json({ error: 'Name is required' }, 400);
    const supplement = await updateSupplement(userId, id, data);
    if (!supplement) return c.json({ error: 'Not found' }, 404);
    return c.json(supplement);
  } catch (error) {
    return c.json({ error: 'Failed to update' }, 500);
  }
});

// DELETE /api/supplements/:id
supplements.delete('/:id', async (c) => {
  try {
    const userId = c.get('userId');
    const id = parseInt(c.req.param('id'), 10);
    await deleteSupplement(userId, id);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to delete' }, 500);
  }
});

export default supplements;
