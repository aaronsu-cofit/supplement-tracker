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
    <div className={`rounded-xl px-4 py-3 min-w-[160px] border ${
      selected ? 'border-[#4ade80] bg-[rgba(21,128,61,0.4)]' : 'border-[rgba(34,197,94,0.4)] bg-[rgba(21,128,61,0.2)]'
    }`}>
      <div className="text-[9px] text-[rgba(134,239,172,0.7)] uppercase tracking-[0.1em] mb-1">Push · {t}</div>
      <div className="text-white font-semibold text-[13px]">{d.label || 'Untitled'}</div>
      <div className="text-[rgba(134,239,172,0.5)] text-[10px] mt-[3px] max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap">{previewFor(d)}</div>
      <Handle type="target" position={Position.Left} style={{ background: '#4ade80' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#4ade80' }} />
    </div>
  )
}
