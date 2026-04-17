const BLOCKS = [
  { type: 'day-node',          icon: '📅', label: 'Day Marker',   desc: 'Timeline day milestone' },
  { type: 'ai-skill-node',     icon: '🤖', label: 'AI Skill',     desc: 'Run AI agent' },
  { type: 'push-message-node', icon: '💬', label: 'Push Message', desc: 'LINE push notification' },
  { type: 'menu-change-node',  icon: '📋', label: 'Menu Change',  desc: 'Switch rich menu' },
]

export default function BlockPalette() {
  const onDragStart = (e: React.DragEvent, nodeType: string) => {
    e.dataTransfer.setData('application/reactflow', nodeType)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Drag to canvas</p>
      {BLOCKS.map((b) => (
        <div
          key={b.type}
          draggable
          onDragStart={(e) => onDragStart(e, b.type)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            padding: 12,
            cursor: 'grab',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>{b.icon}</span>
            <div>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{b.label}</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{b.desc}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
