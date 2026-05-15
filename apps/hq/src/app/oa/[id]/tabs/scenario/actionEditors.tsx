'use client';
import type { ScenarioFlowNode, ContentItem, MissionTemplate } from '../../../../../types';

interface EditorProps {
  node: ScenarioFlowNode;
  onChange: (node: ScenarioFlowNode) => void;
  // Context for dropdowns; editors may be rendered before these load
  contentItems?: ContentItem[];
  missions?: MissionTemplate[];
}

function updateData(
  node: ScenarioFlowNode,
  patch: NonNullable<ScenarioFlowNode['data']>,
): ScenarioFlowNode {
  return { ...node, data: { ...node.data, ...patch } };
}

type PushMsgType = 'text' | 'image' | 'sticker' | 'flex';

export function PushMessageEditor({ node, onChange, contentItems }: EditorProps) {
  const data = node.data ?? {};
  const msgType = (data.type ?? 'text') as PushMsgType;
  // When a content_key is set, the scheduler pulls the whole message from
  // the content library at send time — so the reference works for text
  // OR flex items. We offer the dropdown on both types.
  const showContentRef = msgType === 'text' || msgType === 'flex';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs text-slate-500">訊息類型</label>
        <select className="hq-input text-sm" value={msgType}
          onChange={e => onChange(updateData(node, { type: e.target.value as PushMsgType }))}>
          <option value="text">文字</option>
          <option value="flex">Flex（卡片）</option>
          <option value="image">圖片</option>
          <option value="sticker">貼圖</option>
        </select>
      </div>
      {showContentRef && contentItems && contentItems.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 shrink-0">引用內容</label>
          <select className="hq-input text-sm flex-1"
            value={data.contentKey ?? ''}
            onChange={e => onChange(updateData(node, { contentKey: e.target.value || undefined }))}>
            <option value="">（自行輸入下方內容）</option>
            {contentItems
              .filter(c => c.is_active && (msgType === 'flex' ? c.type === 'flex' : c.type === 'text'))
              .map(c => (
                <option key={c.key} value={c.key}>
                  {c.key}{c.type !== 'text' && ` [${c.type}]`} — {c.title || c.body?.slice(0, 20) || ''}
                </option>
              ))}
          </select>
        </div>
      )}
      {data.contentKey ? (
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-1">
          發送時會即時從內容庫抓取 <code className="bg-slate-100 px-1 rounded">{data.contentKey}</code>，下方內容會被忽略。
        </p>
      ) : (
        <>
          {msgType === 'text' && (
            <textarea className="hq-input min-h-[80px]" placeholder="訊息內容"
              value={data.message ?? ''}
              onChange={e => onChange(updateData(node, { message: e.target.value }))} />
          )}
          {msgType === 'flex' && (
            <>
              <input className="hq-input text-sm" placeholder="altText 通知文案（選填）"
                value={data.message ?? ''}
                onChange={e => onChange(updateData(node, { message: e.target.value }))} />
              <textarea className="hq-input min-h-[140px] font-mono text-xs"
                placeholder='Flex JSON，例如 { "type": "bubble", "body": {...} }'
                value={data.flexContents ?? ''}
                onChange={e => onChange(updateData(node, { flexContents: e.target.value }))} />
              <p className="text-[11px] text-slate-500">
                直接內嵌僅適合一次性訊息；需要複用請放到產品內容庫再用「引用內容」綁定。
              </p>
            </>
          )}
          {msgType === 'image' && (
            <div className="flex flex-col gap-2">
              <input className="hq-input text-sm" placeholder="圖片 URL（原始）"
                value={data.imageUrl ?? ''}
                onChange={e => onChange(updateData(node, { imageUrl: e.target.value }))} />
              <input className="hq-input text-sm" placeholder="預覽圖 URL（選填，預設同原始）"
                value={data.previewUrl ?? ''}
                onChange={e => onChange(updateData(node, { previewUrl: e.target.value }))} />
            </div>
          )}
          {msgType === 'sticker' && (
            <div className="grid grid-cols-2 gap-2">
              <input className="hq-input text-sm" placeholder="Package ID"
                value={data.stickerPackageId ?? ''}
                onChange={e => onChange(updateData(node, { stickerPackageId: e.target.value }))} />
              <input className="hq-input text-sm" placeholder="Sticker ID"
                value={data.stickerId ?? ''}
                onChange={e => onChange(updateData(node, { stickerId: e.target.value }))} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function AiSkillEditor({ node, onChange }: EditorProps) {
  return (
    <input className="hq-input text-sm" placeholder="agentId（如 ai-expert, nutrition_analyst）"
      value={node.data?.agentId ?? ''}
      onChange={e => onChange(updateData(node, { agentId: e.target.value }))} />
  );
}

export function MenuChangeEditor({ node, onChange }: EditorProps) {
  return (
    <input className="hq-input text-sm" placeholder="Rich Menu 名稱"
      value={node.data?.menuName ?? ''}
      onChange={e => onChange(updateData(node, { menuName: e.target.value }))} />
  );
}

export function MissionAssignEditor({ node, onChange, missions }: EditorProps) {
  return (
    <div className="flex flex-col gap-2">
      {missions && missions.length > 0 ? (
        <select className="hq-input text-sm" value={node.data?.missionKey ?? ''}
          onChange={e => onChange(updateData(node, { missionKey: e.target.value }))}>
          <option value="">（選擇任務）</option>
          {missions.filter(m => m.is_active).map(m => (
            <option key={m.key} value={m.key}>{m.key} — {m.name}</option>
          ))}
        </select>
      ) : (
        <input className="hq-input text-sm" placeholder="mission_key（此產品尚未建立任務時可手動輸入）"
          value={node.data?.missionKey ?? ''}
          onChange={e => onChange(updateData(node, { missionKey: e.target.value }))} />
      )}
    </div>
  );
}

export function StreakIncrementEditor({ node, onChange }: EditorProps) {
  return (
    <input className="hq-input text-sm" placeholder="streak_key（如 daily_checkin）"
      value={node.data?.streakKey ?? ''}
      onChange={e => onChange(updateData(node, { streakKey: e.target.value }))} />
  );
}

export function SetAttributeEditor({ node, onChange }: EditorProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <input className="hq-input text-sm" placeholder="attribute_key"
        value={node.data?.attributeKey ?? ''}
        onChange={e => onChange(updateData(node, { attributeKey: e.target.value }))} />
      <input className="hq-input text-sm" placeholder="value"
        value={node.data?.value ?? ''}
        onChange={e => onChange(updateData(node, { value: e.target.value }))} />
    </div>
  );
}

export function nodeTypeLabel(type: string | undefined): string {
  switch (type) {
    case 'push-message-node': return '訊息';
    case 'ai-skill-node': return 'AI 技能';
    case 'menu-change-node': return '切換選單';
    case 'mission-assign-node': return '指派任務';
    case 'streak-increment-node': return '連續天數 +1';
    case 'set-attribute-node': return '設定屬性';
    default: return type ?? '未知';
  }
}

export function nodeTypeIcon(type: string | undefined): string {
  switch (type) {
    case 'push-message-node': return '📨';
    case 'ai-skill-node': return '🤖';
    case 'menu-change-node': return '📋';
    case 'mission-assign-node': return '🎯';
    case 'streak-increment-node': return '🔥';
    case 'set-attribute-node': return '🏷️';
    default: return '•';
  }
}

export function summarizeNode(node: ScenarioFlowNode): string {
  const d = node.data ?? {};
  switch (node.type) {
    case 'push-message-node':
      if (d.contentKey) return `引用 ${d.contentKey}`;
      if (d.type === 'image') return `圖片: ${d.imageUrl || '(未設)'}`;
      if (d.type === 'sticker') return `貼圖 ${d.stickerPackageId}/${d.stickerId}`;
      if (d.type === 'flex') return `Flex: ${d.message || '(未設 altText)'}`;
      return d.message ? (d.message.length > 40 ? d.message.slice(0, 40) + '…' : d.message) : '(未設訊息)';
    case 'ai-skill-node':
      return d.agentId || '(未設 agent)';
    case 'menu-change-node':
      return d.menuName || '(未設選單)';
    case 'mission-assign-node':
      return d.missionKey || '(未選任務)';
    case 'streak-increment-node':
      return d.streakKey || '(未設 streak)';
    case 'set-attribute-node':
      return d.attributeKey ? `${d.attributeKey}=${d.value ?? ''}` : '(未設屬性)';
    default:
      return '';
  }
}
