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
    return <p className="text-slate-400 text-sm">Select a node to configure it.</p>
  }

  const upd = (patch: Record<string, unknown>) => updateNodeData(node.id, patch)

  if (node.type === 'day-node') {
    const d = node.data as unknown as DayNodeData
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-slate-500 uppercase tracking-[0.08em] font-semibold">Day Number</span>
          <input
            type="number"
            value={d.day}
            onChange={(e) => upd({ day: parseInt(e.target.value) || 0 })}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm outline-none focus:border-slate-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-slate-500 uppercase tracking-[0.08em] font-semibold">Label</span>
          <input
            type="text"
            value={d.label}
            onChange={(e) => upd({ label: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm outline-none focus:border-slate-400"
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
          <span className="text-[11px] text-slate-500 uppercase tracking-[0.08em] font-semibold">Label</span>
          <input
            type="text"
            value={d.label}
            onChange={(e) => upd({ label: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm outline-none focus:border-slate-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-slate-500 uppercase tracking-[0.08em] font-semibold">Agent ID</span>
          <input
            type="text"
            value={d.agentId}
            placeholder="e.g. nutrition_analyst"
            onChange={(e) => upd({ agentId: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm outline-none focus:border-slate-400"
          />
        </div>
        <p className="text-[11px] text-slate-500">
          兩種用途：<br />
          1. <b>對話路由</b>：使用者傳訊息時，若 scenario 有連到此節點（Day 之前），會用此 <code>agent_id</code> 覆蓋 OA 預設。<br />
          2. <b>排程推播</b>：scheduler 到該 Day 會呼叫 agent，由 agent 自己決定要生什麼內容 push 給使用者。
        </p>
      </div>
    )
  }

  if (node.type === 'push-message-node') {
    const d = node.data as unknown as PushMessageNodeData
    const t = d.type || 'text'
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-slate-500 uppercase tracking-[0.08em] font-semibold">Label</span>
          <input
            type="text"
            value={d.label}
            onChange={(e) => upd({ label: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm outline-none focus:border-slate-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-slate-500 uppercase tracking-[0.08em] font-semibold">Type</span>
          <select
            value={t}
            onChange={(e) => upd({ type: e.target.value as PushMessageType })}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm outline-none focus:border-slate-400 cursor-pointer"
          >
            <option value="text">Text</option>
            <option value="image">Image</option>
            <option value="sticker">Sticker</option>
          </select>
        </div>
        {t === 'text' && (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-slate-500 uppercase tracking-[0.08em] font-semibold">Message</span>
            <textarea
              value={d.message || ''}
              placeholder="LINE push message content..."
              rows={5}
              onChange={(e) => upd({ message: e.target.value })}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm outline-none focus:border-slate-400 resize-none"
            />
          </div>
        )}
        {t === 'image' && (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-slate-500 uppercase tracking-[0.08em] font-semibold">Image URL (https)</span>
              <input
                type="url"
                value={d.imageUrl || ''}
                placeholder="https://example.com/image.jpg"
                onChange={(e) => upd({ imageUrl: e.target.value })}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm outline-none focus:border-slate-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-slate-500 uppercase tracking-[0.08em] font-semibold">Preview URL (optional — falls back to Image URL)</span>
              <input
                type="url"
                value={d.previewUrl || ''}
                placeholder="https://example.com/preview.jpg"
                onChange={(e) => upd({ previewUrl: e.target.value })}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm outline-none focus:border-slate-400"
              />
            </div>
          </>
        )}
        {t === 'sticker' && (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-slate-500 uppercase tracking-[0.08em] font-semibold">Package ID</span>
              <input
                type="text"
                value={d.stickerPackageId || ''}
                placeholder="446"
                onChange={(e) => upd({ stickerPackageId: e.target.value })}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm outline-none focus:border-slate-400"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-slate-500 uppercase tracking-[0.08em] font-semibold">Sticker ID</span>
              <input
                type="text"
                value={d.stickerId || ''}
                placeholder="1988"
                onChange={(e) => upd({ stickerId: e.target.value })}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm outline-none focus:border-slate-400"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              完整清單見 <a href="https://developers.line.biz/en/docs/messaging-api/sticker-list/" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-700">LINE Sticker List</a>
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
          <span className="text-[11px] text-slate-500 uppercase tracking-[0.08em] font-semibold">Label</span>
          <input
            type="text"
            value={d.label}
            onChange={(e) => upd({ label: e.target.value })}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm outline-none focus:border-slate-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-slate-500 uppercase tracking-[0.08em] font-semibold">Menu Name</span>
          {hasTemplates ? (
            <select
              value={d.menuName}
              onChange={(e) => upd({ menuName: e.target.value })}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm outline-none focus:border-slate-400 cursor-pointer"
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
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 text-sm outline-none focus:border-slate-400"
            />
          )}
          {menuNameInvalid && (
            <span className="text-[11px] text-amber-600">Template "{d.menuName}" not found in this OA.</span>
          )}
        </div>
      </div>
    )
  }

  return <p className="text-slate-400 text-sm">Unknown node type.</p>
}
