import { adkRun } from './adk.js';
import {
  getTemplatesForOA,
  getScenariosForOA,
  getActiveTemplateForOA,
  upsertUserMenuAssignment,
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
    const [byId, byDefault] = await Promise.all([
      getScenariosForOA(oaId.toString()),
      getScenariosForOA('default'),
    ]);
    const activeScenario = [...byId, ...byDefault].find(s => s.is_active);
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
