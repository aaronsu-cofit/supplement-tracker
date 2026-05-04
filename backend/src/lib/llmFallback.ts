import { db } from './db.js';
import { adkRun } from './adk.js';

/**
 * The LLM fallback handler — invoked when an inbound LINE text did NOT
 * match any Intent rule. Wraps the AI Skill Platform call so we can:
 *
 *   1. Persist the question (and reply) to `unmatched_intents` for ops
 *      review. This is the "feedback loop" — frequent unanswered
 *      questions become candidates for new Intent rules.
 *   2. Centralize provider config — the rest of the app just calls
 *      `runLlmFallback`, doesn't care whether we're using ADK / Gemini /
 *      Claude. To swap providers later, only this file changes.
 *   3. Capture latency, model, and errors uniformly.
 *
 * Caller resolves `agentId` upstream (scenario phase agent or OA default)
 * since that decision needs scenario context this module shouldn't own.
 *
 * Errors are caught and logged into the same row with `error` set, so
 * we have visibility into provider failures, not just successes.
 */
export interface RunLlmFallbackInput {
  userId: string;
  oaId: number;
  productId?: string | null;
  agentId: string;
  message: string;
  oa: { ai_skill_platform_url: string; ai_skill_platform_api_key: string | null };
}

export interface RunLlmFallbackResult {
  ok: boolean;
  reply?: string;
  skill_key?: string;
  log_id: number;
  error?: string;
  latency_ms: number;
}

export async function runLlmFallback(opts: RunLlmFallbackInput): Promise<RunLlmFallbackResult> {
  const startedAt = Date.now();

  // Reserve the row up-front so we have a stable id to return even if
  // the AI call throws. The post-call update fills in reply / skill_key
  // / error / latency.
  const row = await db().unmatchedIntent.create({
    data: {
      user_id: opts.userId,
      oa_id: opts.oaId,
      product_id: opts.productId ?? null,
      agent_id: opts.agentId,
      message: opts.message.slice(0, 2000),
    },
    select: { id: true },
  });

  try {
    const result = await adkRun(
      opts.agentId,
      opts.userId,
      { message: opts.message },
      { url: opts.oa.ai_skill_platform_url, apiKey: opts.oa.ai_skill_platform_api_key },
    );
    const latency = Date.now() - startedAt;
    await db().unmatchedIntent.update({
      where: { id: row.id },
      data: {
        reply: result.result ?? null,
        skill_key: result.skill_key ?? null,
        latency_ms: latency,
      },
    });
    return {
      ok: true,
      reply: result.result,
      skill_key: result.skill_key,
      log_id: row.id,
      latency_ms: latency,
    };
  } catch (err) {
    const latency = Date.now() - startedAt;
    const message = (err as Error).message;
    await db().unmatchedIntent.update({
      where: { id: row.id },
      data: { error: message.slice(0, 1000), latency_ms: latency },
    });
    return { ok: false, error: message, log_id: row.id, latency_ms: latency };
  }
}
