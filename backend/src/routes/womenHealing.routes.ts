import { FastifyInstance } from 'fastify';
import { authPreHandler } from '../middleware/authMiddleware.js';
import { WomenHealingController } from '../controllers/womenHealing.controller.js';
import { WomenHealingService } from '../services/womenHealing.service.js';
import { container } from '../lib/container.js';
import { asyncHandler } from '../controllers/base.controller.js';

/**
 * Women Healing Routes - API Endpoint Definitions
 *
 * Routes for women's health and wellness features including diary, assessment, and relief sessions.
 * Implements clean MVC architecture with controller handling HTTP logic.
 */
export async function womenHealingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authPreHandler);

  const womenHealingService = container.get<WomenHealingService>('womenHealingService');

  // ─── Diary Routes ───────────────────────────────────────────

  // GET /api/women/diary/today
  app.get('/diary/today', asyncHandler(async (request, reply) => {
    const controller = new WomenHealingController(request, reply, womenHealingService);
    return controller.getTodayDiary();
  }));

  // GET /api/women/diary?page=1&limit=20
  app.get('/diary', asyncHandler(async (request, reply) => {
    const controller = new WomenHealingController(request, reply, womenHealingService);
    return controller.getDiaryEntries();
  }));

  // POST /api/women/diary
  app.post('/diary', asyncHandler(async (request, reply) => {
    const controller = new WomenHealingController(request, reply, womenHealingService);
    return controller.createDiaryEntry(request.body);
  }));

  // ─── Assessment Routes ──────────────────────────────────────

  // POST /api/women/assessment/scan
  app.post('/assessment/scan', asyncHandler(async (request, reply) => {
    const controller = new WomenHealingController(request, reply, womenHealingService);
    return controller.scanFaceAssessment(request.body);
  }));

  // POST /api/women/assessment/analyze
  app.post('/assessment/analyze', asyncHandler(async (request, reply) => {
    const controller = new WomenHealingController(request, reply, womenHealingService);
    return controller.analyzeAssessment(request.body);
  }));

  // ─── Relief Routes ──────────────────────────────────────────

  // POST /api/women/relief
  app.post('/relief', asyncHandler(async (request, reply) => {
    const controller = new WomenHealingController(request, reply, womenHealingService);
    return controller.createReliefSession(request.body);
  }));
}
