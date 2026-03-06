'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, apiFetch, WOUND_TYPES, BODY_LOCATIONS } from '@vitera/lib';
import { AppHeader } from '@vitera/ui';

const PHASE_CLASSES = {
    inflammation:  'phase-inflammation',
    proliferation: 'phase-proliferation',
    remodeling:    'phase-remodeling',
    mature:        'phase-mature',
};

export default function WoundsClientDashboard({ initialWounds = [] }) {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [wounds, setWounds] = useState(initialWounds);
    const [currentWound, setCurrentWound] = useState(null);
    const [showSwitcher, setShowSwitcher] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const switcherRef = useRef(null);
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        if (!Array.isArray(initialWounds) || initialWounds.length === 0) return;
        initialized.current = true;
        setWounds(initialWounds);
        const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        const newId = urlParams?.get('new_id');
        if (newId) {
            const target = initialWounds.find(w => String(w.id) === String(newId));
            if (target) { setCurrentWound(target); return; }
        }
        setCurrentWound(initialWounds[0]);
    }, [initialWounds]);

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
        if (d <= 3)  return { label: '炎症期', key: 'inflammation', color: '#ff6b6b' };
        if (d <= 14) return { label: '增生期', key: 'proliferation', color: '#ffa502' };
        if (d <= 28) return { label: '重塑期', key: 'remodeling',    color: '#2ed573' };
        return           { label: '成熟期', key: 'mature',        color: '#5d9cec' };
    };

    const switchWound = (w) => { setCurrentWound(w); setShowSwitcher(false); };

    if (authLoading) {
        return (
            <div className="flex justify-center items-center min-h-[80vh]">
                <div className="w-10 h-10 border-[3px] border-white/10 border-t-w-pink rounded-full animate-spin" />
            </div>
        );
    }

    if (!currentWound) {
        return (
            <>
                <AppHeader backHref="/" title="傷口智慧照護" accent="linear-gradient(135deg, #ff9a9e, #fda085)" />
                <div className="flex flex-col items-center justify-center min-h-[70vh] p-8 text-center">
                    <div className="text-[3.5rem] mb-4">🩹</div>
                    <h2 className="text-white text-[1.2rem] font-bold m-0 mb-2">開始你的傷口照護</h2>
                    <p className="text-white/50 text-[0.85rem] m-0 mb-8 max-w-[280px]">
                        建立傷口紀錄，讓 AI 幫你追蹤復原狀態
                    </p>
                    <Link href="/create" className="py-[0.9rem] px-10 rounded-[14px] bg-w-gradient text-white font-bold text-[0.95rem] no-underline shadow-[0_4px_20px_rgba(255,154,158,0.35)] transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-[0_6px_25px_rgba(255,154,158,0.5)]">
                        ＋ 建立傷口紀錄
                    </Link>
                </div>
            </>
        );
    }

    const type = getType(currentWound.wound_type);
    const loc = getLoc(currentWound.body_location);
    const days = daysSince(currentWound.date_of_injury);
    const phase = getPhase(days);

    return (
        <div className="max-w-[480px] mx-auto">
            {/* Header with Wound Switcher */}
            <div ref={switcherRef} className="sticky top-0 z-20">
                <header className="bg-w-header backdrop-blur-[20px] px-3 h-14 border-b border-white/[0.06] flex items-center justify-between gap-1">
                    <Link href="/" aria-label="返回服務列表" className="flex items-center justify-center min-w-11 h-11 shrink-0 text-white/65 no-underline text-[1.3rem] rounded-[10px]">←</Link>

                    <button
                        onClick={() => setShowSwitcher(v => !v)}
                        aria-label="切換傷口"
                        aria-expanded={showSwitcher}
                        className="flex items-center gap-[0.4rem] flex-1 bg-transparent border-none py-2 min-h-11 justify-center cursor-pointer"
                    >
                        <span className="text-[1.1rem]">{type.emoji}</span>
                        <span className="text-w-gradient text-[1.05rem] font-bold">
                            {currentWound.name || '未命名傷口'}
                        </span>
                        <span className={`text-white/40 text-[0.7rem] transition-transform duration-200 ${showSwitcher ? 'rotate-180' : 'rotate-0'}`}>▼</span>
                    </button>

                    <button onClick={() => setShowEdit(true)} aria-label="編輯傷口資訊" className="bg-white/[0.06] border border-white/15 rounded-lg py-2 px-3 cursor-pointer text-white/75 text-[0.8rem] min-w-11 min-h-11 flex items-center justify-center transition-all hover:bg-white/[0.12] active:scale-95">✏️</button>
                </header>

                {showSwitcher && (
                    <div className="absolute left-0 right-0 top-full bg-w-dropdown backdrop-blur-[20px] border border-white/[0.08] border-t-0 rounded-b-2xl p-2 shadow-[0_12px_40px_rgba(0,0,0,0.4)] animate-slide-down">
                        {wounds.map(w => {
                            const wType = getType(w.wound_type);
                            const isActive = w.id === currentWound.id;
                            return (
                                <button key={w.id} onClick={() => switchWound(w)} className={`flex items-center gap-[0.6rem] w-full py-[0.7rem] px-[0.8rem] rounded-[10px] cursor-pointer transition-colors duration-150 ${isActive ? 'bg-w-pink/[0.12] border border-w-pink/25' : 'bg-transparent border border-transparent'}`}>
                                    <span className="text-[1.1rem]">{wType.emoji}</span>
                                    <div className="flex-1 text-left">
                                        <div className={`text-[0.9rem] text-white ${isActive ? 'font-semibold' : 'font-normal'}`}>{w.name}</div>
                                    </div>
                                    <span className="text-white/30 text-[0.75rem]">第{daysSince(w.date_of_injury)}天</span>
                                    {isActive && <span className="text-w-pink text-[0.8rem]">✓</span>}
                                </button>
                            );
                        })}
                        <Link href="/create" onClick={() => setShowSwitcher(false)} className="flex items-center justify-center gap-[0.4rem] py-[0.6rem] mt-[0.3rem] rounded-[10px] bg-white/[0.03] border border-dashed border-white/12 text-white/40 text-[0.85rem] no-underline">
                            ＋ 新增傷口
                        </Link>
                    </div>
                )}
            </div>

            {/* Dashboard Content */}
            <div className="px-[1.2rem] pt-4 pb-8">
                {/* Wound Info Card */}
                <div className="bg-white/5 backdrop-blur-[20px] border border-white/[0.08] rounded-[20px] p-[1.3rem] mb-4 relative overflow-hidden">
                    <div
                        className="absolute -top-[30px] -right-[30px] w-[120px] h-[120px] rounded-full"
                        style={{ background: `radial-gradient(circle, ${phase.color}22 0%, transparent 70%)` }}
                    />
                    <div className="flex justify-between items-start relative">
                        <div>
                            <div className="flex gap-[0.4rem] flex-wrap mb-[0.6rem]">
                                <span className="bg-w-pink/15 text-w-pink px-2 py-[2px] rounded-[6px] text-[0.75rem]">{type.label}</span>
                                {loc && <span className="bg-w-blue/15 text-w-blue px-2 py-[2px] rounded-[6px] text-[0.75rem]">{loc.emoji} {loc.label}</span>}
                                <span className={`${PHASE_CLASSES[phase.key]} px-2 py-[2px] rounded-[6px] text-[0.75rem]`}>{phase.label}</span>
                            </div>
                            <div className="text-white/65 text-[0.85rem]">受傷日期：{currentWound.date_of_injury}</div>
                        </div>
                        <div className="bg-w-gradient rounded-[14px] px-[0.8rem] py-[0.5rem] text-center shrink-0">
                            <div className="text-white text-[1.4rem] font-extrabold leading-none">{days}</div>
                            <div className="text-white/85 text-[0.75rem] mt-[2px]">天</div>
                        </div>
                    </div>
                </div>

                {/* Care Tip */}
                <div className="bg-w-pink/[0.08] border border-w-pink/15 rounded-[14px] px-4 py-[0.7rem] mb-4 flex items-center gap-[0.6rem]">
                    <span className="text-[1.1rem]">💡</span>
                    <span className="text-white/65 text-[0.8rem]">{type.careNote}</span>
                </div>

                {/* Action Grid */}
                <div className="grid grid-cols-2 gap-[0.8rem] mb-6">
                    <Link href={`/${currentWound.id}/scan`} className="bg-white/5 backdrop-blur-[16px] border border-white/[0.08] rounded-2xl px-4 py-6 text-center no-underline flex flex-col items-center justify-center transition-all duration-200 hover:bg-white/10 hover:border-white/15 active:scale-[0.98]">
                        <div className="text-[2rem] mb-[0.4rem]">📸</div>
                        <div className="text-white text-[0.9rem] font-semibold">今日掃描</div>
                        <div className="text-white/60 text-[0.78rem] mt-[2px]">拍照 + AI 分析</div>
                    </Link>
                    <Link href={`/${currentWound.id}/history`} className="bg-white/5 backdrop-blur-[16px] border border-white/[0.08] rounded-2xl px-4 py-6 text-center no-underline flex flex-col items-center justify-center transition-all duration-200 hover:bg-white/10 hover:border-white/15 active:scale-[0.98]">
                        <div className="text-[2rem] mb-[0.4rem]">📅</div>
                        <div className="text-white text-[0.9rem] font-semibold">照護歷程</div>
                        <div className="text-white/60 text-[0.78rem] mt-[2px]">Timeline 回顧</div>
                    </Link>
                </div>

                <ArchiveButton woundId={currentWound.id} onArchived={() => {
                    const remaining = wounds.filter(w => w.id !== currentWound.id);
                    setWounds(remaining);
                    setCurrentWound(remaining[0] || null);
                }} />
            </div>

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
        </div>
    );
}

