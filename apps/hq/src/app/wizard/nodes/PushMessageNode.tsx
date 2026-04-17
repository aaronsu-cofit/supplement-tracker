import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface PushMessageNodeData { message: string; label: string }

export default function PushMessageNode({ data, selected }: NodeProps) {
  const d = data as unknown as PushMessageNodeData
  return (
    <div style={{
      borderRadius: 12, padding: '12px 16px', minWidth: 160,
      border: `1px solid ${selected ? '#4ade80' : 'rgba(34,197,94,0.4)'}`,
      background: selected ? 'rgba(21,128,61,0.4)' : 'rgba(21,128,61,0.2)',
    }}>
      <div style={{ fontSize: 9, color: 'rgba(134,239,172,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Push Message</div>
      <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{d.label || 'Untitled'}</div>
      <div style={{ color: 'rgba(134,239,172,0.5)', fontSize: 10, marginTop: 3, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.message || '(no message)'}</div>
      <Handle type="target" position={Position.Left} style={{ background: '#4ade80' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#4ade80' }} />
    </div>
  )
}
