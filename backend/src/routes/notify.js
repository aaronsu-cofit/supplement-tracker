import { Hono } from 'hono';
import { softAuthMiddleware } from '../middleware/authMiddleware.js';

const notify = new Hono();
notify.use('*', softAuthMiddleware);

const getLineClient = async () => {
  const { Client } = await import('@line/bot-sdk');
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return null;
  return new Client({ channelAccessToken: token });
};

notify.post('/', async (c) => {
  try {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'User not authenticated' }, 401);

    const { type } = await c.req.json();
    const client = await getLineClient();
    if (!client) {
      console.warn('LINE_CHANNEL_ACCESS_TOKEN is not configured. Skipping push message.');
      return c.json({ success: true, warning: 'No token configured' });
    }

    if (type === 'daily_completed') {
      await client.pushMessage(userId, {
        type: 'text',
        text: '🎁 恭喜您！完成今天的保健品打卡！請繼續保持您的健康好習慣喔 💪',
      });
      return c.json({ success: true });
    }

    return c.json({ error: 'Invalid notification type' }, 400);
  } catch (error) {
    console.error('Push message error:', error);
    return c.json({ error: 'Failed to send push message' }, 500);
  }
});

export default notify;
