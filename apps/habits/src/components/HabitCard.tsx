'use client';
import Link from 'next/link';
import { apiFetch } from '@vitera/lib';
import { useState } from 'react';
import type { HabitRow } from '../lib/types';

interface Props {
  habit: HabitRow;
  productId: string;
  onChange: () => void;
}

/**
 * Single habit card rendered on the Today view. Behaviour splits by
 * mission_type — binary uses a single toggle button, quantitative
 * shows a +step button (and current value / target), checklist
 * expands to per-subtask rows. All actions POST to
 * /api/me/habits/:key/log and call onChange on success.
 */
export default function HabitCard({ habit, productId, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const { template, today_log } = habit;
  const t = template;
  const log = today_log;
  const completed = log?.completed ?? false;
  const skipped = (log?.skipped ?? false) && !completed;

  const call = async (body: Record<string, unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/me/habits/${encodeURIComponent(t.key)}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, auto_assign: true, ...body }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      onChange();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`card flex flex-col gap-2 transition-opacity ${completed || skipped ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {t.category && (
              <span className="text-[10px] uppercase tracking-wide text-slate-400">{t.category}</span>
            )}
            {skipped && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">⏭ 略過</span>}
            {t.mission_type === 'binary_daily' && <span className="text-xs text-slate-400">打勾</span>}
            {t.mission_type === 'quantitative_daily' && t.daily_target && (
              <span className="text-xs text-slate-400">量化 {log?.value ?? 0}/{t.daily_target}{t.unit ?? ''}</span>
            )}
            {t.mission_type === 'checklist_daily' && t.subtasks && (
              <span className="text-xs text-slate-400">清單 {log?.value ?? 0}/{t.subtasks.length}</span>
            )}
          </div>
          <Link href={`/habits/${encodeURIComponent(t.key)}?product_id=${encodeURIComponent(productId)}`}
            className="font-semibold text-[15px] block mt-0.5">
            {t.name}
          </Link>
          {t.description && <p className="text-xs text-slate-500 mt-1">{t.description}</p>}
        </div>
        <div className="shrink-0">
          {t.action_url ? (
            <a href={t.action_url} target="_blank" rel="noreferrer"
              className="btn-ghost text-sm">開啟 ↗</a>
          ) : t.mission_type === 'binary_daily' ? (
            <button onClick={() => call({ action: 'toggle' })} disabled={busy}
              className={completed ? 'btn-ghost' : 'btn-primary'}>
              {completed ? '✓ 完成' : '打勾'}
            </button>
          ) : t.mission_type === 'quantitative_daily' ? (
            <button onClick={() => call({ action: 'increment', step: t.step_value ?? 1 })} disabled={busy || completed}
              className={completed ? 'btn-ghost' : 'btn-primary'}>
              {completed ? '✓ 達標' : `+${t.step_value ?? 1}${t.unit ?? ''}`}
            </button>
          ) : (
            <span className="text-xs text-slate-400">下方勾選</span>
          )}
        </div>
      </div>

      {/* Progress bar for quantitative */}
      {t.mission_type === 'quantitative_daily' && t.daily_target && (
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-[var(--color-accent)] transition-all"
            style={{ width: `${Math.min(100, ((log?.value ?? 0) / t.daily_target) * 100)}%` }} />
        </div>
      )}

      {/* Subtasks for checklist */}
      {t.mission_type === 'checklist_daily' && t.subtasks && t.subtasks.length > 0 && (
        <ul className="flex flex-col gap-1 mt-1">
          {t.subtasks.map(s => {
            const checked = log?.subtask_state?.[s.key] === true;
            return (
              <li key={s.key}>
                <button
                  onClick={() => call({ action: 'subtask', subtask_key: s.key, subtask_completed: !checked })}
                  disabled={busy}
                  className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                    checked ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-700'
                  }`}>
                  <span className="text-base">{checked ? '✅' : '☐'}</span>
                  <span className={checked ? 'line-through' : ''}>{s.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
