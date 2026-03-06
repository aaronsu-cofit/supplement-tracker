'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, WOUND_TYPES, BODY_LOCATIONS } from '@vitera/lib';

const PHASE_CLASSES = {
    inflammation:  'phase-inflammation',
    proliferation: 'phase-proliferation',
    remodeling:    'phase-remodeling',
    mature:        'phase-mature',
};

export default function WoundDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [wound, setWound] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

    useEffect(() => {
        apiFetch(`/api/wounds/${id}`)
            .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
            .then(data => setWound(data))
            .catch(() => router.replace('/'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleArchive = async () => {
        await apiFetch(`/api/wounds/${id}`, { method: 'DELETE' });
        router.replace('/');
    };

    if (loading || !wound) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="w-10 h-10 border-[3px] border-white/10 border-t-w-pink rounded-full animate-spin" />
            </div>
        );
    }

    const type = WOUND_TYPES.find(t => t.code === wound.wound_type) || WOUND_TYPES[5];
    const loc = BODY_LOCATIONS.find(l => l.code === wound.body_location);
    const days = wound.date_of_injury ? Math.floor((Date.now() - new Date(wound.date_of_injury).getTime()) / 86400000) : 0;

    const getPhase = (d) => {
        if (d <= 3)  return { label: '炎症期', key: 'inflammation', color: '#ff6b6b' };
        if (d <= 14) return { label: '增生期', key: 'proliferation', color: '#ffa502' };
        if (d <= 28) return { label: '重塑期', key: 'remodeling',    color: '#2ed573' };
        return           { label: '成熟期', key: 'mature',        color: '#5d9cec' };
    };
    const phase = getPhase(days);

    return (
        <div className="max-w-[480px] mx-auto px-4 pb-24">
            <Link href="/" className="text-white/50 no-underline text-[0.85rem] inline-flex items-center gap-1 mb-4">
                ← 傷口列表
            </Link>

            {/* Hero Card */}
            <div className="bg-white/5 backdrop-blur-[20px] border border-white/[0.08] rounded-[20px] p-6 mb-5 relative overflow-hidden">
                <div
                    className="absolute -top-[30px] -right-[30px] w-[120px] h-[120px] rounded-full"
                    style={{ background: `radial-gradient(circle, ${phase.color}22 0%, transparent 70%)` }}
                />
                <div className="flex justify-between items-start relative">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[1.5rem]">{type.emoji}</span>
                            <h1 className="text-white text-[1.3rem] font-bold m-0">{wound.name}</h1>
                        </div>
                        <div className="flex gap-[0.4rem] flex-wrap mb-[0.6rem]">
                            <span className="bg-w-pink/15 text-w-pink px-2 py-[2px] rounded-[6px] text-[0.75rem]">{type.label}</span>
                            {loc && <span className="bg-w-blue/15 text-w-blue px-2 py-[2px] rounded-[6px] text-[0.75rem]">{loc.emoji} {loc.label}</span>}
                            <span className={`${PHASE_CLASSES[phase.key]} px-2 py-[2px] rounded-[6px] text-[0.75rem]`}>{phase.label}</span>
                        </div>
                        <div className="text-white/40 text-[0.8rem]">受傷日期：{wound.date_of_injury}</div>
                    </div>
                    <div className="bg-w-gradient rounded-[14px] px-[0.9rem] py-[0.6rem] text-center shrink-0">
                        <div className="text-white text-[1.5rem] font-extrabold leading-none">{days}</div>
                        <div className="text-white/80 text-[0.65rem] mt-[2px]">天</div>
                    </div>
                </div>
            </div>

            {/* Care Tip */}
            <div className="bg-w-pink/[0.08] border border-w-pink/15 rounded-[14px] px-4 py-[0.8rem] mb-5 flex items-center gap-[0.6rem]">
                <span className="text-[1.2rem]">💡</span>
                <span className="text-white/70 text-[0.82rem]">{type.careNote}</span>
            </div>

            {/* Action Grid */}
            <div className="grid grid-cols-2 gap-[0.8rem] mb-6">
                <Link href={`/${id}/scan`} className="bg-white/5 backdrop-blur-[16px] border border-white/[0.08] rounded-2xl px-4 py-6 text-center no-underline transition-transform duration-150 flex flex-col items-center justify-center">
                    <div className="text-[2rem] mb-[0.4rem]">📸</div>
                    <div className="text-white text-[0.9rem] font-semibold">今日掃描</div>
                    <div className="text-white/40 text-[0.75rem] mt-[2px]">拍照 + AI 分析</div>
                </Link>
                <Link href={`/${id}/history`} className="bg-white/5 backdrop-blur-[16px] border border-white/[0.08] rounded-2xl px-4 py-6 text-center no-underline transition-transform duration-150 flex flex-col items-center justify-center">
                    <div className="text-[2rem] mb-[0.4rem]">📅</div>
                    <div className="text-white text-[0.9rem] font-semibold">照護歷程</div>
                    <div className="text-white/40 text-[0.75rem] mt-[2px]">Timeline 回顧</div>
                </Link>
            </div>

            {/* Archive button */}
            <button
                onClick={() => setShowArchiveConfirm(true)}
                className="w-full py-[0.8rem] rounded-xl bg-white/[0.03] border border-white/10 text-white/40 text-[0.85rem] cursor-pointer"
            >
                🗃️ 傷口已癒合，歸檔此紀錄
            </button>

            {/* Archive Confirm Dialog */}
            {showArchiveConfirm && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
                    <div className="bg-w-dialog border border-white/15 rounded-[20px] p-6 max-w-[320px] w-full text-center">
                        <div className="text-[2rem] mb-2">🗃️</div>
                        <h3 className="text-white m-0 mb-2">確認歸檔？</h3>
                        <p className="text-white/50 text-[0.85rem] m-0 mb-6">歸檔後將不再顯示在主列表，但歷史紀錄仍會保留。</p>
                        <div className="flex gap-[0.6rem]">
                            <button onClick={() => setShowArchiveConfirm(false)} className="flex-1 py-[0.7rem] rounded-[10px] cursor-pointer bg-white/[0.08] border border-white/15 text-white text-[0.9rem]">取消</button>
                            <button onClick={handleArchive} className="flex-1 py-[0.7rem] rounded-[10px] cursor-pointer bg-w-gradient-red border-none text-white text-[0.9rem] font-semibold">確認歸檔</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
