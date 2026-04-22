import {
  assignMission,
  markMissionAssignmentCompleted,
  getPendingAssignment,
  incrementAssignmentProgress,
  getPendingAssignmentsForAttribute,
  getMissionTemplateByKey,
  setUserAttribute,
  logEngagementEvent,
} from './db.js';
import { incrementStreak, evaluateMissionBadges } from './gamification.js';
import { evaluateJourneys } from './journey.js';
import { pushContentToUser } from './notify.js';
import type { MissionCompleteAction, AutoCompleteRule } from '../types.js';

// ─── Pure logic (unit-testable without DB) ──────────────────────────────────

/**
 * Check whether setting attributeKey to attributeValue satisfies the
 * template's auto-complete rule. `match_value` is optional: if absent,
 * any value counts as a match.
 */
export function matchesAutoCompleteRule(
  rule: AutoCompleteRule | null | undefined,
  attributeKey: string,
  attributeValue: string | null,
): boolean {
  if (!rule || rule.attribute_key !== attributeKey) return false;
  if (rule.match_value === undefined) return true;
  return rule.match_value === attributeValue;
}

/**
 * Given progress_current (after increment) and progress_target, decide
 * whether the mission should now complete.
 */
export function shouldCompleteFromProgress(current: number, target: number): boolean {
  return current >= target;
}

/**
 * Coerce a raw JSON array into the typed on_complete_actions shape,
 * silently dropping malformed entries. Kept pure so callers can test
 * validation without a DB.
 */
export function parseCompleteActions(raw: unknown): MissionCompleteAction[] {
  if (!Array.isArray(raw)) return [];
  const out: MissionCompleteAction[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    if (e.type === 'set_attribute' && typeof e.key === 'string' && typeof e.value === 'string') {
      out.push({ type: 'set_attribute', key: e.key, value: e.value });
    } else if (e.type === 'assign_mission' && typeof e.mission_key === 'string') {
      out.push({ type: 'assign_mission', mission_key: e.mission_key });
    } else if (e.type === 'increment_streak' && typeof e.streak_key === 'string') {
      out.push({ type: 'increment_streak', streak_key: e.streak_key });
    }
  }
  return out;
}

// ─── Side-effectful wrappers ────────────────────────────────────────────────

interface CompletionContext {
  productId: string;
  userId: string;
  assignmentId: string;
  actions: MissionCompleteAction[];
  // Completion paths are tracked to prevent runaway chains if a rewards
  // list references a mission that references back. Simple depth cap.
  depth?: number;
}

const MAX_CHAIN_DEPTH = 5;

/**
 * Run the on_complete_actions for a completing mission. Handles the two
 * supported action types and stops if chain depth exceeds MAX_CHAIN_DEPTH.
 * Errors in individual actions are logged and do not abort the rest.
 */
async function runCompleteActions(ctx: CompletionContext): Promise<void> {
  const depth = ctx.depth ?? 0;
  if (depth > MAX_CHAIN_DEPTH) {
    console.warn(`[missions] chain depth ${depth} exceeded — stopping`);
    return;
  }
  for (const action of ctx.actions) {
    try {
      if (action.type === 'set_attribute') {
        await setUserAttributeWithHooks(ctx.userId, action.key, action.value, depth + 1, ctx.productId);
      } else if (action.type === 'assign_mission') {
        const nextTemplate = await getMissionTemplateByKey(ctx.productId, action.mission_key);
        if (!nextTemplate || !nextTemplate.is_active) {
          console.warn(`[missions] on_complete references missing mission:${action.mission_key}`);
          continue;
        }
        await assignMission(ctx.userId, nextTemplate.id);
      } else if (action.type === 'increment_streak') {
        await incrementStreak(ctx.productId, ctx.userId, action.streak_key);
      }
    } catch (err) {
      console.error('[missions] on_complete action error:', err);
    }
  }
}

/**
 * Complete an assignment and run all side effects. This is the single
 * entry point for completions; intent/progress/auto-complete paths all
 * funnel through here so on_complete_actions always fire exactly once.
 * missionKey is used to trigger badge evaluation after completion.
 * notifyContentKey (if provided, copied from the template) triggers a
 * LINE push of that content to the user after completion — so every
 * completion path gets the same user-visible celebration.
 */
