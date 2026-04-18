'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
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
  'push-message-node': { type: 'text', message: '', label: 'Push Message' },
  'menu-change-node':  { menuName: '',      label: 'Switch Menu' },
}

export interface WizardTemplate { id: number; name: string; line_rich_menu_id: string | null; is_active: boolean }

interface WizardEditorProps {
  oaId: string
  scenarioId: string | null
  scenarioName: string
  initialNodes: Node[]
  initialEdges: Edge[]
  onSaved: (id: string, name: string) => void
  templates: WizardTemplate[]
}

function EditorInner({ oaId, scenarioId, scenarioName: initialScenarioName, initialNodes, initialEdges, onSaved, templates }: WizardEditorProps) {
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handleSave])

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
        <ConfigPanel node={selectedNode} templates={templates} />
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
