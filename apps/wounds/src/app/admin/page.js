'use client';
import { apiFetch } from '@vitera/lib';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function WoundsAdminDashboard() {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [generatingSoap, setGeneratingSoap] = useState(false);
    const [soapNote, setSoapNote] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                const res = await apiFetch('/api/admin/wounds');
                if (res.ok) {
                    const woundsList = await res.json();
                    const surnames = ['李', '王', '陳', '林', '黃', '周', '吳', '謝', '趙', '劉'];
                    const mappedPatients = woundsList.map((w, idx) => {
                        const dateLabel = w.date_of_injury
                            ? new Date(w.date_of_injury).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })
                            : '';
                        const fallbackName = `${surnames[idx % surnames.length]}先生` + (dateLabel ? ` (${dateLabel})` : '');
                        return {
                            id: w.id,
                            name: w.display_name || w.name || fallbackName,
                            picture_url: w.picture_url || null,
                            wound_id: w.id,
                            surgery_date: w.date_of_injury,
                            latest_log: w.logs?.[0] || null,
                            history: w.logs || []
                        };
                    });

                    const demoImg = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><rect fill="%23e8f5e9" width="300" height="200"/><text x="150" y="90" text-anchor="middle" fill="%232e7d32" font-size="40">🩹</text><text x="150" y="130" text-anchor="middle" fill="%23388e3c" font-size="14" font-family="sans-serif">傷口紀錄照片</text></svg>')}`;

                    const demoPatient = {
                        id: 'demo-1',
                        name: '張大明 (Demo)',
                        picture_url: null,
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
                            { id: 'h1', logged_at: new Date(Date.now() - 14 * 86400000).toISOString(), ai_status_label: '⚠️ 留意觀察', image_data: demoImg },
                            { id: 'h2', logged_at: new Date(Date.now() - 7 * 86400000).toISOString(), ai_status_label: '✅ 穩定復原', image_data: demoImg }
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

    const handleSelectPatient = (p) => { setSelectedPatient(p); setSoapNote(null); };

    const handleStartEdit = (p, e) => { e.stopPropagation(); setEditingId(p.id); setEditingName(p.name); };

    const handleSaveRename = async (p) => {
        const newName = editingName.trim();
        setEditingId(null);
        if (!newName || newName === p.name) return;
        const updated = patients.map(pt => pt.id === p.id ? { ...pt, name: newName } : pt);
        setPatients(updated);
        if (selectedPatient?.id === p.id) setSelectedPatient({ ...selectedPatient, name: newName });
        if (p.wound_id !== 'demo') {
            try {
                await apiFetch(`/api/wounds/${p.wound_id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newName })
                });
            } catch (err) { console.error('Failed to save name:', err); }
        }
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
            const res = await apiFetch(`/api/wounds/${selectedPatient.wound_id}/soap`, { method: 'POST' });
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

    if (loading) return <div className="p-8 text-gray-600">載入遠距病房資料中...</div>;

    return (
        <div className="p-6 font-sans bg-gray-50 min-h-screen">
            <header className="flex justify-between items-center mb-8 border-b-2 border-gray-200 pb-4">
                <h1 className="text-[1.5rem] text-[#2c3e50] m-0">🏥 遠距傷口追蹤中心 (Demo)</h1>
                <Link href="/wounds" className="text-[#3498db] no-underline font-bold">返回病患端</Link>
            </header>

            <div className="grid grid-cols-[1fr_2fr] gap-8">
                {/* Patient List */}
                <div className="bg-white p-4 rounded-[12px] shadow-sm">
                    <h2 className="text-[1.1rem] text-[#7f8c8d] mb-4">高風險預警清單</h2>
                    {patients.length === 0 ? (
                        <p className="text-gray-400 text-[0.9rem]">目前無病患資料</p>
                    ) : (
                        patients.map(p => {
                            const isHighRisk = p.latest_log?.ai_status_label?.includes('諮詢') || p.latest_log?.nrs_pain_score > 6;
                            const isSelected = selectedPatient?.id === p.id;
                            const bgClass = isSelected
                                ? (isHighRisk ? 'bg-[#ffecec] shadow-md' : 'bg-[#eafaf1] shadow-md')
                                : (isHighRisk ? 'bg-[#fff5f5]' : 'bg-[#f9fff9]');
                            return (
                                <div
                                    key={p.id}
                                    onClick={() => handleSelectPatient(p)}
                                    className={`${bgClass} ${isHighRisk ? 'border-l-4 border-l-[#e74c3c]' : 'border-l-4 border-l-[#2ecc71]'} p-4 rounded-r-lg mb-4 cursor-pointer`}
                                >
                                    <div className="flex items-center gap-[0.6rem] mb-2">
                                        {p.picture_url ? (
                                            <img src={p.picture_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[0.9rem]">👤</div>
                                        )}
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                {editingId === p.id ? (
                                                    <input
                                                        autoFocus
                                                        value={editingName}
                                                        onChange={e => setEditingName(e.target.value)}
                                                        onBlur={() => handleSaveRename(p)}
                                                        onKeyDown={e => { if (e.key === 'Enter') handleSaveRename(p); }}
                                                        onClick={e => e.stopPropagation()}
                                                        className="border border-[#3498db] rounded px-[0.4rem] py-[0.2rem] text-[0.9rem] font-bold w-full max-w-[120px]"
                                                    />
                                                ) : (
                                                    <b className="text-[#2c3e50] cursor-text" onClick={e => handleStartEdit(p, e)}>{p.name} ✏️</b>
                                                )}
                                                <span className="text-[0.8rem] text-gray-500">NRS: {p.latest_log?.nrs_pain_score || 0}</span>
                                            </div>
                                            <div className="text-[0.85rem] text-[#7f8c8d]">{p.latest_log?.ai_status_label || '尚未分析'}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Patient Detail */}
                <div className="bg-white p-6 rounded-[12px] shadow-sm">
                    {selectedPatient ? (
                        <div>
                            <div className="flex justify-between border-b border-gray-200 pb-4 mb-6">
                                <div className="flex items-center gap-[0.8rem]">
                                    {selectedPatient.picture_url ? (
                                        <img src={selectedPatient.picture_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-gray-200" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-[#e8f5e9] flex items-center justify-center text-[1.5rem]">👤</div>
                                    )}
                                    <div>
                                        <h2 className="m-0 mb-[0.3rem] text-[#2c3e50]">{selectedPatient.name} - 傷口發展史</h2>
                                        <span className="text-[0.9rem] text-[#7f8c8d]">手術日期：{selectedPatient.surgery_date}</span>
                                    </div>
                                </div>
                                <button className="bg-[#3498db] text-white border-none py-2 px-4 rounded-lg font-bold cursor-pointer">
                                    📹 啟動遠距諮詢
                                </button>
                            </div>

                            <h3 className="text-[1rem] text-[#7f8c8d] m-0 mb-4">📅 完整照護歷程</h3>
                            {selectedPatient.history.length === 0 ? (
                                <div className="text-gray-400 text-[0.9rem] p-4 bg-gray-50 rounded-lg">尚無歷史紀錄</div>
                            ) : (
                                <div className="relative pl-[18px] max-h-[400px] overflow-y-auto">
                                    <div className="absolute left-6 top-2 bottom-2 w-[2px] bg-gray-200" />
                                    {selectedPatient.history.map((log) => {
                                        const logDate = new Date(log.logged_at);
                                        const isConcern = log.ai_status_label?.includes('留意') || log.ai_status_label?.includes('諮詢');
                                        return (
                                            <div key={log.id} className="relative z-[1] mb-5">
                                                <div className={`absolute left-0 top-3 w-[13px] h-[13px] rounded-full border-2 border-white shadow-[0_0_0_2px_#e0e0e0] ${isConcern ? 'bg-[#ffa502]' : 'bg-[#2ed573]'}`} />
                                                <div className="ml-7 bg-gray-50 rounded-lg p-[0.8rem] border border-gray-200">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-[0.8rem] text-gray-400">{logDate.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                                                        <span className={`py-[0.15rem] px-[0.4rem] rounded-lg text-[0.7rem] font-bold ${isConcern ? 'bg-[#fff3cd] text-[#856404]' : 'bg-[#d4edda] text-[#155724]'}`}>
                                                            {log.ai_status_label || '穩定'}
                                                        </span>
                                                    </div>
                                                    {log.image_data && (
                                                        <img src={log.image_data} alt="Wound" className="w-full h-[100px] object-cover rounded-md mb-2" />
                                                    )}
                                                    {log.ai_assessment_summary && (
                                                        <div className="text-[0.8rem] text-gray-600 leading-[1.4] mb-[0.4rem]">{log.ai_assessment_summary}</div>
                                                    )}
                                                    <div className="text-[0.75rem] text-gray-400 flex gap-[0.8rem]">
                                                        <span>🌡️ 痛感: {log.nrs_pain_score ?? '-'}/10</span>
                                                        <span>📝 症狀: {log.symptoms || '皆無'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* SOAP */}
                            <div className="mt-4 p-6 bg-[#f4f6f7] rounded-lg">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-[1.1rem] text-[#2c3e50] m-0">📝 醫療護理紀錄 (SOAP)</h3>
                                    <button
                                        onClick={handleGenerateSoap}
                                        disabled={generatingSoap || selectedPatient.history.length === 0}
                                        className={`bg-[#8e44ad] text-white border-none py-[0.4rem] px-[0.8rem] rounded-md ${generatingSoap ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                                    >
                                        {generatingSoap ? '⏳ 正在分析 14 天紀錄...' : '✨ 一鍵生成 SOAP 病歷'}
                                    </button>
                                </div>
                                {soapNote ? (
                                    <div className="bg-white p-4 rounded-md border-l-4 border-l-[#8e44ad] whitespace-pre-wrap leading-[1.6] text-[#444]">
                                        {soapNote}
                                    </div>
                                ) : (
                                    <div className="bg-white p-4 rounded-md text-gray-400 italic">
                                        點擊右上角按鈕，AI 將自動綜合過去 14 天照片變化與疼痛指數，撰寫專業的 SOAP 醫療筆記。
                                    </div>
                                )}
                                {selectedPatient.latest_log && (
                                    <div className="mt-4 text-[0.85rem] text-[#7f8c8d] border-t border-gray-300 pt-4">
                                        <b>最新一日基本資料 (供參考)：</b><br />
                                        疼痛指數：{selectedPatient.latest_log.nrs_pain_score} / 10 <br />
                                        回報症狀：{selectedPatient.latest_log.symptoms} <br />
                                        AI 摘要：{selectedPatient.latest_log.ai_assessment_summary}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 py-12">請點選左側病患以查看詳情</div>
                    )}
                </div>
            </div>
        </div>
    );
}
