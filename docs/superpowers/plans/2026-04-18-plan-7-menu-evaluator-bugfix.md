# MenuEvaluator Node Key Bug Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the data key and node type mismatch between `menuEvaluator.ts` and the Wizard's `MenuChangeNode` so that Layer 1 rule-driven menu assignment actually fires.

**Architecture:** The Wizard stores ReactFlow nodes with `type: 'menu-change-node'` and `data.menuName`, but `menuEvaluator.ts` searches for `n.type === 'menuChange'` and `n.data?.targetMenu` — two key mismatches that silently cause Layer 1 to always return `null`. The fix is a 3-line change in `menuEvaluator.ts` only. No Wizard changes needed; existing saved scenarios already have the correct keys.

**Tech Stack:** TypeScript, Hono (backend), Prisma

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/src/lib/menuEvaluator.ts` | **Modify lines 76–83** | Fix node type string and data key to match actual stored JSON |

---

### Task 1: Fix node type and data key in menuEvaluator

**Files:**
- Modify: `backend/src/lib/menuEvaluator.ts:76-83`

The bug is in `findRuleMatch`. Current code (lines 75–83):

```typescript
    const flowNodes = Array.isArray(activeScenario.flow_nodes)
      ? (activeScenario.flow_nodes as Array<{ type?: string; data?: { targetMenu?: string } }>)
      : [];

    const menuNode = flowNodes.find(n => n.type === 'menuChange' && n.data?.targetMenu);
    if (!menuNode?.data?.targetMenu) return null;

    const targetName = menuNode.data.targetMenu;
```

The Wizard saves `type: 'menu-change-node'` (ReactFlow node type) and `data.menuName` (from `MenuChangeNodeData` in `MenuChangeNode.tsx`). The evaluator uses the wrong strings for both.

- [ ] **Step 1: Read menuEvaluator.ts to confirm current content**

```bash
sed -n '74,85p' /Users/pochunlei/Projects/cofit/Vitera/backend/src/lib/menuEvaluator.ts
```

Expected output:
```
    const flowNodes = Array.isArray(activeScenario.flow_nodes)
      ? (activeScenario.flow_nodes as Array<{ type?: string; data?: { targetMenu?: string } }>)
      : [];

    const menuNode = flowNodes.find(n => n.type === 'menuChange' && n.data?.targetMenu);
    if (!menuNode?.data?.targetMenu) return null;

    const targetName = menuNode.data.targetMenu;
```

- [ ] **Step 2: Apply the fix**

Replace the 3 occurrences of the wrong keys:

**Edit 1** — fix the type annotation (line 76):

Old:
```typescript
      ? (activeScenario.flow_nodes as Array<{ type?: string; data?: { targetMenu?: string } }>)
```
New:
```typescript
      ? (activeScenario.flow_nodes as Array<{ type?: string; data?: { menuName?: string } }>)
```

**Edit 2** — fix the `.find()` predicate (line 79):

Old:
```typescript
    const menuNode = flowNodes.find(n => n.type === 'menuChange' && n.data?.targetMenu);
```
New:
```typescript
    const menuNode = flowNodes.find(n => n.type === 'menu-change-node' && n.data?.menuName);
```

**Edit 3** — fix the null-guard and variable assignment (lines 80–82):

Old:
```typescript
    if (!menuNode?.data?.targetMenu) return null;

    const targetName = menuNode.data.targetMenu;
```
New:
```typescript
    if (!menuNode?.data?.menuName) return null;

    const targetName = menuNode.data.menuName;
```

- [ ] **Step 3: Verify the full `findRuleMatch` function looks correct**

```bash
sed -n '61,87p' /Users/pochunlei/Projects/cofit/Vitera/backend/src/lib/menuEvaluator.ts
```

Expected output after fix:
```typescript
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
```

- [ ] **Step 4: Type-check the backend**

```bash
cd /Users/pochunlei/Projects/cofit/Vitera && pnpm --filter @vitera/backend exec tsc --noEmit 2>&1 | head -20
```

Expected: no output (zero errors). If errors appear and they are in `menuEvaluator.ts`, fix them.

- [ ] **Step 5: Commit**

```bash
git -C /Users/pochunlei/Projects/cofit/Vitera add backend/src/lib/menuEvaluator.ts
git -C /Users/pochunlei/Projects/cofit/Vitera commit -m "fix(menuEvaluator): match menu-change-node type and menuName key from Wizard"
```

---

## Self-Review

**Spec coverage:**
- Node type mismatch fixed (`'menuChange'` → `'menu-change-node'`) ✅ Step 2 Edit 2
- Data key mismatch fixed (`targetMenu` → `menuName`) ✅ Step 2 Edits 1, 2, 3
- No Wizard or DB changes needed (existing saved scenarios use correct keys already) ✅
- Type annotation updated to match the fix ✅ Step 2 Edit 1

**Placeholder scan:** No TBDs. All edits are exact strings.

**Type consistency:** `menuName` is used consistently in the type annotation, predicate, null-guard, and variable assignment — all 4 occurrences updated together.
