import { Hono } from 'hono';
import { runLlmFallback } from '../lib/llmFallback.js';
import { db } from '../lib/db.js';

/**
 * Internal LLM endpoint — exposes runLlmFallback over HTTP for callers
 * outside this process (e.g. a future LIFF "ask AI" feature, manual
 * testing, or other internal services). The LINE webhook calls
 * runLlmFallback directly in-process and bypasses this route.
 *
 * Auth: shared bearer token via INTERNAL_API_TOKEN env var. There's no
 * per-user context here on purpose — callers are trusted services, the
 * `user_id` in the body is the LINE userId for memory/conversation
 * tracking on the AI Skill Platform side, not an identity we verify.
 */
const internalLlm = new Hono();

internalLlm.use('*', async (c, next) => {
  const expected = process.env.INTERNAL_API_TOKEN;
  if (!expected) {
    return c.json({ error: 'INTERNAL_API_TOKEN not configured on this server' }, 503);
  }
  const auth = c.req.header('Authorization');
  if (auth !== `Bearer ${expected}`) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
});

interface ChatBody {
  user_id?: string;
  oa_id?: number;
  product_id?: string | null;
  agent_id?: string;
  message?: string;
}

internalLlm.post('/chat', async (c) => {
  let body: ChatBody;
  try { body = await c.req.json(); } catch { return c.json({ error: 'invalid JSON' }, 400); }

  if (!body.user_id || !body.oa_id || !body.message) {
    return c.json({ error: 'user_id, oa_id, message required' }, 400);
  }

  const oa = await db().lineOA.findUnique({
    where: { id: body.oa_id },
    select: {
      id: true,
      product_id: true,
      default_agent_id: true,
      ai_skill_platform_url: true,
      ai_skill_platform_api_key: true,
    },
  });
  if (!oa) return c.json({ error: 'oa not found' }, 404);
  if (!oa.ai_skill_platform_url || !oa.ai_skill_platform_api_key) {
    return c.json({ error: 'OA missing ai_skill_platform_url / api_key' }, 400);
  }

  const agentId = body.agent_id || oa.default_agent_id;
  const productId = body.product_id ?? oa.product_id ?? null;

  const result = await runLlmFallback({
    userId: body.user_id,
    oaId: oa.id,
    productId,
    agentId,
    message: body.message,
    oa: {
      ai_skill_platform_url: oa.ai_skill_platform_url,
      ai_skill_platform_api_key: oa.ai_skill_platform_api_key,
    },
  });

  if (!result.ok) {
    return c.json({ ok: false, error: result.error, log_id: result.log_id }, 502);
  }
  return c.json({
    ok: true,
    reply: result.reply,
    skill_key: result.skill_key,
    log_id: result.log_id,
    latency_ms: result.latency_ms,
  });
});

export default internalLlm;
