'use client';
import { apiFetch } from '@cofit/lib';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WoundHistoryPage() {
    const router = useRouter();
    const [logs, setLogs] = useState([]);
    const [wound, setWound] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const woundsRes = await apiFetch('/api/wounds');
                if (!woundsRes.ok) throw new Error('Failed to fetch wounds');
                const woundsData = await woundsRes.json();

                if (woundsData.length === 0) { setLoading(false); return; }
                const activeWound = woundsData[0];
                setWound(activeWound);

                const logsRes = await apiFetch(`/api/wounds/${activeWound.id}/logs`);
                if (logsRes.ok) setLogs(await logsRes.json());
            } catch (error) { console.error('Error fetching history:', error); }
            finally { setLoading(false); }
        };
        fetchHistory();
    }, []);

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                <div style={styles.spinner}></div>
                <p style={{ marginTop: '1rem' }}>載入歷史紀錄中...</p>
            </div>
        );
    }

    if (!wound || logs.length === 0) {
        return (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem', filter: 'drop-shadow(0 0 15px rgba(255,154,158,0.2))' }}>📭</div>
                <h3 style={{ color: '#fff', margin: '0 0 0.5rem' }}>尚無歷史紀錄</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    您還沒有建立過傷口拍攝紀錄喔！
                </p>
                <button onClick={() => router.push('/wounds')} style={styles.primaryBtn}>返回首頁</button>
            </div>
        );
    }

    const startDate = new Date(wound.date_of_injury);

    return (
        <div style={{ padding: '1.2rem', fontFamily: "'Inter', 'SF Pro', sans-serif", paddingBottom: '5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '0.8rem' }}>
                <button
                    onClick={() => router.push('/wounds')}
                    style={styles.backBtn}
                >←</button>
                <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>復原歷程與時間軸</h2>
            </div>

            {/* Date Badge */}
            <div style={styles.dateBadge}>
                <span style={{ fontSize: '0.8rem' }}>📅</span>
                <span>受傷日期：{startDate.toLocaleDateString('zh-TW')}</span>
            </div>

            {/* Timeline */}
            <div style={{ position: 'relative', paddingLeft: '22px' }}>
                {/* Vertical Line */}
                <div style={styles.timelineLine}></div>

                {logs.map((log, index) => {
                    const logDate = new Date(log.logged_at);
                    const daysSince = Math.max(1, Math.ceil((logDate - startDate) / (1000 * 60 * 60 * 24)));
                    const isConcern = log.ai_status_label?.includes('留意') || log.ai_status_label?.includes('諮詢');
                    const dotColor = isConcern ? '#ffa502' : '#2ed573';

                    return (
                        <div key={log.id} style={{ position: 'relative', zIndex: 1, marginBottom: '1.5rem' }}>
                            {/* Dot with glow */}
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                top: '16px',
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                background: dotColor,
                                border: '3px solid #1a1225',
                                boxShadow: `0 0 0 2px ${dotColor}30, 0 0 12px ${dotColor}40`,
                            }}></div>

                            {/* Content Card */}
                            <div style={styles.timelineCard}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                                    <div>
                                        <div style={{
                                            fontWeight: 800,
                                            background: 'linear-gradient(135deg, #ff9a9e, #fda085)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            fontSize: '1rem',
                                            marginBottom: '0.15rem',
                                        }}>
                                            第 {daysSince} 天
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
                                            {logDate.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <div style={{
                                        background: isConcern ? 'rgba(255,165,2,0.15)' : 'rgba(46,213,115,0.15)',
                                        border: `1px solid ${isConcern ? 'rgba(255,165,2,0.3)' : 'rgba(46,213,115,0.3)'}`,
                                        color: isConcern ? '#ffa502' : '#2ed573',
                                        padding: '0.25rem 0.6rem',
                                        borderRadius: '20px',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                    }}>
                                        {isConcern ? '留意觀察' : '穩定復原'}
                                    </div>
                                </div>

                                {log.image_data && (
                                    <div style={{ marginBottom: '0.8rem', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <img
                                            src={log.image_data}
                                            alt={`Day ${daysSince} wound`}
                                            style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }}
                                        />
                                    </div>
                                )}

                                <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: '0.8rem', whiteSpace: 'pre-wrap' }}>
                                    {log.ai_assessment_summary || '無紀錄。'}
                                </div>

                                <div style={{
                                    display: 'flex', gap: '1rem',
                                    borderTop: '1px solid rgba(255,255,255,0.06)',
                                    paddingTop: '0.7rem',
                                    fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)',
                                }}>
                                    <span>🌡️ 痛感: <b style={{ color: 'rgba(255,255,255,0.6)' }}>{log.nrs_pain_score}/10</b></span>
                                    <span>📝 異常: <b style={{ color: 'rgba(255,255,255,0.6)' }}>{log.symptoms || '皆無'}</b></span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

const styles = {
    spinner: {
        width: '36px', height: '36px',
        border: '3px solid rgba(255,255,255,0.08)',
        borderTop: '3px solid #ff9a9e',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '3rem auto 0',
    },
    primaryBtn: {
        display: 'inline-block',
        background: 'linear-gradient(135deg, #ff9a9e, #fda085)',
        color: '#fff',
        padding: '0.85rem 2rem',
        borderRadius: '50px',
        border: 'none',
        fontWeight: 700,
        fontSize: '0.95rem',
        cursor: 'pointer',
        boxShadow: '0 4px 20px rgba(255,154,158,0.3)',
    },
    backBtn: {
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px',
        width: '36px', height: '36px',
        fontSize: '1.1rem',
        color: 'rgba(255,255,255,0.6)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    dateBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '20px',
        padding: '0.35rem 0.8rem',
        fontSize: '0.8rem',
        color: 'rgba(255,255,255,0.4)',
        marginBottom: '1.5rem',
    },
    timelineLine: {
        position: 'absolute',
        left: '28px',
        top: '10px',
        bottom: '10px',
        width: '2px',
        background: 'linear-gradient(180deg, rgba(255,154,158,0.3) 0%, rgba(255,154,158,0.05) 100%)',
        zIndex: 0,
    },
    timelineCard: {
        marginLeft: '30px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '14px',
        padding: '1rem',
    },
};
