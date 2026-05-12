import { FastifyInstance } from 'fastify';
import { authPreHandler } from '../middleware/authMiddleware.js';
import { ProductsController } from '../controllers/products.controller.js';
import { ProductsService } from '../services/products.service.js';
import { container } from '../lib/container.js';
import { asyncHandler } from '../controllers/base.controller.js';

/**
 * Products Routes - API Endpoint Definitions
 *
 * Routes for managing products, content items, missions, badges, journeys, and intent rules.
 * Implements clean MVC architecture with controller handling business logic.
 */
export async function productsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authPreHandler);

  const productsService = container.get<ProductsService>('productsService');

  // ─── Core Product CRUD ───────────────────────────────────────

  // GET /api/products
  app.get('/', asyncHandler(async (request, reply) => {
    const controller = new ProductsController(request, reply, productsService);
    return controller.getAllProducts();
  }));

  // GET /api/products/seed-templates
  app.get('/seed-templates', asyncHandler(async (request, reply) => {
    const controller = new ProductsController(request, reply, productsService);
    return controller.getSeedTemplates();
  }));

  // GET /api/products/:id
  app.get('/:id', asyncHandler(async (request, reply) => {
    const { id } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.getProductById(id);
  }));

  // POST /api/products
  app.post('/', asyncHandler(async (request, reply) => {
    const controller = new ProductsController(request, reply, productsService);
    return controller.createProduct(request.body);
  }));

  // PATCH /api/products/:id
  app.patch('/:id', asyncHandler(async (request, reply) => {
    const { id } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.updateProduct(id, request.body);
  }));

  // DELETE /api/products/:id
  app.delete('/:id', asyncHandler(async (request, reply) => {
    const { id } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.deleteProduct(id);
  }));

  // ─── Seed ───────────────────────────────────────────────────

  // POST /api/products/:productId/seed
  app.post('/:productId/seed', asyncHandler(async (request, reply) => {
    const { productId } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.seedProduct(productId, request.body);
  }));

  // ─── Content Items ──────────────────────────────────────────

  // GET /api/products/:productId/content
  app.get('/:productId/content', asyncHandler(async (request, reply) => {
    const { productId } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.getContentItems(productId);
  }));

  // POST /api/products/:productId/content
  app.post('/:productId/content', asyncHandler(async (request, reply) => {
    const { productId } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.createContentItem(productId, request.body);
  }));

  // PATCH /api/products/:productId/content/:contentId
  app.patch('/:productId/content/:contentId', asyncHandler(async (request, reply) => {
    const { productId, contentId } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.updateContentItem(productId, contentId, request.body);
  }));

  // DELETE /api/products/:productId/content/:contentId
  app.delete('/:productId/content/:contentId', asyncHandler(async (request, reply) => {
    const { productId, contentId } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.deleteContentItem(productId, contentId);
  }));

  // ─── Mission Templates ──────────────────────────────────────

  // GET /api/products/:productId/missions
  app.get('/:productId/missions', asyncHandler(async (request, reply) => {
    const { productId } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.getMissions(productId);
  }));

  // POST /api/products/:productId/missions
  app.post('/:productId/missions', asyncHandler(async (request, reply) => {
    const { productId } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.createMission(productId, request.body);
  }));

  // PATCH /api/products/:productId/missions/:missionId
  app.patch('/:productId/missions/:missionId', asyncHandler(async (request, reply) => {
    const { productId, missionId } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.updateMission(productId, missionId, request.body);
  }));

  // DELETE /api/products/:productId/missions/:missionId
  app.delete('/:productId/missions/:missionId', asyncHandler(async (request, reply) => {
    const { productId, missionId } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.deleteMission(productId, missionId);
  }));

  // ─── Badge Templates ────────────────────────────────────────

  // GET /api/products/:productId/badges
  app.get('/:productId/badges', asyncHandler(async (request, reply) => {
    const { productId } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.getBadges(productId);
  }));

  // POST /api/products/:productId/badges
  app.post('/:productId/badges', asyncHandler(async (request, reply) => {
    const { productId } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.createBadge(productId, request.body);
  }));

  // PATCH /api/products/:productId/badges/:badgeId
  app.patch('/:productId/badges/:badgeId', asyncHandler(async (request, reply) => {
    const { productId, badgeId } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.updateBadge(productId, badgeId, request.body);
  }));

  // DELETE /api/products/:productId/badges/:badgeId
  app.delete('/:productId/badges/:badgeId', asyncHandler(async (request, reply) => {
    const { productId, badgeId } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.deleteBadge(productId, badgeId);
  }));

  // ─── Journey Templates ──────────────────────────────────────

  // GET /api/products/:productId/journeys
  app.get('/:productId/journeys', asyncHandler(async (request, reply) => {
    const { productId } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.getJourneys(productId);
  }));

  // POST /api/products/:productId/journeys
  app.post('/:productId/journeys', asyncHandler(async (request, reply) => {
    const { productId } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.createJourney(productId, request.body);
  }));

  // PATCH /api/products/:productId/journeys/:journeyId
  app.patch('/:productId/journeys/:journeyId', asyncHandler(async (request, reply) => {
    const { productId, journeyId } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.updateJourney(productId, journeyId, request.body);
  }));

  // DELETE /api/products/:productId/journeys/:journeyId
  app.delete('/:productId/journeys/:journeyId', asyncHandler(async (request, reply) => {
    const { productId, journeyId } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.deleteJourney(productId, journeyId);
  }));

  // ─── Intent Rules ───────────────────────────────────────────

  // GET /api/products/:productId/intent-rules
  app.get('/:productId/intent-rules', asyncHandler(async (request, reply) => {
    const { productId } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.getIntentRules(productId);
  }));

  // POST /api/products/:productId/intent-rules
  app.post('/:productId/intent-rules', asyncHandler(async (request, reply) => {
    const { productId } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.createIntentRule(productId, request.body);
  }));

  // PATCH /api/products/:productId/intent-rules/:ruleId
  app.patch('/:productId/intent-rules/:ruleId', asyncHandler(async (request, reply) => {
    const { productId, ruleId } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.updateIntentRule(productId, ruleId, request.body);
  }));

  // DELETE /api/products/:productId/intent-rules/:ruleId
  app.delete('/:productId/intent-rules/:ruleId', asyncHandler(async (request, reply) => {
    const { productId, ruleId } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.deleteIntentRule(productId, ruleId);
  }));

  // ─── Intent (Backward Compatibility - Hono API aliases) ─────

  // GET /api/products/:productId/intent (alias for intent-rules)
  app.get('/:productId/intent', asyncHandler(async (request, reply) => {
    const { productId } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.getIntentRules(productId);
  }));

  // POST /api/products/:productId/intent (alias for intent-rules)
  app.post('/:productId/intent', asyncHandler(async (request, reply) => {
    const { productId } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.createIntentRule(productId, request.body);
  }));

  // PATCH /api/products/:productId/intent/:id (alias for intent-rules)
  app.patch('/:productId/intent/:id', asyncHandler(async (request, reply) => {
    const { productId, id } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.updateIntentRule(productId, id, request.body);
  }));

  // DELETE /api/products/:productId/intent/:id (alias for intent-rules)
  app.delete('/:productId/intent/:id', asyncHandler(async (request, reply) => {
    const { id } = request.params as any;
    const controller = new ProductsController(request, reply, productsService);
    return controller.deleteIntentRule('', id);
  }));
}
