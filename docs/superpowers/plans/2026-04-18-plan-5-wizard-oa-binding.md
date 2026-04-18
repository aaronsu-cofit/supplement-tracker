# Wizard OA Binding & Scenario Browser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add OA selector and scenario picker bar to the Wizard so users can work with real LINE OAs and switch between multiple scenarios instead of using the hardcoded `oa_id='default'`.

**Architecture:** New `WizardPageClient` handles OA + scenario selection state; `WizardEditor` becomes a pure canvas editor accepting props. Key-prop remount resets the canvas when switching scenarios. All backend routes already exist from Plan 3.

**Tech Stack:** Next.js App Router, React, @xyflow/react, Tailwind CSS v4, `apiFetch` from `@vitera/lib`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/hq/src/app/wizard/WizardPageClient.tsx` | **Create** | OA picker, scenario list bar, wraps WizardEditor |
| `apps/hq/src/app/wizard/WizardEditor.tsx` | **Modify** | Accept `oaId/scenarioId/initialNodes/initialEdges/onSaved` props; remove hardcoded `'default'` |
| `apps/hq/src/app/wizard/page.tsx` | **Modify** | Render `WizardPageClient` instead of `WizardEditor` |

---

### Task 1: Refactor WizardEditor to accept scenario context props

**Files:**
- Modify: `apps/hq/src/app/wizard/WizardEditor.tsx`

- [ ] **Step 1: Read the current WizardEditor**

```bash
# Already done above — current state:
# - EditorInner manages scenarioId/scenarioName state internally
# - handleSave hardcodes '/api/wizard/oa/default/scenarios'
# - WizardEditor just wraps EditorInner in ReactFlowProvider
```

- [ ] **Step 2: Rewrite WizardEditor.tsx with props interface**

Replace the entire file content with:

```tsx
'use client'
import { useCallback, useRef, useState } from 'react'
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState, useReactFlow,
  type Node, type Edge, type OnConnect, type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { apiFetch } from '@vitera/lib'
import BlockPalette from './BlockPalette'
import ConfigPanel from './ConfigPanel'
import DayNode from './nodes/DayNode'
import AiSkillNode from './nodes/AiSkillNode'
import PushMessageNode from './nodes/PushMessageNode'
import MenuChangeNode from './nodes/MenuChangeNode'
import ScenarioToolbar from './ScenarioToolbar'

const nodeTypes: NodeTypes = {
  'day-node': DayNode,
  'ai-skill-node': AiSkillNode,
  'push-message-node': PushMessageNode,
  'menu-change-node': MenuChangeNode,
}

const DEFAULT_NODE_DATA: Record<string, Record<string, unknown>> = {
  'day-node':          { day: 1,            label: 'Day 1' },
  'ai-skill-node':     { agentId: 'ai-expert', label: 'AI Expert' },
  'push-message-node': { message: '',       label: 'Push Message' },
  'menu-change-node':  { menuName: '',      label: 'Switch Menu' },
}

interface WizardEditorProps {
  oaId: string
  scenarioId: string | null
  scenarioName: string
  initialNodes: Node[]
  initialEdges: Edge[]
  onSaved: (id: string, name: string) => void
}

