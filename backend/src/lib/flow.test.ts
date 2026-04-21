import { describe, it, expect } from 'vitest';
import {
  findPushNodesForDay,
  findAiSkillNodesForDay,
  findActiveAgentForDay,
  findMissionAssignNodesForDay,
  findStreakIncrementNodesForDay,
  findSetAttributeNodesForDay,
  buildLineMessage,
  tryParseFlex,
  contentItemToMessage,
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
    { id: 'ai1', type: 'ai-skill-node', data: { agentId: 'onboarding_bot' } },
    { id: 'ai2', type: 'ai-skill-node', data: { agentId: 'nutrition_analyst' } },
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

describe('findMissionAssignNodesForDay', () => {
  const nodes: FlowNode[] = [
    { id: 'd0', type: 'day-node', data: { day: 0 } },
    { id: 'd1', type: 'day-node', data: { day: 1 } },
    { id: 'm0', type: 'mission-assign-node', data: { missionKey: 'intro' } },
    { id: 'm1', type: 'mission-assign-node', data: { missionKey: 'day1_task' } },
    { id: 'p1', type: 'push-message-node', data: { type: 'text', message: 'hi' } },
  ];
  const edges: FlowEdge[] = [
    { source: 'd0', target: 'm0' },
    { source: 'd0', target: 'p1' }, // other type, must be filtered out
    { source: 'd1', target: 'm1' },
  ];

  it('returns mission-assign-nodes for the matching day', () => {
    expect(findMissionAssignNodesForDay(nodes, edges, 0).map(n => n.id)).toEqual(['m0']);
    expect(findMissionAssignNodesForDay(nodes, edges, 1).map(n => n.id)).toEqual(['m1']);
  });

  it('does not return push-nodes connected to the same day', () => {
    const r = findMissionAssignNodesForDay(nodes, edges, 0);
    expect(r.find(n => n.id === 'p1')).toBeUndefined();
  });

  it('returns empty for a day with no mission-assign-nodes', () => {
    expect(findMissionAssignNodesForDay(nodes, edges, 99)).toEqual([]);
  });
});

describe('findStreakIncrementNodesForDay', () => {
  const nodes: FlowNode[] = [
    { id: 'd1', type: 'day-node', data: { day: 1 } },
    { id: 'd1b', type: 'day-node', data: { day: 1 } },
    { id: 's1', type: 'streak-increment-node', data: { streakKey: 'daily_checkin' } },
  ];
  const edges: FlowEdge[] = [
    { source: 'd1', target: 's1' },
    { source: 'd1b', target: 's1' }, // duplicate day-nodes → same streak node; must dedupe
  ];

  it('de-duplicates when two day-nodes point to the same streak-node', () => {
    const r = findStreakIncrementNodesForDay(nodes, edges, 1);
    expect(r.filter(n => n.id === 's1').length).toBe(1);
  });
});

describe('findSetAttributeNodesForDay', () => {
  const nodes: FlowNode[] = [
    { id: 'd0', type: 'day-node', data: { day: 0 } },
    { id: 'a1', type: 'set-attribute-node', data: { attributeKey: 'onboarded', value: 'yes' } },
    { id: 'a2', type: 'set-attribute-node', data: { attributeKey: 'phase', value: 'intro' } },
  ];
  const edges: FlowEdge[] = [
    { source: 'd0', target: 'a1' },
    { source: 'd0', target: 'a2' },
  ];

  it('returns all set-attribute-nodes for the matching day', () => {
    const r = findSetAttributeNodesForDay(nodes, edges, 0);
    expect(r.map(n => n.id).sort()).toEqual(['a1', 'a2']);
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

  it('builds flex message when flexContents parses to a bubble', () => {
    const result = buildLineMessage({
      type: 'flex',
      message: '通知文案',
      flexContents: JSON.stringify({ type: 'bubble', body: { type: 'box', layout: 'vertical', contents: [] } }),
    });
    expect(result).toEqual({
      type: 'flex',
      altText: '通知文案',
      contents: { type: 'bubble', body: { type: 'box', layout: 'vertical', contents: [] } },
    });
  });

  it('uses default altText when flex message has no text message', () => {
    const result = buildLineMessage({
      type: 'flex',
      flexContents: JSON.stringify({ type: 'carousel', contents: [] }),
    });
    expect(result).toEqual({
      type: 'flex',
      altText: 'Flex message',
      contents: { type: 'carousel', contents: [] },
    });
  });

  it('returns null for flex with invalid JSON', () => {
    expect(buildLineMessage({ type: 'flex', flexContents: '{ bad' })).toBeNull();
  });

  it('returns null for flex whose top-level type is not bubble/carousel', () => {
    expect(buildLineMessage({ type: 'flex', flexContents: JSON.stringify({ type: 'box' }) })).toBeNull();
  });

  it('returns null for flex with no flexContents', () => {
    expect(buildLineMessage({ type: 'flex' })).toBeNull();
  });
});

describe('tryParseFlex', () => {
  it('accepts a well-formed bubble', () => {
    const json = JSON.stringify({ type: 'bubble', body: { type: 'box', layout: 'vertical', contents: [] } });
    expect(tryParseFlex(json)).not.toBeNull();
  });

  it('accepts a well-formed carousel', () => {
    expect(tryParseFlex(JSON.stringify({ type: 'carousel', contents: [] }))).not.toBeNull();
  });

  it('rejects non-JSON', () => {
    expect(tryParseFlex('hello')).toBeNull();
  });

  it('rejects JSON whose top-level type is not bubble or carousel', () => {
    expect(tryParseFlex(JSON.stringify({ type: 'text' }))).toBeNull();
    expect(tryParseFlex(JSON.stringify({ type: 'box' }))).toBeNull();
  });

  it('rejects non-object JSON (arrays, primitives)', () => {
    expect(tryParseFlex('[]')).toBeNull();
    expect(tryParseFlex('"str"')).toBeNull();
    expect(tryParseFlex('42')).toBeNull();
  });
});

describe('contentItemToMessage', () => {
  it('returns null for inactive items', () => {
    expect(contentItemToMessage({ type: 'text', body: 'hi', is_active: false })).toBeNull();
  });

  it('builds a text message for type=text with body', () => {
    expect(contentItemToMessage({ type: 'text', body: 'hello', is_active: true })).toEqual({
      type: 'text',
      text: 'hello',
    });
  });

  it('returns null for type=text with empty body', () => {
    expect(contentItemToMessage({ type: 'text', body: '', is_active: true })).toBeNull();
    expect(contentItemToMessage({ type: 'text', is_active: true })).toBeNull();
  });

  it('builds a flex message for type=flex with valid JSON body, using title as altText', () => {
    const body = JSON.stringify({ type: 'bubble', body: { type: 'box', layout: 'vertical', contents: [] } });
    expect(contentItemToMessage({ type: 'flex', title: '新訊息', body, is_active: true })).toEqual({
      type: 'flex',
      altText: '新訊息',
      contents: { type: 'bubble', body: { type: 'box', layout: 'vertical', contents: [] } },
    });
  });

  it('falls back to generic altText when title is missing', () => {
    const body = JSON.stringify({ type: 'bubble', body: { type: 'box', layout: 'vertical', contents: [] } });
    const msg = contentItemToMessage({ type: 'flex', body, is_active: true });
    expect(msg && 'altText' in msg && msg.altText).toBe('Flex message');
  });

  it('returns null for type=flex with malformed body', () => {
    expect(contentItemToMessage({ type: 'flex', body: 'not-json', is_active: true })).toBeNull();
  });

  it('falls back to text when type is unknown but body is present', () => {
    expect(contentItemToMessage({ type: 'card', body: 'fallback', is_active: true })).toEqual({
      type: 'text',
      text: 'fallback',
    });
  });
});
