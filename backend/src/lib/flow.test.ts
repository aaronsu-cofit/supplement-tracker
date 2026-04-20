import { describe, it, expect } from 'vitest';
import {
  findPushNodesForDay,
  findAiSkillNodesForDay,
  findActiveAgentForDay,
  buildLineMessage,
  type FlowNode,
  type FlowEdge,
} from './flow.js';

describe('findPushNodesForDay', () => {
  const nodes: FlowNode[] = [
    { id: 'd0', type: 'day-node', data: { day: 0 } },
    { id: 'd1', type: 'day-node', data: { day: 1 } },
    { id: 'd1b', type: 'day-node', data: { day: 1 } },
    { id: 'p1', type: 'push-message-node', data: { type: 'text', message: 'Day 0 msg' } },
    { id: 'p2', type: 'push-message-node', data: { type: 'text', message: 'Day 1 msg A' } },
    { id: 'p3', type: 'push-message-node', data: { type: 'text', message: 'Day 1 msg B' } },
    { id: 'm1', type: 'menu-change-node', data: {} }, // should NOT be returned
    { id: 'orphan', type: 'push-message-node', data: { type: 'text', message: 'orphan' } },
  ];
  const edges: FlowEdge[] = [
    { source: 'd0', target: 'p1' },
    { source: 'd1', target: 'p2' },
    { source: 'd1b', target: 'p2' }, // both d1 and d1b → p2 (de-dup case)
    { source: 'd1', target: 'p3' },
    { source: 'd0', target: 'm1' }, // day → menu node (wrong type, ignored)
  ];

  it('returns the push-node connected to the matching day', () => {
    const result = findPushNodesForDay(nodes, edges, 0);
    expect(result.map(n => n.id)).toEqual(['p1']);
  });

  it('returns multiple push-nodes for a day with multiple branches', () => {
    const result = findPushNodesForDay(nodes, edges, 1);
    expect(result.map(n => n.id).sort()).toEqual(['p2', 'p3']);
  });

  it('de-duplicates when two day-nodes with the same day both point to the same push-node', () => {
    const result = findPushNodesForDay(nodes, edges, 1);
    const p2Count = result.filter(n => n.id === 'p2').length;
    expect(p2Count).toBe(1);
  });

  it('returns empty when no day-node matches', () => {
    const result = findPushNodesForDay(nodes, edges, 99);
    expect(result).toEqual([]);
  });

  it('ignores non-push-message-node targets (e.g., menu-change-node)', () => {
    const result = findPushNodesForDay(nodes, edges, 0);
    expect(result.find(n => n.id === 'm1')).toBeUndefined();
  });

  it('ignores orphan push-nodes not connected to any day-node', () => {
    const allResults = [0, 1, 2, 3].flatMap(d => findPushNodesForDay(nodes, edges, d));
    expect(allResults.find(n => n.id === 'orphan')).toBeUndefined();
  });

  it('handles empty nodes array', () => {
    expect(findPushNodesForDay([], [], 0)).toEqual([]);
  });

  it('handles nodes with no matching edges', () => {
    const isolatedNodes: FlowNode[] = [
      { id: 'd', type: 'day-node', data: { day: 0 } },
      { id: 'p', type: 'push-message-node', data: { type: 'text', message: 'hi' } },
    ];
    expect(findPushNodesForDay(isolatedNodes, [], 0)).toEqual([]);
  });
});

describe('findAiSkillNodesForDay', () => {
  const nodes: FlowNode[] = [
    { id: 'd0', type: 'day-node', data: { day: 0 } },
    { id: 'd3', type: 'day-node', data: { day: 3 } },
    { id: 'ai1', type: 'ai-skill-node', data: { agentId: 'onboarding_bot', prompt: 'welcome' } },
    { id: 'ai2', type: 'ai-skill-node', data: { agentId: 'nutrition_analyst', prompt: 'check in' } },
    { id: 'p1', type: 'push-message-node', data: { type: 'text', message: 'hi' } },
  ];
  const edges: FlowEdge[] = [
    { source: 'd0', target: 'ai1' },
    { source: 'd0', target: 'p1' },
    { source: 'd3', target: 'ai2' },
  ];

  it('returns ai-skill-node connected to matching day', () => {
    expect(findAiSkillNodesForDay(nodes, edges, 0).map(n => n.id)).toEqual(['ai1']);
    expect(findAiSkillNodesForDay(nodes, edges, 3).map(n => n.id)).toEqual(['ai2']);
  });

  it('ignores non-ai-skill targets', () => {
    const result = findAiSkillNodesForDay(nodes, edges, 0);
    expect(result.find(n => n.id === 'p1')).toBeUndefined();
  });

  it('returns empty when no day matches', () => {
    expect(findAiSkillNodesForDay(nodes, edges, 99)).toEqual([]);
  });
});

