import { describe, it, expect } from 'vitest';
import {
  matchesTrigger,
  pickTransition,
  validatePhases,
  validateTransitions,
  type JourneyEvent,
} from './journey.js';
import type { JourneyTrigger, JourneyTransition, JourneyPhase } from '../types.js';

describe('matchesTrigger', () => {
  it('matches mission_completed on same mission_key', () => {
    const tr: JourneyTrigger = { type: 'mission_completed', mission_key: 'intro' };
    expect(matchesTrigger(tr, { type: 'mission_completed', key: 'intro' })).toBe(true);
    expect(matchesTrigger(tr, { type: 'mission_completed', key: 'other' })).toBe(false);
  });

  it('matches badge_earned on same badge_key', () => {
    const tr: JourneyTrigger = { type: 'badge_earned', badge_key: 'first_week' };
    expect(matchesTrigger(tr, { type: 'badge_earned', key: 'first_week' })).toBe(true);
    expect(matchesTrigger(tr, { type: 'badge_earned', key: 'other' })).toBe(false);
  });

  it('matches attribute_equals only when both key and value match', () => {
    const tr: JourneyTrigger = { type: 'attribute_equals', attribute_key: 'onboarded', value: 'yes' };
    expect(matchesTrigger(tr, { type: 'attribute_set', key: 'onboarded', value: 'yes' })).toBe(true);
    expect(matchesTrigger(tr, { type: 'attribute_set', key: 'onboarded', value: 'no' })).toBe(false);
    expect(matchesTrigger(tr, { type: 'attribute_set', key: 'other', value: 'yes' })).toBe(false);
  });

  it('rejects cross-type matches', () => {
    const missionTr: JourneyTrigger = { type: 'mission_completed', mission_key: 'x' };
    expect(matchesTrigger(missionTr, { type: 'badge_earned', key: 'x' })).toBe(false);
    expect(matchesTrigger(missionTr, { type: 'attribute_set', key: 'x', value: 'x' })).toBe(false);
  });
});

describe('pickTransition', () => {
  const event: JourneyEvent = { type: 'mission_completed', key: 'complete_day1' };

  it('returns null when nothing matches', () => {
    const ts: JourneyTransition[] = [
      { to_phase: 'active', trigger: { type: 'mission_completed', mission_key: 'other' } },
    ];
    expect(pickTransition(ts, 'onboarding', event)).toBeNull();
  });

  it('matches from_phase === undefined (from any phase, including null)', () => {
    const ts: JourneyTransition[] = [
      { to_phase: 'active', trigger: { type: 'mission_completed', mission_key: 'complete_day1' } },
    ];
    expect(pickTransition(ts, null, event)?.to_phase).toBe('active');
    expect(pickTransition(ts, 'onboarding', event)?.to_phase).toBe('active');
  });

  it('requires from_phase match when specified', () => {
    const ts: JourneyTransition[] = [
      { from_phase: 'onboarding', to_phase: 'active', trigger: { type: 'mission_completed', mission_key: 'complete_day1' } },
    ];
    expect(pickTransition(ts, 'onboarding', event)?.to_phase).toBe('active');
    expect(pickTransition(ts, 'active', event)).toBeNull();
    expect(pickTransition(ts, null, event)).toBeNull();
  });

  it('returns first match on order (specific before general)', () => {
    const ts: JourneyTransition[] = [
      { from_phase: 'onboarding', to_phase: 'fast_track', trigger: { type: 'mission_completed', mission_key: 'complete_day1' } },
      { to_phase: 'active', trigger: { type: 'mission_completed', mission_key: 'complete_day1' } },
    ];
    expect(pickTransition(ts, 'onboarding', event)?.to_phase).toBe('fast_track');
    expect(pickTransition(ts, 'active', event)?.to_phase).toBe('active');
  });
});

describe('validatePhases', () => {
  it('rejects empty array', () => {
    expect(validatePhases([])).toMatch(/非空陣列/);
  });

  it('rejects missing key', () => {
    expect(validatePhases([{ key: '', name: 'X' } as JourneyPhase])).toMatch(/phase\.key/);
  });

  it('rejects duplicate keys', () => {
    const phases: JourneyPhase[] = [
      { key: 'a', name: 'A' },
      { key: 'a', name: 'A2' },
    ];
    expect(validatePhases(phases)).toMatch(/重複/);
  });

  it('accepts a valid ordered list', () => {
    expect(validatePhases([{ key: 'onboarding', name: 'Onboarding' }, { key: 'active', name: 'Active' }])).toBeNull();
  });
});

describe('validateTransitions', () => {
  const phases: JourneyPhase[] = [
    { key: 'onboarding', name: 'A' },
    { key: 'active', name: 'B' },
  ];

  it('rejects to_phase not in phases', () => {
    const ts: JourneyTransition[] = [
      { to_phase: 'unknown', trigger: { type: 'mission_completed', mission_key: 'x' } },
    ];
    expect(validateTransitions(ts, phases)).toMatch(/to_phase/);
  });

  it('rejects from_phase not in phases', () => {
    const ts: JourneyTransition[] = [
      { from_phase: 'bogus', to_phase: 'active', trigger: { type: 'mission_completed', mission_key: 'x' } },
    ];
    expect(validateTransitions(ts, phases)).toMatch(/from_phase/);
  });

  it('rejects attribute_equals without value', () => {
    const ts: JourneyTransition[] = [
      { to_phase: 'active', trigger: { type: 'attribute_equals', attribute_key: 'a', value: undefined as unknown as string } },
    ];
    expect(validateTransitions(ts, phases)).toMatch(/value/);
  });

  it('accepts valid transitions', () => {
    const ts: JourneyTransition[] = [
      { to_phase: 'onboarding', trigger: { type: 'attribute_equals', attribute_key: 'onboarded', value: 'yes' } },
      { from_phase: 'onboarding', to_phase: 'active', trigger: { type: 'mission_completed', mission_key: 'day1_task' } },
      { from_phase: 'active', to_phase: 'active', trigger: { type: 'badge_earned', badge_key: 'seven_day' } },
    ];
    expect(validateTransitions(ts, phases)).toBeNull();
  });
});
