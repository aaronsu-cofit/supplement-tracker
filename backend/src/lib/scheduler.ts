import {
  getActiveEnrollmentsForOA,
  getLineOAById,
  getAllLineOAs,
  tryClaimDelivery,
  releaseDelivery,
} from './db.js';
import { withRetry } from './retry.js';
import { daysBetweenInTz } from './time.js';
import { findPushNodesForDay, findAiSkillNodesForDay, buildLineMessage, type FlowNode, type FlowEdge } from './flow.js';
import { evaluateAllActiveUsers, type MenuReevalResult } from './menuEvaluator.js';
import { adkRun } from './adk.js';

export interface SchedulerRunResult {
  sent: number;
  skipped: number;
  errors: string[];
  enrollmentsConsidered: number;
  menuReeval?: MenuReevalResult;
}

export interface DailyCycleOptions {
  now?: Date;
  includeMenuReeval?: boolean;
}

/**
 * Runs the daily cycle: push messages + (optional) menu re-evaluation.
 * Call this from a cron tick or from the manual trigger button. Menu
 * re-eval ensures users whose Day N changed today get switched to the
 * right menu, since follow-time evaluation is one-shot.
 */
export async function runDailyCycle(opts: DailyCycleOptions = {}): Promise<SchedulerRunResult> {
  const now = opts.now ?? new Date();
  const result = await runScheduler(now);
  if (opts.includeMenuReeval !== false) {
    try {
      result.menuReeval = await evaluateAllActiveUsers();
    } catch (err) {
      result.errors.push(`menu re-eval failed: ${(err as Error).message}`);
    }
  }
  return result;
}

/**
 * Runs the push-message scheduler once. Iterates all active enrollments
 * matching LINE_OA_ID (or legacy 'default'), computes days_since_enrollment
 * in the user's timezone, finds day-nodes in the scenario's flow matching
 * that day, follows outgoing edges to push-message-nodes, and pushes the
 * message via LINE — with per-call claim-first idempotency and retry on
 * transient errors.
 */
export async function runScheduler(now: Date = new Date()): Promise<SchedulerRunResult> {
  // Determine which OAs to run for:
  // - If LINE_OA_ID env is set → single-OA mode (legacy)
  // - Otherwise → iterate every active OA in DB
  const envOa = parseInt(process.env.LINE_OA_ID || '0');
  let oaIds: number[];
  if (envOa > 0) {
    const oa = await getLineOAById(envOa.toString());
    if (!oa) {
      return {
        sent: 0, skipped: 0, enrollmentsConsidered: 0,
        errors: [`LINE OA #${envOa} not found in DB — check LINE_OA_ID matches /lineoamenu`],
      };
    }
    oaIds = [envOa];
  } else {
    const all = await getAllLineOAs();
    oaIds = all.filter(o => o.is_active).map(o => o.id);
    if (oaIds.length === 0) {
      return {
        sent: 0, skipped: 0, enrollmentsConsidered: 0,
        errors: ['No active LINE OAs found. Create one in /lineoamenu, or set LINE_OA_ID env to restrict.'],
      };
    }
  }

  let sent = 0;
  let skipped = 0;
  let enrollmentsConsidered = 0;
  const errors: string[] = [];

  for (const oaId of oaIds) {
    const result = await runForOa(oaId, now);
    sent += result.sent;
    skipped += result.skipped;
    enrollmentsConsidered += result.enrollmentsConsidered;
    errors.push(...result.errors);
  }

  return { sent, skipped, errors, enrollmentsConsidered };
}

async function runForOa(oaId: number, now: Date): Promise<SchedulerRunResult> {
  const oa = await getLineOAById(oaId.toString());
  if (!oa?.channel_access_token) {
    return {
      sent: 0, skipped: 0, enrollmentsConsidered: 0,
      errors: [`OA #${oaId}: channel_access_token missing — edit in /lineoamenu`],
    };
  }
  const channelToken = oa.channel_access_token;

  const enrollments = await getActiveEnrollmentsForOA(oaId);
  if (enrollments.length === 0) {
    return { sent: 0, skipped: 0, errors: [], enrollmentsConsidered: 0 };
  }

  const { Client } = await import('@line/bot-sdk');
  const client = new Client({ channelAccessToken: channelToken });

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const enr of enrollments) {
    const userId = enr.user.id;
    const tz = enr.user.timezone || 'Asia/Taipei';
    const daysSinceEnrollment = daysBetweenInTz(enr.enrolled_at, now, tz);

    const nodes: FlowNode[] = Array.isArray(enr.scenario.flow_nodes)
      ? (enr.scenario.flow_nodes as unknown as FlowNode[]) : [];
    const edges: FlowEdge[] = Array.isArray(enr.scenario.flow_edges)
      ? (enr.scenario.flow_edges as unknown as FlowEdge[]) : [];

    const pushNodes = findPushNodesForDay(nodes, edges, daysSinceEnrollment);
    for (const pushNode of pushNodes) {
      const message = buildLineMessage(pushNode.data);
      if (!message) {
        errors.push(`user=${userId} node=${pushNode.id}: skipped (missing required fields for type=${pushNode.data?.type || 'text'})`);
        continue;
      }

      const claimed = await tryClaimDelivery(userId, enr.scenario.id, pushNode.id);
      if (!claimed) { skipped++; continue; }

      try {
        await withRetry(
          () => client.pushMessage(userId, message),
          `pushMessage user=${userId} node=${pushNode.id}`,
        );
        sent++;
      } catch (err) {
        await releaseDelivery(userId, enr.scenario.id, pushNode.id);
        const status = (err as { statusCode?: number })?.statusCode;
        errors.push(`user=${userId} node=${pushNode.id} status=${status ?? '?'}: ${(err as Error).message}`);
      }
    }

    // AI-generated push: ai-skill-nodes connected to this Day fire the
    // agent. The agent decides what to generate (using client_id for
    // memory); we just push its result text. Same claim-first idempotency.
    const aiNodes = findAiSkillNodesForDay(nodes, edges, daysSinceEnrollment);
    for (const aiNode of aiNodes) {
      const agentId = aiNode.data?.agentId;
      if (!agentId) continue;
      if (!oa.ai_skill_platform_url || !oa.ai_skill_platform_api_key) {
        errors.push(`user=${userId} aiNode=${aiNode.id}: OA missing ai_skill_platform_url/api_key`);
        continue;
      }

      const claimed = await tryClaimDelivery(userId, enr.scenario.id, aiNode.id);
      if (!claimed) { skipped++; continue; }

      try {
        const result = await adkRun(
          agentId,
          userId,
          undefined,
          { url: oa.ai_skill_platform_url, apiKey: oa.ai_skill_platform_api_key },
        );
        const text = result.result;
        if (!text || !text.trim()) {
          await releaseDelivery(userId, enr.scenario.id, aiNode.id);
          errors.push(`user=${userId} aiNode=${aiNode.id}: agent returned empty result`);
          continue;
        }
        await withRetry(
          () => client.pushMessage(userId, { type: 'text', text }),
          `aiPush user=${userId} node=${aiNode.id}`,
        );
        sent++;
      } catch (err) {
        await releaseDelivery(userId, enr.scenario.id, aiNode.id);
        const status = (err as { statusCode?: number })?.statusCode;
        errors.push(`user=${userId} aiNode=${aiNode.id} status=${status ?? '?'}: ${(err as Error).message}`);
      }
    }
  }

  return { sent, skipped, errors, enrollmentsConsidered: enrollments.length };
}
