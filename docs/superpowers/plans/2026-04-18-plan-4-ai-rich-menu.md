# AI Rich Menu Dynamic Mechanism — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement per-user dynamic Rich Menu assignment using a three-layer fallback: (1) rule-driven from the active CoBlocks scenario's MenuChangeNode → (2) ADK AI auto-selection → (3) global active template fallback.

**Architecture:** A new `UserMenuAssignment` Prisma model tracks which template each LINE user currently has per OA. A `menuEvaluator.ts` module orchestrates the three-layer logic and calls `client.linkRichMenuToUser()` (LINE SDK per-user assignment, NOT the global `setDefaultRichMenu`). On `follow` events in the webhook, evaluation auto-triggers via `LINE_OA_ID` + `LINE_CHANNEL_ACCESS_TOKEN` env vars. A new `/api/menu` route enables admin-triggered evaluation and assignment listing. The HQ `/lineoamenu` page gains a "用戶選單分配" section with a manual evaluate button and recent assignments list.

**Tech Stack:** Hono.js, Prisma + PostgreSQL, `@line/bot-sdk` v10, existing `adkRun` from `adk.ts`, `apiFetch` from `@vitera/lib`

---

## File Structure

**New files:**
- `backend/prisma/migrations/20260418010000_add_user_menu_assignment/migration.sql`
- `backend/src/lib/menuEvaluator.ts` — three-layer selection + LINE per-user assignment
- `backend/src/routes/menu.ts` — `/api/menu/evaluate` and `/api/menu/assignments/:oa_id`

**Modified files:**
- `backend/prisma/schema.prisma` — append `UserMenuAssignment` model
- `backend/src/lib/db.ts` — append 4 functions: `upsertUserMenuAssignment`, `getUserMenuAssignment`, `getActiveTemplateForOA`, `getRecentMenuAssignments`
- `backend/src/routes/webhook.ts` — trigger evaluation on `follow` event
- `backend/src/index.ts` — register `/api/menu` route
- `backend/.env.example` — add `LINE_OA_ID`
- `apps/hq/src/app/lineoamenu/HQLineMenuClient.tsx` — assignments section + manual evaluate button

---

