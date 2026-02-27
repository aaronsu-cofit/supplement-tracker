'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/components/auth/AuthProvider';
import { WOUND_TYPES, BODY_LOCATIONS } from '@/app/lib/wounds-constants';

export default function WoundsListPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [wounds, setWounds] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/wounds')
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setWounds(data); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const getType = (code) => WOUND_TYPES.find(t => t.code === code) || WOUND_TYPES[5];
    const getLocation = (code) => BODY_LOCATIONS.find(l => l.code === code);

    const daysSince = (dateStr) => {
        if (!dateStr) return 0;
        return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #ff9a9e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ padding: '0 1rem 6rem', maxWidth: 480, margin: '0 auto' }}>
            {/* Welcome */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
                    👋 {user?.displayName || '你好'}
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '0.3rem 0 0' }}>
                    管理你的傷口照護紀錄
                </p>
            </div>

            {/* Wound Cards */}
            {wounds.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '3rem 1rem',
                    background: 'rgba(255,255,255,0.03)', borderRadius: 20,
                    border: '1px dashed rgba(255,255,255,0.15)'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🩹</div>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', marginBottom: '1.5rem' }}>
                        尚未建立任何傷口紀錄
                    </p>
                    <Link href="/wounds/create" style={{
                        display: 'inline-block', padding: '0.8rem 2rem',
                        background: 'linear-gradient(135deg, #ff9a9e, #fda085)',
                        color: '#fff', borderRadius: 12, fontWeight: 700,
                        textDecoration: 'none', fontSize: '0.95rem'
                    }}>
                        + 建立第一筆傷口
                    </Link>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {wounds.map(wound => {
                        const type = getType(wound.wound_type);
                        const loc = getLocation(wound.body_location);
                        const days = daysSince(wound.date_of_injury);
                        return (
                            <div
                                key={wound.id}
                                onClick={() => router.push(`/wounds/${wound.id}`)}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    backdropFilter: 'blur(16px)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 16, padding: '1.2rem',
                                    cursor: 'pointer',
                                    transition: 'transform 0.15s, box-shadow 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,154,158,0.15)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '1.3rem' }}>{type.emoji}</span>
                                            <span style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 600 }}>
                                                {wound.name || '未命名傷口'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            <span style={{
                                                background: 'rgba(255,154,158,0.15)', color: '#ff9a9e',
                                                padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem'
                                            }}>
                                                {type.label}
                                            </span>
                                            {loc && (
                                                <span style={{
                                                    background: 'rgba(93,156,236,0.15)', color: '#5d9cec',
                                                    padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem'
                                                }}>
                                                    {loc.emoji} {loc.label}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{
                                        background: 'linear-gradient(135deg, #ff9a9e, #fda085)',
                                        borderRadius: 10, padding: '0.4rem 0.7rem',
                                        textAlign: 'center', minWidth: 50,
                                    }}>
                                        <div style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 800, lineHeight: 1 }}>{days}</div>
                                        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.6rem' }}>天</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* FAB */}
            <Link href="/wounds/create" style={{
                position: 'fixed', bottom: 90, right: 24,
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff9a9e, #fda085)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(255,154,158,0.4)',
                textDecoration: 'none', fontSize: '1.8rem', color: '#fff',
                zIndex: 50, transition: 'transform 0.2s',
            }}>
                +
            </Link>
        </div>
    );
}
