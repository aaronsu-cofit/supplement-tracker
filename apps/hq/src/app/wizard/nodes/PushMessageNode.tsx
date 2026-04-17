import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface PushMessageNodeData { message: string; label: string }

export default function PushMessageNode({ data, selected }: NodeProps) {
  const d = data as unknown as PushMessageNodeData
  return (
    <div className={`rounded-xl px-4 py-3 min-w-[160px] border ${
      selected ? 'border-[#4ade80] bg-[rgba(21,128,61,0.4)]' : 'border-[rgba(34,197,94,0.4)] bg-[rgba(21,128,61,0.2)]'
    }`}>
      <div className="text-[9px] text-[rgba(134,239,172,0.7)] uppercase tracking-[0.1em] mb-1">Push Message</div>
      <div className="text-white font-semibold text-[13px]">{d.label || 'Untitled'}</div>
      <div className="text-[rgba(134,239,172,0.5)] text-[10px] mt-[3px] max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap">{d.message || '(no message)'}</div>
      <Handle type="target" position={Position.Left} style={{ background: '#4ade80' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#4ade80' }} />
    </div>
  )
}
