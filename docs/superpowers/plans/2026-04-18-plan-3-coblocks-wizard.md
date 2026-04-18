# CoBlocks DTx Wizard — Drag-and-Drop Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a visual node-based DTx scenario editor in the HQ app using `@xyflow/react`, where users drag blocks (AI Skill, Push Message, Menu Change, Day Marker) onto a canvas to design patient care programs, configure each node in a right panel, and save the scenario to the backend.

**Architecture:** A new `/wizard` page in HQ contains a three-panel layout (Block Palette | React Flow Canvas | Config Panel). Blocks are dragged from the palette onto the canvas and connected with edges to define care flow. Scenarios are persisted via a new `/api/wizard` backend route backed by a new `CoBlocksScenario` Prisma model.

**Tech Stack:** `@xyflow/react` v12, Tailwind CSS v4, Hono.js backend, Prisma + Postgres, `apiFetch` from `@vitera/lib`

---

## File Structure

**New files:**
- `apps/hq/src/app/wizard/page.tsx`
- `apps/hq/src/app/wizard/WizardEditor.tsx` — main client component (three-panel layout + all state)
- `apps/hq/src/app/wizard/BlockPalette.tsx` — left sidebar, draggable block type tiles
- `apps/hq/src/app/wizard/ConfigPanel.tsx` — right panel, live node config editing
- `apps/hq/src/app/wizard/ScenarioToolbar.tsx` — floating toolbar (name + save)
- `apps/hq/src/app/wizard/nodes/DayNode.tsx`
- `apps/hq/src/app/wizard/nodes/AiSkillNode.tsx`
- `apps/hq/src/app/wizard/nodes/PushMessageNode.tsx`
- `apps/hq/src/app/wizard/nodes/MenuChangeNode.tsx`
- `backend/src/routes/wizard.ts`
- `backend/prisma/migrations/20260418000000_add_coblocks_scenario/migration.sql`

**Modified files:**
- `backend/prisma/schema.prisma` — add `CoBlocksScenario` model
- `backend/src/lib/db.ts` — add scenario CRUD functions
- `backend/src/index.ts` — register `/api/wizard` route
- `apps/hq/src/app/ClientLayout.tsx` — add wizard entry to `NAV_LINKS`
- `apps/hq/package.json` — add `@xyflow/react`

---

### Task 1: Backend — CoBlocksScenario model + CRUD API

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260418000000_add_coblocks_scenario/migration.sql`
- Modify: `backend/src/lib/db.ts`
- Create: `backend/src/routes/wizard.ts`
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Add CoBlocksScenario model to schema.prisma**

Append after the last model (`LineOARichMenuTemplate`) in `backend/prisma/schema.prisma`:

```prisma
model CoBlocksScenario {
  id         String   @id @default(cuid())
  oa_id      String
  name       String
  flow_nodes Json     @default("[]")
  flow_edges Json     @default("[]")
  is_active  Boolean  @default(false)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt

  @@map("coblocks_scenarios")
}
```

- [ ] **Step 2: Create migration SQL**

Create file `backend/prisma/migrations/20260418000000_add_coblocks_scenario/migration.sql`:

```sql
CREATE TABLE "coblocks_scenarios" (
    "id" TEXT NOT NULL,
    "oa_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "flow_nodes" JSONB NOT NULL DEFAULT '[]',
    "flow_edges" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "coblocks_scenarios_pkey" PRIMARY KEY ("id")
);
```

- [ ] **Step 3: Apply migration**

```bash
cd backend && npx prisma db push
```

Expected: `✓ Your database is now in sync with your Prisma schema`

- [ ] **Step 4: Add scenario CRUD functions to backend/src/lib/db.ts**

Append after the existing LineOA template functions:

```typescript
// CoBlocks Scenarios
export async function getScenariosForOA(oaId: string) {
  return prisma.coBlocksScenario.findMany({
    where: { oa_id: oaId },
    orderBy: { created_at: 'desc' },
  })
}

