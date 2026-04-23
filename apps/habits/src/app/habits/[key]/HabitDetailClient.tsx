'use client';
import Link from 'next/link';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useProductId } from '../../../lib/productId';
import type { HabitsResponse, HabitRow, HistoryResponse } from '../../../lib/types';

interface Props {
  missionKey: string;
}

export default function HabitDetailClient({ missionKey }: Props) {
  const productId = useProductId();
  const [habit, setHabit] = useState<HabitRow | null>(null);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!productId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [habitsRes, histRes] = await Promise.all([
        apiFetch(`/api/me/habits?product_id=${encodeURIComponent(productId)}`),
        apiFetch(`/api/me/habits/${encodeURIComponent(missionKey)}/history?product_id=${encodeURIComponent(productId)}&days=60`),
      ]);
      if (!habitsRes.ok) throw new Error(`habits HTTP ${habitsRes.status}`);
      if (!histRes.ok) throw new Error(`history HTTP ${histRes.status}`);
      const habitsData = await habitsRes.json() as HabitsResponse;
      const match = habitsData.habits.find(h => h.template.key === missionKey) ?? null;
      setHabit(match);
      setHistory(await histRes.json() as HistoryResponse);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [productId, missionKey]);

  useEffect(() => { load(); }, [load]);

  const dayMap = useMemo(() => {
    const m = new Map<string, boolean>();
    if (!history) return m;
    for (const log of history.logs) {
      m.set(log.date.slice(0, 10), log.completed);
    }
    return m;
  }, [history]);

  if (!productId) return <NoProduct />;
  if (loading) return <div className="card text-sm text-slate-400">載入中...</div>;
  if (error) return <div className="card text-sm text-red-600">{error}</div>;
  if (!habit) {
    return (
      <div className="card text-sm text-slate-500">
        找不到此習慣（key: <code>{missionKey}</code>）
        <div className="mt-2"><Link href="/" className="text-[var(--color-accent)]">← 回今日</Link></div>
      </div>
    );
  }

  const t = habit.template;
  const log = habit.today_log;
  const completedDays = Array.from(dayMap.values()).filter(Boolean).length;
  const streak = computeCurrentStreak(dayMap);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between mt-1">
        <Link href="/" className="text-sm text-slate-500">← 回今日</Link>
      </div>

      <header className="card">
        <div className="flex items-center gap-2">
          {t.category && <span className="text-[10px] uppercase tracking-wide text-slate-400">{t.category}</span>}
          <span className="text-xs text-slate-400">{t.mission_type}</span>
        </div>
        <h1 className="text-xl font-bold mt-1">{t.name}</h1>
        {t.description && <p className="text-sm text-slate-500 mt-1">{t.description}</p>}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-2xl font-bold text-[var(--color-accent)]">{streak}</div>
            <div className="text-[10px] text-slate-500">連續天數</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{completedDays}</div>
            <div className="text-[10px] text-slate-500">60 天完成</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{log?.completed ? '✓' : '—'}</div>
            <div className="text-[10px] text-slate-500">今天</div>
          </div>
        </div>
      </header>

      <section className="card flex flex-col gap-2">
        <h2 className="text-sm font-semibold">近 60 天</h2>
        <HeatMap days={60} dayMap={dayMap} />
      </section>

      {t.action_url && (
        <a href={t.action_url} target="_blank" rel="noreferrer"
          className="btn-primary text-center">開啟外部頁面 ↗</a>
      )}
    </div>
  );
}

function NoProduct() {
  return (
    <div className="card text-sm text-slate-500">
      找不到產品 ID。
    </div>
  );
}

function HeatMap({ days, dayMap }: { days: number; dayMap: Map<string, boolean> }) {
  const today = new Date();
  const cells: { date: string; completed: boolean }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, completed: dayMap.get(key) ?? false });
  }
  return (
    <div className="grid grid-cols-10 gap-1">
      {cells.map(c => (
        <div
          key={c.date}
          title={`${c.date} ${c.completed ? '完成' : '—'}`}
          className={`aspect-square rounded-sm ${
            c.completed ? 'bg-[var(--color-accent)]' : 'bg-slate-100'
          }`}
        />
      ))}
    </div>
  );
}

function computeCurrentStreak(dayMap: Map<string, boolean>): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (dayMap.get(key)) streak++;
    else if (i > 0) break; // today missing is allowed; any gap after breaks
  }
  return streak;
}
