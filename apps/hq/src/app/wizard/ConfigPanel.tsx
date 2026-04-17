'use client'
import { useReactFlow, type Node } from '@xyflow/react'
import type { DayNodeData } from './nodes/DayNode'
import type { AiSkillNodeData } from './nodes/AiSkillNode'
import type { PushMessageNodeData } from './nodes/PushMessageNode'
import type { MenuChangeNodeData } from './nodes/MenuChangeNode'

interface Props { node: Node | null }

export default function ConfigPanel({ node }: Props) {
  const { updateNodeData } = useReactFlow()

  if (!node) {
    return <p className="text-white/20 text-sm">Select a node to configure it.</p>
  }

  const upd = (patch: Record<string, unknown>) => updateNodeData(node.id, patch)

  if (node.type === 'day-node') {
    const d = node.data as unknown as DayNodeData
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-white/40 uppercase tracking-[0.08em]">Day Number</span>
          <input
            type="number"
            value={d.day}
            onChange={(e) => upd({ day: parseInt(e.target.value) || 0 })}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-white/40 uppercase tracking-[0.08em]">Label</span>
          <input
            type="text"
            value={d.label}
            onChange={(e) => upd({ label: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
          />
        </div>
      </div>
    )
  }

  if (node.type === 'ai-skill-node') {
    const d = node.data as unknown as AiSkillNodeData
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
          <span className="text-[10px] text-white/40 uppercase tracking-[0.08em]">Agent ID</span>
          <input
            type="text"
            value={d.agentId}
            placeholder="e.g. ai-expert"
            onChange={(e) => upd({ agentId: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
          />
        </div>
      </div>
    )
  }

  if (node.type === 'push-message-node') {
    const d = node.data as unknown as PushMessageNodeData
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
          <span className="text-[10px] text-white/40 uppercase tracking-[0.08em]">Message</span>
          <textarea
            value={d.message}
            placeholder="LINE push message content..."
            rows={5}
            onChange={(e) => upd({ message: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30 resize-none"
          />
        </div>
      </div>
    )
  }

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

  return <p className="text-white/20 text-sm">Unknown node type.</p>
}