export async function getScenarioById(id: string) {
  return prisma.coBlocksScenario.findUnique({ where: { id } })
}

export async function createScenario(oaId: string, name: string) {
  return prisma.coBlocksScenario.create({
    data: { oa_id: oaId, name },
  })
}

export async function updateScenario(
  id: string,
  data: { name?: string; flow_nodes?: unknown; flow_edges?: unknown; is_active?: boolean }
) {
  return prisma.coBlocksScenario.update({
    where: { id },
    data: { ...data, updated_at: new Date() },
  })
}

export async function deleteScenario(id: string) {
  return prisma.coBlocksScenario.delete({ where: { id } })
}
```

- [ ] **Step 5: Create backend/src/routes/wizard.ts**

```typescript
import { Hono } from 'hono'
import { authMiddleware } from '../middleware/authMiddleware.js'
import {
  getScenariosForOA, getScenarioById,
  createScenario, updateScenario, deleteScenario,
} from '../lib/db.js'

const wizard = new Hono()
wizard.use('*', authMiddleware)

wizard.get('/oa/:oaId/scenarios', async (c) => {
  const scenarios = await getScenariosForOA(c.req.param('oaId'))
  return c.json({ scenarios })
})

wizard.post('/oa/:oaId/scenarios', async (c) => {
  const { name } = await c.req.json<{ name: string }>()
  if (!name?.trim()) return c.json({ error: 'name required' }, 400)
  const scenario = await createScenario(c.req.param('oaId'), name.trim())
  return c.json({ scenario }, 201)
})

wizard.get('/scenarios/:id', async (c) => {
  const scenario = await getScenarioById(c.req.param('id'))
  if (!scenario) return c.json({ error: 'not found' }, 404)
  return c.json({ scenario })
})

wizard.patch('/scenarios/:id', async (c) => {
  const body = await c.req.json<{
    name?: string
    flow_nodes?: unknown
    flow_edges?: unknown
    is_active?: boolean
  }>()
  const scenario = await updateScenario(c.req.param('id'), body)
  return c.json({ scenario })
})

wizard.delete('/scenarios/:id', async (c) => {
  await deleteScenario(c.req.param('id'))
  return c.json({ success: true })
})

export default wizard
```

- [ ] **Step 6: Register wizard routes in backend/src/index.ts**

Find the block of `app.route(...)` calls and add:

```typescript
import wizardRoutes from './routes/wizard.js'
// ...
app.route('/api/wizard', wizardRoutes)
```

- [ ] **Step 7: Verify TypeScript**

```bash
cd backend && npx tsc --noEmit 2>&1 | grep -E "wizard|coblocks"
```

Expected: no output (no errors in the new files).

- [ ] **Step 8: Commit**

```bash
git add backend/prisma/schema.prisma \
        backend/prisma/migrations/20260418000000_add_coblocks_scenario/ \
        backend/src/lib/db.ts \
        backend/src/routes/wizard.ts \
        backend/src/index.ts
git commit -m "feat: add CoBlocksScenario model and /api/wizard CRUD routes"
```

---

### Task 2: HQ — Install @xyflow/react + page scaffold + nav link

**Files:**
- Modify: `apps/hq/package.json`
- Create: `apps/hq/src/app/wizard/page.tsx`
- Create: `apps/hq/src/app/wizard/WizardEditor.tsx` (skeleton)
- Modify: `apps/hq/src/app/ClientLayout.tsx`

- [ ] **Step 1: Install @xyflow/react**

```bash
pnpm add @xyflow/react --filter @vitera/hq
```

Expected: `@xyflow/react` appears in `apps/hq/package.json` dependencies.

- [ ] **Step 2: Create apps/hq/src/app/wizard/page.tsx**

```typescript
import WizardEditor from './WizardEditor'

