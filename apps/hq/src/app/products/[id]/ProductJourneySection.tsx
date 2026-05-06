'use client';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useState } from 'react';
import type {
  JourneyTemplate,
  JourneyPhase,
  JourneyTransition,
  JourneyTrigger,
  MissionTemplate,
} from '../../../types';
import HelpModal, { HelpButton } from './HelpModal';
import { MissionKeyPicker } from '../../../components/KeyPickers';

interface Props {
  productId: string;
}

interface FormShape {
  key: string;
  name: string;
  description: string;
  phases: JourneyPhase[];
  transitions: JourneyTransition[];
  is_active: boolean;
}

const EMPTY: FormShape = {
  key: '',
  name: '',
  description: '',
  phases: [
    { key: 'onboarding', name: '起始' },
    { key: 'active', name: '進行中' },
  ],
  transitions: [],
  is_active: true,
};

function toForm(j: JourneyTemplate): FormShape {
  return {
    key: j.key,
    name: j.name,
    description: j.description ?? '',
    phases: j.phases ?? [],
    transitions: j.transitions ?? [],
    is_active: j.is_active,
  };
}

function fromForm(f: FormShape) {
  return {
    key: f.key.trim(),
    name: f.name.trim(),
    description: f.description || null,
    phases: f.phases,
    transitions: f.transitions,
    is_active: f.is_active,
  };
}

const TRIGGER_TYPE_LABELS: Record<JourneyTrigger['type'], string> = {
  mission_completed: '完成任務',
  attribute_equals: '屬性等於',
  badge_earned: '取得徽章',
};

function triggerSummary(tr: JourneyTrigger): string {
  switch (tr.type) {
    case 'mission_completed': return `完成任務 ${tr.mission_key}`;
    case 'attribute_equals': return `屬性 ${tr.attribute_key}=${tr.value}`;
    case 'badge_earned': return `取得徽章 ${tr.badge_key}`;
  }
}

