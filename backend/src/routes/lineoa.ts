import { Hono } from 'hono';
import { authMiddleware } from '../middleware/authMiddleware.js';
import {
  getAllLineOAs, getLineOAById, createLineOA, updateLineOA, deleteLineOA,
  getTemplatesForOA, getTemplateById, createTemplate, updateTemplate, deleteTemplate, setActiveTemplate, deactivateAllTemplates,
  getMessageLogForOa, getDistinctMessageLogUsersForOa,
} from '../lib/db.js';
import { fetchLineBotInfo } from '../lib/line.js';
import { adkRun } from '../lib/adk.js';

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
  const { name, description, channel_access_token, channel_secret } = body;
  if (!name || !channel_access_token) {
    return c.json({ error: '請提供 name 與 channel_access_token' }, 400);
  }
  // Auto-fetch bot's LINE user ID (= webhook destination) from LINE API
  const botInfo = await fetchLineBotInfo(channel_access_token);
  const oa = await createLineOA({
    name,
    description,
    channel_access_token,
    channel_secret,
    line_destination_id: botInfo?.userId ?? null,
  });
  return c.json({ oa }, 201);
});

// PATCH /api/line/oa/:id
lineoa.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  try {
    // If token changes, refresh destination id (bot might be different)
    if (body.channel_access_token) {
      const botInfo = await fetchLineBotInfo(body.channel_access_token);
      if (botInfo?.userId) body.line_destination_id = botInfo.userId;
    }
    const oa = await updateLineOA(id, body);
    return c.json({ oa });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2025') return c.json({ error: '找不到此 LINE OA' }, 404);
    throw e;
  }
});

// POST /api/line/oa/:id/refresh-bot-info — re-fetch the bot's LINE user ID
// using the stored channel_access_token; updates line_destination_id.
lineoa.post('/:id/refresh-bot-info', async (c) => {
  const id = c.req.param('id');
  const oa = await getLineOAById(id);
  if (!oa) return c.json({ error: '找不到此 LINE OA' }, 404);
  const botInfo = await fetchLineBotInfo(oa.channel_access_token);
  if (!botInfo?.userId) {
    return c.json({ error: '無法取得 bot info — 請確認 Channel Access Token 正確' }, 400);
  }
  const updated = await updateLineOA(id, { line_destination_id: botInfo.userId });
  return c.json({ oa: updated, bot_user_id: botInfo.userId, display_name: botInfo.displayName });
});

// POST /api/line/oa/:id/test-ai-platform — end-to-end probe of the OA's
// AI Skill Platform config. Calls the same adkRun path the webhook
// fallback uses (URL + API key + default agent) with a sentinel message,
// so a "pass" means real users will get real answers. Doesn't write to
// unmatched_intents — admin tests aren't user feedback.
lineoa.post('/:id/test-ai-platform', async (c) => {
  const id = c.req.param('id');
  const oa = await getLineOAById(id);
  if (!oa) return c.json({ error: '找不到此 LINE OA' }, 404);
  if (!oa.ai_skill_platform_url) {
    return c.json({ error: 'AI Skill Platform URL 未設定' }, 400);
  }
  const agentId = oa.default_agent_id || 'ai-expert';
  const started = Date.now();
  try {
    const result = await adkRun(
      agentId,
      'admin-test',
      { message: '測試連線：請回覆任何文字確認 agent 可用' },
      { url: oa.ai_skill_platform_url, bearerToken: oa.ai_skill_platform_api_key },
    );
    return c.json({
      ok: true,
      agent_id: agentId,
      skill_key: result.skill_key,
      reply_preview: (result.result || '').slice(0, 200),
      latency_ms: Date.now() - started,
    });
  } catch (err) {
    return c.json({
      ok: false,
      agent_id: agentId,
      latency_ms: Date.now() - started,
      error: (err as Error).message,
    }, 502);
  }
});

