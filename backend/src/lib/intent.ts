import {
  getActiveIntentRulesForProduct,
  getContentItemByKey,
  logEngagementEvent,
  getMissionTemplateByKey,
  assignMission,
} from './db.js';
import {
  completeMissionByKey,
  incrementMissionProgress,
  setUserAttributeWithHooks,
} from './missions.js';
import type {
  IntentMatchType,
  IntentActionType,
  ReplyContentAction,
  SetAttributeAction,
  MissionAction,
  IncrementMissionAction,
  IntentActionConfig,
} from '../types.js';

export interface IntentRuleRow {
  id: string;
  name: string;
  priority: number;
  match_type: string;
  patterns: unknown;
  action_type: string;
  action_config: unknown;
  is_active: boolean;
}

export interface IntentMatchResult {
  ruleId: string;
  ruleName: string;
  actionType: IntentActionType;
  actionConfig: IntentActionConfig;
}

/**
 * Test whether a single pattern matches the given text under the rule's
 * match_type. Keyword: case-insensitive substring. Exact: full equality
 * after trim, case-insensitive. Regex: JS regex, case-insensitive; invalid
 * patterns are skipped.
 */
function patternMatches(text: string, pattern: string, matchType: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerPattern = pattern.toLowerCase();
  switch (matchType) {
    case 'exact':
      return text.trim().toLowerCase() === lowerPattern.trim();
    case 'regex':
      try {
        return new RegExp(pattern, 'i').test(text);
      } catch {
        return false;
      }
    case 'keyword':
    default:
      return lowerText.includes(lowerPattern);
  }
}

/**
 * Pure matcher: find the first active rule (by priority) whose pattern list
 * matches. Exported separately so it can be unit-tested without a DB.
 */
export function findMatchingRule(
  text: string,
  rules: IntentRuleRow[],
): IntentMatchResult | null {
  for (const rule of rules) {
    if (!rule.is_active) continue;
    const patterns = Array.isArray(rule.patterns) ? (rule.patterns as string[]) : [];
    const matched = patterns.some(p => typeof p === 'string' && patternMatches(text, p, rule.match_type));
    if (!matched) continue;
    return {
      ruleId: rule.id,
      ruleName: rule.name,
      actionType: rule.action_type as IntentActionType,
      actionConfig: rule.action_config as IntentActionConfig,
    };
  }
  return null;
}

export interface IntentHandledResult {
  handled: true;
  ruleId: string;
  ruleName: string;
  replyText: string | null;
}

/**
 * Run intent routing for one inbound text message. Returns null when no
 * rule matched (caller should fall through to the AI agent). Otherwise
 * executes the action and returns the reply text to send (or null if the
 * action had no reply, e.g. set_attribute without reply_content_key).
 */
export async function runIntent(
  productId: string,
  userId: string,
  text: string,
): Promise<IntentHandledResult | null> {
  const rules = await getActiveIntentRulesForProduct(productId);
  const match = findMatchingRule(text, rules);
  if (!match) return null;

  logEngagementEvent(userId, 'intent_matched', `${match.ruleName}:${match.ruleId}`).catch(err =>
    console.error('[intent] log engagement error:', err),
  );

  let replyText: string | null = null;
  let contentKeyToResolve: string | undefined;

  if (match.actionType === 'reply_content') {
    const cfg = match.actionConfig as ReplyContentAction;
    contentKeyToResolve = cfg.content_key;
  } else if (match.actionType === 'set_attribute') {
    const cfg = match.actionConfig as SetAttributeAction;
    if (cfg.key) {
      try {
        await setUserAttributeWithHooks(userId, cfg.key, cfg.value ?? null);
      } catch (err) {
        console.error('[intent] set_attribute error:', err);
      }
    }
    contentKeyToResolve = cfg.reply_content_key;
  } else if (match.actionType === 'assign_mission') {
    const cfg = match.actionConfig as MissionAction;
    if (cfg.mission_key) {
      const template = await getMissionTemplateByKey(productId, cfg.mission_key);
      if (!template || !template.is_active) {
        console.warn(`[intent] rule ${match.ruleId} references missing/inactive mission:${cfg.mission_key}`);
      } else {
        try {
          await assignMission(userId, template.id);
        } catch (err) {
          console.error('[intent] assign_mission error:', err);
        }
      }
    }
    contentKeyToResolve = cfg.reply_content_key;
  } else if (match.actionType === 'complete_mission') {
    const cfg = match.actionConfig as MissionAction;
    if (cfg.mission_key) {
      try {
        await completeMissionByKey(productId, userId, cfg.mission_key);
      } catch (err) {
        console.error('[intent] complete_mission error:', err);
      }
    }
    contentKeyToResolve = cfg.reply_content_key;
  } else if (match.actionType === 'increment_mission_progress') {
    const cfg = match.actionConfig as IncrementMissionAction;
    if (cfg.mission_key) {
      try {
        await incrementMissionProgress(productId, userId, cfg.mission_key, cfg.step ?? 1);
      } catch (err) {
        console.error('[intent] increment_mission_progress error:', err);
      }
    }
    contentKeyToResolve = cfg.reply_content_key;
  }

  if (contentKeyToResolve) {
    const item = await getContentItemByKey(productId, contentKeyToResolve);
    if (item && item.is_active) {
      replyText = item.body ?? item.title ?? null;
    } else {
      console.warn(`[intent] rule ${match.ruleId} references missing/inactive content:${contentKeyToResolve}`);
    }
  }

  return {
    handled: true,
    ruleId: match.ruleId,
    ruleName: match.ruleName,
    replyText,
  };
}

// Re-export for route validation
export const VALID_MATCH_TYPES: IntentMatchType[] = ['keyword', 'regex', 'exact'];
export const VALID_ACTION_TYPES: IntentActionType[] = [
  'reply_content',
  'set_attribute',
  'assign_mission',
  'complete_mission',
  'increment_mission_progress',
];
