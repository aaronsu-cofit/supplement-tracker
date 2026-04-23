'use client';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useState } from 'react';
import HabitCard from '../components/HabitCard';
import { useProductId } from '../lib/productId';
import type { HabitsResponse } from '../lib/types';

export default function TodayPage() {
  const productId = useProductId();
  const [data, setData] = useState<HabitsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!productId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    apiFetch(`/api/me/habits?product_id=${encodeURIComponent(productId)}`)
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<HabitsResponse>;
      })
      .then(setData)
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  if (!productId) {
    return (
      <div className="card text-sm text-slate-500">
        找不到產品 ID。請從 LINE 官方帳號的對應入口進入，或確認 LIFF URL 帶有 <code>?product_id=...</code>。
      </div>
    );
  }

  if (loading) return <div className="card text-sm text-slate-400">載入中...</div>;
  if (error) return <div className="card text-sm text-red-600">{error}</div>;
  if (!data) return null;

  const habits = data.habits.filter(h => h.template.is_active);
  const completedCount = habits.filter(h => h.today_log?.completed).length;
  const byCategory = groupByCategory(habits);

  return (
    <div className="flex flex-col gap-3">
      <header className="mt-2 mb-1">
        <p className="text-xs text-slate-400">{data.date} · {data.timezone}</p>
        <h1 className="text-2xl font-bold">今日任務</h1>
        <p className="text-sm text-slate-500 mt-1">
          {habits.length === 0
            ? '尚無任何任務 — 請聯絡管理員指派'
            : `完成 ${completedCount} / ${habits.length}`}
        </p>
      </header>

      {Object.entries(byCategory).map(([cat, list]) => (
        <section key={cat} className="flex flex-col gap-2">
          {cat !== '__none' && (
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-2">
              {cat}
            </h2>
          )}
          {list.map(h => (
            <HabitCard key={h.assignment.id} habit={h} productId={productId} onChange={load} />
          ))}
        </section>
      ))}
    </div>
  );
}

function groupByCategory<T extends { template: { category: string | null } }>(list: T[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of list) {
    const c = item.template.category ?? '__none';
    if (!out[c]) out[c] = [];
    out[c].push(item);
  }
  return out;
}
