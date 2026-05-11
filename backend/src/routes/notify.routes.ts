import { FastifyInstance } from 'fastify';
import { NotifyController } from '../controllers/notify.controller.js';
import { asyncHandler } from '../controllers/base.controller.js';
import { container } from '../lib/container.js';
import { softAuthPreHandler } from '../middleware/authMiddleware.js';
import type { NotifyService } from '../services/notify.service.js';
import { sendNotificationSchema } from '../schemas/notify.schema.js';

export async function notifyRoutes(app: FastifyInstance) {
  const notifyService = container.get<NotifyService>('notifyService');
  app.addHook('preHandler', softAuthPreHandler);

  app.post('/', { schema: sendNotificationSchema }, asyncHandler(async (request, reply) => {
    const controller = new NotifyController(request, reply, notifyService);
    return controller.sendNotification();
  }));
}
