import { Hono } from 'hono';
import { softAuthMiddleware } from '../middleware/authMiddleware.js';
import { getCheckIns, createCheckIn, removeCheckIn, getCheckInHistory, getStreak } from '../lib/db.js';

const checkins = new Hono();
checkins.use('*', softAuthMiddleware);

// GET /api/checkins
checkins.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    const { date, startDate, endDate, type } = c.req.query();

    if (type === 'streak') {
      const streak = await getStreak(userId);
      return c.json({ streak });
    }
    if (type === 'history' && startDate && endDate) {
      const history = await getCheckInHistory(userId, startDate, endDate);
      return c.json(history);
    }
    const today = date || new Date().toISOString().split('T')[0];
    const checkIns = await getCheckIns(userId, today);
    return c.json(checkIns);
  } catch (error) {
    return c.json({ error: 'Failed to fetch check-ins' }, 500);
  }
});

// POST /api/checkins
checkins.post('/', async (c) => {
  try {
    const userId = c.get('userId');
    const { supplementId } = await c.req.json();
    if (!supplementId) return c.json({ error: 'supplementId is required' }, 400);
    const checkIn = await createCheckIn(userId, supplementId);
    return c.json(checkIn, 201);
  } catch (error) {
    return c.json({ error: 'Failed to check in' }, 500);
  }
});

// DELETE /api/checkins
checkins.delete('/', async (c) => {
  try {
    const userId = c.get('userId');
    const { supplementId, date } = await c.req.json();
    await removeCheckIn(userId, supplementId, date);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to remove check-in' }, 500);
  }
});

export default checkins;
