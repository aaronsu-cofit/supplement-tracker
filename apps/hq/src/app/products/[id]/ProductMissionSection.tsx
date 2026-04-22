'use client';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useState } from 'react';
import type { MissionTemplate, MissionCompleteAction } from '../../../types';
import HelpModal, { HelpButton } from './HelpModal';

interface Props {
  productId: string;
}

interface FormShape {
  key: string;
  name: string;
  description: string;
  progress_target: number;
  auto_complete_enabled: boolean;
  auto_complete_attribute_key: string;
  auto_complete_match_value: string; // empty means "any value"
  on_complete_actions: MissionCompleteAction[];
  is_active: boolean;
}

const EMPTY: FormShape = {
  key: '',
  name: '',
  description: '',
  progress_target: 1,
  auto_complete_enabled: false,
  auto_complete_attribute_key: '',
  auto_complete_match_value: '',
  on_complete_actions: [],
  is_active: true,
};

function formToPayload(f: FormShape) {
  return {
    key: f.key.trim(),
    name: f.name.trim(),
    description: f.description || null,
    progress_target: f.progress_target,
    auto_complete_on_attribute: f.auto_complete_enabled
      ? {
          attribute_key: f.auto_complete_attribute_key.trim(),
          ...(f.auto_complete_match_value.trim() && { match_value: f.auto_complete_match_value.trim() }),
        }
      : null,
    on_complete_actions: f.on_complete_actions,
    is_active: f.is_active,
  };
}

function missionToForm(m: MissionTemplate): FormShape {
  return {
    key: m.key,
    name: m.name,
    description: m.description ?? '',
    progress_target: m.progress_target,
    auto_complete_enabled: !!m.auto_complete_on_attribute,
    auto_complete_attribute_key: m.auto_complete_on_attribute?.attribute_key ?? '',
    auto_complete_match_value: m.auto_complete_on_attribute?.match_value ?? '',
    on_complete_actions: m.on_complete_actions ?? [],
    is_active: m.is_active,
  };
}

