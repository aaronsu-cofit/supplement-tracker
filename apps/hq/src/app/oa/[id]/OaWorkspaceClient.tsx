'use client';
import { apiFetch } from '@vitera/lib';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { LineOA } from '../../../types';
import OaScenariosTab from './tabs/OaScenariosTab';
import OaOverviewTab from './tabs/OaOverviewTab';
import OaMenusTab from './tabs/OaMenusTab';
import OaSettingsTab from './tabs/OaSettingsTab';
import OaConversationsTab from './tabs/OaConversationsTab';
import ProductContentSection from '../../products/[id]/ProductContentSection';
import ProductMissionSection from '../../products/[id]/ProductMissionSection';
import ProductBadgeSection from '../../products/[id]/ProductBadgeSection';
import ProductJourneySection from '../../products/[id]/ProductJourneySection';
import ProductIntentSection from '../../products/[id]/ProductIntentSection';
import ProductQuestionnaireSection from '../../products/[id]/ProductQuestionnaireSection';

type TabKey =
  | 'scenarios' | 'menus' | 'overview' | 'conversations' | 'settings'
  | 'content' | 'missions' | 'badges' | 'journey' | 'intents' | 'questionnaires';

interface TabDef { key: TabKey; label: string; productScope?: boolean }
const OA_TABS: TabDef[] = [
  { key: 'scenarios', label: '劇本' },
  { key: 'menus', label: '選單' },
  { key: 'overview', label: '概覽' },
  { key: 'conversations', label: '對話' },
  { key: 'settings', label: '設定' },
];
// Right of the | separator: tabs that operate on the OA's bound product.
// Same data as /products/[id] — just brought in-context so ops doesn't
// have to bounce between top-level navs to author content. The 🌐 icon
// hints "this is product-scoped: edits affect every OA bound to it".
const PRODUCT_TABS: TabDef[] = [
  { key: 'content',  label: '內容', productScope: true },
  { key: 'missions', label: '任務', productScope: true },
  { key: 'badges',   label: '徽章', productScope: true },
  { key: 'journey',  label: 'Journey', productScope: true },
  { key: 'intents',  label: '意圖', productScope: true },
  { key: 'questionnaires', label: '問卷', productScope: true },
];
const ALL_TABS: TabDef[] = [...OA_TABS, ...PRODUCT_TABS];

interface BoundProduct { id: string; name: string }

