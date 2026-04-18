# Proper Hono Typing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `(c as any).get('userId') as string` workaround from Plan 8 with proper `Hono<HonoEnv>` typing in the 4 remaining route files.

**Architecture:** `HonoEnv` already exists in `types.ts` and is used by `ai.ts`, `bones.ts`, `wounds.ts`, `analyze.ts`. The Plan 8 cleanup applied a pragmatic cast to `checkins.ts`, `intimacy.ts`, `notify.ts`, `supplements.ts`. This plan completes that cleanup properly: import `HonoEnv`, type the Hono instance, drop the cast.

**Tech Stack:** TypeScript, Hono

---

## File Map

| File | Action |
|------|--------|
| `backend/src/routes/checkins.ts` | Add HonoEnv import, type Hono instance, remove 3 casts |
| `backend/src/routes/intimacy.ts` | Add HonoEnv import, type Hono instance, remove 2 casts |
| `backend/src/routes/notify.ts` | Add HonoEnv import, type Hono instance, remove 1 cast |
| `backend/src/routes/supplements.ts` | Add HonoEnv import, type Hono instance, remove 4 casts |

---

### Task 1: Type all four route files with HonoEnv

**Files:**
- Modify: `backend/src/routes/checkins.ts`
- Modify: `backend/src/routes/intimacy.ts`
- Modify: `backend/src/routes/notify.ts`
- Modify: `backend/src/routes/supplements.ts`

For each file, apply the same 3 edits:

#### Edit A — Add HonoEnv import

Insert after the existing `import { Hono } from 'hono';` line:
```typescript
import type { HonoEnv } from '../types.js';
```

#### Edit B — Type the Hono instance

Replace `new Hono()` with `new Hono<HonoEnv>()`. The variable name differs per file:
- `checkins.ts`: `const checkins = new Hono();` → `const checkins = new Hono<HonoEnv>();`
- `intimacy.ts`: `const intimacy = new Hono();` → `const intimacy = new Hono<HonoEnv>();`
- `notify.ts`: `const notify = new Hono();` → `const notify = new Hono<HonoEnv>();`
- `supplements.ts`: `const supplements = new Hono();` → `const supplements = new Hono<HonoEnv>();`

#### Edit C — Remove the cast

In each file, replace all occurrences (use `replace_all: true`):

Old:
```typescript
    const userId = (c as any).get('userId') as string;
```
New:
```typescript
    const userId = c.get('userId');
```

- [ ] **Step 1: Apply all 3 edits to `checkins.ts`**

```bash
# Read file to confirm state first
```
Then apply Edit A (add import), Edit B (type Hono), Edit C (replace_all cast removal).

- [ ] **Step 2: Apply all 3 edits to `intimacy.ts`**

Same pattern.

- [ ] **Step 3: Apply all 3 edits to `notify.ts`**

Same pattern.

- [ ] **Step 4: Apply all 3 edits to `supplements.ts`**

Same pattern.

- [ ] **Step 5: Type-check**

```bash
cd /Users/pochunlei/Projects/cofit/Vitera && pnpm --filter @vitera/backend exec tsc --noEmit 2>&1 | head -10
```

Expected: no output (zero errors).

- [ ] **Step 6: Verify no `(c as any)` remains in any of the 4 files**

```bash
grep -n "c as any" /Users/pochunlei/Projects/cofit/Vitera/backend/src/routes/checkins.ts /Users/pochunlei/Projects/cofit/Vitera/backend/src/routes/intimacy.ts /Users/pochunlei/Projects/cofit/Vitera/backend/src/routes/notify.ts /Users/pochunlei/Projects/cofit/Vitera/backend/src/routes/supplements.ts
```

Expected: no matches.

- [ ] **Step 7: Commit**

```bash
git -C /Users/pochunlei/Projects/cofit/Vitera add backend/src/routes/checkins.ts backend/src/routes/intimacy.ts backend/src/routes/notify.ts backend/src/routes/supplements.ts
git -C /Users/pochunlei/Projects/cofit/Vitera commit -m "refactor(routes): type Hono<HonoEnv> instead of casting c.get as any"
```

---

## Self-Review

**Spec coverage:**
- 4 files updated — checkins, intimacy, notify, supplements ✅
- All `(c as any).get('userId') as string` replaced with typed `c.get('userId')` ✅
- HonoEnv imported consistently from `../types.js` ✅
- Tsc remains clean ✅

**Placeholder scan:** No TBDs. All edits are exact.

**Type consistency:** `HonoEnv.Variables.userId` is `string` in `types.ts`, so `c.get('userId')` returns `string` — matches what the `as string` cast previously asserted.
