import { describe, it, expect } from 'vitest';
import {
  nextStreakState,
  matchesStreakCriteria,
  matchesMissionCriteria,
  type StreakState,
} from './gamification.js';
import type { BadgeCriteria } from '../types.js';

function day(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

describe('nextStreakState', () => {
  it('starts a fresh streak when there is no prior record', () => {
    const prev: StreakState = { count_current: 0, count_best: 0, last_occurred_on: null };
    const r = nextStreakState(prev, day('2026-04-21'));
    expect(r.changed).toBe(true);
    expect(r.reached).toBe(1);
    expect(r.next.count_current).toBe(1);
    expect(r.next.count_best).toBe(1);
    expect(r.next.last_occurred_on).toEqual(day('2026-04-21'));
  });

  it('is idempotent on the same day (does not bump)', () => {
    const prev: StreakState = { count_current: 3, count_best: 5, last_occurred_on: day('2026-04-21') };
    const r = nextStreakState(prev, day('2026-04-21'));
    expect(r.changed).toBe(false);
    expect(r.reached).toBe(3);
    expect(r.next).toEqual(prev);
  });

  it('continues the streak when yesterday was the last occurrence', () => {
    const prev: StreakState = { count_current: 3, count_best: 5, last_occurred_on: day('2026-04-20') };
    const r = nextStreakState(prev, day('2026-04-21'));
    expect(r.changed).toBe(true);
    expect(r.reached).toBe(4);
    expect(r.next.count_current).toBe(4);
    expect(r.next.count_best).toBe(5); // unchanged — still below best
  });

  it('updates count_best when current surpasses it', () => {
    const prev: StreakState = { count_current: 5, count_best: 5, last_occurred_on: day('2026-04-20') };
    const r = nextStreakState(prev, day('2026-04-21'));
    expect(r.next.count_current).toBe(6);
    expect(r.next.count_best).toBe(6);
  });

  it('resets to 1 when a day was skipped', () => {
    const prev: StreakState = { count_current: 7, count_best: 10, last_occurred_on: day('2026-04-18') };
    const r = nextStreakState(prev, day('2026-04-21')); // 3-day gap
    expect(r.changed).toBe(true);
    expect(r.reached).toBe(1);
    expect(r.next.count_current).toBe(1);
    expect(r.next.count_best).toBe(10); // preserved
  });

  it('resets to 1 when there is a 2-day gap (one missed day)', () => {
    const prev: StreakState = { count_current: 2, count_best: 2, last_occurred_on: day('2026-04-19') };
    const r = nextStreakState(prev, day('2026-04-21'));
    expect(r.reached).toBe(1);
  });
});

describe('matchesStreakCriteria', () => {
  const base: BadgeCriteria = { type: 'streak_reached', streak_key: 'daily', threshold: 7 };

  it('matches when key agrees and count >= threshold', () => {
    expect(matchesStreakCriteria(base, 'daily', 7)).toBe(true);
    expect(matchesStreakCriteria(base, 'daily', 10)).toBe(true);
  });

  it('does not match when count is below threshold', () => {
    expect(matchesStreakCriteria(base, 'daily', 6)).toBe(false);
  });

  it('does not match a different streak_key', () => {
    expect(matchesStreakCriteria(base, 'other', 7)).toBe(false);
  });

  it('does not match a mission_completed criteria', () => {
    const other: BadgeCriteria = { type: 'mission_completed', mission_key: 'm1' };
    expect(matchesStreakCriteria(other, 'anything', 100)).toBe(false);
  });
});

describe('matchesMissionCriteria', () => {
  const base: BadgeCriteria = { type: 'mission_completed', mission_key: 'hello' };

  it('matches when mission_key agrees', () => {
    expect(matchesMissionCriteria(base, 'hello')).toBe(true);
  });

  it('does not match a different mission_key', () => {
    expect(matchesMissionCriteria(base, 'world')).toBe(false);
  });

  it('does not match a streak_reached criteria', () => {
    const other: BadgeCriteria = { type: 'streak_reached', streak_key: 's', threshold: 1 };
    expect(matchesMissionCriteria(other, 'anything')).toBe(false);
  });
});
