/**
 * Compute calendar-day difference between `from` and `to` evaluated in the
 * given IANA timezone. Example: if from=2026-01-01T23:00 UTC and
 * to=2026-01-02T01:00 UTC with tz=Asia/Taipei (UTC+8), both are
 * 2026-01-02 local → returns 0. Robust against DST and offset edges.
 */
export function daysBetweenInTz(from: Date, to: Date, tz: string): number {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const toYmd = (d: Date): number => {
    const parts = fmt.formatToParts(d);
    const y = parts.find(p => p.type === 'year')!.value;
    const m = parts.find(p => p.type === 'month')!.value;
    const day = parts.find(p => p.type === 'day')!.value;
    return Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(day));
  };
  return Math.floor((toYmd(to) - toYmd(from)) / (24 * 60 * 60 * 1000));
}

/**
 * Return a UTC-midnight Date whose Y/M/D match the local calendar date
 * of `now` in the given timezone. Useful as a stable "date-only" key —
 * e.g., for streak last_occurred_on comparisons.
 */
export function localDateInTz(now: Date, tz: string): Date {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(now);
  const y = parts.find(p => p.type === 'year')!.value;
  const m = parts.find(p => p.type === 'month')!.value;
  const d = parts.find(p => p.type === 'day')!.value;
  return new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d)));
}
