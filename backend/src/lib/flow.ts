/**
 * Pure flow-graph helpers used by the scheduler. Keeping them free of DB
 * and LINE SDK coupling so they're unit-testable.
 */

export interface FlowNode {
  id: string;
  type?: string;
  data?: {
    // day-node
    day?: number;
    label?: string;
    // push-message-node
    type?: 'text' | 'image' | 'sticker' | 'flex';
    message?: string;
    imageUrl?: string;
    previewUrl?: string;
    stickerPackageId?: string;
    stickerId?: string;
    contentKey?: string;
    // flex: raw JSON string of the FlexContainer (bubble or carousel).
    // altText defaults to `message` (which doubles as the notification text).
    flexContents?: string;
    // ai-skill-node
    agentId?: string;
    // menu-change-node
    menuName?: string;
    // mission-assign-node
    missionKey?: string;
    // streak-increment-node
    streakKey?: string;
    // set-attribute-node
    attributeKey?: string;
    value?: string;
  };
}

export interface FlowEdge {
  source: string;
  target: string;
}

/**
 * Shared helper: given a scenario's flow graph, a target day, and a node
 * type, return every node of that type reachable by a single directed
 * edge from any day-node whose data.day matches. Deduplicated.
 */
function findActionNodesForDay(
  nodes: FlowNode[],
  edges: FlowEdge[],
  day: number,
  targetType: string,
): FlowNode[] {
  const dayNodeIds = nodes.filter(n => n.type === 'day-node' && n.data?.day === day).map(n => n.id);
  if (dayNodeIds.length === 0) return [];
  const targetIds = new Set(edges.filter(e => dayNodeIds.includes(e.source)).map(e => e.target));
  const seen = new Set<string>();
  const result: FlowNode[] = [];
  for (const n of nodes) {
    if (n.type === targetType && targetIds.has(n.id) && !seen.has(n.id)) {
      seen.add(n.id);
      result.push(n);
    }
  }
  return result;
}

/**
 * Given a scenario's flow graph and a target day number, return every
 * push-message-node reachable by a single directed edge from any matching
 * day-node. De-duplicates results when multiple day-nodes point to the
 * same push-node.
 */
export function findPushNodesForDay(nodes: FlowNode[], edges: FlowEdge[], day: number): FlowNode[] {
  return findActionNodesForDay(nodes, edges, day, 'push-message-node');
}

/**
 * Like findPushNodesForDay but for ai-skill-nodes. Used by the scheduler
 * to trigger AI-generated push messages on Day N.
 */
export function findAiSkillNodesForDay(nodes: FlowNode[], edges: FlowEdge[], day: number): FlowNode[] {
  return findActionNodesForDay(nodes, edges, day, 'ai-skill-node');
}

/**
 * Returns mission-assign-nodes the scheduler should assign on Day N.
 * Each node's data.missionKey is resolved against the OA's bound product.
 */
export function findMissionAssignNodesForDay(nodes: FlowNode[], edges: FlowEdge[], day: number): FlowNode[] {
  return findActionNodesForDay(nodes, edges, day, 'mission-assign-node');
}

/**
 * Returns streak-increment-nodes the scheduler should bump on Day N.
 * Each node's data.streakKey names the per-(product, user) counter to
 * advance; the call is idempotent per-day via the streak's tz logic.
 */
export function findStreakIncrementNodesForDay(nodes: FlowNode[], edges: FlowEdge[], day: number): FlowNode[] {
  return findActionNodesForDay(nodes, edges, day, 'streak-increment-node');
}

/**
 * Returns set-attribute-nodes the scheduler should apply on Day N. Each
 * node has data.attributeKey + data.value; the call goes through the
 * hook-bearing setter so mission auto-complete fires.
 */
export function findSetAttributeNodesForDay(nodes: FlowNode[], edges: FlowEdge[], day: number): FlowNode[] {
  return findActionNodesForDay(nodes, edges, day, 'set-attribute-node');
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
  if (t === 'flex') {
    if (!data?.flexContents) return null;
    const parsed = tryParseFlex(data.flexContents);
    if (!parsed) return null;
    return {
      type: 'flex',
      altText: data.message || 'Flex message',
      contents: parsed,
    };
  }
  return null;
}

/**
 * Parse a flex contents JSON string and verify it's a plausible LINE
 * FlexContainer (bubble or carousel). Returns null on parse failure or
 * invalid shape. Does not deep-validate — LINE's own validation will
 * catch anything we don't. Kept loose so new flex features don't
 * require our code to keep up.
 */
export function tryParseFlex(raw: string): import('@line/bot-sdk').FlexContainer | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as { type?: unknown };
  if (obj.type !== 'bubble' && obj.type !== 'carousel') return null;
  return parsed as import('@line/bot-sdk').FlexContainer;
}

/**
 * Convert a ContentItem row into a LINE Message. Callers that need to
 * send a message resolved by content_key (scheduler push, intent reply)
 * should funnel through here so text/flex/etc. are treated uniformly.
 * Returns null for items that can't be rendered (inactive, empty body,
 * malformed flex JSON).
 */
export interface ContentItemShape {
  type?: string;
  title?: string | null;
  body?: string | null;
  is_active?: boolean;
}

export function contentItemToMessage(item: ContentItemShape): import('@line/bot-sdk').Message | null {
  if (!item.is_active) return null;
  const type = item.type || 'text';
  if (type === 'text') {
    if (!item.body) return null;
    return { type: 'text', text: item.body };
  }
  if (type === 'flex') {
    if (!item.body) return null;
    const parsed = tryParseFlex(item.body);
    if (!parsed) return null;
    return {
      type: 'flex',
      altText: item.title || 'Flex message',
      contents: parsed,
    };
  }
  // Unknown type — fall back to text if body is present. Keeps old
  // scenarios working if ops sets an unrecognized type by mistake.
  if (item.body) return { type: 'text', text: item.body };
  return null;
}
