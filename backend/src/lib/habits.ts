import {
  getMissionTemplateByKey,
  upsertMissionDailyLog,
  findUserById,
  assignMission,
  logEngagementEvent,
  getUserMissionSetting,
} from './db.js';
import { localDateInTz } from './time.js';
import { evaluateMissionBadges } from './gamification.js';
import { evaluateJourneys } from './journey.js';
import { pushContentToUser } from './notify.js';
import { assignMission as _noop } from './db.js';
import { Prisma } from '@prisma/client';
import type { MissionSubtask, MissionType } from '../types.js';

// Keep unused import tripping silenced — helps editors/tree-shakers.
void _noop;
void Prisma;

// ─── Pure logic (unit-testable) ─────────────────────────────────────────────

/**
 * Compute next `value` and whether the log should flip to completed,
 * given the previous row and a patch. Pure — no DB, no clock.
 *
 *   - quantitative_daily: value + step (capped at daily_target), completed
 *     when value >= daily_target.
 *   - binary_daily: value ignored, completed = patch.completed ?? true.
 *   - checklist_daily: completed when every subtask key in subtask_state
 *     is true.
 *   - one_shot: delegates to the legacy MissionAssignment path; this
 *     function returns null so callers skip the daily-log pipeline.
 */
export interface ComputeLogPatchInput {
  missionType: MissionType;
  previous: { value: number; completed: boolean; subtask_state: Record<string, boolean> | null } | null;
  action:
    | { kind: 'set_value'; value: number }
    | { kind: 'increment'; step: number }
    | { kind: 'toggle' }
    | { kind: 'subtask'; key: string; completed: boolean }
    | { kind: 'skip' }
    | { kind: 'unskip' };
  dailyTarget?: number | null;
  stepValue?: number | null;
  subtasks?: MissionSubtask[] | null;
}

export interface ComputedLogPatch {
  value: number;
  completed: boolean;
  skipped?: boolean;
  subtask_state?: Record<string, boolean>;
}

export function computeLogPatch(input: ComputeLogPatchInput): ComputedLogPatch | null {
  const { missionType, previous, action } = input;
  if (missionType === 'one_shot') return null;

  // Skip / unskip are mission-type-agnostic — they zero the day and set
  // skipped flag, leaving completed=false. Streak math reads `skipped`
  // and treats those days as neutral.
  if (action.kind === 'skip') {
    return { value: 0, completed: false, skipped: true };
  }
  if (action.kind === 'unskip') {
    return { value: 0, completed: false, skipped: false };
  }

  const prevValue = previous?.value ?? 0;
  const prevCompleted = previous?.completed ?? false;
  const prevSubtasks = previous?.subtask_state ?? {};

  if (missionType === 'binary_daily') {
    let completed = prevCompleted;
    if (action.kind === 'toggle') completed = !prevCompleted;
    else if (action.kind === 'set_value') completed = action.value > 0;
    else if (action.kind === 'increment') completed = true;
    return { value: completed ? 1 : 0, completed, skipped: false };
  }

  if (missionType === 'quantitative_daily') {
    const target = Math.max(1, input.dailyTarget ?? 1);
    let nextValue = prevValue;
    if (action.kind === 'set_value') nextValue = Math.max(0, action.value);
    else if (action.kind === 'increment') nextValue = prevValue + Math.max(1, action.step);
    else if (action.kind === 'toggle') nextValue = prevCompleted ? 0 : target;
    const completed = nextValue >= target;
    return { value: nextValue, completed, skipped: false };
  }

  if (missionType === 'checklist_daily') {
    const subtasks = input.subtasks ?? [];
    if (subtasks.length === 0) return { value: prevValue, completed: false, skipped: false };
    const state: Record<string, boolean> = { ...prevSubtasks };
    if (action.kind === 'subtask') {
      state[action.key] = action.completed;
    } else if (action.kind === 'toggle') {
      const allDone = subtasks.every(s => state[s.key] === true);
      for (const s of subtasks) state[s.key] = !allDone;
    } else if (action.kind === 'set_value') {
      // 1 = mark all done; 0 = clear
      const done = action.value > 0;
      for (const s of subtasks) state[s.key] = done;
    }
    const completed = subtasks.every(s => state[s.key] === true);
    const doneCount = subtasks.filter(s => state[s.key] === true).length;
    return { value: doneCount, completed, skipped: false, subtask_state: state };
  }

  return null;
}

// ─── Side-effectful entrypoint ──────────────────────────────────────────────

