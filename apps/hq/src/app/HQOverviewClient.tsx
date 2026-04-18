'use client';
import { useEffect, useState } from 'react';
import { apiFetch } from '@vitera/lib';

interface HQStats {
  oaCount: number;
  scenarioCount: number;
  activeScenarioCount: number;
  templateCount: number;
  deployedTemplateCount: number;
  recentAssignmentCount: number;
}

interface SchedulerResult {
  sent: number;
  skipped: number;
  errors: string[];
  enrollmentsConsidered: number;
}

export default function HQOverviewClient() {
  const [stats, setStats] = useState<HQStats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<SchedulerResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/hq/stats')
      .then(r => r.json())
      .then((data: HQStats) => setStats(data))
      .catch(err => {
        console.error('[hq/overview] stats error:', err);
        setLoadError('無法載入統計資料');
      });
  }, []);

  const handleRunScheduler = async () => {
    if (!window.confirm('執行推播排程？此動作會對所有符合條件的 LINE 使用者發送訊息。')) return;
    setRunning(true);
    setRunResult(null);
    setRunError(null);
    try {
      const res = await apiFetch('/api/scheduler/run', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setRunError(data.error || '執行失敗');
        return;
      }
      setRunResult(data as SchedulerResult);
    } catch (err) {
      setRunError((err as Error).message || '網路錯誤');
    } finally {
      setRunning(false);
    }
  };

  const cards = stats ? [
    { label: 'LINE OA 數量', value: String(stats.oaCount), trend: '', color: 'var(--hq-cyan)' },
    { label: '劇本總數', value: String(stats.scenarioCount), trend: `${stats.activeScenarioCount} active`, color: 'var(--hq-purple)' },
    { label: '選單模板', value: String(stats.templateCount), trend: `${stats.deployedTemplateCount} deployed`, color: 'var(--hq-success)' },
    { label: '近 7 日選單分配', value: String(stats.recentAssignmentCount), trend: '', color: 'var(--hq-text-muted)' },
  ] : [];

  return (
    <div className="hq-fade-in">
      <div className="hq-header">
        <h2>總覽 (Overview)</h2>
        <p>歡迎回到 HQ Control Center，這裡掌握四大健康模組的營運狀況。</p>
      </div>

      <div className="hq-grid-4">
        {!stats && !loadError && Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="hq-card">
            <div className="hq-metric-label">載入中...</div>
            <div className="hq-metric-value-row">
              <span className="hq-metric-value text-white/20">—</span>
            </div>
          </div>
        ))}
        {loadError && (
          <div className="hq-card hq-col-2">
            <p className="hq-empty-text">{loadError}</p>
          </div>
        )}
        {cards.map((metric, i) => (
          <div key={i} className="hq-card">
            <div className="hq-metric-label">{metric.label}</div>
            <div className="hq-metric-value-row">
              <span className="hq-metric-value">{metric.value}</span>
              {metric.trend && (
                <span className="hq-metric-trend" style={{ color: metric.color }}>{metric.trend}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="hq-card mt-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="hq-metric-label">推播排程 (Scheduler)</div>
            <p className="text-xs text-white/40 mt-1">依 <code className="text-white/60">LINE_OA_ID</code> 讀取 active scenarios，依使用者的 Day N 發送對應 push message，不重複。</p>
          </div>
          <button
            onClick={handleRunScheduler}
            disabled={running}
            className="shrink-0 text-sm px-4 py-2 rounded-lg bg-[rgba(124,92,252,0.2)] text-[#a78bfa] border border-[rgba(124,92,252,0.4)] hover:bg-[rgba(124,92,252,0.3)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            {running ? '執行中...' : '執行推播'}
          </button>
        </div>
        {runError && (
          <p className="mt-3 text-sm text-red-400">錯誤：{runError}</p>
        )}
        {runResult && (
          <div className="mt-3 text-xs text-white/70 space-y-1">
            <div>✅ 已送出：<span className="text-[#5ce0d8] font-semibold">{runResult.sent}</span> 則</div>
            <div>⏭ 已跳過（之前送過）：{runResult.skipped} 則</div>
            <div>👥 評估 enrollment 數：{runResult.enrollmentsConsidered}</div>
            {runResult.errors.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-amber-400/80">錯誤 {runResult.errors.length} 則</summary>
                <ul className="mt-1 pl-4 list-disc text-amber-300/70 font-mono text-[10px]">
                  {runResult.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      <div className="hq-grid-3">
        <div className="hq-card hq-col-2 hq-center-h min-h-300">
          <p className="hq-empty-text">流量報表圖即將推出 (Traffic Chart Placeholder)</p>
        </div>
        <div className="hq-card hq-center-h min-h-300">
          <p className="hq-empty-text">最新系統日誌即將推出 (Logs Placeholder)</p>
        </div>
      </div>
    </div>
  );
}
