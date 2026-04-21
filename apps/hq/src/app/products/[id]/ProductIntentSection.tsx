'use client';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useState } from 'react';
import type { IntentRule, IntentActionType, IntentMatchType } from '../../../types';

interface Props {
  productId: string;
}

interface FormShape {
  name: string;
  priority: number;
  match_type: IntentMatchType;
  patterns: string; // comma-separated in form
  action_type: IntentActionType;
  // reply_content
  content_key: string;
  // set_attribute
  attr_key: string;
  attr_value: string;
  attr_reply_content_key: string;
  is_active: boolean;
}

const EMPTY: FormShape = {
  name: '',
  priority: 100,
  match_type: 'keyword',
  patterns: '',
  action_type: 'reply_content',
  content_key: '',
  attr_key: '',
  attr_value: '',
  attr_reply_content_key: '',
  is_active: true,
};

function formToPayload(f: FormShape): Record<string, unknown> {
  const patterns = f.patterns.split(',').map(p => p.trim()).filter(Boolean);
  const action_config: Record<string, unknown> =
    f.action_type === 'reply_content'
      ? { content_key: f.content_key.trim() }
      : {
          key: f.attr_key.trim(),
          value: f.attr_value,
          ...(f.attr_reply_content_key.trim() && { reply_content_key: f.attr_reply_content_key.trim() }),
        };
  return {
    name: f.name.trim(),
    priority: f.priority,
    match_type: f.match_type,
    patterns,
    action_type: f.action_type,
    action_config,
    is_active: f.is_active,
  };
}

function ruleToForm(r: IntentRule): FormShape {
  const cfg = r.action_config || {};
  return {
    name: r.name,
    priority: r.priority,
    match_type: r.match_type,
    patterns: (r.patterns || []).join(', '),
    action_type: r.action_type,
    content_key: cfg.content_key ?? '',
    attr_key: cfg.key ?? '',
    attr_value: cfg.value ?? '',
    attr_reply_content_key: cfg.reply_content_key ?? '',
    is_active: r.is_active,
  };
}

export default function ProductIntentSection({ productId }: Props) {
  const [rules, setRules] = useState<IntentRule[]>([]);
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
    apiFetch(`/api/products/${productId}/intent`)
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ rules: IntentRule[] }>;
      })
      .then(({ rules: data }) => setRules(data ?? []))
      .catch(err => {
        console.error('[product/intent] error', err);
        setError('無法載入意圖規則');
      })
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    setAdding(true);
    setAddError(null);
    try {
      const res = await apiFetch(`/api/products/${productId}/intent`, {
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

  const startEdit = (r: IntentRule) => {
    setEditingId(r.id);
    setEditForm(ruleToForm(r));
  };

  const saveEdit = async (id: string) => {
    setSavingId(id);
    try {
      const res = await apiFetch(`/api/products/${productId}/intent/${id}`, {
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

  const handleDelete = async (r: IntentRule) => {
    if (!window.confirm(`刪除規則「${r.name}」？`)) return;
    try {
      const res = await apiFetch(`/api/products/${productId}/intent/${r.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const renderForm = (form: FormShape, setForm: (f: FormShape) => void) => (
    <>
      <div className="grid grid-cols-2 gap-2">
        <input className="hq-input" placeholder="規則名稱（必填）" value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })} />
        <input className="hq-input" type="number" placeholder="priority（數字小優先）" value={form.priority}
          onChange={e => setForm({ ...form, priority: Number(e.target.value) || 0 })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select className="hq-input" value={form.match_type}
          onChange={e => setForm({ ...form, match_type: e.target.value as IntentMatchType })}>
          <option value="keyword">keyword（包含即可）</option>
          <option value="exact">exact（完全相等）</option>
          <option value="regex">regex（正則）</option>
        </select>
        <select className="hq-input" value={form.action_type}
          onChange={e => setForm({ ...form, action_type: e.target.value as IntentActionType })}>
          <option value="reply_content">回覆內容（引用 content key）</option>
          <option value="set_attribute">設定使用者屬性</option>
        </select>
      </div>
      <input className="hq-input" placeholder="patterns（逗號分隔，如：預約, 要預約）" value={form.patterns}
        onChange={e => setForm({ ...form, patterns: e.target.value })} />
      {form.action_type === 'reply_content' ? (
        <input className="hq-input" placeholder="回覆的 content key（需在內容庫存在）" value={form.content_key}
          onChange={e => setForm({ ...form, content_key: e.target.value })} />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <input className="hq-input" placeholder="attribute key" value={form.attr_key}
            onChange={e => setForm({ ...form, attr_key: e.target.value })} />
          <input className="hq-input" placeholder="value" value={form.attr_value}
            onChange={e => setForm({ ...form, attr_value: e.target.value })} />
          <input className="hq-input" placeholder="回覆 content key（選填）" value={form.attr_reply_content_key}
            onChange={e => setForm({ ...form, attr_reply_content_key: e.target.value })} />
        </div>
      )}
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
        <h3 className="font-semibold text-lg">意圖規則（{rules.length}）</h3>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="text-sm px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50"
        >
          {showAdd ? '取消' : '+ 新增規則'}
        </button>
      </div>
      <p className="text-xs text-slate-500">
        用戶傳訊時，會先依 priority 順序比對此處的規則。第一個匹配的規則會執行其 action，不再落到 AI 顧問。未匹配則交給 AI。
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
      ) : rules.length === 0 ? (
        <p className="text-sm text-slate-500">尚無規則 — 點右上「+ 新增規則」建立第一條</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rules.map(r => (
            <li key={r.id} className="border border-slate-200 rounded-lg p-3 flex flex-col gap-2">
              {editingId === r.id ? (
                <>
                  {renderForm(editForm, setEditForm)}
                  <div className="flex items-center gap-2">
                    <button onClick={() => saveEdit(r.id)} disabled={savingId === r.id}
                      className="hq-btn-primary text-sm">
                      {savingId === r.id ? '儲存中...' : '儲存'}
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
                      <span className="font-semibold">{r.name}</span>
                      <span className="text-xs text-slate-400">p{r.priority} · {r.match_type}</span>
                      {!r.is_active && <span className="hq-badge hq-badge-gray">停用</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(r)}
                        className="text-xs px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-50">
                        編輯
                      </button>
                      <button onClick={() => handleDelete(r)}
                        className="text-xs px-2 py-0.5 rounded border border-red-300 text-red-600 bg-white hover:bg-red-50">
                        刪除
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-1">
                    {r.patterns.map((p, i) => (
                      <code key={i} className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">{p}</code>
                    ))}
                  </div>
                  <div className="text-xs text-slate-600">
                    {r.action_type === 'reply_content' && (
                      <>回覆內容：<code className="bg-slate-100 px-1 rounded">{r.action_config.content_key}</code></>
                    )}
                    {r.action_type === 'set_attribute' && (
                      <>
                        設定屬性：<code className="bg-slate-100 px-1 rounded">{r.action_config.key}={r.action_config.value}</code>
                        {r.action_config.reply_content_key && (
                          <> + 回覆 <code className="bg-slate-100 px-1 rounded">{r.action_config.reply_content_key}</code></>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
