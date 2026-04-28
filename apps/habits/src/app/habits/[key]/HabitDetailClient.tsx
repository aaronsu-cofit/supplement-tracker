'use client';
import Link from 'next/link';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useProductId } from '../../../lib/productId';
import type { HabitsResponse, HabitRow, HistoryResponse } from '../../../lib/types';

interface Props {
  missionKey: string;
}

type DayState = 'done' | 'skip';

export default function HabitDetailClient({ missionKey }: Props) {
  const productId = useProductId();
  const [habit, setHabit] = useState<HabitRow | null>(null);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteStatus, setNoteStatus] = useState<string | null>(null);

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
      const hist = await histRes.json() as HistoryResponse;
      setHistory(hist);
      setNoteDraft(match?.today_log?.note ?? '');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [productId, missionKey]);

  useEffect(() => { load(); }, [load]);

  const dayMap = useMemo(() => {
    const m = new Map<string, DayState>();
    if (!history) return m;
    for (const log of history.logs) {
      const d = log.date.slice(0, 10);
      if (log.completed) m.set(d, 'done');
      else if (log.skipped) m.set(d, 'skip');
    }
    return m;
  }, [history]);

  const saveNote = async () => {
    if (!productId || savingNote) return;
    setSavingNote(true);
    setNoteStatus(null);
    try {
      const trimmed = noteDraft.trim();
      const res = await apiFetch(`/api/me/habits/${encodeURIComponent(missionKey)}/note`, {
        method: 'PATCH',
        body: JSON.stringify({
          product_id: productId,
          note: trimmed === '' ? null : trimmed,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      setNoteStatus('已儲存');
      setTimeout(() => setNoteStatus(null), 2000);
      await load();
    } catch (err) {
      setNoteStatus((err as Error).message);
    } finally {
      setSavingNote(false);
    }
  };

  const toggleSkip = async (skipped: boolean) => {
    if (!productId || acting) return;
    setActing(true);
    try {
      const res = await apiFetch(`/api/me/habits/${encodeURIComponent(missionKey)}/log`, {
        method: 'POST',
        body: JSON.stringify({
          product_id: productId,
          action: skipped ? 'skip' : 'unskip',
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActing(false);
    }
  };

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
  const completedDays = Array.from(dayMap.values()).filter(s => s === 'done').length;
  const streak = computeCurrentStreak(dayMap);
  const todayBadge = log?.completed ? '✓' : log?.skipped ? '⏭' : '—';

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
            <div className="text-2xl font-bold">{todayBadge}</div>
            <div className="text-[10px] text-slate-500">今天</div>
          </div>
        </div>
      </header>

      <section className="card flex flex-col gap-2">
        <h2 className="text-sm font-semibold">近 60 天</h2>
        <HeatMap days={60} dayMap={dayMap} />
        <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-[var(--color-accent)]" />完成
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-amber-200" />略過
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-slate-100" />未完成
          </span>
        </div>
      </section>

      <section className="card flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">今日筆記</h2>
          <span className="text-[10px] text-slate-400">{noteDraft.length}/500</span>
        </div>
        <textarea
          value={noteDraft}
          onChange={e => setNoteDraft(e.target.value.slice(0, 500))}
          placeholder="今天的心情、卡關、感想⋯"
          rows={3}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none" />
        <div className="flex items-center justify-between">
          <span className={`text-xs ${noteStatus === '已儲存' ? 'text-emerald-700' : 'text-slate-400'}`}>
            {noteStatus ?? ''}
          </span>
          <button onClick={saveNote} disabled={savingNote || (noteDraft.trim() === (log?.note ?? ''))}
            className="text-xs px-3 py-1 rounded-lg bg-[var(--color-accent)] text-white disabled:opacity-40">
            {savingNote ? '儲存中...' : '儲存'}
          </button>
        </div>
      </section>

      {history && <PastNotes logs={history.logs} todayDate={log?.date.slice(0, 10)} />}

      {!log?.completed && (
        <button onClick={() => toggleSkip(!log?.skipped)} disabled={acting}
          className="card text-center text-sm font-medium text-amber-700 disabled:opacity-50">
          {log?.skipped ? '↩️ 取消略過今日' : '⏭ 略過今日（不破 streak）'}
        </button>
      )}

      {t.action_url && (
        <a href={t.action_url} target="_blank" rel="noreferrer"
          className="btn-primary text-center">開啟外部頁面 ↗</a>
      )}

      <Link href={`/habits/${encodeURIComponent(t.key)}/settings?product_id=${encodeURIComponent(productId!)}`}
        className="card text-center text-sm text-slate-600 font-medium">
        ⚙️ 個人化設定
      </Link>
    </div>
  );
}

function PastNotes({ logs, todayDate }: { logs: HistoryResponse['logs']; todayDate?: string }) {
  // Notes from the last N days, today excluded (today is editable above)
  const past = logs
    .filter(l => l.note && l.note.trim() !== '' && l.date.slice(0, 10) !== todayDate)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);
  if (past.length === 0) return null;
  return (
    <section className="card flex flex-col gap-2">
      <h2 className="text-sm font-semibold">過往筆記</h2>
      <ul className="flex flex-col gap-2">
        {past.map(l => (
          <li key={l.id} className="text-xs">
            <div className="text-slate-400 text-[10px]">{l.date.slice(0, 10)}</div>
            <div className="text-slate-700 whitespace-pre-wrap">{l.note}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NoProduct() {
  return (
    <div className="card text-sm text-slate-500">
      找不到產品 ID。
    </div>
  );
}

function HeatMap({ days, dayMap }: { days: number; dayMap: Map<string, DayState> }) {
  const today = new Date();
  const cells: { date: string; state: DayState | null }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, state: dayMap.get(key) ?? null });
  }
  return (
    <div className="grid grid-cols-10 gap-1">
      {cells.map(c => (
        <div
          key={c.date}
          title={`${c.date} ${c.state === 'done' ? '完成' : c.state === 'skip' ? '略過' : '—'}`}
          className={`aspect-square rounded-sm ${
            c.state === 'done' ? 'bg-[var(--color-accent)]'
              : c.state === 'skip' ? 'bg-amber-200'
              : 'bg-slate-100'
          }`}
        />
      ))}
    </div>
  );
}

// Streak: completed days count; skipped days are neutral (don't count, don't break);
// missed days break. Allow today to be missing/skipped at the head without breaking.
function computeCurrentStreak(dayMap: Map<string, DayState>): number {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const state = dayMap.get(key);
    if (state === 'done') streak++;
    else if (state === 'skip') continue;
    else if (i > 0) break;
  }
  return streak;
}
