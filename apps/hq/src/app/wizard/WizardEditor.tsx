'use client'
import { useCallback, useRef, useState } from 'react'
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState, useReactFlow,
  type Node, type Edge, type OnConnect, type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import BlockPalette from './BlockPalette'
import ConfigPanel from './ConfigPanel'
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
  'day-node':          { day: 1,            label: 'Day 1' },
  'ai-skill-node':     { agentId: 'ai-expert', label: 'AI Expert' },
  'push-message-node': { message: '',       label: 'Push Message' },
  'menu-change-node':  { menuName: '',      label: 'Switch Menu' },
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

  return (
    <div className="flex flex-1 bg-[#0d0d0d] text-white min-h-0">
      {/* Block Palette */}
      <div className="w-60 border-r border-white/[0.08] p-4 overflow-y-auto shrink-0">
        <BlockPalette />
      </div>

      {/* Canvas */}
      <div className="flex-1 relative min-w-0">
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

      {/* Config Panel */}
      <div className="w-[280px] border-l border-white/[0.08] p-4 overflow-y-auto shrink-0">
        <p className="text-[10px] text-white/30 uppercase tracking-[0.1em] mb-3">Config</p>
        <ConfigPanel node={selectedNode} />
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
