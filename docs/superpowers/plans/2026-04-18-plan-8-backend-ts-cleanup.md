# Backend TypeScript Error Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all 31 pre-existing TypeScript errors in the backend — fixing `string`→`Int` Prisma ID mismatches, `unknown`→`InputJsonValue` JSON cast issues, spread-type errors in `analyze.ts`, and context-variable type errors in `checkins.ts`.

**Architecture:** Three focused edits across three files. `db.ts` needs `parseInt` wrapping for Int-typed Prisma IDs (Supplement, LineOA, LineOARichMenuTemplate) and `Prisma.InputJsonValue` casts for JSON fields. `analyze.ts` needs a type parameter on `parseGeminiJson` calls that use spread. `checkins.ts` needs a cast on `c.get('userId')`. No runtime behaviour changes.

**Tech Stack:** TypeScript, Prisma, Hono

---

## File Map

| File | Action | What changes |
|------|--------|--------------|
| `backend/src/lib/db.ts` | **Modify** | Add `Prisma` to import; wrap Int IDs with `parseInt`; cast JSON fields as `Prisma.InputJsonValue` |
| `backend/src/routes/analyze.ts` | **Modify** | Add `<Record<string, unknown>>` type parameter on 4 `parseGeminiJson` calls that use spread |
| `backend/src/routes/checkins.ts` | **Modify** | Cast `c.get('userId')` return value as `string` in 3 route handlers |

---

### Task 1: Fix db.ts — parseInt for Int IDs and InputJsonValue casts

**Files:**
- Modify: `backend/src/lib/db.ts`

- [ ] **Step 1: Add `Prisma` to the existing import**

Old:
```typescript
import { PrismaClient } from '@prisma/client';
```
New:
```typescript
import { PrismaClient, Prisma } from '@prisma/client';
```

- [ ] **Step 2: Fix `updateSupplement` — two `id` usages (lines ~54 and ~57)**

Old:
```typescript
  const existing = await db().supplement.findFirst({ where: { id, user_id: userId } });
  if (!existing) return null;
  return db().supplement.update({
    where: { id },
```
New:
```typescript
  const existing = await db().supplement.findFirst({ where: { id: parseInt(id, 10), user_id: userId } });
  if (!existing) return null;
  return db().supplement.update({
    where: { id: parseInt(id, 10) },
```

- [ ] **Step 3: Fix `deleteSupplement` — `id` usage (line ~69)**

Old:
```typescript
  await db().supplement.deleteMany({ where: { id, user_id: userId } });
```
New:
```typescript
  await db().supplement.deleteMany({ where: { id: parseInt(id, 10), user_id: userId } });
```

- [ ] **Step 4: Fix `createCheckIn` — `supplement_id` (line ~113)**

Old:
```typescript
    data: { user_id: userId, supplement_id: supplementId },
```
New:
```typescript
    data: { user_id: userId, supplement_id: parseInt(supplementId, 10) },
```

- [ ] **Step 5: Fix `getLineOAById` — `id` usage (line ~436)**

Old:
```typescript
  return db().lineOA.findUnique({ where: { id } });
```
New:
```typescript
  return db().lineOA.findUnique({ where: { id: parseInt(id, 10) } });
```

- [ ] **Step 6: Fix `updateLineOA` — `where: { id }` (line ~453)**

Old:
```typescript
  const oa = await db().lineOA.update({
    where: { id },
```
New:
```typescript
  const oa = await db().lineOA.update({
    where: { id: parseInt(id, 10) },
```

- [ ] **Step 7: Fix `deleteLineOA` — `where: { id }` (line ~466)**

Old:
```typescript
  await db().lineOA.delete({ where: { id } });
```
New:
```typescript
  await db().lineOA.delete({ where: { id: parseInt(id, 10) } });
```

- [ ] **Step 8: Fix `getTemplatesForOA` — `oa_id: oaId` (line ~474)**

