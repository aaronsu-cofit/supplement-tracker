import { FastifyRequest, FastifyReply } from 'fastify';
import { BaseController } from './base.controller.js';
import { NotifyService } from '../services/notify.service.js';

export class NotifyController extends BaseController {
  constructor(
    request: FastifyRequest,
    reply: FastifyReply,
    private notifyService: NotifyService,
  ) {
    super(request, reply);
  }

  async sendNotification() {
    try {
      const userId = this.getUserId();
      if (!userId) {
        this.reply.code(401);
        return { error: 'User not authenticated' };
      }

      let body: { type: string };
      try {
        body = (await this.request.body) as { type: string };
      } catch {
        this.reply.code(400);
        return { error: 'invalid JSON' };
      }

      this.logDebug('Sending notification', { userId, type: body.type });
      const result = await this.notifyService.sendNotification(userId, body.type);
      return result;
    } catch (error) {
      console.error('Push message error:', error);
      this.logError('[Notify /sendNotification]', error);

      if ((error as Error).message === 'Invalid notification type') {
        this.reply.code(400);
        return { error: 'Invalid notification type' };
      }

      this.reply.code(500);
      return { error: 'Failed to send push message' };
    }
  }
}
