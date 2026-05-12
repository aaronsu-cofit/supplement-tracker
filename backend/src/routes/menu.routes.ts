import { FastifyInstance } from 'fastify';
import { authPreHandler } from '../middleware/authMiddleware.js';
import { getLineOAById, getRecentMenuAssignments } from '../lib/db.js';
import { evaluateAndAssignMenu } from '../lib/menuEvaluator.js';

export async function menuRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authPreHandler);

  // POST /api/menu/evaluate
  // Body: { oa_id: number, user_line_id: string }
  app.post('/evaluate', async (request, reply) => {
    let body: { oa_id?: number; user_line_id?: string };
    try {
      body = (await request.body) as any;
    } catch {
      return reply.code(400).send({ error: 'Invalid JSON' });
    }

    const { oa_id, user_line_id } = body ?? {};
    if (!oa_id || !user_line_id) {
      return reply.code(400).send({ error: 'oa_id and user_line_id are required' });
    }

    const oa = await getLineOAById(oa_id.toString());
    if (!oa) return reply.code(404).send({ error: 'OA not found' });

    try {
      const result = await evaluateAndAssignMenu(oa_id, user_line_id, oa.channel_access_token);
      return result;
    } catch (err) {
      console.error('[menu/evaluate] error:', err);
      return reply.code(500).send({ error: 'Evaluation failed' });
    }
  });

  // GET /api/menu/assignments/:oa_id
  app.get('/assignments/:oa_id', async (request, reply) => {
    const { oa_id } = request.params as any;
    const oaId = parseInt(oa_id);
    if (isNaN(oaId)) return reply.code(400).send({ error: 'Invalid oa_id' });
    const assignments = await getRecentMenuAssignments(oaId);
    return assignments;
  });
}
