import type { ScenarioFlowNode, ScenarioFlowEdge, ScenarioNodeType } from '../../../../../types';

export interface DayGroup {
  dayNodeId: string;
  day: number;
  label: string;
  actions: ScenarioFlowNode[];
}

// Action-type node types — everything except day-node.
const ACTION_TYPES: ReadonlySet<ScenarioNodeType> = new Set<ScenarioNodeType>([
  'push-message-node',
  'ai-skill-node',
  'menu-change-node',
  'mission-assign-node',
  'streak-increment-node',
  'set-attribute-node',
]);

/**
 * Build the list-view projection. Each DayGroup represents one day-node
 * and all action nodes reachable from it by a single edge. Orphan action
 * nodes (no incoming edge from any day-node) are dropped — they can't be
 * represented in list view, and the scheduler ignores them anyway.
 *
 * When two day-nodes share the same `day` number, each becomes its own
 * DayGroup; the UI sorts by `day` then by insertion order.
 *
 * If the same action node is targeted by multiple day-nodes (a power-user
 * case from the graph editor), it appears under the FIRST day-node only,
 * preserving the invariant that fromListModel emits exactly one edge per
 * action. The other day-node's reference to it is dropped on round-trip.
 */
export function toListModel(nodes: ScenarioFlowNode[], edges: ScenarioFlowEdge[]): DayGroup[] {
  const dayNodes = nodes.filter(n => n.type === 'day-node');
  const byId = new Map(nodes.map(n => [n.id, n]));

  const claimedActionIds = new Set<string>();
  const groups: DayGroup[] = [];

  // Preserve insertion order from source array
  for (const dayNode of dayNodes) {
    const day = typeof dayNode.data?.day === 'number' ? dayNode.data.day : 0;
    const label = typeof dayNode.data?.label === 'string' ? dayNode.data.label : `Day ${day}`;
    const actions: ScenarioFlowNode[] = [];
    for (const e of edges) {
      if (e.source !== dayNode.id) continue;
      if (claimedActionIds.has(e.target)) continue;
      const target = byId.get(e.target);
      if (!target || !target.type || !ACTION_TYPES.has(target.type)) continue;
      actions.push(target);
      claimedActionIds.add(target.id);
    }
    groups.push({ dayNodeId: dayNode.id, day, label, actions });
  }

  // Sort by day ascending, then by existing order for ties
  const indexed = groups.map((g, i) => ({ g, i }));
  indexed.sort((a, b) => a.g.day === b.g.day ? a.i - b.i : a.g.day - b.g.day);
  return indexed.map(x => x.g);
}

/**
 * Emit flow_nodes and flow_edges from a list-view model. Deterministic:
 * day-nodes come first in the node array, followed by all action nodes
 * in the order they appear within their day group.
 *
 * Caller is responsible for assigning unique IDs to newly-added days and
 * actions — typically via `genId()` below. Positions are auto-laid-out
 * so that the same scenario, opened in the Wizard, renders as a
 * left-to-right tree without manual dragging.
 */
export function fromListModel(days: DayGroup[]): {
  nodes: ScenarioFlowNode[];
  edges: ScenarioFlowEdge[];
} {
  const nodes: ScenarioFlowNode[] = [];
  const edges: ScenarioFlowEdge[] = [];

  days.forEach((g, rowIdx) => {
    const dayNode: ScenarioFlowNode = {
      id: g.dayNodeId,
      type: 'day-node',
      position: { x: 80, y: 80 + rowIdx * 220 },
      data: { day: g.day, label: g.label },
    };
    nodes.push(dayNode);
    g.actions.forEach((a, colIdx) => {
      nodes.push({
        ...a,
        position: a.position ?? { x: 320 + colIdx * 260, y: 80 + rowIdx * 220 },
      });
      edges.push({
        id: `${g.dayNodeId}-${a.id}`,
        source: g.dayNodeId,
        target: a.id,
      });
    });
  });

  return { nodes, edges };
}

/**
 * Small id generator. The existing Wizard uses `crypto.randomUUID()` for
 * node ids; we keep the same scheme so round-tripping stays consistent.
 * Falls back to a Math.random-based id for environments without crypto
 * (e.g. older jsdom in unit tests) — unit-only, not a security concern.
 */
export function genId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
