import { Hono } from 'hono';
import type { HonoEnv } from '../types.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { runScheduler } from '../lib/scheduler.js';
import {
  getActiveEnrollmentsList,
  getRecentDeliveries,
  getRecentEngagementEvents,
} from '../lib/db.js';

const scheduler = new Hono<HonoEnv>();
scheduler.use('*', authMiddleware);

// POST /api/scheduler/run
scheduler.post('/run', async (c) => {
  try {
    const result = await runScheduler();
    return c.json(result);
  } catch (error) {
    console.error('[scheduler/run] error:', error);
    return c.json({ error: 'Scheduler run failed', details: (error as Error).message }, 500);
  }
});

// GET /api/scheduler/activity
scheduler.get('/activity', async (c) => {
  try {
    const envOa = parseInt(process.env.LINE_OA_ID || '0');
    const oaId = envOa > 0 ? envOa : undefined;
    const [enrollments, deliveries, engagement] = await Promise.all([
      getActiveEnrollmentsList(50, oaId),
      getRecentDeliveries(50, oaId),
      getRecentEngagementEvents(50),
    ]);
    return c.json({ enrollments, deliveries, engagement, oaId: oaId ?? null });
  } catch (error) {
    console.error('[scheduler/activity] error:', error);
    return c.json({ error: 'Failed to load activity' }, 500);
  }
});

export default scheduler;
