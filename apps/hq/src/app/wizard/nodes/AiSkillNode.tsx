import { Handle, Position, type NodeProps } from '@xyflow/react'

export interface AiSkillNodeData { agentId: string; label: string }

export default function AiSkillNode({ data, selected }: NodeProps) {
  const d = data as unknown as AiSkillNodeData
  return (
    <div style={{
      borderRadius: 12, padding: '12px 16px', minWidth: 160,
      border: `1px solid ${selected ? '#a78bfa' : 'rgba(139,92,246,0.4)'}`,
      background: selected ? 'rgba(109,40,217,0.4)' : 'rgba(109,40,217,0.2)',
    }}>
      <div style={{ fontSize: 9, color: 'rgba(196,181,253,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>AI Skill</div>
      <div style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{d.label || 'Untitled'}</div>
      <div style={{ color: 'rgba(196,181,253,0.5)', fontSize: 10, marginTop: 3, fontFamily: 'monospace' }}>{d.agentId}</div>
      <Handle type="target" position={Position.Left} style={{ background: '#a78bfa' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#a78bfa' }} />
    </div>
  )
}