export default function WizardPage() {
  return <WizardEditor />
}
```

- [ ] **Step 3: Create apps/hq/src/app/wizard/WizardEditor.tsx (skeleton)**

```typescript
'use client'
import { ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

export default function WizardEditor() {
  return (
    <ReactFlowProvider>
      <div style={{ display: 'flex', height: '100vh', background: '#0d0d0d', color: '#fff' }}>
        <div style={{ width: 240, borderRight: '1px solid rgba(255,255,255,0.1)', padding: 16 }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Block Palette — Task 3</p>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.2)' }}>Canvas — Task 3</p>
        </div>
        <div style={{ width: 280, borderLeft: '1px solid rgba(255,255,255,0.1)', padding: 16 }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Config Panel — Task 4</p>
        </div>
      </div>
    </ReactFlowProvider>
  )
}
```

- [ ] **Step 4: Add wizard entry to NAV_LINKS in apps/hq/src/app/ClientLayout.tsx**

In `ClientLayout.tsx`, the `NAV_LINKS` array currently is:

```typescript
const NAV_LINKS = [
  { href: "/", label: "總覽 Overview" },
  { href: "/modules", label: "模組管理 Modules" },
  { href: "/admins", label: "管理員 Admins" },
  { href: "/lineoamenu", label: "LINE OA 選單" },
];
```

Add the wizard entry:

```typescript
const NAV_LINKS = [
  { href: "/", label: "總覽 Overview" },
  { href: "/modules", label: "模組管理 Modules" },
  { href: "/admins", label: "管理員 Admins" },
  { href: "/lineoamenu", label: "LINE OA 選單" },
  { href: "/wizard", label: "CoBlocks Wizard" },
];
```

- [ ] **Step 5: Verify page loads**

```bash
pnpm dev:hq
```

Navigate to `http://localhost:3003/wizard` (or whichever port HQ runs on). Expect the three-panel skeleton with no console errors.

Check sidebar shows "CoBlocks Wizard" link.

- [ ] **Step 6: Commit**

```bash
git add apps/hq/package.json \
        apps/hq/src/app/wizard/ \
        apps/hq/src/app/ClientLayout.tsx \
        pnpm-lock.yaml
git commit -m "feat: scaffold wizard page and add nav link"
```

---

### Task 3: Custom Nodes + Block Palette + React Flow Canvas with Drag-to-Drop

**Files:**
- Create: `apps/hq/src/app/wizard/nodes/DayNode.tsx`
- Create: `apps/hq/src/app/wizard/nodes/AiSkillNode.tsx`
- Create: `apps/hq/src/app/wizard/nodes/PushMessageNode.tsx`
- Create: `apps/hq/src/app/wizard/nodes/MenuChangeNode.tsx`
- Create: `apps/hq/src/app/wizard/BlockPalette.tsx`
- Modify: `apps/hq/src/app/wizard/WizardEditor.tsx`

- [ ] **Step 1: Create apps/hq/src/app/wizard/nodes/DayNode.tsx**

```typescript
import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface DayNodeData { day: number; label: string }

export default function DayNode({ data, selected }: NodeProps) {
  const d = data as DayNodeData
  return (
    <div className={`rounded-xl px-4 py-3 min-w-[90px] text-center border ${
      selected ? 'border-white/50 bg-white/15' : 'border-white/20 bg-white/8'
    }`}>
      <div className="text-[9px] text-white/40 uppercase tracking-widest">Day</div>
      <div className="text-white font-bold text-xl leading-tight">{d.day}</div>
      <div className="text-white/50 text-[11px] mt-0.5">{d.label}</div>
      <Handle type="target" position={Position.Left} style={{ background: 'rgba(255,255,255,0.3)' }} />
      <Handle type="source" position={Position.Right} style={{ background: 'rgba(255,255,255,0.3)' }} />
    </div>
  )
}
```

- [ ] **Step 2: Create apps/hq/src/app/wizard/nodes/AiSkillNode.tsx**

```typescript
import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface AiSkillNodeData { agentId: string; label: string }

export default function AiSkillNode({ data, selected }: NodeProps) {
  const d = data as AiSkillNodeData
  return (
    <div className={`rounded-xl px-4 py-3 min-w-[160px] border ${
      selected ? 'border-purple-400 bg-purple-900/50' : 'border-purple-700/50 bg-purple-900/30'
    }`}>
      <div className="text-[9px] text-purple-300/70 uppercase tracking-widest mb-1">AI Skill</div>
      <div className="text-white font-semibold text-sm">{d.label || 'Untitled'}</div>
      <div className="text-purple-300/50 text-[10px] mt-1 font-mono">{d.agentId}</div>
      <Handle type="target" position={Position.Left} style={{ background: '#a78bfa' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#a78bfa' }} />
    </div>
  )
}
```

- [ ] **Step 3: Create apps/hq/src/app/wizard/nodes/PushMessageNode.tsx**

```typescript
import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface PushMessageNodeData { message: string; label: string }

export default function PushMessageNode({ data, selected }: NodeProps) {
  const d = data as PushMessageNodeData
  return (
    <div className={`rounded-xl px-4 py-3 min-w-[160px] border ${
      selected ? 'border-green-400 bg-green-900/50' : 'border-green-700/50 bg-green-900/30'
    }`}>
      <div className="text-[9px] text-green-300/70 uppercase tracking-widest mb-1">Push Message</div>
      <div className="text-white font-semibold text-sm">{d.label || 'Untitled'}</div>
      <div className="text-green-300/50 text-[10px] mt-1 truncate max-w-[140px]">
        {d.message || '(no message)'}
      </div>
      <Handle type="target" position={Position.Left} style={{ background: '#4ade80' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#4ade80' }} />
    </div>
  )
}
```

- [ ] **Step 4: Create apps/hq/src/app/wizard/nodes/MenuChangeNode.tsx**

```typescript
import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface MenuChangeNodeData { menuName: string; label: string }

export default function MenuChangeNode({ data, selected }: NodeProps) {
  const d = data as MenuChangeNodeData
  return (
    <div className={`rounded-xl px-4 py-3 min-w-[160px] border ${
      selected ? 'border-orange-400 bg-orange-900/50' : 'border-orange-700/50 bg-orange-900/30'
    }`}>
      <div className="text-[9px] text-orange-300/70 uppercase tracking-widest mb-1">Menu Change</div>
      <div className="text-white font-semibold text-sm">{d.label || 'Switch Menu'}</div>
      <div className="text-orange-300/50 text-[10px] mt-1">{d.menuName || '(no menu)'}</div>
      <Handle type="target" position={Position.Left} style={{ background: '#fb923c' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#fb923c' }} />
    </div>
  )
}
```

- [ ] **Step 5: Create apps/hq/src/app/wizard/BlockPalette.tsx**

```typescript
const BLOCKS = [
  { type: 'day-node',          icon: '📅', label: 'Day Marker',   desc: 'Timeline day milestone' },
  { type: 'ai-skill-node',     icon: '🤖', label: 'AI Skill',     desc: 'Run AI agent' },
  { type: 'push-message-node', icon: '💬', label: 'Push Message', desc: 'LINE push notification' },
  { type: 'menu-change-node',  icon: '📋', label: 'Menu Change',  desc: 'Switch rich menu' },
]

export default function BlockPalette() {
  const onDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData('application/reactflow', nodeType)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Drag to canvas</p>
      {BLOCKS.map((b) => (
        <div
          key={b.type}
          draggable
          onDragStart={(e) => onDragStart(e, b.type)}
          className="bg-white/5 border border-white/10 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-white/25 hover:bg-white/8 transition-all select-none"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{b.icon}</span>
            <div>
              <div className="text-white text-sm font-medium leading-tight">{b.label}</div>
              <div className="text-white/30 text-[10px]">{b.desc}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Rewrite apps/hq/src/app/wizard/WizardEditor.tsx with full canvas**

Replace the skeleton entirely:

```typescript
'use client'
import { useCallback, useRef, useState } from 'react'
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState, useReactFlow,
  type Node, type Edge, type OnConnect, type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import BlockPalette from './BlockPalette'
import DayNode from './nodes/DayNode'
import AiSkillNode from './nodes/AiSkillNode'
import PushMessageNode from './nodes/PushMessageNode'
import MenuChangeNode from './nodes/MenuChangeNode'

const nodeTypes: NodeTypes = {
  'day-node': DayNode,
  'ai-skill-node': AiSkillNode,
  'push-message-node': PushMessageNode,
  'menu-change-node': MenuChangeNode,
}

const DEFAULT_NODE_DATA: Record<string, Record<string, unknown>> = {
  'day-node':          { day: 1,           label: 'Day 1' },
  'ai-skill-node':     { agentId: 'ai-expert', label: 'AI Expert' },
  'push-message-node': { message: '',      label: 'Push Message' },
  'menu-change-node':  { menuName: '',     label: 'Switch Menu' },
}

const initialNodes: Node[] = [
  { id: 'day-0', type: 'day-node', position: { x: 80, y: 180 }, data: { day: 0, label: 'Follow' } },
]

function EditorInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const { screenToFlowPosition } = useReactFlow()
  const idCounter = useRef(1)

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
    const data = { ...(DEFAULT_NODE_DATA[type] ?? {}) }

    // Increment day number for day-node drops
    if (type === 'day-node') {
      const maxDay = nodes
        .filter((n) => n.type === 'day-node')
        .reduce((m, n) => Math.max(m, (n.data as { day: number }).day), 0)
      data.day = maxDay + 1
      data.label = `Day ${maxDay + 1}`
    }

    setNodes((nds) => nds.concat({ id, type, position, data }))
  }, [screenToFlowPosition, setNodes, nodes])

  const onSelectionChange = useCallback(({ nodes: sel }: { nodes: Node[] }) => {
    setSelectedNode(sel[0] ?? null)
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0d0d0d', color: '#fff' }}>
      {/* Block Palette */}
      <div style={{ width: 240, borderRight: '1px solid rgba(255,255,255,0.08)', padding: 16, overflowY: 'auto', flexShrink: 0 }}>
        <BlockPalette />
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
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

      {/* Config Panel placeholder — wired in Task 4 */}
      <div style={{ width: 280, borderLeft: '1px solid rgba(255,255,255,0.08)', padding: 16, overflowY: 'auto', flexShrink: 0 }}>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Config</p>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>
          {selectedNode ? `Selected: ${selectedNode.type}` : 'Select a node to configure it.'}
        </p>
      </div>
    </div>
  )
}

