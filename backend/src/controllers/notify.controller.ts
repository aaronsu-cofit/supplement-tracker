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
    const userId = this.getUserId();
    const body = (await this.request.body) as { type: string };

    try {
      const result = await this.notifyService.sendNotification(userId, body.type);
      return this.sendSuccess(result);
    } catch (error) {
      if ((error as Error).message === 'Invalid notification type') {
        this.reply.code(400);
        return { error: 'Invalid notification type' };
      }
      throw error;
    }
  }
}
