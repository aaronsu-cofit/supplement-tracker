import { db } from './db.js';
import { localDateInTz } from './time.js';
import { pushContentToUser } from './notify.js';
import { contentItemToMessage } from './flow.js';
import { logOutboundLineMessage } from './messageLog.js';
import { Prisma } from '@prisma/client';

// ─── Pure helpers (unit-testable) ───────────────────────────────────────────

/**
 * "HH:MM" → minutes since midnight. Returns null on malformed input.
 */
export function parseHhmm(s: string | null | undefined): number | null {
  if (!s || typeof s !== 'string') return null;
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Given the user's current local time (minutes since midnight) and a
 * reminder target (HH:MM), decide whether a scheduler tick at this
 * moment should fire the reminder. True when the target falls in
 * [current, current + windowMinutes). Uses a forward window rather
 * than centered so the first tick that covers the target wins and
 * subsequent ticks don't double-fire — idempotency on top is the
 * message_log check, this just keeps the math simple.
 */
export function shouldFireNow(
  currentMinutes: number,
  reminderMinutes: number,
  windowMinutes: number,
): boolean {
  if (reminderMinutes < currentMinutes) return false;
  return reminderMinutes < currentMinutes + windowMinutes;
}

/**
 * Compute current minutes-since-midnight in a tz, via the existing
 * Intl formatter. Keeps time math consistent with localDateInTz.
 */
export function currentLocalMinutes(now: Date, tz: string): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit',
  });
  const parts = fmt.formatToParts(now);
  const h = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
  const m = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);
  return h * 60 + m;
}

export function defaultReminderText(habitName: string, missionType: string, dailyTarget: number | null, unit: string | null): string {
  if (missionType === 'quantitative_daily' && dailyTarget) {
    return `⏰ 別忘了「${habitName}」— 今日目標 ${dailyTarget}${unit ?? ''}`;
  }
  if (missionType === 'checklist_daily') return `⏰ 別忘了完成今日的「${habitName}」清單`;
  return `⏰ 該做「${habitName}」了！`;
}

// ─── Side-effectful entrypoint ──────────────────────────────────────────────

export interface ReminderCycleResult {
  evaluated: number;
  sent: number;
  skipped: number;
  errors: string[];
}

const WINDOW_MINUTES = 5;

/**
 * Scan all active daily-habit subscriptions with reminder_enabled (or a
 * per-user override that flips it on) and push a reminder to users
 * whose local time falls in the current window.
 *
 * Idempotency: before sending, query message_log for a row with
 * source='habit_reminder' and source_ref='${template.key}:${today}' —
 * if present, this cycle already covered this user/habit today. So
 * the 5-min tick can run as often as you like without duplicates.
 *
 * Errors per user are collected into the result but don't abort the
 * loop — reminders are best-effort and a broken token on one OA
 * shouldn't starve the rest.
 */
