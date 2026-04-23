'use client';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useState } from 'react';

interface Props {
  productId: string;
}

interface SeedTemplate {
  key: string;
  name: string;
  description: string;
  counts: {
    content: number;
    missions: number;
    badges: number;
    journeys: number;
    intents: number;
  };
}

interface SeedResult {
  template: string;
  summary: {
    content: { created: number; skipped: number };
    missions: { created: number; skipped: number };
    badges: { created: number; skipped: number };
    journeys: { created: number; skipped: number };
    intents: { created: number; skipped: number };
    errors: string[];
  };
}

/**
 * One-click seeder UI. Lists available templates, lets the user pick
 * one, applies it on click. Idempotent — rerunning on a product that
 * already has some of the keys just skips those.
 */
export default function ProductSeedCard({ productId }: Props) {
  const [templates, setTemplates] = useState<SeedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<SeedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch('/api/products/seed-templates')
      .then(r => r.ok ? r.json() : { templates: [] })
      .then((d: { templates: SeedTemplate[] }) => setTemplates(d.templates ?? []))
      .catch(err => {
        console.error('[seed-card] load templates', err);
        setError((err as Error).message);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const apply = async (templateKey: string, name: string) => {
    if (!window.confirm(
      `將「${name}」範本內容套用到此產品？\n\n` +
      '已存在相同 key 的項目會自動跳過，不會覆蓋。套用後可再編輯或刪除。'
    )) return;
    setRunning(true);
    setError(null);
    setLastResult(null);
    try {
      const res = await apiFetch(`/api/products/${productId}/seed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: templateKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setLastResult(data as SeedResult);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="hq-card flex flex-col gap-3">
      <h3 className="font-semibold text-lg">範本（一鍵填入示範資料）</h3>
      <p className="text-xs text-slate-500">
        套用範本會把內容、任務、徽章、Journey、意圖規則一次建立好，可立即測試整個平台。遇到相同 key 的項目會跳過保留你既有的設定。
      </p>

      {error && <div className="hq-alert hq-alert-error">{error}</div>}

      {loading ? (
        <p className="text-sm text-slate-400">載入中...</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-slate-400">尚無範本可用</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {templates.map(t => (
            <li key={t.key} className="border border-slate-200 rounded-lg p-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="bg-slate-100 px-1.5 rounded font-mono text-sm">{t.key}</code>
                  <span className="font-semibold">{t.name}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{t.description}</p>
                <div className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-2 flex-wrap">
                  <span>內容 {t.counts.content}</span>
                  <span>·</span>
                  <span>任務 {t.counts.missions}</span>
                  <span>·</span>
                  <span>徽章 {t.counts.badges}</span>
                  <span>·</span>
                  <span>Journey {t.counts.journeys}</span>
                  <span>·</span>
                  <span>意圖 {t.counts.intents}</span>
                </div>
              </div>
              <button onClick={() => apply(t.key, t.name)}
                disabled={running}
                className="hq-btn-primary text-sm shrink-0 disabled:opacity-50">
                {running ? '套用中...' : '套用範本'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {lastResult && (
        <div className="border border-emerald-300 bg-emerald-50 rounded-lg p-3 text-sm flex flex-col gap-2">
          <div className="font-semibold text-emerald-800">
            已套用範本：<code>{lastResult.template}</code>
          </div>
          <div className="text-xs text-slate-700 flex items-center gap-3 flex-wrap">
            <SummaryChip label="內容" sec={lastResult.summary.content} />
            <SummaryChip label="任務" sec={lastResult.summary.missions} />
            <SummaryChip label="徽章" sec={lastResult.summary.badges} />
            <SummaryChip label="Journey" sec={lastResult.summary.journeys} />
            <SummaryChip label="意圖" sec={lastResult.summary.intents} />
          </div>
          {lastResult.summary.errors.length > 0 && (
            <details className="text-xs text-red-700">
              <summary className="cursor-pointer">錯誤 {lastResult.summary.errors.length} 則</summary>
              <ul className="list-disc pl-5 mt-1">
                {lastResult.summary.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
          <p className="text-[11px] text-slate-500">
            切到上方的各個 tab 看套用後的結果。
          </p>
        </div>
      )}
    </div>
  );
}

function SummaryChip({ label, sec }: { label: string; sec: { created: number; skipped: number } }) {
  return (
    <span>
      {label}：<strong className="text-emerald-700">+{sec.created}</strong>
      {sec.skipped > 0 && <span className="text-slate-500"> （跳過 {sec.skipped}）</span>}
    </span>
  );
}
