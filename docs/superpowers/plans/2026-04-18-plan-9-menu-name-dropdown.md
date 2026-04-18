# Menu Name Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-text `menuName` input on MenuChangeNode config with a dropdown of real templates for the selected OA, so users can't silently typo a name that `menuEvaluator` will fail to match.

**Architecture:** `WizardPageClient` already fetches OAs; add a second effect that fetches templates when `selectedOAId` changes. Pass the templates list down through `WizardEditor` → `ConfigPanel` via a new prop. `ConfigPanel` renders a `<select>` for `menu-change-node` (falls back to free-text input if no templates loaded, e.g. `default` OA).

**Tech Stack:** Next.js App Router, React, Tailwind CSS v4, `apiFetch` from `@vitera/lib`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/hq/src/app/wizard/WizardPageClient.tsx` | **Modify** | Fetch templates for selected OA; pass `templates` prop to WizardEditor |
| `apps/hq/src/app/wizard/WizardEditor.tsx` | **Modify** | Add `templates` to `WizardEditorProps`; forward to ConfigPanel |
| `apps/hq/src/app/wizard/ConfigPanel.tsx` | **Modify** | Accept `templates` prop; render `<select>` for menu-change-node when templates are available |

---

### Task 1: Fetch templates in WizardPageClient and pass as prop

**Files:**
- Modify: `apps/hq/src/app/wizard/WizardPageClient.tsx`

- [ ] **Step 1: Read the current file to confirm line numbers**

```bash
cat /Users/pochunlei/Projects/cofit/Vitera/apps/hq/src/app/wizard/WizardPageClient.tsx
```

- [ ] **Step 2: Add `Template` interface and `templates` state**

After the existing `interface Scenario { ... }` line (line 8), add:

```tsx
interface Template { id: number; name: string; line_rich_menu_id: string | null; is_active: boolean }
```

After the existing `const [loadingScenarios, setLoadingScenarios] = useState(false)` line (line 19), add:

```tsx
  const [templates, setTemplates] = useState<Template[]>([])
```

- [ ] **Step 3: Add a new `useEffect` that fetches templates when `selectedOAId` changes**

After the existing `useEffect(() => { ... }, [selectedOAId])` for scenarios (ending around line 39), add:

```tsx
  useEffect(() => {
    if (selectedOAId === 'default') {
      setTemplates([])
      return
    }
    apiFetch(`/api/line/oa/${selectedOAId}/templates`)
      .then(r => r.json())
      .then(({ templates: data }: { templates: Template[] }) => setTemplates(data ?? []))
      .catch(console.error)
  }, [selectedOAId])
```

- [ ] **Step 4: Pass `templates` prop to WizardEditor**

In the existing `<WizardEditor ...>` JSX (currently around lines 109–117), add the `templates` prop:

Old:
```tsx
      <WizardEditor
        key={editorKey}
        oaId={selectedOAId}
        scenarioId={selectedScenarioId}
        scenarioName={selectedScenario?.name ?? 'New Scenario'}
        initialNodes={(selectedScenario?.flow_nodes as Node[] | undefined) ?? DEFAULT_NODES}
        initialEdges={(selectedScenario?.flow_edges as Edge[] | undefined) ?? []}
        onSaved={handleSaved}
      />
```
New:
```tsx
      <WizardEditor
        key={editorKey}
        oaId={selectedOAId}
        scenarioId={selectedScenarioId}
        scenarioName={selectedScenario?.name ?? 'New Scenario'}
        initialNodes={(selectedScenario?.flow_nodes as Node[] | undefined) ?? DEFAULT_NODES}
        initialEdges={(selectedScenario?.flow_edges as Edge[] | undefined) ?? []}
        onSaved={handleSaved}
        templates={templates}
      />
