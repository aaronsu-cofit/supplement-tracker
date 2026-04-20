import {
  getActiveEnrollmentsForOA,
  getLineOAById,
  tryClaimDelivery,
  releaseDelivery,
} from './db.js';
import { withRetry } from './retry.js';
import { daysBetweenInTz } from './time.js';
import { findPushNodesForDay, buildLineMessage, type FlowNode, type FlowEdge } from './flow.js';

export interface SchedulerRunResult {
  sent: number;
  skipped: number;
  errors: string[];
  enrollmentsConsidered: number;
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
  const oaId = parseInt(process.env.LINE_OA_ID || '0');
  if (!oaId) {
    return {
      sent: 0,
      skipped: 0,
      errors: ['LINE_OA_ID env var is not set (should be the #id shown in /lineoamenu)'],
      enrollmentsConsidered: 0,
    };
  }

  const oa = await getLineOAById(oaId.toString());
  if (!oa) {
    return {
      sent: 0,
      skipped: 0,
      errors: [`LINE OA #${oaId} not found in DB — check LINE_OA_ID matches /lineoamenu`],
      enrollmentsConsidered: 0,
    };
  }

  const channelToken = oa.channel_access_token;
  if (!channelToken) {
    return {
      sent: 0,
      skipped: 0,
      errors: [`LINE OA #${oaId} has no channel_access_token — edit it in /lineoamenu`],
      enrollmentsConsidered: 0,
    };
  }

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
    if (pushNodes.length === 0) continue;

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
  }

  return { sent, skipped, errors, enrollmentsConsidered: enrollments.length };
}
