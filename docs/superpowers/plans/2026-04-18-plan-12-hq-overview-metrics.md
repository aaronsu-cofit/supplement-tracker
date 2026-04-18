# Real HQ Overview Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the HQ Overview page's hardcoded placeholder metrics (1,204 users, 45,892 images...) with real counts from the database — LINE OAs, scenarios, deployed menus, recent assignments.

**Architecture:** Add a `getHQStats()` DB helper that returns simple counts, expose it via `GET /api/hq/stats`, and wire it into `HQOverviewClient`. Keep the existing 4-card grid layout; just replace the content.

**Tech Stack:** Prisma, Hono, Next.js App Router, Tailwind CSS v4

---

## File Map

| File | Action |
|------|--------|
| `backend/src/lib/db.ts` | Add `getHQStats` function |
| `backend/src/routes/hq.ts` | Add `GET /stats` route |
| `apps/hq/src/app/HQOverviewClient.tsx` | Fetch stats, render real values |

---

### Task 1: Backend — add getHQStats and route

**Files:**
- Modify: `backend/src/lib/db.ts`
- Modify: `backend/src/routes/hq.ts`

- [ ] **Step 1: Add `getHQStats` to db.ts**

Append this function at the end of `backend/src/lib/db.ts` (after the existing `getRecentMenuAssignments`):

```typescript
export async function getHQStats() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [
    oaCount,
    scenarioCount,
    activeScenarioCount,
    templateCount,
    deployedTemplateCount,
    recentAssignmentCount,
  ] = await Promise.all([
    db().lineOA.count(),
    db().coBlocksScenario.count(),
    db().coBlocksScenario.count({ where: { is_active: true } }),
    db().lineOARichMenuTemplate.count(),
    db().lineOARichMenuTemplate.count({ where: { line_rich_menu_id: { not: null } } }),
    db().userMenuAssignment.count({ where: { assigned_at: { gte: sevenDaysAgo } } }),
  ]);
  return {
    oaCount,
    scenarioCount,
    activeScenarioCount,
    templateCount,
    deployedTemplateCount,
    recentAssignmentCount,
  };
}
```

- [ ] **Step 2: Add `GET /api/hq/stats` route**

In `backend/src/routes/hq.ts`, update the import:

Old:
```typescript
import { getAllModules, updateModule, getAllUsers, updateUserRole } from '../lib/db.js';
```
New:
```typescript
import { getAllModules, updateModule, getAllUsers, updateUserRole, getHQStats } from '../lib/db.js';
```

Then add this route after the `/admins` PATCH route (after line 54, before `export default hq;`):

```typescript
// GET /api/hq/stats
hq.get('/stats', async (c) => {
  try {
    const stats = await getHQStats();
    return c.json(stats);
  } catch (error) {
    console.error('Failed to fetch HQ stats:', error);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});
```

- [ ] **Step 3: Type-check backend**

```bash
cd /Users/pochunlei/Projects/cofit/Vitera && pnpm --filter @vitera/backend exec tsc --noEmit 2>&1 | head -10
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git -C /Users/pochunlei/Projects/cofit/Vitera add backend/src/lib/db.ts backend/src/routes/hq.ts
git -C /Users/pochunlei/Projects/cofit/Vitera commit -m "feat(hq): add /api/hq/stats endpoint with OA, scenario, template, assignment counts"
```

---

### Task 2: Frontend — Overview page uses real stats

**Files:**
- Modify: `apps/hq/src/app/HQOverviewClient.tsx`

- [ ] **Step 1: Replace the entire file content**

Old content is a 40-line component with hardcoded metrics. Replace with:

```tsx
'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@vitera/lib';

interface HQStats {
  oaCount: number;
  scenarioCount: number;
  activeScenarioCount: number;
  templateCount: number;
  deployedTemplateCount: number;
  recentAssignmentCount: number;
}

export default function HQOverviewClient() {
  const [stats, setStats] = useState<HQStats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/hq/stats')
      .then(r => r.json())
      .then((data: HQStats) => setStats(data))
      .catch(err => {
        console.error('[hq/overview] stats error:', err);
        setLoadError('無法載入統計資料');
      });
  }, []);

  const cards = stats ? [
    { label: 'LINE OA 數量', value: String(stats.oaCount), trend: '', color: 'var(--hq-cyan)' },
    { label: '劇本總數', value: String(stats.scenarioCount), trend: `${stats.activeScenarioCount} active`, color: 'var(--hq-purple)' },
    { label: '選單模板', value: String(stats.templateCount), trend: `${stats.deployedTemplateCount} deployed`, color: 'var(--hq-success)' },
    { label: '近 7 日選單分配', value: String(stats.recentAssignmentCount), trend: '', color: 'var(--hq-text-muted)' },
  ] : [];

  return (
    <div className="hq-fade-in">
      <div className="hq-header">
        <h2>總覽 (Overview)</h2>
        <p>歡迎回到 HQ Control Center，這裡掌握四大健康模組的營運狀況。</p>
      </div>

      <div className="hq-grid-4">
        {!stats && !loadError && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="hq-card">
            <div className="hq-metric-label">載入中...</div>
            <div className="hq-metric-value-row">
              <span className="hq-metric-value text-white/20">—</span>
            </div>
          </div>
        ))}
        {loadError && (
          <div className="hq-card hq-col-2">
            <p className="hq-empty-text">{loadError}</p>
          </div>
        )}
        {cards.map((metric, i) => (
          <div key={i} className="hq-card">
            <div className="hq-metric-label">{metric.label}</div>
            <div className="hq-metric-value-row">
              <span className="hq-metric-value">{metric.value}</span>
              {metric.trend && (
                <span className="hq-metric-trend" style={{ color: metric.color }}>{metric.trend}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="hq-grid-3">
        <div className="hq-card hq-col-2 hq-center-h min-h-300">
          <p className="hq-empty-text">流量報表圖即將推出 (Traffic Chart Placeholder)</p>
        </div>
        <div className="hq-card hq-center-h min-h-300">
          <p className="hq-empty-text">最新系統日誌即將推出 (Logs Placeholder)</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd /Users/pochunlei/Projects/cofit/Vitera && pnpm --filter @vitera/hq exec tsc --noEmit 2>&1 | head -10
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git -C /Users/pochunlei/Projects/cofit/Vitera add apps/hq/src/app/HQOverviewClient.tsx
git -C /Users/pochunlei/Projects/cofit/Vitera commit -m "feat(hq): Overview shows real OA/scenario/menu stats instead of placeholders"
```

---

## Self-Review

**Spec coverage:**
- Real counts via Prisma queries — Task 1 ✅
- 4 metrics: OA, scenario, template, recent assignment — Task 2 ✅
- Preserves existing layout (hq-grid-4 + placeholder panels) — Task 2 ✅
- Loading + error states — Task 2 (skeleton cards + error card) ✅

**Placeholder scan:** No TBDs. All code complete. The "Traffic Chart Placeholder" / "Logs Placeholder" lines are pre-existing intentional UI placeholders not within scope.

**Type consistency:** `HQStats` interface in frontend mirrors backend return shape field-for-field — all `number` types.
