'use client';
import { apiFetch } from '@vitera/lib';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type {
  HQUser,
  UserAttribute,
  UserMissionAssignment,
  UserStreakRow,
  UserBadgeRow,
  UserJourneyPhaseRow,
  EngagementEventRow,
  MessageLogRow,
} from '../../../types';

interface Props {
  userId: string;
}

export default function UserDetailClient({ userId }: Props) {
  const [user, setUser] = useState<HQUser | null>(null);
  const [attributes, setAttributes] = useState<UserAttribute[]>([]);
  const [missions, setMissions] = useState<UserMissionAssignment[]>([]);
  const [streaks, setStreaks] = useState<UserStreakRow[]>([]);
  const [badges, setBadges] = useState<UserBadgeRow[]>([]);
  const [journeys, setJourneys] = useState<UserJourneyPhaseRow[]>([]);
  const [events, setEvents] = useState<EngagementEventRow[]>([]);
  const [messages, setMessages] = useState<MessageLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [uRes, aRes, mRes, sRes, bRes, jRes, eRes, msgRes] = await Promise.all([
        apiFetch(`/api/hq/users/${userId}`),
        apiFetch(`/api/hq/users/${userId}/attributes`),
        apiFetch(`/api/hq/users/${userId}/missions`),
        apiFetch(`/api/hq/users/${userId}/streaks`),
        apiFetch(`/api/hq/users/${userId}/badges`),
        apiFetch(`/api/hq/users/${userId}/journeys`),
        apiFetch(`/api/hq/users/${userId}/engagement`),
        apiFetch(`/api/hq/users/${userId}/messages?limit=50`),
      ]);
      if (!uRes.ok) throw new Error(`User lookup failed: ${uRes.status}`);
      const uData = await uRes.json();
      setUser(uData.user);
      setAttributes((await aRes.json()).attributes ?? []);
      setMissions((await mRes.json()).missions ?? []);
      setStreaks((await sRes.json()).streaks ?? []);
      setBadges((await bRes.json()).badges ?? []);
      setJourneys((await jRes.json()).phases ?? []);
      setEvents((await eRes.json()).events ?? []);
      setMessages((await msgRes.json()).messages ?? []);
    } catch (err) {
      console.error('[user-detail] load error', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const setAttribute = async (key: string, value: string | null) => {
    if (!key.trim()) return;
    try {
      const res = await apiFetch(`/api/hq/users/${userId}/attributes/${encodeURIComponent(key.trim())}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const deleteAttribute = async (key: string) => {
    if (!window.confirm(`刪除屬性「${key}」？`)) return;
    try {
      const res = await apiFetch(`/api/hq/users/${userId}/attributes/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleAddAttribute = async () => {
    if (!newAttrKey.trim()) return;
    await setAttribute(newAttrKey, newAttrValue);
    setNewAttrKey('');
    setNewAttrValue('');
  };

  if (loading) return <div className="hq-card text-slate-500">載入中...</div>;
  if (error || !user) return <div className="hq-alert hq-alert-error">{error || '找不到此使用者'}</div>;

  return (
    <div className="hq-fade-in flex flex-col gap-4 max-w-4xl">
      <div className="hq-header flex items-center justify-between">
        <div className="flex items-center gap-3">
          {user.picture_url ? (
            <img src={user.picture_url} alt="" className="hq-avatar" />
          ) : (
            <div className="hq-avatar-fallback">{(user.display_name || user.email || '?')[0].toUpperCase()}</div>
          )}
          <div>
            <h2>{user.display_name || 'Anonymous'}</h2>
            <p className="font-mono text-xs">{user.id}</p>
          </div>
        </div>
        <Link href="/admins" className="text-sm text-slate-500 hover:text-slate-900">← 回列表</Link>
      </div>

      {/* Attributes */}
      <div className="hq-card flex flex-col gap-3">
        <h3 className="font-semibold text-lg">屬性（{attributes.length}）</h3>
        <p className="text-xs text-slate-500">
          per-user 任意 key/value。可由意圖 <code className="bg-slate-100 px-1 rounded">set_attribute</code>、任務完成的 reward、或此頁手動設定。
        </p>
        {attributes.length === 0 ? (
          <p className="text-sm text-slate-400">尚無屬性</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {attributes.map(a => (
              <li key={a.id} className="flex items-center justify-between border-b border-slate-100 last:border-0 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="bg-slate-100 px-1.5 rounded font-mono text-sm">{a.key}</code>
                  <span className="text-slate-400">=</span>
                  <span className="text-sm text-slate-700">{a.value ?? <em className="text-slate-400">null</em>}</span>
                  <span className="text-xs text-slate-400">{new Date(a.set_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => {
                    const v = window.prompt('新值：', a.value ?? '');
                    if (v !== null) setAttribute(a.key, v);
                  }}
                    className="text-xs px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-50">
                    編輯
                  </button>
                  <button onClick={() => deleteAttribute(a.key)}
                    className="text-xs px-2 py-0.5 rounded border border-red-300 text-red-600 bg-white hover:bg-red-50">
                    刪除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-2 border-t border-slate-200 pt-3">
          <input className="hq-input text-sm flex-1" placeholder="key" value={newAttrKey}
            onChange={e => setNewAttrKey(e.target.value)} />
          <span className="text-slate-400">=</span>
          <input className="hq-input text-sm flex-1" placeholder="value" value={newAttrValue}
            onChange={e => setNewAttrValue(e.target.value)} />
          <button onClick={handleAddAttribute}
            className="hq-btn-primary text-sm">新增 / 設定</button>
        </div>
      </div>

      {/* Missions */}
      <div className="hq-card flex flex-col gap-3">
        <h3 className="font-semibold text-lg">任務（{missions.length}）</h3>
        {missions.length === 0 ? (
          <p className="text-sm text-slate-400">尚無任務</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {missions.map(m => (
              <li key={m.id} className="border-b border-slate-100 last:border-0 py-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="bg-slate-100 px-1.5 rounded font-mono text-sm">{m.template.key}</code>
                    <span className="font-semibold">{m.template.name}</span>
                    <span className={`hq-badge ${m.status === 'completed' ? 'hq-badge-green' : 'hq-badge-gray'}`}>
                      {m.status}
                    </span>
                    {m.progress_target > 1 && (
                      <span className="text-xs text-slate-500">{m.progress_current}/{m.progress_target}</span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    {m.status === 'completed' && m.completed_at
                      ? `完成於 ${new Date(m.completed_at).toLocaleString()}`
                      : `指派於 ${new Date(m.assigned_at).toLocaleString()}`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Streaks */}
      <div className="hq-card flex flex-col gap-3">
        <h3 className="font-semibold text-lg">連續天數（{streaks.length}）</h3>
        {streaks.length === 0 ? (
          <p className="text-sm text-slate-400">尚無連續天數紀錄</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {streaks.map(s => (
              <li key={s.id} className="flex items-center justify-between border-b border-slate-100 last:border-0 py-2">
                <div className="flex items-center gap-2">
                  <code className="bg-slate-100 px-1.5 rounded font-mono text-sm">{s.streak_key}</code>
                  <span className="text-sm">現在 <strong>{s.count_current}</strong> 天 · 最佳 {s.count_best} 天</span>
                </div>
                <span className="text-xs text-slate-400">
                  {s.last_occurred_on ? `最後 ${s.last_occurred_on.slice(0, 10)}` : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Badges */}
      <div className="hq-card flex flex-col gap-3">
        <h3 className="font-semibold text-lg">徽章（{badges.length}）</h3>
        {badges.length === 0 ? (
          <p className="text-sm text-slate-400">尚無徽章</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {badges.map(b => (
              <li key={b.id} className="border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2 bg-slate-50">
                {b.template.icon && <span className="text-xl">{b.template.icon}</span>}
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">{b.template.name}</span>
                  <code className="text-xs text-slate-500 font-mono">{b.template.key}</code>
                  <span className="text-xs text-slate-400">{new Date(b.earned_at).toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Journey phases */}
      <div className="hq-card flex flex-col gap-3">
        <h3 className="font-semibold text-lg">Journey 現況（{journeys.length}）</h3>
        {journeys.length === 0 ? (
          <p className="text-sm text-slate-400">尚無 Journey 狀態</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {journeys.map(j => (
              <li key={j.id} className="flex items-center justify-between border-b border-slate-100 last:border-0 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="bg-slate-100 px-1.5 rounded font-mono text-sm">{j.journey_key}</code>
                  <span className="text-sm">目前 phase：<strong>{j.phase_key}</strong></span>
                </div>
                <span className="text-xs text-slate-400">
                  進入於 {new Date(j.entered_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Message log */}
      <div className="hq-card flex flex-col gap-3">
        <h3 className="font-semibold text-lg">對話紀錄（近 {messages.length} 則）</h3>
        {messages.length === 0 ? (
          <p className="text-sm text-slate-400">尚無對話紀錄</p>
        ) : (
          <ul className="flex flex-col gap-1 max-h-[500px] overflow-y-auto">
            {messages.map(m => {
              const isOut = m.direction === 'outbound';
              return (
                <li key={m.id}
                  className={`text-xs py-1.5 px-2 border-b border-slate-100 last:border-0 flex items-start gap-2 ${
                    isOut ? 'bg-emerald-50/40' : 'bg-slate-50/40'
                  }`}>
                  <span className={`shrink-0 font-mono text-[10px] font-semibold ${
                    isOut ? 'text-emerald-700' : 'text-slate-500'
                  }`}>
                    {isOut ? '→' : '←'}
                  </span>
                  <span className="shrink-0 text-slate-400 whitespace-nowrap text-[10px]">
                    {new Date(m.created_at).toLocaleString('zh-TW', {
                      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                  <span className="shrink-0 text-[10px] text-slate-400 uppercase">{m.type}</span>
                  <span className="flex-1 whitespace-pre-wrap break-words min-w-0">
                    {m.content_text || (m.type === 'flex' ? '(flex)' : '—')}
                  </span>
                  {m.source && m.source !== 'user' && (
                    <span className="shrink-0 text-[10px] text-slate-400">{m.source}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Engagement events */}
      <div className="hq-card flex flex-col gap-3">
        <h3 className="font-semibold text-lg">最近事件（{events.length}）</h3>
        {events.length === 0 ? (
          <p className="text-sm text-slate-400">尚無事件</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {events.map(ev => (
              <li key={ev.id} className="flex items-center gap-2 border-b border-slate-100 last:border-0 py-1">
                <span className="text-xs text-slate-400 w-36 shrink-0">
                  {new Date(ev.occurred_at).toLocaleString()}
                </span>
                <code className="bg-slate-100 px-1.5 rounded font-mono text-xs">{ev.event_type}</code>
                {ev.payload && <span className="text-xs text-slate-600 truncate">{ev.payload}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
