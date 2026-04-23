'use client';
import { apiFetch } from '@vitera/lib';
import { useEffect, useState } from 'react';
import type { HabitRow } from '../lib/types';

interface Props {
  productId: string;
  habits: HabitRow[];
  /** Server-returned "today" (YYYY-MM-DD in user's tz) — so yesterday
   *  computation isn't off-by-one at midnight. */
  todayDate: string;
}

interface RecapStats {
  totalHabits: number;
  completed: number;
  percent: number;
}

/**
 * Reads yesterday's logs for all the user's daily habits and renders a
 * compact card: "Yesterday you completed X/Y" plus per-habit checkboxes.
 * Uses the history endpoint with days=2 so we get today + yesterday
 * cheaply. Hidden when the user has no daily habits at all.
 */
export default function YesterdayRecap({ productId, habits, todayDate }: Props) {
  const daily = habits.filter(h => h.template.is_active && h.template.mission_type !== 'one_shot');
  const [stats, setStats] = useState<RecapStats | null>(null);
  const [perHabit, setPerHabit] = useState<Array<{ name: string; completed: boolean }>>([]);
  const yesterdayDate = computeYesterday(todayDate);

  useEffect(() => {
    if (daily.length === 0) return;
    let cancelled = false;

    (async () => {
      const results = await Promise.all(
        daily.map(async h => {
          const res = await apiFetch(
            `/api/me/habits/${encodeURIComponent(h.template.key)}/history?product_id=${encodeURIComponent(productId)}&days=2`,
          );
          if (!res.ok) return { habit: h, completed: false };
          const data = await res.json() as { logs: Array<{ date: string; completed: boolean }> };
          const log = data.logs.find(l => l.date.slice(0, 10) === yesterdayDate);
          return { habit: h, completed: !!log?.completed };
        }),
      );
      if (cancelled) return;
      const completed = results.filter(r => r.completed).length;
      setStats({
        totalHabits: daily.length,
        completed,
        percent: Math.round((completed / daily.length) * 100),
      });
      setPerHabit(results.map(r => ({ name: r.habit.template.name, completed: r.completed })));
    })();

    return () => { cancelled = true; };
  }, [productId, yesterdayDate, daily.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (daily.length === 0 || !stats) return null;

  // Omit entirely if yesterday had zero completions AND the user has
  // been around for less than 2 days — avoids shaming day-one users.
  const newestHabit = Math.max(...daily.map(h => new Date(h.assignment.assigned_at).getTime()));
  const hadHabitsYesterday = new Date(yesterdayDate).getTime() >= newestHabit - 24 * 3600 * 1000;
  if (!hadHabitsYesterday) return null;

  return (
    <div className="card flex flex-col gap-2 bg-slate-50/60">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase">昨日回顧</span>
        <span className="text-xs text-slate-400">{yesterdayDate}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold">
          {stats.completed} / {stats.totalHabits}
        </span>
        <span className="text-xs text-slate-500">
          {stats.percent === 100 ? '完美的一天 🌟' : stats.percent >= 50 ? '表現不錯！' : '今天再試試看吧 💪'}
        </span>
      </div>
      <ul className="flex flex-wrap gap-1 mt-1">
        {perHabit.map((p, i) => (
          <li key={i}
            className={`text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 ${
              p.completed
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-slate-100 text-slate-500 line-through'
            }`}>
            {p.completed ? '✓' : '·'} {p.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

function computeYesterday(todayDate: string): string {
  // Parse server-returned YYYY-MM-DD, subtract a day in UTC, format.
  const d = new Date(todayDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
