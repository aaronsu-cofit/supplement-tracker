'use client';
import { apiFetch } from '@vitera/lib';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const CONCERNS = {
    male: [
        { id: 'vitality', label: '硬度不足或持久度不如預期', emoji: '🔋' },
        { id: 'desire', label: '性慾低下或提不起勁', emoji: '📉' },
        { id: 'anxiety', label: '表現焦慮或緊張', emoji: '🌪️' },
        { id: 'other', label: '其他', emoji: '💭' }
    ],
    female: [
        { id: 'comfort', label: '私密處乾澀或親密時感到不適', emoji: '💧' },
        { id: 'desire', label: '提不起勁或難以進入狀態', emoji: '🥀' },
        { id: 'climax', label: '難以達到高潮', emoji: '🏔️' },
        { id: 'other', label: '其他', emoji: '💭' }
    ],
    other: [
        { id: 'desire', label: '性慾低下', emoji: '📉' },
        { id: 'anxiety', label: '親密關係焦慮', emoji: '🌪️' },
        { id: 'pain', label: '生理不適', emoji: '🩹' },
        { id: 'other', label: '其他', emoji: '💭' }
    ]
};

function AssessContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const concernParam = searchParams.get('concern');

    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [gender, setGender] = useState('');
    const [primaryConcern, setPrimaryConcern] = useState('');
    const [stressLevel, setStressLevel] = useState(5);
    const [sleepHours, setSleepHours] = useState(7);
    const [intimacySatisfaction, setIntimacySatisfaction] = useState(5);

    const handleNext = () => setStep(step + 1);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const aiRes = await apiFetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'sexual_health',
                    image: 'data:image/jpeg;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', // dummy
                    prompt: `患者性別：${gender}\n主要困擾：${primaryConcern}\n近期壓力指數(1-10)：${stressLevel}\n平均睡眠時間：${sleepHours}小時\n目前親密關係/生理狀況滿意度(1-10)：${intimacySatisfaction}\n\n請根據以上資訊，給予極度包容、不帶批判的深度病因解析，並提供非藥物性建議(如凱格爾運動、正念)及保健品建議。`
                }),
            });
            const aiData = await aiRes.json();
            const aiSummary = aiData.success ? aiData.ai_summary : '目前無法取得分析建議，請稍後再試。';

            const payload = {
                gender,
                primary_concern: primaryConcern,
                assessment_data: { stressLevel, sleepHours, intimacySatisfaction },
                ai_summary: aiSummary
            };

            const res = await apiFetch('/api/intimacy/assessments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (data.success && data.assessment?.id) {
                router.push(`/result?id=${data.assessment.id}`);
            } else {
                router.push('/');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="page-container pb-20 pt-6">
            <div className="flex justify-between items-center mb-8">
                <button
                    onClick={() => router.back()}
                    className="bg-white border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] rounded-[12px] px-3 py-2 text-slate-500 cursor-pointer text-[13px] flex items-center gap-1 font-semibold"
                >
                    <span className="text-[16px]">←</span> 返回
                </button>
                <div className="text-[#E11D48] text-[12px] uppercase font-extrabold tracking-widest">
                    ● 專屬私密評估 {step} / 3
                </div>
            </div>

            <div className="animate-fade-in">
                {step === 1 && (
                    <div>
                        <h2 className="page-title mb-4 text-[24px]" style={{ backgroundImage: 'linear-gradient(135deg, #BE123C 0%, #E11D48 100%)' }}>
                            您認同的生理性別？
                        </h2>
                        <p className="page-subtitle mb-8 leading-relaxed text-slate-600 font-medium">
                            這將幫助 AI 顧問了解您的生理結構，提供精準且專屬的醫學建議。所有資訊皆在裝置與伺服器間進行軍規級加密，絕不外洩。
                        </p>
                        <div className="flex flex-col gap-4">
                            {[{ id: 'male', label: '👨 男性 (Male)' }, { id: 'female', label: '👩 女性 (Female)' }, { id: 'other', label: '🧑 其他 / 不願透露' }].map(g => (
                                <button
                                    key={g.id}
                                    onClick={() => { setGender(g.id); handleNext(); }}
                                    className="w-full text-left p-5 cursor-pointer text-[16px] font-bold text-slate-800 border border-slate-100 bg-white rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.03)]"
                                >
                                    {g.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="animate-slide-up">
                        <h2 className="page-title mb-4 text-[24px]" style={{ backgroundImage: 'linear-gradient(135deg, #BE123C 0%, #E11D48 100%)' }}>
                            您目前最大的困擾是？
                        </h2>
                        <p className="page-subtitle mb-8 text-slate-600 font-medium">
                            請放心點選最貼近您感受的選項。
                        </p>
                        <div className="flex flex-col gap-4">
                            {(CONCERNS[gender] || CONCERNS.other).map(c => {
                                const isRecommended = concernParam === c.id;
                                return (
                                    <button
                                        key={c.id}
                                        onClick={() => { setPrimaryConcern(c.label); handleNext(); }}
                                        className={`w-full text-left p-5 cursor-pointer flex items-center gap-4 rounded-[20px] shadow-[0_4px_12px_rgba(0,0,0,0.03)] ${
                                            isRecommended
                                                ? 'border-2 border-[#FFE4E6] bg-[#FFF1F2]'
                                                : 'border border-slate-100 bg-white'
                                        }`}
                                    >
                                        <div className="text-[24px] bg-white p-[10px] rounded-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">{c.emoji}</div>
                                        <div className="flex-1 text-[15px] font-bold text-slate-800">
                                            {c.label}
                                        </div>
                                        {isRecommended && (
                                            <div className="text-[11px] text-[#BE123C] bg-white px-2 py-1 rounded-[12px] font-bold">為您推薦</div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="animate-slide-up">
                        <h2 className="page-title mb-4 text-[24px]" style={{ backgroundImage: 'linear-gradient(135deg, #BE123C 0%, #E11D48 100%)' }}>
                            生活狀態與心理滿意度
                        </h2>
                        <p className="page-subtitle mb-8 text-slate-600 font-medium">
                            健康與壓力、睡眠息息相關，了解您的身心狀態能極大幫助我們找出根本原因。
                        </p>

                        <div className="flex flex-col gap-6">
                            {/* Stress Slider */}
                            <div className="p-6 bg-white rounded-[24px] shadow-[0_8px_24px_rgba(0,0,0,0.03)] border border-slate-50">
                                <div className="flex justify-between mb-4">
                                    <span className="text-[15px] font-bold text-slate-800">近期壓力指數</span>
                                    <span className="text-[#E11D48] font-extrabold bg-[#FFF1F2] px-3 py-1 rounded-[16px] text-[13px]">{stressLevel} / 10</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-[24px]">😌</span>
                                    <input
                                        type="range" min="1" max="10" value={stressLevel}
                                        onChange={(e) => setStressLevel(e.target.value)}
                                        className="flex-1"
                                        style={{ accentColor: '#E11D48' }}
                                    />
                                    <span className="text-[24px]">🤯</span>
                                </div>
                            </div>

                            {/* Intimacy Satisfaction Slider */}
                            <div className="p-6 bg-white rounded-[24px] shadow-[0_8px_24px_rgba(0,0,0,0.03)] border border-slate-50">
                                <div className="flex justify-between mb-4">
                                    <span className="text-[15px] font-bold text-slate-800">親密滿意度</span>
                                    <span className="text-[#E11D48] font-extrabold bg-[#FFF1F2] px-3 py-1 rounded-[16px] text-[13px]">{intimacySatisfaction} / 10</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-[24px]">🥀</span>
                                    <input
                                        type="range" min="1" max="10" value={intimacySatisfaction}
                                        onChange={(e) => setIntimacySatisfaction(e.target.value)}
                                        className="flex-1"
                                        style={{ accentColor: '#E11D48' }}
                                    />
                                    <span className="text-[24px]">✨</span>
                                </div>
                            </div>

                            {/* Sleep Slider */}
                            <div className="p-6 bg-white rounded-[24px] shadow-[0_8px_24px_rgba(0,0,0,0.03)] border border-slate-50">
                                <div className="flex justify-between mb-4">
                                    <span className="text-[15px] font-bold text-slate-800">平均每晚睡眠</span>
                                    <span className="text-[#E11D48] font-extrabold bg-[#FFF1F2] px-3 py-1 rounded-[16px] text-[13px]">{sleepHours} 小時</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-[24px]">🥱</span>
                                    <input
                                        type="range" min="3" max="12" value={sleepHours}
                                        onChange={(e) => setSleepHours(e.target.value)}
                                        className="flex-1"
                                        style={{ accentColor: '#E11D48' }}
                                    />
                                    <span className="text-[24px]">😴</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className={`btn w-full py-[18px] font-extrabold text-[16px] rounded-[20px] border-none text-white shadow-[0_8px_20px_rgba(225,29,72,0.3)] cursor-pointer transition-opacity duration-200 ${isSubmitting ? 'opacity-70' : 'opacity-100'}`}
                                style={{ background: 'linear-gradient(135deg, #BE123C 0%, #E11D48 100%)' }}
                            >
                                {isSubmitting ? 'AI 專屬顧問分析中...' : '送出隱私評估'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function IntimacyAssessPage() {
    return (
        <Suspense fallback={<div className="page-container text-center pt-24"><div className="spinner mx-auto" /></div>}>
            <AssessContent />
        </Suspense>
    );
}
