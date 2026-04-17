import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface MenuChangeNodeData { menuName: string; label: string }

export default function MenuChangeNode({ data, selected }: NodeProps) {
  const d = data as unknown as MenuChangeNodeData
  return (
    <div className={`rounded-xl px-4 py-3 min-w-[160px] border ${
      selected ? 'border-[#fb923c] bg-[rgba(154,52,18,0.4)]' : 'border-[rgba(249,115,22,0.4)] bg-[rgba(154,52,18,0.2)]'
    }`}>
      <div className="text-[9px] text-[rgba(253,186,116,0.7)] uppercase tracking-[0.1em] mb-1">Menu Change</div>
      <div className="text-white font-semibold text-[13px]">{d.label || 'Switch Menu'}</div>
      <div className="text-[rgba(253,186,116,0.5)] text-[10px] mt-[3px]">{d.menuName || '(no menu)'}</div>
      <Handle type="target" position={Position.Left} style={{ background: '#fb923c' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#fb923c' }} />
    </div>
  )
}
