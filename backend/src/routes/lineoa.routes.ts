import { FastifyInstance } from 'fastify';
import { authPreHandler } from '../middleware/authMiddleware.js';
import { LineoaController } from '../controllers/lineoa.controller.js';
import { LineoaService } from '../services/lineoa.service.js';
import { container } from '../lib/container.js';
import { asyncHandler } from '../controllers/base.controller.js';

/**
 * Lineoa Routes - LINE Official Account API Endpoint Definitions
 *
 * Routes for LINE OA management, template configuration, message logging, and AI platform integration.
 * Implements clean MVC architecture with controller handling HTTP logic.
 */
export async function lineoaRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authPreHandler);

  const lineoaService = container.get<LineoaService>('lineoaService');

  // ─── LINE OA Management Routes ─────────────────────────────────────

  // GET /api/line/oa
  app.get('/', asyncHandler(async (request, reply) => {
    const controller = new LineoaController(request, reply, lineoaService);
    return controller.getAllLineOAs();
  }));

  // POST /api/line/oa
  app.post('/', asyncHandler(async (request, reply) => {
    const controller = new LineoaController(request, reply, lineoaService);
    return controller.createLineOA(request.body);
  }));

  // PATCH /api/line/oa/:id
  app.patch('/:id', asyncHandler(async (request, reply) => {
    const { id } = request.params as any;
    const controller = new LineoaController(request, reply, lineoaService);
    return controller.updateLineOA(id, request.body);
  }));

  // POST /api/line/oa/:id/refresh-bot-info
  app.post('/:id/refresh-bot-info', asyncHandler(async (request, reply) => {
    const { id } = request.params as any;
    const controller = new LineoaController(request, reply, lineoaService);
    return controller.refreshBotInfo(id);
  }));

  // DELETE /api/line/oa/:id
  app.delete('/:id', asyncHandler(async (request, reply) => {
    const { id } = request.params as any;
    const controller = new LineoaController(request, reply, lineoaService);
    return controller.deleteLineOA(id);
  }));

  // ─── Template Management Routes ────────────────────────────────────

  // GET /api/line/oa/:id/templates
  app.get('/:id/templates', asyncHandler(async (request, reply) => {
    const { id } = request.params as any;
    const controller = new LineoaController(request, reply, lineoaService);
    return controller.getTemplatesForOA(id);
  }));

  // POST /api/line/oa/:id/templates
  app.post('/:id/templates', asyncHandler(async (request, reply) => {
    const { id } = request.params as any;
    const controller = new LineoaController(request, reply, lineoaService);
    return controller.createTemplate(id, request.body);
  }));

  // PATCH /api/line/oa/:id/templates/:templateId
  app.patch('/:id/templates/:templateId', asyncHandler(async (request, reply) => {
    const { id, templateId } = request.params as any;
    const controller = new LineoaController(request, reply, lineoaService);
    return controller.updateTemplate(id, templateId, request.body);
  }));

  // DELETE /api/line/oa/:id/templates/:templateId
  app.delete('/:id/templates/:templateId', asyncHandler(async (request, reply) => {
    const { id, templateId } = request.params as any;
    const controller = new LineoaController(request, reply, lineoaService);
    return controller.deleteTemplate(id, templateId);
  }));

  // POST /api/line/oa/:id/templates/:templateId/deploy
  app.post('/:id/templates/:templateId/deploy', asyncHandler(async (request, reply) => {
    const { id, templateId } = request.params as any;
    const controller = new LineoaController(request, reply, lineoaService);
    return controller.deployTemplate(id, templateId);
  }));

  // POST /api/line/oa/:id/templates/:templateId/deactivate
  app.post('/:id/templates/:templateId/deactivate', asyncHandler(async (request, reply) => {
    const { id, templateId } = request.params as any;
    const controller = new LineoaController(request, reply, lineoaService);
    return controller.deactivateTemplates(id, templateId);
  }));

  // ─── Message & Logging Routes ─────────────────────────────────────

  // GET /api/line/oa/:id/messages
  app.get('/:id/messages', asyncHandler(async (request, reply) => {
    const { id } = request.params as any;
    const controller = new LineoaController(request, reply, lineoaService);
    return controller.getMessages(id, request.query as any);
  }));

  // GET /api/line/oa/:id/messages/users
  app.get('/:id/messages/users', asyncHandler(async (request, reply) => {
    const { id } = request.params as any;
    const controller = new LineoaController(request, reply, lineoaService);
    return controller.getMessageUsers(id);
  }));

  // ─── AI & Integration Routes ──────────────────────────────────────

  // POST /api/line/oa/:id/test-ai-platform
  app.post('/:id/test-ai-platform', asyncHandler(async (request, reply) => {
    const { id } = request.params as any;
    const controller = new LineoaController(request, reply, lineoaService);
    return controller.testAIPlatform(id);
  }));

  // POST /api/line/oa/:id/manual-push
  app.post('/:id/manual-push', asyncHandler(async (request, reply) => {
    const { id } = request.params as any;
    const controller = new LineoaController(request, reply, lineoaService);
    return controller.manualPush(id, request.body);
  }));
}