export default function ProductMissionSection({ productId }: Props) {
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
    apiFetch(`/api/products/${productId}/missions`)
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ missions: MissionTemplate[] }>;
      })
      .then(({ missions: data }) => setMissions(data ?? []))
      .catch(err => {
        console.error('[product/missions] error', err);
        setError('無法載入任務');
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
      const res = await apiFetch(`/api/products/${productId}/missions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formToPayload(addForm)),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
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
      const res = await apiFetch(`/api/products/${productId}/missions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formToPayload(editForm)),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setEditingId(null);
      load();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (m: MissionTemplate) => {
    if (!window.confirm(`刪除任務「${m.key}」？`)) return;
    try {
      const res = await apiFetch(`/api/products/${productId}/missions/${m.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const renderActions = (form: FormShape, setForm: (f: FormShape) => void) => {
    const updateAction = (idx: number, next: MissionCompleteAction) => {
      const arr = [...form.on_complete_actions];
      arr[idx] = next;
      setForm({ ...form, on_complete_actions: arr });
    };
    const removeAction = (idx: number) => {
      const arr = form.on_complete_actions.filter((_, i) => i !== idx);
      setForm({ ...form, on_complete_actions: arr });
    };
    const addAction = (type: MissionCompleteAction['type']) => {
      let next: MissionCompleteAction;
      if (type === 'set_attribute') next = { type: 'set_attribute', key: '', value: '' };
      else if (type === 'assign_mission') next = { type: 'assign_mission', mission_key: '' };
      else next = { type: 'increment_streak', streak_key: '' };
      setForm({ ...form, on_complete_actions: [...form.on_complete_actions, next] });
    };

    return (
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          完成時要做的事（依序執行）
        </label>
        {form.on_complete_actions.length === 0 && (
          <p className="text-xs text-slate-400">（無，完成時僅更新狀態）</p>
        )}
        {form.on_complete_actions.map((a, idx) => (
          <div key={idx} className="flex items-center gap-2 flex-wrap bg-white border border-slate-200 rounded px-2 py-1">
            <span className="text-xs font-mono text-slate-500">{idx + 1}.</span>
            {a.type === 'set_attribute' && (
              <>
                <span className="text-xs text-slate-600">設定屬性</span>
                <input className="hq-input text-sm flex-1 min-w-[120px]" placeholder="key"
                  value={a.key}
                  onChange={e => updateAction(idx, { ...a, key: e.target.value })} />
                <span className="text-slate-400">=</span>
                <input className="hq-input text-sm flex-1 min-w-[120px]" placeholder="value"
                  value={a.value}
                  onChange={e => updateAction(idx, { ...a, value: e.target.value })} />
              </>
            )}
            {a.type === 'assign_mission' && (
              <>
                <span className="text-xs text-slate-600">指派任務（鏈）</span>
                <input className="hq-input text-sm flex-1 min-w-[120px]" placeholder="mission_key"
                  value={a.mission_key}
                  onChange={e => updateAction(idx, { ...a, mission_key: e.target.value })} />
              </>
            )}
            {a.type === 'increment_streak' && (
              <>
                <span className="text-xs text-slate-600">連續天數 +1</span>
                <input className="hq-input text-sm flex-1 min-w-[120px]" placeholder="streak_key"
                  value={a.streak_key}
                  onChange={e => updateAction(idx, { ...a, streak_key: e.target.value })} />
              </>
            )}
            <button onClick={() => removeAction(idx)}
              className="text-xs text-red-600 hover:underline">移除</button>
          </div>
        ))}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => addAction('set_attribute')}
            className="text-xs px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50">
            + 設定屬性
          </button>
          <button onClick={() => addAction('assign_mission')}
            className="text-xs px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50">
            + 指派下一個任務
          </button>
          <button onClick={() => addAction('increment_streak')}
            className="text-xs px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50">
            + 連續天數 +1
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
        <input className="hq-input" placeholder="任務名稱（必填）"
          value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      </div>
      <textarea className="hq-input min-h-[60px]" placeholder="說明（選填）"
        value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-600">多步進度：</span>
        <input type="number" min={1} className="hq-input w-20" value={form.progress_target}
          onChange={e => setForm({ ...form, progress_target: Math.max(1, Number(e.target.value) || 1) })} />
        <span className="text-xs text-slate-500">（=1 就是一次性；&gt;1 需呼叫 increment_mission_progress 到達此目標才完成）</span>
      </div>
      <div className="flex flex-col gap-2 border border-slate-200 rounded p-2 bg-white">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.auto_complete_enabled}
            onChange={e => setForm({ ...form, auto_complete_enabled: e.target.checked })} />
          <span>屬性自動完成（設定某使用者屬性時自動完成此任務）</span>
        </label>
        {form.auto_complete_enabled && (
          <div className="grid grid-cols-2 gap-2">
            <input className="hq-input text-sm" placeholder="attribute_key（如 primary_concern）"
              value={form.auto_complete_attribute_key}
              onChange={e => setForm({ ...form, auto_complete_attribute_key: e.target.value })} />
            <input className="hq-input text-sm" placeholder="match_value（留空=任何值）"
              value={form.auto_complete_match_value}
              onChange={e => setForm({ ...form, auto_complete_match_value: e.target.value })} />
          </div>
        )}
      </div>
      {renderActions(form, setForm)}
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
          <h3 className="font-semibold text-lg">任務（{missions.length}）</h3>
          <HelpButton onClick={() => setHelpOpen(true)} />
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="text-sm px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50"
        >
          {showAdd ? '取消' : '+ 新增任務'}
        </button>
      </div>
      {helpOpen && (
        <HelpModal title="任務使用說明" onClose={() => setHelpOpen(false)}>
          <div>
            <strong>Key 命名</strong>
            <p className="text-xs text-slate-500 mt-1">
              建議用 phase + 動作：<code className="bg-slate-100 px-1 rounded">day1_task</code>、<code className="bg-slate-100 px-1 rounded">answer_survey</code>、<code className="bg-slate-100 px-1 rounded">drink_water_day1</code>。
            </p>
          </div>
          <div>
            <strong>被誰引用</strong>
            <ul className="list-disc pl-5 text-xs text-slate-600 mt-1 flex flex-col gap-0.5">
              <li>意圖動作 <code className="bg-slate-100 px-1 rounded">assign_mission</code> / <code className="bg-slate-100 px-1 rounded">complete_mission</code> / <code className="bg-slate-100 px-1 rounded">increment_mission_progress</code></li>
              <li>劇本 <code className="bg-slate-100 px-1 rounded">mission-assign-node</code></li>
              <li>其他任務的 <code className="bg-slate-100 px-1 rounded">on_complete_actions</code> 的 <code className="bg-slate-100 px-1 rounded">assign_mission</code>（鏈結）</li>
              <li>徽章 criteria <code className="bg-slate-100 px-1 rounded">mission_completed</code></li>
              <li>Journey trigger <code className="bg-slate-100 px-1 rounded">mission_completed</code></li>
            </ul>
          </div>
          <div>
            <strong>進度設定</strong>
            <p className="text-xs text-slate-500 mt-1">
              <code className="bg-slate-100 px-1 rounded">progress_target=1</code>：一次性任務。<code className="bg-slate-100 px-1 rounded">&gt;1</code>：多步任務，要呼叫 <code className="bg-slate-100 px-1 rounded">increment_mission_progress</code> 累到 target 才完成。例「喝 3 杯水」target=3。
            </p>
          </div>
          <div>
            <strong>屬性自動完成</strong>
            <p className="text-xs text-slate-500 mt-1">
              設 <code className="bg-slate-100 px-1 rounded">auto_complete_on_attribute.attribute_key</code>（可選 <code className="bg-slate-100 px-1 rounded">match_value</code>），該屬性一被設就自動完成。<strong>適合問卷型</strong>（使用者回覆意圖 → 設屬性 → 任務自動完成）。
            </p>
          </div>
          <div>
            <strong>完成時動作陣列</strong>
            <p className="text-xs text-slate-500 mt-1">
              任務完成時依序跑：
            </p>
            <ul className="list-disc pl-5 text-xs text-slate-600 mt-1 flex flex-col gap-0.5">
              <li><code className="bg-slate-100 px-1 rounded">set_attribute</code>（key/value）</li>
              <li><code className="bg-slate-100 px-1 rounded">assign_mission</code>（mission_key；多日計畫鏈結）</li>
              <li><code className="bg-slate-100 px-1 rounded">increment_streak</code>（streak_key）</li>
            </ul>
            <p className="text-xs text-slate-500 mt-1">
              鏈結深度上限 5，防無限迴圈。
            </p>
          </div>
          <div>
            <strong>範例：3 天任務鏈</strong>
            <p className="text-xs text-slate-500 mt-1">
              建 <code className="bg-slate-100 px-1 rounded">day1</code> 的 on_complete = <code className="bg-slate-100 px-1 rounded">[assign_mission day2, increment_streak daily]</code>；<code className="bg-slate-100 px-1 rounded">day2</code> on_complete 指向 <code className="bg-slate-100 px-1 rounded">day3</code>，以此類推。
            </p>
          </div>
        </HelpModal>
      )}
      <p className="text-xs text-slate-500">
        任務藍圖：可透過意圖規則（<code className="bg-slate-100 px-1 rounded">assign/complete/increment_mission_progress</code>）、屬性自動完成、或其他任務的 on_complete 鏈結觸發。
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
      ) : missions.length === 0 ? (
        <p className="text-sm text-slate-500">尚無任務 — 點右上「+ 新增任務」建立第一個</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {missions.map(m => (
            <li key={m.id} className="border border-slate-200 rounded-lg p-3 flex flex-col gap-2">
              {editingId === m.id ? (
                <>
                  {renderForm(editForm, setEditForm)}
                  <div className="flex items-center gap-2">
                    <button onClick={() => saveEdit(m.id)} disabled={savingId === m.id}
                      className="hq-btn-primary text-sm">
                      {savingId === m.id ? '儲存中...' : '儲存'}
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
                    <div className="flex items-center gap-2">
                      <code className="bg-slate-100 px-1.5 rounded font-mono text-sm">{m.key}</code>
                      <span className="font-semibold">{m.name}</span>
                      {m.progress_target > 1 && (
                        <span className="hq-badge hq-badge-gray">多步 ×{m.progress_target}</span>
                      )}
                      {!m.is_active && <span className="hq-badge hq-badge-gray">停用</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditingId(m.id); setEditForm(missionToForm(m)); }}
                        className="text-xs px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-50">
                        編輯
                      </button>
                      <button onClick={() => handleDelete(m)}
                        className="text-xs px-2 py-0.5 rounded border border-red-300 text-red-600 bg-white hover:bg-red-50">
                        刪除
                      </button>
                    </div>
                  </div>
                  {m.description && <p className="text-sm text-slate-600 whitespace-pre-wrap">{m.description}</p>}
                  {m.auto_complete_on_attribute && (
                    <p className="text-xs text-slate-500">
                      自動完成：屬性 <code className="bg-slate-100 px-1 rounded">{m.auto_complete_on_attribute.attribute_key}</code>
                      {m.auto_complete_on_attribute.match_value && <> = <code className="bg-slate-100 px-1 rounded">{m.auto_complete_on_attribute.match_value}</code></>}
                    </p>
                  )}
                  {m.on_complete_actions.length > 0 && (
                    <div className="text-xs text-slate-500 flex flex-col gap-0.5">
                      <span className="text-slate-400">完成時：</span>
                      {m.on_complete_actions.map((a, i) => (
                        <span key={i} className="pl-3">
                          {i + 1}.{' '}
                          {a.type === 'set_attribute' && (
                            <>設定 <code className="bg-slate-100 px-1 rounded">{a.key}={a.value}</code></>
                          )}
                          {a.type === 'assign_mission' && (
                            <>指派 <code className="bg-slate-100 px-1 rounded">{a.mission_key}</code></>
                          )}
                          {a.type === 'increment_streak' && (
                            <>連續 <code className="bg-slate-100 px-1 rounded">{a.streak_key}</code> +1</>
                          )}
                        </span>
                      ))}
                    </div>
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
