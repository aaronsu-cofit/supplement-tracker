import { Hono } from 'hono';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getAllLineOAs, getLineOAById, createLineOA, updateLineOA, deleteLineOA } from '../lib/db.js';

const lineoa = new Hono();
lineoa.use('*', authMiddleware);

// GET /api/line/oa
lineoa.get('/', async (c) => {
  const oas = await getAllLineOAs();
  return c.json({ oas });
});

// POST /api/line/oa
lineoa.post('/', async (c) => {
  const body = await c.req.json();
  const { name, description, channel_access_token } = body;
  if (!name || !channel_access_token) {
    return c.json({ error: '請提供 name 與 channel_access_token' }, 400);
  }
  const oa = await createLineOA({ name, description, channel_access_token });
  return c.json({ oa }, 201);
});

// PATCH /api/line/oa/:id
lineoa.patch('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  try {
    const oa = await updateLineOA(id, body);
    return c.json({ oa });
  } catch (e) {
    if (e?.code === 'P2025') return c.json({ error: '找不到此 LINE OA' }, 404);
    throw e;
  }
});

// DELETE /api/line/oa/:id
lineoa.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  try {
    await deleteLineOA(id);
    return c.json({ success: true });
  } catch (e) {
    if (e?.code === 'P2025') return c.json({ error: '找不到此 LINE OA' }, 404);
    throw e;
  }
});

// POST /api/line/oa/:id/richmenu
// Body: multipart/form-data
//   image  — JPG/PNG 2500x1686
//   zones  — JSON array of 4 objects: [{ label, uri }, ...]
lineoa.post('/:id/richmenu', async (c) => {
  const id = Number(c.req.param('id'));
  const oa = await getLineOAById(id);
  if (!oa) return c.json({ error: '找不到此 LINE OA 設定' }, 404);
  if (!oa.is_active) return c.json({ error: '此 LINE OA 已停用' }, 400);

  let formData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ error: '無法解析表單資料' }, 400);
  }

  const imageFile = formData.get('image');
  if (!imageFile || typeof imageFile === 'string') {
    return c.json({ error: '未提供圖片檔案' }, 400);
  }

  let zones;
  try {
    zones = JSON.parse(formData.get('zones') || '[]');
  } catch {
    return c.json({ error: 'zones 格式錯誤，需為 JSON 陣列' }, 400);
  }

  if (!Array.isArray(zones) || zones.length !== 4) {
    return c.json({ error: 'zones 必須包含 4 個區塊設定' }, 400);
  }
  for (const z of zones) {
    if (!z.uri) return c.json({ error: '每個區塊都必須填入 LIFF URI' }, 400);
  }

  const BOUNDS = [
    { x: 0,    y: 0,   width: 1250, height: 843 },
    { x: 1250, y: 0,   width: 1250, height: 843 },
    { x: 0,    y: 843, width: 1250, height: 843 },
    { x: 1250, y: 843, width: 1250, height: 843 },
  ];

  const { Client } = await import('@line/bot-sdk');
  const client = new Client({ channelAccessToken: oa.channel_access_token });

  const richMenuBody = {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: `${oa.name} Rich Menu`,
    chatBarText: '開啟選單',
    areas: zones.map((z, i) => ({
      bounds: BOUNDS[i],
      action: { type: 'uri', uri: z.uri },
    })),
  };

  try {
    let oldMenuId = null;
    try { oldMenuId = await client.getDefaultRichMenuId(); } catch { /* no existing menu */ }

    const richMenuId = await client.createRichMenu(richMenuBody);
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    await client.setRichMenuImage(richMenuId, imageBuffer, imageFile.type || 'image/jpeg');
    await client.setDefaultRichMenu(richMenuId);

    if (oldMenuId) {
      try { await client.deleteRichMenu(oldMenuId); } catch (e) {
        console.warn('舊選單刪除失敗（不影響部署）:', e.message);
      }
    }

    return c.json({ success: true, richMenuId });
  } catch (error) {
    console.error('Rich menu deploy error:', error);
    return c.json({ success: false, error: '部署失敗', details: error?.message || String(error) }, 500);
  }
});

export default lineoa;
