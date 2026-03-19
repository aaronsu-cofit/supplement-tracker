'use client';
import { apiFetch } from '@vitera/lib';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function WoundsResultContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const woundId = searchParams.get('woundId');
    const [logData, setLogData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!woundId) return;
        const fetchLog = async () => {
            try {
                const res = await apiFetch(`/api/wounds/${woundId}/logs`);
                if (res.ok) {
                    const logs = await res.json();
                    if (logs.length > 0) setLogData(logs[0]);
                }
            } catch (error) { console.error(error); }
            finally { setLoading(false); }
        };
        fetchLog();
    }, [woundId]);

    if (loading) {
        return (
            <div className="p-8 text-center text-white/40">
                <div className="w-9 h-9 border-[3px] border-white/[0.08] border-t-w-pink rounded-full animate-spin mt-12 mx-auto" />
                <p className="mt-4">載入診斷結果中...</p>
            </div>
        );
    }

    if (!logData) {
        return (
            <div className="p-8 text-center">
                <div className="text-[3rem] mb-4">🔍</div>
                <h3 className="text-white">找不到紀錄</h3>
                <button onClick={() => router.push('/')} className="bg-w-gradient text-white py-[0.9rem] px-8 rounded-[50px] border-none font-bold text-[1rem] cursor-pointer shadow-[0_4px_20px_rgba(255,154,158,0.3)]">
                    返回首頁
                </button>
            </div>
        );
    }

    const isConcern = logData.ai_status_label?.includes('留意') || logData.ai_status_label?.includes('諮詢');

    return (
        <div className="p-[1.2rem]">
            <h2 className="text-white text-[1.15rem] font-bold m-0 mb-[0.3rem]">📊 分析報告</h2>
            <p className="text-white/35 text-[0.8rem] mb-6">
                拍攝時間：{new Date(logData.logged_at).toLocaleString('zh-TW')}
            </p>

            {/* AI Status Banner */}
            <div className={`p-[1.2rem] rounded-[18px] mb-6 flex items-center gap-4 border ${
                isConcern
                    ? 'bg-gradient-to-br from-[rgba(255,165,2,0.25)] to-[rgba(255,71,87,0.15)] border-[rgba(255,165,2,0.3)]'
                    : 'bg-gradient-to-br from-[rgba(46,213,115,0.25)] to-[rgba(92,224,216,0.15)] border-[rgba(46,213,115,0.3)]'
            }`}>
                <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center text-[1.5rem] shrink-0 ${isConcern ? 'bg-w-orange/[0.13]' : 'bg-w-green/[0.13]'}`}>
                    {isConcern ? '⚠️' : '✅'}
                </div>
                <div>
                    <h3 className="m-0 mb-[0.3rem] text-[1.05rem] text-white">
                        {logData.ai_status_label || '復原進度符合預期'}
                    </h3>
                    <p className="m-0 text-[0.8rem] text-white/50 leading-[1.4]">
                        {isConcern
                            ? '檢測到部分需要觀察的跡象，請保持乾燥並持續追蹤。'
                            : '傷口看來處於穩定狀態，請繼續保持！'}
                    </p>
                </div>
            </div>

            {/* AI Detail Analysis */}
            <div className="relative bg-white/[0.04] border border-white/[0.06] p-[1.3rem] rounded-2xl overflow-hidden">
                <h3 className="text-[0.95rem] text-white/60 mb-[0.8rem] mt-0 pb-2 border-b border-white/[0.06] font-semibold">
                    🤖 影像與症狀智能分析
                </h3>
                <p className="text-[0.9rem] text-white/65 leading-[1.7] whitespace-pre-wrap m-0 mb-4">
                    {logData.ai_assessment_summary}
                </p>
                <div className="flex gap-[1.2rem] text-[0.8rem] text-white/40">
                    <span>🌡️ 疼痛: <b className="text-white/70">{logData.nrs_pain_score}/10</b></span>
                    <span>📝 症狀: <b className="text-white/70">{logData.symptoms || '無'}</b></span>
                </div>
            </div>

            {/* Recommendation */}
            <div className="relative bg-white/[0.04] border border-white/[0.06] p-[1.3rem] rounded-2xl overflow-hidden mt-4">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-w-gradient-green rounded-l" />
                <div className="relative z-[1]">
                    <h4 className="m-0 mb-[0.6rem] text-white text-[0.95rem] font-bold flex items-center gap-[0.4rem]">
                        💡 護理師的叮嚀與推薦
                    </h4>
                    <p className="m-0 mb-5 text-[0.85rem] text-white/50 leading-[1.6]">
                        目前的傷口狀態適合使用「抗菌保濕敷料」來維持微濕潤環境，這能幫助細胞游移並加速癒合，同時降低留疤機率。
                    </p>
                    <div className="flex gap-[0.6rem]">
                        <a href="#" className="bg-transparent border border-w-pink/30 text-w-pink py-2 px-4 rounded-[20px] text-[0.8rem] font-semibold no-underline text-center flex-1">觀看敷料教學</a>
                        <a href="#" className="bg-transparent border border-w-green/30 text-w-green py-2 px-4 rounded-[20px] text-[0.8rem] font-semibold no-underline text-center flex-1">🏥 前往合作藥局</a>
                    </div>
                </div>
            </div>

            <p className="text-[0.72rem] text-white/20 text-center leading-[1.5] my-6">
                免責聲明：本系統照片分析僅供日常居家照護參考，非正式醫療診斷依據。<br />
                如有發燒、持續劇痛、大量異常滲出液等嚴重不適，請立即就醫。
            </p>

            <button onClick={() => router.push('/')} className="w-full bg-w-gradient text-white py-[0.9rem] px-8 rounded-[50px] border-none font-bold text-[1rem] cursor-pointer shadow-[0_4px_20px_rgba(255,154,158,0.3)]">
                完成並回到首頁
            </button>
        </div>
    );
}

export default function WoundsResultPage() {
    return (
        <Suspense fallback={
            <div className="p-8 text-center text-white/40">載入中...</div>
        }>
            <WoundsResultContent />
        </Suspense>
    );
}
