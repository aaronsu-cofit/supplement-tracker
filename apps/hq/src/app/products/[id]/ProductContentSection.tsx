'use client';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useState } from 'react';
import type { ContentItem, ContentItemType } from '../../../types';
import HelpModal, { HelpButton } from './HelpModal';
import FlexExamplePicker from './FlexExamplePicker';
import { FLEX_EXAMPLES } from './flexExamples';
import FlexPreview from './FlexPreview';

interface Props {
  productId: string;
}

interface FormShape {
  key: string;
  type: ContentItemType;
  title: string;
  body: string;
  is_active: boolean;
}

const EMPTY: FormShape = { key: '', type: 'text', title: '', body: '', is_active: true };

// Lightweight JSON-shape sanity check for flex content. Matches the
// backend's tryParseFlex — must be an object with type 'bubble' or
// 'carousel'. We don't deep-validate; LINE rejects bad contents at send
// time with a descriptive error, which surfaces in scheduler errors.
interface FlexValidation { ok: boolean; message?: string }
function validateFlexJson(raw: string): FlexValidation {
  if (!raw.trim()) return { ok: false, message: 'Flex 內容不可為空' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { ok: false, message: `JSON 無法解析：${(e as Error).message}` };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, message: '最外層需為 JSON 物件' };
  }
  const t = (parsed as { type?: unknown }).type;
  if (t !== 'bubble' && t !== 'carousel') {
    return { ok: false, message: `最外層 type 需為 bubble 或 carousel（目前：${String(t)}）` };
  }
  return { ok: true };
}

const FLEX_EXAMPLE_COUNT = FLEX_EXAMPLES.length;

