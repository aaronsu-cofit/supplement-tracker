import { Hono } from 'hono';
import type { HonoEnv } from '../types.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/requireRole.js';
import { runScheduler } from '../lib/scheduler.js';

const scheduler = new Hono<HonoEnv>();
scheduler.use('*', authMiddleware);
scheduler.use('*', requireRole('admin', 'superadmin'));

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

export default scheduler;
