'use client';
import Link from 'next/link';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useProductId } from '../../lib/productId';
import type { HabitsResponse, HistoryResponse, HabitRow, DailyLog } from '../../lib/types';

interface HabitWithHistory { habit: HabitRow; history: HistoryResponse | null }

export default function ReviewPage() {
  const productId = useProductId();
  const [todayDate, setTodayDate] = useState<string | null>(null);
  const [rows, setRows] = useState<HabitWithHistory[]>([]);
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
      setTodayDate(data.date);
      const daily = data.habits.filter(h => h.template.mission_type !== 'one_shot' && h.template.is_active);
      const hist = await Promise.all(daily.map(async h => {
        const r = await apiFetch(`/api/me/habits/${encodeURIComponent(h.template.key)}/history?product_id=${encodeURIComponent(productId)}&days=7`);
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

  const weekDates = useMemo(() => {
    if (!todayDate) return [];
    const dates: string[] = [];
    const t = new Date(todayDate + 'T00:00:00Z');
    for (let i = 6; i >= 0; i--) {
      const d = new Date(t);
      d.setUTCDate(t.getUTCDate() - i);
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  }, [todayDate]);

  if (!productId) return <div className="card text-sm text-slate-500">找不到產品 ID。</div>;
  if (loading) return <div className="card text-sm text-slate-400">載入中...</div>;
  if (error) return <div className="card text-sm text-red-600">{error}</div>;

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <header className="mt-2 mb-1">
          <h1 className="text-2xl font-bold">本週回顧</h1>
        </header>
        <div className="card text-center py-10 flex flex-col items-center gap-2">
          <div className="text-4xl">📊</div>
          <p className="text-sm text-slate-600 font-semibold">還沒有可回顧的資料</p>
          <Link href={`/add?product_id=${encodeURIComponent(productId)}`}
            className="btn-primary text-xs mt-2">+ 加入習慣</Link>
        </div>
      </div>
    );
  }

  // Aggregate week stats
  const stats = aggregateWeek(rows, weekDates);
  const notes = collectWeekNotes(rows, weekDates);

  return (
    <div className="flex flex-col gap-3">
      <header className="mt-2 mb-1">
        <h1 className="text-2xl font-bold">本週回顧</h1>
        <p className="text-sm text-slate-500 mt-1">
          {weekDates[0]} → {weekDates[weekDates.length - 1]}
        </p>
      </header>

      <section className="card">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-2xl font-bold text-[var(--color-accent)]">{stats.completionPct}%</div>
            <div className="text-[10px] text-slate-500">完成率</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.totalCompleted}</div>
            <div className="text-[10px] text-slate-500">完成次數</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-600">{stats.totalSkipped}</div>
            <div className="text-[10px] text-slate-500">略過次數</div>
          </div>
        </div>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="text-sm font-semibold">每個習慣</h2>
        <ul className="flex flex-col gap-3">
          {stats.perHabit.map(h => (
            <li key={h.habitKey}>
              <div className="flex items-center justify-between text-sm">
                <Link href={`/habits/${encodeURIComponent(h.habitKey)}?product_id=${encodeURIComponent(productId)}`}
                  className="font-medium">{h.habitName}</Link>
                <span className="text-xs text-slate-500">
                  {h.completed}/{h.eligible}
                  {h.skipped > 0 && <span className="text-amber-600 ml-1">⏭{h.skipped}</span>}
                </span>
              </div>
              <WeekStripe dates={weekDates} dayMap={h.dayMap} />
            </li>
          ))}
        </ul>
      </section>

      {notes.length > 0 && (
        <section className="card flex flex-col gap-2">
          <h2 className="text-sm font-semibold">本週筆記</h2>
          <ul className="flex flex-col gap-2">
            {notes.map((n, i) => (
              <li key={i} className="text-xs">
                <div className="text-slate-400 text-[10px] flex items-center gap-2">
                  <span>{n.date}</span>
                  <Link href={`/habits/${encodeURIComponent(n.habitKey)}?product_id=${encodeURIComponent(productId)}`}
                    className="text-[var(--color-accent)]">{n.habitName}</Link>
                </div>
                <div className="text-slate-700 whitespace-pre-wrap">{n.note}</div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

interface WeekDayState { state: 'done' | 'skip' | null }

interface PerHabitStats {
  habitKey: string;
  habitName: string;
  completed: number;
  skipped: number;
  /** completed + missed (skipped excluded — neutral) */
  eligible: number;
  dayMap: Map<string, WeekDayState>;
}

interface WeekStats {
  totalCompleted: number;
  totalSkipped: number;
  totalEligible: number;
  completionPct: number;
  perHabit: PerHabitStats[];
}

function aggregateWeek(rows: HabitWithHistory[], weekDates: string[]): WeekStats {
  let totalCompleted = 0;
  let totalSkipped = 0;
  let totalEligible = 0;
  const perHabit: PerHabitStats[] = rows.map(({ habit, history }) => {
    const dayMap = new Map<string, WeekDayState>();
    let completed = 0;
    let skipped = 0;
    if (history) {
      for (const log of history.logs) {
        const d = log.date.slice(0, 10);
        if (!weekDates.includes(d)) continue;
        if (log.completed) {
          dayMap.set(d, { state: 'done' });
          completed++;
        } else if (log.skipped) {
          dayMap.set(d, { state: 'skip' });
          skipped++;
        } else {
          dayMap.set(d, { state: null });
        }
      }
    }
    const eligible = weekDates.length - skipped;
    totalCompleted += completed;
    totalSkipped += skipped;
    totalEligible += eligible;
    return {
      habitKey: habit.template.key,
      habitName: habit.template.name,
      completed,
      skipped,
      eligible,
      dayMap,
    };
  });
  const completionPct = totalEligible > 0
    ? Math.round((totalCompleted / totalEligible) * 100)
    : 100;
  return { totalCompleted, totalSkipped, totalEligible, completionPct, perHabit };
}

function collectWeekNotes(
  rows: HabitWithHistory[],
  weekDates: string[],
): Array<{ date: string; habitKey: string; habitName: string; note: string }> {
  const items: Array<{ date: string; habitKey: string; habitName: string; note: string }> = [];
  for (const { habit, history } of rows) {
    if (!history) continue;
    for (const log of history.logs) {
      const d = log.date.slice(0, 10);
      if (!weekDates.includes(d)) continue;
      if (log.note && log.note.trim() !== '') {
        items.push({
          date: d,
          habitKey: habit.template.key,
          habitName: habit.template.name,
          note: log.note,
        });
      }
    }
  }
  // Newest first
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

function WeekStripe({ dates, dayMap }: { dates: string[]; dayMap: Map<string, WeekDayState> }) {
  const labels = ['日', '一', '二', '三', '四', '五', '六'];
  return (
    <div className="grid grid-cols-7 gap-1 mt-1">
      {dates.map(d => {
        const state = dayMap.get(d)?.state ?? null;
        const wd = new Date(d + 'T00:00:00Z').getUTCDay();
        return (
          <div key={d} className="flex flex-col items-center gap-0.5"
            title={`${d} ${state === 'done' ? '完成' : state === 'skip' ? '略過' : '—'}`}>
            <div className="text-[9px] text-slate-400">{labels[wd]}</div>
            <div className={`w-full aspect-square rounded ${
              state === 'done' ? 'bg-[var(--color-accent)]'
                : state === 'skip' ? 'bg-amber-200'
                : 'bg-slate-100'
            }`} />
          </div>
        );
      })}
    </div>
  );
}

// Suppress unused-import warning if linter complains; DailyLog is implicitly used via HistoryResponse.logs
void ({} as DailyLog);
