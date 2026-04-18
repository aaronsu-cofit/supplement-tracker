import {
  getActiveEnrollmentsForOA,
  tryClaimDelivery,
  releaseDelivery,
} from './db.js';
import { withRetry } from './retry.js';
import { daysBetweenInTz } from './time.js';

interface FlowNode {
  id: string;
  type?: string;
  data?: { day?: number; message?: string };
}

interface FlowEdge {
  source: string;
  target: string;
}

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
  const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

  if (!oaId || !channelToken) {
    return {
      sent: 0,
      skipped: 0,
      errors: ['LINE_OA_ID or LINE_CHANNEL_ACCESS_TOKEN is not configured'],
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

    const dayNodes = nodes.filter(n => n.type === 'day-node' && n.data?.day === daysSinceEnrollment);
    if (dayNodes.length === 0) continue;

    for (const dayNode of dayNodes) {
      const targetIds = edges.filter(e => e.source === dayNode.id).map(e => e.target);
      const pushNodes = nodes.filter(
        n => targetIds.includes(n.id) && n.type === 'push-message-node' && n.data?.message,
      );

      for (const pushNode of pushNodes) {
        const claimed = await tryClaimDelivery(userId, enr.scenario.id, pushNode.id);
        if (!claimed) { skipped++; continue; }

        try {
          await withRetry(
            () => client.pushMessage(userId, { type: 'text', text: pushNode.data!.message! }),
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
  }

  return { sent, skipped, errors, enrollmentsConsidered: enrollments.length };
}
