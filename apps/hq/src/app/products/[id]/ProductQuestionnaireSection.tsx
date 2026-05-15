'use client';
// Questionnaire admin under Product detail page. Lists all
// questionnaires for the product + opens an inline editor for one.
//
// Spec authoring: this v1 uses a JSON editor (textarea) with
// client-side parse validation. Server runs the full validateSpec on
// save, so any syntactic mistake is caught before persistence. A
// proper visual form builder can come later — JSON is fine for the
// current authoring team and keeps the surface area small.

import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useState } from 'react';
import type { Questionnaire, QuestionnaireResponseRow } from '../../../types';
import {
  QUESTIONNAIRE_TEMPLATES,
  CATEGORY_ORDER,
  type QuestionnaireTemplate,
} from './questionnaireTemplates';

interface Props {
  productId: string;
}

const SPEC_PLACEHOLDER = JSON.stringify(
  {
    question_sets: [
      {
        key: 'example',
        name: '範例題組',
        calculation_type: 'sum_up',
        questions: [
          {
            id: 'q1',
            kind: 'single_selection',
            text: '範例題目？',
            choices: [
              { id: 'a', label: '選項 A', score: 0 },
              { id: 'b', label: '選項 B', score: 1 },
            ],
          },
        ],
        interpretation_bands: [
          { min: 0, max: 0, label: '低' },
          { min: 1, max: 1, label: '高' },
        ],
      },
    ],
  },
  null,
  2,
);

interface EditorForm {
  key: string;
  name: string;
  description: string;
  liff_url: string;
  is_active: boolean;
  spec_json: string;
  actions_json: string;
}

const EMPTY: EditorForm = {
  key: '',
  name: '',
  description: '',
  liff_url: '',
  is_active: true,
  spec_json: SPEC_PLACEHOLDER,
  actions_json: '[]',
};

interface ParseResult {
  value: unknown;
  error: string | null;
}

function tryParseJson(raw: string): ParseResult {
  if (!raw.trim()) return { value: undefined, error: null };
  try {
    return { value: JSON.parse(raw), error: null };
  } catch (e) {
    return { value: null, error: (e as Error).message };
  }
}

// Single LIFF covers every questionnaire under apps/questionnaires;
// each questionnaire is reached by ?path + ?product. Override per-env
// via NEXT_PUBLIC_QUESTIONNAIRES_LIFF_ID at build time; default below
// is the current staging LIFF.
const QUESTIONNAIRES_LIFF_ID =
  process.env.NEXT_PUBLIC_QUESTIONNAIRES_LIFF_ID || '2009369966-ZwZuOht2';

function buildLiffUrl(productId: string, key: string): string {
  return `https://liff.line.me/${QUESTIONNAIRES_LIFF_ID}?path=/q/${key}&product=${productId}`;
}

