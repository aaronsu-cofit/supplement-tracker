import { PrismaClient } from '@prisma/client';

export class RichmenuService {
  constructor(private prisma: PrismaClient) {}

  async getLineClient() {
    const { Client } = await import('@line/bot-sdk');
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) return null;
    return new Client({ channelAccessToken: token });
  }

  async deployMainMenu(imageFile: File) {
    const client = await this.getLineClient();
    if (!client) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN 未設定');
    }

    const liffUrls = {
      wounds: process.env.LIFF_URL_WOUNDS || '',
      bones: process.env.LIFF_URL_BONES || '',
      supplements: process.env.LIFF_URL_SUPPLEMENTS || '',
      intimacy: process.env.LIFF_URL_INTIMACY || '',
    };

    const missing = Object.entries(liffUrls).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length > 0) {
      throw new Error(`缺少以下 LIFF URL 環境變數：${missing.map(k => `LIFF_URL_${k.toUpperCase()}`).join(', ')}`);
    }

    const richMenuBody = {
      size: { width: 2500, height: 1686 },
      selected: true,
      name: 'Vitera Main Menu',
      chatBarText: '開啟健康選單',
      areas: [
        { bounds: { x: 0, y: 0, width: 1250, height: 843 }, action: { type: 'uri' as const, uri: liffUrls.wounds } },
        { bounds: { x: 1250, y: 0, width: 1250, height: 843 }, action: { type: 'uri' as const, uri: liffUrls.bones } },
        { bounds: { x: 0, y: 843, width: 1250, height: 843 }, action: { type: 'uri' as const, uri: liffUrls.supplements } },
        { bounds: { x: 1250, y: 843, width: 1250, height: 843 }, action: { type: 'uri' as const, uri: liffUrls.intimacy } },
      ],
    };

    let oldMenuId = null;
    try {
      oldMenuId = await client.getDefaultRichMenuId();
    } catch {
      // No existing default menu
    }

    const richMenuId = await client.createRichMenu(richMenuBody);
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    await client.setRichMenuImage(richMenuId, imageBuffer, imageFile.type || 'image/jpeg');
    await client.setDefaultRichMenu(richMenuId);

    if (oldMenuId) {
      try {
        await client.deleteRichMenu(oldMenuId);
      } catch (e) {
        console.warn('舊選單刪除失敗（不影響部署結果）:', (e as Error).message);
      }
    }

    return { success: true, richMenuId };
  }

  async deployWoundsMenu(imageFile: File) {
    const client = await this.getLineClient();
    if (!client) {
      throw new Error('LINE_CHANNEL_ACCESS_TOKEN 未設定');
    }

    const liffUrls = {
      record: process.env.LIFF_URL_WOUNDS_RECORD || '',
      history: process.env.LIFF_URL_WOUNDS_HISTORY || '',
      reminder: process.env.LIFF_URL_WOUNDS_REMINDER || '',
      guide: process.env.LIFF_URL_WOUNDS_GUIDE || '',
    };

    const missing = Object.entries(liffUrls).filter(([, v]) => !v).map(([k]) => k);
    if (missing.length > 0) {
      throw new Error(`缺少以下 LIFF URL 環境變數：${missing.map(k => `LIFF_URL_WOUNDS_${k.toUpperCase()}`).join(', ')}`);
    }

    const richMenuBody = {
      size: { width: 2500, height: 1686 },
      selected: true,
      name: 'Wounds Care Menu',
      chatBarText: '開啟傷口照護選單',
      areas: [
        { bounds: { x: 0, y: 0, width: 1250, height: 843 }, action: { type: 'uri' as const, uri: liffUrls.record } },
        { bounds: { x: 1250, y: 0, width: 1250, height: 843 }, action: { type: 'uri' as const, uri: liffUrls.history } },
        { bounds: { x: 0, y: 843, width: 1250, height: 843 }, action: { type: 'uri' as const, uri: liffUrls.reminder } },
        { bounds: { x: 1250, y: 843, width: 1250, height: 843 }, action: { type: 'uri' as const, uri: liffUrls.guide } },
      ],
    };

    let oldMenuId = null;
    try {
      oldMenuId = await client.getDefaultRichMenuId();
    } catch {
      // No existing default menu
    }

    const richMenuId = await client.createRichMenu(richMenuBody);
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    await client.setRichMenuImage(richMenuId, imageBuffer, imageFile.type || 'image/jpeg');
    await client.setDefaultRichMenu(richMenuId);

    if (oldMenuId) {
      try {
        await client.deleteRichMenu(oldMenuId);
      } catch (e) {
        console.warn('舊選單刪除失敗（不影響部署結果）:', (e as Error).message);
      }
    }

    return { success: true, richMenuId };
  }
}