// GET /api/line/oa/:id/messages?user_id=&limit=&before=
lineoa.get('/:id/messages', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (!Number.isFinite(id)) return c.json({ error: 'invalid oa id' }, 400);
  const userId = c.req.query('user_id') || undefined;
  const limit = Math.min(500, parseInt(c.req.query('limit') || '100', 10));
  const beforeStr = c.req.query('before');
  let before: Date | undefined;
  if (beforeStr) {
    const d = new Date(beforeStr);
    if (isNaN(d.getTime())) return c.json({ error: 'invalid before date' }, 400);
    before = d;
  }
  const messages = await getMessageLogForOa(id, { userId, limit, before });

  // Resolve intent rule names so the conversations UI can show "問候規則"
  // instead of an opaque cuid. Done at read-time (not stored in
  // message_log) so renaming a rule retroactively re-labels history,
  // and deleting a rule degrades to null instead of breaking.
  const intentIds = Array.from(new Set(
    messages
      .filter(m => m.source === 'intent' && m.source_ref)
      .map(m => m.source_ref as string),
  ));
  let intentNames: Map<string, string> = new Map();
  if (intentIds.length > 0) {
    const { db } = await import('../lib/db.js');
    const rules = await db().intentRule.findMany({
      where: { id: { in: intentIds } },
      select: { id: true, name: true },
    });
    intentNames = new Map(rules.map(r => [r.id, r.name]));
  }
  const enriched = messages.map(m => ({
    ...m,
    intent_rule_name: m.source === 'intent' && m.source_ref
      ? intentNames.get(m.source_ref) ?? null
      : null,
  }));
  return c.json({ messages: enriched });
});

// GET /api/line/oa/:id/messages/users — distinct user list for the
// conversation picker, most recent activity first.
lineoa.get('/:id/messages/users', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  if (!Number.isFinite(id)) return c.json({ error: 'invalid oa id' }, 400);
  const users = await getDistinctMessageLogUsersForOa(id, 200);
  return c.json({ users });
});

