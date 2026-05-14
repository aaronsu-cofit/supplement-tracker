import { db } from './db.js';
import { localDateInTz } from './time.js';

/**
 * Auto-advance users through time-gated journey phases.
 *
 * Designed for the women_healing_28d journey (w1 → w2 → w3 → w4 → completed)
 * but works for any journey whose phases carry an `advance_after_days` field.
 *
 * Runs once per day (called from runDailyCycle). Uses course_start_date
 * UserAttribute as D1 if present; falls back to phase entered_at otherwise.
 *
 * Idempotency: upserts the UserJourneyPhase row — re-running on the same day
 * is safe and produces no duplicate side-effects.
 */

export interface PhaseAutoAdvanceResult {
  evaluated: number;
  advanced: number;
  skipped: number;
  errors: string[];
}

interface PhaseConfig {
  key: string;
  advance_after_days?: number; // move to next phase after this many days
}

export async function runPhaseAutoAdvance(now: Date = new Date()): Promise<PhaseAutoAdvanceResult> {
  const result: PhaseAutoAdvanceResult = { evaluated: 0, advanced: 0, skipped: 0, errors: [] };

  const rows = await db().userJourneyPhase.findMany({});
  if (rows.length === 0) return result;

  const userIds    = Array.from(new Set(rows.map(r => r.user_id)));
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

  const tzByUser  = new Map(users.map(u => [u.id, u.timezone || 'Asia/Taipei']));
  const tplByKey  = new Map(templates.map(t => [`${t.product_id}::${t.key}`, t]));

  // batch-fetch course_start_date for all users to avoid N+1
  const startAttrs = await db().userAttribute.findMany({
    where: { user_id: { in: userIds }, key: 'course_start_date' },
    select: { user_id: true, value: true },
  });
  const startDateByUser = new Map(startAttrs.map(a => [a.user_id, a.value]));

  for (const row of rows) {
    result.evaluated++;

    const tpl = tplByKey.get(`${row.product_id}::${row.journey_key}`);
    if (!tpl) { result.skipped++; continue; }

    const phases = (Array.isArray(tpl.phases) ? tpl.phases : []) as unknown as PhaseConfig[];
    const currentIdx = phases.findIndex(p => p.key === row.phase_key);
    if (currentIdx === -1) { result.skipped++; continue; }

    const currentPhase = phases[currentIdx];
    if (!currentPhase.advance_after_days) { result.skipped++; continue; }

    const nextPhase = phases[currentIdx + 1];
    if (!nextPhase) { result.skipped++; continue; }

    const tz = tzByUser.get(row.user_id) ?? 'Asia/Taipei';

    const startDateStr = startDateByUser.get(row.user_id);
    const baseDate = startDateStr
      ? localDateInTz(new Date(startDateStr), tz)
      : localDateInTz(row.entered_at, tz);
    const todayDate = localDateInTz(now, tz);

    const dayInCourse = Math.floor(
      (todayDate.getTime() - baseDate.getTime()) / (24 * 3600 * 1000)
    ) + 1;

    if (dayInCourse <= currentPhase.advance_after_days) {
      result.skipped++;
      continue;
    }

    // advance to next phase
    try {
      await db().userJourneyPhase.update({
        where: { product_id_user_id_journey_key: {
          product_id:  row.product_id,
          user_id:     row.user_id,
          journey_key: row.journey_key,
        }},
        data: { phase_key: nextPhase.key, entered_at: now },
      });
      result.advanced++;
    } catch (err) {
      result.errors.push(`user=${row.user_id} journey=${row.journey_key}: ${(err as Error).message}`);
    }
  }

  return result;
}
