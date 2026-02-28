'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function BonesResultPage() {
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
        fetch('/api/footcare/images')
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

    const { ai_severity, ai_summary, image_data } = imageRecord;

    const SeverityDisplay = ({ severity }) => {
        const config = {
            normal: { text: '正常', color: '#a8ff78', bg: 'rgba(168, 255, 120, 0.15)' },
            mild: { text: '輕度外翻', color: '#ffeb3b', bg: 'rgba(255, 235, 59, 0.15)' },
            moderate: { text: '中度外翻', color: '#ff9a9e', bg: 'rgba(255, 154, 158, 0.15)' },
            severe: { text: '重度外翻', color: '#ff4b4b', bg: 'rgba(255, 75, 75, 0.15)' },
        };
        const active = config[severity] || config.normal;

        return (
            <div style={{
                background: active.bg,
                border: \`1px solid \${active.color}\`,
                padding: '1.5rem',
                borderRadius: '16px',
                textAlign: 'center',
                marginBottom: '1.5rem'
            }}>
                <h3 style={{ color: active.color, fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>{active.text}</h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.95rem' }}>AI 客觀檢測結果</p>
            </div>
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

            <SeverityDisplay severity={ai_severity} />

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
                    {ai_summary}
                </p>
            </div>

            {/* Referral / CTA section based on severity */}
            {(ai_severity === 'moderate' || ai_severity === 'severe') && (
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
                    {(ai_severity === 'moderate' || ai_severity === 'severe') && (
                        <div style={{marginTop: '1rem', borderTop: '1px solid rgba(255,154,158,0.2)', paddingTop: '1rem'}}>
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

            {(ai_severity === 'normal' || ai_severity === 'mild' || ai_severity === 'moderate') && (
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
            
            {/* View Source Image */}
            <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', textAlign: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', marginBottom: '1rem' }}>本次分析之原始影像紀錄</p>
                <div style={{ 
                    borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)',
                    maxWidth: '300px', margin: '0 auto' 
                }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image_data} alt="Source Image" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
            </div>

        </div>
    );
}
