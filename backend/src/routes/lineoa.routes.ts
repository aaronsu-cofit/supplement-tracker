import { FastifyInstance } from 'fastify';
import { authPreHandler } from '../middleware/authMiddleware.js';
import {
  getAllLineOAs, getLineOAById, createLineOA, updateLineOA, deleteLineOA,
  getTemplatesForOA, getTemplateById, createTemplate, updateTemplate, deleteTemplate, setActiveTemplate, deactivateAllTemplates,
  getMessageLogForOa, getDistinctMessageLogUsersForOa, db,
} from '../lib/db.js';
import { fetchLineBotInfo } from '../lib/line.js';
import { adkRun } from '../lib/adk.js';
import { pushContentToUser } from '../lib/notify.js';

export async function lineoaRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authPreHandler);

  // GET /api/line/oa
  app.get('/', async (request, reply) => {
    const oas = await getAllLineOAs();
    return { oas };
  });

  // POST /api/line/oa
  app.post('/', async (request, reply) => {
    const body = request.body as any;
    const { name, description, channel_access_token, channel_secret } = body;
    if (!name || !channel_access_token) {
      return reply.code(400).send({ error: '請提供 name 與 channel_access_token' });
    }
    const botInfo = await fetchLineBotInfo(channel_access_token);
    const oa = await createLineOA({
      name,
      description,
      channel_access_token,
      channel_secret,
      line_destination_id: botInfo?.userId ?? null,
    });
    return reply.code(201).send({ oa });
  });

  // PATCH /api/line/oa/:id
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as any;
    const body = request.body as any;
    try {
      if (body.channel_access_token) {
        const botInfo = await fetchLineBotInfo(body.channel_access_token);
        if (botInfo?.userId) body.line_destination_id = botInfo.userId;
      }
      const oa = await updateLineOA(id, body);
      return { oa };
    } catch (e: any) {
      if (e?.code === 'P2025') return reply.code(404).send({ error: '找不到此 LINE OA' });
      throw e;
    }
  });

  // POST /api/line/oa/:id/refresh-bot-info
  app.post('/:id/refresh-bot-info', async (request, reply) => {
    const { id } = request.params as any;
    const oa = await getLineOAById(id);
    if (!oa) return reply.code(404).send({ error: '找不到此 LINE OA' });
    const botInfo = await fetchLineBotInfo(oa.channel_access_token);
    if (!botInfo?.userId) {
      return reply.code(400).send({ error: '無法取得 bot info — 請確認 Channel Access Token 正確' });
    }
    const updated = await updateLineOA(id, { line_destination_id: botInfo.userId });
    return { oa: updated, bot_user_id: botInfo.userId, display_name: botInfo.displayName };
  });

  // POST /api/line/oa/:id/test-ai-platform
  app.post('/:id/test-ai-platform', async (request, reply) => {
    const { id } = request.params as any;
    const oa = await getLineOAById(id);
    if (!oa) return reply.code(404).send({ error: '找不到此 LINE OA' });
    if (!oa.ai_skill_platform_url) {
      return reply.code(400).send({ error: 'AI Skill Platform URL 未設定' });
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
      return {
        ok: true,
        agent_id: agentId,
        skill_key: result.skill_key,
        reply_preview: (result.result || '').slice(0, 200),
        latency_ms: Date.now() - started,
      };
    } catch (err: any) {
      return reply.code(502).send({
        ok: false,
        agent_id: agentId,
        latency_ms: Date.now() - started,
        error: err.message,
      });
    }
  });

  // POST /api/line/oa/:id/manual-push
  app.post('/:id/manual-push', async (request, reply) => {
    const { id } = request.params as any;
    const oa = await getLineOAById(id);
    if (!oa) return reply.code(404).send({ error: '找不到此 LINE OA' });
    if (!oa.product_id) return reply.code(400).send({ error: 'OA 未綁定 product' });

    const body = (request.body || {}) as any;
    if (!body.user_id || !body.content_key) {
      return reply.code(400).send({ error: 'user_id, content_key required' });
    }

    try {
      await pushContentToUser(
        oa.product_id, body.user_id, body.content_key,
        'manual_push', `manual:${body.content_key}:${Date.now()}`,
      );
      return { ok: true, content_key: body.content_key, user_id: body.user_id };
    } catch (err: any) {
      return reply.code(500).send({ ok: false, error: err.message });
    }
  });

  // GET /api/line/oa/:id/messages
  app.get('/:id/messages', async (request, reply) => {
    const { id } = request.params as any;
    const idNum = parseInt(id, 10);
    if (!Number.isFinite(idNum)) return reply.code(400).send({ error: 'invalid oa id' });
    
    const query = request.query as any;
    const userId = query.user_id || undefined;
    const limit = Math.min(500, parseInt(query.limit || '100', 10));
    const beforeStr = query.before;
    let before: Date | undefined;
    if (beforeStr) {
      const d = new Date(beforeStr);
      if (isNaN(d.getTime())) return reply.code(400).send({ error: 'invalid before date' });
      before = d;
    }
    
    const messages = await getMessageLogForOa(idNum, { userId, limit, before });
    
    const intentIds = Array.from(new Set(
      messages
        .filter(m => m.source === 'intent' && m.source_ref)
        .map(m => m.source_ref as string),
    ));
    let intentNames: Map<string, string> = new Map();
    if (intentIds.length > 0) {
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
    return { messages: enriched };
  });

  // GET /api/line/oa/:id/messages/users
  app.get('/:id/messages/users', async (request, reply) => {
    const { id } = request.params as any;
    const idNum = parseInt(id, 10);
    if (!Number.isFinite(idNum)) return reply.code(400).send({ error: 'invalid oa id' });
    const users = await getDistinctMessageLogUsersForOa(idNum, 200);
    return { users };
  });

  // DELETE /api/line/oa/:id
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as any;
    try {
      await deleteLineOA(id);
      return { success: true };
    } catch (e: any) {
      if (e?.code === 'P2025') return reply.code(404).send({ error: '找不到此 LINE OA' });
      throw e;
    }
  });

  // Additional endpoints for richmenu management
  // (Simplified for rapid migration - full logic delegated to LINE SDK)
  
  // GET /api/line/oa/:id/templates
  app.get('/:id/templates', async (request, reply) => {
    const { id } = request.params as any;
    const templates = await getTemplatesForOA(id);
    return { templates };
  });

  // POST /api/line/oa/:id/templates
  app.post('/:id/templates', async (request, reply) => {
    const { id } = request.params as any;
    const oa = await getLineOAById(id);
    if (!oa) return reply.code(404).send({ error: '找不到此 LINE OA 設定' });

    const body = request.body as any;
    const { name, zones } = body;
    if (!name?.trim()) return reply.code(400).send({ error: '請提供模板名稱' });

    const defaultZones = [
      { id: 'A', position: '左上', label: '', uri: '' },
      { id: 'B', position: '右上', label: '', uri: '' },
      { id: 'C', position: '左下', label: '', uri: '' },
      { id: 'D', position: '右下', label: '', uri: '' },
    ];
    const template = await createTemplate(id, { name: name.trim(), zones: zones || defaultZones });
    return reply.code(201).send({ template });
  });

  // PATCH /api/line/oa/:id/templates/:templateId
  app.patch('/:id/templates/:templateId', async (request, reply) => {
    const { id, templateId } = request.params as any;
    const oa = await getLineOAById(id);
    if (!oa) return reply.code(404).send({ error: '找不到此 LINE OA 設定' });

    const body = request.body as any;
    try {
      const template = await updateTemplate(templateId, body);
      return { template };
    } catch (e: any) {
      if (e?.code === 'P2025') return reply.code(404).send({ error: '找不到此模板' });
      throw e;
    }
  });

  // DELETE /api/line/oa/:id/templates/:templateId
  app.delete('/:id/templates/:templateId', async (request, reply) => {
    const { id, templateId } = request.params as any;
    const oa = await getLineOAById(id);
    if (!oa) return reply.code(404).send({ error: '找不到此 LINE OA 設定' });

    try {
      await deleteTemplate(templateId);
      return { success: true };
    } catch (e: any) {
      if (e?.code === 'P2025') return reply.code(404).send({ error: '找不到此模板' });
      throw e;
    }
  });

  // POST /api/line/oa/:id/templates/:templateId/deploy
  app.post('/:id/templates/:templateId/deploy', async (request, reply) => {
    const { id, templateId } = request.params as any;
    const oa = await getLineOAById(id);
    if (!oa) return reply.code(404).send({ error: '找不到此 LINE OA 設定' });

    const template = await getTemplateById(templateId);
    if (!template) return reply.code(404).send({ error: '找不到此模板' });

    try {
      // 設定此模板為活躍狀態
      const deployed = await setActiveTemplate(id, templateId);
      return { ok: true, template: deployed, message: '模板已部署' };
    } catch (e: any) {
      return reply.code(500).send({ ok: false, error: e.message });
    }
  });

  // POST /api/line/oa/:id/templates/:templateId/deactivate
  app.post('/:id/templates/:templateId/deactivate', async (request, reply) => {
    const { id, templateId } = request.params as any;
    const oa = await getLineOAById(id);
    if (!oa) return reply.code(404).send({ error: '找不到此 LINE OA 設定' });

    const template = await getTemplateById(templateId);
    if (!template) return reply.code(404).send({ error: '找不到此模板' });

    try {
      // 停用此 OA 的所有模板
      await deactivateAllTemplates(id);
      return { ok: true, message: '所有模板已停用' };
    } catch (e: any) {
      return reply.code(500).send({ ok: false, error: e.message });
    }
  });
}
