import React from 'react'

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
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1 font-semibold">Drag to canvas</p>
      {BLOCKS.map((b) => (
        <div
          key={b.type}
          draggable
          onDragStart={(e) => onDragStart(e, b.type)}
          className="bg-slate-50 border border-slate-200 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:bg-slate-100 hover:border-slate-300 transition-colors select-none"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{b.icon}</span>
            <div>
              <div className="text-slate-900 text-sm font-medium">{b.label}</div>
              <div className="text-slate-500 text-[11px]">{b.desc}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
