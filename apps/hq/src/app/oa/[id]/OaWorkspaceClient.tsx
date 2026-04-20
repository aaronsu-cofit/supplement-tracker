'use client';
import { apiFetch } from '@vitera/lib';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { LineOA } from '../../../types';
import WizardPageClient from '../../wizard/WizardPageClient';
import OaOverviewTab from './tabs/OaOverviewTab';
import OaMenusTab from './tabs/OaMenusTab';
import OaSettingsTab from './tabs/OaSettingsTab';

type TabKey = 'scenarios' | 'menus' | 'overview' | 'settings';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'scenarios', label: '劇本' },
  { key: 'menus', label: '選單' },
  { key: 'overview', label: '概覽' },
  { key: 'settings', label: '設定' },
];

export default function OaWorkspaceClient({ oaId }: { oaId: string }) {
  const params = useSearchParams();
  const rawTab = params.get('tab') as TabKey | null;
  const activeTab: TabKey = TABS.some(t => t.key === rawTab) ? (rawTab as TabKey) : 'scenarios';

  const [oa, setOa] = useState<LineOA | null>(null);
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
        </div>
        <div className="px-6 flex items-center gap-1">
          {TABS.map(t => (
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
        </div>
      </div>

      {/* Tab body — scenarios runs fullscreen canvas, others scroll normally */}
      <div className={`flex-1 min-h-0 ${activeTab === 'scenarios' ? 'overflow-hidden flex flex-col' : 'overflow-auto'}`}>
        {activeTab === 'scenarios' && <WizardPageClient forcedOaId={oaId} />}
        {activeTab === 'menus' && oa && <OaMenusTab oaId={oaId} oa={oa} onChange={setOa} />}
        {activeTab === 'overview' && <OaOverviewTab oaId={oaId} />}
        {activeTab === 'settings' && oa && <OaSettingsTab oa={oa} onChange={setOa} />}
      </div>
    </div>
  );
}
