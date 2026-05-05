'use client';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useState } from 'react';
import type { IntentRule, IntentActionType, IntentMatchType, ContentItem, MissionTemplate } from '../../../types';
import HelpModal, { HelpButton } from './HelpModal';

/** Dropdown for picking a content_key from the product's content library.
 *  Falls back to a manual text input if the user wants a key that doesn't
 *  exist yet (or for legacy values pointing at deleted items). */
function ContentKeyPicker({
  value, onChange, items, placeholder, allowEmpty = true,
}: {
  value: string;
  onChange: (v: string) => void;
  items: ContentItem[];
  placeholder?: string;
  allowEmpty?: boolean;
}) {
  const [manual, setManual] = useState(() => !!value && !items.some(i => i.key === value));
  // Stay in manual mode if the current value isn't a known key (e.g., legacy).
  useEffect(() => {
    if (value && !items.some(i => i.key === value)) setManual(true);
  }, [value, items]);
  return (
    <div className="flex gap-1 items-stretch">
      {manual ? (
        <input className="hq-input flex-1" placeholder={placeholder ?? 'content key'}
          value={value} onChange={e => onChange(e.target.value)} />
      ) : (
        <select className="hq-input flex-1" value={value} onChange={e => onChange(e.target.value)}>
          {allowEmpty && <option value="">— 選擇內容 —</option>}
          {items.filter(i => i.is_active).map(i => (
            <option key={i.id} value={i.key}>
              {(i.title || i.key)}{i.type !== 'text' ? ` · ${i.type}` : ''}
            </option>
          ))}
          {/* Show a stale-marker option when current value points at a missing/inactive item */}
          {value && !items.some(i => i.key === value && i.is_active) && (
            <option value={value}>⚠ {value}（不在啟用清單）</option>
          )}
        </select>
      )}
      <button type="button" onClick={() => setManual(m => !m)}
        className="text-xs px-2 rounded border border-slate-300 bg-white hover:bg-slate-50 shrink-0"
        title={manual ? '改成下拉選擇' : '改成手動輸入'}>
        {manual ? '☰' : '✏'}
      </button>
    </div>
  );
}

/** Same shape as ContentKeyPicker but for Mission templates. */
function MissionKeyPicker({
  value, onChange, items, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  items: MissionTemplate[];
  placeholder?: string;
}) {
  const [manual, setManual] = useState(() => !!value && !items.some(i => i.key === value));
  useEffect(() => {
    if (value && !items.some(i => i.key === value)) setManual(true);
  }, [value, items]);
  return (
    <div className="flex gap-1 items-stretch">
      {manual ? (
        <input className="hq-input flex-1" placeholder={placeholder ?? 'mission key'}
          value={value} onChange={e => onChange(e.target.value)} />
      ) : (
        <select className="hq-input flex-1" value={value} onChange={e => onChange(e.target.value)}>
          <option value="">— 選擇任務 —</option>
          {items.filter(i => i.is_active).map(i => (
            <option key={i.id} value={i.key}>
              {(i.name || i.key)} · {i.mission_type}
            </option>
          ))}
          {value && !items.some(i => i.key === value && i.is_active) && (
            <option value={value}>⚠ {value}（不在啟用清單）</option>
          )}
        </select>
      )}
      <button type="button" onClick={() => setManual(m => !m)}
        className="text-xs px-2 rounded border border-slate-300 bg-white hover:bg-slate-50 shrink-0"
        title={manual ? '改成下拉選擇' : '改成手動輸入'}>
        {manual ? '☰' : '✏'}
      </button>
    </div>
  );
}

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
  // assign_mission / complete_mission / increment_mission_progress
  mission_key: string;
  mission_reply_content_key: string;
  mission_step: number;
  // increment_streak
  streak_key: string;
  streak_reply_content_key: string;
  // change_menu
  menu_name: string;
  menu_reply_content_key: string;
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
  mission_key: '',
  mission_reply_content_key: '',
  mission_step: 1,
  streak_key: '',
  streak_reply_content_key: '',
  menu_name: '',
  menu_reply_content_key: '',
  is_active: true,
};

