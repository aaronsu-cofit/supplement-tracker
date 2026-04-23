'use client';
import Link from 'next/link';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useState } from 'react';
import { useProductId } from '../../lib/productId';
import type { AvailableMission } from '../../lib/types';

export default function AddHabitPage() {
  const productId = useProductId();
  const [missions, setMissions] = useState<AvailableMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'daily' | 'one_shot'>('all');

  const load = useCallback(() => {
    if (!productId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    apiFetch(`/api/me/products/${encodeURIComponent(productId)}/available-missions`)
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ missions: AvailableMission[] }>;
      })
      .then(d => setMissions(d.missions ?? []))
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  const subscribe = async (missionKey: string) => {
    if (!productId || busyKey) return;
    setBusyKey(missionKey);
    try {
      const res = await apiFetch(`/api/me/missions/${encodeURIComponent(missionKey)}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusyKey(null);
    }
  };

  const unsubscribe = async (missionKey: string) => {
    if (!productId || busyKey) return;
    if (!window.confirm('移除此習慣？已有的歷史紀錄會保留。')) return;
    setBusyKey(missionKey);
    try {
      const res = await apiFetch(`/api/me/missions/${encodeURIComponent(missionKey)}/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusyKey(null);
    }
  };

  if (!productId) return <div className="card text-sm text-slate-500">找不到產品 ID。</div>;
  if (loading) return <div className="card text-sm text-slate-400">載入中...</div>;
  if (error) return <div className="card text-sm text-red-600">{error}</div>;

  const filtered = missions.filter(m => {
    if (filter === 'daily') return m.mission_type !== 'one_shot';
    if (filter === 'one_shot') return m.mission_type === 'one_shot';
    return true;
  });

  const byCategory = new Map<string, AvailableMission[]>();
  for (const m of filtered) {
    const c = m.category ?? '其他';
    if (!byCategory.has(c)) byCategory.set(c, []);
    byCategory.get(c)!.push(m);
  }

  return (
    <div className="flex flex-col gap-3">
      <header className="mt-2 mb-1 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">加入習慣</h1>
          <p className="text-sm text-slate-500 mt-1">從此產品所有可用習慣中挑選加入你的每日計畫</p>
        </div>
        <Link href="/" className="text-sm text-slate-500">← 回今日</Link>
      </header>

      {/* Filter tabs */}
      <div className="flex items-center gap-1">
        {([
          ['all', '全部'],
          ['daily', '每日'],
          ['one_shot', '一次性'],
        ] as const).map(([k, label]) => (
          <button key={k}
            onClick={() => setFilter(k)}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              filter === k ? 'bg-[var(--color-accent)] text-white' : 'bg-slate-100 text-slate-600'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-sm text-slate-500">此分類下沒有可用習慣</div>
      ) : (
        Array.from(byCategory.entries()).map(([cat, list]) => (
          <section key={cat} className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-2">
              {cat}
            </h2>
            {list.map(m => (
              <div key={m.id} className="card flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{m.name}</span>
                    <TypeBadge mission={m} />
                  </div>
                  {m.description && <p className="text-xs text-slate-500 mt-1">{m.description}</p>}
                  {m.mission_type === 'quantitative_daily' && m.daily_target && (
                    <p className="text-xs text-slate-400 mt-1">每日目標：{m.daily_target}{m.unit ?? ''}</p>
                  )}
                  {m.mission_type === 'checklist_daily' && m.subtasks && (
                    <p className="text-xs text-slate-400 mt-1">{m.subtasks.length} 個子任務</p>
                  )}
                </div>
                <div className="shrink-0">
                  {m.is_subscribed ? (
                    <button onClick={() => unsubscribe(m.key)} disabled={busyKey === m.key}
                      className="btn-ghost text-xs">
                      已加入 · 移除
                    </button>
                  ) : (
                    <button onClick={() => subscribe(m.key)} disabled={busyKey === m.key}
                      className="btn-primary text-xs">
                      + 加入
                    </button>
                  )}
                </div>
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  );
}

function TypeBadge({ mission: m }: { mission: AvailableMission }) {
  const label =
    m.mission_type === 'binary_daily' ? '每日打勾' :
    m.mission_type === 'quantitative_daily' ? '每日量化' :
    m.mission_type === 'checklist_daily' ? '每日清單' :
    '一次性';
  const className =
    m.mission_type === 'one_shot' ? 'bg-slate-100 text-slate-600' : 'bg-violet-50 text-violet-600';
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${className}`}>{label}</span>
  );
}
