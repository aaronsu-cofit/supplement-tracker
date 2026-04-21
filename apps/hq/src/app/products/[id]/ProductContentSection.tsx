'use client';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useState } from 'react';
import type { ContentItem } from '../../../types';

interface Props {
  productId: string;
}

interface AddForm {
  key: string;
  title: string;
  body: string;
}

const EMPTY: AddForm = { key: '', title: '', body: '' };

export default function ProductContentSection({ productId }: Props) {
  const [items, setItems] = useState<ContentItem[]>([]);
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
    apiFetch(`/api/products/${productId}/content`)
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ items: ContentItem[] }>;
      })
      .then(({ items: data }) => setItems(data ?? []))
      .catch(err => {
        console.error('[product/content] error', err);
        setError('無法載入內容');
      })
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!addForm.key.trim()) {
      setAddError('請填 key');
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      const res = await apiFetch(`/api/products/${productId}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: addForm.key.trim(),
          type: 'text',
          title: addForm.title || null,
          body: addForm.body || null,
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

  const startEdit = (item: ContentItem) => {
    setEditingId(item.id);
    setEditForm({
      key: item.key,
      title: item.title ?? '',
      body: item.body ?? '',
      is_active: item.is_active,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    setSavingId(id);
    try {
      const res = await apiFetch(`/api/products/${productId}/content/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: editForm.key.trim(),
          title: editForm.title || null,
          body: editForm.body || null,
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

  const handleDelete = async (item: ContentItem) => {
    if (!window.confirm(`刪除「${item.key}」？`)) return;
    try {
      const res = await apiFetch(`/api/products/${productId}/content/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="hq-card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">內容庫（{items.length}）</h3>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="text-sm px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50"
        >
          {showAdd ? '取消' : '+ 新增'}
        </button>
      </div>
      <p className="text-xs text-slate-500">
        可複用的訊息文字/卡片。在劇本、push node 中可用 <code className="bg-slate-100 px-1 rounded">content:key</code> 引用。目前支援 text 類型。
      </p>

      {showAdd && (
        <div className="border border-slate-200 rounded-lg p-3 flex flex-col gap-2 bg-slate-50">
          <input className="hq-input" placeholder="key（英數底線點連字號，如 welcome_msg）"
            value={addForm.key} onChange={e => setAddForm(p => ({ ...p, key: e.target.value }))} />
          <input className="hq-input" placeholder="標題（選填）"
            value={addForm.title} onChange={e => setAddForm(p => ({ ...p, title: e.target.value }))} />
          <textarea className="hq-input min-h-[80px]" placeholder="內容文字"
            value={addForm.body} onChange={e => setAddForm(p => ({ ...p, body: e.target.value }))} />
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
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">尚無內容 — 點右上「+ 新增」建立第一則</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map(item => (
            <li key={item.id} className="border border-slate-200 rounded-lg p-3 flex flex-col gap-2">
              {editingId === item.id ? (
                <>
                  <input className="hq-input text-sm" value={editForm.key}
                    onChange={e => setEditForm(p => ({ ...p, key: e.target.value }))} />
                  <input className="hq-input text-sm" placeholder="標題" value={editForm.title}
                    onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} />
                  <textarea className="hq-input text-sm min-h-[80px]" value={editForm.body}
                    onChange={e => setEditForm(p => ({ ...p, body: e.target.value }))} />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editForm.is_active}
                      onChange={e => setEditForm(p => ({ ...p, is_active: e.target.checked }))} />
                    <span>啟用</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => saveEdit(item.id)} disabled={savingId === item.id}
                      className="hq-btn-primary text-sm">
                      {savingId === item.id ? '儲存中...' : '儲存'}
                    </button>
                    <button onClick={cancelEdit}
                      className="text-sm px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50">
                      取消
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <code className="bg-slate-100 px-1.5 rounded font-mono text-sm">{item.key}</code>
                      <span className="text-xs text-slate-400 uppercase">{item.type}</span>
                      {!item.is_active && <span className="hq-badge hq-badge-gray">停用</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(item)}
                        className="text-xs px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-50">
                        編輯
                      </button>
                      <button onClick={() => handleDelete(item)}
                        className="text-xs px-2 py-0.5 rounded border border-red-300 text-red-600 bg-white hover:bg-red-50">
                        刪除
                      </button>
                    </div>
                  </div>
                  {item.title && <p className="text-sm font-semibold text-slate-700">{item.title}</p>}
                  {item.body && <p className="text-sm text-slate-600 whitespace-pre-wrap">{item.body}</p>}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
