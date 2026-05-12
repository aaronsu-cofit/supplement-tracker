import { FastifyInstance } from 'fastify';
import { CheckinsController } from '../controllers/checkins.controller.js';
import { asyncHandler } from '../controllers/base.controller.js';
import { container } from '../lib/container.js';
import { softAuthPreHandler } from '../middleware/authMiddleware.js';
import type { CheckinsService } from '../services/checkins.service.js';
import { getCheckInsSchema, createCheckInSchema, removeCheckInSchema } from '../schemas/checkins.schema.js';

export async function checkinsRoutes(app: FastifyInstance) {
  const checkinsService = container.get<CheckinsService>('checkinsService');
  app.addHook('preHandler', softAuthPreHandler);

  app.get('/', { schema: getCheckInsSchema }, asyncHandler(async (request, reply) => {
    const controller = new CheckinsController(request, reply, checkinsService);
    return controller.getCheckIns();
  }));

  app.post('/', { schema: createCheckInSchema }, asyncHandler(async (request, reply) => {
    const controller = new CheckinsController(request, reply, checkinsService);
    return controller.createCheckIn();
  }));

  app.delete('/', { schema: removeCheckInSchema }, asyncHandler(async (request, reply) => {
    const controller = new CheckinsController(request, reply, checkinsService);
    return controller.removeCheckIn();
  }));
}
