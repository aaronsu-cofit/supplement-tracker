import { FastifyInstance } from 'fastify';
import { authPreHandler } from '../middleware/authMiddleware.js';
import { MeController } from '../controllers/me.controller.js';
import { MeService } from '../services/me.service.js';
import { container } from '../lib/container.js';
import { asyncHandler } from '../controllers/base.controller.js';

/**
 * Me Routes - API Endpoint Definitions
 *
 * Routes for user personal data management, habit tracking, and mission subscription.
 * Implements clean MVC architecture with controller handling HTTP logic.
 */
export async function meRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authPreHandler);

  const meService = container.get<MeService>('meService');

  // ─── Habit Routes ───────────────────────────────────────────

  // GET /api/me/habits?product_id=xxx
  app.get('/habits', asyncHandler(async (request, reply) => {
    const { product_id } = request.query as any;
    const controller = new MeController(request, reply, meService);
    return controller.getHabits(product_id);
  }));

  // POST /api/me/habits/:missionKey/log
  app.post('/habits/:missionKey/log', asyncHandler(async (request, reply) => {
    const { missionKey } = request.params as any;
    const controller = new MeController(request, reply, meService);
    return controller.logHabit(missionKey, request.body);
  }));

  // GET /api/me/habits/:missionKey/history
  app.get('/habits/:missionKey/history', asyncHandler(async (request, reply) => {
    const { missionKey } = request.params as any;
    const { product_id, days } = request.query as any;
    const controller = new MeController(request, reply, meService);
    return controller.getHabitHistory(missionKey, product_id, days);
  }));

  // POST /api/me/habits/:missionKey/reminder
  app.post('/habits/:missionKey/reminder', asyncHandler(async (request, reply) => {
    const { missionKey } = request.params as any;
    const controller = new MeController(request, reply, meService);
    return controller.sendHabitReminder(missionKey, request.body);
  }));

  // DELETE /api/me/habits/:missionKey/logs/:logId
  app.delete('/habits/:missionKey/logs/:logId', asyncHandler(async (request, reply) => {
    const { logId } = request.params as any;
    const controller = new MeController(request, reply, meService);
    return controller.deleteHabitLog(logId);
  }));

  // ─── Mission Routes ─────────────────────────────────────────

  // GET /api/me/missions?product_id=xxx
  app.get('/missions', asyncHandler(async (request, reply) => {
    const { product_id } = request.query as any;
    const controller = new MeController(request, reply, meService);
    return controller.getSubscribedMissions(product_id);
  }));

  // POST /api/me/missions/:missionKey/subscribe
  app.post('/missions/:missionKey/subscribe', asyncHandler(async (request, reply) => {
    const { missionKey } = request.params as any;
    const controller = new MeController(request, reply, meService);
    return controller.subscribeMission(missionKey, request.body);
  }));

  // POST /api/me/missions/:missionKey/abandon
  app.post('/missions/:missionKey/abandon', asyncHandler(async (request, reply) => {
    const { missionKey } = request.params as any;
    const controller = new MeController(request, reply, meService);
    return controller.abandonMission(missionKey, request.body);
  }));

  // GET /api/me/missions/:missionKey/settings
  app.get('/missions/:missionKey/settings', asyncHandler(async (request, reply) => {
    const { missionKey } = request.params as any;
    const { product_id } = request.query as any;
    const controller = new MeController(request, reply, meService);
    return controller.getMissionSettings(missionKey, product_id);
  }));

  // PATCH /api/me/missions/:missionKey/settings
  app.patch('/missions/:missionKey/settings', asyncHandler(async (request, reply) => {
    const { missionKey } = request.params as any;
    const controller = new MeController(request, reply, meService);
    return controller.updateMissionSettings(missionKey, request.body);
  }));
}
