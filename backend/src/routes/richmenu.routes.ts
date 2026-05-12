import { FastifyInstance } from 'fastify';
import { RichmenuController } from '../controllers/richmenu.controller.js';
import { asyncHandler } from '../controllers/base.controller.js';
import { container } from '../lib/container.js';
import { authPreHandler } from '../middleware/authMiddleware.js';
import type { RichmenuService } from '../services/richmenu.service.js';
import { deployMainMenuSchema, deployWoundsMenuSchema } from '../schemas/richmenu.schema.js';

export async function richmenuRoutes(app: FastifyInstance) {
  const richmenuService = container.get<RichmenuService>('richmenuService');
  app.addHook('preHandler', authPreHandler);

  app.post('/deploy', { schema: deployMainMenuSchema }, asyncHandler(async (request, reply) => {
    const controller = new RichmenuController(request, reply, richmenuService);
    return controller.deployMainMenu();
  }));

  app.post('/deploy/wounds', { schema: deployWoundsMenuSchema }, asyncHandler(async (request, reply) => {
    const controller = new RichmenuController(request, reply, richmenuService);
    return controller.deployWoundsMenu();
  }));
}