```

- [ ] **Step 5: Type-check**

```bash
cd /Users/pochunlei/Projects/cofit/Vitera && pnpm --filter @vitera/hq exec tsc --noEmit 2>&1 | head -10
```

Expected: error `Property 'templates' does not exist on type ...` in `WizardEditorProps` — this is fine, it will be fixed in Task 2. Proceed to commit.

- [ ] **Step 6: Commit**

```bash
git -C /Users/pochunlei/Projects/cofit/Vitera add apps/hq/src/app/wizard/WizardPageClient.tsx
git -C /Users/pochunlei/Projects/cofit/Vitera commit -m "feat(wizard): fetch templates for selected OA and pass to editor"
```

---

### Task 2: Add `templates` prop to WizardEditor and forward to ConfigPanel

**Files:**
- Modify: `apps/hq/src/app/wizard/WizardEditor.tsx`

- [ ] **Step 1: Add `Template` interface and extend `WizardEditorProps`**

After the existing `const DEFAULT_NODE_DATA: ...` block (around line 30), before the `interface WizardEditorProps`, add:

```tsx
export interface WizardTemplate { id: number; name: string; line_rich_menu_id: string | null; is_active: boolean }
```

Then update the props interface. Old:
```tsx
interface WizardEditorProps {
  oaId: string
  scenarioId: string | null
  scenarioName: string
  initialNodes: Node[]
  initialEdges: Edge[]
  onSaved: (id: string, name: string) => void
}
```
New:
```tsx
interface WizardEditorProps {
  oaId: string
  scenarioId: string | null
  scenarioName: string
  initialNodes: Node[]
  initialEdges: Edge[]
  onSaved: (id: string, name: string) => void
  templates: WizardTemplate[]
}
```

- [ ] **Step 2: Destructure `templates` in `EditorInner` and pass to `ConfigPanel`**

Find the `EditorInner` function signature (currently):
```tsx
function EditorInner({ oaId, scenarioId, scenarioName: initialScenarioName, initialNodes, initialEdges, onSaved }: WizardEditorProps) {
```
Change to:
```tsx
function EditorInner({ oaId, scenarioId, scenarioName: initialScenarioName, initialNodes, initialEdges, onSaved, templates }: WizardEditorProps) {
```

Find the `<ConfigPanel node={selectedNode} />` line (currently around line 160) and change to:
```tsx
        <ConfigPanel node={selectedNode} templates={templates} />
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/pochunlei/Projects/cofit/Vitera && pnpm --filter @vitera/hq exec tsc --noEmit 2>&1 | head -10
```

Expected: error `Property 'templates' does not exist on type ...` for ConfigPanel — will be fixed in Task 3. Proceed.

- [ ] **Step 4: Commit**

```bash
git -C /Users/pochunlei/Projects/cofit/Vitera add apps/hq/src/app/wizard/WizardEditor.tsx
git -C /Users/pochunlei/Projects/cofit/Vitera commit -m "feat(wizard): forward templates prop to ConfigPanel"
```

---

### Task 3: Update ConfigPanel to render menu name dropdown

**Files:**
- Modify: `apps/hq/src/app/wizard/ConfigPanel.tsx`

- [ ] **Step 1: Update imports and Props interface**

Old (lines 1–8):
```tsx
'use client'
import { useReactFlow, type Node } from '@xyflow/react'
import type { DayNodeData } from './nodes/DayNode'
import type { AiSkillNodeData } from './nodes/AiSkillNode'
import type { PushMessageNodeData } from './nodes/PushMessageNode'
import type { MenuChangeNodeData } from './nodes/MenuChangeNode'

interface Props { node: Node | null }
```
New:
```tsx
'use client'
import { useReactFlow, type Node } from '@xyflow/react'
import type { DayNodeData } from './nodes/DayNode'
import type { AiSkillNodeData } from './nodes/AiSkillNode'
import type { PushMessageNodeData } from './nodes/PushMessageNode'
import type { MenuChangeNodeData } from './nodes/MenuChangeNode'
import type { WizardTemplate } from './WizardEditor'

interface Props { node: Node | null; templates: WizardTemplate[] }
```

- [ ] **Step 2: Destructure `templates` in the component signature**

Old (line 10):
```tsx
export default function ConfigPanel({ node }: Props) {
```
New:
```tsx
export default function ConfigPanel({ node, templates }: Props) {
```

- [ ] **Step 3: Replace the menu-name text input with a dropdown + fallback**

Find the `menu-change-node` block (currently lines 99–124):

Old:
```tsx
  if (node.type === 'menu-change-node') {
    const d = node.data as unknown as MenuChangeNodeData
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-white/40 uppercase tracking-[0.08em]">Label</span>
          <input
            type="text"
            value={d.label}
            onChange={(e) => upd({ label: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-white/40 uppercase tracking-[0.08em]">Menu Name</span>
          <input
            type="text"
            value={d.menuName}
            placeholder="e.g. Recovery Menu"
            onChange={(e) => upd({ menuName: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
          />
        </div>
      </div>
    )
  }
```
New:
```tsx
  if (node.type === 'menu-change-node') {
    const d = node.data as unknown as MenuChangeNodeData
    const hasTemplates = templates.length > 0
    const menuNameInvalid = hasTemplates && d.menuName !== '' && !templates.some(t => t.name === d.menuName)
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-white/40 uppercase tracking-[0.08em]">Label</span>
          <input
            type="text"
            value={d.label}
            onChange={(e) => upd({ label: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-white/40 uppercase tracking-[0.08em]">Menu Name</span>
          {hasTemplates ? (
            <select
              value={d.menuName}
              onChange={(e) => upd({ menuName: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30 cursor-pointer"
            >
              <option value="">(select menu)</option>
              {templates.map(t => (
                <option key={t.id} value={t.name}>
                  {t.name}{t.is_active ? ' (active)' : ''}{!t.line_rich_menu_id ? ' — not deployed' : ''}
                </option>
              ))}
              {menuNameInvalid && <option value={d.menuName}>{d.menuName} (missing)</option>}
            </select>
          ) : (
            <input
              type="text"
              value={d.menuName}
              placeholder="e.g. Recovery Menu"
              onChange={(e) => upd({ menuName: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
            />
          )}
          {menuNameInvalid && (
            <span className="text-[10px] text-amber-400/80">Template "{d.menuName}" not found in this OA.</span>
          )}
        </div>
      </div>
    )
  }
```

- [ ] **Step 4: Type-check**

```bash
cd /Users/pochunlei/Projects/cofit/Vitera && pnpm --filter @vitera/hq exec tsc --noEmit 2>&1 | head -10
```

Expected: no output (zero errors).

- [ ] **Step 5: Commit**

```bash
git -C /Users/pochunlei/Projects/cofit/Vitera add apps/hq/src/app/wizard/ConfigPanel.tsx
git -C /Users/pochunlei/Projects/cofit/Vitera commit -m "feat(wizard): menu-change-node uses template dropdown with validation warning"
```

---

## Self-Review

**Spec coverage:**
- Fetch templates per OA — Task 1 Step 3 ✅
- Pass templates through props chain — Task 1 Step 4, Task 2 Steps 1–2, Task 3 Steps 1–2 ✅
- Dropdown of real templates — Task 3 Step 3 ✅
- Fallback to text input when templates unavailable (default OA) — Task 3 Step 3 (`hasTemplates` conditional) ✅
- Warn user if saved name no longer matches a template — Task 3 Step 3 (`menuNameInvalid` + amber warning + "(missing)" option) ✅

**Placeholder scan:** No TBDs. All code is complete.

**Type consistency:**
- `WizardTemplate` exported from `WizardEditor.tsx`, imported in `ConfigPanel.tsx` — consistent interface throughout
- `templates: Template[]` in WizardPageClient state shape matches `WizardTemplate` (same 4 fields, same types) ✅
- `d.menuName` remains the stored key (matches Plan 7 bugfix) ✅
- Dropdown `value={d.menuName}` + `onChange={(e) => upd({ menuName: e.target.value })}` preserves existing save path ✅
