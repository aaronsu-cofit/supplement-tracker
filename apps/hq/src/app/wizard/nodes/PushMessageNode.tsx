import { Handle, Position, type NodeProps } from '@xyflow/react'

export type PushMessageType = 'text' | 'image' | 'sticker'

export interface PushMessageNodeData {
  label: string
  type?: PushMessageType
  message?: string
  imageUrl?: string
  previewUrl?: string
  stickerPackageId?: string
  stickerId?: string
}

function previewFor(d: PushMessageNodeData): string {
  const t = d.type || 'text'
  if (t === 'image') return d.imageUrl ? `🖼 ${d.imageUrl}` : '(no image)'
  if (t === 'sticker') return d.stickerPackageId && d.stickerId ? `🎨 ${d.stickerPackageId}/${d.stickerId}` : '(no sticker)'
  return d.message || '(no message)'
}

export default function PushMessageNode({ data, selected }: NodeProps) {
  const d = data as unknown as PushMessageNodeData
  const t = d.type || 'text'
  return (
    <div className={`rounded-xl px-4 py-3 min-w-[160px] border shadow-sm ${
      selected ? 'border-emerald-500 bg-emerald-100' : 'border-emerald-300 bg-emerald-50'
    }`}>
      <div className="text-[10px] text-emerald-700 uppercase tracking-[0.1em] mb-1 font-semibold">Push · {t}</div>
      <div className="text-slate-900 font-semibold text-[13px]">{d.label || 'Untitled'}</div>
      <div className="text-emerald-700 text-[11px] mt-[3px] max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap">{previewFor(d)}</div>
      <Handle type="target" position={Position.Left} style={{ background: '#10b981' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#10b981' }} />
    </div>
  )
}
