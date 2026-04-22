'use client';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { BadgeTemplate, BadgeCriteria } from '../../../types';
import HelpModal, { HelpButton } from './HelpModal';
import { BadgeIcon } from './badgeIcon';

/**
 * Small upload button that reads a chosen image and produces a data:
 * URI suitable for the icon column. Enforces a 20 KB cap since the
 * icon is stored inline in the DB — larger images should go to object
 * storage and be referenced by URL.
 */
const MAX_ICON_BYTES = 20 * 1024;
function IconUploadButton({ onPicked }: { onPicked: (dataUri: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > MAX_ICON_BYTES) {
      alert(`圖片太大（${Math.round(file.size / 1024)} KB）— 請壓到 20 KB 以內，或改用 URL 放外部圖床。`);
      return;
    }
    const dataUri = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    }).catch(err => {
      alert(`讀取失敗：${(err as Error).message}`);
      return null;
    });
    if (dataUri) onPicked(dataUri);
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          if (inputRef.current) inputRef.current.value = '';
        }} />
      <button type="button"
        onClick={() => inputRef.current?.click()}
        className="shrink-0 text-xs px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50"
        title="上傳圖片（≤ 20 KB，存為 data URI）">
        📁 上傳
      </button>
    </>
  );
}

interface Props {
  productId: string;
}

interface FormShape {
  key: string;
  name: string;
  description: string;
  icon: string;
  criteria_type: BadgeCriteria['type'];
  streak_key: string;
  threshold: number;
  mission_key: string;
  notify_content_key: string;
  is_active: boolean;
}

const EMPTY: FormShape = {
  key: '',
  name: '',
  description: '',
  icon: '',
  criteria_type: 'streak_reached',
  streak_key: '',
  threshold: 7,
  mission_key: '',
  notify_content_key: '',
  is_active: true,
};

function formToPayload(f: FormShape) {
  const criteria: BadgeCriteria =
    f.criteria_type === 'streak_reached'
      ? { type: 'streak_reached', streak_key: f.streak_key.trim(), threshold: f.threshold }
      : { type: 'mission_completed', mission_key: f.mission_key.trim() };
  return {
    key: f.key.trim(),
    name: f.name.trim(),
    description: f.description || null,
    icon: f.icon || null,
    criteria,
    notify_content_key: f.notify_content_key.trim() || null,
    is_active: f.is_active,
  };
}

function badgeToForm(b: BadgeTemplate): FormShape {
  return {
    key: b.key,
    name: b.name,
    description: b.description ?? '',
    icon: b.icon ?? '',
    criteria_type: b.criteria.type,
    streak_key: b.criteria.type === 'streak_reached' ? b.criteria.streak_key : '',
    threshold: b.criteria.type === 'streak_reached' ? b.criteria.threshold : 7,
    mission_key: b.criteria.type === 'mission_completed' ? b.criteria.mission_key : '',
    notify_content_key: b.notify_content_key ?? '',
    is_active: b.is_active,
  };
}

