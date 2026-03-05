'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, WOUND_TYPES, BODY_LOCATIONS } from '@cofit/lib';

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
            .catch(() => router.replace('/wounds'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleArchive = async () => {
        await apiFetch(`/api/wounds/${id}`, { method: 'DELETE' });
        router.replace('/wounds');
    };

    if (loading || !wound) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #ff9a9e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const type = WOUND_TYPES.find(t => t.code === wound.wound_type) || WOUND_TYPES[5];
    const loc = BODY_LOCATIONS.find(l => l.code === wound.body_location);
    const days = wound.date_of_injury ? Math.floor((Date.now() - new Date(wound.date_of_injury).getTime()) / 86400000) : 0;

    const getPhase = (d) => {
        if (d <= 3) return { label: '炎症期', color: '#ff6b6b' };
        if (d <= 14) return { label: '增生期', color: '#ffa502' };
        if (d <= 28) return { label: '重塑期', color: '#2ed573' };
        return { label: '成熟期', color: '#5d9cec' };
    };
    const phase = getPhase(days);

    return (
        <div style={{ padding: '0 1rem 6rem', maxWidth: 480, margin: '0 auto' }}>
            {/* Back */}
            <Link href="/wounds" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '1rem' }}>
                ← 傷口列表
            </Link>

            {/* Hero Card */}
            <div style={{
                background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
                padding: '1.5rem', marginBottom: '1.2rem',
                position: 'relative', overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute', top: -30, right: -30, width: 120, height: 120,
                    background: `radial-gradient(circle, ${phase.color}22 0%, transparent 70%)`,
                    borderRadius: '50%',
                }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>{type.emoji}</span>
                            <h1 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>{wound.name}</h1>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                            <span style={{ background: 'rgba(255,154,158,0.15)', color: '#ff9a9e', padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem' }}>{type.label}</span>
                            {loc && <span style={{ background: 'rgba(93,156,236,0.15)', color: '#5d9cec', padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem' }}>{loc.emoji} {loc.label}</span>}
                            <span style={{ background: `${phase.color}22`, color: phase.color, padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem' }}>{phase.label}</span>
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                            受傷日期：{wound.date_of_injury}
                        </div>
                    </div>
                    <div style={{
                        background: 'linear-gradient(135deg, #ff9a9e, #fda085)',
                        borderRadius: 14, padding: '0.6rem 0.9rem', textAlign: 'center',
                    }}>
                        <div style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>{days}</div>
                        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.65rem', marginTop: 2 }}>天</div>
                    </div>
                </div>
            </div>

            {/* Care Tip */}
            <div style={{
                background: 'rgba(255,154,158,0.08)', border: '1px solid rgba(255,154,158,0.15)',
                borderRadius: 14, padding: '0.8rem 1rem', marginBottom: '1.2rem',
                display: 'flex', alignItems: 'center', gap: '0.6rem'
            }}>
                <span style={{ fontSize: '1.2rem' }}>💡</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem' }}>{type.careNote}</span>
            </div>

            {/* Action Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1.5rem' }}>
                <Link href={`/wounds/${id}/scan`} style={{
                    background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
                    padding: '1.5rem 1rem', textAlign: 'center', textDecoration: 'none',
                    transition: 'transform 0.15s',
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>📸</div>
                    <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>今日掃描</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: 2 }}>拍照 + AI 分析</div>
                </Link>
                <Link href={`/wounds/${id}/history`} style={{
                    background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
                    padding: '1.5rem 1rem', textAlign: 'center', textDecoration: 'none',
                    transition: 'transform 0.15s',
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>📅</div>
                    <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>照護歷程</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: 2 }}>Timeline 回顧</div>
                </Link>
            </div>

            {/* Archive button */}
            <button
                onClick={() => setShowArchiveConfirm(true)}
                style={{
                    width: '100%', padding: '0.8rem', borderRadius: 12,
                    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', cursor: 'pointer',
                }}
            >
                🗃️ 傷口已癒合，歸檔此紀錄
            </button>

            {/* Archive Confirm Dialog */}
            {showArchiveConfirm && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem',
                }}>
                    <div style={{
                        background: '#1e1a2e', border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 20, padding: '1.5rem', maxWidth: 320, width: '100%', textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗃️</div>
                        <h3 style={{ color: '#fff', margin: '0 0 0.5rem' }}>確認歸檔？</h3>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '0 0 1.5rem' }}>
                            歸檔後將不再顯示在主列表，但歷史紀錄仍會保留。
                        </p>
                        <div style={{ display: 'flex', gap: '0.6rem' }}>
                            <button onClick={() => setShowArchiveConfirm(false)} style={{
                                flex: 1, padding: '0.7rem', borderRadius: 10, cursor: 'pointer',
                                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                                color: '#fff', fontSize: '0.9rem',
                            }}>取消</button>
                            <button onClick={handleArchive} style={{
                                flex: 1, padding: '0.7rem', borderRadius: 10, cursor: 'pointer',
                                background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
                                border: 'none', color: '#fff', fontSize: '0.9rem', fontWeight: 600,
                            }}>確認歸檔</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