export default function WizardEditor() {
  return (
    <ReactFlowProvider>
      <EditorInner />
    </ReactFlowProvider>
  )
}
```

- [ ] **Step 7: Verify drag-to-canvas in browser**

With dev server running, navigate to `/wizard`:
- Left panel shows 4 block tiles
- Canvas shows Day 0 node, Controls, MiniMap
- Drag "AI Skill" tile → drops onto canvas as purple node
- Drag "Day Marker" → drops with auto-incremented day number
- Connect two nodes by dragging from one handle to another → edge appears

- [ ] **Step 8: Commit**

```bash
git add apps/hq/src/app/wizard/
git commit -m "feat: add React Flow canvas, custom nodes, and drag-from-palette"
```

---

### Task 4: Config Panel — live node data editing

**Files:**
- Create: `apps/hq/src/app/wizard/ConfigPanel.tsx`
- Modify: `apps/hq/src/app/wizard/WizardEditor.tsx`

- [ ] **Step 1: Create apps/hq/src/app/wizard/ConfigPanel.tsx**

```typescript
import { useReactFlow, type Node } from '@xyflow/react'
import type { DayNodeData } from './nodes/DayNode'
import type { AiSkillNodeData } from './nodes/AiSkillNode'
import type { PushMessageNodeData } from './nodes/PushMessageNode'
import type { MenuChangeNodeData } from './nodes/MenuChangeNode'

