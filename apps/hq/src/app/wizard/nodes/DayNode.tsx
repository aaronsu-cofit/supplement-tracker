import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface DayNodeData { day: number; label: string }

export default function DayNode({ data, selected }: NodeProps) {
  const d = data as unknown as DayNodeData
  return (
    <div className={`rounded-xl px-4 py-3 min-w-[90px] text-center border ${
      selected ? 'border-white/50 bg-white/15' : 'border-white/20 bg-white/[0.08]'
    }`}>
      <div className="text-[9px] text-white/40 uppercase tracking-[0.15em]">Day</div>
      <div className="text-white font-bold text-[22px] leading-[1.2]">{d.day}</div>
      <div className="text-white/50 text-[11px] mt-[2px]">{d.label}</div>
      <Handle type="target" position={Position.Left} style={{ background: 'rgba(255,255,255,0.3)' }} />
      <Handle type="source" position={Position.Right} style={{ background: 'rgba(255,255,255,0.3)' }} />
    </div>
  )
}