function EditorInner({ oaId, scenarioId, scenarioName: initialScenarioName, initialNodes, initialEdges, onSaved }: WizardEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const { screenToFlowPosition } = useReactFlow()
  const idCounter = useRef(1)

  const [currentScenarioId, setCurrentScenarioId] = useState<string | null>(scenarioId)
  const [scenarioName, setScenarioName] = useState(initialScenarioName)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/reactflow')
    if (!type) return

    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    const id = `${type}-${idCounter.current++}`

    setNodes((nds) => {
      const data = { ...(DEFAULT_NODE_DATA[type] ?? {}) }
      if (type === 'day-node') {
        const maxDay = nds
          .filter((n) => n.type === 'day-node')
          .reduce((m, n) => Math.max(m, (n.data as { day: number }).day), 0)
        data.day = maxDay + 1
        data.label = `Day ${maxDay + 1}`
      }
      return nds.concat({ id, type, position, data })
    })
  }, [screenToFlowPosition, setNodes])

  const onSelectionChange = useCallback(({ nodes: sel }: { nodes: Node[] }) => {
    setSelectedNode(sel[0] ?? null)
  }, [])

  const handleSave = useCallback(async () => {
    if (!scenarioName.trim()) return
    setSaveError(null)
    setSaving(true)
    try {
      if (!currentScenarioId) {
        const createRes = await apiFetch(`/api/wizard/oa/${oaId}/scenarios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: scenarioName, flow_nodes: nodes, flow_edges: edges }),
        })
        const { scenario } = await createRes.json() as { scenario: { id: string } }
        setCurrentScenarioId(scenario.id)
        onSaved(scenario.id, scenarioName)
      } else {
        await apiFetch(`/api/wizard/scenarios/${currentScenarioId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: scenarioName, flow_nodes: nodes, flow_edges: edges }),
        })
        onSaved(currentScenarioId, scenarioName)
      }
      setLastSaved(new Date())
    } catch (err) {
      console.error('[wizard] save error:', err)
      setSaveError('Save failed. Try again.')
    } finally {
      setSaving(false)
    }
  }, [currentScenarioId, scenarioName, nodes, edges, oaId, onSaved])

  return (
    <div className="flex flex-1 bg-[#0d0d0d] text-white min-h-0">
      <div className="w-60 border-r border-white/[0.08] p-4 overflow-y-auto shrink-0">
        <BlockPalette />
      </div>
      <div className="flex-1 relative min-w-0">
        <ScenarioToolbar
          name={scenarioName}
          onNameChange={setScenarioName}
          onSave={handleSave}
          saving={saving}
          lastSaved={lastSaved}
        />
        {saveError && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 bg-red-900/80 border border-red-500/50 text-red-200 text-xs px-3 py-1.5 rounded-lg">
            {saveError}
          </div>
        )}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          fitView
          style={{ background: '#0d0d0d' }}
        >
          <Background color="rgba(255,255,255,0.04)" gap={24} />
          <Controls style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} />
          <MiniMap
            nodeColor={() => 'rgba(255,255,255,0.15)'}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </ReactFlow>
      </div>
      <div className="w-[280px] border-l border-white/[0.08] p-4 overflow-y-auto shrink-0">
        <p className="text-[10px] text-white/30 uppercase tracking-[0.1em] mb-3">Config</p>
        <ConfigPanel node={selectedNode} />
      </div>
    </div>
  )
}

