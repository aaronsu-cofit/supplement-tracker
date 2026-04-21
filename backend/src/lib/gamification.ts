import {
  getUserStreak,
  upsertStreak,
  awardBadge,
  findUserById,
  getBadgeTemplatesByCriteriaType,
  logEngagementEvent,
} from './db.js';
import { localDateInTz, daysBetweenInTz } from './time.js';
import type { BadgeCriteria } from '../types.js';

// ─── Pure streak logic ──────────────────────────────────────────────────────

export interface StreakState {
  count_current: number;
  count_best: number;
  last_occurred_on: Date | null;
}

export interface StreakStepResult {
  next: StreakState;
  changed: boolean; // false when called twice in the same local day
  reached: number;  // count_current after step (unchanged if already-today)
}

/**
 * Given the current streak state and "today" (as a UTC-midnight Date
 * whose YMD represents today in the user's tz), return the next state.
 *   - if last_occurred_on === today: unchanged (idempotent for same-day calls)
 *   - if last_occurred_on is 1 day before today: count_current + 1
 *   - otherwise: count_current = 1 (streak broken, starts fresh)
 * count_best tracks the max ever reached.
 *
 * Pure — no DB, no clock reads. Callers supply `today` via
 * localDateInTz(now, userTz).
 */
export function nextStreakState(prev: StreakState, today: Date): StreakStepResult {
  if (prev.last_occurred_on) {
    const diff = daysBetweenInTz(prev.last_occurred_on, today, 'UTC');
    if (diff === 0) {
      return { next: prev, changed: false, reached: prev.count_current };
    }
    if (diff === 1) {
      const count = prev.count_current + 1;
      return {
        next: {
          count_current: count,
          count_best: Math.max(prev.count_best, count),
          last_occurred_on: today,
        },
        changed: true,
        reached: count,
      };
    }
  }
  // Fresh start (no prior record, or gap > 1 day)
  const count = 1;
  return {
    next: {
      count_current: count,
      count_best: Math.max(prev.count_best, count),
      last_occurred_on: today,
    },
    changed: true,
    reached: count,
  };
}

// ─── Pure badge criteria matching ───────────────────────────────────────────

export function matchesStreakCriteria(
  criteria: BadgeCriteria,
  streakKey: string,
  streakCount: number,
): boolean {
  return (
    criteria.type === 'streak_reached' &&
    criteria.streak_key === streakKey &&
    streakCount >= criteria.threshold
  );
}

export function matchesMissionCriteria(
  criteria: BadgeCriteria,
  missionKey: string,
): boolean {
  return criteria.type === 'mission_completed' && criteria.mission_key === missionKey;
}

// ─── Side-effectful operations ──────────────────────────────────────────────

/**
 * Increment a user's streak for (productId, streakKey) using the user's
 * timezone to determine "today"/"yesterday". Idempotent for same-day
 * repeated calls. After bumping, evaluates badges of type
 * streak_reached. Returns the new count (or current count if unchanged).
 */
export async function incrementStreak(
  productId: string,
  userId: string,
  streakKey: string,
): Promise<{ count: number; changed: boolean }> {
  const user = await findUserById(userId);
  const tz = user?.timezone || 'Asia/Taipei';
  const today = localDateInTz(new Date(), tz);

  const prev = await getUserStreak(productId, userId, streakKey);
  const state: StreakState = prev
    ? {
        count_current: prev.count_current,
        count_best: prev.count_best,
        last_occurred_on: prev.last_occurred_on,
      }
    : { count_current: 0, count_best: 0, last_occurred_on: null };

  const { next, changed, reached } = nextStreakState(state, today);
  if (changed) {
    await upsertStreak(
      productId,
      userId,
      streakKey,
      next.count_current,
      next.count_best,
      next.last_occurred_on!,
    );
    logEngagementEvent(userId, 'streak_incremented', `${streakKey}:${reached}`).catch(err =>
      console.error('[gamification] log streak engagement error:', err),
    );
    await evaluateStreakBadges(productId, userId, streakKey, reached);
  }
  return { count: reached, changed };
}

/**
 * Scan active badge templates with criteria type 'streak_reached' and
 * award any the user newly qualifies for.
 */
export async function evaluateStreakBadges(
  productId: string,
  userId: string,
  streakKey: string,
  streakCount: number,
): Promise<void> {
  const templates = await getBadgeTemplatesByCriteriaType(productId, 'streak_reached');
  for (const t of templates) {
    const criteria = t.criteria as unknown as BadgeCriteria;
    if (!matchesStreakCriteria(criteria, streakKey, streakCount)) continue;
    try {
      const { awarded } = await awardBadge(userId, t.id);
      if (awarded) {
        logEngagementEvent(userId, 'badge_earned', `${t.key}:streak`).catch(err =>
          console.error('[gamification] log badge engagement error:', err),
        );
      }
    } catch (err) {
      console.error('[gamification] awardBadge error:', err);
    }
  }
}

/**
 * Called from the mission completion pipeline. Scan active badge
 * templates with criteria type 'mission_completed' and award any where
 * the completed mission_key matches.
 */
export async function evaluateMissionBadges(
  productId: string,
  userId: string,
  missionKey: string,
): Promise<void> {
  const templates = await getBadgeTemplatesByCriteriaType(productId, 'mission_completed');
  for (const t of templates) {
    const criteria = t.criteria as unknown as BadgeCriteria;
    if (!matchesMissionCriteria(criteria, missionKey)) continue;
    try {
      const { awarded } = await awardBadge(userId, t.id);
      if (awarded) {
        logEngagementEvent(userId, 'badge_earned', `${t.key}:mission`).catch(err =>
          console.error('[gamification] log badge engagement error:', err),
        );
      }
    } catch (err) {
      console.error('[gamification] awardBadge error:', err);
    }
  }
}

export const VALID_BADGE_CRITERIA_TYPES: BadgeCriteria['type'][] = [
  'streak_reached',
  'mission_completed',
];
