# HQ Auth Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `softAuthMiddleware` on the HQ API routes with proper `authMiddleware` + role-gating so that only authenticated admins can list/change users, modules, and stats (and only superadmins can change user roles).

**Architecture:** Add a `requireRole` middleware factory that checks the authenticated user's `role` column in the DB. Gate `/admins` PATCH behind `superadmin`, gate the rest of `/api/hq/*` behind `admin` or `superadmin`. No schema changes — the `user.role` column already exists.

**Tech Stack:** Hono middleware, Prisma

---

## File Map

| File | Action |
|------|--------|
| `backend/src/middleware/requireRole.ts` | **Create** — role-based auth gating |
| `backend/src/routes/hq.ts` | **Modify** — switch to `authMiddleware` + `requireRole` |

---

### Task 1: Create requireRole middleware

**Files:**
- Create: `backend/src/middleware/requireRole.ts`

- [ ] **Step 1: Create the file**

```typescript
import type { Context, Next } from 'hono';
import type { HonoEnv } from '../types.js';
import { db } from '../lib/db.js';

type AnyRole = 'admin' | 'superadmin';

/**
 * Factory: returns Hono middleware that allows only users whose role is in `allowed`.
 * Must run AFTER authMiddleware so c.get('userId') is set.
 * Returns 403 if the user's role is not permitted; 401 if userId is missing.
 */
export function requireRole(...allowed: AnyRole[]) {
  return async function requireRoleMiddleware(c: Context<HonoEnv>, next: Next) {
    const userId = c.get('userId');
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    const user = await db().user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user || !allowed.includes(user.role as AnyRole)) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    await next();
  };
}
```

- [ ] **Step 2: Note on existing db helper**

`backend/src/lib/db.ts` exports a `db()` accessor. Verify it's importable by name:

```bash
grep -n "^export function db\|^function db" /Users/pochunlei/Projects/cofit/Vitera/backend/src/lib/db.ts
```

Expected: shows one of these definitions. If the accessor isn't exported, we'll use `getAllUsers`-style helpers instead (see fallback below).

- [ ] **Step 3: Fallback if `db` is not exported**

If the grep above shows only `function db(): PrismaClient` (internal, not exported), add this helper to `backend/src/lib/db.ts` instead, appended at the end:

```typescript
export async function getUserRole(userId: string): Promise<string | null> {
  const row = await db().user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return row?.role ?? null;
}
```

Then change the middleware import + body:

Old import line:
```typescript
import { db } from '../lib/db.js';
```
New:
```typescript
import { getUserRole } from '../lib/db.js';
```

Old body (inside `requireRoleMiddleware`):
```typescript
    const user = await db().user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user || !allowed.includes(user.role as AnyRole)) {
```
New:
```typescript
    const role = await getUserRole(userId);
    if (!role || !allowed.includes(role as AnyRole)) {
```

- [ ] **Step 4: Type-check**

```bash
cd /Users/pochunlei/Projects/cofit/Vitera && pnpm --filter @vitera/backend exec tsc --noEmit 2>&1 | head -10
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git -C /Users/pochunlei/Projects/cofit/Vitera add backend/src/middleware/requireRole.ts backend/src/lib/db.ts
git -C /Users/pochunlei/Projects/cofit/Vitera commit -m "feat(auth): add requireRole middleware factory for HQ role gating"
```

---

### Task 2: Harden hq.ts routes

**Files:**
- Modify: `backend/src/routes/hq.ts`

- [ ] **Step 1: Update imports**

Old:
```typescript
import { Hono } from 'hono';
import { softAuthMiddleware } from '../middleware/authMiddleware.js';
import { getAllModules, updateModule, getAllUsers, updateUserRole, getHQStats } from '../lib/db.js';
```
New:
```typescript
import { Hono } from 'hono';
import type { HonoEnv } from '../types.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/requireRole.js';
import { getAllModules, updateModule, getAllUsers, updateUserRole, getHQStats } from '../lib/db.js';
```

- [ ] **Step 2: Replace the middleware wiring**

Old:
```typescript
const hq = new Hono();
hq.use('*', softAuthMiddleware);
```
New:
```typescript
const hq = new Hono<HonoEnv>();
hq.use('*', authMiddleware);
hq.use('*', requireRole('admin', 'superadmin'));
```

- [ ] **Step 3: Tighten `/admins` PATCH to superadmin only**

Find the existing PATCH route:
```typescript
// PATCH /api/hq/admins/:userId
hq.patch('/admins/:userId', async (c) => {
```
Change to:
```typescript
// PATCH /api/hq/admins/:userId (superadmin only)
hq.patch('/admins/:userId', requireRole('superadmin'), async (c) => {
```

- [ ] **Step 4: Type-check**

```bash
cd /Users/pochunlei/Projects/cofit/Vitera && pnpm --filter @vitera/backend exec tsc --noEmit 2>&1 | head -10
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git -C /Users/pochunlei/Projects/cofit/Vitera add backend/src/routes/hq.ts
git -C /Users/pochunlei/Projects/cofit/Vitera commit -m "fix(hq): require authenticated admin; superadmin for role changes"
```

---

## Self-Review

**Spec coverage:**
- HQ API now requires real authentication — Task 2 Step 2 ✅
- Admin or superadmin can list/read — Task 2 Step 2 ✅
- Only superadmin can change roles — Task 2 Step 3 ✅
- No schema changes required ✅

**Placeholder scan:** No TBDs. All edits show exact strings.

**Type consistency:**
- `HonoEnv.Variables.userId: string` matches `c.get('userId')` return in middleware
- `requireRole('admin', 'superadmin')` — `AnyRole` type admits both; the grammar accepts multiple via rest params
- `.role` is a plain `string` in Prisma schema (no enum constraint yet), so casting `user.role as AnyRole` is safe for comparison via `.includes()`
