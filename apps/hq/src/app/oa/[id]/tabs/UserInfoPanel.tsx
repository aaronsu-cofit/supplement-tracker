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
} from '../../../../types';

interface Props {
  userId: string;
}

/**
 * Compact side panel showing the user's attributes / missions /
 * streaks / badges / journey. Mirrors what /admins/[userId] renders
 * but is tuned for a ~320px rail next to the conversation view.
 * Reloads when userId changes; links to the full page for deep edits.
 */
export default function UserInfoPanel({ userId }: Props) {
  const [user, setUser] = useState<HQUser | null>(null);
  const [attributes, setAttributes] = useState<UserAttribute[]>([]);
  const [missions, setMissions] = useState<UserMissionAssignment[]>([]);
  const [streaks, setStreaks] = useState<UserStreakRow[]>([]);
  const [badges, setBadges] = useState<UserBadgeRow[]>([]);
  const [journeys, setJourneys] = useState<UserJourneyPhaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) return <div className="p-3 text-xs text-slate-400">載入中…</div>;
  if (error) return <div className="p-3 hq-alert hq-alert-error text-xs">{error}</div>;

  const pendingMissions = missions.filter(m => m.status === 'pending');
  const completedCount = missions.length - pendingMissions.length;

  const allEmpty =
    attributes.length === 0 &&
    missions.length === 0 &&
    streaks.length === 0 &&
    badges.length === 0 &&
    journeys.length === 0;

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

      {allEmpty && (
        <div className="text-xs text-slate-400 italic border-t border-slate-200 pt-2">
          尚無狀態資料
        </div>
      )}

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

      {/* Pending missions */}
      {pendingMissions.length > 0 && (
        <div className="border-t border-slate-200 pt-2">
          <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
            進行中任務（{pendingMissions.length}
            {completedCount > 0 && <span className="text-slate-400">・已完成 {completedCount}</span>}
            ）
          </h4>
          <ul className="flex flex-col gap-1.5">
            {pendingMissions.map(m => (
              <li key={m.id} className="text-xs">
                <div className="font-semibold">{m.template.name}</div>
                <div className="text-[10px] text-slate-400 flex items-center gap-2">
                  <code className="bg-slate-100 px-1 rounded">{m.template.key}</code>
                  {m.progress_target > 1 && (
                    <span>{m.progress_current}/{m.progress_target}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {pendingMissions.length === 0 && completedCount > 0 && (
        <div className="border-t border-slate-200 pt-2 text-xs text-slate-500">
          已完成 {completedCount} 個任務（無進行中）
        </div>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <div className="border-t border-slate-200 pt-2">
          <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">徽章（{badges.length}）</h4>
          <div className="flex flex-wrap gap-1">
            {badges.map(b => (
              <span key={b.id}
                className="text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 flex items-center gap-1"
                title={b.template.description ?? ''}>
                <span>{b.template.icon || '🏅'}</span>
                <span>{b.template.name}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Attributes */}
      {attributes.length > 0 && (
        <div className="border-t border-slate-200 pt-2">
          <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">屬性（{attributes.length}）</h4>
          <ul className="flex flex-col gap-0.5">
            {attributes.map(a => (
              <li key={a.id} className="text-xs flex justify-between items-baseline gap-2">
                <code className="bg-slate-100 px-1 rounded text-[10px] truncate max-w-[60%]"
                  title={a.key}>{a.key}</code>
                <span className="text-slate-700 truncate text-right"
                  title={a.value ?? 'null'}>
                  {a.value ?? <em className="text-slate-400">null</em>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