export interface LogHabitDayOptions {
  productId: string;
  userId: string;
  missionKey: string;
  /** User's "today" defaults to localDateInTz(now, user.timezone). Caller
   *  may pass an explicit date for backfill / admin use. */
  date?: Date;
  action:
    | { kind: 'set_value'; value: number }
    | { kind: 'increment'; step: number }
    | { kind: 'toggle' }
    | { kind: 'subtask'; key: string; completed: boolean }
    | { kind: 'skip' }
    | { kind: 'unskip' };
  /** When true, auto-create the MissionAssignment if the user doesn't
   *  already have one. Matches "subscribe on first tap" UX. */
  autoAssign?: boolean;
}

export interface LogHabitDayResult {
  ok: boolean;
  reason?: string;
  value?: number;
  completed?: boolean;
  newly_completed?: boolean;
  date?: string;
}

/**
 * Record one log action against a habit-type mission. Handles:
 *   1. Defaulting date to user's local today
 *   2. Auto-assigning the mission if caller requested it
 *   3. Computing next value/completed via pure computeLogPatch
 *   4. Upserting the MissionDailyLog row
 *   5. Firing side effects (on_complete_actions, notify, badge/journey
 *      evaluation) ONLY when the day transitions not-completed → completed
 *
 * Side effects intentionally mirror the MissionAssignment completion
 * pipeline so badges / journey rules fire consistently whether a habit
 * is finished for the day or a one_shot mission is closed. Unlike the
 * one_shot path, we do NOT change MissionAssignment.status.
 */
export async function logHabitDay(opts: LogHabitDayOptions): Promise<LogHabitDayResult> {
  const { productId, userId, missionKey } = opts;

  const template = await getMissionTemplateByKey(productId, missionKey);
  if (!template || !template.is_active) {
    return { ok: false, reason: 'mission_not_found' };
  }
  const missionType = template.mission_type as MissionType;
  if (missionType === 'one_shot') {
    return { ok: false, reason: 'mission_is_one_shot_use_complete_mission_instead' };
  }

  // Resolve date — user's local calendar day unless caller specified
  let date = opts.date;
  if (!date) {
    const user = await findUserById(userId);
    const tz = user?.timezone || 'Asia/Taipei';
    date = localDateInTz(new Date(), tz);
  }

  // Optional auto-assign so tapping a habit for the first time subscribes
  if (opts.autoAssign) {
    try {
      await assignMission(userId, template.id);
    } catch (err) {
      console.error('[habits] autoAssign error:', err);
    }
  }

  // Compute next state
  const prev = await (await import('./db.js')).getMissionDailyLog(userId, template.id, date);
  const prevShape = prev
    ? { value: prev.value, completed: prev.completed, subtask_state: prev.subtask_state as Record<string, boolean> | null }
    : null;
  // Per-user daily_target override (e.g. "5 cups" instead of template's 8)
  const setting = await getUserMissionSetting(userId, template.id);
  const effectiveDailyTarget = setting?.daily_target ?? template.daily_target;

  const patch = computeLogPatch({
    missionType,
    previous: prevShape,
    action: opts.action,
    dailyTarget: effectiveDailyTarget,
    stepValue: template.step_value,
    subtasks: template.subtasks as unknown as MissionSubtask[] | null,
  });
  if (!patch) return { ok: false, reason: 'no_patch_computed' };

  const { previous, next } = await upsertMissionDailyLog(userId, template.id, date, patch);
  const newlyCompleted = !(previous?.completed ?? false) && next.completed;

  if (newlyCompleted) {
    // Same shape of side-effects as completeMissionAssignment, minus the
    // status update (habit assignment stays pending — recurs daily).
    logEngagementEvent(userId, 'habit_completed', `${missionKey}:${date.toISOString().slice(0, 10)}`).catch(err =>
      console.error('[habits] log engagement error:', err),
    );
    evaluateMissionBadges(productId, userId, missionKey).catch(err =>
      console.error('[habits] evaluateMissionBadges error:', err),
    );
    evaluateJourneys(productId, userId, { type: 'mission_completed', key: missionKey }).catch(err =>
      console.error('[habits] evaluateJourneys error:', err),
    );
    if (template.notify_content_key) {
      pushContentToUser(
        productId, userId, template.notify_content_key,
        'mission_notify', `${missionKey}:daily:${date.toISOString().slice(0, 10)}`,
      ).catch(err => console.error('[habits] notify error:', err));
    }
    // on_complete_actions intentionally NOT rerun every day — chains and
    // attribute writes would double-fire on a streak. If an ops use case
    // genuinely wants daily actions, we can add a flag later.
  }

  return {
    ok: true,
    value: next.value,
    completed: next.completed,
    newly_completed: newlyCompleted,
    date: date.toISOString().slice(0, 10),
  };
}
