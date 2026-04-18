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

export default function HQOverviewClient() {
  const [stats, setStats] = useState<HQStats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/hq/stats')
      .then(r => r.json())
      .then((data: HQStats) => setStats(data))
      .catch(err => {
        console.error('[hq/overview] stats error:', err);
        setLoadError('無法載入統計資料');
      });
  }, []);

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
