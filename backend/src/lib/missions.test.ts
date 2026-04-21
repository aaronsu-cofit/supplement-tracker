import { describe, it, expect } from 'vitest';
import {
  matchesAutoCompleteRule,
  shouldCompleteFromProgress,
  parseCompleteActions,
} from './missions.js';

describe('matchesAutoCompleteRule', () => {
  it('returns false when rule is null/undefined', () => {
    expect(matchesAutoCompleteRule(null, 'any', 'val')).toBe(false);
    expect(matchesAutoCompleteRule(undefined, 'any', 'val')).toBe(false);
  });

  it('returns false when attribute_key does not match', () => {
    expect(matchesAutoCompleteRule({ attribute_key: 'other' }, 'any', 'val')).toBe(false);
  });

  it('returns true on attribute_key match when match_value is absent (any value counts)', () => {
    expect(matchesAutoCompleteRule({ attribute_key: 'primary' }, 'primary', 'anything')).toBe(true);
    expect(matchesAutoCompleteRule({ attribute_key: 'primary' }, 'primary', null)).toBe(true);
  });

  it('requires exact match_value when provided', () => {
    const rule = { attribute_key: 'primary', match_value: 'sleep' };
    expect(matchesAutoCompleteRule(rule, 'primary', 'sleep')).toBe(true);
    expect(matchesAutoCompleteRule(rule, 'primary', 'anxiety')).toBe(false);
    expect(matchesAutoCompleteRule(rule, 'primary', null)).toBe(false);
  });
});

describe('shouldCompleteFromProgress', () => {
  it('completes when current reaches target', () => {
    expect(shouldCompleteFromProgress(1, 1)).toBe(true);
    expect(shouldCompleteFromProgress(3, 3)).toBe(true);
    expect(shouldCompleteFromProgress(5, 3)).toBe(true);
  });

  it('does not complete before target', () => {
    expect(shouldCompleteFromProgress(0, 1)).toBe(false);
    expect(shouldCompleteFromProgress(2, 3)).toBe(false);
  });
});

describe('parseCompleteActions', () => {
  it('returns [] for non-array input', () => {
    expect(parseCompleteActions(null)).toEqual([]);
    expect(parseCompleteActions({})).toEqual([]);
    expect(parseCompleteActions('string')).toEqual([]);
  });

  it('passes through valid set_attribute and assign_mission entries', () => {
    const input = [
      { type: 'set_attribute', key: 'phase', value: 'done' },
      { type: 'assign_mission', mission_key: 'next' },
    ];
    expect(parseCompleteActions(input)).toEqual(input);
  });

  it('silently drops malformed entries', () => {
    const input = [
      { type: 'set_attribute', key: 'ok', value: 'yes' }, // kept
      null, // dropped
      { type: 'unknown_type', foo: 'bar' }, // dropped
      { type: 'set_attribute', key: 'no_value' }, // dropped (missing value)
      { type: 'assign_mission' }, // dropped (missing mission_key)
      { type: 'assign_mission', mission_key: 'chain' }, // kept
    ];
    expect(parseCompleteActions(input)).toEqual([
      { type: 'set_attribute', key: 'ok', value: 'yes' },
      { type: 'assign_mission', mission_key: 'chain' },
    ]);
  });

  it('rejects non-string value in set_attribute', () => {
    expect(parseCompleteActions([{ type: 'set_attribute', key: 'k', value: 42 }])).toEqual([]);
  });
});
