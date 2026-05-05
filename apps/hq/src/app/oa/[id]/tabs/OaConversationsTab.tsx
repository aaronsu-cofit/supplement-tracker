'use client';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useState } from 'react';
import type { MessageLogRow } from '../../../../types';
import UserInfoPanel from './UserInfoPanel';

interface Props {
  oaId: string;
  productId?: string | null;
}

interface UserRow {
  user_id: string;
  last_at: string;
  display_name: string | null;
  picture_url: string | null;
}

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString('zh-TW', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

interface SourceMeta {
  label: string;
  /** Tailwind class for the badge — color-codes provenance so admins
   *  can scan which messages came from which subsystem at a glance. */
  className: string;
  /** Icon prefix to make the answering subsystem extra obvious. */
  icon?: string;
}

function sourceMeta(source: string | null): SourceMeta {
  switch (source) {
    case 'follow_reply':   return { label: '加好友歡迎', className: 'bg-slate-100 text-slate-600' };
    case 'postback_reply': return { label: 'Postback 回覆', className: 'bg-slate-100 text-slate-600' };
    case 'intent':         return { label: '意圖規則',   className: 'bg-emerald-100 text-emerald-700', icon: '🎯' };
    case 'ai_agent':       return { label: 'AI Fallback', className: 'bg-violet-100 text-violet-700', icon: '🤖' };
    case 'mission_notify': return { label: '任務通知',   className: 'bg-sky-100 text-sky-700' };
    case 'badge_notify':   return { label: '徽章通知',   className: 'bg-amber-100 text-amber-700' };
    case 'habit_reminder': return { label: '習慣提醒',   className: 'bg-amber-100 text-amber-700', icon: '⏰' };
    case 'scheduler_push': return { label: '排程推播',   className: 'bg-sky-100 text-sky-700' };
    case 'scheduler_ai':   return { label: '排程 AI 推播', className: 'bg-violet-100 text-violet-700' };
    case 'user':           return { label: '', className: '' };
    default:               return { label: source ?? '', className: 'bg-slate-100 text-slate-600' };
  }
}

/** For ai_agent: source_ref looks like `<agent>` or `<agent>:slow` or
 *  `<agent>:error` or `<agent>:error:slow`. Pull the parts apart so the
 *  bubble can show "🤖 AI Fallback · nutrition_analyst · 🐢 慢回應" etc. */
function parseAiSourceRef(ref: string | null): { agent?: string; slow: boolean; error: boolean } {
  if (!ref) return { slow: false, error: false };
  const parts = ref.split(':');
  return {
    agent: parts[0],
    error: parts.includes('error'),
    slow: parts.includes('slow'),
  };
}

function MessageBubble({ m }: { m: MessageLogRow }) {
  const isOut = m.direction === 'outbound';
  const isFlex = m.type === 'flex';

  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-2`}>
      <div className={`max-w-[75%] flex flex-col gap-1 ${isOut ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
          isOut
            ? 'bg-[#00c300] text-white'
            : 'bg-white border border-slate-200 text-slate-900'
        }`}>
          {m.type === 'text' && (m.content_text || <em className="text-white/70">(空白)</em>)}
          {m.type === 'postback' && (
            <span>
              <span className="text-xs opacity-70">[postback]</span> {m.content_text}
            </span>
          )}
          {m.type === 'image' && (
            <a href={m.content_text ?? '#'} target="_blank" rel="noopener noreferrer"
              className={isOut ? 'underline' : 'text-blue-600 underline'}>
              📷 {m.content_text || '(圖片)'}
            </a>
          )}
          {m.type === 'sticker' && <span>🎴 {m.content_text}</span>}
          {isFlex && (
            <div>
              <div className="font-semibold">🎴 Flex: {m.content_text || '(未設 altText)'}</div>
              <details className="mt-1 text-xs opacity-80">
                <summary className="cursor-pointer">查看 JSON</summary>
                <pre className="mt-1 overflow-x-auto max-h-48 text-[10px] whitespace-pre-wrap">
                  {JSON.stringify(m.content_json, null, 2)}
                </pre>
              </details>
            </div>
          )}
          {!['text', 'postback', 'image', 'sticker', 'flex'].includes(m.type) && (
            <span className="text-xs opacity-70">[{m.type}] {m.content_text}</span>
          )}
        </div>
        <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-1.5 px-2">
          <span>{formatTs(m.created_at)}</span>
          {m.source && m.source !== 'user' && (() => {
            const meta = sourceMeta(m.source);
            if (m.source === 'ai_agent') {
              const ai = parseAiSourceRef(m.source_ref);
              return (
                <>
                  <span className={`${meta.className} px-1.5 py-[1px] rounded font-medium`}>
                    {meta.icon} {meta.label}
                  </span>
                  {ai.agent && (
                    <span className="font-mono text-slate-500" title={`agent: ${ai.agent}`}>
                      · {ai.agent}
                    </span>
                  )}
                  {ai.slow && (
                    <span className="text-amber-600" title="LLM took >9s — pushed via pushText instead of replyToken">
                      🐢 慢回應
                    </span>
                  )}
                  {ai.error && (
                    <span className="text-red-600" title="LLM call errored — fell back to default copy">
                      ⚠ 錯誤
                    </span>
                  )}
                </>
              );
            }
            // For intent: prefer rule name (resolved server-side) over the opaque rule id.
            const refDisplay = m.source === 'intent'
              ? (m.intent_rule_name ?? `(已刪除規則)`)
              : m.source_ref;
            const refTitle = m.source === 'intent' && m.intent_rule_name
              ? `${m.intent_rule_name} · ${m.source_ref}`
              : m.source_ref ?? '';
            return (
              <>
                <span className={`${meta.className} px-1.5 py-[1px] rounded`}>
                  {meta.icon ? `${meta.icon} ` : ''}{meta.label}
                </span>
                {refDisplay && (
                  <span className={`truncate max-w-[160px] ${m.source === 'intent' ? '' : 'font-mono'}`} title={refTitle}>
                    · {refDisplay.length > 24 ? `${refDisplay.slice(0, 24)}…` : refDisplay}
                  </span>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 50;

export default function OaConversationsTab({ oaId, productId }: Props) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  // Messages held in DESC order (newest first) — admins care most about
  // recent activity, paginate backwards into history with "載入更多".
  const [messages, setMessages] = useState<MessageLogRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const loadUsers = useCallback(() => {
    setLoadingUsers(true);
    apiFetch(`/api/line/oa/${oaId}/messages/users`)
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ users: UserRow[] }>;
      })
      .then(({ users: list }) => {
        setUsers(list ?? []);
        if (!selectedUser && list && list.length > 0) setSelectedUser(list[0].user_id);
      })
      .catch(err => {
        console.error('[oa/conversations] load users', err);
        setError('無法載入使用者列表');
      })
      .finally(() => setLoadingUsers(false));
  }, [oaId, selectedUser]);

  const loadMessages = useCallback((userId: string) => {
    setLoadingMessages(true);
    setHasMore(false);
    apiFetch(`/api/line/oa/${oaId}/messages?user_id=${encodeURIComponent(userId)}&limit=${PAGE_SIZE}`)
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ messages: MessageLogRow[] }>;
      })
      .then(({ messages: list }) => {
        const arr = list ?? [];
        setMessages(arr); // backend already DESC
        setHasMore(arr.length === PAGE_SIZE);
      })
      .catch(err => {
        console.error('[oa/conversations] load messages', err);
        setError('無法載入訊息');
      })
      .finally(() => setLoadingMessages(false));
  }, [oaId]);

  const loadOlder = useCallback(() => {
    if (!selectedUser || messages.length === 0 || loadingMore) return;
    const oldest = messages[messages.length - 1];
    setLoadingMore(true);
    apiFetch(
      `/api/line/oa/${oaId}/messages?user_id=${encodeURIComponent(selectedUser)}` +
      `&limit=${PAGE_SIZE}&before=${encodeURIComponent(oldest.created_at)}`,
    )
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ messages: MessageLogRow[] }>;
      })
      .then(({ messages: list }) => {
        const arr = list ?? [];
        // Append older rows to the end (DESC means oldest go to bottom).
        setMessages(prev => [...prev, ...arr]);
        setHasMore(arr.length === PAGE_SIZE);
      })
      .catch(err => {
        console.error('[oa/conversations] load older', err);
        setError('無法載入更早訊息');
      })
      .finally(() => setLoadingMore(false));
  }, [oaId, selectedUser, messages, loadingMore]);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => {
    if (selectedUser) loadMessages(selectedUser);
    else { setMessages([]); setHasMore(false); }
  }, [selectedUser, loadMessages]);

  const filteredUsers = filter.trim()
    ? (() => {
        const q = filter.trim().toLowerCase();
        return users.filter(u =>
          u.user_id.toLowerCase().includes(q) ||
          (u.display_name?.toLowerCase().includes(q) ?? false),
        );
      })()
    : users;

  return (
    <div className="flex h-full overflow-hidden">
      {/* User list */}
      <div className="w-72 border-r border-slate-200 bg-white shrink-0 flex flex-col min-h-0">
        <div className="p-3 border-b border-slate-200 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm m-0">使用者（{users.length}）</h3>
            <button onClick={() => { loadUsers(); if (selectedUser) loadMessages(selectedUser); }}
              className="text-xs text-slate-500 hover:text-slate-900">↻</button>
          </div>
          <input className="hq-input text-xs" placeholder="搜尋名字或 user_id"
            value={filter} onChange={e => setFilter(e.target.value)} />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingUsers ? (
            <p className="text-xs text-slate-400 p-3">載入中...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-xs text-slate-400 p-3">
              {users.length === 0 ? '此 OA 尚無對話紀錄' : '沒有符合的使用者'}
            </p>
          ) : (
            <ul>
              {filteredUsers.map(u => (
                <li key={u.user_id}>
                  <button
                    onClick={() => setSelectedUser(u.user_id)}
                    className={`w-full text-left px-3 py-2 border-b border-slate-100 transition-colors flex items-center gap-2 ${
                      u.user_id === selectedUser
                        ? 'bg-slate-100'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {u.picture_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.picture_url} alt=""
                        className="w-8 h-8 rounded-full bg-slate-200 shrink-0 object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0 flex items-center justify-center text-xs text-slate-500">
                        {(u.display_name ?? u.user_id).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-slate-800 truncate">
                        {u.display_name ?? <span className="font-mono text-slate-500 text-xs">{u.user_id.slice(0, 18)}…</span>}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        最後 {formatTs(u.last_at)}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden min-w-0 min-h-0">
        {error && <div className="hq-alert hq-alert-error m-3">{error}</div>}
        {!selectedUser ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            請從左側選擇使用者
          </div>
        ) : (
          <>
            <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2">
              {(() => {
                const u = users.find(x => x.user_id === selectedUser);
                return (
                  <>
                    <span className="text-sm font-semibold text-slate-800 truncate">
                      {u?.display_name ?? '(未命名)'}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 truncate" title={selectedUser}>
                      {selectedUser}
                    </span>
                  </>
                );
              })()}
              <span className="text-xs text-slate-400 whitespace-nowrap ml-auto">· {messages.length} 則</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingMessages ? (
                <p className="text-xs text-slate-400 text-center">載入中...</p>
              ) : messages.length === 0 ? (
                <p className="text-xs text-slate-400 text-center">尚無訊息</p>
              ) : (
                <>
                  {messages.map(m => <MessageBubble key={m.id} m={m} />)}
                  <div className="flex justify-center py-4">
                    {hasMore ? (
                      <button onClick={loadOlder} disabled={loadingMore}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                        {loadingMore ? '載入中...' : `↓ 載入更早訊息（${PAGE_SIZE} 則）`}
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400">— 沒有更早的訊息 —</span>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* User info side panel */}
      {selectedUser && (
        <aside className="w-80 border-l border-slate-200 bg-white shrink-0 overflow-y-auto hidden lg:block">
          <UserInfoPanel key={selectedUser} userId={selectedUser} productId={productId ?? null} />
        </aside>
      )}
    </div>
  );
}