export default function WizardEditor(props: WizardEditorProps) {
  return (
    <ReactFlowProvider>
      <EditorInner {...props} />
    </ReactFlowProvider>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
cd /Users/pochunlei/Projects/cofit/Vitera
pnpm --filter @vitera/hq exec tsc --noEmit
```

Expected: no errors related to WizardEditor props.

- [ ] **Step 4: Commit**

```bash
git add apps/hq/src/app/wizard/WizardEditor.tsx
git commit -m "refactor(wizard): accept scenario context as props, remove hardcoded oa_id default"
```

---

### Task 2: Create WizardPageClient

**Files:**
- Create: `apps/hq/src/app/wizard/WizardPageClient.tsx`

- [ ] **Step 1: Create WizardPageClient.tsx**

```tsx
'use client'
import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '@vitera/lib'
import type { Node, Edge } from '@xyflow/react'
import WizardEditor from './WizardEditor'

interface OA { id: number; name: string; is_active: boolean }
interface Scenario { id: string; name: string; flow_nodes: unknown; flow_edges: unknown; is_active: boolean }

const DEFAULT_NODES: Node[] = [
  { id: 'day-0', type: 'day-node', position: { x: 80, y: 180 }, data: { day: 0, label: 'Follow' } },
]

export default function WizardPageClient() {
  const [oas, setOas] = useState<OA[]>([])
  const [selectedOAId, setSelectedOAId] = useState<string>('default')
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null)
  const [loadingScenarios, setLoadingScenarios] = useState(false)
  const [editorKey, setEditorKey] = useState('new')

  useEffect(() => {
    apiFetch('/api/line/oa')
      .then(r => r.json())
      .then(({ oas: data }: { oas: OA[] }) => setOas(data ?? []))
      .catch(console.error)
  }, [])

  useEffect(() => {
    setLoadingScenarios(true)
    setScenarios([])
    setSelectedScenarioId(null)
    setEditorKey('new')
    apiFetch(`/api/wizard/oa/${selectedOAId}/scenarios`)
      .then(r => r.json())
      .then(({ scenarios: data }: { scenarios: Scenario[] }) => setScenarios(data ?? []))
      .catch(console.error)
      .finally(() => setLoadingScenarios(false))
  }, [selectedOAId])

  const handleOAChange = useCallback((oaId: string) => {
    setSelectedOAId(oaId)
  }, [])

  const handleScenarioSelect = useCallback((scenario: Scenario) => {
    setSelectedScenarioId(scenario.id)
    setEditorKey(scenario.id)
  }, [])

  const handleNewScenario = useCallback(() => {
    setSelectedScenarioId(null)
    setEditorKey(`new-${Date.now()}`)
  }, [])

  const handleSaved = useCallback((id: string, name: string) => {
    setSelectedScenarioId(id)
    setScenarios(prev => {
      const exists = prev.find(s => s.id === id)
      if (exists) return prev.map(s => s.id === id ? { ...s, name } : s)
      return [{ id, name, flow_nodes: [], flow_edges: [], is_active: false }, ...prev]
    })
  }, [])

  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId)

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* OA + scenario picker bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#0d0d0d] border-b border-white/[0.08] shrink-0">
        <select
          value={selectedOAId}
          onChange={e => handleOAChange(e.target.value)}
          className="bg-[rgba(255,255,255,0.05)] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none cursor-pointer"
        >
          <option value="default">Default (legacy)</option>
          {oas.map(oa => (
            <option key={oa.id} value={String(oa.id)}>{oa.name}</option>
          ))}
        </select>
        <div className="w-px h-4 bg-white/10 shrink-0" />
        <div className="flex items-center gap-2 flex-1 overflow-x-auto">
          <button
            onClick={handleNewScenario}
            className="shrink-0 text-xs px-2.5 py-1 rounded-md bg-[rgba(124,92,252,0.15)] text-[#a78bfa] border border-[rgba(124,92,252,0.3)] hover:bg-[rgba(124,92,252,0.25)] transition-colors cursor-pointer"
          >
            + New
          </button>
          {loadingScenarios && (
            <span className="text-xs text-white/30 shrink-0">Loading...</span>
          )}
          {scenarios.map(s => (
            <button
              key={s.id}
              onClick={() => handleScenarioSelect(s)}
              className={`shrink-0 text-xs px-2.5 py-1 rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                s.id === selectedScenarioId
                  ? 'bg-white/10 text-white border-white/20'
                  : 'bg-transparent text-white/50 border-white/10 hover:text-white/80 hover:border-white/20'
              }`}
            >
              {s.name}
              {s.is_active && <span className="ml-1 text-[#5ce0d8]">●</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas — key remounts EditorInner to reset nodes/edges when scenario changes */}
      <WizardEditor
        key={editorKey}
        oaId={selectedOAId}
        scenarioId={selectedScenarioId}
        scenarioName={selectedScenario?.name ?? 'New Scenario'}
        initialNodes={(selectedScenario?.flow_nodes as Node[] | undefined) ?? DEFAULT_NODES}
        initialEdges={(selectedScenario?.flow_edges as Edge[] | undefined) ?? []}
        onSaved={handleSaved}
      />
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @vitera/hq exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/hq/src/app/wizard/WizardPageClient.tsx
git commit -m "feat(wizard): add WizardPageClient with OA picker and scenario browser"
```

---

### Task 3: Wire page.tsx to use WizardPageClient

**Files:**
- Modify: `apps/hq/src/app/wizard/page.tsx`

- [ ] **Step 1: Update page.tsx**

Replace the entire file:

```tsx
import WizardPageClient from './WizardPageClient'

export default function WizardPage() {
  return <WizardPageClient />
}
```

- [ ] **Step 2: Start the dev server and verify**

```bash
pnpm --filter @vitera/hq dev
```

Open `http://localhost:3001/wizard` (or whichever port HQ runs on).

Verify:
1. OA dropdown shows "Default (legacy)" + any seeded OAs
2. Scenario list bar shows scenarios for the selected OA (or empty if none)
3. Clicking a scenario loads its flow data into the canvas
4. Clicking "+ New" resets the canvas to the default Follow node
5. Saving a new scenario adds it to the scenario bar
6. Saving an existing scenario updates its name in the bar
7. Switching OA clears the canvas and reloads scenarios for the new OA
8. The HQ sidebar collapse still works (`«`/`»` toggle)

- [ ] **Step 3: Commit**

```bash
git add apps/hq/src/app/wizard/page.tsx
git commit -m "feat(wizard): wire WizardPage to WizardPageClient"
```

---

## Self-Review

**Spec coverage check:**
- OA selector — Task 2 ✅
- Scenario list / picker — Task 2 ✅
- Load scenario flow into canvas — Task 2 (key-prop remount + initialNodes/initialEdges) ✅
- Create new scenario — Task 2 (+ New button → handleNewScenario) ✅
- Save to real OA ID — Task 1 (oaId prop replaces hardcoded 'default') ✅
- Legacy 'default' scenarios preserved — Task 2 (default option in OA select) ✅

**Placeholder scan:** No TBDs. All code is complete.

**Type consistency:**
- `WizardEditorProps` defined in Task 1 with `oaId: string, scenarioId: string | null, scenarioName: string, initialNodes: Node[], initialEdges: Edge[], onSaved: (id: string, name: string) => void`
- `WizardPageClient` passes all 6 props in Task 2 ✅
- `handleSaved(id: string, name: string)` matches `onSaved` signature ✅
- `editorKey` is `string` (either `'new'`, `scenario.id`, or `'new-${timestamp}'`) ✅
