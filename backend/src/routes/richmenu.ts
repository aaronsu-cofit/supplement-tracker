import { Hono } from 'hono';
import { authMiddleware } from '../middleware/authMiddleware.js';

const richmenu = new Hono();
richmenu.use('*', authMiddleware);

const getLineClient = async () => {
  const { Client } = await import('@line/bot-sdk');
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) return null;
  return new Client({ channelAccessToken: token });
};

// POST /api/line/richmenu/deploy
// Body: multipart/form-data with `image` field (2500x1686 JPG/PNG)
richmenu.post('/deploy', async (c) => {
  const client = await getLineClient();
  if (!client) {
    return c.json({ success: false, error: 'LINE_CHANNEL_ACCESS_TOKEN 未設定' }, 500);
  }

  let formData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ success: false, error: '無法解析表單資料，請確認圖片已正確上傳' }, 400);
  }

  const imageFile = formData.get('image');
  if (!imageFile || typeof imageFile === 'string') {
    return c.json({ success: false, error: '未提供圖片檔案' }, 400);
  }

  const liffUrls = {
    wounds:      process.env.LIFF_URL_WOUNDS      || '',
    bones:       process.env.LIFF_URL_BONES       || '',
    supplements: process.env.LIFF_URL_SUPPLEMENTS || '',
    intimacy:    process.env.LIFF_URL_INTIMACY    || '',
  };

  const missing = Object.entries(liffUrls).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length > 0) {
    return c.json({
      success: false,
      error: `缺少以下 LIFF URL 環境變數：${missing.map(k => `LIFF_URL_${k.toUpperCase()}`).join(', ')}`,
    }, 500);
  }

  // 4-zone grid: 2500x1686
  // A (top-left): wounds   | B (top-right): bones
  // C (bottom-left): suppl | D (bottom-right): intimacy
  const richMenuBody = {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: 'Vitera Main Menu',
    chatBarText: '開啟健康選單',
    areas: [
      { bounds: { x: 0,    y: 0,   width: 1250, height: 843 }, action: { type: 'uri' as const, uri: liffUrls.wounds      } },
      { bounds: { x: 1250, y: 0,   width: 1250, height: 843 }, action: { type: 'uri' as const, uri: liffUrls.bones       } },
      { bounds: { x: 0,    y: 843, width: 1250, height: 843 }, action: { type: 'uri' as const, uri: liffUrls.supplements } },
      { bounds: { x: 1250, y: 843, width: 1250, height: 843 }, action: { type: 'uri' as const, uri: liffUrls.intimacy    } },
    ],
  };

  try {
    // Get and delete the existing default menu to avoid accumulation
    let oldMenuId = null;
    try {
      oldMenuId = await client.getDefaultRichMenuId();
    } catch {
      // No existing default menu — that's fine
    }

    const richMenuId = await client.createRichMenu(richMenuBody);

    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    await client.setRichMenuImage(richMenuId, imageBuffer, imageFile.type || 'image/jpeg');

    await client.setDefaultRichMenu(richMenuId);

    if (oldMenuId) {
      try {
        await client.deleteRichMenu(oldMenuId);
      } catch (e) {
        console.warn('舊選單刪除失敗（不影響部署結果）:', e.message);
      }
    }

    return c.json({ success: true, richMenuId });
  } catch (error) {
    console.error('Rich menu deploy error:', error);
    return c.json({
      success: false,
      error: '部署失敗',
      details: error?.message || String(error),
    }, 500);
  }
});

// POST /api/line/richmenu/deploy/wounds
// Deploys a wound-care specific 4-button rich menu
// Body: multipart/form-data with `image` field (2500x1686 JPG/PNG)
richmenu.post('/deploy/wounds', async (c) => {
  const client = await getLineClient();
  if (!client) {
    return c.json({ success: false, error: 'LINE_CHANNEL_ACCESS_TOKEN 未設定' }, 500);
  }

  let formData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ success: false, error: '無法解析表單資料，請確認圖片已正確上傳' }, 400);
  }

  const imageFile = formData.get('image');
  if (!imageFile || typeof imageFile === 'string') {
    return c.json({ success: false, error: '未提供圖片檔案' }, 400);
  }

  const liffUrls = {
    record:   process.env.LIFF_URL_WOUNDS_RECORD   || '',
    history:  process.env.LIFF_URL_WOUNDS_HISTORY  || '',
    reminder: process.env.LIFF_URL_WOUNDS_REMINDER || '',
    guide:    process.env.LIFF_URL_WOUNDS_GUIDE    || '',
  };

  const missing = Object.entries(liffUrls).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length > 0) {
    return c.json({
      success: false,
      error: `缺少以下 LIFF URL 環境變數：${missing.map(k => `LIFF_URL_WOUNDS_${k.toUpperCase()}`).join(', ')}`,
    }, 500);
  }

  // 4-zone grid: 2500x1686
  // A (top-left): 記錄傷口  | B (top-right): 癒合歷程
  // C (bottom-left): 換藥提醒 | D (bottom-right): 照護知識
  const richMenuBody = {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: 'Wounds Care Menu',
    chatBarText: '開啟傷口照護選單',
    areas: [
      { bounds: { x: 0,    y: 0,   width: 1250, height: 843 }, action: { type: 'uri' as const, uri: liffUrls.record   } },
      { bounds: { x: 1250, y: 0,   width: 1250, height: 843 }, action: { type: 'uri' as const, uri: liffUrls.history  } },
      { bounds: { x: 0,    y: 843, width: 1250, height: 843 }, action: { type: 'uri' as const, uri: liffUrls.reminder } },
      { bounds: { x: 1250, y: 843, width: 1250, height: 843 }, action: { type: 'uri' as const, uri: liffUrls.guide    } },
    ],
  };

  try {
    let oldMenuId = null;
    try {
      oldMenuId = await client.getDefaultRichMenuId();
    } catch {
      // No existing default menu — that's fine
    }

    const richMenuId = await client.createRichMenu(richMenuBody);

    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    await client.setRichMenuImage(richMenuId, imageBuffer, imageFile.type || 'image/jpeg');

    await client.setDefaultRichMenu(richMenuId);

    if (oldMenuId) {
      try {
        await client.deleteRichMenu(oldMenuId);
      } catch (e) {
        console.warn('舊選單刪除失敗（不影響部署結果）:', e.message);
      }
    }

    return c.json({ success: true, richMenuId });
  } catch (error) {
    console.error('Rich menu deploy error:', error);
    return c.json({
      success: false,
      error: '部署失敗',
      details: error?.message || String(error),
    }, 500);
  }
});

export default richmenu;
