'use client';
import { apiFetch } from '@vitera/lib';
import { useEffect, useState } from 'react';

interface DryRunAction {
  scenario_id: string;
  scenario_name: string;
  node_id: string;
  node_type: string;
  day: number;
  description: string;
  already_delivered: boolean;
  warning?: string;
}

interface DryRunResult {
  user_id: string;
  as_of: string;
  actions: DryRunAction[];
  notes: string[];
}

interface Props {
  scenarioId: string;
  oaId: string;
  onClose: () => void;
}

function localInputDate(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function DryRunModal({ scenarioId, oaId, onClose }: Props) {
  const [userId, setUserId] = useState('');
  const [asOf, setAsOf] = useState(localInputDate(new Date()));
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DryRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrolledUsers, setEnrolledUsers] = useState<Array<{ id: number; user_id: string }>>([]);

  useEffect(() => {
    // Populate the user picker from active enrollments for this OA — same
    // data the overview tab shows. Keeps the dry-run focused on users
    // actually subject to this scenario.
    apiFetch(`/api/scheduler/activity?oa_id=${oaId}`)
      .then(r => r.ok ? r.json() : { enrollments: [] })
      .then((d: { enrollments?: Array<{ id: number; user_id: string }> }) =>
        setEnrolledUsers(d.enrollments ?? []))
      .catch(() => {});
  }, [oaId]);

  const handleRun = async () => {
    if (!userId.trim()) {
      setError('請填入或選擇 user_id');
      return;
    }
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const asOfISO = new Date(asOf + 'T12:00:00').toISOString();
      const res = await apiFetch('/api/scheduler/dry-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId.trim(), scenario_id: scenarioId, as_of: asOfISO }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data as DryRunResult);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-start justify-center overflow-y-auto p-6"
      onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-5 flex flex-col gap-3"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold m-0">預覽排程（dry run）</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 text-xl leading-none">×</button>
        </div>
        <p className="text-xs text-slate-500 m-0">
          模擬某位使用者在指定日期，排程器會觸發哪些動作。不會實際推送訊息或改變資料庫狀態。
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs text-slate-500 shrink-0">user_id</label>
          <input className="hq-input text-sm flex-1 font-mono" placeholder="LINE user id"
            value={userId} onChange={e => setUserId(e.target.value)} list="dryrun-users" />
          <datalist id="dryrun-users">
            {enrolledUsers.map(u => <option key={u.id} value={u.user_id} />)}
          </datalist>
          <label className="text-xs text-slate-500 shrink-0">日期</label>
          <input type="date" className="hq-input text-sm" value={asOf}
            onChange={e => setAsOf(e.target.value)} />
          <button onClick={handleRun} disabled={running}
            className="hq-btn-primary text-sm disabled:opacity-50">
            {running ? '模擬中…' : '執行預覽'}
          </button>
        </div>

        {error && <div className="hq-alert hq-alert-error">{error}</div>}

        {result && (
          <div className="flex flex-col gap-2">
            {result.notes.length > 0 && (
              <div className="text-xs text-slate-500 flex flex-col gap-0.5">
                {result.notes.map((n, i) => <span key={i}>• {n}</span>)}
              </div>
            )}
            {result.actions.length === 0 ? (
              <div className="text-sm text-slate-500 py-4 text-center border border-dashed border-slate-300 rounded">
                今日不會觸發任何動作
              </div>
            ) : (
              <ul className="flex flex-col gap-1 max-h-96 overflow-y-auto">
                {result.actions.map((a, i) => (
                  <li key={i}
                    className={`border rounded px-3 py-2 text-sm flex flex-col gap-1 ${
                      a.warning
                        ? 'border-amber-300 bg-amber-50'
                        : a.already_delivered
                          ? 'border-slate-200 bg-slate-50 opacity-70'
                          : 'border-slate-200 bg-white'
                    }`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-500">Day {a.day}</span>
                      <span className="font-semibold">{a.description}</span>
                      {a.already_delivered && (
                        <span className="hq-badge hq-badge-gray text-[10px]">已交付，實際排程會跳過</span>
                      )}
                      {a.warning && <span className="text-amber-700 text-xs">⚠ {a.warning}</span>}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {a.scenario_name} · {a.node_type} · {a.node_id.slice(0, 16)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