function formToPayload(f: FormShape): Record<string, unknown> {
  const patterns = f.patterns.split(',').map(p => p.trim()).filter(Boolean);
  let action_config: Record<string, unknown>;
  if (f.action_type === 'reply_content') {
    action_config = { content_key: f.content_key.trim() };
  } else if (f.action_type === 'set_attribute') {
    action_config = {
      key: f.attr_key.trim(),
      value: f.attr_value,
      ...(f.attr_reply_content_key.trim() && { reply_content_key: f.attr_reply_content_key.trim() }),
    };
  } else if (f.action_type === 'increment_streak') {
    action_config = {
      streak_key: f.streak_key.trim(),
      ...(f.streak_reply_content_key.trim() && { reply_content_key: f.streak_reply_content_key.trim() }),
    };
  } else if (f.action_type === 'change_menu') {
    action_config = {
      menu_name: f.menu_name.trim(),
      ...(f.menu_reply_content_key.trim() && { reply_content_key: f.menu_reply_content_key.trim() }),
    };
  } else if (f.action_type === 'send_mission_checklist') {
    action_config = {};
  } else {
    // assign_mission | complete_mission | increment_mission_progress
    action_config = {
      mission_key: f.mission_key.trim(),
      ...(f.mission_reply_content_key.trim() && { reply_content_key: f.mission_reply_content_key.trim() }),
      ...(f.action_type === 'increment_mission_progress' && { step: Math.max(1, f.mission_step || 1) }),
    };
  }
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
    mission_key: cfg.mission_key ?? '',
    mission_reply_content_key: cfg.reply_content_key ?? '',
    mission_step: cfg.step ?? 1,
    streak_key: cfg.streak_key ?? '',
    streak_reply_content_key: cfg.reply_content_key ?? '',
    menu_name: cfg.menu_name ?? '',
    menu_reply_content_key: cfg.reply_content_key ?? '',
    is_active: r.is_active,
  };
}

