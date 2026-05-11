import { FastifyInstance } from 'fastify';
import { authPreHandler } from '../middleware/authMiddleware.js';
import {
  findUserById, getHabitsForUserProduct, getMissionDailyHistory, getMissionTemplateByKey,
  deleteMissionDailyLog, getMissionTemplatesForProduct, assignMission, abandonMissionAssignment,
  upsertUserMissionSetting, getUserMissionSetting, db,
} from '../lib/db.js';
import { logHabitDay } from '../lib/habits.js';
import { sendHabitReminder } from '../lib/reminders.js';
import { localDateInTz } from '../lib/time.js';

export async function meRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authPreHandler);

  // GET /api/me/habits?product_id=xxx
  app.get('/habits', async (request, reply) => {
    const userId = (request as any).userId;
    const { product_id } = request.query as any;
    if (!product_id) return reply.code(400).send({ error: 'product_id query required' });

    const user = await findUserById(userId);
    const tz = user?.timezone || 'Asia/Taipei';
    const today = localDateInTz(new Date(), tz);

    const rows = await getHabitsForUserProduct(userId, product_id, today);
    return {
      date: today.toISOString().slice(0, 10),
      timezone: tz,
      habits: rows,
    };
  });

  // POST /api/me/habits/:missionKey/log
  app.post('/habits/:missionKey/log', async (request, reply) => {
    const userId = (request as any).userId;
    const { missionKey } = request.params as any;
    const body = (request.body || {}) as any;
    
    if (!body.product_id) return reply.code(400).send({ error: 'product_id required' });

    let action: Parameters<typeof logHabitDay>[0]['action'];
    switch (body.action ?? 'toggle') {
      case 'increment':
        action = { kind: 'increment', step: typeof body.step === 'number' ? body.step : 1 };
        break;
      case 'set_value':
        action = { kind: 'set_value', value: typeof body.value === 'number' ? body.value : 0 };
        break;
      case 'subtask':
        if (!body.subtask_key) return reply.code(400).send({ error: 'subtask_key required for subtask action' });
        action = { kind: 'subtask', key: body.subtask_key, completed: body.subtask_completed ?? true };
        break;
      case 'skip':
        action = { kind: 'skip' };
        break;
      case 'unskip':
        action = { kind: 'unskip' };
        break;
      default:
        action = { kind: 'toggle' };
    }

    let date: Date | undefined;
    if (body.date) {
      const d = new Date(body.date + 'T00:00:00Z');
      if (isNaN(d.getTime())) return reply.code(400).send({ error: 'invalid date, expected YYYY-MM-DD' });
      date = d;
    }

    const note = body.note === undefined ? undefined
      : body.note === null ? null
      : String(body.note).slice(0, 500);

    const result = await logHabitDay({
      productId: body.product_id,
      userId,
      missionKey,
      date,
      action,
      note,
      autoAssign: body.auto_assign !== false,
    });
    
    if (!result.ok) return reply.code(400).send({ error: result.reason });
    return result;
  });

  // GET /api/me/habits/:missionKey/history
  app.get('/habits/:missionKey/history', async (request, reply) => {
    const userId = (request as any).userId;
    const { missionKey } = request.params as any;
    const { product_id, days } = request.query as any;
    if (!product_id) return reply.code(400).send({ error: 'product_id query required' });
    
    const daysNum = Math.min(365, parseInt(days || '30', 10));
    const template = await getMissionTemplateByKey(product_id, missionKey);
    if (!template) return reply.code(404).send({ error: 'mission not found' });

    const user = await findUserById(userId);
    const tz = user?.timezone || 'Asia/Taipei';
    const today = localDateInTz(new Date(), tz);
    const since = new Date(today);
    since.setUTCDate(since.getUTCDate() - daysNum);

    const logs = await getMissionDailyHistory(userId, template.id, since);
    return {
      mission_key: missionKey,
      from: since.toISOString().slice(0, 10),
      to: today.toISOString().slice(0, 10),
      logs,
    };
  });

  // POST /api/me/missions/:missionKey/subscribe
  app.post('/missions/:missionKey/subscribe', async (request, reply) => {
    const userId = (request as any).userId;
    const { missionKey } = request.params as any;
    const body = (request.body || {}) as any;
    if (!body.product_id) return reply.code(400).send({ error: 'product_id required' });

    const template = await getMissionTemplateByKey(body.product_id, missionKey);
    if (!template || !template.is_active) return reply.code(404).send({ error: 'mission not found' });

    const assignment = await assignMission(userId, template.id);
    return { assignment };
  });

  // POST /api/me/missions/:missionKey/abandon
  app.post('/missions/:missionKey/abandon', async (request, reply) => {
    const userId = (request as any).userId;
    const { missionKey } = request.params as any;
    const body = (request.body || {}) as any;
    if (!body.product_id) return reply.code(400).send({ error: 'product_id required' });

    const template = await getMissionTemplateByKey(body.product_id, missionKey);
    if (!template) return reply.code(404).send({ error: 'mission not found' });

    try {
      const result = await abandonMissionAssignment(userId, template.id);
      return { ok: true, abandoned: result };
    } catch (e: any) {
      return reply.code(500).send({ ok: false, error: e.message });
    }
  });

  // GET /api/me/missions/:missionKey/settings
  app.get('/missions/:missionKey/settings', async (request, reply) => {
    const userId = (request as any).userId;
    const { missionKey } = request.params as any;
    const { product_id } = request.query as any;
    if (!product_id) return reply.code(400).send({ error: 'product_id query required' });

    const template = await getMissionTemplateByKey(product_id, missionKey);
    if (!template) return reply.code(404).send({ error: 'mission not found' });

    const settings = await getUserMissionSetting(userId, template.id);
    return { settings };
  });

  // PATCH /api/me/missions/:missionKey/settings
  app.patch('/missions/:missionKey/settings', async (request, reply) => {
    const userId = (request as any).userId;
    const { missionKey } = request.params as any;
    const body = (request.body || {}) as any;
    if (!body.product_id) return reply.code(400).send({ error: 'product_id required' });

    const template = await getMissionTemplateByKey(body.product_id, missionKey);
    if (!template) return reply.code(404).send({ error: 'mission not found' });

    try {
      const settings = await upsertUserMissionSetting(userId, template.id, {
        reminder_enabled: body.reminder_enabled,
        reminder_time: body.reminder_time,
        notes: body.notes,
      });
      return { settings };
    } catch (e: any) {
      return reply.code(500).send({ error: e.message });
    }
  });

  // GET /api/me/missions - 獲取所有訂閱的任務
  app.get('/missions', async (request, reply) => {
    const userId = (request as any).userId;
    const { product_id } = request.query as any;
    if (!product_id) return reply.code(400).send({ error: 'product_id query required' });

    try {
      const templates = await getMissionTemplatesForProduct(product_id);
      // 過濾出用戶已訂閱的任務
      const assignments = await db().missionAssignment.findMany({
        where: {
          user_id: userId,
          missionTemplateId: { in: templates.map(t => t.id) },
        },
        include: {
          missionTemplate: true,
        },
      });
      return { missions: assignments };
    } catch (e: any) {
      return reply.code(500).send({ error: e.message });
    }
  });

  // POST /api/me/habits/:missionKey/reminder
  app.post('/habits/:missionKey/reminder', async (request, reply) => {
    const userId = (request as any).userId;
    const { missionKey } = request.params as any;
    const body = (request.body || {}) as any;
    if (!body.product_id) return reply.code(400).send({ error: 'product_id required' });

    const template = await getMissionTemplateByKey(body.product_id, missionKey);
    if (!template) return reply.code(404).send({ error: 'mission not found' });

    try {
      const result = await sendHabitReminder(userId, template.id);
      return { ok: true, reminder_sent: result };
    } catch (e: any) {
      return reply.code(500).send({ ok: false, error: e.message });
    }
  });

  // DELETE /api/me/habits/:missionKey/logs/:logId
  app.delete('/habits/:missionKey/logs/:logId', async (request, reply) => {
    const userId = (request as any).userId;
    const { logId } = request.params as any;

    try {
      await deleteMissionDailyLog(logId, userId);
      return { ok: true, message: '日誌已刪除' };
    } catch (e: any) {
      if (e?.code === 'P2025') return reply.code(404).send({ error: '找不到此日誌' });
      return reply.code(500).send({ error: e.message });
    }
  });
}