export default function ProductJourneySection({ productId }: Props) {
  const [journeys, setJourneys] = useState<JourneyTemplate[]>([]);
  const [missions, setMissions] = useState<MissionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<FormShape>(EMPTY);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormShape>(EMPTY);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiFetch(`/api/products/${productId}/journeys`).then(async r => {
        if (!r.ok) throw new Error(`journeys HTTP ${r.status}`);
        return r.json() as Promise<{ journeys: JourneyTemplate[] }>;
      }),
      apiFetch(`/api/products/${productId}/missions`).then(async r => {
        if (!r.ok) throw new Error(`missions HTTP ${r.status}`);
        return r.json() as Promise<{ missions: MissionTemplate[] }>;
      }),
    ])
      .then(([{ journeys: d }, { missions: m }]) => {
        setJourneys(d ?? []);
        setMissions(m ?? []);
      })
      .catch(err => {
        console.error('[product/journeys] error', err);
        setError('無法載入 Journey 或任務');
      })
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!addForm.key.trim() || !addForm.name.trim()) {
      setAddError('請填 key 與 name');
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      const res = await apiFetch(`/api/products/${productId}/journeys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fromForm(addForm)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setAddForm(EMPTY);
      setShowAdd(false);
      load();
    } catch (err) {
      setAddError((err as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const saveEdit = async (id: string) => {
    setSavingId(id);
    try {
      const res = await apiFetch(`/api/products/${productId}/journeys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fromForm(editForm)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setEditingId(null);
      load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (j: JourneyTemplate) => {
    if (!window.confirm(`刪除 Journey「${j.key}」？`)) return;
    try {
      const res = await apiFetch(`/api/products/${productId}/journeys/${j.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const renderPhases = (form: FormShape, setForm: (f: FormShape) => void) => {
    const updatePhase = (idx: number, patch: Partial<JourneyPhase>) => {
      const arr = [...form.phases];
      arr[idx] = { ...arr[idx], ...patch };
      setForm({ ...form, phases: arr });
    };
    const removePhase = (idx: number) => {
      setForm({ ...form, phases: form.phases.filter((_, i) => i !== idx) });
    };
    const addPhase = () => {
      setForm({ ...form, phases: [...form.phases, { key: '', name: '' }] });
    };

    return (
      <div className="flex flex-col gap-2 border border-slate-200 rounded p-2 bg-white">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Phases（依序）</label>
        {form.phases.map((p, i) => (
          <div key={i} className="flex flex-col gap-2 border border-slate-200 rounded p-2 bg-slate-50">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-slate-400 w-6">{i + 1}.</span>
              <input className="hq-input text-sm flex-1 min-w-[100px]" placeholder="key"
                value={p.key} onChange={e => updatePhase(i, { key: e.target.value })} />
              <input className="hq-input text-sm flex-1 min-w-[120px]" placeholder="name"
                value={p.name} onChange={e => updatePhase(i, { name: e.target.value })} />
              <input className="hq-input text-sm w-16" placeholder="icon"
                value={p.icon ?? ''} onChange={e => updatePhase(i, { icon: e.target.value || undefined })} />
              <button onClick={() => removePhase(i)}
                className="text-xs text-red-600 hover:underline">移除</button>
            </div>
            <PhaseScheduleEditor phase={p}
              onChange={next => updatePhase(i, { schedule: next })} />
          </div>
        ))}
        <div>
          <button onClick={addPhase}
            className="text-xs px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50">
            + 新增 phase
          </button>
        </div>
      </div>
    );
  };

  const renderTransitions = (form: FormShape, setForm: (f: FormShape) => void) => {
    const phaseKeys = form.phases.map(p => p.key).filter(Boolean);
    const updateTransition = (idx: number, next: JourneyTransition) => {
      const arr = [...form.transitions];
      arr[idx] = next;
      setForm({ ...form, transitions: arr });
    };
    const removeTransition = (idx: number) => {
      setForm({ ...form, transitions: form.transitions.filter((_, i) => i !== idx) });
    };
    const addTransition = () => {
      const initial: JourneyTransition = {
        to_phase: phaseKeys[0] ?? '',
        trigger: { type: 'mission_completed', mission_key: '' },
      };
      setForm({ ...form, transitions: [...form.transitions, initial] });
    };

    return (
      <div className="flex flex-col gap-2 border border-slate-200 rounded p-2 bg-white">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Transitions（依序比對，第一個命中者勝）</label>
        {form.transitions.length === 0 && (
          <p className="text-xs text-slate-400">尚無 transition — 無法推進使用者，請至少新增一條</p>
        )}
        {form.transitions.map((t, i) => (
          <div key={i} className="flex flex-col gap-1.5 border border-slate-100 rounded p-2 bg-slate-50/60">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500">當</span>
              <select className="hq-input text-sm"
                value={t.trigger.type}
                onChange={e => {
                  const type = e.target.value as JourneyTrigger['type'];
                  const newTrigger: JourneyTrigger =
                    type === 'mission_completed' ? { type, mission_key: '' } :
                    type === 'badge_earned' ? { type, badge_key: '' } :
                    { type, attribute_key: '', value: '' };
                  updateTransition(i, { ...t, trigger: newTrigger });
                }}>
                {Object.entries(TRIGGER_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
              {t.trigger.type === 'mission_completed' && (
                <MissionKeyPicker className="flex-1 min-w-[160px]"
                  value={t.trigger.mission_key} items={missions}
                  placeholder="mission_key"
                  onChange={v => updateTransition(i, { ...t, trigger: { ...t.trigger, mission_key: v } as JourneyTrigger })} />
              )}
              {t.trigger.type === 'badge_earned' && (
                <input className="hq-input text-sm flex-1 min-w-[120px]" placeholder="badge_key"
                  value={t.trigger.badge_key}
                  onChange={e => updateTransition(i, { ...t, trigger: { ...t.trigger, badge_key: e.target.value } as JourneyTrigger })} />
              )}
              {t.trigger.type === 'attribute_equals' && (
                <>
                  <input className="hq-input text-sm flex-1 min-w-[100px]" placeholder="attribute_key"
                    value={t.trigger.attribute_key}
                    onChange={e => updateTransition(i, { ...t, trigger: { ...t.trigger, attribute_key: e.target.value } as JourneyTrigger })} />
                  <span className="text-slate-400">=</span>
                  <input className="hq-input text-sm flex-1 min-w-[80px]" placeholder="value"
                    value={t.trigger.value}
                    onChange={e => updateTransition(i, { ...t, trigger: { ...t.trigger, value: e.target.value } as JourneyTrigger })} />
                </>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500">從</span>
              <select className="hq-input text-sm"
                value={t.from_phase ?? '__ANY__'}
                onChange={e => {
                  const v = e.target.value;
                  updateTransition(i, { ...t, from_phase: v === '__ANY__' ? undefined : v });
                }}>
                <option value="__ANY__">（任何 phase，含新使用者）</option>
                {phaseKeys.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <span className="text-xs text-slate-500">→</span>
              <select className="hq-input text-sm"
                value={t.to_phase}
                onChange={e => updateTransition(i, { ...t, to_phase: e.target.value })}>
                {phaseKeys.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              <button onClick={() => removeTransition(i)}
                className="text-xs text-red-600 hover:underline ml-auto">移除</button>
            </div>
          </div>
        ))}
        <div>
          <button onClick={addTransition}
            disabled={phaseKeys.length === 0}
            className="text-xs px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50">
            + 新增 transition
          </button>
        </div>
      </div>
    );
  };

  const renderForm = (form: FormShape, setForm: (f: FormShape) => void) => (
    <>
      <div className="grid grid-cols-2 gap-2">
        <input className="hq-input" placeholder="key（英數底線連字號）"
          value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} />
        <input className="hq-input" placeholder="Journey 名稱"
          value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      </div>
      <input className="hq-input" placeholder="說明（選填）"
        value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
      {renderPhases(form, setForm)}
      {renderTransitions(form, setForm)}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.is_active}
          onChange={e => setForm({ ...form, is_active: e.target.checked })} />
        <span>啟用</span>
      </label>
    </>
  );

  return (
    <div className="hq-card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">Journey 狀態機（{journeys.length}）</h3>
          <HelpButton onClick={() => setHelpOpen(true)} />
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="text-sm px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50"
        >
          {showAdd ? '取消' : '+ 新增 Journey'}
        </button>
      </div>
      {helpOpen && (
        <HelpModal title="Journey 狀態機使用說明" onClose={() => setHelpOpen(false)}>
          <div>
            <strong>Key 命名</strong>
            <p className="text-xs text-slate-500 mt-1">
              Journey key（如 <code className="bg-slate-100 px-1 rounded">program_21d</code>、<code className="bg-slate-100 px-1 rounded">onboarding_flow</code>）和 phase key（如 <code className="bg-slate-100 px-1 rounded">onboarding</code>、<code className="bg-slate-100 px-1 rounded">active</code>）都建議短而語意化。
            </p>
          </div>
          <div>
            <strong>Phases</strong>
            <p className="text-xs text-slate-500 mt-1">
              依序排列（像 <code className="bg-slate-100 px-1 rounded">onboarding → active → completed</code>），每個有唯一 key、顯示 name、可選 icon。建議 3-5 個 phase，太多會難管理。
            </p>
          </div>
          <div>
            <strong>Transitions</strong>
            <p className="text-xs text-slate-500 mt-1">
              依規則宣告順序比對，第一個命中者勝。三種觸發器：
            </p>
            <ul className="list-disc pl-5 text-xs text-slate-600 mt-1 flex flex-col gap-0.5">
              <li><code className="bg-slate-100 px-1 rounded">mission_completed</code>：指定 mission_key 被完成</li>
              <li><code className="bg-slate-100 px-1 rounded">attribute_equals</code>：指定 attribute_key 被設到特定 value</li>
              <li><code className="bg-slate-100 px-1 rounded">badge_earned</code>：指定 badge_key 被頒發</li>
            </ul>
          </div>
          <div>
            <strong>from_phase 特殊值「任何 phase」</strong>
            <p className="text-xs text-slate-500 mt-1">
              <code className="bg-slate-100 px-1 rounded">from_phase</code> 下拉選「任何 phase」等同未指定，代表「不管現在在哪個 phase（含新使用者沒有 phase）都適用」—— 這是<strong>新使用者落入第一個 phase 的方式</strong>。
            </p>
          </div>
          <div>
            <strong>Phase 不會回頭</strong>
            <p className="text-xs text-slate-500 mt-1">
              已在目標 phase 再次觸發不會重新「進入」。如需循環狀態機，用第二個 journey 實作。
            </p>
          </div>
          <div>
            <strong>範例：21 天計畫</strong>
            <p className="text-xs text-slate-500 mt-1">
              Phases：<code className="bg-slate-100 px-1 rounded">onboarding → active → completed</code>。Transitions：
            </p>
            <ul className="list-disc pl-5 text-xs text-slate-600 mt-1 flex flex-col gap-0.5">
              <li>attribute_equals <code className="bg-slate-100 px-1 rounded">onboarded=yes</code>，from 任何 → <code className="bg-slate-100 px-1 rounded">onboarding</code></li>
              <li>mission_completed <code className="bg-slate-100 px-1 rounded">day1_task</code>，from <code className="bg-slate-100 px-1 rounded">onboarding</code> → <code className="bg-slate-100 px-1 rounded">active</code></li>
              <li>badge_earned <code className="bg-slate-100 px-1 rounded">graduation</code>，from <code className="bg-slate-100 px-1 rounded">active</code> → <code className="bg-slate-100 px-1 rounded">completed</code></li>
            </ul>
          </div>
          <div>
            <strong>觀察現況</strong>
            <p className="text-xs text-slate-500 mt-1">
              使用者當前 phase 在 <code className="bg-slate-100 px-1 rounded">/admins/[userId]</code> 的「Journey 現況」區塊；轉換記錄在 engagement events <code className="bg-slate-100 px-1 rounded">journey_transition</code>。
            </p>
          </div>
        </HelpModal>
      )}
      <p className="text-xs text-slate-500">
        一個 Journey 定義一串命名的 phase 和轉移規則。使用者在完成任務、設定屬性、取得徽章時自動轉換 phase。
      </p>

      {showAdd && (
        <div className="border border-slate-200 rounded-lg p-3 flex flex-col gap-2 bg-slate-50">
          {renderForm(addForm, setAddForm)}
          {addError && <p className="text-sm text-red-600">{addError}</p>}
          <div>
            <button onClick={handleAdd} disabled={adding} className="hq-btn-primary text-sm">
              {adding ? '新增中...' : '確認新增'}
            </button>
          </div>
        </div>
      )}

      {error && <div className="hq-alert hq-alert-error">{error}</div>}

      {loading ? (
        <p className="text-sm text-slate-500">載入中...</p>
      ) : journeys.length === 0 ? (
        <p className="text-sm text-slate-500">尚無 Journey</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {journeys.map(j => (
            <li key={j.id} className="border border-slate-200 rounded-lg p-3 flex flex-col gap-2">
              {editingId === j.id ? (
                <>
                  {renderForm(editForm, setEditForm)}
                  <div className="flex items-center gap-2">
                    <button onClick={() => saveEdit(j.id)} disabled={savingId === j.id}
                      className="hq-btn-primary text-sm">
                      {savingId === j.id ? '儲存中...' : '儲存'}
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="text-sm px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50">
                      取消
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="bg-slate-100 px-1.5 rounded font-mono text-sm">{j.key}</code>
                      <span className="font-semibold">{j.name}</span>
                      {!j.is_active && <span className="hq-badge hq-badge-gray">停用</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditingId(j.id); setEditForm(toForm(j)); }}
                        className="text-xs px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-50">
                        編輯
                      </button>
                      <button onClick={() => handleDelete(j)}
                        className="text-xs px-2 py-0.5 rounded border border-red-300 text-red-600 bg-white hover:bg-red-50">
                        刪除
                      </button>
                    </div>
                  </div>
                  {j.description && <p className="text-sm text-slate-600">{j.description}</p>}
                  <div className="flex items-center gap-1 flex-wrap text-xs">
                    {j.phases.map((p, i) => (
                      <span key={p.key} className="flex items-center gap-1">
                        {i > 0 && <span className="text-slate-300">→</span>}
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded">
                          {p.icon && <span className="mr-1">{p.icon}</span>}
                          {p.name}
                        </span>
                      </span>
                    ))}
                  </div>
                  {j.transitions.length > 0 && (
                    <ul className="text-xs text-slate-600 flex flex-col gap-0.5 pl-3">
                      {j.transitions.map((t, i) => (
                        <li key={i}>
                          {i + 1}. {triggerSummary(t.trigger)} · {t.from_phase ?? '任何'} → <strong>{t.to_phase}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Per-phase daily schedule editor. Each row maps a day_in_phase number
 *  to a HH:MM time and an optional content_key override. day=1 is
 *  intentionally excluded — that's handled by the phase-transition
 *  intent reply, not by the daily cron. */
function PhaseScheduleEditor({
  phase,
  onChange,
}: {
  phase: JourneyPhase;
  onChange: (next: JourneyPhase['schedule']) => void;
}) {
  const schedule = phase.schedule ?? [];
  const update = (idx: number, patch: Partial<NonNullable<JourneyPhase['schedule']>[number]>) => {
    const next = schedule.map((e, i) => i === idx ? { ...e, ...patch } : e);
    onChange(next);
  };
  const remove = (idx: number) => onChange(schedule.filter((_, i) => i !== idx));
  const add = () => {
    // Default new entry to next-day after the last + 09:00
    const lastDay = Math.max(1, ...schedule.map(s => s.day));
    onChange([...schedule, { day: lastDay + 1, time: '09:00' }]);
  };
  return (
    <div className="flex flex-col gap-1 mt-1 ml-8">
      <div className="text-[11px] text-slate-500">
        每日推送排程（day_1 由 phase 切換時的 intent 回覆推，這裡只設 day_2+）
      </div>
      {schedule.length === 0 ? (
        <p className="text-xs text-slate-400">尚未設定 — phase 內每天無自動推送</p>
      ) : (
        schedule.map((e, i) => (
          <div key={i} className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-500 w-8">Day</span>
            <input type="number" min={2} className="hq-input text-xs w-14"
              value={e.day} onChange={ev => update(i, { day: Math.max(2, parseInt(ev.target.value, 10) || 2) })} />
            <span className="text-[11px] text-slate-500">@</span>
            <input type="time" className="hq-input text-xs w-24"
              value={e.time} onChange={ev => update(i, { time: ev.target.value })} />
            <input className="hq-input text-xs flex-1 min-w-[140px]"
              placeholder={`content_key（預設 ${phase.key || '<phase>'}_day_${e.day}）`}
              value={e.content_key ?? ''}
              onChange={ev => update(i, { content_key: ev.target.value || undefined })} />
            <button onClick={() => remove(i)}
              className="text-[11px] text-red-600 hover:underline shrink-0">移除</button>
          </div>
        ))
      )}
      <div>
        <button onClick={add}
          className="text-[11px] px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-50">
          + 新增排程日
        </button>
      </div>
    </div>
  );
}
