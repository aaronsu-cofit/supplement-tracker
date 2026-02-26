'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function WoundHistoryPage() {
    const router = useRouter();
    const [logs, setLogs] = useState([]);
    const [wound, setWound] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                // 1. Get the active wound
                const woundsRes = await fetch('/api/wounds');
                if (!woundsRes.ok) throw new Error('Failed to fetch wounds');
                const woundsData = await woundsRes.json();
                
                if (woundsData.length === 0) {
                    setLoading(false);
                    return;
                }
                const activeWound = woundsData[0];
                setWound(activeWound);

                // 2. Get history logs for this wound
                const logsRes = await fetch(`/api/wounds/${activeWound.id}/logs`);
                if (logsRes.ok) {
                    const logsData = await logsRes.json();
                    setLogs(logsData);
                }
            } catch (error) {
                console.error('Error fetching history:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>載入歷史紀錄中...</div>;
    }

    if (!wound || logs.length === 0) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                <h3 style={{ color: '#333' }}>尚無歷史紀錄</h3>
                <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '2rem' }}>您還沒有建立過傷口拍攝紀錄喔！</p>
                <button onClick={() => router.push('/wounds')} style={primaryBtnStyle}>
                    返回首頁
                </button>
            </div>
        );
    }

    const start_date = new Date(wound.date_of_injury);

    return (
        <div style={{ padding: '1rem', fontFamily: 'sans-serif', paddingBottom: '5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
                <button 
                    onClick={() => router.push('/wounds')}
                    style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
                >
                    ←
                </button>
                <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#333' }}>📅 復原歷程與時間軸</h2>
            </div>
            
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '2rem' }}>
                受傷日期：{start_date.toLocaleDateString('zh-TW')}
            </p>

            <div style={{ position: 'relative', paddingLeft: '20px' }}>
                {/* Vertical Line */}
                <div style={{
                    position: 'absolute',
                    left: '26px',
                    top: '10px',
                    bottom: '10px',
                    width: '3px',
                    background: '#ffe3e3',
                    zIndex: 0
                }}></div>

                {logs.map((log, index) => {
                    const logDate = new Date(log.logged_at);
                    const daysSince = Math.max(1, Math.ceil((logDate - start_date) / (1000 * 60 * 60 * 24)));
                    const isConcern = log.ai_status_label?.includes('留意') || log.ai_status_label?.includes('諮詢');
                    const dotColor = isConcern ? '#ffa502' : '#2ed573';

                    return (
                        <div key={log.id} style={{ position: 'relative', zIndex: 1, marginBottom: '2rem' }}>
                            {/* Dot */}
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                top: '15px',
                                width: '15px',
                                height: '15px',
                                borderRadius: '50%',
                                background: dotColor,
                                border: '3px solid #fff',
                                boxShadow: '0 0 0 2px #ffe3e3'
                            }}></div>
                            
                            {/* Content Card */}
                            <div style={{ marginLeft: '30px', background: '#fff', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.8rem' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold', color: '#ff6b6b', fontSize: '1rem', marginBottom: '0.2rem' }}>
                                            第 {daysSince} 天
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: '#999' }}>
                                            {logDate.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <div style={{
                                        background: isConcern ? '#fff3cd' : '#d4edda',
                                        color: isConcern ? '#856404' : '#155724',
                                        padding: '0.3rem 0.6rem',
                                        borderRadius: '12px',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold'
                                    }}>
                                        {isConcern ? '留意觀察' : '穩定復原'}
                                    </div>
                                </div>

                                {log.image_data && (
                                    <div style={{ marginBottom: '1rem', borderRadius: '8px', overflow: 'hidden', maxHeight: '150px', position: 'relative' }}>
                                        <img 
                                            src={log.image_data} 
                                            alt={`Day ${daysSince} wound`} 
                                            style={{ width: '100%', height: '150px', objectFit: 'cover' }} 
                                        />
                                    </div>
                                )}

                                <div style={{ fontSize: '0.85rem', color: '#555', lineHeight: 1.5, marginBottom: '0.8rem', whiteSpace: 'pre-wrap' }}>
                                    {log.ai_assessment_summary || '無紀錄。'}
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid #eee', paddingTop: '0.8rem', fontSize: '0.8rem', color: '#888' }}>
                                    <span>🌡️ 痛感: {log.nrs_pain_score}/10</span>
                                    <span>📝 異常: {log.symptoms || '皆無'}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const primaryBtnStyle = {
    display: 'inline-block',
    background: '#ff6b6b',
    color: '#fff',
    padding: '0.8rem 1.5rem',
    borderRadius: '25px',
    border: 'none',
    fontWeight: 'bold',
    fontSize: '1rem',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(255,107,107,0.2)'
};
