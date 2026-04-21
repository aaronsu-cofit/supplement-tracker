import { describe, it, expect } from 'vitest';
import { findMatchingRule, type IntentRuleRow } from './intent.js';

function rule(overrides: Partial<IntentRuleRow>): IntentRuleRow {
  return {
    id: 'r1',
    name: 'rule',
    priority: 100,
    match_type: 'keyword',
    patterns: ['預約'],
    action_type: 'reply_content',
    action_config: { content_key: 'welcome' },
    is_active: true,
    ...overrides,
  };
}

describe('findMatchingRule', () => {
  it('returns null when no rule matches', () => {
    const result = findMatchingRule('hello world', [rule({})]);
    expect(result).toBeNull();
  });

  it('matches keyword as case-insensitive substring', () => {
    const result = findMatchingRule('我想預約看診', [rule({ patterns: ['預約'] })]);
    expect(result?.ruleId).toBe('r1');
  });

  it('respects priority order — lower priority number wins', () => {
    const rules: IntentRuleRow[] = [
      rule({ id: 'b', priority: 200, patterns: ['預約'] }),
      rule({ id: 'a', priority: 50, patterns: ['預約'] }),
    ];
    // caller must pass rules pre-sorted; simulate DB sort
    rules.sort((x, y) => x.priority - y.priority);
    const result = findMatchingRule('我想預約', rules);
    expect(result?.ruleId).toBe('a');
  });

  it('skips inactive rules', () => {
    const rules: IntentRuleRow[] = [
      rule({ id: 'off', priority: 10, is_active: false, patterns: ['預約'] }),
      rule({ id: 'on', priority: 20, patterns: ['預約'] }),
    ];
    const result = findMatchingRule('我想預約', rules);
    expect(result?.ruleId).toBe('on');
  });

  it('supports exact match type', () => {
    const r = rule({ match_type: 'exact', patterns: ['Hi'] });
    expect(findMatchingRule('Hi', [r])?.ruleId).toBe('r1');
    expect(findMatchingRule('  hi  ', [r])?.ruleId).toBe('r1');
    expect(findMatchingRule('Hi there', [r])).toBeNull();
  });

  it('supports regex match type and ignores invalid regex', () => {
    const ok = rule({ match_type: 'regex', patterns: ['^\\s*(hi|hello)\\s*$'] });
    expect(findMatchingRule('hello', [ok])?.ruleId).toBe('r1');
    expect(findMatchingRule('say hello', [ok])).toBeNull();

    const bad = rule({ match_type: 'regex', patterns: ['[invalid'] });
    expect(findMatchingRule('anything', [bad])).toBeNull();
  });

  it('ignores non-string patterns without throwing', () => {
    const r = rule({ patterns: [null as unknown as string, 42 as unknown as string, '預約'] });
    expect(findMatchingRule('我想預約', [r])?.ruleId).toBe('r1');
  });

  it('returns the action_type and action_config from the matched rule', () => {
    const r = rule({
      patterns: ['睡眠'],
      action_type: 'set_attribute',
      action_config: { key: 'primary_concern', value: 'sleep', reply_content_key: 'sleep_intro' },
    });
    const actual = findMatchingRule('我睡眠不好', [r]);
    expect(actual?.actionType).toBe('set_attribute');
    expect(actual?.actionConfig).toEqual({
      key: 'primary_concern',
      value: 'sleep',
      reply_content_key: 'sleep_intro',
    });
  });

  it('passes through mission action configs untouched', () => {
    const r = rule({
      patterns: ['我完成了'],
      action_type: 'complete_mission',
      action_config: { mission_key: 'drink_water_day1', reply_content_key: 'well_done' },
    });
    const actual = findMatchingRule('我完成了今天的喝水任務', [r]);
    expect(actual?.actionType).toBe('complete_mission');
    expect(actual?.actionConfig).toEqual({
      mission_key: 'drink_water_day1',
      reply_content_key: 'well_done',
    });
  });
});
