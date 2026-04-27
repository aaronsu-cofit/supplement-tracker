import { Hono } from 'hono';
import type { HonoEnv } from '../types.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  findUserById,
  getHabitsForUserProduct,
  getMissionDailyHistory,
  getMissionTemplateByKey,
  deleteMissionDailyLog,
  getMissionTemplatesForProduct,
  assignMission,
  abandonMissionAssignment,
  upsertUserMissionSetting,
  getUserMissionSetting,
  db,
} from '../lib/db.js';
import { logHabitDay } from '../lib/habits.js';
import { sendHabitReminder } from '../lib/reminders.js';
import { localDateInTz } from '../lib/time.js';

const me = new Hono<HonoEnv>();
me.use('*', authMiddleware);

/**
 * "Me" API — for LIFF apps. All endpoints read/write state for the
 * authenticated user (resolved from the JWT cookie by authMiddleware)
 * and a product scope passed explicitly in the query/body so the LIFF
 * always knows which product context it's running in.
 */

/**
 * GET /api/me/habits?product_id=xxx
 * Returns all habit-type missions the user is subscribed to in this
 * product, each with today's log row attached. `today` is computed in
 * the user's stored timezone.
 */
me.get('/habits', async (c) => {
  const userId = c.get('userId');
  const productId = c.req.query('product_id');
  if (!productId) return c.json({ error: 'product_id query required' }, 400);

  const user = await findUserById(userId);
  const tz = user?.timezone || 'Asia/Taipei';
  const today = localDateInTz(new Date(), tz);

  const rows = await getHabitsForUserProduct(userId, productId, today);
  return c.json({
    date: today.toISOString().slice(0, 10),
    timezone: tz,
    habits: rows,
  });
});

/**
 * POST /api/me/habits/:missionKey/log
 * Body: {
 *   product_id: string,
 *   action: 'increment' | 'set_value' | 'toggle' | 'subtask',
 *   value?: number,        // for set_value
 *   step?: number,         // for increment (default = template.step_value or 1)
 *   subtask_key?: string,  // for subtask
 *   subtask_completed?: boolean, // for subtask
 *   date?: string,         // YYYY-MM-DD in user's tz; default today
 *   auto_assign?: boolean, // subscribe on first tap (default true)
 * }
 * Returns { ok, value, completed, newly_completed, date }.
 */
me.post('/habits/:missionKey/log', async (c) => {
  const userId = c.get('userId');
  const missionKey = c.req.param('missionKey');
  let body: {
    product_id?: string;
    action?: 'increment' | 'set_value' | 'toggle' | 'subtask';
    value?: number;
    step?: number;
    subtask_key?: string;
    subtask_completed?: boolean;
    date?: string;
    auto_assign?: boolean;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid JSON' }, 400);
  }
  if (!body.product_id) return c.json({ error: 'product_id required' }, 400);

  // Build the typed action union
  let action: Parameters<typeof logHabitDay>[0]['action'];
  switch (body.action ?? 'toggle') {
    case 'increment': {
      const step = typeof body.step === 'number' ? body.step : 1;
      action = { kind: 'increment', step };
      break;
    }
    case 'set_value': {
      const value = typeof body.value === 'number' ? body.value : 0;
      action = { kind: 'set_value', value };
      break;
    }
    case 'subtask': {
      if (!body.subtask_key) return c.json({ error: 'subtask_key required for subtask action' }, 400);
      action = {
        kind: 'subtask',
        key: body.subtask_key,
        completed: body.subtask_completed ?? true,
      };
      break;
    }
    case 'toggle':
    default:
      action = { kind: 'toggle' };
      break;
  }

  // Parse optional explicit date
  let date: Date | undefined;
  if (body.date) {
    const d = new Date(body.date + 'T00:00:00Z');
    if (isNaN(d.getTime())) return c.json({ error: 'invalid date, expected YYYY-MM-DD' }, 400);
    date = d;
  }

  const result = await logHabitDay({
    productId: body.product_id,
    userId,
    missionKey,
    date,
    action,
    autoAssign: body.auto_assign !== false,
  });
  if (!result.ok) return c.json({ error: result.reason }, 400);
  return c.json(result);
});