const inputStyle: React.CSSProperties = {
  width: '100%',
  marginTop: 4,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '8px 12px',
  color: '#fff',
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: 'rgba(255,255,255,0.4)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
}
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12 }

interface Props { node: Node | null }

export default function ConfigPanel({ node }: Props) {
  const { updateNodeData } = useReactFlow()

  if (!node) {
    return <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>Select a node to configure it.</p>
  }

  const upd = (patch: Record<string, unknown>) => updateNodeData(node.id, patch)

  if (node.type === 'day-node') {
    const d = node.data as DayNodeData
    return (
      <>
        <div style={fieldStyle}>
          <span style={labelStyle}>Day Number</span>
          <input style={inputStyle} type="number" value={d.day}
            onChange={(e) => upd({ day: parseInt(e.target.value) || 0 })} />
        </div>
        <div style={fieldStyle}>
          <span style={labelStyle}>Label</span>
          <input style={inputStyle} type="text" value={d.label}
            onChange={(e) => upd({ label: e.target.value })} />
        </div>
      </>
    )
  }

  if (node.type === 'ai-skill-node') {
    const d = node.data as AiSkillNodeData
    return (
      <>
        <div style={fieldStyle}>
          <span style={labelStyle}>Label</span>
          <input style={inputStyle} type="text" value={d.label}
            onChange={(e) => upd({ label: e.target.value })} />
        </div>
        <div style={fieldStyle}>
          <span style={labelStyle}>Agent ID</span>
          <input style={inputStyle} type="text" value={d.agentId} placeholder="e.g. ai-expert"
            onChange={(e) => upd({ agentId: e.target.value })} />
        </div>
      </>
    )
  }

  if (node.type === 'push-message-node') {
    const d = node.data as PushMessageNodeData
    return (
      <>
        <div style={fieldStyle}>
          <span style={labelStyle}>Label</span>
          <input style={inputStyle} type="text" value={d.label}
            onChange={(e) => upd({ label: e.target.value })} />
        </div>
        <div style={fieldStyle}>
          <span style={labelStyle}>Message</span>
          <textarea style={{ ...inputStyle, resize: 'none' }} rows={5} value={d.message}
            placeholder="LINE push message content..."
            onChange={(e) => upd({ message: e.target.value })} />
        </div>
      </>
    )
  }

  if (node.type === 'menu-change-node') {
    const d = node.data as MenuChangeNodeData
    return (
      <>
        <div style={fieldStyle}>
          <span style={labelStyle}>Label</span>
          <input style={inputStyle} type="text" value={d.label}
            onChange={(e) => upd({ label: e.target.value })} />
        </div>
        <div style={fieldStyle}>
          <span style={labelStyle}>Menu Name</span>
          <input style={inputStyle} type="text" value={d.menuName} placeholder="e.g. Recovery Menu"
            onChange={(e) => upd({ menuName: e.target.value })} />
        </div>
      </>
    )
  }

  return <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>Unknown node type.</p>
}
```

- [ ] **Step 2: Wire ConfigPanel into WizardEditor.tsx**

`ConfigPanel` calls `useReactFlow()` — it must render inside the `ReactFlowProvider`. Because `EditorInner` is already inside `ReactFlowProvider`, simply import and render `ConfigPanel` there.

In `EditorInner`, replace the config panel placeholder `<div>` with:

```typescript
import ConfigPanel from './ConfigPanel'

