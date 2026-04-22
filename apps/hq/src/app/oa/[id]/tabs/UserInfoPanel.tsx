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
  MissionTemplate,
} from '../../../../types';
import { BadgeIcon } from '../../../products/[id]/badgeIcon';

interface Props {
  userId: string;
  /** OA's bound product — required to assign new missions. */
  productId: string | null;
}

/**
 * Compact side panel showing the user's attributes / missions /
 * streaks / badges / journey. Mirrors what /admins/[userId] renders
 * but is tuned for a ~320px rail next to the conversation view, and
 * supports inline edits so support staff can adjust state without
 * leaving the conversation.
 */
export default function UserInfoPanel({ userId, productId }: Props) {
  const [user, setUser] = useState<HQUser | null>(null);
  const [attributes, setAttributes] = useState<UserAttribute[]>([]);
  const [missions, setMissions] = useState<UserMissionAssignment[]>([]);
  const [streaks, setStreaks] = useState<UserStreakRow[]>([]);
  const [badges, setBadges] = useState<UserBadgeRow[]>([]);
  const [journeys, setJourneys] = useState<UserJourneyPhaseRow[]>([]);
  const [availableMissions, setAvailableMissions] = useState<MissionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');
  const [missionPickerOpen, setMissionPickerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, a, m, s, b, j] = await Promise.all([
        apiFetch(`/api/hq/users/${userId}`),
        apiFetch(`/api/hq/users/${userId}/attributes`),
        apiFetch(`/api/hq/users/${userId}/missions`),
        apiFetch(`/api/hq/users/${userId}/streaks`),
        apiFetch(`/api/hq/users/${userId}/badges`),
        apiFetch(`/api/hq/users/${userId}/journeys`),
      ]);
      if (u.ok) setUser((await u.json()).user);
      setAttributes((await a.json()).attributes ?? []);
      setMissions((await m.json()).missions ?? []);
      setStreaks((await s.json()).streaks ?? []);
      setBadges((await b.json()).badges ?? []);
      setJourneys((await j.json()).phases ?? []);
    } catch (err) {
      console.error('[UserInfoPanel] load', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // Lazy-load available missions when the picker opens.
  useEffect(() => {
    if (!missionPickerOpen || !productId) return;
    apiFetch(`/api/products/${productId}/missions`)
      .then(r => r.ok ? r.json() : { missions: [] })
      .then((d: { missions?: MissionTemplate[] }) => setAvailableMissions(d.missions ?? []))
      .catch(() => {});
  }, [missionPickerOpen, productId]);

  const setAttribute = async (key: string, value: string | null) => {
    if (!key.trim()) return;
    setBusyKey(`attr:${key}`);
    try {
      const res = await apiFetch(
        `/api/hq/users/${userId}/attributes/${encodeURIComponent(key.trim())}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value }),
        },
      );
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      await load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusyKey(null);
    }
  };

  const deleteAttribute = async (key: string) => {
    if (!window.confirm(`刪除屬性「${key}」？`)) return;
    setBusyKey(`attr:${key}`);
    try {
      const res = await apiFetch(`/api/hq/users/${userId}/attributes/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusyKey(null);
    }
  };

  const handleAddAttribute = async () => {
    if (!newAttrKey.trim()) return;
    await setAttribute(newAttrKey, newAttrValue);
    setNewAttrKey('');
    setNewAttrValue('');
  };

  const abandonMission = async (assignmentId: string, name: string) => {
    if (!window.confirm(`將任務「${name}」標記為放棄？歷史紀錄會保留。`)) return;
    setBusyKey(`mission:${assignmentId}`);
    try {
      const res = await apiFetch(`/api/hq/users/${userId}/missions/${assignmentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusyKey(null);
    }
  };

  const assignMission = async (missionKey: string) => {
    if (!productId) { alert('此 OA 未綁定產品，無法指派任務'); return; }
    setBusyKey(`assign:${missionKey}`);
    try {
      const res = await apiFetch(`/api/hq/users/${userId}/missions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, mission_key: missionKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMissionPickerOpen(false);
      await load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusyKey(null);
    }
  };

  const revokeBadge = async (templateId: string, name: string) => {
    if (!window.confirm(`撤回徽章「${name}」？`)) return;
    setBusyKey(`badge:${templateId}`);
    try {
      const res = await apiFetch(`/api/hq/users/${userId}/badges/${templateId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) return <div className="p-3 text-xs text-slate-400">載入中…</div>;
  if (error) return <div className="p-3 hq-alert hq-alert-error text-xs">{error}</div>;

  const pendingMissions = missions.filter(m => m.status === 'pending');
  const completedCount = missions.filter(m => m.status === 'completed').length;
  const abandonedCount = missions.filter(m => m.status === 'abandoned').length;
  const pendingTemplateIds = new Set(pendingMissions.map(m => m.template.id));

  return (
    <div className="flex flex-col gap-3 p-3 text-sm">
      {/* Basic */}
      <div className="flex items-center gap-2">
        {user?.picture_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.picture_url} alt="" className="w-10 h-10 rounded-full shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-semibold shrink-0">
            {(user?.display_name || user?.email || userId || '?')[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{user?.display_name || 'Anonymous'}</div>
          <div className="text-[10px] text-slate-400 font-mono truncate" title={userId}>
            {userId}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link href={`/admins/${userId}`}
          className="text-xs px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 flex-1 text-center">
          完整資料 →
        </Link>
        <button onClick={load}
          className="text-xs px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50"
          title="重新整理">↻</button>
      </div>

      {/* Journey */}
      {journeys.length > 0 && (
        <div className="border-t border-slate-200 pt-2">
          <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Journey</h4>
          <ul className="flex flex-col gap-1">
            {journeys.map(j => (
              <li key={j.id} className="text-xs">
                <code className="bg-slate-100 px-1 rounded text-[10px]">{j.journey_key}</code>{' '}
                <strong>{j.phase_key}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Streaks */}
      {streaks.length > 0 && (
        <div className="border-t border-slate-200 pt-2">
          <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">連續天數</h4>
          <ul className="flex flex-col gap-1">
            {streaks.map(s => (
              <li key={s.id} className="text-xs flex justify-between gap-2">
                <code className="bg-slate-100 px-1 rounded text-[10px] truncate">{s.streak_key}</code>
                <span className="whitespace-nowrap">🔥 {s.count_current}<span className="text-slate-400"> / 最佳 {s.count_best}</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Missions */}
      <div className="border-t border-slate-200 pt-2">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
            任務（進行 {pendingMissions.length}
            {completedCount > 0 && <span className="text-slate-400">・完成 {completedCount}</span>}
            {abandonedCount > 0 && <span className="text-slate-400">・放棄 {abandonedCount}</span>}
            ）
          </h4>
          <button
            onClick={() => setMissionPickerOpen(v => !v)}
            disabled={!productId}
            className="text-[10px] px-1.5 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
            title={productId ? '指派任務' : '此 OA 未綁定產品'}>
            + 指派
          </button>
        </div>
        {pendingMissions.length === 0 ? (
          <p className="text-xs text-slate-400">無進行中任務</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {pendingMissions.map(m => (
              <li key={m.id} className="text-xs flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{m.template.name}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2">
                    <code className="bg-slate-100 px-1 rounded">{m.template.key}</code>
                    {m.progress_target > 1 && (
                      <span>{m.progress_current}/{m.progress_target}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => abandonMission(m.id, m.template.name)}
                  disabled={busyKey === `mission:${m.id}`}
                  className="text-[10px] text-red-600 hover:underline shrink-0 disabled:opacity-50"
                  title="標記為放棄">
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        {missionPickerOpen && productId && (
          <div className="mt-2 border border-slate-200 rounded p-2 bg-slate-50 flex flex-col gap-1">
            <div className="text-[10px] text-slate-500">選擇要指派的任務：</div>
            {availableMissions.length === 0 ? (
              <p className="text-xs text-slate-400">（此產品尚無任務）</p>
            ) : (
              <ul className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
                {availableMissions
                  .filter(t => t.is_active && !pendingTemplateIds.has(t.id))
                  .map(t => (
                    <li key={t.id}>
                      <button
                        onClick={() => assignMission(t.key)}
                        disabled={busyKey === `assign:${t.key}`}
                        className="w-full text-left text-xs px-2 py-1 rounded hover:bg-white disabled:opacity-50">
                        <span className="font-semibold">{t.name}</span>{' '}
                        <code className="text-[10px] text-slate-400">{t.key}</code>
                      </button>
                    </li>
                  ))}
              </ul>
            )}
            <div className="flex items-center gap-2">
              <button onClick={() => setMissionPickerOpen(false)}
                className="text-[10px] text-slate-500 hover:text-slate-900 ml-auto">取消</button>
            </div>
          </div>
        )}
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div className="border-t border-slate-200 pt-2">
          <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">徽章（{badges.length}）</h4>
          <div className="flex flex-wrap gap-1">
            {badges.map(b => (
              <span key={b.id}
                className="text-xs bg-slate-50 border border-slate-200 rounded pl-1.5 pr-1 py-0.5 flex items-center gap-1"
                title={b.template.description ?? ''}>
                <BadgeIcon icon={b.template.icon} size={16} />
                <span>{b.template.name}</span>
                <button
                  onClick={() => revokeBadge(b.template.id, b.template.name)}
                  disabled={busyKey === `badge:${b.template.id}`}
                  className="text-[10px] text-slate-400 hover:text-red-600 leading-none px-1 disabled:opacity-50"
                  title="撤回徽章">
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Attributes */}
      <div className="border-t border-slate-200 pt-2">
        <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">屬性（{attributes.length}）</h4>
        {attributes.length === 0 ? (
          <p className="text-xs text-slate-400 mb-1">尚無</p>
        ) : (
          <ul className="flex flex-col gap-0.5 mb-2">
            {attributes.map(a => (
              <li key={a.id} className="text-xs flex justify-between items-baseline gap-2">
                <code className="bg-slate-100 px-1 rounded text-[10px] truncate max-w-[45%]"
                  title={a.key}>{a.key}</code>
                <span className="text-slate-700 truncate text-right flex-1"
                  title={a.value ?? 'null'}>
                  {a.value ?? <em className="text-slate-400">null</em>}
                </span>
                <button
                  onClick={() => {
                    const v = window.prompt(`「${a.key}」新值：`, a.value ?? '');
                    if (v !== null) setAttribute(a.key, v);
                  }}
                  disabled={busyKey === `attr:${a.key}`}
                  className="text-[10px] text-slate-500 hover:text-slate-900 shrink-0 disabled:opacity-50"
                  title="編輯">✎</button>
                <button
                  onClick={() => deleteAttribute(a.key)}
                  disabled={busyKey === `attr:${a.key}`}
                  className="text-[10px] text-slate-400 hover:text-red-600 shrink-0 disabled:opacity-50"
                  title="刪除">✕</button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-1">
          <input className="hq-input text-xs flex-1 min-w-0" placeholder="key"
            value={newAttrKey} onChange={e => setNewAttrKey(e.target.value)} />
          <span className="text-slate-400">=</span>
          <input className="hq-input text-xs flex-1 min-w-0" placeholder="value"
            value={newAttrValue} onChange={e => setNewAttrValue(e.target.value)} />
          <button onClick={handleAddAttribute}
            disabled={!newAttrKey.trim()}
            className="text-xs px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 shrink-0">
            +
          </button>
        </div>
      </div>
    </div>
  );
}