export async function runReminderCycle(now: Date = new Date()): Promise<ReminderCycleResult> {
  const result: ReminderCycleResult = { evaluated: 0, sent: 0, skipped: 0, errors: [] };

  // Pull candidate assignments: daily-type + active + user may have
  // overrides (we read those alongside).
  const assignments = await db().missionAssignment.findMany({
    where: {
      status: 'pending',
      template: {
        is_active: true,
        mission_type: { in: ['binary_daily', 'quantitative_daily', 'checklist_daily'] },
      },
    },
    include: {
      template: true,
      // User timezone comes from the user row
      // Relation is not joined here — second query by ids below
    },
  });
  if (assignments.length === 0) return result;

  const userIds = Array.from(new Set(assignments.map(a => a.user_id)));
  const templateIds = Array.from(new Set(assignments.map(a => a.template_id)));
  const [users, settings] = await Promise.all([
    db().user.findMany({ where: { id: { in: userIds } }, select: { id: true, timezone: true } }),
    db().userMissionSetting.findMany({
      where: { user_id: { in: userIds }, template_id: { in: templateIds } },
    }),
  ]);
  const tzByUser = new Map(users.map(u => [u.id, u.timezone || 'Asia/Taipei']));
  const settingMap = new Map(
    settings.map(s => [`${s.user_id}:${s.template_id}`, s]),
  );

  for (const a of assignments) {
    result.evaluated++;
    const tpl = a.template;
    const setting = settingMap.get(`${a.user_id}:${a.template_id}`);

    // Resolve enabled/time: user override wins, null falls back to
    // template reminder JSON.
    const tplReminder = tpl.reminder as { enabled?: boolean; time?: string; content_key?: string } | null;
    const enabled = setting?.reminder_enabled ?? tplReminder?.enabled ?? false;
    const time = setting?.reminder_time ?? tplReminder?.time ?? null;
    if (!enabled || !time) { result.skipped++; continue; }

    const reminderMin = parseHhmm(time);
    if (reminderMin == null) {
      result.errors.push(`user=${a.user_id} template=${tpl.key}: invalid reminder_time="${time}"`);
      continue;
    }

    const tz = tzByUser.get(a.user_id) ?? 'Asia/Taipei';
    const currentMin = currentLocalMinutes(now, tz);
    if (!shouldFireNow(currentMin, reminderMin, WINDOW_MINUTES)) {
      result.skipped++;
      continue;
    }

    // Idempotency — has this (user, template, today) already been
    // reminded? message_log source_ref = "<key>:<yyyy-mm-dd>".
    const today = localDateInTz(now, tz).toISOString().slice(0, 10);
    const sourceRef = `${tpl.key}:${today}`;
    const existing = await db().messageLog.findFirst({
      where: { user_id: a.user_id, source: 'habit_reminder', source_ref: sourceRef },
      select: { id: true },
    });
    if (existing) { result.skipped++; continue; }

    // Skip if user already completed the habit today
    const todayLog = await db().missionDailyLog.findUnique({
      where: {
        user_id_template_id_date: {
          user_id: a.user_id,
          template_id: tpl.id,
          date: localDateInTz(now, tz),
        },
      },
    });
    if (todayLog?.completed) { result.skipped++; continue; }

    try {
      // Prefer a configured content_key if present, else default text
      if (tplReminder?.content_key) {
        await pushContentToUser(
          tpl.product_id, a.user_id, tplReminder.content_key,
          'habit_reminder', sourceRef,
        );
      } else {
        // Find the OA to push through — same message_log lookup used by notify
        const recent = await db().messageLog.findFirst({
          where: { user_id: a.user_id },
          orderBy: { created_at: 'desc' },
          select: { oa_id: true },
        });
        if (!recent) {
          result.errors.push(`user=${a.user_id} template=${tpl.key}: no OA context`);
          continue;
        }
        const oa = await db().lineOA.findUnique({
          where: { id: recent.oa_id },
          select: { id: true, channel_access_token: true },
        });
        if (!oa?.channel_access_token) {
          result.errors.push(`user=${a.user_id} oa=${recent.oa_id}: missing token`);
          continue;
        }
        const effectiveTarget = setting?.daily_target ?? tpl.daily_target;
        const text = defaultReminderText(tpl.name, tpl.mission_type, effectiveTarget, tpl.unit);
        const msg = contentItemToMessage({
          type: 'text', body: text, is_active: true,
        });
        if (!msg) { result.skipped++; continue; }
        const { Client } = await import('@line/bot-sdk');
        const client = new Client({ channelAccessToken: oa.channel_access_token });
        await client.pushMessage(a.user_id, msg);
        await logOutboundLineMessage(oa.id, a.user_id, msg, 'habit_reminder', sourceRef);
      }
      result.sent++;
    } catch (err) {
      result.errors.push(`user=${a.user_id} template=${tpl.key}: ${(err as Error).message}`);
    }
  }

  // Satisfy unused-import in strict mode if Prisma client isn't re-exported.
  void Prisma;
  return result;
}
