'use client';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useState } from 'react';
import type { MissionTemplate, MissionCompleteAction } from '../../../types';

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
      const next: MissionCompleteAction =
        type === 'set_attribute'
          ? { type: 'set_attribute', key: '', value: '' }
          : { type: 'assign_mission', mission_key: '' };
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
            {a.type === 'set_attribute' ? (
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
            ) : (
              <>
                <span className="text-xs text-slate-600">指派任務（鏈）</span>
                <input className="hq-input text-sm flex-1 min-w-[120px]" placeholder="mission_key"
                  value={a.mission_key}
                  onChange={e => updateAction(idx, { ...a, mission_key: e.target.value })} />
              </>
            )}
            <button onClick={() => removeAction(idx)}
              className="text-xs text-red-600 hover:underline">移除</button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <button onClick={() => addAction('set_attribute')}
            className="text-xs px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50">
            + 設定屬性
          </button>
          <button onClick={() => addAction('assign_mission')}
            className="text-xs px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50">
            + 指派下一個任務
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
        <h3 className="font-semibold text-lg">任務（{missions.length}）</h3>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="text-sm px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50"
        >
          {showAdd ? '取消' : '+ 新增任務'}
        </button>
      </div>
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
                          {a.type === 'set_attribute' ? (
                            <>設定 <code className="bg-slate-100 px-1 rounded">{a.key}={a.value}</code></>
                          ) : (
                            <>指派 <code className="bg-slate-100 px-1 rounded">{a.mission_key}</code></>
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
