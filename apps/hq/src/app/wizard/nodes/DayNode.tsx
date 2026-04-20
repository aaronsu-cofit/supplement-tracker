import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface DayNodeData { day: number; label: string }

export default function DayNode({ data, selected }: NodeProps) {
  const d = data as unknown as DayNodeData
  return (
    <div className={`rounded-xl px-4 py-3 min-w-[90px] text-center border shadow-sm ${
      selected ? 'border-slate-500 bg-slate-100' : 'border-slate-300 bg-white'
    }`}>
      <div className="text-[10px] text-slate-500 uppercase tracking-[0.15em] font-semibold">Day</div>
      <div className="text-slate-900 font-bold text-[22px] leading-[1.2]">{d.day}</div>
      <div className="text-slate-500 text-[11px] mt-[2px]">{d.label}</div>
      <Handle type="target" position={Position.Left} style={{ background: '#94A3B8' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#94A3B8' }} />
    </div>
  )
}
