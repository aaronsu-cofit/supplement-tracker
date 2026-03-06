'use client';
import { apiFetch } from '@vitera/lib';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WOUND_TYPES, BODY_LOCATIONS } from '@vitera/lib';
import { AppHeader } from '@vitera/ui';

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
            const res = await apiFetch('/api/wounds', {
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
        <div className="max-w-[480px] mx-auto px-4 pt-5 pb-8">
            {/* Progress bar */}
            <div className="flex gap-1 mb-8">
                {[1, 2, 3, 4].map(s => (
                    <div
                        key={s}
                        className={`flex-1 h-1 rounded-sm transition-all duration-300 ${s <= step ? 'bg-w-gradient' : 'bg-white/10'}`}
                    />
                ))}
            </div>

            {/* Step 1: Name */}
            {step === 1 && (
                <div className="animate-fade-in">
                    <div className="text-center mb-8">
                        <div className="text-[2.5rem] mb-2">📝</div>
                        <h2 className="text-white text-[1.2rem] m-0">為傷口命名</h2>
                        <p className="text-white/50 text-[0.85rem] mt-1 mb-0">方便你辨識不同傷口</p>
                    </div>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="例如：左膝擦傷、手術傷口"
                        autoFocus
                        className="w-full p-4 text-base text-white bg-white/[0.07] border border-white/15 rounded-xl outline-none box-border"
                    />
                </div>
            )}

            {/* Step 2: Type */}
            {step === 2 && (
                <div className="animate-fade-in">
                    <div className="text-center mb-6">
                        <div className="text-[2.5rem] mb-2">🏷️</div>
                        <h2 className="text-white text-[1.2rem] m-0">傷口類型</h2>
                        <p className="text-white/50 text-[0.85rem] mt-1 mb-0">AI 會根據類型提供更精準的照護建議</p>
                    </div>
                    <div className="grid grid-cols-2 gap-[0.6rem]">
                        {WOUND_TYPES.map(t => (
                            <button
                                key={t.code}
                                onClick={() => setWoundType(t.code)}
                                className={`p-4 rounded-[14px] cursor-pointer transition-all duration-200 text-center ${
                                    woundType === t.code
                                        ? 'border-2 border-w-pink bg-w-pink/15'
                                        : 'border border-white/10 bg-white/[0.04]'
                                }`}
                            >
                                <div className="text-[1.5rem] mb-[0.3rem]">{t.emoji}</div>
                                <div className="text-white text-[0.85rem] font-semibold">{t.label}</div>
                                <div className="text-white/40 text-[0.7rem] mt-[2px]">{t.careNote}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 3: Body Location */}
            {step === 3 && (
                <div className="animate-fade-in">
                    <div className="text-center mb-6">
                        <div className="text-[2.5rem] mb-2">📍</div>
                        <h2 className="text-white text-[1.2rem] m-0">傷口位置</h2>
                        <p className="text-white/50 text-[0.85rem] mt-1 mb-0">幫助醫護快速辨認</p>
                    </div>
                    <div className={`flex flex-wrap gap-2 justify-center ${bodyLocation === 'other' ? 'mb-4' : ''}`}>
                        {BODY_LOCATIONS.map(l => (
                            <button
                                key={l.code}
                                onClick={() => setBodyLocation(l.code)}
                                className={`px-5 py-[0.7rem] rounded-xl cursor-pointer transition-all duration-200 flex items-center gap-[0.4rem] ${
                                    bodyLocation === l.code
                                        ? 'border-2 border-w-blue bg-w-blue/15'
                                        : 'border border-white/10 bg-white/[0.04]'
                                }`}
                            >
                                <span className="text-[1.2rem]">{l.emoji}</span>
                                <span className="text-white text-[0.9rem] font-medium">{l.label}</span>
                            </button>
                        ))}
                    </div>
                    {bodyLocation === 'other' && (
                        <div className="animate-fade-in">
                            <input
                                type="text"
                                value={customLocation}
                                onChange={e => setCustomLocation(e.target.value)}
                                placeholder="請輸入傷口位置（例如：右手背、左腳踝）"
                                autoFocus
                                className="w-full p-4 text-base text-white bg-white/[0.07] border border-white/15 rounded-xl outline-none box-border"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Step 4: Date */}
            {step === 4 && (
                <div className="animate-fade-in">
                    <div className="text-center mb-8">
                        <div className="text-[2.5rem] mb-2">📅</div>
                        <h2 className="text-white text-[1.2rem] m-0">受傷日期</h2>
                        <p className="text-white/50 text-[0.85rem] mt-1 mb-0">用於計算照護天數</p>
                    </div>
                    <input
                        type="date"
                        value={dateOfInjury}
                        onChange={e => setDateOfInjury(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full p-4 text-base text-white bg-white/[0.07] border border-white/15 rounded-xl outline-none box-border [color-scheme:dark]"
                    />
                    <div className="mt-6 p-4 rounded-[14px] bg-white/[0.04] border border-white/[0.08]">
                        <div className="text-white/50 text-[0.8rem] mb-2">建檔摘要</div>
                        <div className="text-white text-[0.9rem]">
                            <strong>{name}</strong> ・ {WOUND_TYPES.find(t => t.code === woundType)?.label} ・ {bodyLocation === 'other' ? customLocation.trim() : BODY_LOCATIONS.find(l => l.code === bodyLocation)?.label} ・ {dateOfInjury}
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="flex gap-[0.8rem] mt-8">
                {step > 1 && (
                    <button
                        onClick={() => setStep(s => s - 1)}
                        className="flex-1 py-[0.9rem] rounded-xl cursor-pointer bg-white/[0.08] border border-white/15 text-white text-[0.95rem] font-semibold"
                    >
                        上一步
                    </button>
                )}
                <button
                    onClick={() => step < totalSteps ? setStep(s => s + 1) : handleSubmit()}
                    disabled={!canNext() || submitting}
                    className={`flex-1 py-[0.9rem] rounded-xl cursor-pointer border-none text-white text-[0.95rem] font-bold transition-opacity duration-200 ${
                        canNext() && !submitting ? 'bg-w-gradient' : 'bg-white/10 opacity-50'
                    }`}
                >
                    {submitting ? '建立中...' : step < totalSteps ? '下一步' : '✓ 完成建檔'}
                </button>
            </div>
        </div>
        </>
    );
}