export async function completeMissionAssignment(
  productId: string,
  userId: string,
  assignmentId: string,
  missionKey: string,
  rawActions: unknown,
  notifyContentKey: string | null | undefined,
  depth = 0,
): Promise<void> {
  try {
    await markMissionAssignmentCompleted(assignmentId);
  } catch (err) {
    // P2025 means someone already completed it — idempotent, don't re-run actions
    if ((err as { code?: string })?.code === 'P2025') return;
    throw err;
  }
  logEngagementEvent(userId, 'mission_completed', `${missionKey}:${assignmentId}`).catch(err =>
    console.error('[missions] log engagement error:', err),
  );
  evaluateMissionBadges(productId, userId, missionKey).catch(err =>
    console.error('[missions] evaluateMissionBadges error:', err),
  );
  evaluateJourneys(productId, userId, { type: 'mission_completed', key: missionKey }).catch(err =>
    console.error('[missions] evaluateJourneys error:', err),
  );
  if (notifyContentKey) {
    pushContentToUser(productId, userId, notifyContentKey, 'mission_notify', `${missionKey}:${assignmentId}`)
      .catch(err => console.error('[missions] notify error:', err));
  }
  const actions = parseCompleteActions(rawActions);
  if (actions.length === 0) return;
  await runCompleteActions({ productId, userId, assignmentId, actions, depth });
}

/**
 * Public entrypoint used by intent router's `complete_mission` action.
 * Looks up the pending assignment, then funnels to completeMissionAssignment.
 */
export async function completeMissionByKey(
  productId: string,
  userId: string,
  missionKey: string,
): Promise<{ completed: boolean }> {
  const template = await getMissionTemplateByKey(productId, missionKey);
  if (!template || !template.is_active) return { completed: false };
  const pending = await getPendingAssignment(userId, template.id);
  if (!pending) return { completed: false };
  await completeMissionAssignment(
    productId,
    userId,
    pending.id,
    template.key,
    template.on_complete_actions,
    template.notify_content_key,
  );
  return { completed: true };
}

/**
 * Intent router's `increment_mission_progress` entrypoint. Bumps
 * progress_current by step (default 1) and auto-completes if it reaches
 * progress_target.
 */
export async function incrementMissionProgress(
  productId: string,
  userId: string,
  missionKey: string,
  step = 1,
): Promise<{ incremented: boolean; completed: boolean }> {
  const template = await getMissionTemplateByKey(productId, missionKey);
  if (!template || !template.is_active) return { incremented: false, completed: false };
  const pending = await getPendingAssignment(userId, template.id);
  if (!pending) return { incremented: false, completed: false };

  const updated = await incrementAssignmentProgress(pending.id, Math.max(1, step));
  if (shouldCompleteFromProgress(updated.progress_current, updated.progress_target)) {
    await completeMissionAssignment(
      productId,
      userId,
      pending.id,
      template.key,
      template.on_complete_actions,
      template.notify_content_key,
    );
    return { incremented: true, completed: true };
  }
  return { incremented: true, completed: false };
}

/**
 * Attribute-set hook: after any setUserAttribute, check whether any
 * pending assignment for the user has an auto_complete_on_attribute rule
 * matching this (key, value) and complete it. productId comes from the
 * template (a user may have missions from multiple products).
 */
async function runAttributeAutoCompleteHook(
  userId: string,
  attributeKey: string,
  attributeValue: string | null,
  depth: number,
): Promise<void> {
  const pendings = await getPendingAssignmentsForAttribute(userId, attributeKey);
  for (const p of pendings) {
    const rule = p.template.auto_complete_on_attribute as unknown as AutoCompleteRule | null;
    if (!matchesAutoCompleteRule(rule, attributeKey, attributeValue)) continue;
    await completeMissionAssignment(
      p.template.product_id,
      userId,
      p.id,
      p.template.key,
      p.template.on_complete_actions,
      p.template.notify_content_key,
      depth,
    );
  }
}

/**
 * Wrapper over db.setUserAttribute that additionally runs:
 *   - mission auto-complete hook (always)
 *   - journey transition evaluator (only when productId is known, since
 *     journeys are product-scoped)
 *
 * All code paths that set attributes (intent router, hq admin UI,
 * mission on_complete chain, scheduler set-attribute-node) should call
 * this instead of the raw db function.
 */
export async function setUserAttributeWithHooks(
  userId: string,
  key: string,
  value: string | null,
  depth = 0,
  productId?: string | null,
) {
  const result = await setUserAttribute(userId, key, value);
  runAttributeAutoCompleteHook(userId, key, value, depth).catch(err =>
    console.error('[missions] auto-complete hook error:', err),
  );
  if (productId) {
    evaluateJourneys(productId, userId, { type: 'attribute_set', key, value }).catch(err =>
      console.error('[missions] evaluateJourneys (attr) error:', err),
    );
  }
  return result;
}
