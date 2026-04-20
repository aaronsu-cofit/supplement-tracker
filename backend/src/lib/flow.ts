/**
 * Pure flow-graph helpers used by the scheduler. Keeping them free of DB
 * and LINE SDK coupling so they're unit-testable.
 */

export interface FlowNode {
  id: string;
  type?: string;
  data?: {
    day?: number;
    type?: 'text' | 'image' | 'sticker';
    message?: string;
    imageUrl?: string;
    previewUrl?: string;
    stickerPackageId?: string;
    stickerId?: string;
    // ai-skill-node fields
    agentId?: string;
  };
}

export interface FlowEdge {
  source: string;
  target: string;
}

/**
 * Given a scenario's flow graph and a target day number, return every
 * push-message-node reachable by a single directed edge from any matching
 * day-node. De-duplicates results when multiple day-nodes point to the
 * same push-node.
 */
export function findPushNodesForDay(nodes: FlowNode[], edges: FlowEdge[], day: number): FlowNode[] {
  const dayNodeIds = nodes.filter(n => n.type === 'day-node' && n.data?.day === day).map(n => n.id);
  if (dayNodeIds.length === 0) return [];
  const targetIds = new Set(
    edges.filter(e => dayNodeIds.includes(e.source)).map(e => e.target),
  );
  const seen = new Set<string>();
  const result: FlowNode[] = [];
  for (const n of nodes) {
    if (n.type === 'push-message-node' && targetIds.has(n.id) && !seen.has(n.id)) {
      seen.add(n.id);
      result.push(n);
    }
  }
  return result;
}

/**
 * Like findPushNodesForDay but for ai-skill-nodes. Used by the scheduler
 * to trigger AI-generated push messages on Day N.
 */
export function findAiSkillNodesForDay(nodes: FlowNode[], edges: FlowEdge[], day: number): FlowNode[] {
  const dayNodeIds = nodes.filter(n => n.type === 'day-node' && n.data?.day === day).map(n => n.id);
  if (dayNodeIds.length === 0) return [];
  const targetIds = new Set(edges.filter(e => dayNodeIds.includes(e.source)).map(e => e.target));
  const seen = new Set<string>();
  const result: FlowNode[] = [];
  for (const n of nodes) {
    if (n.type === 'ai-skill-node' && targetIds.has(n.id) && !seen.has(n.id)) {
      seen.add(n.id);
      result.push(n);
    }
  }
  return result;
}

/**
 * For A (per-phase routing): given a user's current day, walk backwards
 * through day-nodes (≤ target day) and return the agentId from the most
 * recent day-node that connects to an ai-skill-node. Null if none.
 */
export function findActiveAgentForDay(nodes: FlowNode[], edges: FlowEdge[], day: number): string | null {
  const dayNodesDesc = nodes
    .filter(n => n.type === 'day-node' && typeof n.data?.day === 'number' && (n.data.day as number) <= day)
    .sort((a, b) => ((b.data?.day as number) ?? 0) - ((a.data?.day as number) ?? 0));
  for (const dayNode of dayNodesDesc) {
    const targetIds = edges.filter(e => e.source === dayNode.id).map(e => e.target);
    for (const n of nodes) {
      if (n.type === 'ai-skill-node' && targetIds.includes(n.id) && n.data?.agentId) {
        return n.data.agentId;
      }
    }
  }
  return null;
}

/**
 * Build the LINE Messaging API message object from a push-message-node's
 * data. Returns null if required fields are missing for the selected type.
 */
export function buildLineMessage(data: FlowNode['data']): import('@line/bot-sdk').Message | null {
  const t = data?.type || 'text';
  if (t === 'text') {
    if (!data?.message) return null;
    return { type: 'text', text: data.message };
  }
  if (t === 'image') {
    if (!data?.imageUrl) return null;
    return {
      type: 'image',
      originalContentUrl: data.imageUrl,
      previewImageUrl: data.previewUrl || data.imageUrl,
    };
  }
  if (t === 'sticker') {
    if (!data?.stickerPackageId || !data?.stickerId) return null;
    return {
      type: 'sticker',
      packageId: data.stickerPackageId,
      stickerId: data.stickerId,
    };
  }
  return null;
}
