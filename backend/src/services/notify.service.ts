import { PrismaClient } from '@prisma/client';
import { BadRequestError } from '../middleware/errorHandler.js';

export class NotifyService {
  constructor(private prisma: PrismaClient) {}

  async getLineClient() {
    const { Client } = await import('@line/bot-sdk');
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) return null;
    return new Client({ channelAccessToken: token });
  }

  async sendNotification(userId: string, type: string) {
    const client = await this.getLineClient();
    if (!client) {
      console.warn('LINE_CHANNEL_ACCESS_TOKEN is not configured. Skipping push message.');
      return { success: true, warning: 'No token configured' };
    }

    if (type === 'daily_completed') {
      await client.pushMessage(userId, {
        type: 'text',
        text: '🎁 恭喜您！完成今天的保健品打卡！請繼續保持您的健康好習慣喔 💪',
      });
      return { success: true };
    }

    throw new BadRequestError('Invalid notification type');
  }
}