export default function ProductBadgeSection({ productId }: Props) {
  const [badges, setBadges] = useState<BadgeTemplate[]>([]);
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
    apiFetch(`/api/products/${productId}/badges`)
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ badges: BadgeTemplate[] }>;
      })
      .then(({ badges: data }) => setBadges(data ?? []))
      .catch(err => {
        console.error('[product/badges] error', err);
        setError('無法載入徽章');
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
      const res = await apiFetch(`/api/products/${productId}/badges`, {
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
      const res = await apiFetch(`/api/products/${productId}/badges/${id}`, {
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

  const handleDelete = async (b: BadgeTemplate) => {
    if (!window.confirm(`刪除徽章「${b.key}」？`)) return;
    try {
      const res = await apiFetch(`/api/products/${productId}/badges/${b.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      load();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const renderForm = (form: FormShape, setForm: (f: FormShape) => void) => (
    <>
      <div className="grid grid-cols-2 gap-2">
        <input className="hq-input" placeholder="key（英數底線連字號）"
          value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} />
        <input className="hq-input" placeholder="徽章名稱（必填）"
          value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 shrink-0 w-12">Icon</label>
          <input className="hq-input text-sm flex-1 font-mono" placeholder="emoji（🏆）/ URL / data: URI（選填）"
            value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} />
          {form.icon && (
            <span className="shrink-0 w-8 h-8 flex items-center justify-center border border-slate-200 rounded bg-white">
              <BadgeIcon icon={form.icon} size={22} />
            </span>
          )}
          <IconUploadButton onPicked={dataUri => setForm({ ...form, icon: dataUri })} />
        </div>
        <input className="hq-input text-sm" placeholder="說明（選填）"
          value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="flex flex-col gap-2 border border-slate-200 rounded p-2 bg-white">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">取得條件</label>
        <select className="hq-input" value={form.criteria_type}
          onChange={e => setForm({ ...form, criteria_type: e.target.value as BadgeCriteria['type'] })}>
          <option value="streak_reached">連續天數達標</option>
          <option value="mission_completed">完成指定任務</option>
        </select>
        {form.criteria_type === 'streak_reached' && (
          <div className="grid grid-cols-2 gap-2">
            <input className="hq-input text-sm" placeholder="streak_key"
              value={form.streak_key} onChange={e => setForm({ ...form, streak_key: e.target.value })} />
            <input type="number" min={1} className="hq-input text-sm" placeholder="threshold（達到幾天）"
              value={form.threshold} onChange={e => setForm({ ...form, threshold: Math.max(1, Number(e.target.value) || 1) })} />
          </div>
        )}
        {form.criteria_type === 'mission_completed' && (
          <input className="hq-input text-sm" placeholder="mission_key"
            value={form.mission_key} onChange={e => setForm({ ...form, mission_key: e.target.value })} />
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap text-sm">
        <label className="text-slate-600 shrink-0">取得時推播內容：</label>
        <input className="hq-input text-sm flex-1 min-w-[180px]" placeholder="content_key（選填，空白=不推播）"
          value={form.notify_content_key}
          onChange={e => setForm({ ...form, notify_content_key: e.target.value })} />
      </div>
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
          <h3 className="font-semibold text-lg">徽章（{badges.length}）</h3>
          <HelpButton onClick={() => setHelpOpen(true)} />
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="text-sm px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50"
        >
          {showAdd ? '取消' : '+ 新增徽章'}
        </button>
      </div>
      {helpOpen && (
        <HelpModal title="徽章使用說明" onClose={() => setHelpOpen(false)}>
          <div>
            <strong>Key 命名</strong>
            <p className="text-xs text-slate-500 mt-1">
              建議用成就描述：<code className="bg-slate-100 px-1 rounded">seven_day_streak</code>、<code className="bg-slate-100 px-1 rounded">first_task</code>、<code className="bg-slate-100 px-1 rounded">graduation</code>。
            </p>
          </div>
          <div>
            <strong>被誰引用</strong>
            <ul className="list-disc pl-5 text-xs text-slate-600 mt-1 flex flex-col gap-0.5">
              <li>Journey trigger <code className="bg-slate-100 px-1 rounded">badge_earned</code>（徽章到手後推進使用者 phase）</li>
            </ul>
          </div>
          <div>
            <strong>Icon</strong>
            <p className="text-xs text-slate-500 mt-1">
              三種填法，編輯器會自動判斷並渲染：
            </p>
            <ul className="list-disc pl-5 text-xs text-slate-600 mt-1 flex flex-col gap-0.5">
              <li>Emoji：如 <code className="bg-slate-100 px-1 rounded">🏆</code>、<code className="bg-slate-100 px-1 rounded">🔥</code>、<code className="bg-slate-100 px-1 rounded">⭐</code></li>
              <li>URL：<code className="bg-slate-100 px-1 rounded">https://...</code> 或 <code className="bg-slate-100 px-1 rounded">http://...</code>，適合放外部 CDN 圖</li>
              <li>base64 data URI：<code className="bg-slate-100 px-1 rounded">data:image/png;base64,...</code>，按「📁 上傳」選檔會自動轉成這種格式（限 20 KB 內）</li>
            </ul>
          </div>
          <div>
            <strong>Criteria 類型</strong>
            <ul className="list-disc pl-5 text-xs text-slate-600 mt-1 flex flex-col gap-0.5">
              <li>
                <code className="bg-slate-100 px-1 rounded">streak_reached</code>：streak_key 的連續天數達到 threshold 時頒發。例：streak_key=<code className="bg-slate-100 px-1 rounded">daily_checkin</code>、threshold=7。
              </li>
              <li>
                <code className="bg-slate-100 px-1 rounded">mission_completed</code>：完成指定 mission_key 時頒發。例：mission_key=<code className="bg-slate-100 px-1 rounded">graduation_task</code>。
              </li>
            </ul>
          </div>
          <div>
            <strong>頒發時機</strong>
            <p className="text-xs text-slate-500 mt-1">
              Streak 類：使用者 <code className="bg-slate-100 px-1 rounded">increment_streak</code> 觸發時自動評估；Mission 類：任務完成時自動評估。每人每徽章只得一次（unique 約束保證冪等）。
            </p>
          </div>
          <div>
            <strong>取得時推播內容</strong>
            <p className="text-xs text-slate-500 mt-1">
              填產品內容庫的 key（text 或 flex），徽章頒發的當下自動 push 給使用者。走使用者最近互動的 OA 發送。若不需要主動通知可留空。
            </p>
          </div>
          <div>
            <strong>範例：7 日戰士</strong>
            <p className="text-xs text-slate-500 mt-1">
              key <code className="bg-slate-100 px-1 rounded">seven_day</code>、icon 🔥、criteria streak_reached streak_key=<code className="bg-slate-100 px-1 rounded">daily</code> threshold=7、notify_content_key=<code className="bg-slate-100 px-1 rounded">seven_day_card</code>。使用者連續打卡第 7 天自動取得並收到慶祝卡片。
            </p>
          </div>
        </HelpModal>
      )}
      <p className="text-xs text-slate-500">
        徽章在條件達成時自動頒發，每人每徽章只得一次。streak 類在 <code className="bg-slate-100 px-1 rounded">increment_streak</code> 時評估；mission 類在任務完成時評估。
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
      ) : badges.length === 0 ? (
        <p className="text-sm text-slate-500">尚無徽章 — 點右上「+ 新增徽章」建立第一個</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {badges.map(b => (
            <li key={b.id} className="border border-slate-200 rounded-lg p-3 flex flex-col gap-2">
              {editingId === b.id ? (
                <>
                  {renderForm(editForm, setEditForm)}
                  <div className="flex items-center gap-2">
                    <button onClick={() => saveEdit(b.id)} disabled={savingId === b.id}
                      className="hq-btn-primary text-sm">
                      {savingId === b.id ? '儲存中...' : '儲存'}
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
                      {b.icon && <BadgeIcon icon={b.icon} size={22} />}
                      <code className="bg-slate-100 px-1.5 rounded font-mono text-sm">{b.key}</code>
                      <span className="font-semibold">{b.name}</span>
                      {!b.is_active && <span className="hq-badge hq-badge-gray">停用</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditingId(b.id); setEditForm(badgeToForm(b)); }}
                        className="text-xs px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-50">
                        編輯
                      </button>
                      <button onClick={() => handleDelete(b)}
                        className="text-xs px-2 py-0.5 rounded border border-red-300 text-red-600 bg-white hover:bg-red-50">
                        刪除
                      </button>
                    </div>
                  </div>
                  {b.description && <p className="text-sm text-slate-600">{b.description}</p>}
                  <p className="text-xs text-slate-500">
                    {b.criteria.type === 'streak_reached' && (
                      <>取得條件：連續 <code className="bg-slate-100 px-1 rounded">{b.criteria.streak_key}</code> 達 {b.criteria.threshold} 天</>
                    )}
                    {b.criteria.type === 'mission_completed' && (
                      <>取得條件：完成任務 <code className="bg-slate-100 px-1 rounded">{b.criteria.mission_key}</code></>
                    )}
                  </p>
                  {b.notify_content_key && (
                    <p className="text-xs text-slate-500">
                      取得時推播：<code className="bg-slate-100 px-1 rounded">{b.notify_content_key}</code>
                    </p>
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
