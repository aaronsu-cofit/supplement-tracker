import type { ScenarioFlowNode, ContentItem, MissionTemplate } from '../../../../../types';

export interface LintIssue {
  /** Severity — only 'warning' for now; placeholder for future 'error'. */
  level: 'warning';
  /** Human-readable zh-TW message suitable for tooltip display. */
  message: string;
}

export interface LintContext {
  productId: string | null;
  contentItems: ContentItem[];
  missions: MissionTemplate[];
}

const has = (s: string | undefined | null): s is string => typeof s === 'string' && s.trim().length > 0;

/**
 * Pure lint function — given an action node and the product's resource
 * maps, return a list of issues. Warnings cover:
 *   - OA has no product bound but scenario references product-scoped things
 *   - content_key / mission_key references that don't resolve in the bound product
 *   - required fields missing (mission_key on mission-assign, etc.)
 *
 * Does not validate push message content (that's covered by buildLineMessage
 * at send time) since ops often draft empty push nodes intentionally.
 */
export function lintAction(node: ScenarioFlowNode, ctx: LintContext): LintIssue[] {
  const issues: LintIssue[] = [];
  const d = node.data ?? {};
  const needsProduct = () =>
    ctx.productId
      ? null
      : { level: 'warning' as const, message: 'OA 未綁定產品，此動作於排程時會被略過' };

  switch (node.type) {
    case 'push-message-node': {
      if (has(d.contentKey)) {
        const w = needsProduct();
        if (w) { issues.push(w); break; }
        const item = ctx.contentItems.find(c => c.key === d.contentKey);
        if (!item) {
          issues.push({ level: 'warning', message: `content_key "${d.contentKey}" 不在產品的內容庫` });
        } else if (!item.is_active) {
          issues.push({ level: 'warning', message: `content_key "${d.contentKey}" 已停用` });
        } else {
          // Type mismatch: a push node set to 'flex' but pointing at a
          // 'text' content item (or vice versa) is almost always a bug.
          // Scheduler's contentItemToMessage follows the content item's
          // own type, not the node's — we flag it so ops notice.
          const pushType = d.type ?? 'text';
          if ((pushType === 'flex') !== (item.type === 'flex')) {
            issues.push({
              level: 'warning',
              message: `push 類型為 ${pushType} 但 content item 為 ${item.type}；發送時會依 content item 類型處理`,
            });
          }
        }
      }
      // Inline flex JSON sanity check (only when not using content_key)
      if (!has(d.contentKey) && d.type === 'flex') {
        if (!has(d.flexContents)) {
          issues.push({ level: 'warning', message: 'Flex 類型需填入 flex JSON' });
        } else {
          try {
            const parsed = JSON.parse(d.flexContents);
            if (!parsed || typeof parsed !== 'object' || (parsed.type !== 'bubble' && parsed.type !== 'carousel')) {
              issues.push({ level: 'warning', message: 'Flex JSON 最外層 type 需為 bubble 或 carousel' });
            }
          } catch {
            issues.push({ level: 'warning', message: 'Flex JSON 無法解析' });
          }
        }
      }
      break;
    }
    case 'mission-assign-node': {
      const w = needsProduct();
      if (w) { issues.push(w); break; }
      if (!has(d.missionKey)) {
        issues.push({ level: 'warning', message: 'mission_key 未設定' });
        break;
      }
      const m = ctx.missions.find(x => x.key === d.missionKey);
      if (!m) {
        issues.push({ level: 'warning', message: `mission_key "${d.missionKey}" 不在產品的任務庫` });
      } else if (!m.is_active) {
        issues.push({ level: 'warning', message: `mission_key "${d.missionKey}" 已停用` });
      }
      break;
    }
    case 'streak-increment-node': {
      const w = needsProduct();
      if (w) issues.push(w);
      if (!has(d.streakKey)) issues.push({ level: 'warning', message: 'streak_key 未設定' });
      break;
    }
    case 'set-attribute-node': {
      const w = needsProduct();
      if (w) issues.push(w);
      if (!has(d.attributeKey)) issues.push({ level: 'warning', message: 'attribute_key 未設定' });
      break;
    }
    case 'ai-skill-node': {
      if (!has(d.agentId)) issues.push({ level: 'warning', message: 'agentId 未設定' });
      break;
    }
    case 'menu-change-node': {
      if (!has(d.menuName)) issues.push({ level: 'warning', message: 'menuName 未設定' });
      break;
    }
  }
  return issues;
}

/** Total issue count across a scenario's action list; handy for header badge. */
export function countIssues(
  actions: ScenarioFlowNode[],
  ctx: LintContext,
): number {
  return actions.reduce((n, a) => n + lintAction(a, ctx).length, 0);
}