export default function ProductIntentSection({ productId }: Props) {
  const [rules, setRules] = useState<IntentRule[]>([]);
  const [contents, setContents] = useState<ContentItem[]>([]);
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
      apiFetch(`/api/products/${productId}/intent`).then(async r => {
        if (!r.ok) throw new Error(`intent HTTP ${r.status}`);
        return r.json() as Promise<{ rules: IntentRule[] }>;
      }),
      apiFetch(`/api/products/${productId}/content`).then(async r => {
        if (!r.ok) throw new Error(`content HTTP ${r.status}`);
        return r.json() as Promise<{ items: ContentItem[] }>;
      }),
      apiFetch(`/api/products/${productId}/missions`).then(async r => {
        if (!r.ok) throw new Error(`missions HTTP ${r.status}`);
        return r.json() as Promise<{ missions: MissionTemplate[] }>;
      }),
    ])
      .then(([{ rules: r }, { items: c }, { missions: m }]) => {
        setRules(r ?? []);
        setContents(c ?? []);
        setMissions(m ?? []);
      })
      .catch(err => {
        console.error('[product/intent] error', err);
        setError('無法載入意圖規則或內容/任務庫');
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
          <option value="assign_mission">指派任務</option>
          <option value="complete_mission">完成任務</option>
          <option value="increment_mission_progress">遞增任務進度</option>
          <option value="increment_streak">遞增連續天數</option>
          <option value="change_menu">切換 Rich Menu</option>
          <option value="send_mission_checklist">送動態任務清單</option>
        </select>
      </div>
      <input className="hq-input" placeholder="patterns（逗號分隔，如：預約, 要預約）" value={form.patterns}
        onChange={e => setForm({ ...form, patterns: e.target.value })} />
      {form.action_type === 'reply_content' && (
        <ContentKeyPicker value={form.content_key} items={contents}
          placeholder="回覆的 content key（需在內容庫存在）"
          onChange={v => setForm({ ...form, content_key: v })} />
      )}
      {form.action_type === 'set_attribute' && (
        <div className="grid grid-cols-3 gap-2">
          <input className="hq-input" placeholder="attribute key" value={form.attr_key}
            onChange={e => setForm({ ...form, attr_key: e.target.value })} />
          <input className="hq-input" placeholder="value" value={form.attr_value}
            onChange={e => setForm({ ...form, attr_value: e.target.value })} />
          <ContentKeyPicker value={form.attr_reply_content_key} items={contents}
            placeholder="回覆 content key（選填）"
            onChange={v => setForm({ ...form, attr_reply_content_key: v })} />
        </div>
      )}
      {(form.action_type === 'assign_mission' || form.action_type === 'complete_mission') && (
        <div className="grid grid-cols-2 gap-2">
          <MissionKeyPicker value={form.mission_key} items={missions}
            placeholder="mission key（任務庫的 key）"
            onChange={v => setForm({ ...form, mission_key: v })} />
          <ContentKeyPicker value={form.mission_reply_content_key} items={contents}
            placeholder="回覆 content key（選填）"
            onChange={v => setForm({ ...form, mission_reply_content_key: v })} />
        </div>
      )}
      {form.action_type === 'increment_mission_progress' && (
        <div className="grid grid-cols-3 gap-2">
          <MissionKeyPicker value={form.mission_key} items={missions}
            placeholder="mission key"
            onChange={v => setForm({ ...form, mission_key: v })} />
          <input type="number" min={1} className="hq-input" placeholder="step（預設 1）" value={form.mission_step}
            onChange={e => setForm({ ...form, mission_step: Math.max(1, Number(e.target.value) || 1) })} />
          <ContentKeyPicker value={form.mission_reply_content_key} items={contents}
            placeholder="回覆 content key（選填）"
            onChange={v => setForm({ ...form, mission_reply_content_key: v })} />
        </div>
      )}
      {form.action_type === 'increment_streak' && (
        <div className="grid grid-cols-2 gap-2">
          <input className="hq-input" placeholder="streak key（如 daily_checkin）" value={form.streak_key}
            onChange={e => setForm({ ...form, streak_key: e.target.value })} />
          <ContentKeyPicker value={form.streak_reply_content_key} items={contents}
            placeholder="回覆 content key（選填）"
            onChange={v => setForm({ ...form, streak_reply_content_key: v })} />
        </div>
      )}
      {form.action_type === 'change_menu' && (
        <div className="grid grid-cols-2 gap-2">
          <input className="hq-input" placeholder="Rich Menu 名稱（需已部署）" value={form.menu_name}
            onChange={e => setForm({ ...form, menu_name: e.target.value })} />
          <ContentKeyPicker value={form.menu_reply_content_key} items={contents}
            placeholder="回覆 content key（選填）"
            onChange={v => setForm({ ...form, menu_reply_content_key: v })} />
        </div>
      )}
      {form.action_type === 'send_mission_checklist' && (
        <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-1">
          無需設定：後端會依使用者當前的 pending missions 動態產生 flex 清單卡片回覆。卡片上每列都是 tap-to-complete 按鈕，使用者點擊後會自動更新。
        </p>
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
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">意圖規則（{rules.length}）</h3>
          <HelpButton onClick={() => setHelpOpen(true)} />
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="text-sm px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50"
        >
          {showAdd ? '取消' : '+ 新增規則'}
        </button>
      </div>
      {helpOpen && (
        <HelpModal title="意圖規則使用說明" onClose={() => setHelpOpen(false)}>
          <div>
            <strong>觸發時機</strong>
            <p className="text-xs text-slate-500 mt-1">
              使用者在 LINE 傳文字訊息進來時，依 priority 升序比對規則。<strong>第一個命中的規則執行 action，不再落到 AI 顧問</strong>；沒規則命中才交給 AI。
            </p>
          </div>
          <div>
            <strong>Priority</strong>
            <p className="text-xs text-slate-500 mt-1">
              數字小者優先（建議 10 的倍數：10, 20, 30…）。具體的規則給小數字、通用的給大數字。
            </p>
          </div>
          <div>
            <strong>比對類型</strong>
            <ul className="list-disc pl-5 text-xs text-slate-600 mt-1 flex flex-col gap-0.5">
              <li><code className="bg-slate-100 px-1 rounded">keyword</code>：包含即中（case-insensitive 子字串）</li>
              <li><code className="bg-slate-100 px-1 rounded">exact</code>：完全相等（trim 後，case-insensitive）</li>
              <li><code className="bg-slate-100 px-1 rounded">regex</code>：正則表達式（case-insensitive），非法 regex 會被跳過</li>
            </ul>
            <p className="text-xs text-slate-500 mt-1">
              Patterns 是陣列，任一 pattern 命中就算中。
            </p>
          </div>
          <div>
            <strong>動作類型</strong>
            <ul className="list-disc pl-5 text-xs text-slate-600 mt-1 flex flex-col gap-0.5">
              <li>
                <code className="bg-slate-100 px-1 rounded">reply_content</code>：直接回覆 content_key（text 或 flex 都可）
              </li>
              <li>
                <code className="bg-slate-100 px-1 rounded">set_attribute</code>：設屬性 key=value；可選 reply_content_key 同時回覆
              </li>
              <li>
                <code className="bg-slate-100 px-1 rounded">assign_mission</code>：指派任務；可同時回覆
              </li>
              <li>
                <code className="bg-slate-100 px-1 rounded">complete_mission</code>：完成使用者當前該任務；可同時回覆
              </li>
              <li>
                <code className="bg-slate-100 px-1 rounded">increment_mission_progress</code>：多步任務 +1（可指定 step）
              </li>
              <li>
                <code className="bg-slate-100 px-1 rounded">increment_streak</code>：連續天數 +1（tz-aware、同日不重算）
              </li>
              <li>
                <code className="bg-slate-100 px-1 rounded">change_menu</code>：切換使用者的 LINE Rich Menu（依 OA 下已部署的模板名稱比對）
              </li>
              <li>
                <code className="bg-slate-100 px-1 rounded">send_mission_checklist</code>：動態組 flex 清單回覆，每列是 tap-to-complete 按鈕
              </li>
            </ul>
          </div>
          <div>
            <strong>必備欄位對照</strong>
            <div className="text-xs text-slate-600 mt-1 flex flex-col gap-0.5">
              <div>reply_content → <code className="bg-slate-100 px-1 rounded">content_key</code></div>
              <div>set_attribute → <code className="bg-slate-100 px-1 rounded">attribute_key</code> + <code className="bg-slate-100 px-1 rounded">value</code>（+ 選填 <code className="bg-slate-100 px-1 rounded">reply_content_key</code>）</div>
              <div>assign/complete/increment_mission → <code className="bg-slate-100 px-1 rounded">mission_key</code>（+ 選填回覆）</div>
              <div>increment_streak → <code className="bg-slate-100 px-1 rounded">streak_key</code>（+ 選填回覆）</div>
              <div>change_menu → <code className="bg-slate-100 px-1 rounded">menu_name</code>（需與 OA 的 Rich Menu 模板名稱一致）（+ 選填回覆）</div>
            </div>
          </div>
          <div>
            <strong>連帶效應（自動觸發）</strong>
            <p className="text-xs text-slate-500 mt-1">
              動作成功後會自動連動：
            </p>
            <ul className="list-disc pl-5 text-xs text-slate-600 mt-1 flex flex-col gap-0.5">
              <li>set_attribute → 可能觸發任務的 auto_complete_on_attribute</li>
              <li>set_attribute / mission / badge → 可能觸發 Journey 轉換</li>
              <li>mission 完成 → 跑 on_complete_actions、評估 mission_completed 徽章</li>
              <li>streak 到 threshold → 頒發 streak_reached 徽章</li>
              <li>badge 頒發 → 可能觸發 Journey 轉換</li>
            </ul>
          </div>
          <div>
            <strong>範例：打卡</strong>
            <p className="text-xs text-slate-500 mt-1">
              patterns=<code className="bg-slate-100 px-1 rounded">打卡, 簽到, checkin</code>，action=increment_streak streak_key=<code className="bg-slate-100 px-1 rounded">daily</code>，reply_content_key=<code className="bg-slate-100 px-1 rounded">streak_cheer</code>。使用者打卡就連續 +1 並回覆鼓勵訊息。
            </p>
          </div>
        </HelpModal>
      )}
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
                    {r.action_type === 'assign_mission' && (
                      <>
                        指派任務：<code className="bg-slate-100 px-1 rounded">{r.action_config.mission_key}</code>
                        {r.action_config.reply_content_key && (
                          <> + 回覆 <code className="bg-slate-100 px-1 rounded">{r.action_config.reply_content_key}</code></>
                        )}
                      </>
                    )}
                    {r.action_type === 'complete_mission' && (
                      <>
                        完成任務：<code className="bg-slate-100 px-1 rounded">{r.action_config.mission_key}</code>
                        {r.action_config.reply_content_key && (
                          <> + 回覆 <code className="bg-slate-100 px-1 rounded">{r.action_config.reply_content_key}</code></>
                        )}
                      </>
                    )}
                    {r.action_type === 'increment_mission_progress' && (
                      <>
                        遞增進度：<code className="bg-slate-100 px-1 rounded">{r.action_config.mission_key}</code>
                        {r.action_config.step && r.action_config.step !== 1 && <> ×{r.action_config.step}</>}
                        {r.action_config.reply_content_key && (
                          <> + 回覆 <code className="bg-slate-100 px-1 rounded">{r.action_config.reply_content_key}</code></>
                        )}
                      </>
                    )}
                    {r.action_type === 'increment_streak' && (
                      <>
                        連續天數 +1：<code className="bg-slate-100 px-1 rounded">{r.action_config.streak_key}</code>
                        {r.action_config.reply_content_key && (
                          <> + 回覆 <code className="bg-slate-100 px-1 rounded">{r.action_config.reply_content_key}</code></>
                        )}
                      </>
                    )}
                    {r.action_type === 'change_menu' && (
                      <>
                        切換 Rich Menu：<code className="bg-slate-100 px-1 rounded">{r.action_config.menu_name}</code>
                        {r.action_config.reply_content_key && (
                          <> + 回覆 <code className="bg-slate-100 px-1 rounded">{r.action_config.reply_content_key}</code></>
                        )}
                      </>
                    )}
                    {r.action_type === 'send_mission_checklist' && (
                      <>送動態任務清單（依使用者現況產生）</>
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
