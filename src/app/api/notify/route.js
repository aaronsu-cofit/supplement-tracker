import { NextResponse } from 'next/server';
import { getUserId } from '@/app/lib/userId';

// Initialize LINE client lazily so it doesn't crash if the token is missing at build time
const getLineClient = async () => {
    const { Client } = await import('@line/bot-sdk');
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) return null;
    return new Client({ channelAccessToken: token });
};

export async function POST(request) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
        }

        const { type } = await request.json();

        const client = await getLineClient();
        if (!client) {
            console.warn('LINE_CHANNEL_ACCESS_TOKEN is not configured. Skipping push message.');
            return NextResponse.json({ success: true, warning: 'No token configured' });
        }

        if (type === 'daily_completed') {
            await client.pushMessage(userId, {
                type: 'text',
                text: '🎁 恭喜您！完成今天的保健品打卡！請繼續保持您的健康好習慣喔 💪'
            });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    } catch (error) {
        console.error('Push message error:', error);
        return NextResponse.json({ error: 'Failed to send push message' }, { status: 500 });
    }
}
