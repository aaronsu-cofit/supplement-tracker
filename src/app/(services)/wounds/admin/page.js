'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function WoundsAdminDashboard() {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // In a real app we'd fetch all users' wounds. For demo V1, we fetch the current user's wounds 
        // to simulate a connected dashboard using the data we just generated in /scan
        const fetchDemoData = async () => {
            try {
                const woundsRes = await fetch('/api/wounds');
                if (woundsRes.ok) {
                    const woundsList = await woundsRes.json();
                    
                    // Fetch logs for the first wound as a demo
                    if (woundsList.length > 0) {
                        const logsRes = await fetch(`/api/wounds/${woundsList[0].id}/logs`);
                        const logs = await logsRes.json();
                        
                        setPatients([{
                            id: 'p-001',
                            name: '林先生',
                            wound_id: woundsList[0].id,
                            surgery_date: woundsList[0].date_of_injury,
                            latest_log: logs[0] || null,
                            history: logs
                        }]);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchDemoData();
    }, []);

    if (loading) return <div style={{ padding: '2rem' }}>載入遠距病房資料中...</div>;

    return (
        <div style={{ padding: '1.5rem', fontFamily: 'sans-serif', background: '#f8f9fa', minHeight: '100vh' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '2px solid #eee', paddingBottom: '1rem' }}>
                <h1 style={{ fontSize: '1.5rem', color: '#2c3e50', margin: 0 }}>🏥 遠距傷口追蹤中心 (Demo)</h1>
                <Link href="/wounds" style={{ color: '#3498db', textDecoration: 'none', fontWeight: 'bold' }}>返回病患端</Link>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                {/* Left Col: Patient List */}
                <div style={{ background: '#fff', padding: '1rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ fontSize: '1.1rem', color: '#7f8c8d', marginBottom: '1rem' }}>高風險預警清單</h2>
                    
                    {patients.length === 0 ? (
                        <p style={{ color: '#aaa', fontSize: '0.9rem' }}>目前無病患資料</p>
                    ) : (
                        patients.map(p => {
                            const isHighRisk = p.latest_log?.ai_status_label?.includes('諮詢') || p.latest_log?.nrs_pain_score > 6;
                            return (
                                <div key={p.id} style={{
                                    borderLeft: `4px solid ${isHighRisk ? '#e74c3c' : '#2ecc71'}`,
                                    padding: '1rem',
                                    background: isHighRisk ? '#fff5f5' : '#f9fff9',
                                    borderRadius: '0 8px 8px 0',
                                    marginBottom: '1rem',
                                    cursor: 'pointer'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <b style={{ color: '#2c3e50' }}>{p.name}</b>
                                        <span style={{ fontSize: '0.8rem', color: '#888' }}>
                                            NRS: {p.latest_log?.nrs_pain_score || 0}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>
                                        {p.latest_log?.ai_status_label || '尚未分析'}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Right Col: Patient Detail */}
                <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    {patients.length > 0 && patients[0].latest_log ? (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <h2 style={{ margin: '0 0 0.5rem 0', color: '#2c3e50' }}>{patients[0].name} - 傷口發展史</h2>
                                    <span style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
                                        手術日期：{patients[0].surgery_date}
                                    </span>
                                </div>
                                <button style={{ background: '#3498db', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                                    📹 啟動遠距諮詢
                                </button>
                            </div>

                            {/* Timeline Slider */}
                            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                                {patients[0].history.map((log, idx) => (
                                    <div key={log.id} style={{ minWidth: '200px', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
                                        {log.image_data ? (
                                            <img src={log.image_data} alt="Wound" style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '140px', background: '#eee' }}></div>
                                        )}
                                        <div style={{ padding: '0.8rem' }}>
                                            <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.3rem' }}>
                                                {new Date(log.logged_at).toLocaleDateString()}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#333' }}>
                                                {log.ai_status_label}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Medical Summary Draft */}
                            <div style={{ marginTop: '1rem', padding: '1.5rem', background: '#f4f6f7', borderRadius: '8px' }}>
                                <h3 style={{ fontSize: '1rem', color: '#2c3e50', marginBottom: '0.8rem' }}>📝 AI 輔助健保申報摘要初稿</h3>
                                <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                    {patients[0].latest_log.ai_assessment_summary}
                                </p>
                                <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#7f8c8d' }}>
                                    病患主訴疼痛指數：{patients[0].latest_log.nrs_pain_score} / 10 <br/>
                                    病患主訴症狀：{patients[0].latest_log.symptoms}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: '#aaa', padding: '3rem' }}>請點選左側病患以查看詳情</div>
                    )}
                </div>
            </div>
        </div>
    );
}