export default function OaWorkspaceClient({ oaId }: { oaId: string }) {
  const params = useSearchParams();
  const rawTab = params.get('tab') as TabKey | null;
  const activeTab: TabKey = ALL_TABS.some(t => t.key === rawTab) ? (rawTab as TabKey) : 'scenarios';

  const [oa, setOa] = useState<LineOA | null>(null);
  const [boundProduct, setBoundProduct] = useState<BoundProduct | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/line/oa')
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ oas: LineOA[] }>;
      })
      .then(({ oas }) => {
        const found = oas.find(o => String(o.id) === oaId);
        if (!found) { setError(`找不到 OA #${oaId}`); return; }
        setOa(found);
      })
      .catch(err => {
        console.error('[oa/workspace] error', err);
        setError('無法載入 OA 資料');
      });
  }, [oaId]);

  // Resolve the bound product's name for the header link. Cheap one-shot
  // — using the same /api/products list every page already loads.
  useEffect(() => {
    if (!oa?.product_id) { setBoundProduct(null); return; }
    apiFetch('/api/products')
      .then(r => r.ok ? r.json() : { products: [] })
      .then((d: { products: BoundProduct[] }) => {
        const p = (d.products ?? []).find(x => x.id === oa.product_id);
        setBoundProduct(p ?? null);
      })
      .catch(() => setBoundProduct(null));
  }, [oa?.product_id]);

  if (error) {
    return (
      <div className="p-6">
        <div className="hq-alert hq-alert-error">{error}</div>
        <Link href="/oa" className="text-sm text-slate-500 underline mt-4 inline-block">← 回 OA 列表</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50">
      {/* Header + tabs */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="px-6 py-3 flex items-center gap-3 flex-wrap">
          <Link href="/oa" className="text-sm text-slate-500 hover:text-slate-800">← OA 列表</Link>
          <div className="w-px h-4 bg-slate-200" />
          <h2 className="text-lg font-bold text-slate-900 m-0">
            {oa?.name || '載入中...'}
          </h2>
          <code className="text-xs text-slate-500 font-mono">#{oaId}</code>
          {oa && (
            <span className={`hq-badge ${oa.is_active ? 'hq-badge-green' : 'hq-badge-gray'}`}>
              {oa.is_active ? '啟用' : '停用'}
            </span>
          )}
          {/* Cross-link to the bound product (Plan A): saves the round-trip
             through the top-level Products nav when ops just wants to peek
             or do shared-product editing. */}
          {boundProduct && (
            <>
              <div className="w-px h-4 bg-slate-200" />
              <Link href={`/products/${boundProduct.id}`}
                className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
                title="跳到產品設定頁">
                🌐 產品：<span className="font-medium text-slate-700">{boundProduct.name}</span> →
              </Link>
            </>
          )}
          {!oa?.product_id && oa && (
            <Link href={`/oa/${oaId}?tab=settings`}
              className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              ⚠ 尚未綁定產品
            </Link>
          )}
        </div>
        <div className="px-6 flex items-center gap-1 flex-wrap">
          {OA_TABS.map(t => (
            <Link
              key={t.key}
              href={`/oa/${oaId}?tab=${t.key}`}
              className={`text-sm px-4 py-2 border-b-2 transition-colors ${
                activeTab === t.key
                  ? 'border-slate-900 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </Link>
          ))}
          {oa?.product_id && (
            <>
              <div className="w-px h-4 bg-slate-200 mx-2" />
              {PRODUCT_TABS.map(t => (
                <Link
                  key={t.key}
                  href={`/oa/${oaId}?tab=${t.key}`}
                  title="此 tab 編輯的是產品全域設定，會影響所有綁此產品的 OA"
                  className={`text-sm px-4 py-2 border-b-2 transition-colors inline-flex items-center gap-1 ${
                    activeTab === t.key
                      ? 'border-cyan-600 text-cyan-700 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-cyan-700'
                  }`}
                >
                  <span className="text-[10px] opacity-60">🌐</span>{t.label}
                </Link>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Tab body */}
      <div className={`flex-1 min-h-0 ${
        activeTab === 'scenarios' || activeTab === 'conversations'
          ? 'overflow-hidden flex flex-col'
          : 'overflow-auto'
      }`}>
        {activeTab === 'scenarios' && <OaScenariosTab oaId={oaId} oa={oa} />}
        {activeTab === 'menus' && oa && <OaMenusTab oaId={oaId} oa={oa} onChange={setOa} />}
        {activeTab === 'overview' && <OaOverviewTab oaId={oaId} />}
        {activeTab === 'conversations' && <OaConversationsTab oaId={oaId} productId={oa?.product_id ?? null} />}
        {activeTab === 'settings' && oa && <OaSettingsTab oa={oa} onChange={setOa} />}

        {/* Product-scoped tabs: pass productId from the bound product.
           The same components rendered on /products/[id] — same data,
           same edits, just brought into the OA workspace so ops doesn't
           have to bounce. The 🌐 hint banner reminds it's shared. */}
        {oa?.product_id && (activeTab === 'content' || activeTab === 'missions' || activeTab === 'badges' || activeTab === 'journey' || activeTab === 'intents' || activeTab === 'questionnaires') && (
          <div className="p-6 max-w-5xl flex flex-col gap-3">
            <div className="hq-alert text-xs bg-cyan-50 text-cyan-800 border border-cyan-200">
              🌐 此頁編輯的是產品「{boundProduct?.name ?? oa.product_id}」的<strong>全域設定</strong>，所有綁此產品的 OA 都會同步生效。
              <Link href={`/products/${oa.product_id}`} className="underline ml-2">開啟產品設定 →</Link>
            </div>
            {activeTab === 'content'        && <ProductContentSection productId={oa.product_id} />}
            {activeTab === 'missions'       && <ProductMissionSection productId={oa.product_id} />}
            {activeTab === 'badges'         && <ProductBadgeSection productId={oa.product_id} />}
            {activeTab === 'journey'        && <ProductJourneySection productId={oa.product_id} />}
            {activeTab === 'intents'        && <ProductIntentSection productId={oa.product_id} />}
            {activeTab === 'questionnaires' && <ProductQuestionnaireSection productId={oa.product_id} />}
          </div>
        )}
      </div>
    </div>
  );
}