// In EditorInner JSX, replace the right panel:
<div style={{ width: 280, borderLeft: '1px solid rgba(255,255,255,0.08)', padding: 16, overflowY: 'auto', flexShrink: 0 }}>
  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Config</p>
  <ConfigPanel node={selectedNode} />
</div>
```

The `selectedNode` state is already tracked in `EditorInner` via `onSelectionChange`.

- [ ] **Step 3: Verify config panel in browser**

Navigate to `/wizard`:
- Click a Day Marker node → right panel shows "Day Number" + "Label" inputs
- Change label → node updates live on canvas
- Click an AI Skill node → shows "Label" + "Agent ID" inputs
- Click canvas background → panel shows "Select a node..."

- [ ] **Step 4: Commit**

```bash
git add apps/hq/src/app/wizard/ConfigPanel.tsx apps/hq/src/app/wizard/WizardEditor.tsx
git commit -m "feat: add config panel with live node data editing"
```

---

### Task 5: Scenario Toolbar — name + save + load

**Files:**
- Create: `apps/hq/src/app/wizard/ScenarioToolbar.tsx`
- Modify: `apps/hq/src/app/wizard/WizardEditor.tsx`

- [ ] **Step 1: Create apps/hq/src/app/wizard/ScenarioToolbar.tsx**

```typescript
interface Props {
  name: string
  onNameChange: (v: string) => void
  onSave: () => void
  saving: boolean
  lastSaved: Date | null
}