/**
 * DELETE /api/me/habits/:missionKey/log?product_id=xxx&date=YYYY-MM-DD
 * Clear a specific date's log (undo). No side effects fire on deletion.
 */
me.delete('/habits/:missionKey/log', async (c) => {
  const userId = c.get('userId');
  const missionKey = c.req.param('missionKey');
  const productId = c.req.query('product_id');
  if (!productId) return c.json({ error: 'product_id query required' }, 400);

  const user = await findUserById(userId);
  const tz = user?.timezone || 'Asia/Taipei';
  const dateStr = c.req.query('date');
  const date = dateStr
    ? new Date(dateStr + 'T00:00:00Z')
    : localDateInTz(new Date(), tz);
  if (isNaN(date.getTime())) return c.json({ error: 'invalid date' }, 400);

  const template = await getMissionTemplateByKey(productId, missionKey);
  if (!template) return c.json({ error: 'mission not found' }, 404);
  await deleteMissionDailyLog(userId, template.id, date);
  return c.json({ success: true });
});

/**
 * GET /api/me/habits/:missionKey/history?product_id=xxx&days=30
 * Last N days of log rows; for LIFF heat maps / trend charts.
 */
me.get('/habits/:missionKey/history', async (c) => {
  const userId = c.get('userId');
  const missionKey = c.req.param('missionKey');
  const productId = c.req.query('product_id');
  if (!productId) return c.json({ error: 'product_id query required' }, 400);
  const days = Math.min(365, parseInt(c.req.query('days') || '30', 10));

  const template = await getMissionTemplateByKey(productId, missionKey);
  if (!template) return c.json({ error: 'mission not found' }, 404);

  const user = await findUserById(userId);
  const tz = user?.timezone || 'Asia/Taipei';
  const today = localDateInTz(new Date(), tz);
  const since = new Date(today);
  since.setUTCDate(since.getUTCDate() - days);

  const logs = await getMissionDailyHistory(userId, template.id, since);
  return c.json({
    mission_key: missionKey,
    from: since.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
    logs,
  });
});

/**
 * GET /api/me/products/:productId/available-missions
 * Returns every active mission in the product, each with an
 * is_subscribed flag (whether the user has an active / pending
 * MissionAssignment for it). Used by the LIFF "add habit" picker.
 */
me.get('/products/:productId/available-missions', async (c) => {
  const userId = c.get('userId');
  const productId = c.req.param('productId');

  const [templates, assignments] = await Promise.all([
    getMissionTemplatesForProduct(productId),
    db().missionAssignment.findMany({
      where: { user_id: userId, status: 'pending' },
      select: { template_id: true },
    }),
  ]);
  const subscribed = new Set(assignments.map(a => a.template_id));

  return c.json({
    missions: templates
      .filter(t => t.is_active)
      .map(t => ({ ...t, is_subscribed: subscribed.has(t.id) })),
  });
});

/**
 * GET /api/me/habits/:missionKey/setting?product_id=xxx
 * Returns the user's current overrides (null fields mean "use template
 * default"). Used by the per-habit settings screen.
 */
me.get('/habits/:missionKey/setting', async (c) => {
  const userId = c.get('userId');
  const missionKey = c.req.param('missionKey');
  const productId = c.req.query('product_id');
  if (!productId) return c.json({ error: 'product_id query required' }, 400);

  const template = await getMissionTemplateByKey(productId, missionKey);
  if (!template) return c.json({ error: 'mission not found' }, 404);
  const setting = await getUserMissionSetting(userId, template.id);
  return c.json({
    setting: setting ?? {
      daily_target: null,
      reminder_enabled: null,
      reminder_time: null,
    },
    template_defaults: {
      daily_target: template.daily_target,
      unit: template.unit,
      reminder: template.reminder,
    },
  });
});

