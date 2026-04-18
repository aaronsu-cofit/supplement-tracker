# Enrich Menu Assignments with Template Name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the HQ menu-assignments log show the template's name (and when it was assigned) instead of just a raw `template_id` number, so users can understand at a glance which menu was picked.

**Architecture:** Enrich the backend `getRecentMenuAssignments` query by joining on template names (manual join for YAGNI — no new Prisma relation). Update the HQ page's row rendering to show `template_name` and `assigned_at` alongside the existing fields.

**Tech Stack:** Prisma, Hono, Next.js App Router, Tailwind CSS v4

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/src/lib/db.ts` | **Modify `getRecentMenuAssignments`** | Return enriched rows with `template_name: string \| null` |
| `apps/hq/src/app/lineoamenu/HQLineMenuClient.tsx` | **Modify** | Add `template_name` to state type; replace raw id cell with name + timestamp |

---

### Task 1: Enrich getRecentMenuAssignments with template names

**Files:**
- Modify: `backend/src/lib/db.ts:590-597`

- [ ] **Step 1: Read the current function**

```bash
sed -n '588,600p' /Users/pochunlei/Projects/cofit/Vitera/backend/src/lib/db.ts
```

Expected current content:
```typescript
export async function getRecentMenuAssignments(oaId: number, limit = 20) {
  return db().userMenuAssignment.findMany({
    where: { oa_id: oaId },
    orderBy: { assigned_at: 'desc' },
    take: limit,
  });
}
```

- [ ] **Step 2: Replace the function with the enriched version**

Old:
```typescript
export async function getRecentMenuAssignments(oaId: number, limit = 20) {
  return db().userMenuAssignment.findMany({
    where: { oa_id: oaId },
    orderBy: { assigned_at: 'desc' },
    take: limit,
  });
}
```
New:
```typescript
export async function getRecentMenuAssignments(oaId: number, limit = 20) {
  const rows = await db().userMenuAssignment.findMany({
    where: { oa_id: oaId },
    orderBy: { assigned_at: 'desc' },
    take: limit,
  });
  const templateIds = [...new Set(rows.map(r => r.template_id).filter((id): id is number => id !== null))];
  const templates = templateIds.length
    ? await db().lineOARichMenuTemplate.findMany({
        where: { id: { in: templateIds } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(templates.map(t => [t.id, t.name]));
  return rows.map(r => ({
    ...r,
    template_name: r.template_id != null ? nameById.get(r.template_id) ?? null : null,
  }));
}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/pochunlei/Projects/cofit/Vitera && pnpm --filter @vitera/backend exec tsc --noEmit 2>&1 | head -10
```

Expected: no output (zero errors).

- [ ] **Step 4: Commit**

```bash
git -C /Users/pochunlei/Projects/cofit/Vitera add backend/src/lib/db.ts
git -C /Users/pochunlei/Projects/cofit/Vitera commit -m "feat(db): include template_name in recent menu assignments"
```

---

### Task 2: Render template name and timestamp in the HQ page

**Files:**
- Modify: `apps/hq/src/app/lineoamenu/HQLineMenuClient.tsx`

- [ ] **Step 1: Extend the `assignments` state type**

Find (around line 51–57):
```tsx
  const [assignments, setAssignments] = useState<{
    id: number;
    user_id: string;
    template_id: number | null;
    source: string;
    assigned_at: string;
  }[]>([]);
```
Change to:
```tsx
  const [assignments, setAssignments] = useState<{
    id: number;
    user_id: string;
    template_id: number | null;
    template_name: string | null;
    source: string;
    assigned_at: string;
  }[]>([]);
```

- [ ] **Step 2: Update the assignment row JSX**

Find the existing row rendering (around line 597–609):
```tsx
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
```
Change to:
```tsx
                    {assignments.map(a => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between gap-2 bg-[var(--hq-bg-main)] rounded-lg px-3 py-2 text-xs"
                      >
                        <span className="font-mono text-white/70 truncate max-w-[180px]" title={a.user_id}>{a.user_id}</span>
                        <span className={`hq-badge ${
                          a.source === 'rule' ? 'hq-badge-green' :
                          a.source === 'ai' ? 'hq-badge-purple' : 'hq-badge-gray'
                        }`}>{a.source}</span>
                        <span className="text-white/70 truncate max-w-[160px]" title={a.template_name ?? ''}>
                          {a.template_name ?? (a.template_id != null ? `#${a.template_id}` : '無選單')}
                        </span>
                        <span className="hq-muted-text whitespace-nowrap">
                          {new Date(a.assigned_at).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/pochunlei/Projects/cofit/Vitera && pnpm --filter @vitera/hq exec tsc --noEmit 2>&1 | head -10
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git -C /Users/pochunlei/Projects/cofit/Vitera add apps/hq/src/app/lineoamenu/HQLineMenuClient.tsx
git -C /Users/pochunlei/Projects/cofit/Vitera commit -m "feat(hq): show template name and timestamp in menu assignments list"
```

---

## Self-Review

**Spec coverage:**
- Backend enrichment (template_name) — Task 1 ✅
- Handles null template_id (fallback `'無選單'`) — Task 2 ✅
- Handles orphaned template_id (template deleted — fallback `#{id}`) — Task 2 ✅
- Shows assigned_at timestamp — Task 2 ✅
- Only 2 files modified ✅

**Placeholder scan:** No TBDs. All code is complete.

**Type consistency:**
- Backend returns `template_name: string | null` via `Map<number, string>.get` + `?? null`
- Frontend state has `template_name: string | null` — matches ✅
- `new Date(a.assigned_at).toLocaleString(...)` — `assigned_at` is `string` from Prisma JSON serialization, works correctly with `new Date()` ✅