describe('findActiveAgentForDay', () => {
  const nodes: FlowNode[] = [
    { id: 'd0', type: 'day-node', data: { day: 0 } },
    { id: 'd3', type: 'day-node', data: { day: 3 } },
    { id: 'd7', type: 'day-node', data: { day: 7 } },
    { id: 'ai_onboarding', type: 'ai-skill-node', data: { agentId: 'onboarding_bot' } },
    { id: 'ai_nutrition', type: 'ai-skill-node', data: { agentId: 'nutrition_analyst' } },
    { id: 'ai_coach', type: 'ai-skill-node', data: { agentId: 'coach_bot' } },
  ];
  const edges: FlowEdge[] = [
    { source: 'd0', target: 'ai_onboarding' },
    { source: 'd3', target: 'ai_nutrition' },
    { source: 'd7', target: 'ai_coach' },
  ];

  it('returns agent for exact day match', () => {
    expect(findActiveAgentForDay(nodes, edges, 0)).toBe('onboarding_bot');
    expect(findActiveAgentForDay(nodes, edges, 3)).toBe('nutrition_analyst');
    expect(findActiveAgentForDay(nodes, edges, 7)).toBe('coach_bot');
  });

  it('returns agent from most recent day ≤ target', () => {
    expect(findActiveAgentForDay(nodes, edges, 1)).toBe('onboarding_bot'); // between 0 and 3
    expect(findActiveAgentForDay(nodes, edges, 5)).toBe('nutrition_analyst'); // between 3 and 7
    expect(findActiveAgentForDay(nodes, edges, 100)).toBe('coach_bot'); // far past
  });

  it('returns null when no day ≤ target', () => {
    const futureOnly: FlowNode[] = [
      { id: 'd10', type: 'day-node', data: { day: 10 } },
      { id: 'ai', type: 'ai-skill-node', data: { agentId: 'future_bot' } },
    ];
    const futureEdges: FlowEdge[] = [{ source: 'd10', target: 'ai' }];
    expect(findActiveAgentForDay(futureOnly, futureEdges, 5)).toBeNull();
  });

  it('returns null when day has no connected ai-skill-node', () => {
    const onlyPush: FlowNode[] = [
      { id: 'd0', type: 'day-node', data: { day: 0 } },
      { id: 'p', type: 'push-message-node', data: { type: 'text', message: 'hi' } },
    ];
    const pushEdges: FlowEdge[] = [{ source: 'd0', target: 'p' }];
    expect(findActiveAgentForDay(onlyPush, pushEdges, 0)).toBeNull();
  });

  it('ignores ai-skill-node with no agentId', () => {
    const broken: FlowNode[] = [
      { id: 'd0', type: 'day-node', data: { day: 0 } },
      { id: 'ai', type: 'ai-skill-node', data: {} },
    ];
    const brokenEdges: FlowEdge[] = [{ source: 'd0', target: 'ai' }];
    expect(findActiveAgentForDay(broken, brokenEdges, 0)).toBeNull();
  });
});

describe('buildLineMessage', () => {
  it('builds text message', () => {
    expect(buildLineMessage({ type: 'text', message: 'hello' })).toEqual({
      type: 'text',
      text: 'hello',
    });
  });

  it('defaults to text when type is omitted', () => {
    expect(buildLineMessage({ message: 'no type field' })).toEqual({
      type: 'text',
      text: 'no type field',
    });
  });

  it('returns null for text with no message', () => {
    expect(buildLineMessage({ type: 'text', message: '' })).toBeNull();
    expect(buildLineMessage({ type: 'text' })).toBeNull();
  });

  it('builds image message using previewUrl when provided', () => {
    expect(
      buildLineMessage({
        type: 'image',
        imageUrl: 'https://a.com/full.jpg',
        previewUrl: 'https://a.com/thumb.jpg',
      }),
    ).toEqual({
      type: 'image',
      originalContentUrl: 'https://a.com/full.jpg',
      previewImageUrl: 'https://a.com/thumb.jpg',
    });
  });

  it('builds image message falling back to imageUrl when previewUrl omitted', () => {
    expect(
      buildLineMessage({ type: 'image', imageUrl: 'https://a.com/full.jpg' }),
    ).toEqual({
      type: 'image',
      originalContentUrl: 'https://a.com/full.jpg',
      previewImageUrl: 'https://a.com/full.jpg',
    });
  });

  it('returns null for image with no URL', () => {
    expect(buildLineMessage({ type: 'image' })).toBeNull();
    expect(buildLineMessage({ type: 'image', imageUrl: '' })).toBeNull();
  });

  it('builds sticker message', () => {
    expect(
      buildLineMessage({ type: 'sticker', stickerPackageId: '446', stickerId: '1988' }),
    ).toEqual({
      type: 'sticker',
      packageId: '446',
      stickerId: '1988',
    });
  });

  it('returns null for sticker with missing packageId or stickerId', () => {
    expect(buildLineMessage({ type: 'sticker', stickerPackageId: '446' })).toBeNull();
    expect(buildLineMessage({ type: 'sticker', stickerId: '1988' })).toBeNull();
    expect(buildLineMessage({ type: 'sticker' })).toBeNull();
  });

  it('returns null for undefined data', () => {
    expect(buildLineMessage(undefined)).toBeNull();
  });
});
