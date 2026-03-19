'use client';
import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ResultContent() {
    const { id } = useParams();
    const sp = useSearchParams();
    const analysis = sp.get('analysis') || '';
    const statusLabel = sp.get('status') || '需多加留意觀察';
    const nrs = parseInt(sp.get('nrs') || '0');
    const symptoms = sp.get('symptoms') || '';

    const isConcern = statusLabel.includes('諮詢') || statusLabel.includes('留意');
    const statusIcon = isConcern ? '⚠️' : '✅';

    return (
        <div className="w-full max-w-2xl mx-auto px-5 sm:px-8 py-5">
            {/* Status Banner */}
            <div className={`rounded-[18px] p-[1.2rem] mb-5 text-center border ${
                isConcern
                    ? 'bg-gradient-to-br from-w-orange/18 to-w-orange/8 border-w-orange/30'
                    : 'bg-gradient-to-br from-w-green/18 to-w-green/8 border-w-green/30'
            }`}>
                <div className="text-[2.5rem] mb-[0.3rem]">{statusIcon}</div>
                <div className={`text-[1.05rem] font-bold ${isConcern ? 'text-w-orange' : 'text-w-green'}`}>
                    {statusLabel}
                </div>
            </div>

            {/* AI Analysis */}
            <div className="bg-white/[0.04] backdrop-blur-[16px] border border-white/[0.08] rounded-2xl p-[1.2rem] mb-4">
                <div className="text-white/50 text-[0.8rem] mb-2">🤖 AI 分析</div>
                <div className="text-white/85 text-[0.9rem] leading-[1.7] whitespace-pre-wrap">{analysis}</div>
            </div>

            {/* Pain + Symptoms */}
            <div className="grid grid-cols-2 gap-[0.8rem] mb-5">
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-[14px] p-4 text-center">
                    <div className="text-white/65 text-[0.8rem] mb-[0.3rem]">疼痛指數</div>
                    <div className={`text-[1.5rem] font-extrabold ${nrs <= 3 ? 'text-w-green' : nrs <= 6 ? 'text-w-orange' : 'text-w-red'}`}>
                        {nrs}/10
                    </div>
                </div>
                <div className="bg-white/[0.04] border border-white/[0.06] rounded-[14px] p-4 text-center">
                    <div className="text-white/65 text-[0.8rem] mb-[0.3rem]">回報症狀</div>
                    <div className="text-w-pink text-[0.85rem] font-semibold">{symptoms || '皆無'}</div>
                </div>
            </div>

            {/* Nurse Tip */}
            <div className="bg-w-pink/[0.08] border border-w-pink/15 rounded-[14px] px-4 py-[0.8rem] mb-6">
                <div className="flex items-center gap-2 mb-[0.3rem]">
                    <span>👩‍⚕️</span>
                    <span className="text-w-pink text-[0.85rem] font-semibold">護理師叮嚀</span>
                </div>
                <div className="text-white/80 text-[0.85rem] leading-relaxed">
                    {isConcern
                        ? '建議持續觀察傷口狀態，若症狀加重請及時就醫。保持傷口清潔乾燥。'
                        : '傷口恢復良好，請繼續保持目前的照護方式。定期拍照追蹤更好掌握變化。'
                    }
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-[0.8rem]">
                <Link href={`/${id}/history`} className="flex-1 py-[0.9rem] rounded-xl text-center no-underline bg-white/[0.06] border border-white/10 text-white text-[0.9rem] font-semibold">
                    📅 查看歷程
                </Link>
                <Link href={`/${id}`} className="flex-1 py-[0.9rem] rounded-xl text-center no-underline bg-w-gradient text-white text-[0.9rem] font-semibold">
                    🏠 回到首頁
                </Link>
            </div>

            <p className="text-white/45 text-[0.75rem] text-center mt-6 leading-[1.5]">
                ⚠️ 以上分析由 AI 輔助生成，僅供參考，不構成醫療診斷。如有疑慮請諮詢專業醫護人員。
            </p>
        </div>
    );
}

export default function WoundResultPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="w-10 h-10 border-[3px] border-white/10 border-t-w-pink rounded-full animate-spin" />
            </div>
        }>
            <ResultContent />
        </Suspense>
    );
}
