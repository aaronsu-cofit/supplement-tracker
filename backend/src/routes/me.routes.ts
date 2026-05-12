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
    const controller = new MeController(request, reply, meService);
    return controller.getHabits();
  }));

  // POST /api/me/habits/:missionKey/log
  app.post('/habits/:missionKey/log', asyncHandler(async (request, reply) => {
    const controller = new MeController(request, reply, meService);
    return controller.logHabit();
  }));

  // GET /api/me/habits/:missionKey/history
  app.get('/habits/:missionKey/history', asyncHandler(async (request, reply) => {
    const controller = new MeController(request, reply, meService);
    return controller.getHabitHistory();
  }));

  // POST /api/me/habits/:missionKey/reminder
  app.post('/habits/:missionKey/reminder', asyncHandler(async (request, reply) => {
    const controller = new MeController(request, reply, meService);
    return controller.testHabitReminder();
  }));

  // DELETE /api/me/habits/:missionKey/logs/:logId
  app.delete('/habits/:missionKey/logs/:logId', asyncHandler(async (request, reply) => {
    const controller = new MeController(request, reply, meService);
    return controller.deleteHabitLog();
  }));

  // ─── Mission Routes ─────────────────────────────────────────

  // GET /api/me/missions?product_id=xxx
  app.get('/missions', asyncHandler(async (request, reply) => {
    const controller = new MeController(request, reply, meService);
    return controller.getAvailableMissions();
  }));

  // POST /api/me/missions/:missionKey/subscribe
  app.post('/missions/:missionKey/subscribe', asyncHandler(async (request, reply) => {
    const controller = new MeController(request, reply, meService);
    return controller.subscribeMission();
  }));

  // POST /api/me/missions/:missionKey/abandon
  app.post('/missions/:missionKey/abandon', asyncHandler(async (request, reply) => {
    const controller = new MeController(request, reply, meService);
    return controller.unsubscribeMission();
  }));

  // GET /api/me/missions/:missionKey/settings
  app.get('/missions/:missionKey/settings', asyncHandler(async (request, reply) => {
    const controller = new MeController(request, reply, meService);
    return controller.getMissionSetting();
  }));

  // PATCH /api/me/missions/:missionKey/settings
  app.patch('/missions/:missionKey/settings', asyncHandler(async (request, reply) => {
    const controller = new MeController(request, reply, meService);
    return controller.updateMissionSetting();
  }));
}
