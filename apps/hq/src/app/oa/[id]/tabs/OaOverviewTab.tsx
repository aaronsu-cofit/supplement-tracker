'use client';
import { apiFetch } from '@vitera/lib';
import { useEffect, useState } from 'react';

interface ActivityResponse {
  enrollments: Array<{ id: number; user_id: string; enrolled_at: string; scenario: { name: string } }>;
  deliveries: Array<{ id: number; user_id: string; node_id: string; delivered_at: string }>;
  engagement: Array<{ id: number; user_id: string; event_type: string; payload: string | null; occurred_at: string }>;
}

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function OaOverviewTab({ oaId }: { oaId: string }) {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch(`/api/scheduler/activity?oa_id=${oaId}`)
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<ActivityResponse>;
      })
      .then(setData)
      .catch(err => {
        console.error('[oa/overview] error', err);
        setError('無法載入活動紀錄');
      });
  }, [oaId]);

  if (error) return <div className="p-6"><div className="hq-alert hq-alert-error">{error}</div></div>;
  if (!data) return <div className="p-6 text-slate-500">載入中...</div>;

  const { enrollments = [], deliveries = [], engagement = [] } = data;
  const cards = [
    { label: '活躍 Enrollments', value: enrollments.length },
    { label: '最近推播', value: deliveries.length },
    { label: '互動事件', value: engagement.length },
  ];

  return (
    <div className="p-6 flex flex-col gap-4 max-w-5xl">
      <div className="hq-grid-3">
        {cards.map(c => (
          <div key={c.label} className="hq-card">
            <div className="hq-metric-label">{c.label}</div>
            <div className="hq-metric-value-row">
              <span className="hq-metric-value">{c.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="hq-grid-3">
        <div className="hq-card">
          <div className="hq-metric-label">最近 Enrollments</div>
          {enrollments.length === 0 ? (
            <p className="text-slate-400 text-sm mt-2">尚無</p>
          ) : (
            <div className="mt-2 flex flex-col gap-1.5 max-h-80 overflow-y-auto text-xs">
              {enrollments.slice(0, 20).map(e => (
                <div key={e.id} className="flex items-center justify-between gap-2 py-1 border-b border-slate-100">
                  <span className="font-mono text-slate-600 truncate max-w-[120px]" title={e.user_id}>{e.user_id.slice(0, 10)}</span>
                  <span className="text-slate-600 truncate max-w-[100px]" title={e.scenario.name}>{e.scenario.name}</span>
                  <span className="text-slate-400 whitespace-nowrap">{formatTs(e.enrolled_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="hq-card">
          <div className="hq-metric-label">最近推播 Deliveries</div>
          {deliveries.length === 0 ? (
            <p className="text-slate-400 text-sm mt-2">尚無</p>
          ) : (
            <div className="mt-2 flex flex-col gap-1.5 max-h-80 overflow-y-auto text-xs">
              {deliveries.slice(0, 20).map(d => (
                <div key={d.id} className="flex items-center justify-between gap-2 py-1 border-b border-slate-100">
                  <span className="font-mono text-slate-600 truncate max-w-[120px]" title={d.user_id}>{d.user_id.slice(0, 10)}</span>
                  <span className="text-slate-600 truncate max-w-[100px]" title={d.node_id}>{d.node_id}</span>
                  <span className="text-slate-400 whitespace-nowrap">{formatTs(d.delivered_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="hq-card">
          <div className="hq-metric-label">互動事件 Engagement</div>
          {engagement.length === 0 ? (
            <p className="text-slate-400 text-sm mt-2">尚無</p>
          ) : (
            <div className="mt-2 flex flex-col gap-1.5 max-h-80 overflow-y-auto text-xs">
              {engagement.slice(0, 20).map(e => (
                <div key={e.id} className="flex items-center justify-between gap-2 py-1 border-b border-slate-100">
                  <span className="font-mono text-slate-600 truncate max-w-[100px]" title={e.user_id}>{e.user_id.slice(0, 10)}</span>
                  <span className={`hq-badge ${e.event_type === 'postback' ? 'hq-badge-purple' : 'hq-badge-gray'}`}>{e.event_type}</span>
                  <span className="text-slate-400 whitespace-nowrap">{formatTs(e.occurred_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