/* Archive Button */
function ArchiveButton({ woundId, onArchived }) {
    const [confirm, setConfirm] = useState(false);
    const handleArchive = async () => {
        await apiFetch(`/api/wounds/${woundId}`, { method: 'DELETE' });
        onArchived();
    };
    return (
        <>
            <button onClick={() => setConfirm(true)} className="w-full py-[0.7rem] rounded-[12px] bg-white/[0.03] border border-white/[0.08] text-white/50 text-[0.85rem] cursor-pointer min-h-11 transition-all duration-200 hover:bg-white/10 hover:text-white/70 active:scale-[0.98]">
                🗃️ 傷口已癒合，歸檔此紀錄
            </button>
            {confirm && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4" role="dialog" aria-modal="true" aria-label="確認歸檔">
                    <div className="bg-w-dialog border border-white/15 rounded-[20px] p-6 max-w-[320px] w-full text-center">
                        <div className="text-[2rem] mb-2">🗃️</div>
                        <h3 className="text-white m-0 mb-2">確認歸檔？</h3>
                        <p className="text-white/50 text-[0.85rem] m-0 mb-6">歸檔後不再顯示，歷史紀錄仍保留。</p>
                        <div className="flex gap-[0.6rem]">
                            <button onClick={() => setConfirm(false)} className="flex-1 py-[0.7rem] rounded-[10px] cursor-pointer bg-white/[0.08] border border-white/15 text-white text-[0.9rem] transition-all hover:bg-white/[0.15] active:scale-95">取消</button>
                            <button onClick={handleArchive} className="flex-1 py-[0.7rem] rounded-[10px] cursor-pointer bg-w-gradient-red border-none text-white text-[0.9rem] font-semibold transition-all hover:opacity-90 active:scale-95 shadow-[0_4px_12px_rgba(255,107,107,0.3)]">確認歸檔</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/* Edit Wound Modal */
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
            const res = await apiFetch(`/api/wounds/${wound.id}`, {
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
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-[100]">
            <div className="bg-w-dialog rounded-t-[20px] w-full max-w-[480px] px-[1.2rem] pt-6 pb-8 max-h-[85vh] overflow-y-auto border border-white/10 border-b-0 animate-slide-up">
                <div className="w-10 h-1 bg-white/20 rounded mx-auto mb-4" />
                <h3 className="text-white text-[1.1rem] font-bold m-0 mb-[1.2rem] text-center">編輯傷口資訊</h3>

                <label className="text-white/50 text-[0.8rem] block mb-[0.3rem]">傷口名稱</label>
                <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full p-[0.8rem] text-[0.95rem] text-white bg-white/[0.06] border border-white/[0.12] rounded-[10px] outline-none box-border mb-4 transition-all duration-200 focus:border-white/30 focus:bg-white/10"
                />

                <label className="text-white/50 text-[0.8rem] block mb-[0.3rem]">傷口類型</label>
                <div className="flex flex-wrap gap-[0.4rem] mb-4">
                    {WOUND_TYPES.map(t => (
                        <button key={t.code} onClick={() => setWoundType(t.code)}
                            className={`py-[0.45rem] px-[0.8rem] rounded-lg cursor-pointer text-[0.8rem] transition-all duration-200 active:scale-95 ${woundType === t.code ? 'border-[1.5px] border-w-pink bg-w-pink/15 text-w-pink' : 'border border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/10 hover:text-white/70'}`}
                        >{t.emoji} {t.label}</button>
                    ))}
                </div>

                <label className="text-white/50 text-[0.8rem] block mb-[0.3rem]">身體位置</label>
                <div className={`flex flex-wrap gap-[0.4rem] ${bodyLocation === 'other' ? 'mb-2' : 'mb-4'}`}>
                    {BODY_LOCATIONS.map(l => (
                        <button key={l.code} onClick={() => setBodyLocation(l.code)}
                            className={`py-[0.45rem] px-[0.8rem] rounded-lg cursor-pointer text-[0.8rem] transition-all duration-200 active:scale-95 ${bodyLocation === l.code ? 'border-[1.5px] border-w-blue bg-w-blue/15 text-w-blue' : 'border border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/10 hover:text-white/70'}`}
                        >{l.emoji} {l.label}</button>
                    ))}
                </div>
                {bodyLocation === 'other' && (
                    <input
                        type="text"
                        value={customLocation}
                        onChange={e => setCustomLocation(e.target.value)}
                        placeholder="請輸入傷口位置（例如：右手背）"
                        autoFocus
                        className="w-full p-[0.8rem] text-[0.95rem] text-white bg-white/[0.06] border border-white/[0.12] rounded-[10px] outline-none box-border mb-4 transition-all duration-200 focus:border-white/30 focus:bg-white/10"
                    />
                )}

                <label className="text-white/50 text-[0.8rem] block mb-[0.3rem]">受傷日期</label>
                <input
                    type="date"
                    value={dateOfInjury}
                    onChange={e => setDateOfInjury(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full p-[0.8rem] text-[0.95rem] text-white bg-white/[0.06] border border-white/[0.12] rounded-[10px] outline-none box-border [color-scheme:dark] mb-6 transition-all duration-200 focus:border-white/30 focus:bg-white/10"
                />

                <div className="flex gap-[0.6rem]">
                    <button onClick={onClose} className="flex-1 py-[0.8rem] rounded-[12px] cursor-pointer bg-white/[0.06] border border-white/[0.12] text-white text-[0.9rem] transition-all duration-200 hover:bg-white/[0.15] active:scale-95">取消</button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !name.trim()}
                        className={`flex-1 py-[0.8rem] rounded-[12px] cursor-pointer border-none text-white text-[0.9rem] font-bold transition-all duration-200 active:scale-95 disabled:hover:scale-100 disabled:cursor-not-allowed ${saving || !name.trim() ? 'bg-white/10 opacity-50' : 'bg-w-gradient hover:opacity-90 hover:shadow-[0_4px_15px_rgba(255,154,158,0.4)]'}`}
                    >{saving ? '儲存中...' : '儲存修改'}</button>
                </div>
            </div>
        </div>
    );
}
