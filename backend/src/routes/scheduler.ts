import { Hono } from 'hono';
import type { HonoEnv } from '../types.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { runDailyCycle, dryRunScheduler } from '../lib/scheduler.js';
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

// POST /api/scheduler/dry-run
// Body: { user_id: string, scenario_id?: string, as_of?: string (ISO) }
// Returns the actions the scheduler *would* fire for this user on the
// given date without any side effects.
scheduler.post('/dry-run', async (c) => {
  let body: { user_id?: string; scenario_id?: string; as_of?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid JSON' }, 400);
  }
  if (!body.user_id || typeof body.user_id !== 'string') {
    return c.json({ error: 'user_id required' }, 400);
  }
  let asOf: Date | undefined;
  if (body.as_of) {
    const d = new Date(body.as_of);
    if (isNaN(d.getTime())) return c.json({ error: 'as_of is not a valid ISO date' }, 400);
    asOf = d;
  }
  try {
    const result = await dryRunScheduler({
      userId: body.user_id,
      scenarioId: body.scenario_id,
      asOf,
    });
    return c.json(result);
  } catch (error) {
    console.error('[scheduler/dry-run] error:', error);
    return c.json({ error: 'Dry run failed', details: (error as Error).message }, 500);
  }
});

export default scheduler;
