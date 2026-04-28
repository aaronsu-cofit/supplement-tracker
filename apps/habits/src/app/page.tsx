'use client';
import Link from 'next/link';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useRef, useState } from 'react';
import HabitCard from '../components/HabitCard';
import OaFollowHint from '../components/OaFollowHint';
import YesterdayRecap from '../components/YesterdayRecap';
import { useProductId } from '../lib/productId';
import type { HabitsResponse } from '../lib/types';

export default function TodayPage() {
  const productId = useProductId();
  const [data, setData] = useState<HabitsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confetti, setConfetti] = useState(false);
  const wasAllDoneRef = useRef(false);

  const load = useCallback(() => {
    if (!productId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    apiFetch(`/api/me/habits?product_id=${encodeURIComponent(productId)}`)
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<HabitsResponse>;
      })
      .then(d => {
        const daily = d.habits.filter(h => h.template.is_active && h.template.mission_type !== 'one_shot');
        // Skipped habits don't block "all done" — the user explicitly opted out today.
        const allDoneNow = daily.length > 0
          && daily.every(h => h.today_log?.completed || h.today_log?.skipped);
        // Fire confetti only on the not-all-done → all-done transition
        if (allDoneNow && !wasAllDoneRef.current) {
          setConfetti(true);
          setTimeout(() => setConfetti(false), 2500);
        }
        wasAllDoneRef.current = allDoneNow;
        setData(d);
      })
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  if (!productId) return <NoProductHint />;
  if (loading && !data) return <div className="card text-sm text-slate-400">載入中...</div>;
  if (error) return <div className="card text-sm text-red-600">{error}</div>;
  if (!data) return null;

  const habits = data.habits.filter(h => h.template.is_active);
  const daily = habits.filter(h => h.template.mission_type !== 'one_shot');
  const completedCount = daily.filter(h => h.today_log?.completed).length;
  const skippedCount = daily.filter(h => h.today_log?.skipped && !h.today_log?.completed).length;
  // Treat today as "all done" once everything's either completed or skipped.
  const allDone = daily.length > 0 && (completedCount + skippedCount) === daily.length;
  const byCategory = groupByCategory(habits);

  return (
    <div className="flex flex-col gap-3">
      {confetti && <ConfettiBurst />}

      <header className="mt-2 mb-1">
        <p className="text-xs text-slate-400">{data.date} · {greeting()}</p>
        <h1 className="text-2xl font-bold">今日任務</h1>
        {daily.length > 0 && (
          <ProgressHero completedCount={completedCount} total={daily.length} allDone={allDone} />
        )}
      </header>

      <OaFollowHint />

      <YesterdayRecap productId={productId} habits={data.habits} todayDate={data.date} />

      {Object.entries(byCategory).length === 0 ? (
        <EmptyState />
      ) : (
        Object.entries(byCategory).map(([cat, list]) => (
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
        ))
      )}

      <Link href={`/add?product_id=${encodeURIComponent(productId)}`}
        className="card text-center text-sm text-[var(--color-accent)] font-semibold mt-2">
        + 加入新習慣
      </Link>
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '早安';
  if (h < 18) return '午安';
  return '晚安';
}

function ProgressHero({ completedCount, total, allDone }: { completedCount: number; total: number; allDone: boolean }) {
  const pct = Math.round((completedCount / Math.max(1, total)) * 100);
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm text-slate-500">
          {allDone ? '🎉 全部完成！' : `完成 ${completedCount} / ${total}`}
        </span>
        <span className="text-xs text-slate-400">{pct}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function NoProductHint() {
  return (
    <div className="card text-sm text-slate-500">
      找不到產品 ID。請從 LINE 官方帳號的對應入口進入，或確認 LIFF URL 帶有 <code>?product_id=...</code>。
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card text-center py-8 flex flex-col items-center gap-3">
      <div className="text-4xl">🌱</div>
      <p className="text-sm text-slate-500">還沒有任何習慣</p>
      <p className="text-xs text-slate-400 -mt-1">加入一個小習慣開始你的旅程吧</p>
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

/**
 * Lightweight CSS-driven confetti burst on day-completion. 40 small
 * divs with randomised trajectories + rotations. Parent sets a 2.5s
 * unmount timeout so it cleans up without any state tracking here.
 */
function ConfettiBurst() {
  const colors = ['#7c5cfc', '#5ce0d8', '#fbbf24', '#f472b6', '#4ade80'];
  const pieces = Array.from({ length: 40 }).map((_, i) => ({
    left: Math.random() * 100,
    drift: (Math.random() - 0.5) * 60,
    delay: Math.random() * 0.3,
    duration: 1.5 + Math.random() * 1,
    color: colors[i % colors.length],
    rotate: Math.random() * 720,
    i,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map(p => (
        <span
          key={p.i}
          style={{
            position: 'absolute',
            top: '-10px',
            left: `${p.left}%`,
            width: 8, height: 12,
            background: p.color,
            borderRadius: 2,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
            ['--drift' as string]: `${p.drift}vw`,
            ['--rotate' as string]: `${p.rotate}deg`,
          } as React.CSSProperties}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--drift), 100vh) rotate(var(--rotate)); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
