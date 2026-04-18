import { describe, it, expect } from 'vitest';
import { daysBetweenInTz } from './time.js';

describe('daysBetweenInTz', () => {
  it('returns 0 when from and to are the same local calendar day', () => {
    // 2026-04-18 01:00 UTC → 09:00 Asia/Taipei
    const from = new Date('2026-04-18T01:00:00Z');
    // 2026-04-18 15:00 UTC → 23:00 Asia/Taipei (same calendar day in Taipei)
    const to = new Date('2026-04-18T15:00:00Z');
    expect(daysBetweenInTz(from, to, 'Asia/Taipei')).toBe(0);
  });

  it('returns 1 when to is the next local calendar day', () => {
    // 2026-04-18 23:55 UTC → 07:55 local on 2026-04-19 in Asia/Taipei
    const from = new Date('2026-04-18T10:00:00Z'); // 2026-04-18 18:00 Taipei
    const to = new Date('2026-04-18T16:30:00Z'); // 2026-04-19 00:30 Taipei
    expect(daysBetweenInTz(from, to, 'Asia/Taipei')).toBe(1);
  });

  it('handles UTC timezone correctly', () => {
    const from = new Date('2026-04-18T23:00:00Z');
    const to = new Date('2026-04-19T01:00:00Z');
    expect(daysBetweenInTz(from, to, 'UTC')).toBe(1);
  });

  it('returns 0 for same-moment timestamps', () => {
    const d = new Date('2026-04-18T00:00:00Z');
    expect(daysBetweenInTz(d, d, 'Asia/Taipei')).toBe(0);
  });

  it('returns 7 across a full week', () => {
    const from = new Date('2026-04-11T05:00:00Z');
    const to = new Date('2026-04-18T05:00:00Z');
    expect(daysBetweenInTz(from, to, 'Asia/Taipei')).toBe(7);
  });

  it('crosses DST boundary without double-counting (America/New_York spring forward)', () => {
    // 2026-03-07 12:00 EST → 2026-03-08 12:00 EDT (skips 02:00-03:00)
    const from = new Date('2026-03-07T17:00:00Z'); // 12:00 EST
    const to = new Date('2026-03-08T16:00:00Z'); // 12:00 EDT
    expect(daysBetweenInTz(from, to, 'America/New_York')).toBe(1);
  });

  it('returns 0 for late-night follow at 23:55 local, evaluated at 00:05 local next clock day', () => {
    // User follows at 2026-04-18 23:55 Taipei = 2026-04-18 15:55 UTC
    const from = new Date('2026-04-18T15:55:00Z');
    // Scheduler runs at 2026-04-19 00:05 Taipei = 2026-04-18 16:05 UTC
    // That's a NEW calendar day in Taipei → 1 day later
    const to = new Date('2026-04-18T16:05:00Z');
    expect(daysBetweenInTz(from, to, 'Asia/Taipei')).toBe(1);
  });

  it('handles user-timezone off-by-one scenario: UTC midnight run vs Taipei user', () => {
    // User follows 2026-04-18 08:00 UTC = 2026-04-18 16:00 Taipei
    const from = new Date('2026-04-18T08:00:00Z');
    // Scheduler runs at 2026-04-19 00:00 UTC = 2026-04-19 08:00 Taipei
    // That's calendar day +1 in Taipei (user is now on Day 1)
    const to = new Date('2026-04-19T00:00:00Z');
    expect(daysBetweenInTz(from, to, 'Asia/Taipei')).toBe(1);
  });
});
