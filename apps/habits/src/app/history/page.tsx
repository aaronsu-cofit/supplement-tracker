'use client';
import Link from 'next/link';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useState } from 'react';
import { useProductId } from '../../lib/productId';
import type { HabitsResponse, HistoryResponse, HabitRow } from '../../lib/types';

interface Row { habit: HabitRow; history: HistoryResponse | null }

export default function HistoryPage() {
  const productId = useProductId();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!productId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/me/habits?product_id=${encodeURIComponent(productId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as HabitsResponse;
      const daily = data.habits.filter(h => h.template.mission_type !== 'one_shot');
      const hist = await Promise.all(daily.map(async h => {
        const r = await apiFetch(`/api/me/habits/${encodeURIComponent(h.template.key)}/history?product_id=${encodeURIComponent(productId)}&days=30`);
        if (!r.ok) return { habit: h, history: null };
        return { habit: h, history: await r.json() as HistoryResponse };
      }));
      setRows(hist);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  if (!productId) return <div className="card text-sm text-slate-500">找不到產品 ID。</div>;
  if (loading) return <div className="card text-sm text-slate-400">載入中...</div>;
  if (error) return <div className="card text-sm text-red-600">{error}</div>;

  return (
    <div className="flex flex-col gap-3">
      <header className="mt-2 mb-1">
        <h1 className="text-2xl font-bold">歷史紀錄</h1>
        <p className="text-sm text-slate-500 mt-1">近 30 天每日打卡狀態</p>
      </header>

      {rows.length === 0 ? (
        <div className="card text-sm text-slate-500">
          沒有每日型任務。到「今日」頁或聯絡管理員指派。
        </div>
      ) : (
        rows.map(({ habit, history }) => (
          <Link key={habit.assignment.id}
            href={`/habits/${encodeURIComponent(habit.template.key)}?product_id=${encodeURIComponent(productId)}`}
            className="card flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">{habit.template.name}</span>
              <span className="text-xs text-slate-400">{history?.logs.filter(l => l.completed).length ?? 0} / 30</span>
            </div>
            <Stripe history={history} days={30} />
          </Link>
        ))
      )}
    </div>
  );
}

function Stripe({ history, days }: { history: HistoryResponse | null; days: number }) {
  const map = new Map<string, boolean>();
  if (history) for (const l of history.logs) map.set(l.date.slice(0, 10), l.completed);
  const today = new Date();
  const cells: { date: string; completed: boolean }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, completed: map.get(key) ?? false });
  }
  return (
    <div className="flex gap-[2px]">
      {cells.map(c => (
        <div key={c.date}
          className={`flex-1 h-3 rounded-sm ${c.completed ? 'bg-[var(--color-accent)]' : 'bg-slate-100'}`}
          title={`${c.date} ${c.completed ? '完成' : '—'}`} />
      ))}
    </div>
  );
}
