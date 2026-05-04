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
  contentItemToMessage,
  type FlowNode,
  type FlowEdge,
} from './flow.js';
import { evaluateAllActiveUsers, type MenuReevalResult } from './menuEvaluator.js';
import { adkRun } from './adk.js';
import { incrementStreak } from './gamification.js';
import { setUserAttributeWithHooks } from './missions.js';
import { logOutboundLineMessage } from './messageLog.js';

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

export interface DryRunAction {
  scenario_id: string;
  scenario_name: string;
  node_id: string;
  node_type: string;
  day: number;
  description: string;
  already_delivered: boolean;
  warning?: string;
}

export interface DryRunResult {
  user_id: string;
  as_of: string;
  actions: DryRunAction[];
  notes: string[];
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
      // contentItemToMessage handles both text and flex types uniformly.
      let message: ReturnType<typeof buildLineMessage> = null;
      const contentKey = pushNode.data?.contentKey;
      if (contentKey && oa.product_id) {
        const item = await getContentItemByKey(oa.product_id, contentKey);
        if (!item) {
          errors.push(`user=${userId} node=${pushNode.id}: content_key=${contentKey} not found`);
          continue;
        }
        message = contentItemToMessage(item);
        if (!message) {
          errors.push(`user=${userId} node=${pushNode.id}: content_key=${contentKey} inactive/empty/malformed`);
          continue;
        }
      } else {
        message = buildLineMessage(pushNode.data);
      }
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
        logOutboundLineMessage(
          oaId, userId, message, 'scheduler_push', `${enr.scenario.id}:${pushNode.id}`,
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
      if (!oa.ai_skill_platform_url) {
        errors.push(`user=${userId} aiNode=${aiNode.id}: OA missing ai_skill_platform_url`);
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
        const aiMessage: import('@line/bot-sdk').Message = { type: 'text', text };
        await withRetry(
          () => client.pushMessage(userId, aiMessage),
          `aiPush user=${userId} node=${aiNode.id}`,
        );
        logOutboundLineMessage(
          oaId, userId, aiMessage, 'scheduler_ai', `${enr.scenario.id}:${aiNode.id}:${agentId}`,
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
          await setUserAttributeWithHooks(userId, attributeKey, aNode.data?.value ?? null, 0, oa.product_id);
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

/**
 * Simulate what the scheduler would do for a user on a given day without
 * any side effects. Returns a flat list of actions per active
 * enrollment, each tagged with whether the delivery was already claimed
 * (so the real run would skip it). Useful for previewing scenarios
 * before turning them on, and for diagnosing why a user didn't receive
 * an expected message.
 *
 * Reuses all the flow finders used by the real scheduler so the two
 * stay in lockstep — if a new node type is added there, it needs to be
 * described here too.
 */
export interface DryRunOptions {
  userId: string;
  scenarioId?: string;
  asOf?: Date;
}

export async function dryRunScheduler(opts: DryRunOptions): Promise<DryRunResult> {
  const { userId, scenarioId } = opts;
  const now = opts.asOf ?? new Date();
  const actions: DryRunAction[] = [];
  const notes: string[] = [];

  const user = await import('./db.js').then(m => m.findUserById(userId));
  if (!user) {
    return { user_id: userId, as_of: now.toISOString(), actions, notes: ['使用者不存在'] };
  }
  const tz = user.timezone || 'Asia/Taipei';

  // Fetch enrollments — filter to a single scenario if caller specified one
  const { db } = await import('./db.js');
  const enrollments = await db().enrollment.findMany({
    where: {
      user_id: userId,
      status: 'active',
      ...(scenarioId != null && { scenario_id: scenarioId }),
      scenario: { is_active: true },
    },
    include: {
      scenario: { select: { id: true, name: true, oa_id: true, flow_nodes: true, flow_edges: true } },
    },
  });
  if (enrollments.length === 0) {
    notes.push(scenarioId ? '使用者尚未加入此劇本' : '使用者目前沒有任何活躍的劇本加入紀錄');
    return { user_id: userId, as_of: now.toISOString(), actions, notes };
  }

  for (const enr of enrollments) {
    const daysSinceEnrollment = daysBetweenInTz(enr.enrolled_at, now, tz);
    const nodes: FlowNode[] = Array.isArray(enr.scenario.flow_nodes)
      ? (enr.scenario.flow_nodes as unknown as FlowNode[]) : [];
    const edges: FlowEdge[] = Array.isArray(enr.scenario.flow_edges)
      ? (enr.scenario.flow_edges as unknown as FlowEdge[]) : [];

    // Look up OA to resolve contentKey / mission_key product scope
    const oaIdNum = parseInt(enr.scenario.oa_id, 10);
    const oa = Number.isFinite(oaIdNum)
      ? await db().lineOA.findUnique({ where: { id: oaIdNum }, select: { id: true, product_id: true } })
      : null;

    const describe = async (node: FlowNode, day: number): Promise<DryRunAction> => {
      const existing = await db().messageDelivery.findUnique({
        where: {
          user_id_scenario_id_node_id: {
            user_id: userId, scenario_id: enr.scenario.id, node_id: node.id,
          },
        },
      });
      const base = {
        scenario_id: enr.scenario.id,
        scenario_name: enr.scenario.name,
        node_id: node.id,
        node_type: node.type ?? 'unknown',
        day,
        already_delivered: !!existing,
      };
      const d = node.data ?? {};
      switch (node.type) {
        case 'push-message-node':
          if (d.contentKey) {
            if (!oa?.product_id) return { ...base, description: `推播 → ${d.contentKey}`, warning: 'OA 未綁定產品，content_key 將無法解析' };
            const ci = await db().contentItem.findUnique({
              where: { product_id_key: { product_id: oa.product_id, key: d.contentKey } },
            });
            if (!ci) return { ...base, description: `推播 → ${d.contentKey}`, warning: `content_key "${d.contentKey}" 不存在於產品` };
            if (!ci.is_active) return { ...base, description: `推播 → ${d.contentKey}`, warning: `content_key "${d.contentKey}" 已停用` };
            return { ...base, description: `推播 → ${d.contentKey}: ${(ci.body ?? '').slice(0, 40)}` };
          }
          if (d.type === 'image') return { ...base, description: `推播圖片 ${d.imageUrl ?? '(缺 URL)'}`, warning: d.imageUrl ? undefined : 'imageUrl 未設定' };
          if (d.type === 'sticker') return { ...base, description: `貼圖 ${d.stickerPackageId ?? '?'}/${d.stickerId ?? '?'}`, warning: d.stickerPackageId && d.stickerId ? undefined : 'sticker id 不完整' };
          if (d.type === 'flex') {
            let flexWarning: string | undefined;
            if (!d.flexContents) flexWarning = 'flexContents 未設定';
            else {
              try {
                const parsed = JSON.parse(d.flexContents);
                if (!parsed || typeof parsed !== 'object' || (parsed.type !== 'bubble' && parsed.type !== 'carousel')) {
                  flexWarning = 'flex JSON 最外層需為 bubble 或 carousel';
                }
              } catch {
                flexWarning = 'flex JSON 無法解析';
              }
            }
            return {
              ...base,
              description: `Flex: ${d.message || '(未設 altText)'}`,
              warning: flexWarning,
            };
          }
          return {
            ...base,
            description: d.message ? `推播 "${d.message.slice(0, 40)}"` : '推播（未設內容）',
            warning: d.message ? undefined : 'message 未設定',
          };
        case 'ai-skill-node':
          return { ...base, description: `AI 技能 ${d.agentId ?? '(未設 agent)'}`, warning: d.agentId ? undefined : 'agentId 未設定' };
        case 'menu-change-node':
          return { ...base, description: `切換選單 ${d.menuName ?? '(未設選單)'}`, warning: d.menuName ? undefined : 'menuName 未設定' };
        case 'mission-assign-node': {
          if (!oa?.product_id) return { ...base, description: `指派任務 ${d.missionKey ?? ''}`, warning: 'OA 未綁定產品' };
          if (!d.missionKey) return { ...base, description: '指派任務', warning: 'missionKey 未設定' };
          const mt = await db().missionTemplate.findUnique({
            where: { product_id_key: { product_id: oa.product_id, key: d.missionKey } },
          });
          if (!mt) return { ...base, description: `指派任務 ${d.missionKey}`, warning: `mission_key "${d.missionKey}" 不存在` };
          if (!mt.is_active) return { ...base, description: `指派任務 ${d.missionKey}`, warning: `mission_key "${d.missionKey}" 已停用` };
          return { ...base, description: `指派任務 ${d.missionKey}: ${mt.name}` };
        }
        case 'streak-increment-node':
          if (!oa?.product_id) return { ...base, description: `連續天數 +1 (${d.streakKey ?? ''})`, warning: 'OA 未綁定產品' };
          return { ...base, description: `連續天數 +1 (${d.streakKey ?? '(未設)'})`, warning: d.streakKey ? undefined : 'streakKey 未設定' };
        case 'set-attribute-node':
          return {
            ...base,
            description: `設定屬性 ${d.attributeKey ?? '(未設)'}=${d.value ?? ''}`,
            warning: d.attributeKey ? undefined : 'attributeKey 未設定',
          };
        default:
          return { ...base, description: `(未知節點類型 ${node.type})`, warning: '未知節點類型' };
      }
    };

    const pushNodes = findPushNodesForDay(nodes, edges, daysSinceEnrollment);
    const aiNodes = findAiSkillNodesForDay(nodes, edges, daysSinceEnrollment);
    const missionNodes = findMissionAssignNodesForDay(nodes, edges, daysSinceEnrollment);
    const streakNodes = findStreakIncrementNodesForDay(nodes, edges, daysSinceEnrollment);
    const attrNodes = findSetAttributeNodesForDay(nodes, edges, daysSinceEnrollment);

    const all = [...pushNodes, ...aiNodes, ...missionNodes, ...streakNodes, ...attrNodes];
    if (all.length === 0) {
      notes.push(`劇本「${enr.scenario.name}」: 第 ${daysSinceEnrollment} 天無動作節點`);
    }
    for (const n of all) {
      actions.push(await describe(n, daysSinceEnrollment));
    }
  }

  return { user_id: userId, as_of: now.toISOString(), actions, notes };
}
