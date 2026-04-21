'use client';
import { apiFetch } from '@vitera/lib';
import { useCallback, useEffect, useState } from 'react';

interface DeliveryRow {
  id: number;
  user_id: string;
  scenario_id: string;
  node_id: string;
  delivered_at: string;
  scenario_name: string | null;
  node_type: string | null;
  node_data: Record<string, unknown> | null;
}

interface ActivityResponse {
  enrollments: Array<{ id: number; user_id: string; enrolled_at: string; scenario: { name: string } }>;
  deliveries: DeliveryRow[];
  engagement: Array<{ id: number; user_id: string; event_type: string; payload: string | null; occurred_at: string }>;
}

interface SchedulerRunResult {
  sent: number;
  skipped: number;
  errors: string[];
  enrollmentsConsidered: number;
  menuReeval?: { assigned?: number; skipped?: number; errors?: string[] };
}

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function nodeTypeBadge(type: string | null): string {
  switch (type) {
    case 'push-message-node': return 'hq-badge hq-badge-green';
    case 'ai-skill-node': return 'hq-badge hq-badge-purple';
    case 'menu-change-node': return 'hq-badge hq-badge-blue';
    case 'mission-assign-node': return 'hq-badge hq-badge-purple';
    case 'streak-increment-node': return 'hq-badge hq-badge-green';
    case 'set-attribute-node': return 'hq-badge hq-badge-gray';
    default: return 'hq-badge hq-badge-gray';
  }
}

function nodeTypeShortLabel(type: string | null): string {
  switch (type) {
    case 'push-message-node': return '訊息';
    case 'ai-skill-node': return 'AI';
    case 'menu-change-node': return '選單';
    case 'mission-assign-node': return '任務';
    case 'streak-increment-node': return '連續';
    case 'set-attribute-node': return '屬性';
    default: return type ?? '?';
  }
}

function nodeSummary(row: DeliveryRow): string {
  const d = row.node_data ?? {};
  const get = (k: string) => typeof d[k] === 'string' ? (d[k] as string) : '';
  switch (row.node_type) {
    case 'push-message-node': {
      if (get('contentKey')) return `→ ${get('contentKey')}`;
      if (get('message')) {
        const msg = get('message');
        return msg.length > 30 ? msg.slice(0, 30) + '…' : msg;
      }
      return get('imageUrl') || get('stickerId') || '';
    }
    case 'ai-skill-node': return get('agentId');
    case 'menu-change-node': return get('menuName');
    case 'mission-assign-node': return get('missionKey');
    case 'streak-increment-node': return get('streakKey');
    case 'set-attribute-node': return `${get('attributeKey')}=${get('value')}`;
    default: return row.node_id.slice(0, 16);
  }
}

function engagementBadgeClass(eventType: string): string {
  switch (eventType) {
    case 'mission_completed': return 'hq-badge hq-badge-green';
    case 'badge_earned': return 'hq-badge hq-badge-purple';
    case 'streak_incremented': return 'hq-badge hq-badge-blue';
    case 'intent_matched': return 'hq-badge hq-badge-purple';
    case 'postback': return 'hq-badge hq-badge-purple';
    case 'text_reply': return 'hq-badge hq-badge-blue';
    default: return 'hq-badge hq-badge-gray';
  }
}

export default function OaOverviewTab({ oaId }: { oaId: string }) {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<SchedulerRunResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const load = useCallback(() => {
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

  useEffect(() => { load(); }, [load]);

  const handleRunNow = async () => {
    setRunning(true);
    setRunError(null);
    setLastRun(null);
    try {
      const res = await apiFetch('/api/scheduler/run', { method: 'POST' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setLastRun(body as SchedulerRunResult);
      load();
    } catch (err) {
      setRunError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  if (error) return <div className="p-6"><div className="hq-alert hq-alert-error">{error}</div></div>;
  if (!data) return <div className="p-6 text-slate-500">載入中...</div>;

  const { enrollments = [], deliveries = [], engagement = [] } = data;
  const cards = [
    { label: '活躍 Enrollments', value: enrollments.length },
    { label: '最近 Deliveries', value: deliveries.length },
    { label: '互動事件', value: engagement.length },
  ];

  return (
    <div className="p-6 flex flex-col gap-4 max-w-5xl">
      <div className="hq-card flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h3 className="font-semibold text-lg">排程控制</h3>
            <p className="text-xs text-slate-500 m-0">
              排程每日自動執行；此按鈕可立即觸發以測試新劇本、動作節點的行為。執行後下方活動會自動更新。
            </p>
          </div>
          <button onClick={handleRunNow} disabled={running}
            className="hq-btn-primary text-sm disabled:opacity-50">
            {running ? '執行中…' : '立即執行排程'}
          </button>
        </div>
        {runError && <div className="hq-alert hq-alert-error">{runError}</div>}
        {lastRun && (
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 text-sm flex flex-col gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span>已送出 <strong className="text-emerald-700">{lastRun.sent}</strong></span>
              <span>已跳過 <strong className="text-slate-600">{lastRun.skipped}</strong></span>
              <span>考慮 enrollments <strong className="text-slate-600">{lastRun.enrollmentsConsidered}</strong></span>
              {lastRun.menuReeval && (
                <span>選單重新評估 <strong className="text-slate-600">{lastRun.menuReeval.assigned ?? 0}</strong></span>
              )}
              {lastRun.errors.length > 0 && (
                <span className="text-red-600">錯誤 {lastRun.errors.length}</span>
              )}
            </div>
            {lastRun.errors.length > 0 && (
              <details className="text-xs text-red-700">
                <summary className="cursor-pointer">查看錯誤</summary>
                <ul className="mt-1 list-disc pl-5 flex flex-col gap-0.5">
                  {lastRun.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

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
          <div className="hq-metric-label">最近 Deliveries</div>
          {deliveries.length === 0 ? (
            <p className="text-slate-400 text-sm mt-2">尚無</p>
          ) : (
            <div className="mt-2 flex flex-col gap-1.5 max-h-80 overflow-y-auto text-xs">
              {deliveries.slice(0, 30).map(d => (
                <div key={d.id} className="flex flex-col gap-1 py-1 border-b border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <span className={nodeTypeBadge(d.node_type)}>{nodeTypeShortLabel(d.node_type)}</span>
                    <span className="text-slate-700 truncate flex-1" title={nodeSummary(d)}>{nodeSummary(d)}</span>
                    <span className="text-slate-400 whitespace-nowrap">{formatTs(d.delivered_at)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="font-mono truncate max-w-[100px]" title={d.user_id}>{d.user_id.slice(0, 8)}</span>
                    {d.scenario_name && <span className="truncate max-w-[100px]" title={d.scenario_name}>{d.scenario_name}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="hq-card">
          <div className="hq-metric-label">互動事件</div>
          {engagement.length === 0 ? (
            <p className="text-slate-400 text-sm mt-2">尚無</p>
          ) : (
            <div className="mt-2 flex flex-col gap-1.5 max-h-80 overflow-y-auto text-xs">
              {engagement.slice(0, 30).map(e => (
                <div key={e.id} className="flex flex-col gap-0.5 py-1 border-b border-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <span className={engagementBadgeClass(e.event_type)}>{e.event_type}</span>
                    {e.payload && <span className="text-slate-600 truncate flex-1" title={e.payload}>{e.payload}</span>}
                    <span className="text-slate-400 whitespace-nowrap">{formatTs(e.occurred_at)}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 truncate max-w-full" title={e.user_id}>
                    {e.user_id.slice(0, 10)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