Old:
```typescript
  return db().lineOARichMenuTemplate.findMany({
    where: { oa_id: oaId },
```
New:
```typescript
  return db().lineOARichMenuTemplate.findMany({
    where: { oa_id: parseInt(oaId, 10) },
```

- [ ] **Step 9: Fix `getTemplateById` — `where: { id }` (line ~480)**

Old:
```typescript
  return db().lineOARichMenuTemplate.findUnique({ where: { id } });
```
New:
```typescript
  return db().lineOARichMenuTemplate.findUnique({ where: { id: parseInt(id, 10) } });
```

- [ ] **Step 10: Fix `createTemplate` — `oa_id` and `zones` (line ~485)**

Old:
```typescript
  return db().lineOARichMenuTemplate.create({
    data: { oa_id: oaId, name: data.name, zones: data.zones },
```
New:
```typescript
  return db().lineOARichMenuTemplate.create({
    data: { oa_id: parseInt(oaId, 10), name: data.name, zones: data.zones as Prisma.InputJsonValue },
```

- [ ] **Step 11: Fix `updateTemplate` — `where: { id }` and `zones` cast (lines ~491–492)**

Old:
```typescript
  return db().lineOARichMenuTemplate.update({
    where: { id },
    data: {
      ...(data.name != null && { name: data.name }),
      ...(data.zones != null && { zones: data.zones }),
```
New:
```typescript
  return db().lineOARichMenuTemplate.update({
    where: { id: parseInt(id, 10) },
    data: {
      ...(data.name != null && { name: data.name }),
      ...(data.zones != null && { zones: data.zones as Prisma.InputJsonValue }),
```

- [ ] **Step 12: Fix `deleteTemplate` — `where: { id }` (line ~500)**

Old:
```typescript
  await db().lineOARichMenuTemplate.delete({ where: { id } });
```
New:
```typescript
  await db().lineOARichMenuTemplate.delete({ where: { id: parseInt(id, 10) } });
```

- [ ] **Step 13: Fix `setActiveTemplate` — `oa_id` and `templateId` (lines ~506, ~510)**

Old:
```typescript
  await db().lineOARichMenuTemplate.updateMany({
    where: { oa_id: oaId },
    data: { is_active: false },
  });
  return db().lineOARichMenuTemplate.update({
    where: { id: templateId },
```
New:
```typescript
  await db().lineOARichMenuTemplate.updateMany({
    where: { oa_id: parseInt(oaId, 10) },
    data: { is_active: false },
  });
  return db().lineOARichMenuTemplate.update({
    where: { id: parseInt(templateId, 10) },
```

- [ ] **Step 14: Fix `deactivateAllTemplates` — `oa_id: oaId` (line ~520)**

Old:
```typescript
  await db().lineOARichMenuTemplate.updateMany({
    where: { oa_id: oaId },
    data: { is_active: false },
```
New:
```typescript
  await db().lineOARichMenuTemplate.updateMany({
    where: { oa_id: parseInt(oaId, 10) },
    data: { is_active: false },
```

- [ ] **Step 15: Fix `updateScenario` — `flow_nodes` and `flow_edges` JSON casts (line ~550)**

Old:
```typescript
      ...(data.flow_nodes !== undefined && { flow_nodes: data.flow_nodes }),
      ...(data.flow_edges !== undefined && { flow_edges: data.flow_edges }),
```
New:
```typescript
      ...(data.flow_nodes !== undefined && { flow_nodes: data.flow_nodes as Prisma.InputJsonValue }),
      ...(data.flow_edges !== undefined && { flow_edges: data.flow_edges as Prisma.InputJsonValue }),
```

- [ ] **Step 16: Type-check — only db.ts errors should be gone**

```bash
cd /Users/pochunlei/Projects/cofit/Vitera && pnpm --filter @vitera/backend exec tsc --noEmit 2>&1 | grep "db.ts"
```

Expected: no output (zero db.ts errors remaining).