/**
 * PATCH /api/me/habits/:missionKey/setting
 * Body: { product_id, daily_target?, reminder_enabled?, reminder_time? }
 * Upsert individual fields. Pass `null` to reset a field to template default.
 */
me.patch('/habits/:missionKey/setting', async (c) => {
  const userId = c.get('userId');
  const missionKey = c.req.param('missionKey');
  let body: {
    product_id?: string;
    daily_target?: number | null;
    reminder_enabled?: boolean | null;
    reminder_time?: string | null;
  };
  try { body = await c.req.json(); } catch { body = {}; }
  if (!body.product_id) return c.json({ error: 'product_id required' }, 400);

  const template = await getMissionTemplateByKey(body.product_id, missionKey);
  if (!template) return c.json({ error: 'mission not found' }, 404);
  const setting = await upsertUserMissionSetting(userId, template.id, {
    daily_target: body.daily_target,
    reminder_enabled: body.reminder_enabled,
    reminder_time: body.reminder_time,
  });
  return c.json({ setting });
});

/**
 * POST /api/me/habits/:missionKey/test-reminder
 * Body: { product_id }
 * Sends a one-off reminder push to the caller right now, bypassing the
 * time-window and once-per-day idempotency checks. Used by the LIFF
 * settings page so users can verify the OA / token / channel pipeline
 * works without waiting until their configured reminder_time.
 */
me.post('/habits/:missionKey/test-reminder', async (c) => {
  const userId = c.get('userId');
  const missionKey = c.req.param('missionKey');
  let body: { product_id?: string };
  try { body = await c.req.json(); } catch { body = {}; }
  if (!body.product_id) return c.json({ error: 'product_id required' }, 400);

  const template = await getMissionTemplateByKey(body.product_id, missionKey);
  if (!template) return c.json({ error: 'mission not found' }, 404);
  const setting = await getUserMissionSetting(userId, template.id);

  // Suffix with :test:<ts> so this never collides with the daily idempotency
  // record. Audit-visible in message_log either way.
  const sourceRef = `${template.key}:test:${Date.now()}`;
  try {
    const r = await sendHabitReminder({ userId, template, setting, sourceRef });
    if (r.sent) return c.json({ ok: true });
    return c.json({ ok: false, reason: r.reason ?? 'unknown' }, 400);
  } catch (err) {
    return c.json({ ok: false, error: (err as Error).message }, 500);
  }
});

/**
 * POST /api/me/missions/:missionKey/subscribe
 * Body: { product_id }
 * Idempotent: creates an assignment if one doesn't exist, otherwise
 * returns the existing one.
 */
me.post('/missions/:missionKey/subscribe', async (c) => {
  const userId = c.get('userId');
  const missionKey = c.req.param('missionKey');
  let body: { product_id?: string };
  try { body = await c.req.json(); } catch { body = {}; }
  if (!body.product_id) return c.json({ error: 'product_id required' }, 400);

  const template = await getMissionTemplateByKey(body.product_id, missionKey);
  if (!template || !template.is_active) return c.json({ error: 'mission not found' }, 404);
  const assignment = await assignMission(userId, template.id);
  return c.json({ assignment });
});

/**
 * POST /api/me/missions/:missionKey/unsubscribe
 * Body: { product_id }
 * Marks the user's pending assignment 'abandoned'. History preserved.
 */
me.post('/missions/:missionKey/unsubscribe', async (c) => {
  const userId = c.get('userId');
  const missionKey = c.req.param('missionKey');
  let body: { product_id?: string };
  try { body = await c.req.json(); } catch { body = {}; }
  if (!body.product_id) return c.json({ error: 'product_id required' }, 400);

  const template = await getMissionTemplateByKey(body.product_id, missionKey);
  if (!template) return c.json({ error: 'mission not found' }, 404);
  const pending = await db().missionAssignment.findFirst({
    where: { user_id: userId, template_id: template.id, status: 'pending' },
  });
  if (!pending) return c.json({ success: true, already_unsubscribed: true });
  const updated = await abandonMissionAssignment(userId, pending.id);
  return c.json({ assignment: updated });
});

export default me;
