import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface AiSkillNodeData { agentId: string; label: string }

export default function AiSkillNode({ data, selected }: NodeProps) {
  const d = data as unknown as AiSkillNodeData
  return (
    <div className={`rounded-xl px-4 py-3 min-w-[160px] border ${
      selected ? 'border-[#a78bfa] bg-[rgba(109,40,217,0.4)]' : 'border-[rgba(139,92,246,0.4)] bg-[rgba(109,40,217,0.2)]'
    }`}>
      <div className="text-[9px] text-[rgba(196,181,253,0.7)] uppercase tracking-[0.1em] mb-1">AI Skill</div>
      <div className="text-white font-semibold text-[13px]">{d.label || 'Untitled'}</div>
      <div className="text-[rgba(196,181,253,0.5)] text-[10px] mt-[3px] font-mono">{d.agentId}</div>
      <Handle type="target" position={Position.Left} style={{ background: '#a78bfa' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#a78bfa' }} />
    </div>
  )
}
