'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function WoundsAdminDashboard() {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedPatient, setSelectedPatient] = useState(null);
    const [generatingSoap, setGeneratingSoap] = useState(false);
    const [soapNote, setSoapNote] = useState(null);

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const res = await fetch('/api/admin/wounds');
                if (res.ok) {
                    const woundsList = await res.json();
                    // Generate distinguishable names for real patients
                    const surnames = ['李', '王', '陳', '林', '黃', '周', '吳', '謝', '趙', '劉'];
                    const mappedPatients = woundsList.map((w, idx) => {
                        const dateLabel = w.date_of_injury 
                            ? new Date(w.date_of_injury).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
                            : '';
                        const generatedName = `${surnames[idx % surnames.length]}先生` + (dateLabel ? ` (${dateLabel})` : '');
                        return {
                            id: w.id,
                            name: generatedName,
                            wound_id: w.id,
                            surgery_date: w.date_of_injury,
                            latest_log: w.logs?.[0] || null,
                            history: w.logs || []
                        };
                    });

                    // Inline SVG placeholder for demo patient photos
                    const demoImg = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect fill="%23e8f5e9" width="300" height="200"/><text x="150" y="90" text-anchor="middle" fill="%232e7d32" font-size="40">🩹</text><text x="150" y="130" text-anchor="middle" fill="%23388e3c" font-size="14" font-family="sans-serif">傷口紀錄照片</text></svg>')}`;

                    const demoPatient = {
                        id: 'demo-1',
                        name: '張大明 (Demo)',
                        wound_id: 'demo',
                        surgery_date: '2023-10-01',
                        latest_log: {
                            logged_at: new Date().toISOString(),
                            nrs_pain_score: 3,
                            symptoms: '無明顯不適',
                            ai_status_label: '✅ 穩定復原',
                            ai_assessment_summary: '傷口紅腫已消退，滲出液減少，癒合狀況良好。',
                            image_data: demoImg
                        },
                        history: [
                            {
                                id: 'h1',
                                logged_at: new Date(Date.now() - 14 * 86400000).toISOString(),
                                ai_status_label: '⚠️ 留意觀察',
                                image_data: demoImg
                            },
                            {
                                id: 'h2',
                                logged_at: new Date(Date.now() - 7 * 86400000).toISOString(),
                                ai_status_label: '✅ 穩定復原',
                                image_data: demoImg
                            }
                        ]
                    };

                    const finalPatients = [demoPatient, ...mappedPatients];
                    setPatients(finalPatients);
                    if (finalPatients.length > 0) setSelectedPatient(finalPatients[0]);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, []);

    const handleSelectPatient = (p) => {
        setSelectedPatient(p);
        setSoapNote(null);
    };

    const handleGenerateSoap = async () => {
        if (!selectedPatient) return;
        setGeneratingSoap(true);
        setSoapNote(null);

        if (selectedPatient.wound_id === 'demo') {
            setTimeout(() => {
                setSoapNote(`S (Subjective - 主觀資料):
病患表示這幾日痛感從初始的 7 分下降到 3 分，目前未感覺到明顯發熱或異味。

O (Objective - 客觀資料):
根據連續 14 天影像紀錄，初期傷口周圍有輕微紅腫與較多黃色滲出液。至第 7 天紅腫顯著消退，第 14 天滲出液極少，傷口邊緣已開始進行上皮化收斂。

A (Assessment - 評估):
傷口癒合進度符合預期，無明顯感染徵兆。目前處於穩定復原階段，上皮化進展良好。

P (Plan - 計畫):
建議持續更換防水泡棉敷料保持乾淨。可開始在新生皮膚處塗抹少量矽膠除疤凝膠，並於一週後來院拆線或進行後續追蹤。`);
                setGeneratingSoap(false);
            }, 1500);
            return;
        }

        try {
            const res = await fetch(`/api/wounds/${selectedPatient.wound_id}/soap`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setSoapNote(data.soap_note);
            } else {
                alert('SOAP 生成失敗');
            }
        } catch (err) {
            console.error(err);
            alert('發生錯誤');
        } finally {
            setGeneratingSoap(false);
        }
    };

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
                                <div key={p.id} onClick={() => handleSelectPatient(p)} style={{
                                    borderLeft: `4px solid ${isHighRisk ? '#e74c3c' : '#2ecc71'}`,
                                    padding: '1rem',
                                    background: selectedPatient?.id === p.id 
                                        ? (isHighRisk ? '#ffecec' : '#eafaf1') 
                                        : (isHighRisk ? '#fff5f5' : '#f9fff9'),
                                    borderRadius: '0 8px 8px 0',
                                    marginBottom: '1rem',
                                    cursor: 'pointer',
                                    boxShadow: selectedPatient?.id === p.id ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
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
                    {selectedPatient ? (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                                <div>
                                    <h2 style={{ margin: '0 0 0.5rem 0', color: '#2c3e50' }}>{selectedPatient.name} - 傷口發展史</h2>
                                    <span style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
                                        手術日期：{selectedPatient.surgery_date}
                                    </span>
                                </div>
                                <button style={{ background: '#3498db', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                                    📹 啟動遠距諮詢
                                </button>
                            </div>

                            {/* Timeline Slider */}
                            <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem' }}>
                                {selectedPatient.history.length === 0 ? (
                                    <div style={{ color: '#aaa', fontSize: '0.9rem' }}>尚無歷史紀錄</div>
                                ) : (
                                    selectedPatient.history.map((log, idx) => (
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
                                    ))
                                )}
                            </div>

                            {/* Medical Summary Draft */}
                            <div style={{ marginTop: '1rem', padding: '1.5rem', background: '#f4f6f7', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', color: '#2c3e50', margin: 0 }}>📝 醫療護理紀錄 (SOAP)</h3>
                                    <button 
                                        onClick={handleGenerateSoap}
                                        disabled={generatingSoap || selectedPatient.history.length === 0}
                                        style={{ 
                                            background: '#8e44ad', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', 
                                            borderRadius: '6px', cursor: generatingSoap ? 'not-allowed' : 'pointer',
                                            opacity: generatingSoap ? 0.7 : 1
                                        }}
                                    >
                                        {generatingSoap ? '⏳ 正在分析 14 天紀錄...' : '✨ 一鍵生成 SOAP 病歷'}
                                    </button>
                                </div>
                                
                                {soapNote ? (
                                    <div style={{ background: '#fff', padding: '1rem', borderRadius: '6px', borderLeft: '4px solid #8e44ad', whiteSpace: 'pre-wrap', lineHeight: 1.6, color: '#444' }}>
                                        {soapNote}
                                    </div>
                                ) : (
                                    <div style={{ background: '#fff', padding: '1rem', borderRadius: '6px', color: '#aaa', fontStyle: 'italic' }}>
                                        點擊右上角按鈕，AI 將自動綜合過去 14 天照片變化與疼痛指數，撰寫專業的 SOAP 醫療筆記。
                                    </div>
                                )}

                                {selectedPatient.latest_log && (
                                    <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#7f8c8d', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
                                        <b>最新一日基本資料 (供參考)：</b><br/>
                                        疼痛指數：{selectedPatient.latest_log.nrs_pain_score} / 10 <br/>
                                        回報症狀：{selectedPatient.latest_log.symptoms} <br/>
                                        AI 摘要：{selectedPatient.latest_log.ai_assessment_summary}
                                    </div>
                                )}
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
