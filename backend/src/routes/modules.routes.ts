import { FastifyInstance } from 'fastify';
import { ModulesController } from '../controllers/modules.controller.js';
import { asyncHandler } from '../controllers/base.controller.js';
import { container } from '../lib/container.js';
import type { ModulesService } from '../services/modules.service.js';
import { getModulesSchema } from '../schemas/modules.schema.js';

export async function modulesRoutes(app: FastifyInstance) {
  const modulesService = container.get<ModulesService>('modulesService');

  app.get('/', { schema: getModulesSchema }, asyncHandler(async (request, reply) => {
    const controller = new ModulesController(request, reply, modulesService);
    return controller.getModules();
  }));
}
