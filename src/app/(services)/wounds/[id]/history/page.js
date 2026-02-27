'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function WoundHistoryPage() {
    const { id } = useParams();
    const [logs, setLogs] = useState([]);
    const [wound, setWound] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch(`/api/wounds/${id}`).then(r => r.ok ? r.json() : null),
            fetch(`/api/wounds/${id}/logs`).then(r => r.ok ? r.json() : []),
        ]).then(([w, l]) => {
            setWound(w);
            setLogs(Array.isArray(l) ? l : []);
        }).catch(console.error).finally(() => setLoading(false));
    }, [id]);

    const daysSince = (dateStr, refDate) => {
        if (!dateStr || !refDate) return '';
        const diff = Math.floor((new Date(dateStr).getTime() - new Date(refDate).getTime()) / 86400000);
        return diff >= 0 ? `第 ${diff + 1} 天` : '';
    };

    const getStatusStyle = (label) => {
        if (!label) return { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' };
        if (label.includes('穩定') || label.includes('符合')) return { bg: 'rgba(46,213,115,0.12)', color: '#2ed573' };
        if (label.includes('留意')) return { bg: 'rgba(255,165,2,0.12)', color: '#ffa502' };
        return { bg: 'rgba(255,71,87,0.12)', color: '#ff4757' };
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #ff9a9e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ padding: '0 1rem 6rem', maxWidth: 480, margin: '0 auto' }}>
            <Link href={`/wounds/${id}`} style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '1rem' }}>
                ← 返回傷口
            </Link>
            <h2 style={{ color: '#fff', fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.3rem' }}>📅 照護歷程</h2>
            {wound && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: '0 0 1.2rem' }}>{wound.name} ・ 受傷日期 {wound.date_of_injury}</p>}

            {logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 20, border: '1px dashed rgba(255,255,255,0.15)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
                    <p style={{ color: 'rgba(255,255,255,0.5)' }}>尚無紀錄</p>
                    <Link href={`/wounds/${id}/scan`} style={{ color: '#ff9a9e', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>→ 開始第一次掃描</Link>
                </div>
            ) : (
                <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
                    {/* Timeline line */}
                    <div style={{
                        position: 'absolute', left: 5, top: 12, bottom: 12, width: 2,
                        background: 'linear-gradient(to bottom, rgba(255,154,158,0.3), rgba(255,154,158,0.05))',
                    }} />

                    {logs.map((log, i) => {
                        const st = getStatusStyle(log.ai_status_label);
                        return (
                            <div key={log.id || i} style={{ position: 'relative', marginBottom: '1rem' }}>
                                {/* Dot */}
                                <div style={{
                                    position: 'absolute', left: '-1.5rem', top: 18, width: 12, height: 12,
                                    borderRadius: '50%', background: '#ff9a9e',
                                    boxShadow: '0 0 8px rgba(255,154,158,0.4)',
                                }} />
                                {/* Card */}
                                <div style={{
                                    background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(16px)',
                                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1rem',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>
                                            {new Date(log.logged_at || log.date).toLocaleDateString('zh-TW')} {daysSince(log.date, wound?.date_of_injury)}
                                        </span>
                                        <span style={{ background: st.bg, color: st.color, padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 600 }}>
                                            {log.ai_status_label || '—'}
                                        </span>
                                    </div>
                                    {log.image_data && (
                                        <img src={log.image_data} alt="" style={{ width: '100%', borderRadius: 10, maxHeight: 160, objectFit: 'cover', marginBottom: '0.5rem' }} />
                                    )}
                                    {log.ai_assessment_summary && (
                                        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem', lineHeight: 1.6, margin: '0 0 0.5rem', whiteSpace: 'pre-wrap' }}>
                                            {log.ai_assessment_summary.length > 120 ? log.ai_assessment_summary.slice(0, 120) + '...' : log.ai_assessment_summary}
                                        </p>
                                    )}
                                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.75rem', color: log.nrs_pain_score <= 3 ? '#2ed573' : log.nrs_pain_score <= 6 ? '#ffa502' : '#ff4757' }}>
                                            🌡️ NRS {log.nrs_pain_score}/10
                                        </span>
                                        {log.symptoms && <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>📝 {log.symptoms}</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
