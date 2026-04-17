import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface MenuChangeNodeData { menuName: string; label: string }

export default function MenuChangeNode({ data, selected }: NodeProps) {
  const d = data as unknown as MenuChangeNodeData
  return (
    <div style={{
      borderRadius: 12, padding: '12px 16px', minWidth: 160,
      border: `1px solid ${selected ? '#fb923c' : 'rgba(249,115,22,0.4)'}`,
      background: selected ? 'rgba(154,52,18,0.4)' : 'rgba(154,52,18,0.2)',
    }}>
      <div style={{ fontSize: 9, color: 'rgba(253,186,116,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Menu Change</div>
      <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{d.label || 'Switch Menu'}</div>
      <div style={{ color: 'rgba(253,186,116,0.5)', fontSize: 10, marginTop: 3 }}>{d.menuName || '(no menu)'}</div>
      <Handle type="target" position={Position.Left} style={{ background: '#fb923c' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#fb923c' }} />
    </div>
  )
}
