'use client';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useState } from 'react';
import type { MessageLogRow } from '../../../../types';
import UserInfoPanel from './UserInfoPanel';

interface Props {
  oaId: string;
}

interface UserRow {
  user_id: string;
  last_at: string;
}

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString('zh-TW', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function sourceLabel(source: string | null): string {
  switch (source) {
    case 'follow_reply': return '加好友歡迎';
    case 'postback_reply': return 'Postback 回覆';
    case 'intent': return '意圖規則';
    case 'ai_agent': return 'AI 顧問';
    case 'scheduler_push': return '排程推播';
    case 'scheduler_ai': return '排程 AI 推播';
    case 'user': return '';
    default: return source ?? '';
  }
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
        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 px-2">
          <span>{formatTs(m.created_at)}</span>
          {m.source && m.source !== 'user' && (
            <span className="bg-slate-100 px-1 rounded">{sourceLabel(m.source)}</span>
          )}
          {m.source_ref && (
            <span className="font-mono truncate max-w-[120px]" title={m.source_ref}>
              · {m.source_ref.slice(0, 20)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OaConversationsTab({ oaId }: Props) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageLogRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
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
    apiFetch(`/api/line/oa/${oaId}/messages?user_id=${encodeURIComponent(userId)}&limit=200`)
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ messages: MessageLogRow[] }>;
      })
      .then(({ messages: list }) => setMessages((list ?? []).reverse()))
      .catch(err => {
        console.error('[oa/conversations] load messages', err);
        setError('無法載入訊息');
      })
      .finally(() => setLoadingMessages(false));
  }, [oaId]);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => {
    if (selectedUser) loadMessages(selectedUser);
    else setMessages([]);
  }, [selectedUser, loadMessages]);

  const filteredUsers = filter.trim()
    ? users.filter(u => u.user_id.toLowerCase().includes(filter.trim().toLowerCase()))
    : users;

  return (
    <div className="flex h-full overflow-hidden">
      {/* User list */}
      <div className="w-72 border-r border-slate-200 bg-white shrink-0 flex flex-col">
        <div className="p-3 border-b border-slate-200 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm m-0">使用者（{users.length}）</h3>
            <button onClick={() => { loadUsers(); if (selectedUser) loadMessages(selectedUser); }}
              className="text-xs text-slate-500 hover:text-slate-900">↻</button>
          </div>
          <input className="hq-input text-xs" placeholder="搜尋 user_id"
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
                    className={`w-full text-left px-3 py-2 border-b border-slate-100 transition-colors ${
                      u.user_id === selectedUser
                        ? 'bg-slate-100'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-mono text-xs text-slate-700 truncate">
                      {u.user_id.slice(0, 20)}{u.user_id.length > 20 ? '…' : ''}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      最後 {formatTs(u.last_at)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden min-w-0">
        {error && <div className="hq-alert hq-alert-error m-3">{error}</div>}
        {!selectedUser ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            請從左側選擇使用者
          </div>
        ) : (
          <>
            <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2">
              <span className="font-mono text-xs text-slate-700 truncate" title={selectedUser}>
                {selectedUser}
              </span>
              <span className="text-xs text-slate-400 whitespace-nowrap">· {messages.length} 則</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {loadingMessages ? (
                <p className="text-xs text-slate-400 text-center">載入中...</p>
              ) : messages.length === 0 ? (
                <p className="text-xs text-slate-400 text-center">尚無訊息</p>
              ) : (
                messages.map(m => <MessageBubble key={m.id} m={m} />)
              )}
            </div>
          </>
        )}
      </div>

      {/* User info side panel */}
      {selectedUser && (
        <aside className="w-80 border-l border-slate-200 bg-white shrink-0 overflow-y-auto hidden lg:block">
          <UserInfoPanel key={selectedUser} userId={selectedUser} />
        </aside>
      )}
    </div>
  );
}
