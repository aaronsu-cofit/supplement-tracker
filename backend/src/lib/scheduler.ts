import {
  getActiveEnrollmentsForOA,
  getLineOAById,
  getAllLineOAs,
  tryClaimDelivery,
  releaseDelivery,
  getContentItemByKey,
  getMissionTemplateByKey,
  assignMission,
} from './db.js';
import { withRetry } from './retry.js';
import { daysBetweenInTz } from './time.js';
import {
  findPushNodesForDay,
  findAiSkillNodesForDay,
  findMissionAssignNodesForDay,
  findStreakIncrementNodesForDay,
  findSetAttributeNodesForDay,
  buildLineMessage,
  type FlowNode,
  type FlowEdge,
} from './flow.js';
import { evaluateAllActiveUsers, type MenuReevalResult } from './menuEvaluator.js';
import { adkRun } from './adk.js';
import { incrementStreak } from './gamification.js';
import { setUserAttributeWithHooks } from './missions.js';

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
      // Resolve content_key reference: if the node points at a ContentItem
      // by key, fetch it at send time (so edits to the item flow through).
      // Only applies when the OA has a product bound and the key resolves.
      let effectiveData = pushNode.data;
      const contentKey = pushNode.data?.contentKey;
      if (contentKey && oa.product_id) {
        const item = await getContentItemByKey(oa.product_id, contentKey);
        if (item && item.is_active && item.body) {
          effectiveData = {
            ...pushNode.data,
            type: (pushNode.data?.type as 'text' | 'image' | 'sticker' | undefined) ?? 'text',
            message: item.body,
          };
        } else {
          errors.push(`user=${userId} node=${pushNode.id}: content_key=${contentKey} missing/inactive/empty`);
          continue;
        }
      }
      const message = buildLineMessage(effectiveData);
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

    // Platform action nodes (mission / streak / attribute) need a product
    // to resolve mission_key / streak_key against. When the OA has no
    // product bound, we log-warn and skip — keeping push/ai handling
    // fully functional for OAs that aren't on the platform yet.
    const hasActionNodes =
      nodes.some(n =>
        n.type === 'mission-assign-node' ||
        n.type === 'streak-increment-node' ||
        n.type === 'set-attribute-node');
    if (hasActionNodes && !oa.product_id) {
      errors.push(`OA #${oaId}: scenario has platform action nodes but OA has no product_id bound — skipping`);
    }

    if (oa.product_id) {
      // Mission-assign nodes: look up template by key within the OA's
      // product, then idempotently assign. Claim-first ensures at most
      // one assignment per (user, scenario, node).
      const missionNodes = findMissionAssignNodesForDay(nodes, edges, daysSinceEnrollment);
      for (const mNode of missionNodes) {
        const missionKey = mNode.data?.missionKey;
        if (!missionKey) {
          errors.push(`user=${userId} mNode=${mNode.id}: missing missionKey`);
          continue;
        }
        const template = await getMissionTemplateByKey(oa.product_id, missionKey);
        if (!template || !template.is_active) {
          errors.push(`user=${userId} mNode=${mNode.id}: mission ${missionKey} not found/inactive`);
          continue;
        }
        const claimed = await tryClaimDelivery(userId, enr.scenario.id, mNode.id);
        if (!claimed) { skipped++; continue; }
        try {
          await assignMission(userId, template.id);
          sent++;
        } catch (err) {
          await releaseDelivery(userId, enr.scenario.id, mNode.id);
          errors.push(`user=${userId} mNode=${mNode.id}: ${(err as Error).message}`);
        }
      }

      // Streak-increment nodes: the streak helper is already tz-aware and
      // same-day idempotent, so we skip the claim dance — calling it
      // twice on the same day is a no-op. But we still claim once per
      // day to get a counted delivery and keep the scheduler stats clean.
      const streakNodes = findStreakIncrementNodesForDay(nodes, edges, daysSinceEnrollment);
      for (const sNode of streakNodes) {
        const streakKey = sNode.data?.streakKey;
        if (!streakKey) {
          errors.push(`user=${userId} sNode=${sNode.id}: missing streakKey`);
          continue;
        }
        const claimed = await tryClaimDelivery(userId, enr.scenario.id, sNode.id);
        if (!claimed) { skipped++; continue; }
        try {
          await incrementStreak(oa.product_id, userId, streakKey);
          sent++;
        } catch (err) {
          await releaseDelivery(userId, enr.scenario.id, sNode.id);
          errors.push(`user=${userId} sNode=${sNode.id}: ${(err as Error).message}`);
        }
      }

      // Set-attribute nodes: writes through the hook-bearing setter so
      // mission auto-complete fires consistently with the intent path.
      const attrNodes = findSetAttributeNodesForDay(nodes, edges, daysSinceEnrollment);
      for (const aNode of attrNodes) {
        const attributeKey = aNode.data?.attributeKey;
        if (!attributeKey) {
          errors.push(`user=${userId} aNode=${aNode.id}: missing attributeKey`);
          continue;
        }
        const claimed = await tryClaimDelivery(userId, enr.scenario.id, aNode.id);
        if (!claimed) { skipped++; continue; }
        try {
          await setUserAttributeWithHooks(userId, attributeKey, aNode.data?.value ?? null);
          sent++;
        } catch (err) {
          await releaseDelivery(userId, enr.scenario.id, aNode.id);
          errors.push(`user=${userId} aNode=${aNode.id}: ${(err as Error).message}`);
        }
      }
    }
  }

  return { sent, skipped, errors, enrollmentsConsidered: enrollments.length };
}
