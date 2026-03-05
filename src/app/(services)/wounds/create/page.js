'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WOUND_TYPES, BODY_LOCATIONS } from '@/app/lib/wounds-constants';
import AppHeader from '@/app/components/AppHeader';

export default function CreateWoundPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [woundType, setWoundType] = useState('');
    const [bodyLocation, setBodyLocation] = useState('');
    const [customLocation, setCustomLocation] = useState('');
    const [dateOfInjury, setDateOfInjury] = useState(new Date().toISOString().split('T')[0]);
    const [submitting, setSubmitting] = useState(false);

    const totalSteps = 4;

    const canNext = () => {
        if (step === 1) return name.trim().length > 0;
        if (step === 2) return woundType !== '';
        if (step === 3) return bodyLocation === 'other' ? customLocation.trim() !== '' : bodyLocation !== '';
        return true;
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const finalLocation = bodyLocation === 'other' ? customLocation.trim() : bodyLocation;
            const res = await fetch('/api/wounds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), wound_type: woundType, body_location: finalLocation, date_of_injury: dateOfInjury }),
            });
            const wound = await res.json();
            router.push(`/wounds?new_id=${wound.id}`);
        } catch (err) {
            console.error('Create wound error:', err);
            setSubmitting(false);
        }
    };

    return (
        <>
        <AppHeader backHref="/wounds" title="建立傷口紀錄" accent="linear-gradient(135deg, #ff9a9e, #fda085)" />
        <div style={{ padding: '1.25rem 1rem 2rem', maxWidth: 480, margin: '0 auto' }}>
            {/* Progress bar */}
            <div style={{ display: 'flex', gap: 4, marginBottom: '2rem' }}>
                {[1, 2, 3, 4].map(s => (
                    <div key={s} style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: s <= step ? 'linear-gradient(90deg, #ff9a9e, #fda085)' : 'rgba(255,255,255,0.1)',
                        transition: 'background 0.3s',
                    }} />
                ))}
            </div>

            {/* Step 1: Name */}
            {step === 1 && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📝</div>
                        <h2 style={{ color: '#fff', fontSize: '1.2rem', margin: 0 }}>為傷口命名</h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '0.3rem 0 0' }}>方便你辨識不同傷口</p>
                    </div>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="例如：左膝擦傷、手術傷口"
                        autoFocus
                        style={{
                            width: '100%', padding: '1rem', fontSize: '1rem', color: '#fff',
                            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: 12, outline: 'none', boxSizing: 'border-box',
                        }}
                    />
                </div>
            )}

            {/* Step 2: Type */}
            {step === 2 && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏷️</div>
                        <h2 style={{ color: '#fff', fontSize: '1.2rem', margin: 0 }}>傷口類型</h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '0.3rem 0 0' }}>AI 會根據類型提供更精準的照護建議</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                        {WOUND_TYPES.map(t => (
                            <button
                                key={t.code}
                                onClick={() => setWoundType(t.code)}
                                style={{
                                    padding: '1rem 0.8rem', borderRadius: 14, cursor: 'pointer',
                                    border: woundType === t.code ? '2px solid #ff9a9e' : '1px solid rgba(255,255,255,0.1)',
                                    background: woundType === t.code ? 'rgba(255,154,158,0.15)' : 'rgba(255,255,255,0.04)',
                                    transition: 'all 0.2s', textAlign: 'center',
                                }}
                            >
                                <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{t.emoji}</div>
                                <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 600 }}>{t.label}</div>
                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', marginTop: 2 }}>{t.careNote}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 3: Body Location */}
            {step === 3 && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📍</div>
                        <h2 style={{ color: '#fff', fontSize: '1.2rem', margin: 0 }}>傷口位置</h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '0.3rem 0 0' }}>幫助醫護快速辨認</p>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: bodyLocation === 'other' ? '1rem' : 0 }}>
                        {BODY_LOCATIONS.map(l => (
                            <button
                                key={l.code}
                                onClick={() => setBodyLocation(l.code)}
                                style={{
                                    padding: '0.7rem 1.2rem', borderRadius: 12, cursor: 'pointer',
                                    border: bodyLocation === l.code ? '2px solid #5d9cec' : '1px solid rgba(255,255,255,0.1)',
                                    background: bodyLocation === l.code ? 'rgba(93,156,236,0.15)' : 'rgba(255,255,255,0.04)',
                                    transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.4rem',
                                }}
                            >
                                <span style={{ fontSize: '1.2rem' }}>{l.emoji}</span>
                                <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 500 }}>{l.label}</span>
                            </button>
                        ))}
                    </div>
                    {bodyLocation === 'other' && (
                        <div style={{ animation: 'fadeIn 0.2s ease' }}>
                            <input
                                type="text"
                                value={customLocation}
                                onChange={e => setCustomLocation(e.target.value)}
                                placeholder="請輸入傷口位置（例如：右手背、左腳踝）"
                                autoFocus
                                style={{
                                    width: '100%', padding: '1rem', fontSize: '1rem', color: '#fff',
                                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: 12, outline: 'none', boxSizing: 'border-box',
                                }}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Step 4: Date */}
            {step === 4 && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📅</div>
                        <h2 style={{ color: '#fff', fontSize: '1.2rem', margin: 0 }}>受傷日期</h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', margin: '0.3rem 0 0' }}>用於計算照護天數</p>
                    </div>
                    <input
                        type="date"
                        value={dateOfInjury}
                        onChange={e => setDateOfInjury(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        style={{
                            width: '100%', padding: '1rem', fontSize: '1rem', color: '#fff',
                            background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: 12, outline: 'none', boxSizing: 'border-box',
                            colorScheme: 'dark',
                        }}
                    />
                    {/* Summary */}
                    <div style={{
                        marginTop: '1.5rem', padding: '1rem', borderRadius: 14,
                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    }}>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>建檔摘要</div>
                        <div style={{ color: '#fff', fontSize: '0.9rem' }}>
                            <strong>{name}</strong> ・ {WOUND_TYPES.find(t => t.code === woundType)?.label} ・ {bodyLocation === 'other' ? customLocation.trim() : BODY_LOCATIONS.find(l => l.code === bodyLocation)?.label} ・ {dateOfInjury}
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Buttons */}
            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '2rem' }}>
                {step > 1 && (
                    <button
                        onClick={() => setStep(s => s - 1)}
                        style={{
                            flex: 1, padding: '0.9rem', borderRadius: 12, cursor: 'pointer',
                            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                            color: '#fff', fontSize: '0.95rem', fontWeight: 600,
                        }}
                    >
                        上一步
                    </button>
                )}
                <button
                    onClick={() => step < totalSteps ? setStep(s => s + 1) : handleSubmit()}
                    disabled={!canNext() || submitting}
                    style={{
                        flex: 1, padding: '0.9rem', borderRadius: 12, cursor: 'pointer',
                        background: canNext() ? 'linear-gradient(135deg, #ff9a9e, #fda085)' : 'rgba(255,255,255,0.1)',
                        border: 'none', color: '#fff', fontSize: '0.95rem', fontWeight: 700,
                        opacity: canNext() && !submitting ? 1 : 0.5, transition: 'opacity 0.2s',
                    }}
                >
                    {submitting ? '建立中...' : step < totalSteps ? '下一步' : '✓ 完成建檔'}
                </button>
            </div>

            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
        </>
    );
}
