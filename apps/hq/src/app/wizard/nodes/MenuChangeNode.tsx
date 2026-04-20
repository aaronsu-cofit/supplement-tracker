import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface MenuChangeNodeData { menuName: string; label: string }

export default function MenuChangeNode({ data, selected }: NodeProps) {
  const d = data as unknown as MenuChangeNodeData
  return (
    <div className={`rounded-xl px-4 py-3 min-w-[160px] border shadow-sm ${
      selected ? 'border-orange-500 bg-orange-100' : 'border-orange-300 bg-orange-50'
    }`}>
      <div className="text-[10px] text-orange-700 uppercase tracking-[0.1em] mb-1 font-semibold">Menu Change</div>
      <div className="text-slate-900 font-semibold text-[13px]">{d.label || 'Switch Menu'}</div>
      <div className="text-orange-700 text-[11px] mt-[3px]">{d.menuName || '(no menu)'}</div>
      <Handle type="target" position={Position.Left} style={{ background: '#f97316' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#f97316' }} />
    </div>
  )
}
