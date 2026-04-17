import { Hono } from 'hono';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getLineOAById, getRecentMenuAssignments } from '../lib/db.js';
import { evaluateAndAssignMenu } from '../lib/menuEvaluator.js';

const menu = new Hono();
menu.use('*', authMiddleware);

// POST /api/menu/evaluate
// Body: { oa_id: number, user_line_id: string }
menu.post('/evaluate', async (c) => {
  let body: { oa_id: number; user_line_id: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const { oa_id, user_line_id } = body ?? {};
  if (!oa_id || !user_line_id) {
    return c.json({ error: 'oa_id and user_line_id are required' }, 400);
  }

  const oa = await getLineOAById(oa_id.toString());
  if (!oa) return c.json({ error: 'OA not found' }, 404);

  try {
    const result = await evaluateAndAssignMenu(oa_id, user_line_id, oa.channel_access_token);
    return c.json(result);
  } catch (err) {
    console.error('[menu/evaluate] error:', err);
    return c.json({ error: 'Evaluation failed' }, 500);
  }
});

// GET /api/menu/assignments/:oa_id
menu.get('/assignments/:oa_id', async (c) => {
  const oaId = parseInt(c.req.param('oa_id'));
  if (isNaN(oaId)) return c.json({ error: 'Invalid oa_id' }, 400);
  const assignments = await getRecentMenuAssignments(oaId);
  return c.json(assignments);
});

export default menu;