### Task 1: Prisma — `UserMenuAssignment` model + migration

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260418010000_add_user_menu_assignment/migration.sql`

- [ ] **Step 1: Append `UserMenuAssignment` to schema.prisma**

Open `backend/prisma/schema.prisma`. After the `CoBlocksScenario` model (which ends with `@@map("coblocks_scenarios")`), append:

```prisma
model UserMenuAssignment {
  id          Int      @id @default(autoincrement())
  user_id     String   @db.VarChar(64)
  oa_id       Int
  template_id Int?
  source      String   @db.VarChar(20)
  assigned_at DateTime @default(now())

  @@unique([user_id, oa_id])
  @@index([oa_id], name: "idx_user_menu_oa")
  @@map("user_menu_assignments")
}
```

- [ ] **Step 2: Create migration SQL**

Create `backend/prisma/migrations/20260418010000_add_user_menu_assignment/migration.sql`:

```sql
CREATE TABLE "user_menu_assignments" (
  "id"          SERIAL PRIMARY KEY,
  "user_id"     VARCHAR(64) NOT NULL,
  "oa_id"       INTEGER NOT NULL,
  "template_id" INTEGER,
  "source"      VARCHAR(20) NOT NULL,
  "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX "user_menu_assignments_user_id_oa_id_key"
  ON "user_menu_assignments" ("user_id", "oa_id");

CREATE INDEX "idx_user_menu_oa"
  ON "user_menu_assignments" ("oa_id");
```

The unique index name `user_menu_assignments_user_id_oa_id_key` matches Prisma's auto-generated convention for `@@unique([user_id, oa_id])` without a custom name — this is how Prisma names it in the DB.

- [ ] **Step 3: Apply migration and regenerate client**

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

Expected output: `1 migration applied.` then `✔ Generated Prisma Client`.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma \
  backend/prisma/migrations/20260418010000_add_user_menu_assignment/
git commit -m "feat: add UserMenuAssignment model for per-user rich menu tracking"
```

---

### Task 2: db.ts — four helper functions

**Files:**
- Modify: `backend/src/lib/db.ts`

- [ ] **Step 1: Append four functions to end of `backend/src/lib/db.ts`**

After the last function in the file (after `getScenariosForOA` or whichever is last), append:

```typescript
// ─── User Menu Assignments ────────────────────────────────────────────────────

export async function upsertUserMenuAssignment(
  userId: string,
  oaId: number,
  templateId: number | null,
  source: 'rule' | 'ai' | 'fallback' | 'manual'
) {
  return db().userMenuAssignment.upsert({
    where: { user_id_oa_id: { user_id: userId, oa_id: oaId } },
    create: { user_id: userId, oa_id: oaId, template_id: templateId, source, assigned_at: new Date() },
    update: { template_id: templateId, source, assigned_at: new Date() },
  });
}

export async function getUserMenuAssignment(userId: string, oaId: number) {
  return db().userMenuAssignment.findUnique({
    where: { user_id_oa_id: { user_id: userId, oa_id: oaId } },
  });
}

export async function getActiveTemplateForOA(oaId: number) {
  return db().lineOARichMenuTemplate.findFirst({
    where: { oa_id: oaId, is_active: true, line_rich_menu_id: { not: null } },
  });
}

export async function getRecentMenuAssignments(oaId: number, limit = 20) {
  return db().userMenuAssignment.findMany({
    where: { oa_id: oaId },
    orderBy: { assigned_at: 'desc' },
    take: limit,
  });
}
```

**Note on `user_id_oa_id`:** Prisma auto-generates the compound unique key name by joining field names with `_`. For `@@unique([user_id, oa_id])`, the key is `user_id_oa_id`.

- [ ] **Step 2: Type-check**

```bash
cd backend
npx tsc --noEmit 2>&1 | head -30
```

Expected: No new errors (the `db().userMenuAssignment` accessor will only exist after `prisma generate` ran in Task 1).

- [ ] **Step 3: Commit**

```bash
git add backend/src/lib/db.ts
git commit -m "feat: add UserMenuAssignment CRUD helpers and getActiveTemplateForOA to db.ts"
```

---

### Task 3: `menuEvaluator.ts` — three-layer selection + LINE assignment

**Files:**
- Create: `backend/src/lib/menuEvaluator.ts`

- [ ] **Step 1: Create `backend/src/lib/menuEvaluator.ts`**

```typescript
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

  // No deployed templates exist at all
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
    // Check both numeric OA id and 'default' (Plan 3 hardcoded oa_id)
    const [byId, byDefault] = await Promise.all([
      getScenariosForOA(oaId.toString()),
      getScenariosForOA('default'),
    ]);
    const activeScenario = [...byId, ...byDefault].find(s => s.is_active);
    if (!activeScenario) return null;

    const flowNodes = Array.isArray(activeScenario.flow_nodes)
      ? (activeScenario.flow_nodes as Array<{ type?: string; data?: { targetMenu?: string } }>)
      : [];

    const menuNode = flowNodes.find(n => n.type === 'menuChange' && n.data?.targetMenu);
    if (!menuNode?.data?.targetMenu) return null;

    const targetName = menuNode.data.targetMenu;
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
```

- [ ] **Step 2: Type-check**

```bash
cd backend
npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/lib/menuEvaluator.ts
git commit -m "feat: add menuEvaluator with three-layer rich menu selection (rule → AI → fallback)"
```

---

### Task 4: `/api/menu` routes

**Files:**
- Create: `backend/src/routes/menu.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Create `backend/src/routes/menu.ts`**

```typescript
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { getLineOAById, getRecentMenuAssignments } from '../lib/db.js';
import { evaluateAndAssignMenu } from '../lib/menuEvaluator.js';

const menu = new Hono();
menu.use('*', authMiddleware);

// POST /api/menu/evaluate
// Body: { oa_id: number, user_line_id: string }
menu.post('/evaluate', async (c) => {
  let body: { oa_id: number; user_line_id: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const { oa_id, user_line_id } = body ?? {};
  if (!oa_id || !user_line_id) {
    return c.json({ error: 'oa_id and user_line_id are required' }, 400);
  }

  const oa = await getLineOAById(oa_id.toString());
  if (!oa) return c.json({ error: 'OA not found' }, 404);

  try {
    const result = await evaluateAndAssignMenu(oa_id, user_line_id, oa.channel_access_token);
    return c.json(result);
  } catch (err) {
    console.error('[menu/evaluate] error:', err);
    return c.json({ error: 'Evaluation failed' }, 500);
  }
});

// GET /api/menu/assignments/:oa_id
menu.get('/assignments/:oa_id', async (c) => {
  const oaId = parseInt(c.req.param('oa_id'));
  if (isNaN(oaId)) return c.json({ error: 'Invalid oa_id' }, 400);
  const assignments = await getRecentMenuAssignments(oaId);
  return c.json(assignments);
});

export default menu;
```

- [ ] **Step 2: Register route in `backend/src/index.ts`**

Open `backend/src/index.ts`. After the line `import wizardRoutes from './routes/wizard.js';`, add:

```typescript
import menuRoutes from './routes/menu.js';
```

After the line `app.route('/api/wizard', wizardRoutes);`, add:

```typescript
app.route('/api/menu', menuRoutes);
```

- [ ] **Step 3: Type-check**

```bash
cd backend
npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors.

- [ ] **Step 4: Smoke test (manual)**

Start the backend dev server and run:

```bash
# Replace <token> with a valid JWT from any login
curl -X POST http://localhost:8080/api/menu/evaluate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"oa_id": 1, "user_line_id": "U_test_user_123"}'
```

Expected response (no deployed templates): `{"templateId":null,"source":"fallback"}`
Expected response (with deployed template): `{"templateId":3,"source":"fallback"}`

```bash
curl http://localhost:8080/api/menu/assignments/1 \
  -H "Authorization: Bearer <token>"
```

Expected: JSON array with the assignment just created.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/menu.ts backend/src/index.ts
git commit -m "feat: add /api/menu/evaluate and /api/menu/assignments/:oa_id routes"
```

---

### Task 5: Webhook — auto-evaluate menu on `follow` event

**Files:**
- Modify: `backend/src/routes/webhook.ts`
- Modify: `backend/.env.example`

The webhook uses `LINE_CHANNEL_ACCESS_TOKEN` (already in env) for LINE API calls and needs `LINE_OA_ID` (a new env var) to know which DB OA record to associate assignments with.

- [ ] **Step 1: Add `LINE_OA_ID` to `.env.example`**

Open `backend/.env.example`. After the existing LINE vars, add:

```
# Which LINE OA record in DB corresponds to this webhook's LINE_CHANNEL_ACCESS_TOKEN
# Set to the integer ID of the OA record in the line_oa table
LINE_OA_ID=1
```

Also set `LINE_OA_ID` in the actual `.env` or `.env.local` file with the real OA record ID.

- [ ] **Step 2: Add imports to `backend/src/routes/webhook.ts`**

Open `backend/src/routes/webhook.ts`. After the existing imports at the top, add:

```typescript
import { evaluateAndAssignMenu } from '../lib/menuEvaluator.js';
```

- [ ] **Step 3: Trigger evaluation in the `follow` handler**

In `backend/src/routes/webhook.ts`, find the `follow` handler:

```typescript
  if (event.type === 'follow') {
    try {
      await findOrCreateLineUser(lineUserId)
    } catch (err) {
      console.error('[webhook/line] follow findOrCreateLineUser error:', err)
    }
    if (event.replyToken) {
```

Replace with:

```typescript
  if (event.type === 'follow') {
    try {
      await findOrCreateLineUser(lineUserId)
    } catch (err) {
      console.error('[webhook/line] follow findOrCreateLineUser error:', err)
    }

    const oaId = parseInt(process.env.LINE_OA_ID || '0')
    const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
    if (oaId > 0 && channelToken) {
      evaluateAndAssignMenu(oaId, lineUserId, channelToken).catch(err =>
        console.error('[webhook/line] follow menu evaluation error:', err)
      )
    }

    if (event.replyToken) {
```

The evaluation is fire-and-forget (`.catch` only) so it never delays the 200 OK response to LINE.

- [ ] **Step 4: Type-check**

```bash
cd backend
npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/webhook.ts backend/.env.example
git commit -m "feat: auto-evaluate rich menu assignment on LINE follow event"
```

---

### Task 6: HQ UI — user menu assignments view + manual evaluate

**Files:**
- Modify: `apps/hq/src/app/lineoamenu/HQLineMenuClient.tsx`

This task adds a "用戶選單分配" card below the template editor in the right panel of the LINE OA Menu page. It shows the 20 most recent assignments for the selected OA and allows manually triggering evaluation for a specific LINE user ID.

- [ ] **Step 1: Read the file**

Read `apps/hq/src/app/lineoamenu/HQLineMenuClient.tsx` to confirm current structure before editing.

- [ ] **Step 2: Add state declarations**

In `HQLineMenuClient`, find the last state declaration block (around the `actionStatus` line). Add after it:

```typescript
  // ── User menu assignments state ─────────────────────────────────────────────
  const [assignments, setAssignments] = useState<{
    id: number;
    user_id: string;
    template_id: number | null;
    source: string;
    assigned_at: string;
  }[]>([]);
  const [evalUserId, setEvalUserId] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
```

- [ ] **Step 3: Add `loadAssignments` callback**

After the `fetchTemplates` callback (around line 82), add:

```typescript
  const loadAssignments = useCallback(async (oaId: string) => {
    try {
      const res = await apiFetch(`/api/menu/assignments/${oaId}`);
      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch {
      setAssignments([]);
    }
  }, []);
```

- [ ] **Step 4: Call `loadAssignments` when OA is selected**

Find `handleSelectOA` (around line 84):

```typescript
  const handleSelectOA = (oa: LineOA) => {
    setSelectedOA(oa);
    setEditingOAId(null);
    setEditingTemplate(null);
    setTemplateImageFile(null);
    setActionStatus(null);
    setShowNewTemplateForm(false);
    setNewTemplateName('');
    fetchTemplates(oa.id);
  };
```

Replace with:

```typescript
  const handleSelectOA = (oa: LineOA) => {
    setSelectedOA(oa);
    setEditingOAId(null);
    setEditingTemplate(null);
    setTemplateImageFile(null);
    setActionStatus(null);
    setShowNewTemplateForm(false);
    setNewTemplateName('');
    setAssignments([]);
    setEvalUserId('');
    fetchTemplates(oa.id);
    loadAssignments(oa.id);
  };
```

- [ ] **Step 5: Add `handleEvaluate` function**

After `handleSelectOA`, add:

```typescript
  const handleEvaluate = async () => {
    if (!selectedOA || !evalUserId.trim()) return;
    setIsEvaluating(true);
    try {
      const res = await apiFetch('/api/menu/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oa_id: selectedOA.id, user_line_id: evalUserId.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionStatus({ type: 'error', message: data.error || '評估失敗' });
        return;
      }
      setActionStatus({ type: 'success', message: '已評估並分配選單' });
      await loadAssignments(selectedOA.id);
    } catch {
      setActionStatus({ type: 'error', message: '評估失敗，請確認 OA ID 設定正確' });
    } finally {
      setIsEvaluating(false);
    }
  };
```

- [ ] **Step 6: Add UI section in JSX**

Find the closing section of the right panel in the JSX (the `</>` that closes the `{!selectedOA ? ... : <> ... </>}` fragment). It looks like:

```tsx
              {/* Template Editor */}
              {editingTemplate && (
                <TemplateEditor
                  ...
                />
              )}
            </>
```

Insert a new card BEFORE the `</>`:

```tsx
              {/* User Menu Assignments */}
              <div className="hq-card flex flex-col gap-4">
                <h4 className="font-semibold text-sm">用戶選單分配</h4>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="輸入 LINE User ID（U開頭）"
                    value={evalUserId}
                    onChange={e => setEvalUserId(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleEvaluate()}
                    className="hq-input text-sm flex-1"
                  />
                  <button
                    onClick={handleEvaluate}
                    disabled={isEvaluating || !evalUserId.trim()}
                    className="hq-btn-primary text-sm px-3"
                  >
                    {isEvaluating ? <><span className="hq-spinner"></span> 評估中...</> : '手動評估'}
                  </button>
                </div>

                {assignments.length === 0 ? (
                  <p className="hq-muted-text text-sm text-center py-2">尚無分配紀錄</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {assignments.map(a => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between bg-[var(--hq-bg-main)] rounded-lg px-3 py-2 text-xs"
                      >
                        <span className="font-mono text-white/70 truncate max-w-[180px]">{a.user_id}</span>
                        <span className={`hq-badge ${
                          a.source === 'rule' ? 'hq-badge-green' :
                          a.source === 'ai' ? 'hq-badge-purple' : 'hq-badge-gray'
                        }`}>{a.source}</span>
                        <span className="hq-muted-text">{a.template_id ?? '無選單'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
```

**Note on badge classes:** The HQ CSS has `hq-badge-green` and `hq-badge-gray` (seen in existing code). Check if `hq-badge-purple` exists in `hq.css`. If not, use `hq-badge-gray` for AI source as well — do not add new CSS classes.

- [ ] **Step 7: Check `hq.css` for badge variants**

Read `apps/hq/src/app/hq.css`. Find all `hq-badge-*` definitions. If `hq-badge-purple` does not exist, replace `hq-badge-purple` in the JSX above with an existing variant or use a Tailwind arbitrary class: `bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full px-2 py-0.5`.

- [ ] **Step 8: Type-check**

```bash
cd apps/hq
npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add apps/hq/src/app/lineoamenu/HQLineMenuClient.tsx
git commit -m "feat: add user menu assignments view and manual evaluate to LINE OA menu page"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Covered by |
|---|---|
| Layer 1: Rule-driven (Wizard MenuChangeNode) | Task 3 `findRuleMatch` |
| Layer 2: AI auto-judgment (ADK) | Task 3 `findAiMatch` |
| Layer 3: Fallback default | Task 3 `getActiveTemplateForOA` fallback |
| Per-user assignment (not global default) | Task 3 `linkMenuToUser` → `client.linkRichMenuToUser` |
| Auto-trigger on new follower | Task 5 webhook follow handler |
| Admin-triggered evaluation | Task 4 `POST /api/menu/evaluate` |
| Assignment history | Task 4 `GET /api/menu/assignments/:oa_id` + Task 6 UI |
| HQ UI manual evaluate | Task 6 `handleEvaluate` + input + button |

### Placeholder scan

No TBDs. The ADK skill `rich-menu-selector` does not yet exist in Warehouse — `adkRun` will throw, which the `findAiMatch` helper catches and silently falls through. This is intentional and documented in the `findAiMatch` try/catch.

### Type consistency

- `oaId: number` is used consistently in new functions (`upsertUserMenuAssignment`, `getActiveTemplateForOA`, `getRecentMenuAssignments`, `evaluateAndAssignMenu`)
- `getTemplatesForOA(oaId.toString())` matches its existing string parameter type
- `getLineOAById(oa_id.toString())` in `menu.ts` matches existing string parameter type
- `user_id_oa_id` compound unique key name matches Prisma's auto-generated convention for `@@unique([user_id, oa_id])`
- `linkRichMenuToUser(userId, richMenuId)` — `userId` first, `richMenuId` second (LINE SDK v10 order)
