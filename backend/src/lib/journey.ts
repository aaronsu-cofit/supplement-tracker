import {
  getActiveJourneyTemplatesForProduct,
  getUserJourneyPhase,
  upsertUserJourneyPhase,
  logEngagementEvent,
} from './db.js';
import type { JourneyTrigger, JourneyTransition, JourneyPhase } from '../types.js';

// ─── Pure logic ─────────────────────────────────────────────────────────────

export interface JourneyEvent {
  type: 'mission_completed' | 'attribute_set' | 'badge_earned';
  /** mission_key (for mission_completed), attribute_key (for attribute_set), badge_key (for badge_earned) */
  key: string;
  /** only populated for attribute_set */
  value?: string | null;
}

/**
 * Does this transition's trigger match the event? Pure — no DB, no state.
 * `attribute_set` events match `attribute_equals` triggers only when the
 * trigger's `value` exactly equals the event's `value`. Other trigger
 * types are key-equality.
 */
export function matchesTrigger(trigger: JourneyTrigger, event: JourneyEvent): boolean {
  if (trigger.type === 'mission_completed' && event.type === 'mission_completed') {
    return trigger.mission_key === event.key;
  }
  if (trigger.type === 'badge_earned' && event.type === 'badge_earned') {
    return trigger.badge_key === event.key;
  }
  if (trigger.type === 'attribute_equals' && event.type === 'attribute_set') {
    return trigger.attribute_key === event.key && trigger.value === (event.value ?? null);
  }
  return false;
}

/**
 * Pick the transition to apply given a user's current phase (or null for
 * no phase) and an event. Scans the transitions array in declared order
 * and returns the first match. A transition with `from_phase === undefined`
 * matches any current phase including null; a transition with a specific
 * `from_phase` matches only when the user is currently in that phase.
 *
 * Declared order wins on ambiguity — this is how ops authors "specific
 * overrides general" rules without needing priority fields.
 */
export function pickTransition(
  transitions: JourneyTransition[],
  currentPhase: string | null,
  event: JourneyEvent,
): JourneyTransition | null {
  for (const t of transitions) {
    if (!matchesTrigger(t.trigger, event)) continue;
    if (t.from_phase === undefined || t.from_phase === currentPhase) return t;
  }
  return null;
}

/**
 * Validate a phases array: keys must be unique non-empty strings. Used
 * during template save to reject malformed configs before write.
 */
export function validatePhases(phases: JourneyPhase[]): string | null {
  if (!Array.isArray(phases) || phases.length === 0) return 'phases 需為非空陣列';
  const keys = new Set<string>();
  for (const p of phases) {
    if (!p || typeof p.key !== 'string' || !p.key.trim()) return 'phase.key 需為非空字串';
    if (!p.name || typeof p.name !== 'string') return 'phase.name 需為非空字串';
    if (keys.has(p.key)) return `phase.key 重複：${p.key}`;
    keys.add(p.key);
  }
  return null;
}

/**
 * Validate transitions: each to_phase must reference a defined phase; if
 * from_phase is present it must also be a defined phase; trigger type
 * must be known; trigger required fields must be non-empty.
 */
export function validateTransitions(
  transitions: JourneyTransition[],
  phases: JourneyPhase[],
): string | null {
  if (!Array.isArray(transitions)) return 'transitions 需為陣列';
  const phaseKeys = new Set(phases.map(p => p.key));
  for (const t of transitions) {
    if (!t || typeof t.to_phase !== 'string' || !phaseKeys.has(t.to_phase)) {
      return `transition.to_phase 未定義：${t?.to_phase ?? '(缺)'}`;
    }
    if (t.from_phase !== undefined && !phaseKeys.has(t.from_phase)) {
      return `transition.from_phase 未定義：${t.from_phase}`;
    }
    const tr = t.trigger;
    if (!tr || typeof tr.type !== 'string') return 'transition.trigger.type 缺失';
    if (tr.type === 'mission_completed' && !tr.mission_key) return 'mission_completed 需 mission_key';
    if (tr.type === 'badge_earned' && !tr.badge_key) return 'badge_earned 需 badge_key';
    if (tr.type === 'attribute_equals') {
      if (!tr.attribute_key) return 'attribute_equals 需 attribute_key';
      if (typeof tr.value !== 'string') return 'attribute_equals.value 需為字串';
    }
  }
  return null;
}

// ─── Side-effectful entry point ─────────────────────────────────────────────

/**
 * Evaluate all active journey templates for a product and apply any
 * matching transition for this user. No-op when no template matches.
 *
 * Called from:
 *   - mission completion (completeMissionAssignment)
 *   - attribute set with hooks (setUserAttributeWithHooks)
 *   - badge award (inside gamification.ts)
 *
 * Each journey is evaluated independently; a single event can advance
 * the user in multiple journeys. Within one journey, only one transition
 * fires per event (the first match wins, per pickTransition).
 */
export async function evaluateJourneys(
  productId: string,
  userId: string,
  event: JourneyEvent,
): Promise<void> {
  let templates;
  try {
    templates = await getActiveJourneyTemplatesForProduct(productId);
  } catch (err) {
    console.error('[journey] load templates error:', err);
    return;
  }
  for (const tpl of templates) {
    try {
      const transitions = Array.isArray(tpl.transitions)
        ? (tpl.transitions as unknown as JourneyTransition[])
        : [];
      const currentRow = await getUserJourneyPhase(productId, userId, tpl.key);
      const currentPhase = currentRow?.phase_key ?? null;
      const t = pickTransition(transitions, currentPhase, event);
      if (!t) continue;
      if (t.to_phase === currentPhase) continue; // already in target, don't log noise
      await upsertUserJourneyPhase(productId, userId, tpl.key, t.to_phase);
      logEngagementEvent(
        userId,
        'journey_transition',
        `${tpl.key}:${currentPhase ?? '(none)'}→${t.to_phase}`,
      ).catch(err => console.error('[journey] log engagement error:', err));
    } catch (err) {
      console.error(`[journey] evaluate ${tpl.key} error:`, err);
    }
  }
}

export const VALID_TRIGGER_TYPES: JourneyTrigger['type'][] = [
  'mission_completed',
  'attribute_equals',
  'badge_earned',
];
