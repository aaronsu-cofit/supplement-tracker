import { adkRun } from './adk.js';
import {
  getTemplatesForOA,
  getScenariosForOA,
  getActiveTemplateForOA,
  upsertUserMenuAssignment,
  getAllLineOAs,
  getLineOAById,
  getActiveEnrollmentsForOA,
} from './db.js';

interface DeployedTemplate {
  id: number;
  name: string;
  line_rich_menu_id: string;
}

export interface EvaluateResult {
  templateId: number | null;
  source: 'rule' | 'ai' | 'fallback';
}

export async function evaluateAndAssignMenu(
  oaId: number,
  lineUserId: string,
  channelAccessToken: string
): Promise<EvaluateResult> {
  const allTemplates = await getTemplatesForOA(oaId.toString());
  const deployed: DeployedTemplate[] = allTemplates
    .filter((t): t is typeof t & { line_rich_menu_id: string } => !!t.line_rich_menu_id)
    .map(t => ({ id: t.id, name: t.name, line_rich_menu_id: t.line_rich_menu_id }));

  // ── Layer 1: Rule-driven from active CoBlocks scenario ─────────────────────
  const ruleMatch = await findRuleMatch(oaId, deployed);
  if (ruleMatch) {
    await linkMenuToUser(channelAccessToken, lineUserId, ruleMatch.line_rich_menu_id);
    await upsertUserMenuAssignment(lineUserId, oaId, ruleMatch.id, 'rule');
    return { templateId: ruleMatch.id, source: 'rule' };
  }

  // ── Layer 2: AI auto-judgment via ADK ─────────────────────────────────────
  if (deployed.length > 0) {
    const aiMatch = await findAiMatch(lineUserId, deployed);
    if (aiMatch) {
      await linkMenuToUser(channelAccessToken, lineUserId, aiMatch.line_rich_menu_id);
      await upsertUserMenuAssignment(lineUserId, oaId, aiMatch.id, 'ai');
      return { templateId: aiMatch.id, source: 'ai' };
    }
  }

  // ── Layer 3: Fallback to OA's globally-active template ────────────────────
  const fallback = await getActiveTemplateForOA(oaId);
  if (fallback?.line_rich_menu_id) {
    await linkMenuToUser(channelAccessToken, lineUserId, fallback.line_rich_menu_id);
    await upsertUserMenuAssignment(lineUserId, oaId, fallback.id, 'fallback');
    return { templateId: fallback.id, source: 'fallback' };
  }

  // No deployed templates at all
  await upsertUserMenuAssignment(lineUserId, oaId, null, 'fallback');
  return { templateId: null, source: 'fallback' };
}

// ── Layer 1 helper: scan active scenario for a MenuChangeNode ────────────────
async function findRuleMatch(
  oaId: number,
  deployed: DeployedTemplate[]
): Promise<DeployedTemplate | null> {
  if (deployed.length === 0) return null;
  try {
    const scenarios = await getScenariosForOA(oaId);
    const activeScenario = scenarios.find(s => s.is_active);
    if (!activeScenario) return null;

    const flowNodes = Array.isArray(activeScenario.flow_nodes)
      ? (activeScenario.flow_nodes as Array<{ type?: string; data?: { menuName?: string } }>)
      : [];

    const menuNode = flowNodes.find(n => n.type === 'menu-change-node' && n.data?.menuName);
    if (!menuNode?.data?.menuName) return null;

    const targetName = menuNode.data.menuName;
    return deployed.find(t => t.name === targetName) ?? null;
  } catch {
    return null;
  }
}

// ── Layer 2 helper: ask ADK to pick a menu ───────────────────────────────────
async function findAiMatch(
  lineUserId: string,
  deployed: DeployedTemplate[]
): Promise<DeployedTemplate | null> {
  try {
    const menuNames = deployed.map(t => t.name).join(', ');
    const result = await adkRun('rich-menu-selector', lineUserId, {
      message: `Available menus: [${menuNames}]. Select the best menu name for this user based on their health journey.`,
    });
    const responseText = result.result?.toLowerCase() ?? '';
    return deployed.find(t => responseText.includes(t.name.toLowerCase())) ?? null;
  } catch {
    return null;
  }
}

// ── LINE API: per-user menu assignment ───────────────────────────────────────
async function linkMenuToUser(token: string, userId: string, richMenuId: string): Promise<void> {
  const { Client } = await import('@line/bot-sdk');
  const client = new Client({ channelAccessToken: token });
  await client.linkRichMenuToUser(userId, richMenuId);
}

/**
 * Direct-override menu assignment by template name. Used by the intent
 * router's `change_menu` action and the scheduler's menu-change-node.
 * Bypasses the rule/AI/fallback pipeline — caller explicitly says which
 * menu. Returns { ok: false, reason } on failures (no deployed template
 * with that name, LINE link call threw) so callers can surface a
 * diagnostic without raising.
 */
export interface AssignMenuResult {
  ok: boolean;
  templateId?: number;
  reason?: string;
}

export async function assignMenuByName(
  oaId: number,
  userId: string,
  channelAccessToken: string,
  menuName: string,
): Promise<AssignMenuResult> {
  const allTemplates = await getTemplatesForOA(oaId.toString());
  const target = allTemplates.find(
    t => t.name === menuName && !!t.line_rich_menu_id,
  );
  if (!target) return { ok: false, reason: `no deployed template named "${menuName}" on OA #${oaId}` };
  try {
    await linkMenuToUser(channelAccessToken, userId, target.line_rich_menu_id!);
  } catch (err) {
    return { ok: false, reason: `LINE link failed: ${(err as Error).message}` };
  }
  await upsertUserMenuAssignment(userId, oaId, target.id, 'manual');
  return { ok: true, templateId: target.id };
}

export interface MenuReevalResult {
  evaluated: number;
  rule: number;
  ai: number;
  fallback: number;
  errors: string[];
}

/**
 * Re-evaluate menus for every active enrollment across all active OAs.
 * Used by the daily cron to shift users' menus when their Day N changes
 * or when admin edits active scenarios. Unique users per OA.
 */
export async function evaluateAllActiveUsers(): Promise<MenuReevalResult> {
  const oas = (await getAllLineOAs()).filter(o => o.is_active);
  let evaluated = 0, rule = 0, ai = 0, fallback = 0;
  const errors: string[] = [];

  for (const oaSummary of oas) {
    const oa = await getLineOAById(oaSummary.id.toString());
    if (!oa?.channel_access_token) continue;

    const enrollments = await getActiveEnrollmentsForOA(oaSummary.id);
    const uniqueUserIds = Array.from(new Set(enrollments.map(e => e.user_id)));

    for (const userId of uniqueUserIds) {
      try {
        const res = await evaluateAndAssignMenu(oaSummary.id, userId, oa.channel_access_token);
        evaluated++;
        if (res.source === 'rule') rule++;
        else if (res.source === 'ai') ai++;
        else fallback++;
      } catch (err) {
        errors.push(`oa=${oaSummary.id} user=${userId}: ${(err as Error).message}`);
      }
    }
  }
  return { evaluated, rule, ai, fallback, errors };
}
