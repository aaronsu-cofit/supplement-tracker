import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface AiSkillNodeData {
  agentId: string
  label: string
}

export default function AiSkillNode({ data, selected }: NodeProps) {
  const d = data as unknown as AiSkillNodeData
  return (
    <div className={`rounded-xl px-4 py-3 min-w-[160px] border shadow-sm ${
      selected ? 'border-purple-500 bg-purple-100' : 'border-purple-300 bg-purple-50'
    }`}>
      <div className="text-[10px] text-purple-600 uppercase tracking-[0.1em] mb-1 font-semibold">AI Skill</div>
      <div className="text-slate-900 font-semibold text-[13px]">{d.label || 'Untitled'}</div>
      <div className="text-purple-700 text-[11px] mt-[3px] font-mono">{d.agentId}</div>
      <Handle type="target" position={Position.Left} style={{ background: '#a855f7' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#a855f7' }} />
    </div>
  )
}
