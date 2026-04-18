import {
  getLineUsers,
  getActiveScenariosForOA,
  tryClaimDelivery,
  releaseDelivery,
} from './db.js';
import { withRetry } from './retry.js';

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
  usersConsidered: number;
  scenariosConsidered: number;
}

/**
 * Compute calendar-day difference between `from` and `to` evaluated in the
 * given IANA timezone. Example: if from=2026-01-01T23:00 UTC and
 * to=2026-01-02T01:00 UTC with tz=Asia/Taipei (UTC+8), both are 2026-01-02
 * local → returns 0. Robust against DST and offset edges.
 */
function daysBetweenInTz(from: Date, to: Date, tz: string): number {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const toYmd = (d: Date) => {
    const parts = fmt.formatToParts(d);
    const y = parts.find(p => p.type === 'year')!.value;
    const m = parts.find(p => p.type === 'month')!.value;
    const day = parts.find(p => p.type === 'day')!.value;
    return Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(day));
  };
  return Math.floor((toYmd(to) - toYmd(from)) / (24 * 60 * 60 * 1000));
}

/**
 * Runs the push-message scheduler once. For each LINE user, computes days
 * since follow — evaluated as calendar days in the user's timezone (not
 * raw elapsed 24-hour periods in UTC). For each active scenario matching
 * the configured LINE_OA_ID (or 'default'), finds day-nodes with data.day
 * equal to that user's day count, follows outgoing edges, and pushes any
 * connected push-message-nodes via the LINE Messaging API. Delivery is
 * recorded so the same (user, scenario, node) combination is never sent twice.
 */
export async function runScheduler(now: Date = new Date()): Promise<SchedulerRunResult> {
  const oaId = parseInt(process.env.LINE_OA_ID || '0');
  const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

  if (!oaId || !channelToken) {
    return {
      sent: 0,
      skipped: 0,
      errors: ['LINE_OA_ID or LINE_CHANNEL_ACCESS_TOKEN is not configured'],
      usersConsidered: 0,
      scenariosConsidered: 0,
    };
  }

  const [users, scenarios] = await Promise.all([
    getLineUsers(),
    getActiveScenariosForOA(oaId),
  ]);

  if (scenarios.length === 0 || users.length === 0) {
    return { sent: 0, skipped: 0, errors: [], usersConsidered: users.length, scenariosConsidered: scenarios.length };
  }

  const { Client } = await import('@line/bot-sdk');
  const client = new Client({ channelAccessToken: channelToken });

  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const user of users) {
    const daysSinceFollow = daysBetweenInTz(user.created_at, now, user.timezone || 'Asia/Taipei');

    for (const scenario of scenarios) {
      const nodes: FlowNode[] = Array.isArray(scenario.flow_nodes) ? (scenario.flow_nodes as unknown as FlowNode[]) : [];
      const edges: FlowEdge[] = Array.isArray(scenario.flow_edges) ? (scenario.flow_edges as unknown as FlowEdge[]) : [];

      const dayNodes = nodes.filter(n => n.type === 'day-node' && n.data?.day === daysSinceFollow);
      if (dayNodes.length === 0) continue;

      for (const dayNode of dayNodes) {
        const targetIds = edges.filter(e => e.source === dayNode.id).map(e => e.target);
        const pushNodes = nodes.filter(
          n => targetIds.includes(n.id) && n.type === 'push-message-node' && n.data?.message,
        );

        for (const pushNode of pushNodes) {
          const claimed = await tryClaimDelivery(user.id, scenario.id, pushNode.id);
          if (!claimed) { skipped++; continue; }

          try {
            await withRetry(
              () => client.pushMessage(user.id, { type: 'text', text: pushNode.data!.message! }),
              `pushMessage user=${user.id} node=${pushNode.id}`,
            );
            sent++;
          } catch (err) {
            await releaseDelivery(user.id, scenario.id, pushNode.id);
            const status = (err as { statusCode?: number })?.statusCode;
            errors.push(`user=${user.id} node=${pushNode.id} status=${status ?? '?'}: ${(err as Error).message}`);
          }
        }
      }
    }
  }

  return { sent, skipped, errors, usersConsidered: users.length, scenariosConsidered: scenarios.length };
}
