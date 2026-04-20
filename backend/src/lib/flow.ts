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
