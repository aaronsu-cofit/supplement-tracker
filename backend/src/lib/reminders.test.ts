import { describe, it, expect } from 'vitest';
import {
  parseHhmm,
  shouldFireNow,
  currentLocalMinutes,
  defaultReminderText,
} from './reminders.js';

describe('parseHhmm', () => {
  it('parses HH:MM', () => {
    expect(parseHhmm('09:30')).toBe(9 * 60 + 30);
    expect(parseHhmm('00:00')).toBe(0);
    expect(parseHhmm('23:59')).toBe(23 * 60 + 59);
  });

  it('accepts single-digit hour', () => {
    expect(parseHhmm('9:05')).toBe(9 * 60 + 5);
  });

  it('rejects malformed / out-of-range', () => {
    expect(parseHhmm(null)).toBeNull();
    expect(parseHhmm(undefined)).toBeNull();
    expect(parseHhmm('')).toBeNull();
    expect(parseHhmm('nope')).toBeNull();
    expect(parseHhmm('25:00')).toBeNull();
    expect(parseHhmm('12:60')).toBeNull();
    expect(parseHhmm('12:5')).toBeNull();
  });
});

describe('shouldFireNow', () => {
  it('fires when target falls inside [current, current+window)', () => {
    // current=09:00, reminder=09:03, window=5 → fire
    expect(shouldFireNow(9 * 60, 9 * 60 + 3, 5)).toBe(true);
  });

  it('fires on the lower edge', () => {
    expect(shouldFireNow(9 * 60, 9 * 60, 5)).toBe(true);
  });

  it('does not fire on the upper edge (exclusive)', () => {
    expect(shouldFireNow(9 * 60, 9 * 60 + 5, 5)).toBe(false);
  });

  it('does not fire if reminder already past', () => {
    expect(shouldFireNow(9 * 60 + 10, 9 * 60, 5)).toBe(false);
  });

  it('does not fire if reminder is far in the future', () => {
    expect(shouldFireNow(9 * 60, 18 * 60, 5)).toBe(false);
  });
});

describe('currentLocalMinutes', () => {
  it('returns minutes-since-midnight in the given tz', () => {
    // 2026-04-21 00:00 UTC → 08:00 Asia/Taipei (UTC+8) → 480
    const utc = new Date('2026-04-21T00:00:00Z');
    expect(currentLocalMinutes(utc, 'Asia/Taipei')).toBe(8 * 60);
  });

  it('handles non-UTC+8 tzs', () => {
    // 2026-04-21 00:00 UTC → 17:00 PDT (UTC-7) previous day = 17*60
    const utc = new Date('2026-04-21T00:00:00Z');
    expect(currentLocalMinutes(utc, 'America/Los_Angeles')).toBe(17 * 60);
  });
});

describe('defaultReminderText', () => {
  it('quantitative with target', () => {
    expect(defaultReminderText('喝水', 'quantitative_daily', 8, '杯')).toMatch(/喝水/);
    expect(defaultReminderText('喝水', 'quantitative_daily', 8, '杯')).toMatch(/8杯/);
  });

  it('quantitative without target falls back to generic', () => {
    expect(defaultReminderText('喝水', 'quantitative_daily', null, null)).toMatch(/喝水/);
  });

  it('checklist has dedicated copy', () => {
    const t = defaultReminderText('晨間例行', 'checklist_daily', null, null);
    expect(t).toMatch(/清單/);
  });

  it('binary fallback', () => {
    const t = defaultReminderText('冥想', 'binary_daily', null, null);
    expect(t).toMatch(/冥想/);
  });
});
