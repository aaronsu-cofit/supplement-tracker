'use client';
import { apiFetch } from '@vitera/lib';
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
            <div className="p-8 text-center text-white/40">
                <div className="w-9 h-9 border-[3px] border-white/[0.08] border-t-w-pink rounded-full animate-spin mt-12 mx-auto" />
                <p className="mt-4">載入歷史紀錄中...</p>
            </div>
        );
    }

    if (!wound || logs.length === 0) {
        return (
            <div className="px-6 py-12 text-center">
                <div className="text-[3.5rem] mb-4 drop-shadow-[0_0_15px_rgba(255,154,158,0.2)]">📭</div>
                <h3 className="text-white m-0 mb-2">尚無歷史紀錄</h3>
                <p className="text-white/40 text-[0.9rem] mb-6">您還沒有建立過傷口拍攝紀錄喔！</p>
                <button onClick={() => router.push('/')} className="bg-w-gradient text-white py-[0.85rem] px-8 rounded-[50px] border-none font-bold text-[0.95rem] cursor-pointer shadow-[0_4px_20px_rgba(255,154,158,0.3)]">
                    返回首頁
                </button>
            </div>
        );
    }

    const startDate = new Date(wound.date_of_injury);

    return (
        <div className="p-[1.2rem] pb-20">
            {/* Header */}
            <div className="flex items-center mb-4 gap-[0.8rem]">
                <button
                    onClick={() => router.push('/')}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-[10px] w-9 h-9 text-[1.1rem] text-white/60 cursor-pointer flex items-center justify-center"
                >←</button>
                <h2 className="m-0 text-[1.1rem] text-white font-bold">復原歷程與時間軸</h2>
            </div>

            {/* Date Badge */}
            <div className="inline-flex items-center gap-[0.4rem] bg-white/[0.04] border border-white/[0.06] rounded-[20px] py-[0.35rem] px-[0.8rem] text-[0.8rem] text-white/40 mb-6">
                <span className="text-[0.8rem]">📅</span>
                <span>受傷日期：{startDate.toLocaleDateString('zh-TW')}</span>
            </div>

            {/* Timeline */}
            <div className="relative pl-[22px]">
                {/* Vertical Line */}
                <div className="absolute left-[28px] top-[10px] bottom-[10px] w-[2px] bg-gradient-to-b from-w-pink/30 to-w-pink/5" />

                {logs.map((log) => {
                    const logDate = new Date(log.logged_at);
                    const dayNum = Math.max(1, Math.ceil((logDate - startDate) / (1000 * 60 * 60 * 24)));
                    const isConcern = log.ai_status_label?.includes('留意') || log.ai_status_label?.includes('諮詢');

                    return (
                        <div key={log.id} className="relative z-[1] mb-6">
                            {/* Dot */}
                            <div className={`absolute left-0 top-4 w-[14px] h-[14px] rounded-full border-[3px] border-[#1a1225] ${isConcern ? 'bg-w-orange shadow-[0_0_0_2px_rgba(255,165,2,0.3),0_0_12px_rgba(255,165,2,0.4)]' : 'bg-w-green shadow-[0_0_0_2px_rgba(46,213,115,0.3),0_0_12px_rgba(46,213,115,0.4)]'}`} />

                            {/* Card */}
                            <div className="ml-[30px] bg-white/[0.04] border border-white/[0.06] rounded-[14px] p-4">
                                <div className="flex justify-between items-start mb-[0.8rem]">
                                    <div>
                                        <div className="text-w-gradient font-extrabold text-[1rem] mb-[0.15rem]">
                                            第 {dayNum} 天
                                        </div>
                                        <div className="text-[0.72rem] text-white/30">
                                            {logDate.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <div className={`px-[0.6rem] py-[0.25rem] rounded-[20px] text-[0.7rem] font-bold ${isConcern ? 'bg-w-orange/15 border border-w-orange/30 text-w-orange' : 'bg-w-green/15 border border-w-green/30 text-w-green'}`}>
                                        {isConcern ? '留意觀察' : '穩定復原'}
                                    </div>
                                </div>

                                {log.image_data && (
                                    <div className="mb-[0.8rem] rounded-[10px] overflow-hidden border border-white/[0.06]">
                                        <img src={log.image_data} alt={`Day ${dayNum} wound`} className="w-full h-[140px] object-cover block" />
                                    </div>
                                )}

                                <div className="text-[0.82rem] text-white/55 leading-[1.6] mb-[0.8rem] whitespace-pre-wrap">
                                    {log.ai_assessment_summary || '無紀錄。'}
                                </div>

                                <div className="flex gap-4 border-t border-white/[0.06] pt-[0.7rem] text-[0.75rem] text-white/30">
                                    <span>🌡️ 痛感: <b className="text-white/60">{log.nrs_pain_score}/10</b></span>
                                    <span>📝 異常: <b className="text-white/60">{log.symptoms || '皆無'}</b></span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
