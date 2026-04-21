'use client';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useState } from 'react';
import type { MissionTemplate } from '../../../types';

interface Props {
  productId: string;
}

interface AddForm {
  key: string;
  name: string;
  description: string;
}

const EMPTY: AddForm = { key: '', name: '', description: '' };

export default function ProductMissionSection({ productId }: Props) {
  const [missions, setMissions] = useState<MissionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(EMPTY);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AddForm & { is_active: boolean }>({ ...EMPTY, is_active: true });
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
        body: JSON.stringify({
          key: addForm.key.trim(),
          name: addForm.name.trim(),
          description: addForm.description || null,
        }),
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

  const startEdit = (m: MissionTemplate) => {
    setEditingId(m.id);
    setEditForm({
      key: m.key,
      name: m.name,
      description: m.description ?? '',
      is_active: m.is_active,
    });
  };

  const saveEdit = async (id: string) => {
    setSavingId(id);
    try {
      const res = await apiFetch(`/api/products/${productId}/missions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: editForm.key.trim(),
          name: editForm.name.trim(),
          description: editForm.description || null,
          is_active: editForm.is_active,
        }),
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
        任務藍圖：定義後可由意圖規則的 <code className="bg-slate-100 px-1 rounded">assign_mission</code> / <code className="bg-slate-100 px-1 rounded">complete_mission</code> 動作引用。用戶會有獨立的任務實例（pending → completed）。
      </p>

      {showAdd && (
        <div className="border border-slate-200 rounded-lg p-3 flex flex-col gap-2 bg-slate-50">
          <input className="hq-input" placeholder="key（英數底線連字號，如 drink_water_day1）"
            value={addForm.key} onChange={e => setAddForm(p => ({ ...p, key: e.target.value }))} />
          <input className="hq-input" placeholder="任務名稱（必填）"
            value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} />
          <textarea className="hq-input min-h-[60px]" placeholder="說明（選填）"
            value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} />
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
                  <input className="hq-input text-sm" value={editForm.key}
                    onChange={e => setEditForm(p => ({ ...p, key: e.target.value }))} />
                  <input className="hq-input text-sm" value={editForm.name}
                    onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                  <textarea className="hq-input text-sm min-h-[60px]" value={editForm.description}
                    onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editForm.is_active}
                      onChange={e => setEditForm(p => ({ ...p, is_active: e.target.checked }))} />
                    <span>啟用</span>
                  </label>
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
                      {!m.is_active && <span className="hq-badge hq-badge-gray">停用</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(m)}
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
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