// DELETE /api/line/oa/:id
lineoa.delete('/:id', async (c) => {
  const id = c.req.param('id');
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
  const id = c.req.param('id');
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

  const { Client } = await import('@line/bot-sdk');
  const client = new Client({ channelAccessToken: oa.channel_access_token });

  const richMenuBody = {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: `${oa.name} Rich Menu`,
    chatBarText: '開啟選單',
    areas: zones.map((z, i) => ({
      bounds: BOUNDS[i],
      action: { type: 'uri' as const, uri: z.uri },
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

// DELETE /api/line/oa/:id/richmenu  — remove default rich menu from LINE
lineoa.delete('/:id/richmenu', async (c) => {
  const id = c.req.param('id');
  const oa = await getLineOAById(id);
  if (!oa) return c.json({ error: '找不到此 LINE OA 設定' }, 404);

  const { Client } = await import('@line/bot-sdk');
  const client = new Client({ channelAccessToken: oa.channel_access_token });

  try {
    await client.deleteDefaultRichMenu();
  } catch (error) {
    console.warn('移除預設選單失敗（可能已無選單）:', error?.message);
  }

  await deactivateAllTemplates(id);
  return c.json({ success: true });
});

// ─── Rich Menu Templates ─────────────────────────────────────────────────────

const BOUNDS = [
  { x: 0,    y: 0,   width: 1250, height: 843 },
  { x: 1250, y: 0,   width: 1250, height: 843 },
  { x: 0,    y: 843, width: 1250, height: 843 },
  { x: 1250, y: 843, width: 1250, height: 843 },
];

// GET /api/line/oa/:id/templates
lineoa.get('/:id/templates', async (c) => {
  const id = c.req.param('id');
  const templates = await getTemplatesForOA(id);
  return c.json({ templates });
});

// POST /api/line/oa/:id/templates  — create template (zones only, no image)
lineoa.post('/:id/templates', async (c) => {
  const id = c.req.param('id');
  const oa = await getLineOAById(id);
  if (!oa) return c.json({ error: '找不到此 LINE OA 設定' }, 404);

  const body = await c.req.json();
  const { name, zones } = body;
  if (!name?.trim()) return c.json({ error: '請提供模板名稱' }, 400);

  const defaultZones = [
    { id: 'A', position: '左上', label: '', uri: '' },
    { id: 'B', position: '右上', label: '', uri: '' },
    { id: 'C', position: '左下', label: '', uri: '' },
    { id: 'D', position: '右下', label: '', uri: '' },
  ];
  const template = await createTemplate(id, { name: name.trim(), zones: zones || defaultZones });
  return c.json({ template }, 201);
});

// PATCH /api/line/oa/:id/templates/:tid
lineoa.patch('/:id/templates/:tid', async (c) => {
  const tid = c.req.param('tid');
  const body = await c.req.json();
  try {
    const template = await updateTemplate(tid, { name: body.name, zones: body.zones });
    return c.json({ template });
  } catch (e) {
    if (e?.code === 'P2025') return c.json({ error: '找不到模板' }, 404);
    throw e;
  }
});

// DELETE /api/line/oa/:id/templates/:tid
lineoa.delete('/:id/templates/:tid', async (c) => {
  const tid = c.req.param('tid');
  try {
    await deleteTemplate(tid);
    return c.json({ success: true });
  } catch (e) {
    if (e?.code === 'P2025') return c.json({ error: '找不到模板' }, 404);
    throw e;
  }
});

// POST /api/line/oa/:id/templates/:tid/deploy  — upload image + deploy to LINE
lineoa.post('/:id/templates/:tid/deploy', async (c) => {
  const id = c.req.param('id');
  const tid = c.req.param('tid');

  const oa = await getLineOAById(id);
  if (!oa) return c.json({ error: '找不到此 LINE OA 設定' }, 404);
  if (!oa.is_active) return c.json({ error: '此 LINE OA 已停用' }, 400);

  const template = await getTemplateById(tid);
  if (!template || template.oa_id !== parseInt(id, 10)) return c.json({ error: '找不到模板' }, 404);

  let formData;
  try { formData = await c.req.formData(); } catch {
    return c.json({ error: '無法解析表單資料' }, 400);
  }

  const imageFile = formData.get('image');
  if (!imageFile || typeof imageFile === 'string') return c.json({ error: '未提供圖片檔案' }, 400);

  const zones = template.zones as Array<{ uri?: string }>;
  if (!Array.isArray(zones) || zones.length !== 4) return c.json({ error: 'zones 格式錯誤' }, 400);
  for (const z of zones) {
    if (!z.uri) return c.json({ error: `請先填入所有區塊的 LIFF URI 再部署` }, 400);
  }

  const { Client } = await import('@line/bot-sdk');
  const client = new Client({ channelAccessToken: oa.channel_access_token });

  const richMenuBody = {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: `${oa.name} - ${template.name}`,
    chatBarText: '開啟選單',
    areas: zones.map((z, i) => ({
      bounds: BOUNDS[i],
      action: { type: 'uri' as const, uri: z.uri },
    })),
  };

  try {
    const richMenuId = await client.createRichMenu(richMenuBody);
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    await client.setRichMenuImage(richMenuId, imageBuffer, imageFile.type || 'image/jpeg');
    await client.setDefaultRichMenu(richMenuId);

    // Delete the template's old rich menu from LINE (if any)
    if (template.line_rich_menu_id) {
      try { await client.deleteRichMenu(template.line_rich_menu_id); } catch {
        console.warn('舊模板選單刪除失敗（不影響部署）');
      }
    }

    const updated = await setActiveTemplate(id, tid, richMenuId);
    return c.json({ success: true, richMenuId, template: updated });
  } catch (error) {
    console.error('Rich menu deploy error:', error);
    return c.json({ success: false, error: '部署失敗', details: error?.message || String(error) }, 500);
  }
});

// POST /api/line/oa/:id/templates/:tid/activate  — re-activate without re-upload
lineoa.post('/:id/templates/:tid/activate', async (c) => {
  const id = c.req.param('id');
  const tid = c.req.param('tid');

  const oa = await getLineOAById(id);
  if (!oa) return c.json({ error: '找不到此 LINE OA 設定' }, 404);
  if (!oa.is_active) return c.json({ error: '此 LINE OA 已停用' }, 400);

  const template = await getTemplateById(tid);
  if (!template || template.oa_id !== parseInt(id, 10)) return c.json({ error: '找不到模板' }, 404);
  if (!template.line_rich_menu_id) return c.json({ error: '此模板尚未部署，請先上傳圖片並部署' }, 400);

  const { Client } = await import('@line/bot-sdk');
  const client = new Client({ channelAccessToken: oa.channel_access_token });

  try {
    await client.setDefaultRichMenu(template.line_rich_menu_id);
    const updated = await setActiveTemplate(id, tid);
    return c.json({ success: true, template: updated });
  } catch (error) {
    return c.json({ success: false, error: '切換失敗', details: error?.message || String(error) }, 500);
  }
});

export default lineoa;
