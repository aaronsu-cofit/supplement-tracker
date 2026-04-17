import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface DayNodeData { day: number; label: string }

export default function DayNode({ data, selected }: NodeProps) {
  const d = data as unknown as DayNodeData
  return (
    <div style={{
      borderRadius: 12, padding: '12px 16px', minWidth: 90, textAlign: 'center',
      border: `1px solid ${selected ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)'}`,
      background: selected ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
    }}>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Day</div>
      <div style={{ color: '#fff', fontWeight: 700, fontSize: 22, lineHeight: 1.2 }}>{d.day}</div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>{d.label}</div>
      <Handle type="target" position={Position.Left} style={{ background: 'rgba(255,255,255,0.3)' }} />
      <Handle type="source" position={Position.Right} style={{ background: 'rgba(255,255,255,0.3)' }} />
    </div>
  )
}
