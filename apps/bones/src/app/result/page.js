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
            router.replace('/bones');
            return;
        }

        // Ideally we fetch a specific id from /api/footcare/images?id=...
        // But since we just have a GET all for now, let's fetch all and filter client side for MVP
        apiFetch('/api/footcare/images')
            .then(res => res.json())
            .then(data => {
                const record = data.find(img => String(img.id) === id);
                if (record) {
                    setImageRecord(record);
                } else {
                    router.replace('/bones');
                }
            })
            .catch(err => {
                console.error(err);
                router.replace('/bones');
            })
            .finally(() => setLoading(false));
    }, [router, searchParams]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column' }}>
                <p style={{ color: '#a8a8a8' }}>載入分析結果中...</p>
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

            // Get color based on severity
            let color = '#a8ff78'; // normal
            if (toeData.severity === 'mild') color = '#ffeb3b';
            if (toeData.severity === 'moderate') color = '#ff9a9e';
            if (toeData.severity === 'severe') color = '#ff4b4b';

            return (
                <g>
                    {/* Bounding Box */}
                    <rect
                        x={`${xmin * 100}%`} y={`${ymin * 100}%`}
                        width={`${width * 100}%`} height={`${height * 100}%`}
                        fill="none" stroke={color} strokeWidth="3" rx="8"
                        strokeDasharray="8 4" style={{ filter: `drop-shadow(0 0 6px ${color})` }}
                    />

                    {/* Angle Line Visualization */}
                    <path
                        d={`M${(xmin + width / 2) * 100}% ${(ymin + height) * 100}% L${(xmin + width / 2) * 100}% ${(ymin + height / 2) * 100}% L${(xmin + width / 2 + (label === 'L' ? width / 1.5 : -width / 1.5)) * 100}% ${(ymin) * 100}%`}
                        fill="none" stroke={color} strokeWidth="2" opacity="0.8"
                    />

                    {/* Data Label */}
                    <g transform={`translate(${(xmax + 0.02) * 100}, ${(ymin + 0.05) * 100})`}>
                        <rect x="-2%" y="-3%" width="22%" height="10%" rx="4" fill="rgba(0,0,0,0.7)" stroke={color} strokeWidth="1" />
                        <text x="0%" y="2%" fill="#fff" fontSize="5" fontWeight="bold" dominantBaseline="middle">{toeData.angle_degrees}°</text>
                        <text x="0%" y="5.5%" fill={color} fontSize="3" fontWeight="bold" dominantBaseline="middle" textTransform="uppercase">{toeData.severity}</text>
                    </g>
                </g>
            );
        };

        return (
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
                {renderBox(details.left_toe, 'L')}
                {renderBox(details.right_toe, 'R')}
            </svg>
        );
    };

    return (
        <div style={{ padding: '1.5rem', maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <header>
                <Link href="/bones" style={{ color: '#a8ff78', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '1rem', display: 'inline-block' }}>
                    ← 返回中心
                </Link>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>📑 檢測報告</h2>
            </header>

            {/* View Source Image with Overlay Container */}
            <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#000', margin: '0 auto', width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageRecord.image_data} alt="Foot Source Image" style={{ width: '100%', height: 'auto', display: 'block' }} />

                {/* AI Visual Annnotation Overlay */}
                <BoundingBoxOverlay details={imageRecord.ai_details} />
            </div>

            <SeverityDisplay severity={imageRecord.ai_severity} />

            <div style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '16px',
                padding: '1.5rem',
            }}>
                <h4 style={{ color: '#fff', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🤖</span> AI 說明與建議
                </h4>
                <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0 }}>
                    {imageRecord.ai_summary}
                </p>
            </div>

            {/* Referral / CTA section based on severity */}
            {(imageRecord.ai_severity === 'moderate' || imageRecord.ai_severity === 'severe') && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(255, 154, 158, 0.15), rgba(253, 160, 133, 0.15))',
                    border: '1px solid #ff9a9e',
                    borderRadius: '16px',
                    padding: '1.5rem'
                }}>
                    <h3 style={{ color: '#ff9a9e', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>⚠️</span> 醫療諮詢建議
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.8)', margin: '0 0 1.25rem 0', fontSize: '0.9rem', lineHeight: 1.5 }}>
                        由於您的檢測結果顯示一定程度的外翻，建議及早尋求物理治療師或骨科醫師的專業評估，避免情況惡化。
                    </p>
                    <button style={{
                        width: '100%', padding: '1rem', borderRadius: '12px', border: 'none',
                        background: '#ff9a9e', color: '#1a1225', fontWeight: 'bold', cursor: 'pointer'
                    }}>
                        尋找附近合作專科診所
                    </button>
                    {(imageRecord.ai_severity === 'moderate' || imageRecord.ai_severity === 'severe') && (
                        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,154,158,0.2)', paddingTop: '1rem' }}>
                            <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 1rem 0', fontSize: '0.85rem' }}>開刀術後需要傷口照護嗎？</p>
                            <Link href="/wounds" style={{ textDecoration: 'none' }}>
                                <button style={{
                                    width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid #ff9a9e',
                                    background: 'transparent', color: '#ff9a9e', fontWeight: 'bold', cursor: 'pointer'
                                }}>
                                    前往傷口照護追蹤 (WoundCare)
                                </button>
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {(imageRecord.ai_severity === 'normal' || imageRecord.ai_severity === 'mild' || imageRecord.ai_severity === 'moderate') && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(168, 255, 120, 0.1), rgba(120, 255, 214, 0.1))',
                    border: '1px solid rgba(168, 255, 120, 0.2)',
                    borderRadius: '16px',
                    padding: '1.25rem'
                }}>
                    <h3 style={{ color: '#a8ff78', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>🛡️ 預防與保養推薦</h3>
                    <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 1rem 0', fontSize: '0.85rem' }}>
                        適當的輔具可以減緩惡化速度，現在使用 <strong>CARE20</strong> 享夜間夾板折扣。
                    </p>
                    <button style={{
                        width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none',
                        background: '#a8ff78', color: '#1a3630', fontWeight: 'bold', cursor: 'pointer'
                    }}>
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
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column' }}>
                <p style={{ color: '#a8a8a8' }}>載入分析結果中...</p>
            </div>
        }>
            <BonesResultContent />
        </Suspense>
    );
}