export default function ProductContentSection({ productId }: Props) {
  const [items, setItems] = useState<ContentItem[]>([]);
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
  const [examplePickerFor, setExamplePickerFor] = useState<null | 'add' | 'edit'>(null);
  const [jsonOpenIds, setJsonOpenIds] = useState<Set<string>>(new Set());

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

  const validateForm = (f: FormShape): string | null => {
    if (!f.key.trim()) return '請填 key';
    if (f.type === 'flex') {
      const r = validateFlexJson(f.body);
      if (!r.ok) return `Flex 內容錯誤：${r.message}`;
    }
    return null;
  };

  const handleAdd = async () => {
    const err = validateForm(addForm);
    if (err) { setAddError(err); return; }
    setAdding(true);
    setAddError(null);
    try {
      const res = await apiFetch(`/api/products/${productId}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: addForm.key.trim(),
          type: addForm.type,
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
    } catch (e) {
      setAddError((e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (item: ContentItem) => {
    setEditingId(item.id);
    setEditForm({
      key: item.key,
      type: item.type,
      title: item.title ?? '',
      body: item.body ?? '',
      is_active: item.is_active,
    });
  };

  const saveEdit = async (id: string) => {
    const err = validateForm(editForm);
    if (err) { alert(err); return; }
    setSavingId(id);
    try {
      const res = await apiFetch(`/api/products/${productId}/content/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: editForm.key.trim(),
          type: editForm.type,
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
    } catch (e) {
      alert((e as Error).message);
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

  const renderForm = (form: FormShape, setForm: (f: FormShape) => void) => (
    <>
      <div className="grid grid-cols-2 gap-2">
        <input className="hq-input" placeholder="key（英數底線點連字號，如 welcome_msg）"
          value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} />
        <select className="hq-input" value={form.type}
          onChange={e => setForm({ ...form, type: e.target.value as ContentItemType })}>
          <option value="text">text（純文字）</option>
          <option value="flex">flex（LINE 卡片/按鈕）</option>
        </select>
      </div>
      <input className="hq-input" placeholder="標題（選填；flex 會用作 altText 通知文案）"
        value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
      {form.type === 'text' ? (
        <textarea className="hq-input min-h-[80px]" placeholder="訊息文字"
          value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
      ) : (
        <>
          <textarea className="hq-input min-h-[200px] font-mono text-xs"
            placeholder="Flex 內容 JSON（外層需為 bubble 或 carousel）"
            value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} />
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <button type="button"
              onClick={() => setExamplePickerFor(form === addForm ? 'add' : 'edit')}
              className="text-xs px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 font-semibold">
              選用範例（{FLEX_EXAMPLE_COUNT} 個）
            </button>
            <a href="https://developers.line.biz/flex-simulator/"
              target="_blank" rel="noopener noreferrer"
              className="text-slate-500 hover:text-slate-900 underline">
              LINE Flex Simulator ↗
            </a>
            {form.body.trim() && (() => {
              const r = validateFlexJson(form.body);
              return r.ok
                ? <span className="text-emerald-600">✓ JSON 格式通過</span>
                : <span className="text-red-600">✗ {r.message}</span>;
            })()}
          </div>
        </>
      )}
    </>
  );

  return (
    <div className="hq-card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">內容庫（{items.length}）</h3>
          <HelpButton onClick={() => setHelpOpen(true)} />
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="text-sm px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50"
        >
          {showAdd ? '取消' : '+ 新增'}
        </button>
      </div>
      {helpOpen && (
        <HelpModal title="內容庫使用說明" onClose={() => setHelpOpen(false)}>
          <div>
            <strong>Key 命名</strong>
            <p className="text-xs text-slate-500 mt-1">
              英數、底線 <code className="bg-slate-100 px-1 rounded">_</code>、點 <code className="bg-slate-100 px-1 rounded">.</code>、連字號 <code className="bg-slate-100 px-1 rounded">-</code>，開頭需英數，最多 100 字。建議語意化：<code className="bg-slate-100 px-1 rounded">welcome_msg</code>、<code className="bg-slate-100 px-1 rounded">day1_tip</code>、<code className="bg-slate-100 px-1 rounded">sleep_card</code>。
            </p>
          </div>
          <div>
            <strong>被誰引用</strong>
            <ul className="list-disc pl-5 text-xs text-slate-600 mt-1 flex flex-col gap-0.5">
              <li>劇本 push 節點的「引用內容」下拉</li>
              <li>意圖規則 <code className="bg-slate-100 px-1 rounded">reply_content</code> 動作</li>
              <li>意圖其他動作（set_attribute、assign_mission…）的 <code className="bg-slate-100 px-1 rounded">reply_content_key</code></li>
            </ul>
          </div>
          <div>
            <strong>兩種類型</strong>
            <ul className="list-disc pl-5 text-xs text-slate-600 mt-1 flex flex-col gap-0.5">
              <li><code className="bg-slate-100 px-1 rounded">text</code>：純文字訊息，body 填內容</li>
              <li><code className="bg-slate-100 px-1 rounded">flex</code>：LINE 卡片，body 填 Flex JSON（外層 bubble 或 carousel）；title 欄位會當作 altText 通知文案</li>
            </ul>
          </div>
          <div>
            <strong>即時更新</strong>
            <p className="text-xs text-slate-500 mt-1">
              改內容即生效 — 發送時才從 DB 抓，不用改劇本/意圖規則。
            </p>
          </div>
          <div>
            <strong>範例</strong>
            <p className="text-xs text-slate-500 mt-1">
              建 <code className="bg-slate-100 px-1 rounded">welcome_msg</code>（text，body「歡迎！」）→ 意圖規則 patterns=<code className="bg-slate-100 px-1 rounded">你好, hi</code>，action=reply_content 引用 <code className="bg-slate-100 px-1 rounded">welcome_msg</code>。
            </p>
          </div>
        </HelpModal>
      )}
      <p className="text-xs text-slate-500">
        可複用的訊息。劇本、push node、意圖回覆中可用 <code className="bg-slate-100 px-1 rounded">content:key</code> 引用。支援 text 和 flex（LINE 卡片）。
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
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">尚無內容 — 點右上「+ 新增」建立第一則</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map(item => (
            <li key={item.id} className="border border-slate-200 rounded-lg p-3 flex flex-col gap-2">
              {editingId === item.id ? (
                <>
                  {renderForm(editForm, setEditForm)}
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editForm.is_active}
                      onChange={e => setEditForm({ ...editForm, is_active: e.target.checked })} />
                    <span>啟用</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => saveEdit(item.id)} disabled={savingId === item.id}
                      className="hq-btn-primary text-sm">
                      {savingId === item.id ? '儲存中...' : '儲存'}
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
                      <code className="bg-slate-100 px-1.5 rounded font-mono text-sm">{item.key}</code>
                      <span className={`hq-badge ${item.type === 'flex' ? 'hq-badge-purple' : 'hq-badge-gray'}`}>
                        {item.type}
                      </span>
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
                  {item.body && item.type === 'text' && (
                    <div className="flex justify-start">
                      <div className="bg-[#06c755] text-white rounded-2xl rounded-tl-sm px-3 py-2 text-sm whitespace-pre-wrap max-w-[75%] shadow-sm">
                        {item.body}
                      </div>
                    </div>
                  )}
                  {item.body && item.type === 'flex' && (
                    <div className="flex flex-col gap-2">
                      <FlexPreview body={item.body} altText={item.title} />
                      <div>
                        <button onClick={() => setJsonOpenIds(prev => {
                          const next = new Set(prev);
                          if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
                          return next;
                        })}
                          className="text-xs text-slate-500 hover:text-slate-800 underline">
                          {jsonOpenIds.has(item.id) ? '隱藏 JSON' : '查看 JSON'}
                        </button>
                      </div>
                      {jsonOpenIds.has(item.id) && (
                        <pre className="text-xs whitespace-pre-wrap max-h-48 overflow-auto font-mono text-slate-500 bg-slate-50 p-2 rounded border border-slate-200">
                          {item.body}
                        </pre>
                      )}
                    </div>
                  )}
                  {item.body && item.type !== 'text' && item.type !== 'flex' && (
                    <pre className="text-xs whitespace-pre-wrap max-h-48 overflow-auto text-slate-600">
                      {item.body}
                    </pre>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {examplePickerFor && (
        <FlexExamplePicker
          onClose={() => setExamplePickerFor(null)}
          onPick={(json) => {
            if (examplePickerFor === 'add') {
              setAddForm(prev => ({ ...prev, body: json }));
            } else {
              setEditForm(prev => ({ ...prev, body: json }));
            }
          }}
        />
      )}
    </div>
  );
}
