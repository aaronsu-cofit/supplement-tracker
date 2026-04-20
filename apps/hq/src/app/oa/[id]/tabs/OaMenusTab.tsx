'use client';
import { apiFetch } from '@vitera/lib';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { LineOA, LineTemplate } from '../../../../types';

interface Props {
  oaId: string;
  oa: LineOA;
  onChange: (oa: LineOA) => void;
}

interface Assignment {
  id: number;
  user_id: string;
  template_id: number | null;
  template_name: string | null;
  source: string;
  assigned_at: string;
}

export default function OaMenusTab({ oaId, oa }: Props) {
  const [templates, setTemplates] = useState<LineTemplate[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiFetch(`/api/line/oa/${oaId}/templates`).then(r => r.json()).catch(() => ({ templates: [] })),
      apiFetch(`/api/menu/assignments/${oaId}`).then(r => r.json()).catch(() => []),
    ]).then(([tpls, assigns]) => {
      if (cancelled) return;
      setTemplates((tpls?.templates as LineTemplate[]) ?? []);
      setAssignments(Array.isArray(assigns) ? assigns : []);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [oaId]);

  if (loading) return <div className="p-6 text-slate-500">載入中...</div>;

  return (
    <div className="p-6 max-w-5xl flex flex-col gap-4">
      <div className="hq-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Rich Menu Templates</h3>
          <Link
            href={`/lineoamenu`}
            className="text-sm text-slate-500 hover:text-slate-800 underline"
          >
            進入完整編輯介面 →
          </Link>
        </div>
        {!oa.is_active && (
          <div className="hq-alert hq-alert-error mb-3">此 OA 已停用，無法部署新 Rich Menu</div>
        )}
        {templates.length === 0 ? (
          <p className="text-slate-500 text-sm">尚無模板 — 請到「進入完整編輯介面」建立</p>
        ) : (
          <div className="flex flex-col gap-2">
            {templates.map(t => (
              <div key={t.id} className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{t.name}</div>
                  <div className="text-xs text-slate-500 font-mono">#{t.id}</div>
                </div>
                <div className="flex items-center gap-2">
                  {t.line_rich_menu_id ? (
                    <span className="text-xs text-emerald-600">✓ deployed</span>
                  ) : (
                    <span className="text-xs text-amber-600">未部署</span>
                  )}
                  {t.is_active && (
                    <span className="hq-badge hq-badge-green">啟用</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="hq-card">
        <h3 className="font-semibold text-lg mb-3">使用者選單分配（近 {assignments.length} 筆）</h3>
        {assignments.length === 0 ? (
          <p className="text-slate-500 text-sm">尚無分配紀錄</p>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-96 overflow-y-auto text-sm">
            {assignments.map(a => (
              <div key={a.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100">
                <span className="font-mono text-slate-600 truncate max-w-[180px]" title={a.user_id}>{a.user_id}</span>
                <span className={`hq-badge ${
                  a.source === 'rule' ? 'hq-badge-green' :
                  a.source === 'ai' ? 'hq-badge-purple' : 'hq-badge-gray'
                }`}>{a.source}</span>
                <span className="text-slate-600 truncate max-w-[160px]" title={a.template_name ?? ''}>
                  {a.template_name ?? (a.template_id != null ? `#${a.template_id}` : '無選單')}
                </span>
                <span className="text-slate-400 whitespace-nowrap text-xs">
                  {new Date(a.assigned_at).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
