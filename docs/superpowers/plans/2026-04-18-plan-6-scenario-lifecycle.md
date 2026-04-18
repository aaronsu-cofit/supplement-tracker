# Scenario Lifecycle Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add activate/deactivate toggle and delete actions to Wizard scenario tabs so users can control which scenario the `menuEvaluator` uses for LINE menu assignment.

**Architecture:** `WizardPageClient` gains two new handlers (`handleToggleActive`, `handleDeleteScenario`) that call existing backend PATCH/DELETE routes. The scenario tab rendering is updated to show action buttons (● activate toggle, ✕ delete) when a tab is selected. No backend changes needed — `PATCH /api/wizard/scenarios/:id` already accepts `{ is_active: boolean }` and `DELETE /api/wizard/scenarios/:id` already exists.

**Tech Stack:** Next.js App Router, React, Tailwind CSS v4, `apiFetch` from `@vitera/lib`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/hq/src/app/wizard/WizardPageClient.tsx` | **Modify** | Add activate/delete handlers + update scenario tab JSX to show action buttons |

---

### Task 1: Add scenario lifecycle actions to WizardPageClient

**Files:**
- Modify: `apps/hq/src/app/wizard/WizardPageClient.tsx`

- [ ] **Step 1: Read the current file**

Read `apps/hq/src/app/wizard/WizardPageClient.tsx` to confirm current content matches what's expected before editing.

- [ ] **Step 2: Add `handleToggleActive` and `handleDeleteScenario` handlers**

After the `handleSaved` callback (currently ending at line 62), insert these two new handlers:

```tsx
  const handleToggleActive = useCallback(async (scenario: Scenario) => {
    const newValue = !scenario.is_active
    try {
      await apiFetch(`/api/wizard/scenarios/${scenario.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newValue }),
      })
      setScenarios(prev => prev.map(s => s.id === scenario.id ? { ...s, is_active: newValue } : s))
    } catch (err) {
      console.error('[wizard] toggle active error:', err)
    }
  }, [])

  const handleDeleteScenario = useCallback(async (scenario: Scenario) => {
    if (!window.confirm(`Delete scenario "${scenario.name}"?`)) return
    try {
      await apiFetch(`/api/wizard/scenarios/${scenario.id}`, { method: 'DELETE' })
      setScenarios(prev => prev.filter(s => s.id !== scenario.id))
      if (selectedScenarioId === scenario.id) {
        setSelectedScenarioId(null)
        setEditorKey(`new-${Date.now()}`)
      }
    } catch (err) {
      console.error('[wizard] delete error:', err)
    }
  }, [selectedScenarioId])
```

- [ ] **Step 3: Update the scenario tab rendering in the JSX**

Replace the current `scenarios.map(...)` block (lines 91–104, the `<button key={s.id}...>` block) with this updated version that wraps each tab in a `<div>` and appends action buttons when the tab is selected:

```tsx
          {scenarios.map(s => {
            const isSelected = s.id === selectedScenarioId
            return (
              <div key={s.id} className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleScenarioSelect(s)}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-white/10 text-white border-white/20'
                      : 'bg-transparent text-white/50 border-white/10 hover:text-white/80 hover:border-white/20'
                  }`}
                >
                  {s.name}
                  {s.is_active && <span className="ml-1 text-[#5ce0d8]">●</span>}
                </button>
                {isSelected && (
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleToggleActive(s)}
                      title={s.is_active ? 'Deactivate' : 'Activate'}
                      className={`text-[11px] w-6 h-6 flex items-center justify-center rounded-md border transition-colors cursor-pointer ${
                        s.is_active
                          ? 'text-[#5ce0d8] border-[#5ce0d8]/30 bg-[#5ce0d8]/10 hover:bg-[#5ce0d8]/20'
                          : 'text-white/30 border-white/10 bg-white/5 hover:text-[#5ce0d8] hover:border-[#5ce0d8]/20'
                      }`}
                    >
                      ●
                    </button>
                    <button
                      onClick={() => handleDeleteScenario(s)}
                      title="Delete scenario"
                      className="text-[11px] w-6 h-6 flex items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/30 hover:text-red-400 hover:border-red-500/30 transition-colors cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )
          })}
```

- [ ] **Step 4: Type-check**

```bash
cd /Users/pochunlei/Projects/cofit/Vitera && pnpm --filter @vitera/hq exec tsc --noEmit 2>&1 | head -30
```

Expected: no output (zero errors).

- [ ] **Step 5: Commit**

```bash
git -C /Users/pochunlei/Projects/cofit/Vitera add apps/hq/src/app/wizard/WizardPageClient.tsx
git -C /Users/pochunlei/Projects/cofit/Vitera commit -m "feat(wizard): add scenario activate/deactivate toggle and delete actions"
```

---

## Self-Review

**Spec coverage:**
- Activate/deactivate toggle — Task 1 Step 2 (`handleToggleActive`) + Step 3 (● button) ✅
- Active indicator teal ● still shown on tab text for non-selected tabs ✅ (kept in name button JSX)
- Delete with confirmation — Task 1 Step 2 (`handleDeleteScenario` with `window.confirm`) ✅
- After delete: canvas resets to new scenario if deleted scenario was selected ✅
- Only `WizardPageClient.tsx` modified ✅

**Placeholder scan:** No TBDs. All code is complete.

**Type consistency:**
- `handleToggleActive(scenario: Scenario)` and `handleDeleteScenario(scenario: Scenario)` — `Scenario` is already defined at the top of the file ✅
- `handleToggleActive` dep array `[]` is correct — only uses `apiFetch` (stable) and `setScenarios` (stable setter) ✅
- `handleDeleteScenario` dep array `[selectedScenarioId]` is correct — reads `selectedScenarioId` from closure ✅