export default function ScenarioToolbar({ name, onNameChange, onSave, saving, lastSaved }: Props) {
  return (
    <div style={{
      position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 10, display: 'flex', alignItems: 'center', gap: 12,
      background: 'rgba(20,20,20,0.95)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12, padding: '8px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      <input
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontWeight: 600, fontSize: 14, width: 200 }}
        placeholder="Scenario name..."
      />
      <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
      <button
        onClick={onSave}
        disabled={saving}
        style={{ background: 'none', border: 'none', cursor: saving ? 'default' : 'pointer', color: saving ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)', fontSize: 13 }}
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
      {lastSaved && (
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>
          Saved {lastSaved.toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add save logic to EditorInner in WizardEditor.tsx**

Add imports and state:

```typescript
import { apiFetch } from '@vitera/lib'
import ScenarioToolbar from './ScenarioToolbar'
```

Inside `EditorInner`, add new state:

```typescript
const [scenarioId, setScenarioId] = useState<string | null>(null)
const [scenarioName, setScenarioName] = useState('New Scenario')
const [saving, setSaving] = useState(false)
const [lastSaved, setLastSaved] = useState<Date | null>(null)
```

Add save handler:

```typescript
const handleSave = useCallback(async () => {
  if (!scenarioName.trim()) return
  setSaving(true)
  try {
    if (!scenarioId) {
      // First save: create then patch with nodes/edges
      const createRes = await apiFetch('/api/wizard/oa/default/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: scenarioName }),
      })
      const { scenario } = await createRes.json() as { scenario: { id: string } }
      setScenarioId(scenario.id)
      await apiFetch(`/api/wizard/scenarios/${scenario.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flow_nodes: nodes, flow_edges: edges }),
      })
    } else {
      await apiFetch(`/api/wizard/scenarios/${scenarioId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: scenarioName, flow_nodes: nodes, flow_edges: edges }),
      })
    }
    setLastSaved(new Date())
  } finally {
    setSaving(false)
  }
}, [scenarioId, scenarioName, nodes, edges])
```

- [ ] **Step 3: Add ScenarioToolbar to the canvas div**

Inside the canvas `<div>` (the `flex: 1` container), before `<ReactFlow ...>`, add:

```typescript
<ScenarioToolbar
  name={scenarioName}
  onNameChange={setScenarioName}
  onSave={handleSave}
  saving={saving}
  lastSaved={lastSaved}
/>
```

- [ ] **Step 4: Verify save flow in browser**

1. Add a few nodes and connect them
2. Type a name in the toolbar input
3. Click Save → toolbar shows "Saving..." briefly then "Saved HH:MM:SS"
4. No console errors

- [ ] **Step 5: TypeScript check on wizard files**

```bash
cd apps/hq && npx tsc --noEmit 2>&1 | grep wizard
```

Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add apps/hq/src/app/wizard/ScenarioToolbar.tsx apps/hq/src/app/wizard/WizardEditor.tsx
git commit -m "feat: add scenario toolbar with name and save to backend"
```
