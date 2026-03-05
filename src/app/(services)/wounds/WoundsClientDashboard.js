'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/components/auth/AuthProvider';
import { WOUND_TYPES, BODY_LOCATIONS } from '@/app/lib/wounds-constants';

export default function WoundsClientDashboard({ initialWounds = [] }) {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [wounds, setWounds] = useState(initialWounds);
    const [currentWound, setCurrentWound] = useState(null);
    const [showSwitcher, setShowSwitcher] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const switcherRef = useRef(null);

    useEffect(() => {
        if (Array.isArray(initialWounds)) {
            setWounds(initialWounds);

            const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
            const newId = urlParams?.get('new_id');

            if (newId && initialWounds.length > 0) {
                const target = initialWounds.find(w => String(w.id) === String(newId));
                if (target) {
                    setCurrentWound(target);
                    return;
                }
            }
            if (initialWounds.length > 0) setCurrentWound(initialWounds[0]);
        }
    }, [initialWounds]);

    // Close switcher on outside click
    useEffect(() => {
        const handler = (e) => {
            if (switcherRef.current && !switcherRef.current.contains(e.target)) setShowSwitcher(false);
        };
        if (showSwitcher) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showSwitcher]);

    const getType = (code) => WOUND_TYPES.find(t => t.code === code) || WOUND_TYPES[5];
    const getLoc = (code) => BODY_LOCATIONS.find(l => l.code === code) || (code ? { code, label: code, emoji: '📍' } : null);
    const daysSince = (d) => d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 0;
    const getPhase = (d) => {
        if (d <= 3) return { label: '炎症期', color: '#ff6b6b' };
        if (d <= 14) return { label: '增生期', color: '#ffa502' };
        if (d <= 28) return { label: '重塑期', color: '#2ed573' };
        return { label: '成熟期', color: '#5d9cec' };
    };

    const switchWound = (w) => { setCurrentWound(w); setShowSwitcher(false); };

    if (authLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <div style={{ width: 40, height: 40, border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid #ff9a9e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    // No wounds — show onboarding
    if (!currentWound) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '2rem', textAlign: 'center' }}>
                <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🩹</div>
                <h2 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem' }}>開始你的傷口照護</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '0 0 2rem', maxWidth: 280 }}>
                    建立傷口紀錄，讓 AI 幫你追蹤復原狀態
                </p>
                <Link href="/wounds/create" style={{
                    padding: '0.9rem 2.5rem', borderRadius: 14,
                    background: 'linear-gradient(135deg, #ff9a9e, #fda085)',
                    color: '#fff', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none',
                    boxShadow: '0 4px 20px rgba(255,154,158,0.35)',
                }}>
                    ＋ 建立傷口紀錄
                </Link>
            </div>
        );
    }

    const type = getType(currentWound.wound_type);
    const loc = getLoc(currentWound.body_location);
    const days = daysSince(currentWound.date_of_injury);
    const phase = getPhase(days);

    return (
        <div style={{ padding: '0', maxWidth: 480, margin: '0 auto' }}>
            {/* ═══ Header with Wound Switcher ═══ */}
            <div ref={switcherRef} style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                <header style={{
                    background: 'rgba(26, 18, 37, 0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                    padding: '0.85rem 1.2rem', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <button
                        onClick={() => setShowSwitcher(v => !v)}
                        aria-label="切換傷口"
                        aria-expanded={showSwitcher}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 0',
                            minHeight: 44,
                        }}
                    >
                        <span style={{ fontSize: '1.1rem' }}>{type.emoji}</span>
                        <span style={{
                            background: 'linear-gradient(135deg, #ff9a9e, #fda085)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            fontSize: '1.05rem', fontWeight: 700,
                        }}>
                            {currentWound.name || '未命名傷口'}
                        </span>
                        <span style={{
                            color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem',
                            transform: showSwitcher ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                        }}>▼</span>
                    </button>
                    <button onClick={() => setShowEdit(true)} aria-label="編輯傷口資訊" style={{
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 8, padding: '0.5rem 0.75rem', cursor: 'pointer',
                        color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem',
                        minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✏️</button>
                </header>

                {/* Wound Switcher Dropdown */}
                {showSwitcher && (
                    <div style={{
                        position: 'absolute', left: 0, right: 0, top: '100%',
                        background: 'rgba(30, 26, 46, 0.97)', backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255,255,255,0.08)', borderTop: 'none',
                        borderRadius: '0 0 16px 16px', padding: '0.5rem',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                        animation: 'slideDown 0.2s ease',
                    }}>
                        {wounds.map(w => {
                            const wType = getType(w.wound_type);
                            const isActive = w.id === currentWound.id;
                            return (
                                <button key={w.id} onClick={() => switchWound(w)} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%',
                                    padding: '0.7rem 0.8rem', borderRadius: 10, cursor: 'pointer',
                                    background: isActive ? 'rgba(255,154,158,0.12)' : 'transparent',
                                    border: isActive ? '1px solid rgba(255,154,158,0.25)' : '1px solid transparent',
                                    transition: 'background 0.15s',
                                }}>
                                    <span style={{ fontSize: '1.1rem' }}>{wType.emoji}</span>
                                    <div style={{ flex: 1, textAlign: 'left' }}>
                                        <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: isActive ? 600 : 400 }}>{w.name}</div>
                                    </div>
                                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>第{daysSince(w.date_of_injury)}天</span>
                                    {isActive && <span style={{ color: '#ff9a9e', fontSize: '0.8rem' }}>✓</span>}
                                </button>
                            );
                        })}
                        <Link href="/wounds/create" onClick={() => setShowSwitcher(false)} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                            padding: '0.6rem', marginTop: '0.3rem', borderRadius: 10,
                            background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)',
                            color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', textDecoration: 'none',
                        }}>
                            ＋ 新增傷口
                        </Link>
                    </div>
                )}
            </div>

            {/* ═══ Dashboard Content ═══ */}
            <div style={{ padding: '1rem 1.2rem 2rem' }}>
                {/* Wound Info Card */}
                <div style={{
                    background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20,
                    padding: '1.3rem', marginBottom: '1rem', position: 'relative', overflow: 'hidden',
                }}>
                    <div style={{
                        position: 'absolute', top: -30, right: -30, width: 120, height: 120,
                        background: `radial-gradient(circle, ${phase.color}22 0%, transparent 70%)`, borderRadius: '50%',
                    }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                        <div>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                                <span style={{ background: 'rgba(255,154,158,0.15)', color: '#ff9a9e', padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem' }}>{type.label}</span>
                                {loc && <span style={{ background: 'rgba(93,156,236,0.15)', color: '#5d9cec', padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem' }}>{loc.emoji} {loc.label}</span>}
                                <span style={{ background: `${phase.color}22`, color: phase.color, padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem' }}>{phase.label}</span>
                            </div>
                            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem' }}>受傷日期：{currentWound.date_of_injury}</div>
                        </div>
                        <div style={{
                            background: 'linear-gradient(135deg, #ff9a9e, #fda085)',
                            borderRadius: 14, padding: '0.5rem 0.8rem', textAlign: 'center',
                        }}>
                            <div style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 800, lineHeight: 1 }}>{days}</div>
                            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem', marginTop: 2 }}>天</div>
                        </div>
                    </div>
                </div>

                {/* Care Tip */}
                <div style={{
                    background: 'rgba(255,154,158,0.08)', border: '1px solid rgba(255,154,158,0.15)',
                    borderRadius: 14, padding: '0.7rem 1rem', marginBottom: '1rem',
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                }}>
                    <span style={{ fontSize: '1.1rem' }}>💡</span>
                    <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem' }}>{type.careNote}</span>
                </div>

                {/* Action Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1.5rem' }}>
                    <Link href={`/wounds/${currentWound.id}/scan`} style={{
                        background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
                        padding: '1.5rem 1rem', textAlign: 'center', textDecoration: 'none',
                        transition: 'transform 0.15s', cursor: 'pointer',
                        minHeight: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>📸</div>
                        <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>今日掃描</div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', marginTop: 2 }}>拍照 + AI 分析</div>
                    </Link>
                    <Link href={`/wounds/${currentWound.id}/history`} style={{
                        background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
                        padding: '1.5rem 1rem', textAlign: 'center', textDecoration: 'none',
                        transition: 'transform 0.15s', cursor: 'pointer',
                        minHeight: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>📅</div>
                        <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>照護歷程</div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', marginTop: 2 }}>Timeline 回顧</div>
                    </Link>
                </div>

                {/* Archive */}
                <ArchiveButton woundId={currentWound.id} onArchived={() => {
                    const remaining = wounds.filter(w => w.id !== currentWound.id);
                    setWounds(remaining);
                    setCurrentWound(remaining[0] || null);
                }} />
            </div>

            {/* ═══ Edit Wound Modal ═══ */}
            {showEdit && (
                <EditWoundModal
                    wound={currentWound}
                    onClose={() => setShowEdit(false)}
                    onSaved={(updated) => {
                        const merged = { ...currentWound, ...updated };
                        setCurrentWound(merged);
                        setWounds(prev => prev.map(w => w.id === merged.id ? merged : w));
                        setShowEdit(false);
                    }}
                />
            )}

            <style>{`
                @keyframes slideDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
}

/* ─── Archive Button ─── */
function ArchiveButton({ woundId, onArchived }) {
    const [confirm, setConfirm] = useState(false);
    const handleArchive = async () => {
        await fetch(`/api/wounds/${woundId}`, { method: 'DELETE' });
        onArchived();
    };
    return (
        <>
            <button onClick={() => setConfirm(true)} style={{
                width: '100%', padding: '0.7rem', borderRadius: 12,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', cursor: 'pointer',
                minHeight: 44,
            }}>🗃️ 傷口已癒合，歸檔此紀錄</button>
            {confirm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem', overscrollBehavior: 'contain' }} role="dialog" aria-modal="true" aria-label="確認歸檔">
                    <div style={{ background: '#1e1a2e', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '1.5rem', maxWidth: 320, width: '100%', textAlign: 'center' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗃️</div>
                        <h3 style={{ color: '#fff', margin: '0 0 0.5rem' }}>確認歸檔？</h3>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '0 0 1.5rem' }}>歸檔後不再顯示，歷史紀錄仍保留。</p>
                        <div style={{ display: 'flex', gap: '0.6rem' }}>
                            <button onClick={() => setConfirm(false)} style={{ flex: 1, padding: '0.7rem', borderRadius: 10, cursor: 'pointer', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.9rem' }}>取消</button>
                            <button onClick={handleArchive} style={{ flex: 1, padding: '0.7rem', borderRadius: 10, cursor: 'pointer', background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)', border: 'none', color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>確認歸檔</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/* ─── Edit Wound Modal ─── */
function EditWoundModal({ wound, onClose, onSaved }) {
    const [name, setName] = useState(wound.name || '');
    const [woundType, setWoundType] = useState(wound.wound_type || 'other');
    const isCustomLoc = wound.body_location && !BODY_LOCATIONS.some(l => l.code === wound.body_location);
    const [bodyLocation, setBodyLocation] = useState(isCustomLoc ? 'other' : (wound.body_location || ''));
    const [customLocation, setCustomLocation] = useState(isCustomLoc ? wound.body_location : '');
    const [dateOfInjury, setDateOfInjury] = useState(wound.date_of_injury || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const finalLocation = bodyLocation === 'other' ? customLocation.trim() : bodyLocation;
            const res = await fetch(`/api/wounds/${wound.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), wound_type: woundType, body_location: finalLocation, date_of_injury: dateOfInjury }),
            });
            if (res.ok) {
                onSaved({ name: name.trim(), wound_type: woundType, body_location: finalLocation, date_of_injury: dateOfInjury });
            }
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
            <div style={{
                background: '#1e1a2e', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480,
                padding: '1.5rem 1.2rem 2rem', maxHeight: '85vh', overflowY: 'auto',
                border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none',
                animation: 'slideUp 0.25s ease',
            }}>
                <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '0 auto 1rem' }} />
                <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1.2rem', textAlign: 'center' }}>編輯傷口資訊</h3>

                {/* Name */}
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', display: 'block', marginBottom: '0.3rem' }}>傷口名稱</label>
                <input value={name} onChange={e => setName(e.target.value)} style={{
                    width: '100%', padding: '0.8rem', fontSize: '0.95rem', color: '#fff',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 10, outline: 'none', boxSizing: 'border-box', marginBottom: '1rem',
                }} />

                {/* Wound Type */}
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', display: 'block', marginBottom: '0.3rem' }}>傷口類型</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                    {WOUND_TYPES.map(t => (
                        <button key={t.code} onClick={() => setWoundType(t.code)} style={{
                            padding: '0.45rem 0.8rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem',
                            border: woundType === t.code ? '1.5px solid #ff9a9e' : '1px solid rgba(255,255,255,0.1)',
                            background: woundType === t.code ? 'rgba(255,154,158,0.15)' : 'rgba(255,255,255,0.04)',
                            color: woundType === t.code ? '#ff9a9e' : 'rgba(255,255,255,0.5)',
                            transition: 'all 0.15s',
                        }}>{t.emoji} {t.label}</button>
                    ))}
                </div>

                {/* Body Location */}
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', display: 'block', marginBottom: '0.3rem' }}>身體位置</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: bodyLocation === 'other' ? '0.5rem' : '1rem' }}>
                    {BODY_LOCATIONS.map(l => (
                        <button key={l.code} onClick={() => setBodyLocation(l.code)} style={{
                            padding: '0.45rem 0.8rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem',
                            border: bodyLocation === l.code ? '1.5px solid #5d9cec' : '1px solid rgba(255,255,255,0.1)',
                            background: bodyLocation === l.code ? 'rgba(93,156,236,0.15)' : 'rgba(255,255,255,0.04)',
                            color: bodyLocation === l.code ? '#5d9cec' : 'rgba(255,255,255,0.5)',
                            transition: 'all 0.15s',
                        }}>{l.emoji} {l.label}</button>
                    ))}
                </div>
                {bodyLocation === 'other' && (
                    <input type="text" value={customLocation} onChange={e => setCustomLocation(e.target.value)} placeholder="請輸入傷口位置（例如：右手背）"
                        autoFocus
                        style={{
                            width: '100%', padding: '0.8rem', fontSize: '0.95rem', color: '#fff',
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: 10, outline: 'none', boxSizing: 'border-box', marginBottom: '1rem',
                        }} />
                )}

                {/* Date */}
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', display: 'block', marginBottom: '0.3rem' }}>受傷日期</label>
                <input type="date" value={dateOfInjury} onChange={e => setDateOfInjury(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    style={{
                        width: '100%', padding: '0.8rem', fontSize: '0.95rem', color: '#fff',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: 10, outline: 'none', boxSizing: 'border-box', colorScheme: 'dark',
                        marginBottom: '1.5rem',
                    }} />

                <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button onClick={onClose} style={{
                        flex: 1, padding: '0.8rem', borderRadius: 12, cursor: 'pointer',
                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                        color: '#fff', fontSize: '0.9rem',
                    }}>取消</button>
                    <button onClick={handleSave} disabled={saving || !name.trim()} style={{
                        flex: 1, padding: '0.8rem', borderRadius: 12, cursor: 'pointer',
                        background: 'linear-gradient(135deg, #ff9a9e, #fda085)',
                        border: 'none', color: '#fff', fontSize: '0.9rem', fontWeight: 700,
                        opacity: saving || !name.trim() ? 0.5 : 1,
                    }}>{saving ? '儲存中...' : '儲存修改'}</button>
                </div>
            </div>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
        </div>
    );
}
