'use client';
import { apiFetch } from '@vitera/lib';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function BonesResultContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [imageRecord, setImageRecord] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const id = searchParams?.get('id');
        if (!id) {
            router.replace('/');
            return;
        }

        apiFetch('/api/footcare/images')
            .then(res => res.json())
            .then(data => {
                const record = data.find(img => String(img.id) === id);
                if (record) {
                    setImageRecord(record);
                } else {
                    router.replace('/');
                }
            })
            .catch(err => {
                console.error(err);
                router.replace('/');
            })
            .finally(() => setLoading(false));
    }, [router, searchParams]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen flex-col">
                <p className="text-[#a8a8a8]">載入分析結果中...</p>
            </div>
        );
    }

    if (!imageRecord) return null;

    const BoundingBoxOverlay = ({ details }) => {
        if (!details) return null;

        const renderBox = (toeData, label) => {
            if (!toeData || !toeData.detected || !toeData.box) return null;
            const { xmin, ymin, xmax, ymax } = toeData.box;
            const width = xmax - xmin;
            const height = ymax - ymin;

            let color = '#a8ff78'; // normal
            if (toeData.severity === 'mild') color = '#ffeb3b';
            if (toeData.severity === 'moderate') color = '#ff9a9e';
            if (toeData.severity === 'severe') color = '#ff4b4b';

            return (
                <g>
                    <rect
                        x={`${xmin * 100}%`} y={`${ymin * 100}%`}
                        width={`${width * 100}%`} height={`${height * 100}%`}
                        fill="none" stroke={color} strokeWidth="3" rx="8"
                        strokeDasharray="8 4" style={{ filter: `drop-shadow(0 0 6px ${color})` }}
                    />
                    <path
                        d={`M${(xmin + width / 2) * 100}% ${(ymin + height) * 100}% L${(xmin + width / 2) * 100}% ${(ymin + height / 2) * 100}% L${(xmin + width / 2 + (label === 'L' ? width / 1.5 : -width / 1.5)) * 100}% ${(ymin) * 100}%`}
                        fill="none" stroke={color} strokeWidth="2" opacity="0.8"
                    />
                    <g transform={`translate(${(xmax + 0.02) * 100}, ${(ymin + 0.05) * 100})`}>
                        <rect x="-2%" y="-3%" width="22%" height="10%" rx="4" fill="rgba(0,0,0,0.7)" stroke={color} strokeWidth="1" />
                        <text x="0%" y="2%" fill="#fff" fontSize="5" fontWeight="bold" dominantBaseline="middle">{toeData.angle_degrees}°</text>
                        <text x="0%" y="5.5%" fill={color} fontSize="3" fontWeight="bold" dominantBaseline="middle" textTransform="uppercase">{toeData.severity}</text>
                    </g>
                </g>
            );
        };

        return (
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                {renderBox(details.left_toe, 'L')}
                {renderBox(details.right_toe, 'R')}
            </svg>
        );
    };

    return (
        <div className="p-6 max-w-[600px] mx-auto flex flex-col gap-6">
            <header>
                <Link href="/" className="text-[#a8ff78] no-underline text-[0.9rem] mb-4 inline-block">
                    ← 返回中心
                </Link>
                <h2 className="text-[1.5rem] font-bold m-0 mb-2">📑 檢測報告</h2>
            </header>

            {/* Source Image with Overlay */}
            <div className="relative rounded-[16px] overflow-hidden border border-white/10 bg-black mx-auto w-full shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageRecord.image_data} alt="Foot Source Image" className="w-full h-auto block" />
                <BoundingBoxOverlay details={imageRecord.ai_details} />
            </div>

            <SeverityDisplay severity={imageRecord.ai_severity} />

            <div className="bg-black/20 border border-white/[0.05] rounded-[16px] p-6">
                <h4 className="text-white m-0 mb-4 flex items-center gap-2">
                    <span>🤖</span> AI 說明與建議
                </h4>
                <p className="text-white/70 leading-relaxed m-0">
                    {imageRecord.ai_summary}
                </p>
            </div>

            {(imageRecord.ai_severity === 'moderate' || imageRecord.ai_severity === 'severe') && (
                <div className="bg-gradient-to-br from-[rgba(255,154,158,0.15)] to-[rgba(253,160,133,0.15)] border border-[#ff9a9e] rounded-[16px] p-6">
                    <h3 className="text-[#ff9a9e] m-0 mb-2 flex items-center gap-2">
                        <span>⚠️</span> 醫療諮詢建議
                    </h3>
                    <p className="text-white/80 m-0 mb-5 text-[0.9rem] leading-relaxed">
                        由於您的檢測結果顯示一定程度的外翻，建議及早尋求物理治療師或骨科醫師的專業評估，避免情況惡化。
                    </p>
                    <button className="w-full p-4 rounded-[12px] border-none bg-[#ff9a9e] text-[#1a1225] font-bold cursor-pointer">
                        尋找附近合作專科診所
                    </button>
                    {(imageRecord.ai_severity === 'moderate' || imageRecord.ai_severity === 'severe') && (
                        <div className="mt-4 border-t border-[rgba(255,154,158,0.2)] pt-4">
                            <p className="text-white/70 m-0 mb-4 text-[0.85rem]">開刀術後需要傷口照護嗎？</p>
                            <Link href="/wounds" className="no-underline">
                                <button className="w-full p-4 rounded-[12px] border border-[#ff9a9e] bg-transparent text-[#ff9a9e] font-bold cursor-pointer">
                                    前往傷口照護追蹤 (WoundCare)
                                </button>
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {(imageRecord.ai_severity === 'normal' || imageRecord.ai_severity === 'mild' || imageRecord.ai_severity === 'moderate') && (
                <div className="bg-gradient-to-br from-[rgba(168,255,120,0.1)] to-[rgba(120,255,214,0.1)] border border-[rgba(168,255,120,0.2)] rounded-[16px] p-5">
                    <h3 className="text-[#a8ff78] m-0 mb-2 text-[1rem]">🛡️ 預防與保養推薦</h3>
                    <p className="text-white/70 m-0 mb-4 text-[0.85rem]">
                        適當的輔具可以減緩惡化速度，現在使用 <strong>CARE20</strong> 享夜間夾板折扣。
                    </p>
                    <button className="w-full py-3 rounded-[8px] border-none bg-[#a8ff78] text-[#1a3630] font-bold cursor-pointer">
                        選購居家矯正輔具
                    </button>
                </div>
            )}
        </div>
    );
}

export default function BonesResultPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center min-h-screen flex-col">
                <p className="text-[#a8a8a8]">載入分析結果中...</p>
            </div>
        }>
            <BonesResultContent />
        </Suspense>
    );
}
