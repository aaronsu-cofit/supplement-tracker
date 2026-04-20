import { Hono } from 'hono';
import type { HonoEnv } from '../types.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { runDailyCycle } from '../lib/scheduler.js';
import {
  getActiveEnrollmentsList,
  getRecentDeliveries,
  getRecentEngagementEvents,
} from '../lib/db.js';

const scheduler = new Hono<HonoEnv>();
scheduler.use('*', authMiddleware);

// POST /api/scheduler/run?skip_menu_reeval=1 (optional flag)
scheduler.post('/run', async (c) => {
  try {
    const skipMenu = c.req.query('skip_menu_reeval') === '1';
    const result = await runDailyCycle({ includeMenuReeval: !skipMenu });
    return c.json(result);
  } catch (error) {
    console.error('[scheduler/run] error:', error);
    return c.json({ error: 'Scheduler run failed', details: (error as Error).message }, 500);
  }
});

// GET /api/scheduler/activity?oa_id=N — optional filter, else all OAs
scheduler.get('/activity', async (c) => {
  try {
    const queryOa = c.req.query('oa_id');
    const envOa = parseInt(process.env.LINE_OA_ID || '0');
    const oaId = queryOa ? parseInt(queryOa) : (envOa > 0 ? envOa : undefined);
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
