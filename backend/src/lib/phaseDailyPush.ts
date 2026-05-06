import { db } from './db.js';
import { localDateInTz } from './time.js';
import { pushContentToUser } from './notify.js';
import { parseHhmm, currentLocalMinutes, shouldFireNow } from './reminders.js';
import type { JourneyPhase } from '../types.js';

/**
 * Daily phase-content cron. Runs every 5 min (per the cron expr
 * registered in index.ts) and, for every user currently in a Journey
 * phase, pushes the scheduled ContentItem when their local time
 * crosses a configured day×time slot.
 *
 * Conventions:
 *   - day_in_phase is calendar-day-based (`floor(today_date - entered_date) + 1`),
 *     not 24h-based — so a user who said "月經來了" at 22:00 still gets
 *     day_2 at 09:00 the next morning rather than 47h later.
 *   - day_1 is intentionally skipped here — the phase-transition intent
 *     reply already pushed it, so we'd double-fire if cron also caught it.
 *   - Idempotency via message_log unique on
 *     (user_id, source='phase_daily_push', source_ref='${journey}:${phase}:day_${N}:${date}')
 *     so multiple ticks within the 5-min window don't duplicate.
 *   - ContentItem key defaults to `${phase}_day_${N}` if the schedule
 *     entry didn't specify content_key — keeps Zoly's authoring path
 *     simple (just name the items by convention).
 */
export interface PhaseDailyPushResult {
  evaluated: number;
  sent: number;
  skipped: number;
  errors: string[];
}

const WINDOW_MINUTES = 5;

export async function runPhaseDailyPush(now: Date = new Date()): Promise<PhaseDailyPushResult> {
  const result: PhaseDailyPushResult = { evaluated: 0, sent: 0, skipped: 0, errors: [] };

  const rows = await db().userJourneyPhase.findMany({});
  if (rows.length === 0) return result;

  const userIds = Array.from(new Set(rows.map(r => r.user_id)));
  const productKeys = Array.from(new Set(rows.map(r => `${r.product_id}::${r.journey_key}`)));
  const productIds = Array.from(new Set(rows.map(r => r.product_id)));
  const journeyKeys = Array.from(new Set(rows.map(r => r.journey_key)));

  const [users, templates] = await Promise.all([
    db().user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, timezone: true },
    }),
    db().journeyTemplate.findMany({
      where: { product_id: { in: productIds }, key: { in: journeyKeys }, is_active: true },
    }),
  ]);
  const tzByUser = new Map(users.map(u => [u.id, u.timezone || 'Asia/Taipei']));
  const tplByKey = new Map(
    templates.map(t => [`${t.product_id}::${t.key}`, t]),
  );
  // Quiet TS unused-warning for productKeys (kept above to mirror the
  // bulk-fetch pattern of reminders.ts; actual lookup uses tplByKey).
  void productKeys;

  for (const row of rows) {
    result.evaluated++;
    const tpl = tplByKey.get(`${row.product_id}::${row.journey_key}`);
    if (!tpl) { result.skipped++; continue; }

    const phases = (Array.isArray(tpl.phases) ? tpl.phases : []) as unknown as JourneyPhase[];
    const phase = phases.find(p => p.key === row.phase_key);
    if (!phase || !phase.schedule || phase.schedule.length === 0) {
      result.skipped++;
      continue;
    }

    const tz = tzByUser.get(row.user_id) ?? 'Asia/Taipei';

    // Calendar-day diff (ignores time-of-day on entered_at)
    const enteredDate = localDateInTz(row.entered_at, tz);
    const todayDate = localDateInTz(now, tz);
    const daysDiff = Math.floor((todayDate.getTime() - enteredDate.getTime()) / (24 * 3600 * 1000));
    const dayInPhase = daysDiff + 1;

    // day_1 handled by intent reply on transition
    if (dayInPhase < 2) { result.skipped++; continue; }

    const entry = phase.schedule.find(e => e.day === dayInPhase);
    if (!entry) { result.skipped++; continue; }

    const sendMin = parseHhmm(entry.time);
    if (sendMin == null) {
      result.errors.push(`user=${row.user_id} ${row.phase_key}.day_${dayInPhase}: invalid time "${entry.time}"`);
      continue;
    }

    const currentMin = currentLocalMinutes(now, tz);
    if (!shouldFireNow(currentMin, sendMin, WINDOW_MINUTES)) {
      result.skipped++;
      continue;
    }

    const dateStr = todayDate.toISOString().slice(0, 10);
    const sourceRef = `${row.journey_key}:${row.phase_key}:day_${dayInPhase}:${dateStr}`;
    const existing = await db().messageLog.findFirst({
      where: { user_id: row.user_id, source: 'phase_daily_push', source_ref: sourceRef },
      select: { id: true },
    });
    if (existing) { result.skipped++; continue; }

    const contentKey = entry.content_key ?? `${row.phase_key}_day_${dayInPhase}`;

    try {
      await pushContentToUser(
        row.product_id, row.user_id, contentKey,
        'phase_daily_push', sourceRef,
      );
      result.sent++;
    } catch (err) {
      result.errors.push(`user=${row.user_id} ${row.phase_key}.day_${dayInPhase}: ${(err as Error).message}`);
    }
  }

  return result;
}
