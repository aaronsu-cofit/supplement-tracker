'use client';

export default function HQOverviewClient() {
    return (
        <div className="hq-fade-in">
            <div className="hq-header">
                <h2>總覽 (Overview)</h2>
                <p>歡迎回到 HQ Control Center，這裡掌握四大健康模組的營運狀況。</p>
            </div>

            <div className="hq-grid-4">
                {/* Metric Cards */}
                {[
                    { label: '本週活躍用戶', value: '1,204', trend: '+14%', color: 'var(--hq-success)' },
                    { label: '上傳圖片總數', value: '45,892', trend: '+5%', color: 'var(--hq-cyan)' },
                    { label: 'AI 分析次數', value: '12,050', trend: '+22%', color: 'var(--hq-purple)' },
                    { label: '系統異常回報', value: '0', trend: 'Healthy', color: 'var(--hq-text-muted)' },
                ].map((metric, i) => (
                    <div key={i} className="hq-card">
                        <div className="hq-metric-label">{metric.label}</div>
                        <div className="hq-metric-value-row">
                            <span className="hq-metric-value">{metric.value}</span>
                            <span className="hq-metric-trend" style={{ color: metric.color }}>{metric.trend}</span>
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