- [ ] **Step 17: Commit**

```bash
git -C /Users/pochunlei/Projects/cofit/Vitera add backend/src/lib/db.ts
git -C /Users/pochunlei/Projects/cofit/Vitera commit -m "fix(db): parseInt for Int Prisma IDs, InputJsonValue casts for JSON fields"
```

---

### Task 2: Fix analyze.ts — parseGeminiJson spread type errors

**Files:**
- Modify: `backend/src/routes/analyze.ts`

The 4 errors are at lines 89, 110, 134, 156 where `parseGeminiJson(text)` returns `unknown` which cannot be spread. Fix: add `<Record<string, unknown>>` type parameter so TypeScript knows the return is an object.

- [ ] **Step 1: Fix the 4 spread-type errors**

There are exactly 4 occurrences of `parseGeminiJson(text)` followed by `{ success: true, ...parsed }`. Replace each one by adding the type parameter:

Old (appears 4 times — at modes `hallux_valgus`, `sexual_health`, `shoe_wear`, and one more):
```typescript
        const parsed = parseGeminiJson(text);
        return c.json({ success: true, ...parsed });
```
New (same replacement for all 4 occurrences — use `replace_all: true`):
```typescript
        const parsed = parseGeminiJson<Record<string, unknown>>(text);
        return c.json({ success: true, ...parsed });
```

- [ ] **Step 2: Verify — only analyze.ts errors should be gone**

```bash
cd /Users/pochunlei/Projects/cofit/Vitera && pnpm --filter @vitera/backend exec tsc --noEmit 2>&1 | grep "analyze.ts"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git -C /Users/pochunlei/Projects/cofit/Vitera add backend/src/routes/analyze.ts
git -C /Users/pochunlei/Projects/cofit/Vitera commit -m "fix(analyze): type parseGeminiJson return as Record for spread compatibility"
```

---

### Task 3: Fix checkins.ts — c.get('userId') type errors

**Files:**
- Modify: `backend/src/routes/checkins.ts`

Hono's `c.get()` returns `never` when the Hono instance has no type parameters declaring `userId`. The fix: cast the result with `as unknown as string` in all 3 route handlers.

- [ ] **Step 1: Fix the 3 occurrences of `c.get('userId')`**

Old (appears 3 times):
```typescript
    const userId = c.get('userId');
```
New (same replacement for all 3 — use `replace_all: true`):
```typescript
    const userId = c.get('userId') as unknown as string;
```

- [ ] **Step 2: Verify — zero errors remain in the entire backend**

```bash
cd /Users/pochunlei/Projects/cofit/Vitera && pnpm --filter @vitera/backend exec tsc --noEmit 2>&1 | head -10
```

Expected: no output (zero errors total).

- [ ] **Step 3: Commit**

```bash
git -C /Users/pochunlei/Projects/cofit/Vitera add backend/src/routes/checkins.ts
git -C /Users/pochunlei/Projects/cofit/Vitera commit -m "fix(checkins): cast c.get userId to string for Hono context compatibility"
```

---

## Self-Review

**Spec coverage:**
- All `string` → `Int` Prisma ID mismatches fixed via `parseInt(id, 10)` — Tasks 1 Steps 2–14 ✅
- `unknown` → `InputJsonValue` for JSON fields (`zones`, `flow_nodes`, `flow_edges`) — Task 1 Steps 10–11, 15 ✅
- `analyze.ts` spread type errors — Task 2 ✅
- `checkins.ts` `c.get('userId')` errors — Task 3 ✅
- Only the 3 affected files modified ✅

**Placeholder scan:** No TBDs. Every edit shows exact old/new strings.

**Type consistency:** `Prisma.InputJsonValue` is the correct Prisma v5 type for JSON input. `parseInt(id, 10)` is the correct conversion — always pass radix 10. `as unknown as string` double-cast is the standard Hono workaround when Variables are not typed on the Hono instance.
