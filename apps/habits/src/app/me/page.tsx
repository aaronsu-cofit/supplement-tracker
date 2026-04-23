'use client';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useState } from 'react';
import type { UserStreakRow, UserBadgeRow, UserJourneyPhaseRow } from '../../lib/types';

interface UserInfo {
  id: string;
  display_name: string | null;
  picture_url: string | null;
}

export default function MePage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [streaks, setStreaks] = useState<UserStreakRow[]>([]);
  const [badges, setBadges] = useState<UserBadgeRow[]>([]);
  const [journeys, setJourneys] = useState<UserJourneyPhaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Resolve current user via /api/auth/me (returns the signed-in user)
      const meRes = await apiFetch('/api/auth/me');
      if (!meRes.ok) throw new Error(`auth HTTP ${meRes.status}`);
      const meData = await meRes.json();
      if (!meData.authenticated) throw new Error('未登入');
      const u: UserInfo = meData.user;
      setUser(u);

      const [s, b, j] = await Promise.all([
        apiFetch(`/api/hq/users/${encodeURIComponent(u.id)}/streaks`),
        apiFetch(`/api/hq/users/${encodeURIComponent(u.id)}/badges`),
        apiFetch(`/api/hq/users/${encodeURIComponent(u.id)}/journeys`),
      ]);
      setStreaks(s.ok ? (await s.json()).streaks ?? [] : []);
      setBadges(b.ok ? (await b.json()).badges ?? [] : []);
      setJourneys(j.ok ? (await j.json()).phases ?? [] : []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="card text-sm text-slate-400">載入中...</div>;
  if (error) return <div className="card text-sm text-red-600">{error}</div>;
  if (!user) return null;

  return (
    <div className="flex flex-col gap-3">
      <header className="card flex items-center gap-3 mt-2">
        {user.picture_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.picture_url} alt="" className="w-12 h-12 rounded-full" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-semibold">
            {(user.display_name ?? '?')[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{user.display_name ?? 'Anonymous'}</div>
          <div className="text-xs text-slate-400 font-mono truncate">{user.id}</div>
        </div>
      </header>

      {/* Journey */}
      {journeys.length > 0 && (
        <section className="card">
          <h2 className="text-sm font-semibold mb-2">Journey</h2>
          <ul className="flex flex-col gap-1">
            {journeys.map(j => (
              <li key={j.id} className="text-sm flex items-center justify-between">
                <code className="text-xs bg-slate-100 px-1 rounded">{j.journey_key}</code>
                <strong className="text-[var(--color-accent)]">{j.phase_key}</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Streaks */}
      <section className="card">
        <h2 className="text-sm font-semibold mb-2">🔥 連續天數</h2>
        {streaks.length === 0 ? (
          <p className="text-xs text-slate-400">尚無紀錄</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {streaks.map(s => (
              <li key={s.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm">{s.streak_key}</div>
                  <div className="text-[10px] text-slate-400">最後 {s.last_occurred_on?.slice(0, 10) ?? '—'}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-[var(--color-accent)]">{s.count_current}</div>
                  <div className="text-[10px] text-slate-400">最佳 {s.count_best}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Badges */}
      <section className="card">
        <h2 className="text-sm font-semibold mb-2">🏅 徽章（{badges.length}）</h2>
        {badges.length === 0 ? (
          <p className="text-xs text-slate-400">尚無徽章，完成習慣、連續打卡即可取得</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {badges.map(b => (
              <li key={b.id} className="border border-slate-200 rounded-lg px-2 py-1.5 flex items-center gap-1.5 bg-slate-50">
                <BadgeIconRender icon={b.template.icon} />
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold">{b.template.name}</span>
                  <span className="text-[10px] text-slate-400">{new Date(b.earned_at).toLocaleDateString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function BadgeIconRender({ icon }: { icon: string | null }) {
  if (!icon) return <span>🏅</span>;
  if (/^(https?:\/\/|data:)/i.test(icon.trim())) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={icon} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
    );
  }
  return <span style={{ fontSize: 18 }}>{icon}</span>;
}