export default function ProductQuestionnaireSection({ productId }: Props) {
  const [items, setItems] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [viewingResponsesKey, setViewingResponsesKey] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyUrl = (key: string, url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500);
    });
  };

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    apiFetch(`/api/questionnaires/${productId}`)
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ items: Questionnaire[] }>;
      })
      .then(({ items: data }) => setItems(data ?? []))
      .catch(err => {
        console.error('[product/questionnaires] load error', err);
        setError('無法載入問卷');
      })
      .finally(() => setLoading(false));
  }, [productId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="hq-card text-slate-500">載入中...</div>;
  if (error) return <div className="hq-alert hq-alert-error">{error}</div>;

  const editingItem = editingKey ? items.find(i => i.key === editingKey) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="hq-card flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">問卷（{items.length}）</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHelpOpen(true)}
              className="text-sm px-3 py-1.5 rounded border border-slate-300 hover:bg-slate-50"
            >
              📘 怎麼建頁面
            </button>
            <button onClick={() => setCreating(true)} className="hq-btn-primary text-sm">
              + 新增問卷
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-500">
          建好後，把下方的 LIFF URL 給 ops 貼到 rich menu / scenario / intent rule。
          Vibe coder 拿到指引（點「怎麼建頁面」）就可以著手做 UI。
        </p>

        {items.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">尚無問卷。點「+ 新增問卷」開始建立。</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map(q => {
              const url = buildLiffUrl(productId, q.key);
              const copied = copiedKey === q.key;
              return (
                <li
                  key={q.id}
                  className="border border-slate-200 rounded-lg p-3 flex flex-col gap-2 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{q.name}</span>
                        <code className="text-xs text-slate-500 font-mono">{q.key}</code>
                        <span
                          className={`hq-badge ${
                            q.is_active ? 'hq-badge-green' : 'hq-badge-gray'
                          } shrink-0`}
                        >
                          {q.is_active ? '啟用' : '停用'}
                        </span>
                      </div>
                      {q.description && (
                        <p className="text-xs text-slate-500 line-clamp-1">{q.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setViewingResponsesKey(q.key)}
                        className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50"
                      >
                        📊 回應
                      </button>
                      <button
                        onClick={() => setEditingKey(q.key)}
                        className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50"
                      >
                        編輯
                      </button>
                    </div>
                  </div>
                  {/* Canonical LIFF URL — what ops pastes into rich menu /
                      scenario / intent rules. productId baked in so the
                      vibe-coded page doesn't need to know it. */}
                  <div className="flex items-center gap-2 bg-slate-50 rounded px-2 py-1.5">
                    <code className="text-xs text-slate-700 font-mono truncate flex-1" title={url}>
                      {url}
                    </code>
                    <button
                      onClick={() => copyUrl(q.key, url)}
                      className={`text-xs px-2 py-1 rounded border shrink-0 transition-colors ${
                        copied
                          ? 'border-green-400 bg-green-50 text-green-700'
                          : 'border-slate-300 hover:bg-white'
                      }`}
                    >
                      {copied ? '✓ 已複製' : '📋 複製'}
                    </button>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-white shrink-0"
                      title="在 LINE 上開啟（電腦會跳到 LINE 加入頁）"
                    >
                      ↗ 開啟
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {(editingItem || creating) && (
        <QuestionnaireEditor
          productId={productId}
          existing={editingItem ?? null}
          onClose={() => {
            setEditingKey(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditingKey(null);
            setCreating(false);
            load();
          }}
        />
      )}

      {viewingResponsesKey && (
        <QuestionnaireResponseViewer
          productId={productId}
          questionnaireKey={viewingResponsesKey}
          onClose={() => setViewingResponsesKey(null)}
        />
      )}

      {helpOpen && <VibeCoderHelpModal onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

// ─── Vibe-coder guide ──────────────────────────────────────────────────────
// Inline cheatsheet for ops to forward to whoever is building the LIFF
// page. Single source of truth so the repo README and HQ stay aligned.

function VibeCoderHelpModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const promptTemplate = `# 任務：為 Vitera 新增一張問卷頁面

我已經在 HQ 建好問卷了。幫我用 vibe coding 做出對應的 LIFF 頁面：

1. 在 \`apps/questionnaires/src/app/q/\` 下複製 \`example/\` 整個資料夾
2. 把新資料夾改名成這張問卷的 key（例如 onboarding_v1）
3. 開 \`page.tsx\` —— **不要動最上方 PRODUCT_ID / KEY 的 hooks**，它們會自動從 URL 拿
4. 重新設計題目的 UI（風格、配色、動畫、文案隨意），但保留：
   - \`useQuestionnaireSpec\` / \`useSubmitResponse\` 兩個 hook
   - \`meta.spec.question_sets\` 的迴圈邏輯
   - 送出按鈕呼叫 \`submit(answers)\`
   - 完成後 \`result\` 顯示分數
5. \`git push origin staging\` 後 5-8 分鐘部署完
6. 我把 HQ 上的 LIFF URL 貼到 LINE 測試

風格參考： <填你想要的設計風格>`;

  const copy = () => {
    navigator.clipboard.writeText(promptTemplate).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white">
          <h3 className="font-semibold text-lg">怎麼建問卷頁面（給 vibe coder 看的）</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-900 text-sm">
            ✕ 關閉
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 text-sm">
          <section>
            <h4 className="font-semibold mb-2">流程（共 3 步）</h4>
            <ol className="list-decimal list-inside flex flex-col gap-1 text-slate-700">
              <li>HQ 先建好問卷（spec + scoring + on_submit_actions）</li>
              <li>Vibe coder 在 <code className="text-xs bg-slate-100 px-1 rounded">apps/questionnaires</code> 加一個 page</li>
              <li>Push staging → 5-8 分鐘部署完 → 用上面那行 LIFF URL 測試</li>
            </ol>
          </section>

          <section>
            <h4 className="font-semibold mb-2">給 vibe coder 的 prompt（複製貼上）</h4>
            <div className="relative">
              <pre className="bg-slate-50 border border-slate-200 rounded p-3 text-xs whitespace-pre-wrap leading-relaxed">{promptTemplate}</pre>
              <button
                onClick={copy}
                className={`absolute top-2 right-2 text-xs px-2 py-1 rounded border transition-colors ${
                  copied
                    ? 'border-green-400 bg-green-50 text-green-700'
                    : 'border-slate-300 bg-white hover:bg-slate-50'
                }`}
              >
                {copied ? '✓ 已複製' : '📋 複製'}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              貼到 Cursor / Claude Code，把最後一行的 <code className="bg-slate-100 px-1 rounded">&lt;填你想要的設計風格&gt;</code> 換成你想要的描述（例：「柔和粉色、有手繪插圖、按鈕大顆」）。
            </p>
          </section>

          <section>
            <h4 className="font-semibold mb-2">關鍵設計</h4>
            <ul className="list-disc list-inside flex flex-col gap-1 text-slate-700 text-xs">
              <li>每張問卷 = <code className="bg-slate-100 px-1 rounded">apps/questionnaires/src/app/q/&lt;key&gt;/page.tsx</code></li>
              <li>所有問卷共用 <strong>一個 LIFF ID</strong>，靠 URL 的 <code className="bg-slate-100 px-1 rounded">?path=/q/&lt;key&gt;&amp;product=&lt;id&gt;</code> 區分</li>
              <li>頁面從 URL 自動拿 <code className="bg-slate-100 px-1 rounded">key</code> 和 <code className="bg-slate-100 px-1 rounded">productId</code>，**vibe coder 不需要改任何常數**</li>
              <li>送出後自動算分、寫 attribute / 派 mission / 切 journey（看 on_submit_actions 設定）</li>
            </ul>
          </section>

          <section>
            <h4 className="font-semibold mb-2">完成檢查表</h4>
            <ul className="text-xs text-slate-700 flex flex-col gap-1">
              <li>☐ <code className="bg-slate-100 px-1 rounded">apps/questionnaires/src/app/q/&lt;key&gt;/page.tsx</code> 存在</li>
              <li>☐ Page 沒有改 PRODUCT_ID / KEY（兩個都是 auto-derive 的）</li>
              <li>☐ <code className="bg-slate-100 px-1 rounded">git push origin staging</code> 成功</li>
              <li>☐ GitHub Actions <code className="bg-slate-100 px-1 rounded">Staging Questionnaires CI/CD</code> 跑綠</li>
              <li>☐ 從手機 LINE 開啟 LIFF URL 看得到自己的設計</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── Editor ────────────────────────────────────────────────────────────────

interface EditorProps {
  productId: string;
  existing: Questionnaire | null;
  onClose: () => void;
  onSaved: () => void;
}

function QuestionnaireEditor({ productId, existing, onClose, onSaved }: EditorProps) {
  const [form, setForm] = useState<EditorForm>(() => {
    if (!existing) return EMPTY;
    return {
      key: existing.key,
      name: existing.name,
      description: existing.description ?? '',
      liff_url: existing.liff_url ?? '',
      is_active: existing.is_active,
      spec_json: JSON.stringify(existing.spec ?? { question_sets: [] }, null, 2),
      actions_json: JSON.stringify(existing.on_submit_actions ?? [], null, 2),
    };
  });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const specParse = tryParseJson(form.spec_json);
  const actionsParse = tryParseJson(form.actions_json);

  const handleSave = async () => {
    if (specParse.error) {
      setStatus({ type: 'error', message: `Spec JSON 解析失敗：${specParse.error}` });
      return;
    }
    if (actionsParse.error) {
      setStatus({ type: 'error', message: `Actions JSON 解析失敗：${actionsParse.error}` });
      return;
    }
    setSaving(true);
    setStatus(null);

    const payload: Record<string, unknown> = {
      name: form.name,
      description: form.description || null,
      liff_url: form.liff_url || null,
      is_active: form.is_active,
      spec: specParse.value,
      on_submit_actions: actionsParse.value ?? [],
    };

    try {
      let res: Response;
      if (existing) {
        res = await apiFetch(`/api/questionnaires/${productId}/${existing.key}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // creating: include key
        res = await apiFetch(`/api/questionnaires/${productId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: form.key, ...payload }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        const detail = Array.isArray(data.validation)
          ? data.validation.map((v: { field: string; message: string }) => `${v.field}: ${v.message}`).join('\n')
          : data.message || data.error || `HTTP ${res.status}`;
        throw new Error(detail);
      }
      setStatus({ type: 'success', message: '已儲存' });
      setTimeout(onSaved, 400);
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    if (!window.confirm(`確定刪除問卷「${existing.name}」？此操作會連同所有回應一起刪除。`)) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/questionnaires/${productId}/${existing.key}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }
      onSaved();
    } catch (err) {
      setStatus({ type: 'error', message: (err as Error).message });
      setDeleting(false);
    }
  };

  return (
    <div className="hq-card flex flex-col gap-3 border-2 border-slate-300">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">
          {existing ? `編輯：${existing.name}` : '新增問卷'}
        </h3>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-900 text-sm">
          ✕ 關閉
        </button>
      </div>

      {status && (
        <div className={`hq-alert ${status.type === 'success' ? 'hq-alert-success' : 'hq-alert-error'} whitespace-pre-wrap`}>
          {status.message}
        </div>
      )}

      {!existing && (
        <TemplateLoader
          onLoad={(t) => {
            setForm({
              key: t.template.key,
              name: t.template.name,
              description: t.template.description,
              liff_url: '',
              is_active: true,
              spec_json: JSON.stringify(t.template.spec, null, 2),
              actions_json: JSON.stringify(t.template.on_submit_actions, null, 2),
            });
            setStatus({ type: 'success', message: `已載入範本：${t.label}（記得改 key 避免衝突）` });
          }}
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">key</label>
          <input
            className="hq-input font-mono"
            value={form.key}
            onChange={e => setForm({ ...form, key: e.target.value })}
            disabled={!!existing}
            placeholder="onboarding_v1"
          />
          {existing && (
            <p className="text-xs text-slate-500">key 建立後不可修改</p>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">name</label>
          <input
            className="hq-input"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="新使用者問卷"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">說明</label>
        <input
          className="hq-input"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="（選填）給 ops 看的說明"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">LIFF URL</label>
        <input
          className="hq-input font-mono text-xs"
          value={form.liff_url}
          onChange={e => setForm({ ...form, liff_url: e.target.value })}
          placeholder="https://liff.line.me/xxxxxxxxx-xxxxxxxx"
        />
        <p className="text-xs text-slate-500">部署完 vibe-coded 頁面後填回來；rich menu / scenario / intent 引流會用到</p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={e => setForm({ ...form, is_active: e.target.checked })}
        />
        <span>啟用</span>
        <span className="text-xs text-slate-500">（停用時 LIFF 端 GET /spec 會 404）</span>
      </label>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Spec (JSON)</label>
          {specParse.error && (
            <span className="text-xs text-red-600">⚠ {specParse.error}</span>
          )}
        </div>
        <textarea
          className="hq-input font-mono text-xs min-h-[280px]"
          value={form.spec_json}
          onChange={e => setForm({ ...form, spec_json: e.target.value })}
          spellCheck={false}
        />
        <p className="text-xs text-slate-500">
          結構：question_sets → questions → choices。Server 會做完整 validate；錯誤訊息會顯示在這裡。
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">on_submit_actions (JSON)</label>
          {actionsParse.error && (
            <span className="text-xs text-red-600">⚠ {actionsParse.error}</span>
          )}
        </div>
        <textarea
          className="hq-input font-mono text-xs min-h-[100px]"
          value={form.actions_json}
          onChange={e => setForm({ ...form, actions_json: e.target.value })}
          spellCheck={false}
        />
        <p className="text-xs text-slate-500">
          答完問卷後觸發：set_attribute / assign_mission / transition_journey。匿名提交時略過。
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
        <div>
          {existing && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm px-3 py-1.5 rounded border border-red-300 text-red-600 bg-white hover:bg-red-50"
            >
              {deleting ? '刪除中...' : '刪除'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50">
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !!specParse.error || !!actionsParse.error}
            className="hq-btn-primary"
          >
            {saving ? '儲存中...' : '儲存'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Template loader ───────────────────────────────────────────────────────
// 10 ready-made examples in questionnaireTemplates.ts — picking one
// fills the editor form with a complete spec + on_submit_actions, so
// ops can inspect a working example for every calc_type / feature.
//
// Tags in pill form on hover tell ops which feature this template
// demonstrates.

function TemplateLoader({ onLoad }: { onLoad: (t: QuestionnaireTemplate) => void }) {
  const [selectedId, setSelectedId] = useState('');
  const selected = QUESTIONNAIRE_TEMPLATES.find((t) => t.id === selectedId);

  return (
    <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-cyan-900">📋 從範本載入</span>
        <span className="text-xs text-cyan-700">
          {QUESTIONNAIRE_TEMPLATES.length} 種常見問卷，每個示範不同算分結構；挑一個來改最快
        </span>
      </div>
      <div className="flex items-center gap-2">
        <select
          className="hq-input flex-1 text-sm"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          <option value="">— 選一個範本 —</option>
          {CATEGORY_ORDER.map((category) => {
            const inCategory = QUESTIONNAIRE_TEMPLATES.filter((t) => t.category === category);
            if (inCategory.length === 0) return null;
            return (
              <optgroup key={category} label={category}>
                {inCategory.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        <button
          onClick={() => selected && onLoad(selected)}
          disabled={!selected}
          className="text-sm px-3 py-1.5 rounded bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          載入
        </button>
      </div>
      {selected && (
        <div className="flex flex-col gap-1 text-xs">
          <p className="text-slate-700">{selected.description}</p>
          <div className="flex items-center gap-1 flex-wrap">
            {selected.feature_tags.map((tag) => (
              <code
                key={tag}
                className="bg-white text-cyan-800 border border-cyan-200 px-1.5 py-0.5 rounded font-mono text-[10px]"
              >
                {tag}
              </code>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Response viewer ───────────────────────────────────────────────────────

interface ViewerProps {
  productId: string;
  questionnaireKey: string;
  onClose: () => void;
}

function QuestionnaireResponseViewer({ productId, questionnaireKey, onClose }: ViewerProps) {
  const [items, setItems] = useState<QuestionnaireResponseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/questionnaires/${productId}/${questionnaireKey}/responses`)
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ items: QuestionnaireResponseRow[] }>;
      })
      .then(({ items: data }) => setItems(data ?? []))
      .catch(err => {
        console.error('[product/questionnaires] responses error', err);
        setError('無法載入回應');
      })
      .finally(() => setLoading(false));
  }, [productId, questionnaireKey]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="hq-card flex flex-col gap-3 border-2 border-cyan-300">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">回應記錄：{questionnaireKey}（{items.length}）</h3>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-900 text-sm">
          ✕ 關閉
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">載入中...</p>}
      {error && <div className="hq-alert hq-alert-error">{error}</div>}
      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-slate-500">尚無回應</p>
      )}

      <ul className="flex flex-col gap-1">
        {items.map(r => {
          const who = r.user?.display_name || r.user?.id || r.anonymous_id || '?';
          const when = r.completed_at
            ? new Date(r.completed_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
            : '-';
          const isOpen = expanded.has(r.id);
          return (
            <li key={r.id} className="border-b border-slate-100 last:border-0 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium truncate">{who}</span>
                  <span className="text-xs text-slate-500">{when}</span>
                  {r.anonymous_id && !r.user_id && (
                    <span className="hq-badge hq-badge-gray text-xs">匿名</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-700 font-mono">
                    {Object.entries(r.scores ?? {})
                      .map(([k, v]) => `${k}=${v}`)
                      .join(' · ')}
                  </span>
                  <button
                    onClick={() => toggle(r.id)}
                    className="text-cyan-700 hover:underline"
                  >
                    {isOpen ? '收起' : '詳細'}
                  </button>
                </div>
              </div>
              {isOpen && (
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="font-semibold text-slate-500 mb-1">Answers</p>
                    <pre className="bg-slate-50 p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(r.answers, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-500 mb-1">Interpretation</p>
                    <pre className="bg-slate-50 p-2 rounded overflow-auto max-h-40">
                      {JSON.stringify(r.interpretation ?? {}, null, 2)}
                    </pre>
                    {r.triggered_actions.length > 0 && (
                      <>
                        <p className="font-semibold text-slate-500 mt-2 mb-1">Triggered actions</p>
                        <pre className="bg-slate-50 p-2 rounded overflow-auto max-h-40">
                          {JSON.stringify(r.triggered_actions, null, 2)}
                        </pre>
                      </>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
