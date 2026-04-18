'use client'
import { useReactFlow, type Node } from '@xyflow/react'
import type { DayNodeData } from './nodes/DayNode'
import type { AiSkillNodeData } from './nodes/AiSkillNode'
import type { PushMessageNodeData, PushMessageType } from './nodes/PushMessageNode'
import type { MenuChangeNodeData } from './nodes/MenuChangeNode'
import type { WizardTemplate } from './WizardEditor'

interface Props { node: Node | null; templates: WizardTemplate[] }

export default function ConfigPanel({ node, templates }: Props) {
  const { updateNodeData } = useReactFlow()

  if (!node) {
    return <p className="text-white/20 text-sm">Select a node to configure it.</p>
  }

  const upd = (patch: Record<string, unknown>) => updateNodeData(node.id, patch)

  if (node.type === 'day-node') {
    const d = node.data as unknown as DayNodeData
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-white/40 uppercase tracking-[0.08em]">Day Number</span>
          <input
            type="number"
            value={d.day}
            onChange={(e) => upd({ day: parseInt(e.target.value) || 0 })}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-white/40 uppercase tracking-[0.08em]">Label</span>
          <input
            type="text"
            value={d.label}
            onChange={(e) => upd({ label: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
          />
        </div>
      </div>
    )
  }

  if (node.type === 'ai-skill-node') {
    const d = node.data as unknown as AiSkillNodeData
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-white/40 uppercase tracking-[0.08em]">Label</span>
          <input
            type="text"
            value={d.label}
            onChange={(e) => upd({ label: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-white/40 uppercase tracking-[0.08em]">Agent ID</span>
          <input
            type="text"
            value={d.agentId}
            placeholder="e.g. ai-expert"
            onChange={(e) => upd({ agentId: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
          />
        </div>
      </div>
    )
  }

  if (node.type === 'push-message-node') {
    const d = node.data as unknown as PushMessageNodeData
    const t = d.type || 'text'
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-white/40 uppercase tracking-[0.08em]">Label</span>
          <input
            type="text"
            value={d.label}
            onChange={(e) => upd({ label: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-white/40 uppercase tracking-[0.08em]">Type</span>
          <select
            value={t}
            onChange={(e) => upd({ type: e.target.value as PushMessageType })}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30 cursor-pointer"
          >
            <option value="text">Text</option>
            <option value="image">Image</option>
            <option value="sticker">Sticker</option>
          </select>
        </div>
        {t === 'text' && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-white/40 uppercase tracking-[0.08em]">Message</span>
            <textarea
              value={d.message || ''}
              placeholder="LINE push message content..."
              rows={5}
              onChange={(e) => upd({ message: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30 resize-none"
            />
          </div>
        )}
        {t === 'image' && (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-white/40 uppercase tracking-[0.08em]">Image URL (https)</span>
              <input
                type="url"
                value={d.imageUrl || ''}
                placeholder="https://example.com/image.jpg"
                onChange={(e) => upd({ imageUrl: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-white/40 uppercase tracking-[0.08em]">Preview URL (optional — falls back to Image URL)</span>
              <input
                type="url"
                value={d.previewUrl || ''}
                placeholder="https://example.com/preview.jpg"
                onChange={(e) => upd({ previewUrl: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
              />
            </div>
          </>
        )}
        {t === 'sticker' && (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-white/40 uppercase tracking-[0.08em]">Package ID</span>
              <input
                type="text"
                value={d.stickerPackageId || ''}
                placeholder="446"
                onChange={(e) => upd({ stickerPackageId: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-white/40 uppercase tracking-[0.08em]">Sticker ID</span>
              <input
                type="text"
                value={d.stickerId || ''}
                placeholder="1988"
                onChange={(e) => upd({ stickerId: e.target.value })}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
              />
            </div>
            <p className="text-[10px] text-white/30">
              完整清單見 <a href="https://developers.line.biz/en/docs/messaging-api/sticker-list/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/50">LINE Sticker List</a>
            </p>
          </>
        )}
      </div>
    )
  }

  if (node.type === 'menu-change-node') {
    const d = node.data as unknown as MenuChangeNodeData
    const hasTemplates = templates.length > 0
    const menuNameInvalid = hasTemplates && d.menuName !== '' && !templates.some(t => t.name === d.menuName)
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-white/40 uppercase tracking-[0.08em]">Label</span>
          <input
            type="text"
            value={d.label}
            onChange={(e) => upd({ label: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-white/40 uppercase tracking-[0.08em]">Menu Name</span>
          {hasTemplates ? (
            <select
              value={d.menuName}
              onChange={(e) => upd({ menuName: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30 cursor-pointer"
            >
              <option value="">(select menu)</option>
              {templates.map(t => (
                <option key={t.id} value={t.name}>
                  {t.name}{t.is_active ? ' (active)' : ''}{!t.line_rich_menu_id ? ' — not deployed' : ''}
                </option>
              ))}
              {menuNameInvalid && <option value={d.menuName}>{d.menuName} (missing)</option>}
            </select>
          ) : (
            <input
              type="text"
              value={d.menuName}
              placeholder="e.g. Recovery Menu"
              onChange={(e) => upd({ menuName: e.target.value })}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
            />
          )}
          {menuNameInvalid && (
            <span className="text-[10px] text-amber-400/80">Template "{d.menuName}" not found in this OA.</span>
          )}
        </div>
      </div>
    )
  }

  return <p className="text-white/20 text-sm">Unknown node type.</p>
}
